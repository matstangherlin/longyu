/**
 * RC2.3.10B column-level schema diff (read-only analysis).
 *
 * Replays supabase/migrations + supabase/pending in order to build the
 * *expected* public schema, then compares it with a production catalog
 * extract (docs/launch/rc2-3-10b-schema-column-extract.json). Never connects
 * to anything and never reads row data.
 *
 * Text-based by design: it understands the DDL shapes this repo uses. Anything
 * it cannot resolve is listed under `limits`/`unparsed`, never silently
 * treated as "absent" or "matching".
 */
import fs from "node:fs";
import path from "node:path";

const RECON_RANK = { MATCH_EXACT: 3, MATCH_SEMANTIC: 2, PARTIAL_EQUIVALENT: 1, UNKNOWN: 0 };

/* ------------------------------------------------------------------ */
/* Tokenising                                                          */
/* ------------------------------------------------------------------ */

/** Split SQL into statements. Comments dropped; strings and $tag$ blocks kept intact. */
export function splitStatements(sql) {
  const out = [];
  let cur = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === "-" && d === "-") {
      while (i < n && sql[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && d === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      cur += " ";
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j += 1;
      }
      cur += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '"') {
      const j = sql.indexOf('"', i + 1);
      const end = j < 0 ? n - 1 : j;
      cur += sql.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (c === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 40));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end < 0 ? n : end + tag.length;
        cur += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (c === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      i += 1;
      continue;
    }
    cur += c;
    i += 1;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** Remove dollar-quoted bodies, keeping the header (attributes live outside the body). */
function stripDollarBodies(stmt) {
  let out = "";
  let i = 0;
  while (i < stmt.length) {
    const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(stmt.slice(i, i + 40));
    if (stmt[i] === "$" && m) {
      const end = stmt.indexOf(m[0], i + m[0].length);
      out += " /*body*/ ";
      i = end < 0 ? stmt.length : end + m[0].length;
      continue;
    }
    out += stmt[i];
    i += 1;
  }
  return out;
}

function dollarBody(stmt) {
  const m = /\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(stmt);
  if (!m) return null;
  const start = m.index + m[0].length;
  const end = stmt.indexOf(m[0], start);
  return end < 0 ? stmt.slice(start) : stmt.slice(start, end);
}

function matchParen(s, openIdx) {
  let depth = 0;
  let q = null;
  for (let i = openIdx; i < s.length; i += 1) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"') q = c;
    else if (c === "(") depth += 1;
    else if (c === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(s, sep = ",") {
  const parts = [];
  let depth = 0;
  let q = null;
  let cur = "";
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (q) {
      cur += c;
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      cur += c;
    } else if (c === "(") {
      depth += 1;
      cur += c;
    } else if (c === ")") {
      depth -= 1;
      cur += c;
    } else if (c === sep && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const unq = (s) => String(s ?? "").trim().replace(/^"|"$/g, "").toLowerCase();
const IDENT = String.raw`"?([a-zA-Z_][a-zA-Z0-9_]*)"?`;
const REL = String.raw`(?:(public|auth|storage|extensions|vault|cron)\.)?${IDENT}`;

/* ------------------------------------------------------------------ */
/* Type normalisation                                                  */
/* ------------------------------------------------------------------ */

const TYPE_ALIASES = [
  [/^(int|int4|integer)$/, "integer"],
  [/^(int8|bigint)$/, "bigint"],
  [/^(int2|smallint)$/, "smallint"],
  [/^(bool|boolean)$/, "boolean"],
  [/^(timestamptz|timestamp with time zone)$/, "timestamp with time zone"],
  [/^(timestamp|timestamp without time zone)$/, "timestamp without time zone"],
  [/^(float8|double precision)$/, "double precision"],
  [/^(float4|real)$/, "real"],
  [/^(bigserial|serial8)$/, "bigint"],
  [/^(serial|serial4)$/, "integer"],
  [/^(smallserial|serial2)$/, "smallint"],
  [/^(varchar|character varying)$/, "character varying"],
  [/^(char|character)$/, "character"],
  [/^(decimal|numeric)$/, "numeric"],
];

export function normalizeType(raw) {
  let t = collapse(String(raw ?? "").toLowerCase()).replace(/"/g, "").replace(/^public\./, "");
  let array = "";
  while (/\[\s*\d*\s*\]$/.test(t)) {
    t = t.replace(/\[\s*\d*\s*\]$/, "").trim();
    array += "[]";
  }
  t = t.replace(/\barray$/, "").trim();
  if (/\barray$/.test(raw ?? "")) array += "[]";
  const paren = /^([a-z ]+?)\s*(\(.*\))?$/.exec(t);
  let base = paren ? paren[1].trim() : t;
  const args = paren?.[2] ? paren[2].replace(/\s+/g, "") : "";
  for (const [re, to] of TYPE_ALIASES) if (re.test(base)) base = to;
  const keepArgs = ["character varying", "numeric", "character"].includes(base) ? args : "";
  return `${base}${keepArgs}${array}`;
}

const SERIAL = /^(bigserial|serial8|serial|serial4|smallserial|serial2)$/i;

/* ------------------------------------------------------------------ */
/* Expected-state model                                                */
/* ------------------------------------------------------------------ */

function newState() {
  return {
    tables: new Map(),
    views: new Map(),
    indexes: new Map(),
    policies: new Map(),
    functions: new Map(),
    anonExecNames: new Map(),
    unparsed: [],
  };
}

const fnKey = (name, n) => `${name}/${n}`;

function ensureTable(state, name, file) {
  let t = state.tables.get(name);
  if (!t) {
    t = { name, cols: new Map(), pk: null, uniques: [], fks: [], checks: new Map(), rls: false, file, droppedBy: null, conditional: false };
    state.tables.set(name, t);
  }
  return t;
}

function parseColumnDef(def, file, conditional) {
  const m = new RegExp(String.raw`^${IDENT}\s+([\s\S]*)$`).exec(def.trim());
  if (!m) return null;
  const name = m[1].toLowerCase();
  const rest = m[2];
  const kw = /\b(not\s+null|null|default|primary\s+key|references|unique|check|constraint|generated|collate)\b/i.exec(rest);
  const typeRaw = (kw ? rest.slice(0, kw.index) : rest).trim();
  const tail = kw ? rest.slice(kw.index) : "";
  const serial = SERIAL.test(typeRaw);
  const col = {
    name,
    type: normalizeType(typeRaw),
    notNull: /\bnot\s+null\b/i.test(tail) || /\bprimary\s+key\b/i.test(tail) || serial,
    hasDefault: /\bdefault\b|\bgenerated\b/i.test(tail) || serial,
    file,
    conditional,
    inlinePk: /\bprimary\s+key\b/i.test(tail),
    inlineUnique: /\bunique\b/i.test(tail) && !/\bprimary\s+key\b/i.test(tail),
    inlineCheck: /\bcheck\s*\(/i.test(tail),
    references: null,
  };
  const ref = new RegExp(String.raw`references\s+${REL}\s*(?:\(([^)]*)\))?([^,]*)`, "i").exec(tail);
  if (ref) {
    const onDelete = /on\s+delete\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)/i.exec(ref[4] ?? "");
    col.references = {
      schema: (ref[1] ?? "public").toLowerCase(),
      table: ref[2].toLowerCase(),
      cols: ref[3] ? ref[3].split(",").map(unq) : [],
      onDelete: onDelete ? collapse(onDelete[1]).toUpperCase() : "NO ACTION",
    };
  }
  return col;
}

function applyTableConstraint(table, text, file) {
  const t = collapse(text);
  const named = /^constraint\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+(.*)$/i.exec(t);
  const name = named ? named[1].toLowerCase() : null;
  const body = named ? named[2] : t;
  let m;
  if ((m = /^primary key\s*\(([^)]*)\)/i.exec(body))) {
    table.pk = m[1].split(",").map(unq);
  } else if ((m = /^unique\s*\(([^)]*)\)/i.exec(body))) {
    table.uniques.push({ name, cols: m[1].split(",").map(unq), file });
  } else if ((m = new RegExp(String.raw`^foreign key\s*\(([^)]*)\)\s*references\s+${REL}\s*(?:\(([^)]*)\))?(.*)$`, "i").exec(body))) {
    const onDelete = /on\s+delete\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)/i.exec(m[5] ?? "");
    table.fks.push({
      name,
      cols: m[1].split(",").map(unq),
      refTable: m[3].toLowerCase(),
      refSchema: (m[2] ?? "public").toLowerCase(),
      refCols: m[4] ? m[4].split(",").map(unq) : [],
      onDelete: onDelete ? collapse(onDelete[1]).toUpperCase() : "NO ACTION",
      file,
    });
  } else if (/^check\s*\(/i.test(body)) {
    if (name) table.checks.set(name, { name, file });
    else table.checks.set(`<unnamed:${table.checks.size}>`, { name: null, file });
  }
}

function dropConstraintByName(table, name) {
  table.checks.delete(name);
  table.uniques = table.uniques.filter((u) => u.name !== name);
  table.fks = table.fks.filter((f) => f.name !== name);
  if (name === `${table.name}_pkey`) table.pk = null;
}

function createTable(state, stmt, file, conditional) {
  const m = new RegExp(String.raw`create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${REL}\s*\(`, "i").exec(stmt);
  if (!m) return false;
  const schema = (m[1] ?? "public").toLowerCase();
  if (schema !== "public") return true;
  const name = m[2].toLowerCase();
  const open = m.index + m[0].length - 1;
  const close = matchParen(stmt, open);
  if (close < 0) return false;
  if (state.tables.has(name) && !state.tables.get(name).droppedBy && /if\s+not\s+exists/i.test(m[0])) return true;
  const table = { name, cols: new Map(), pk: null, uniques: [], fks: [], checks: new Map(), rls: false, file, droppedBy: null, conditional };
  state.tables.set(name, table);
  for (const part of splitTopLevel(stmt.slice(open + 1, close))) {
    if (/^(constraint\s+\S+\s+)?(primary\s+key|unique|foreign\s+key|check)\b/i.test(part)) {
      applyTableConstraint(table, part, file);
      continue;
    }
    if (/^like\b/i.test(part)) {
      state.unparsed.push({ file, why: "CREATE TABLE ... LIKE not expanded", table: name });
      continue;
    }
    const col = parseColumnDef(part, file, conditional);
    if (!col) continue;
    table.cols.set(col.name, col);
    if (col.inlinePk) table.pk = [col.name];
    if (col.inlineUnique) table.uniques.push({ name: null, cols: [col.name], file });
    if (col.inlineCheck) table.checks.set(`<inline:${col.name}>`, { name: null, file });
    if (col.references) table.fks.push({ name: null, cols: [col.name], refTable: col.references.table, refSchema: col.references.schema, refCols: col.references.cols, onDelete: col.references.onDelete, file });
  }
  return true;
}

function alterTable(state, stmt, file, conditional) {
  const m = new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${REL}\s+([\s\S]*)$`, "i").exec(stmt);
  if (!m) return false;
  if ((m[1] ?? "public").toLowerCase() !== "public") return true;
  const name = m[2].toLowerCase();
  const table = state.tables.get(name);
  if (!table) {
    state.unparsed.push({ file, why: "ALTER TABLE on a table not created by any replayed file", table: name });
    return true;
  }
  for (const action of splitTopLevel(m[3])) {
    const a = collapse(action);
    let x;
    if ((x = /^add\s+column\s+(?:if\s+not\s+exists\s+)?([\s\S]*)$/i.exec(a))) {
      const col = parseColumnDef(x[1], file, conditional);
      if (col && !(table.cols.has(col.name) && /if not exists/i.test(a))) {
        table.cols.set(col.name, col);
        if (col.inlinePk) table.pk = [col.name];
        if (col.inlineUnique) table.uniques.push({ name: null, cols: [col.name], file });
        if (col.references) table.fks.push({ name: null, cols: [col.name], refTable: col.references.table, refSchema: col.references.schema, refCols: col.references.cols, onDelete: col.references.onDelete, file });
      }
    } else if ((x = /^drop\s+column\s+(?:if\s+exists\s+)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i.exec(a))) {
      table.cols.delete(x[1].toLowerCase());
    } else if ((x = /^rename\s+column\s+"?(\w+)"?\s+to\s+"?(\w+)"?/i.exec(a))) {
      const col = table.cols.get(x[1].toLowerCase());
      if (col) {
        table.cols.delete(col.name);
        col.name = x[2].toLowerCase();
        table.cols.set(col.name, col);
      }
    } else if ((x = /^alter\s+column\s+"?(\w+)"?\s+(?:set\s+data\s+)?type\s+(.*?)(?:\s+using\b.*)?$/i.exec(a))) {
      const col = table.cols.get(x[1].toLowerCase());
      if (col) col.type = normalizeType(x[2]);
    } else if ((x = /^alter\s+column\s+"?(\w+)"?\s+set\s+not\s+null/i.exec(a))) {
      const col = table.cols.get(x[1].toLowerCase());
      if (col) col.notNull = true;
    } else if ((x = /^alter\s+column\s+"?(\w+)"?\s+drop\s+not\s+null/i.exec(a))) {
      const col = table.cols.get(x[1].toLowerCase());
      if (col) col.notNull = false;
    } else if ((x = /^alter\s+column\s+"?(\w+)"?\s+set\s+default/i.exec(a))) {
      const col = table.cols.get(x[1].toLowerCase());
      if (col) col.hasDefault = true;
    } else if ((x = /^alter\s+column\s+"?(\w+)"?\s+drop\s+default/i.exec(a))) {
      const col = table.cols.get(x[1].toLowerCase());
      if (col) col.hasDefault = false;
    } else if (/^enable\s+row\s+level\s+security/i.test(a)) {
      table.rls = true;
    } else if (/^disable\s+row\s+level\s+security/i.test(a)) {
      table.rls = false;
    } else if ((x = /^drop\s+constraint\s+(?:if\s+exists\s+)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i.exec(a))) {
      dropConstraintByName(table, x[1].toLowerCase());
    } else if ((x = /^add\s+(constraint\s+[\s\S]*|primary\s+key[\s\S]*|unique[\s\S]*|foreign\s+key[\s\S]*|check[\s\S]*)$/i.exec(a))) {
      applyTableConstraint(table, x[1], file);
    } else if ((x = /^rename\s+to\s+"?(\w+)"?/i.exec(a))) {
      state.tables.delete(name);
      table.name = x[1].toLowerCase();
      state.tables.set(table.name, table);
    }
  }
  return true;
}

function createIndex(state, stmt, file) {
  const m = new RegExp(String.raw`create\s+(unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?${IDENT}\s+on\s+(?:only\s+)?${REL}`, "i").exec(stmt);
  if (!m) return false;
  if ((m[3] ?? "public").toLowerCase() !== "public") return true;
  const after = stmt.slice(m.index + m[0].length);
  const open = after.indexOf("(");
  if (open < 0) return true;
  const close = matchParen(after, open);
  const cols = splitTopLevel(after.slice(open + 1, close)).map((c) => collapse(c).toLowerCase().replace(/"/g, "").replace(/\s+(asc|nulls\s+\w+)$/g, ""));
  const where = /\bwhere\b([\s\S]*)$/i.exec(after.slice(close + 1));
  state.indexes.set(m[2].toLowerCase(), {
    name: m[2].toLowerCase(),
    table: m[4].toLowerCase(),
    unique: Boolean(m[1]),
    cols,
    partial: Boolean(where),
    file,
  });
  return true;
}

function createPolicy(state, stmt, file) {
  const m = new RegExp(String.raw`create\s+policy\s+("[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)\s+on\s+${REL}([\s\S]*)$`, "i").exec(stmt);
  if (!m) return false;
  if ((m[2] ?? "public").toLowerCase() !== "public") return true;
  const name = m[1].replace(/"/g, "");
  const table = m[3].toLowerCase();
  const rest = collapse(m[4]);
  const cmd = /\bfor\s+(all|select|insert|update|delete)\b/i.exec(rest)?.[1]?.toUpperCase() ?? "ALL";
  const roles = /\bto\s+([a-z_, ]+?)(?=\s+(?:using|with)\b|$)/i.exec(rest)?.[1]?.replace(/\s+/g, "") ?? "public";
  const usingIdx = rest.search(/\busing\s*\(/i);
  let using = null;
  if (usingIdx >= 0) {
    const open = rest.indexOf("(", usingIdx);
    using = rest.slice(open + 1, matchParen(rest, open));
  }
  state.policies.set(`${table}.${name}`, { table, name, cmd, roles, using, file, selfReference: Boolean(using && new RegExp(String.raw`\bfrom\s+(?:public\.)?${table}\b`, "i").test(using)) });
  return true;
}

function dropPolicy(state, stmt) {
  const m = new RegExp(String.raw`drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)\s+on\s+${REL}`, "i").exec(stmt);
  if (!m) return false;
  state.policies.delete(`${m[3].toLowerCase()}.${m[1].replace(/"/g, "")}`);
  return true;
}

function countArgs(argText) {
  return splitTopLevel(argText).filter((a) => a && !/^out\b/i.test(a)).length;
}

function createFunction(state, stmt, file, conditional) {
  const header = collapse(stripDollarBodies(stmt));
  const m = new RegExp(String.raw`create\s+(?:or\s+replace\s+)?function\s+${REL}\s*\(`, "i").exec(header);
  if (!m) return false;
  if ((m[1] ?? "public").toLowerCase() !== "public") return true;
  const open = m.index + m[0].length - 1;
  const close = matchParen(header, open);
  const name = m[2].toLowerCase();
  const n = countArgs(header.slice(open + 1, close));
  const attrs = header.slice(close + 1);
  const sp = /\bset\s+search_path\s*(?:=|to)\s*(.+?)(?=\s+(?:as|language|security|stable|volatile|immutable|returns|set|cost|parallel|strict|called|leakproof|\/\*body\*\/)\b|\s*\/\*body\*\/|$)/i.exec(attrs);
  state.functions.set(fnKey(name, n), {
    name,
    n,
    secDef: /\bsecurity\s+definer\b/i.test(attrs),
    searchPath: sp ? collapse(sp[1]).replace(/'/g, "").replace(/\s*,\s*/g, ", ").toLowerCase() : null,
    file,
    conditional,
  });
  return true;
}

function dropFunction(state, stmt) {
  const m = new RegExp(String.raw`drop\s+function\s+(?:if\s+exists\s+)?${REL}\s*\(`, "i").exec(stmt);
  if (!m) return false;
  const open = m.index + m[0].length - 1;
  const close = matchParen(stmt, open);
  state.functions.delete(fnKey(m[2].toLowerCase(), countArgs(stmt.slice(open + 1, close))));
  return true;
}

function createView(state, stmt, file) {
  const m = new RegExp(String.raw`create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+${REL}`, "i").exec(stmt);
  if (!m) return false;
  if ((m[1] ?? "public").toLowerCase() === "public") state.views.set(m[2].toLowerCase(), { name: m[2].toLowerCase(), file });
  return true;
}

function applyAnonExec(state, stmt, file) {
  const grant = /\b(grant|revoke)\s+(?:execute|all)(?:\s+privileges)?\s+on\s+function\s+(?:public\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*\(([^)]*)\)\s+(?:to|from)\s+([a-z_, ]+)/i.exec(collapse(stmt));
  if (!grant) return false;
  const roles = grant[4].toLowerCase().split(",").map((r) => r.trim());
  const isGrant = grant[1].toLowerCase() === "grant";
  const key = fnKey(grant[2].toLowerCase(), countArgs(grant[3]));
  if (roles.includes("anon") || roles.includes("public")) state.anonExecNames.set(key, { granted: isGrant, file });
  return true;
}

/** Dynamic grants: `foreach signature in array array['public.f(a,b)'] ... execute format('grant execute ... to anon')`. */
function applyDynamicAnonExec(state, doStmt, file) {
  const body = dollarBody(doStmt) ?? "";
  const toAnon = /grant\s+execute\s+on\s+function[^;]*?\bto\s+anon\b/i.test(body);
  const revokeAnon = /revoke\s+(?:execute|all)\s+on\s+function[^;]*?\bfrom\s+[^;']*\banon\b/i.test(body);
  if (!toAnon && !revokeAnon) return;
  const arr = /array\s*\[([\s\S]*?)\]\s*loop/i.exec(body);
  if (!arr) return;
  for (const sig of arr[1].matchAll(/'public\.([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)'/g)) {
    state.anonExecNames.set(fnKey(sig[1].toLowerCase(), countArgs(sig[2])), { granted: toAnon && !revokeAnon, file, dynamic: true });
  }
}

function applyDoBlock(state, stmt, file) {
  const body = dollarBody(stmt);
  if (body == null) return;
  applyDynamicAnonExec(state, stmt, file);
  for (const inner of splitStatements(body)) {
    const text = inner.replace(/^[\s\S]*?\b(?=create\s+(?:unlogged\s+)?table|alter\s+table|create\s+(?:unique\s+)?index|create\s+policy|drop\s+policy|create\s+(?:or\s+replace\s+)?function)/i, "");
    if (text === inner && !/^(create|alter|drop)\b/i.test(inner)) continue;
    applyStatement(state, collapseKeepStrings(text), file, true);
  }
}

const collapseKeepStrings = (s) => s;

function applyStatement(state, stmt, file, conditional = false) {
  const head = collapse(stripDollarBodies(stmt)).slice(0, 80).toLowerCase();
  if (/^do\b/.test(head)) return applyDoBlock(state, stmt, file);
  if (/^create (unlogged )?table\b/.test(head)) return createTable(state, stmt, file, conditional);
  if (/^alter table\b/.test(head)) return alterTable(state, stmt, file, conditional);
  if (/^create (unique )?index\b/.test(head)) return createIndex(state, stmt, file);
  if (/^drop index\b/.test(head)) {
    for (const n of stmt.replace(/^drop\s+index\s+(?:concurrently\s+)?(?:if\s+exists\s+)?/i, "").split(",")) state.indexes.delete(unq(n.replace(/^public\./i, "").replace(/\s+(cascade|restrict)$/i, "")));
    return true;
  }
  if (/^drop table\b/.test(head)) {
    const m = new RegExp(String.raw`drop\s+table\s+(?:if\s+exists\s+)?${REL}`, "i").exec(stmt);
    if (m && (m[1] ?? "public").toLowerCase() === "public") state.tables.delete(m[2].toLowerCase());
    return true;
  }
  if (/^create policy\b/.test(head)) return createPolicy(state, stmt, file);
  if (/^drop policy\b/.test(head)) return dropPolicy(state, stmt);
  if (/^create (or replace )?function\b/.test(head)) return createFunction(state, stmt, file, conditional);
  if (/^drop function\b/.test(head)) return dropFunction(state, stmt);
  if (/^create (or replace )?(materialized )?view\b/.test(head)) return createView(state, stmt, file);
  if (/^(grant|revoke)\b/.test(head)) return applyAnonExec(state, stmt, file);
  if (/^alter function\b/.test(head)) {
    const m = new RegExp(String.raw`alter\s+function\s+${REL}\s*\(([^)]*)\)\s+([\s\S]*)$`, "i").exec(collapse(stmt));
    if (m) {
      const fn = state.functions.get(fnKey(m[2].toLowerCase(), countArgs(m[3])));
      if (fn) {
        if (/security\s+definer/i.test(m[4])) fn.secDef = true;
        if (/security\s+invoker/i.test(m[4])) fn.secDef = false;
        const sp = /set\s+search_path\s*(?:=|to)\s*(.+)$/i.exec(m[4]);
        if (sp) fn.searchPath = collapse(sp[1]).replace(/'/g, "").replace(/\s*,\s*/g, ", ").toLowerCase();
      }
    }
    return true;
  }
  return false;
}

export function replayMigrations(root, files) {
  const state = newState();
  const order = [];
  for (const rel of files) {
    const sql = fs.readFileSync(path.join(root, rel), "utf8");
    order.push(rel);
    for (const stmt of splitStatements(sql)) applyStatement(state, stmt, rel);
  }
  return { state, order };
}

/** migrations in apply order, then pending. */
export function listReplayFiles(root) {
  const list = (dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".sql")).sort().map((f) => `${dir}/${f}`)
      : [];
  return { applied: list("supabase/migrations"), pending: list("supabase/pending") };
}

/* ------------------------------------------------------------------ */
/* Production extract                                                  */
/* ------------------------------------------------------------------ */

function parseColsString(s) {
  const cols = new Map();
  if (!s) return cols;
  for (const item of s.split(/,\s(?=[a-z_][a-z0-9_]*:)/)) {
    const parts = item.split(":");
    const name = parts.shift();
    const flags = [];
    while (parts.length && (parts[parts.length - 1] === "nn" || parts[parts.length - 1] === "d")) flags.unshift(parts.pop());
    cols.set(name, { name, type: normalizeType(parts.join(":")), notNull: flags.includes("nn"), hasDefault: flags.includes("d") });
  }
  return cols;
}

function parseConsString(s) {
  const out = { pk: null, uniques: [], fks: [], checks: new Map() };
  if (!s) return out;
  for (const item of s.split(" ;; ")) {
    const m = /^([pufc]):([^:]+):([\s\S]*)$/.exec(item);
    if (!m) continue;
    const [, kind, name, def] = m;
    if (kind === "p") out.pk = /\(([^)]*)\)/.exec(def)[1].split(",").map(unq);
    else if (kind === "u") out.uniques.push({ name, cols: /\(([^)]*)\)/.exec(def)[1].split(",").map(unq) });
    else if (kind === "f") {
      const f = /FOREIGN KEY \(([^)]*)\) REFERENCES (?:(\w+)\.)?(\w+)\(([^)]*)\)(?: ON DELETE ([A-Z ]+?))?(?: ON UPDATE [A-Z ]+)?$/.exec(def);
      out.fks.push({ name, cols: f[1].split(",").map(unq), refSchema: f[2] ?? "public", refTable: f[3], refCols: f[4].split(",").map(unq), onDelete: (f[5] ?? "NO ACTION").trim() });
    } else out.checks.set(name, { name, def, notValid: /NOT VALID$/.test(def) });
  }
  return out;
}

function parseIdxString(s) {
  const out = new Map();
  if (!s) return out;
  for (const item of s.split(" ;; ")) {
    const m = /^([^ ]+) => (U )?\((.*?)\)(?: WHERE (.*))?$/.exec(item);
    if (!m) continue;
    out.set(m[1], { name: m[1], unique: Boolean(m[2]), cols: splitTopLevel(m[3]).map((c) => collapse(c).toLowerCase().replace(/\s+(asc|desc|nulls\s+\w+)$/g, "")), partial: Boolean(m[4]) });
  }
  return out;
}

function parsePolString(s) {
  const out = new Map();
  if (!s) return out;
  for (const item of s.split(" ;; ")) {
    const [name, cmd, roles, permissive, using, check] = item.split(" | ");
    out.set(name, { name, cmd, roles, permissive, using: using === "-" ? null : using, check: check === "-" ? null : check });
  }
  return out;
}

export function loadProductionCatalog(extract) {
  const relations = new Map();
  for (const r of extract.relations) {
    relations.set(r.t, {
      name: r.t,
      kind: r.k === "v" ? "view" : "table",
      rls: r.rls,
      cols: parseColsString(r.cols),
      ...parseConsString(r.cons),
      indexes: parseIdxString(r.idx),
      policies: parsePolString(r.pol),
      anon: r.anon,
      auth: r.auth,
    });
  }
  const functions = new Map();
  for (const [name, n, sec, sp, vol, exec] of extract.functions) {
    functions.set(fnKey(name, n), {
      name,
      n,
      secDef: sec === "D",
      searchPath: sp === "-" ? null : sp === '""' ? "" : sp.toLowerCase(),
      volatility: vol,
      anonExec: exec.includes("A"),
      authExec: exec.includes("U"),
      publicExec: exec.includes("P"),
      serviceExec: exec.includes("S"),
    });
  }
  return { relations, functions };
}

/* ------------------------------------------------------------------ */
/* Reconciliation class per repo file                                  */
/* ------------------------------------------------------------------ */

export function fileReconciliation(reconciliation) {
  const byFile = new Map();
  for (const e of reconciliation.entries) {
    if (!e.repoFile) continue;
    const cur = byFile.get(e.repoFile) ?? { best: "UNKNOWN", rank: -1, productionRows: 0, repoOnly: false };
    const rank = RECON_RANK[e.status] ?? 0;
    if (rank > cur.rank) {
      cur.best = e.status;
      cur.rank = rank;
    }
    if (e.version) cur.productionRows += 1;
    if (e.priorState === "REPO_ONLY") cur.repoOnly = true;
    byFile.set(e.repoFile, cur);
  }
  const out = new Map();
  for (const [file, v] of byFile) {
    let cls;
    if (v.rank >= 1) cls = "RECONCILED";
    else if (v.productionRows > 0) cls = "HISTORY_ROW_UNPROVEN";
    else cls = "REPO_ONLY_NOT_APPLIED";
    out.set(file, { status: v.best, class: cls });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Diff                                                                */
/* ------------------------------------------------------------------ */


const SEV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };

/**
 * Backend objects that production lacks and that a client path needs, either
 * called directly (rpc/table) or through an Edge Function dependency
 * (e.g. commit-placement -> commit_placement_result). Highest severity wins.
 */
export function clientImpactMap(callGraph) {
  const map = new Map();
  const put = (key, entry) => {
    const prev = map.get(key);
    if (!prev || SEV_RANK[entry.severity] < SEV_RANK[prev.severity]) map.set(key, entry);
  };
  for (const e of callGraph?.entries ?? []) {
    if (e.productionStatus === "MISSING") put(`${e.kind}:${e.backendObject}`, { severity: e.severity, clientPaths: e.clientPaths, via: "direct" });
    for (const d of e.backendDependencies ?? []) {
      if (d.productionStatus === "MISSING") put(`${d.kind}:${d.name}`, { severity: e.severity, clientPaths: e.clientPaths, via: e.backendObject });
    }
  }
  return map;
}

const impactSeverity = (client, fallback) => (client && SEV_RANK[client.severity] <= SEV_RANK.MEDIUM ? client.severity : client ? "MEDIUM" : fallback);

const showSp = (v) => (v == null ? "unset" : v === "" || v === "''" ? "'' (empty)" : v);
const sameSet = (a, b) => a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

export function diffSchemas({ expected, production, recon, callGraph, clientColumns }) {
  const findings = [];
  const reconOf = (file) => recon.get(file) ?? { status: "UNKNOWN", class: "REPO_ONLY_NOT_APPLIED" };
  const add = (f) => {
    const reconciliation = f.file ? reconOf(f.file) : undefined;
    const out = { ...f, reconciliation };
    if (reconciliation && /MISSING_IN_PRODUCTION$/.test(f.kind)) {
      if (reconciliation.status === "PARTIAL_EQUIVALENT") out.reconciliationCaveat = "PARTIAL_EQUIVALENT proves only part of this file against production; this object may be the unproven remainder";
      else if (reconciliation.class === "RECONCILED" && f.conditional) out.reconciliationCaveat = "the file matches its production history row, but this object is created inside a guarded DO block; absence is consistent with the guard evaluating false in production, so the recorded run did not create it";
    }
    findings.push(out);
  };

  const missingClient = clientImpactMap(callGraph);

  const prodTables = new Map([...production.relations].filter(([, r]) => r.kind === "table"));
  const clientCalled = new Set();
  for (const e of callGraph?.entries ?? []) if (e.kind === "table") clientCalled.add(e.backendObject);

  /* tables */
  for (const [name, t] of expected.tables) {
    const prod = prodTables.get(name);
    if (!prod) {
      const client = missingClient.get(`table:${name}`);
      add({
        kind: "TABLE_MISSING_IN_PRODUCTION",
        object: `table:${name}`,
        file: t.file,
        conditional: t.conditional || undefined,
        severity: impactSeverity(client, t.file.startsWith("supabase/pending") ? "LOW" : "MEDIUM"),
        clientImpact: client ? { severity: client.severity, via: client.via, paths: client.clientPaths, note: "client fails soft or is gated by VITE_BACKEND_*_ENABLED (src/lib/cloud/backendCapability.ts); Edge Function paths are not gated" } : null,
        detail: `${t.cols.size} expected columns; defined by ${t.file}`,
      });
      continue;
    }
    if (t.rls && !prod.rls) add({ kind: "RLS_DISABLED_IN_PRODUCTION", object: `table:${name}`, file: t.file, severity: "CRITICAL", detail: "repo enables RLS, production has it disabled" });
    if (!t.rls && prod.rls) add({ kind: "RLS_ENABLED_ONLY_IN_PRODUCTION", object: `table:${name}`, file: t.file, severity: "INFO", detail: "production has RLS on; replayed repo migrations do not show the enable statement (it may be in a dynamic block or applied by the rls_auto_enable event trigger)" });

    /* columns */
    for (const [cn, c] of t.cols) {
      const p = prod.cols.get(cn);
      if (!p) {
        add({ kind: "COLUMN_MISSING_IN_PRODUCTION", object: `column:${name}.${cn}`, file: c.file, severity: c.notNull && !c.hasDefault ? "HIGH" : "MEDIUM", detail: `expected ${c.type}${c.notNull ? " NOT NULL" : ""} from ${c.file}`, conditional: c.conditional || undefined });
        continue;
      }
      if (c.type !== p.type) add({ kind: "COLUMN_TYPE_DRIFT", object: `column:${name}.${cn}`, file: c.file, severity: "HIGH", detail: `repo ${c.type} vs production ${p.type}` });
      if (c.notNull !== p.notNull) add({ kind: "COLUMN_NULLABILITY_DRIFT", object: `column:${name}.${cn}`, file: c.file, severity: c.notNull ? "MEDIUM" : "LOW", detail: `repo ${c.notNull ? "NOT NULL" : "nullable"} vs production ${p.notNull ? "NOT NULL" : "nullable"}` });
      if (c.hasDefault !== p.hasDefault) add({ kind: "COLUMN_DEFAULT_PRESENCE_DRIFT", object: `column:${name}.${cn}`, file: c.file, severity: "LOW", detail: `repo ${c.hasDefault ? "has" : "has no"} default vs production ${p.hasDefault ? "has" : "has no"} default` });
    }
    for (const [cn, p] of prod.cols) {
      if (!t.cols.has(cn)) add({ kind: "COLUMN_ONLY_IN_PRODUCTION", object: `column:${name}.${cn}`, file: t.file, severity: "LOW", detail: `production ${p.type}${p.notNull ? " NOT NULL" : ""}; no replayed repo migration adds it (applied outside the repo or in a dynamic block)` });
    }

    /* keys */
    const exPk = t.pk;
    if (exPk && prod.pk && !sameSet(exPk, prod.pk)) add({ kind: "PRIMARY_KEY_DRIFT", object: `pk:${name}`, file: t.file, severity: "HIGH", detail: `repo (${exPk.join(",")}) vs production (${prod.pk.join(",")})` });
    if (exPk && !prod.pk) add({ kind: "PRIMARY_KEY_MISSING_IN_PRODUCTION", object: `pk:${name}`, file: t.file, severity: "HIGH", detail: `repo (${exPk.join(",")}); production has none` });
    const prodUniqueSets = [...prod.uniques.map((u) => u.cols), ...[...prod.indexes.values()].filter((i) => i.unique && !i.partial).map((i) => i.cols)];
    for (const u of t.uniques) {
      if (!prodUniqueSets.some((s) => sameSet(s, u.cols))) add({ kind: "UNIQUE_MISSING_IN_PRODUCTION", object: `unique:${name}(${u.cols.join(",")})`, file: u.file, severity: "HIGH", detail: u.name ? `constraint ${u.name}` : "unnamed constraint" });
    }
    for (const f of t.fks) {
      const match = prod.fks.find((x) => sameSet(x.cols, f.cols) && x.refTable === f.refTable);
      if (!match) add({ kind: "FOREIGN_KEY_MISSING_IN_PRODUCTION", object: `fk:${name}(${f.cols.join(",")})->${f.refTable}`, file: f.file, severity: "MEDIUM", detail: `ON DELETE ${f.onDelete}` });
      else if (match.onDelete !== f.onDelete) add({ kind: "FOREIGN_KEY_ON_DELETE_DRIFT", object: `fk:${name}(${f.cols.join(",")})->${f.refTable}`, file: f.file, severity: "MEDIUM", detail: `repo ON DELETE ${f.onDelete} vs production ON DELETE ${match.onDelete}` });
    }
    for (const [, c] of t.checks) {
      if (c.name && !prod.checks.has(c.name)) add({ kind: "CHECK_MISSING_IN_PRODUCTION", object: `check:${name}.${c.name}`, file: c.file, severity: "MEDIUM", detail: "named check constraint absent in production" });
    }
    const hasUnnamed = [...t.checks.keys()].some((k) => k.startsWith("<"));
    for (const [cname, c] of prod.checks) {
      const exp = [...t.checks.values()].find((x) => x.name === cname);
      if (exp && c.notValid) add({ kind: "CHECK_NOT_VALIDATED_IN_PRODUCTION", object: `check:${name}.${cname}`, file: exp.file, severity: "LOW", detail: "constraint is NOT VALID: new writes are checked, existing rows are not" });
      else if (!exp && !hasUnnamed) add({ kind: "CHECK_ONLY_IN_PRODUCTION", object: `check:${name}.${cname}`, file: t.file, severity: "LOW", detail: c.notValid ? "NOT VALID; present in production only" : "present in production only" });
    }
  }

  /* views */
  for (const [vname, v] of expected.views) {
    if (!production.relations.has(vname) || production.relations.get(vname).kind !== "view") {
      add({ kind: "VIEW_MISSING_IN_PRODUCTION", object: `view:${vname}`, file: v.file, severity: "LOW", detail: "view columns are not compared (definition not read)" });
    }
  }
  for (const [rname, r] of production.relations) {
    if (r.kind === "view" && !expected.views.has(rname)) add({ kind: "VIEW_ONLY_IN_PRODUCTION", object: `view:${rname}`, file: null, severity: "LOW", detail: `${r.cols.size} columns; anon/authenticated privileges: ${r.anon}/${r.auth}` });
  }

  /* indexes: only for tables present on both sides */
  for (const [iname, idx] of expected.indexes) {
    const prod = prodTables.get(idx.table);
    if (!prod || !expected.tables.has(idx.table)) continue;
    const p = prod.indexes.get(iname);
    if (!p) add({ kind: "INDEX_MISSING_IN_PRODUCTION", object: `index:${iname}`, file: idx.file, severity: idx.unique ? "HIGH" : "LOW", detail: `${idx.unique ? "UNIQUE " : ""}(${idx.cols.join(", ")}) on ${idx.table}` });
    else if (p.unique !== idx.unique) add({ kind: "INDEX_UNIQUENESS_DRIFT", object: `index:${iname}`, file: idx.file, severity: "HIGH", detail: `repo ${idx.unique ? "UNIQUE" : "non-unique"} vs production ${p.unique ? "UNIQUE" : "non-unique"}` });
  }

  /* policies */
  for (const [key, pol] of expected.policies) {
    const prod = prodTables.get(pol.table);
    if (!prod || !expected.tables.has(pol.table)) continue;
    const p = prod.policies.get(pol.name);
    if (!p) add({ kind: "POLICY_MISSING_IN_PRODUCTION", object: `policy:${key}`, file: pol.file, severity: "HIGH", detail: `${pol.cmd} to ${pol.roles}` });
    else if (p.cmd !== pol.cmd && pol.cmd !== "ALL") add({ kind: "POLICY_COMMAND_DRIFT", object: `policy:${key}`, file: pol.file, severity: "HIGH", detail: `repo ${pol.cmd} vs production ${p.cmd}` });
  }
  for (const [tname, prod] of prodTables) {
    for (const [pname, p] of prod.policies) {
      if (!expected.policies.has(`${tname}.${pname}`) && expected.tables.has(tname)) add({ kind: "POLICY_ONLY_IN_PRODUCTION", object: `policy:${tname}.${pname}`, file: expected.tables.get(tname).file, severity: "MEDIUM", detail: `${p.cmd} to ${p.roles}` });
      const selfRef = p.using && new RegExp(String.raw`\bFROM\s+(?:public\.)?${tname}\b`, "i").test(p.using);
      if (selfRef) add({ kind: "POLICY_SELF_REFERENCE_IN_PRODUCTION", object: `policy:${tname}.${pname}`, file: expected.policies.get(`${tname}.${pname}`)?.file ?? null, severity: "HIGH", detail: "USING clause selects from its own table: direct SELECT by an authenticated user raises 42P17 (infinite recursion). Fix pending in supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql." });
    }
  }

  /* production tables that no repo migration defines */
  for (const [name, prod] of prodTables) {
    if (!expected.tables.has(name)) add({ kind: "TABLE_ONLY_IN_PRODUCTION", object: `table:${name}`, file: null, severity: name.startsWith("_") ? "MEDIUM" : "LOW", detail: `${prod.cols.size} columns, ${prod.rls ? "RLS on" : "RLS OFF"}${name === "_jev_triage_tmp" ? "; scratch table (OA-JEV-TMP-TABLE)" : ""}` });
  }

  /* functions */
  for (const [key, f] of expected.functions) {
    const p = production.functions.get(key);
    if (!p) {
      const client = missingClient.get(`rpc:${f.name}`);
      add({ kind: "FUNCTION_MISSING_IN_PRODUCTION", object: `function:${f.name}/${f.n}`, file: f.file, conditional: f.conditional || undefined, severity: impactSeverity(client, "LOW"), clientImpact: client ? { severity: client.severity, via: client.via, paths: client.clientPaths } : null, detail: `${f.secDef ? "SECURITY DEFINER" : "SECURITY INVOKER"}, search_path ${showSp(f.searchPath)}` });
      continue;
    }
    if (f.secDef !== p.secDef) add({ kind: "FUNCTION_SECURITY_MODE_DRIFT", object: `function:${f.name}/${f.n}`, file: f.file, severity: "HIGH", detail: `repo ${f.secDef ? "DEFINER" : "INVOKER"} vs production ${p.secDef ? "DEFINER" : "INVOKER"}` });
    const fsp = f.searchPath ?? null;
    const psp = p.searchPath;
    const normalizeSp = (v) => (v === "" || v === "''" ? "" : v);
    if (f.secDef && normalizeSp(fsp) !== normalizeSp(psp)) add({ kind: "FUNCTION_SEARCH_PATH_DRIFT", object: `function:${f.name}/${f.n}`, file: f.file, severity: "MEDIUM", detail: `repo ${showSp(fsp)} vs production ${showSp(psp)}` });
  }
  for (const [key, p] of production.functions) {
    if (!expected.functions.has(key)) add({ kind: "FUNCTION_ONLY_IN_PRODUCTION", object: `function:${p.name}/${p.n}`, file: null, severity: p.anonExec || p.authExec ? "MEDIUM" : "LOW", detail: `${p.secDef ? "DEFINER" : "INVOKER"}, EXECUTE ${[p.anonExec && "anon", p.authExec && "authenticated", p.serviceExec && "service_role"].filter(Boolean).join("/")}` });
    if (p.secDef && p.searchPath == null) add({ kind: "DEFINER_WITHOUT_SEARCH_PATH_IN_PRODUCTION", object: `function:${p.name}/${p.n}`, file: expected.functions.get(key)?.file ?? null, severity: "HIGH", detail: "SECURITY DEFINER with no function-level search_path" });
    if (p.publicExec) add({ kind: "PUBLIC_EXECUTE_IN_PRODUCTION", object: `function:${p.name}/${p.n}`, file: null, severity: "HIGH", detail: "EXECUTE granted to PUBLIC" });
    if (p.anonExec) {
      const g = expected.anonExecNames.get(key);
      if (!g || !g.granted) add({ kind: "ANON_EXECUTE_NOT_BACKED_BY_REPO_GRANT", object: `function:${p.name}/${p.n}`, file: expected.functions.get(key)?.file ?? null, severity: "HIGH", detail: "production lets anon execute this function; the replayed repo has no standing anon grant" });
    }
  }

  /* production anon table privileges */
  const broad = [...prodTables.values()].filter((t) => t.anon === "ALL");
  if (broad.length) {
    add({
      kind: "BROAD_ANON_TABLE_PRIVILEGES_IN_PRODUCTION",
      object: `tables:${broad.length}`,
      file: null,
      severity: "HIGH",
      detail: `anon holds DELETE/INSERT/UPDATE/TRUNCATE/... on ${broad.length} of ${prodTables.size} tables (RLS is the only guard). Least-privilege migrations are repo-only: 20260828013000_api_role_table_grants.sql, 20260828020000_least_privilege_api_grants.sql.`,
      tables: broad.map((t) => t.name),
    });
  }
  const noPolicyWritable = [...prodTables.values()].filter((t) => t.rls && t.policies.size === 0 && (t.anon === "ALL" || t.auth === "ALL"));
  if (noPolicyWritable.length) add({ kind: "RLS_NO_POLICY_DENY_ALL_WITH_GRANTS", object: `tables:${noPolicyWritable.length}`, file: null, severity: "INFO", detail: "RLS on, zero policies: deny-all for anon/authenticated despite the broad privilege flags (intentional for server-only tables)", tables: noPolicyWritable.map((t) => t.name) });

  /* client column usage vs production */
  for (const use of clientColumns ?? []) {
    const prod = prodTables.get(use.table);
    if (!prod) continue;
    for (const col of use.columns) {
      if (!prod.cols.has(col)) {
        const expectedBy = expected.tables.get(use.table)?.cols.get(col);
        add({
          kind: "CLIENT_COLUMN_MISSING_IN_PRODUCTION",
          object: `client:${use.table}.${col}`,
          file: expectedBy?.file ?? null,
          severity: "HIGH",
          clientImpact: { paths: use.paths, usage: use.usage },
          detail: expectedBy ? `client reads/writes ${use.table}.${col}; repo defines it in ${expectedBy.file} but production lacks it` : `client reads/writes ${use.table}.${col}; no replayed repo migration defines it either`,
        });
      }
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/* Client column scanner                                               */
/* ------------------------------------------------------------------ */

function walkSrc(root, dir, out = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walkSrc(root, rel, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.|\.d\.ts$/.test(e.name) && !/__tests__|fixtures/.test(rel)) out.push(rel);
  }
  return out;
}

const PLAIN_COL = /^[a-z_][a-z0-9_]*$/;

function selectColumns(sel) {
  const cols = [];
  let depth = 0;
  let cur = "";
  for (const ch of sel) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      cols.push(cur);
      cur = "";
    } else if (depth === 0) cur += ch;
  }
  cols.push(cur);
  return cols.map((c) => c.trim().replace(/^[a-z_]+:/, "")).filter((c) => PLAIN_COL.test(c));
}


/** keys at brace depth 1 of an object literal (or array of literals); nested objects, spreads and values are ignored. */
export function topLevelKeys(literal) {
  const keys = [];
  let depth = 0;
  let q = null;
  let seg = "";
  const flush = () => {
    const t = seg.trim();
    seg = "";
    if (!t || t.startsWith("...")) return;
    const k = /^([a-z_][a-z0-9_]*)\s*(?::|$)/.exec(t);
    if (k) keys.push(k[1]);
  };
  for (const ch of literal) {
    if (q) {
      if (depth === 1) seg += ch;
      if (ch === q) q = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      q = ch;
      if (depth === 1) seg += ch;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth += 1;
      if (depth > 1) seg += ch;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      if (depth === 1) flush();
      depth -= 1;
      if (depth >= 1) seg += ch;
      continue;
    }
    if (ch === "," && depth === 1) {
      flush();
      continue;
    }
    if (depth === 1) seg += ch;
    else if (depth > 1) seg += ch;
  }
  return keys.filter((k) => PLAIN_COL.test(k));
}

/** literal-only column references behind `.from("t")`; dynamic payloads are listed in `unresolved`. */
export function scanClientColumns(root, productionTables) {
  const uses = new Map();
  const unresolved = [];
  for (const rel of walkSrc(root, "src")) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    for (const m of text.matchAll(/\.from\(\s*["']([a-z_][a-z0-9_]*)["']\s*\)/g)) {
      if (!productionTables.has(m[1])) continue;
      const rest = text.slice(m.index + m[0].length);
      const stop = rest.search(/;\s*\n|\n\s*\n/);
      const chain = stop < 0 ? rest.slice(0, 1200) : rest.slice(0, stop);
      const line = text.slice(0, m.index).split("\n").length;
      const cols = new Set();
      const usage = [];
      for (const s of chain.matchAll(/\.select\(\s*["'`]([^"'`]*)["'`]/g)) {
        const sc = selectColumns(s[1].replace(/\s+/g, " "));
        sc.forEach((c) => cols.add(c));
        if (sc.length) usage.push("select");
      }
      for (const f of chain.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order|match)\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/g)) {
        cols.add(f[1]);
        usage.push("filter");
      }
      for (const w of chain.matchAll(/\.(insert|upsert|update)\(/g)) {
        const open = w.index + w[0].length - 1;
        const close = matchParen(chain, open);
        const first = splitTopLevel(chain.slice(open + 1, close < 0 ? undefined : close))[0] ?? "";
        const elements = first.startsWith("[") ? splitTopLevel(first.slice(1, first.lastIndexOf("]"))) : [first];
        if (elements.every((el) => el.startsWith("{"))) {
          elements.forEach((el) => topLevelKeys(el).forEach((k) => cols.add(k)));
          usage.push(w[1]);
        } else {
          unresolved.push({ table: m[1], path: `${rel}:${line}`, via: `${w[1]}(${first.slice(0, 40)})`, why: "payload object built elsewhere; keys not statically resolvable" });
        }
      }
      if (cols.size) {
        const key = m[1];
        const entry = uses.get(key) ?? { table: key, columns: new Set(), paths: new Set(), usage: new Set() };
        cols.forEach((c) => entry.columns.add(c));
        entry.paths.add(`${rel}:${line}`);
        usage.forEach((u) => entry.usage.add(u));
        uses.set(key, entry);
      }
    }
  }
  return {
    uses: [...uses.values()].map((u) => ({ table: u.table, columns: [...u.columns].sort(), paths: [...u.paths].sort(), usage: [...u.usage].sort() })).sort((a, b) => a.table.localeCompare(b.table)),
    unresolved,
  };
}
