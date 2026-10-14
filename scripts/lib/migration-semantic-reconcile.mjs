import { createHash } from "node:crypto";
import { normalizedMigrationHash } from "./rc2-3-10-cloud.mjs";

export const COMPARE_STATUS = ["MATCH_EXACT", "MATCH_SEMANTIC", "PARTIAL_EQUIVALENT", "UNKNOWN"];

const IDENT = String.raw`"[^"]+"|[a-z_][\w$]*`;
const QNAME = String.raw`(?:${IDENT})(?:\.(?:${IDENT}))?`;
const PLACEHOLDER_TEXT = /applied via execute_sql|applied (?:out of band|outside)/i;

const digest = (text) => createHash("sha1").update(String(text), "utf8").digest("hex").slice(0, 12);

function readDollarTag(sql, i) {
  const m = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i, i + 64));
  return m ? m[0] : null;
}

function scan(sql, { split, lower }) {
  const src = String(sql).replace(/\r\n?/g, "\n");
  const statements = [];
  let out = "";
  let pendingSpace = false;
  const push = (text) => {
    if (pendingSpace && out && !/[(,;]$/.test(out) && !/^[(),;]/.test(text)) out += " ";
    pendingSpace = false;
    out += text;
  };
  const endStatement = () => {
    const text = out.trim();
    if (text) statements.push(text);
    out = "";
    pendingSpace = false;
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "-" && next === "-") {
      while (i < src.length && src[i] !== "\n") i++;
      pendingSpace = true;
    } else if (c === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        if (src[i] === "/" && src[i + 1] === "*") (depth++, (i += 2));
        else if (src[i] === "*" && src[i + 1] === "/") (depth--, (i += 2));
        else i++;
      }
      pendingSpace = true;
    } else if (/\s/.test(c)) {
      pendingSpace = true;
      i++;
    } else if (c === "'") {
      const escaped = /(?:^|[^\w$])[eE]$/.test(out);
      let j = i + 1;
      while (j < src.length) {
        if (escaped && src[j] === "\\") j += 2;
        else if (src[j] === "'") break;
        else j++;
      }
      push(src.slice(i, j + 1));
      i = j + 1;
    } else if (c === '"') {
      const j = src.indexOf('"', i + 1);
      const end = j === -1 ? src.length : j + 1;
      push(src.slice(i, end));
      i = end;
    } else if (c === "$" && readDollarTag(src, i)) {
      const tag = readDollarTag(src, i);
      const close = src.indexOf(tag, i + tag.length);
      if (close === -1) {
        push(tag);
        i += tag.length;
      } else {
        push(`${tag}${scan(src.slice(i + tag.length, close), { split: false, lower })}${tag}`);
        i = close + tag.length;
      }
    } else if (c === ";") {
      if (split) endStatement();
      else if (!out.endsWith(";")) push(";");
      i++;
    } else {
      push(lower ? c.toLowerCase() : c);
      i++;
    }
  }
  if (split) {
    endStatement();
    return statements;
  }
  return out.trim();
}

/** Strips comments and canonicalizes whitespace and semicolons outside quoted text. */
export function normalizeSql(sql) {
  return scan(sql, { split: true, lower: false })
    .map((statement) => `${statement};`)
    .join("\n");
}

export function isPlaceholderSql(sql) {
  const text = String(sql ?? "");
  if (PLACEHOLDER_TEXT.test(text)) return true;
  const stripped = normalizeSql(text).replace(/;/g, "").trim().toLowerCase();
  return stripped === "" || stripped === "select 1";
}

function unquote(ident) {
  return ident.startsWith('"') ? ident.slice(1, -1) : ident;
}

function qualify(raw, defaultSchema = "public") {
  const parts = String(raw).match(new RegExp(IDENT, "g")) ?? [];
  if (parts.length >= 2) return { schema: unquote(parts[0]), name: unquote(parts[1]) };
  return { schema: defaultSchema, name: unquote(parts[0] ?? String(raw)) };
}

function splitTopLevel(text, separator = ",") {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === separator && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function balanced(text, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return { inner: text.slice(openIndex + 1, i), end: i + 1 };
  }
  return { inner: text.slice(openIndex + 1), end: text.length };
}

function maskBodies(statement) {
  const bodies = [];
  const masked = statement.replace(/(\$(?:[A-Za-z_]\w*)?\$)[\s\S]*?\1/g, (m) => {
    bodies.push(m);
    return `\u00a7${bodies.length - 1}\u00a7`;
  });
  return { masked, bodies };
}

const compactArgs = (text) => text.replace(/\s+/g, " ").trim();

function functionObject(kind, statement) {
  const { masked, bodies } = maskBodies(statement);
  const head = new RegExp(`^create (?:or replace )?${kind} (${QNAME})\\s*\\(`).exec(masked);
  if (!head) return null;
  const { schema, name } = qualify(head[1]);
  const open = head[0].length - 1;
  const args = balanced(masked, open);
  const rest = masked.slice(args.end);
  let body = bodies[0] ?? null;
  if (!body) {
    const quoted = /\bas ('(?:[^']|'')*')/.exec(rest);
    body = quoted?.[1] ?? null;
  }
  const attrs = {
    returns: /\breturns (setof )?(table ?\(.*?\)|[\w."]+(?:\[\])?)/.exec(rest)?.slice(1).join("").trim() ?? null,
    language: /\blanguage (\w+)/.exec(rest)?.[1] ?? null,
    security: /\bsecurity (definer|invoker)/.exec(rest)?.[1] ?? null,
    volatility: /\b(immutable|stable|volatile)\b/.exec(rest)?.[1] ?? null,
    config: [...rest.matchAll(/\bset (\w+)(?: to |=)([^\s]+(?: ?, ?[^\s]+)*)/g)].map((m) => `${m[1]}=${m[2]}`).sort(),
    body: body ? digest(body) : null,
  };
  return { kind, schema, name: `${name}(${compactArgs(args.inner)})`, attrs };
}

function columnObject(schema, table, definition) {
  const m = new RegExp(`^(${IDENT})\\s+(.*)$`).exec(definition);
  if (!m) return { kind: "statement", schema: null, name: `column#${digest(definition)}`, attrs: { digest: digest(definition) } };
  const rest = m[2];
  const type = rest.split(/\s+(?=not null\b|null\b|default\b|primary key\b|unique\b|references\b|check\b|constraint\b|generated\b|collate\b)/)[0];
  const defaultMatch = /\bdefault (.*?)(?= not null\b| null\b| primary key\b| unique\b| references\b| check\b| constraint\b| generated\b|$)/.exec(rest);
  return {
    kind: "column",
    schema,
    name: `${table}.${unquote(m[1])}`,
    attrs: {
      type,
      notNull: /\bnot null\b|\bprimary key\b/.test(rest),
      default: defaultMatch?.[1] ?? null,
      definition: digest(rest),
    },
  };
}

function constraintObject(schema, table, definition) {
  const named = new RegExp(`^constraint (${IDENT}) (.*)$`).exec(definition);
  const name = named ? unquote(named[1]) : `unnamed#${digest(definition)}`;
  return { kind: "constraint", schema, name: `${table}.${name}`, attrs: { definition: digest(named ? named[2] : definition) } };
}

const CONSTRAINT_START = /^(?:constraint|primary key|unique|check|foreign key|exclude|like)\b/;

function tableObjects(statement) {
  const m = new RegExp(`^create (?:(?:global |local )?(temp|temporary|unlogged) )?table (?:if not exists )?(${QNAME})\\s*\\(`).exec(statement);
  if (!m) return null;
  const { schema, name } = qualify(m[2]);
  const list = balanced(statement, m[0].length - 1);
  const objects = [{ kind: "table", schema, name, attrs: m[1] ? { persistence: m[1] } : undefined }];
  for (const item of splitTopLevel(list.inner)) {
    objects.push(CONSTRAINT_START.test(item) ? constraintObject(schema, name, item) : columnObject(schema, name, item));
  }
  const tail = statement.slice(list.end).trim();
  if (tail) objects[0].attrs = { ...objects[0].attrs, options: digest(tail) };
  return objects;
}

function alterTableObjects(statement) {
  const m = new RegExp(`^alter table (?:if exists )?(?:only )?(${QNAME})(?: \\*)? (.*)$`).exec(statement);
  if (!m) return null;
  const { schema, name } = qualify(m[1]);
  return splitTopLevel(m[2]).map((action) => {
    let a;
    if ((a = new RegExp(`^add column (?:if not exists )?(.*)$`).exec(action))) return columnObject(schema, name, a[1]);
    if (/^add (?:constraint|primary key|unique|check|foreign key|exclude)\b/.test(action)) return constraintObject(schema, name, action.replace(/^add /, ""));
    if ((a = new RegExp(`^add (?!constraint\\b)(.*)$`).exec(action))) return columnObject(schema, name, a[1]);
    if ((a = new RegExp(`^drop column (?:if exists )?(${IDENT})`).exec(action))) return { kind: "drop_column", schema, name: `${name}.${unquote(a[1])}` };
    if ((a = new RegExp(`^drop constraint (?:if exists )?(${IDENT})`).exec(action))) return { kind: "drop_constraint", schema, name: `${name}.${unquote(a[1])}` };
    if (/row level security$/.test(action)) return { kind: "rls", schema, name, attrs: { action } };
    if ((a = new RegExp(`^alter column (${IDENT}) (.*)$`).exec(action))) {
      return { kind: "alter_column", schema, name: `${name}.${unquote(a[1])}`, attrs: { action: a[2] } };
    }
    return { kind: "alter_table", schema, name, attrs: { action: digest(action), verb: action.split(" ").slice(0, 2).join(" ") } };
  });
}

function indexObject(statement) {
  const m = new RegExp(`^create (unique )?index (?:concurrently )?(?:if not exists )?(?:(${IDENT}) )?on (?:only )?(${QNAME})(.*)$`).exec(statement);
  if (!m) return null;
  const table = qualify(m[3]);
  return {
    kind: "index",
    schema: table.schema,
    name: m[2] ? unquote(m[2]) : `unnamed#${digest(m[4])}`,
    attrs: { table: table.name, unique: Boolean(m[1]), definition: digest(m[4]) },
  };
}

function policyObject(statement) {
  const m = new RegExp(`^create policy (${IDENT}) on (${QNAME})(.*)$`).exec(statement);
  if (!m) return null;
  const table = qualify(m[2]);
  const rest = m[3];
  const clause = (keyword) => {
    const at = rest.indexOf(`${keyword} (`);
    return at === -1 ? null : digest(balanced(rest, at + keyword.length + 1).inner);
  };
  const rolesText = /\bto (.+?)(?= using \(| with check \(|$)/.exec(rest)?.[1];
  return {
    kind: "policy",
    schema: table.schema,
    name: `${table.name}.${unquote(m[1])}`,
    attrs: {
      mode: /\bas (permissive|restrictive)/.exec(rest)?.[1] ?? "permissive",
      command: /\bfor (all|select|insert|update|delete)\b/.exec(rest)?.[1] ?? "all",
      roles: rolesText ? splitTopLevel(rolesText).sort() : ["public"],
      using: clause("using"),
      withCheck: clause("with check"),
    },
  };
}

const OBJECT_PREFIX = /^(all (?:tables|sequences|functions|routines|procedures) in schema|table|sequence|function|procedure|routine|schema|type|domain|database|language)\b ?(.*)$/;

function normalizeGrantObject(type, text) {
  if (type.startsWith("all ")) return text.replace(/\s+/g, " ");
  if (type === "schema" || type === "database" || type === "language") return unquote(text.trim());
  const [head, ...tail] = text.split("(");
  const { schema, name } = qualify(head.trim());
  return `${schema}.${name}${tail.length ? `(${compactArgs(tail.join("("))}` : ""}`;
}

function grantObjects(statement) {
  const m = /^(grant|revoke) (grant option for )?(.+?) on (.+?) (to|from) (.+)$/.exec(statement);
  if (!m) return null;
  const [, verb, , privilegeText, targetText, direction, granteeText] = m;
  const grantOption = /\bwith grant option$/.test(granteeText);
  const grantees = splitTopLevel(granteeText.replace(/\s+(with grant option|cascade|restrict)$/, ""));
  const target = OBJECT_PREFIX.exec(targetText);
  const type = target?.[1] ?? "table";
  const objectText = target ? target[2] : targetText;
  const objects = type.startsWith("all ") ? [objectText] : splitTopLevel(objectText);
  const out = [];
  for (const privilege of splitTopLevel(privilegeText.replace(/^all privileges$/, "all"))) {
    for (const object of objects) {
      const normalized = normalizeGrantObject(type, object);
      for (const grantee of grantees) {
        out.push({
          kind: verb,
          schema: /^(schema|database|language)$/.test(type) || type.startsWith("all ") ? null : normalized.split(".")[0],
          name: `${compactArgs(privilege)} on ${type} ${normalized} ${direction} ${grantee}`,
          attrs: grantOption ? { grantOption: true } : undefined,
        });
      }
    }
  }
  return out;
}

function triggerObject(statement) {
  const m = new RegExp(`^create (?:or replace )?(?:constraint )?trigger (${IDENT}) (before|after|instead of) (.+?) on (${QNAME})(.*)$`).exec(statement);
  if (!m) return null;
  const table = qualify(m[4]);
  return {
    kind: "trigger",
    schema: table.schema,
    name: `${table.name}.${unquote(m[1])}`,
    attrs: {
      timing: m[2],
      events: m[3],
      execute: /\bexecute (?:function|procedure) (.+)$/.exec(m[5])?.[1] ?? null,
      definition: digest(m[5]),
    },
  };
}

function viewObject(statement) {
  const m = new RegExp(`^create (?:or replace )?(?:temp |temporary )?(?:recursive )?(materialized )?view (?:if not exists )?(${QNAME})(.*)$`).exec(statement);
  if (!m) return null;
  const { schema, name } = qualify(m[2]);
  return { kind: m[1] ? "materialized_view" : "view", schema, name, attrs: { definition: digest(m[3]) } };
}

function extensionObject(statement) {
  const m = new RegExp(`^create extension (?:if not exists )?(${IDENT})(.*)$`).exec(statement);
  if (!m) return null;
  return {
    kind: "extension",
    schema: null,
    name: unquote(m[1]),
    attrs: { schema: new RegExp(`\\bschema (${IDENT})`).exec(m[2])?.[1]?.replace(/"/g, "") ?? null },
  };
}

function typeObject(statement) {
  let m = new RegExp(`^create type (${QNAME}) as enum ?\\(`).exec(statement);
  if (m) {
    const { schema, name } = qualify(m[1]);
    const values = splitTopLevel(balanced(statement, m[0].length - 1).inner);
    return { kind: "type", schema, name, attrs: { enum: values } };
  }
  m = new RegExp(`^create (type|domain) (${QNAME})(.*)$`).exec(statement);
  if (!m) return null;
  const { schema, name } = qualify(m[2]);
  return { kind: m[1], schema, name, attrs: { definition: digest(m[3]) } };
}

const GENERIC_CREATE = /^create (?:or replace )?(schema|sequence|role|user|rule|publication|aggregate|operator|collation|cast|server|event trigger)\b (?:if not exists )?(.*)$/;
const DROP_KINDS = "table|function|procedure|index|policy|trigger|view|materialized view|type|domain|schema|extension|sequence|role|user|rule|publication|event trigger";
const ALTER_KINDS = "function|procedure|type|domain|schema|sequence|view|materialized view|extension|index|role|user|publication|policy|trigger|default privileges|system|database";

function dropObjects(statement) {
  const m = new RegExp(`^drop (${DROP_KINDS}) (?:concurrently )?(?:if exists )?(.+?)(?: (?:cascade|restrict))?$`).exec(statement);
  if (!m) return null;
  const kind = `drop_${m[1].replace(/ /g, "_")}`;
  if (m[1] === "policy" || m[1] === "trigger") {
    const on = new RegExp(`^(${IDENT}) on (${QNAME})$`).exec(m[2]);
    if (on) {
      const table = qualify(on[2]);
      return [{ kind, schema: table.schema, name: `${table.name}.${unquote(on[1])}` }];
    }
  }
  return splitTopLevel(m[2]).map((target) => {
    const [head, ...tail] = target.split("(");
    const { schema, name } = qualify(head.trim());
    const suffix = tail.length ? `(${compactArgs(tail.join("("))}` : /^(function|procedure)$/.test(m[1]) ? "()" : "";
    return { kind, schema: ["schema", "extension", "role", "user"].includes(m[1]) ? null : schema, name: `${name}${suffix}` };
  });
}

function otherAlterObject(statement) {
  const m = new RegExp(`^alter (${ALTER_KINDS}) (.*)$`).exec(statement);
  if (!m) return null;
  const kind = `alter_${m[1].replace(/ /g, "_")}`;
  if (m[1] === "default privileges") return { kind, schema: null, name: `#${digest(m[2])}` };
  const head = new RegExp(`^(${QNAME})(\\s*\\(.*?\\))?(.*)$`).exec(m[2]);
  if (!head) return { kind, schema: null, name: `#${digest(m[2])}` };
  const { schema, name } = qualify(head[1]);
  const args = head[2] ? compactArgs(head[2]) : "";
  return { kind, schema, name: `${name}${args}`, attrs: { action: digest(head[3]) } };
}

function genericObject(statement) {
  const create = GENERIC_CREATE.exec(statement);
  if (create) {
    const head = new RegExp(`^(${QNAME})(.*)$`).exec(create[2]);
    const { schema, name } = head ? qualify(head[1]) : { schema: null, name: `#${digest(create[2])}` };
    return { kind: create[1].replace(/ /g, "_"), schema: ["schema", "role", "user"].includes(create[1]) ? null : schema, name, attrs: { definition: digest(head?.[2] ?? "") } };
  }
  const comment = /^comment on (\w+(?: \w+)?) (.+?) is (.*)$/.exec(statement);
  if (comment) return { kind: "comment", schema: null, name: `${comment[1]} ${compactArgs(comment[2])}`, attrs: { text: digest(comment[3]) } };
  const words = statement.split(" ").slice(0, 3).join(" ").slice(0, 60);
  return { kind: "statement", schema: null, name: `${words}#${digest(statement).slice(0, 8)}`, attrs: { digest: digest(statement) } };
}

const IGNORED_STATEMENT = /^(?:begin|commit|end|start transaction|rollback)$/;

function statementObjects(statement) {
  if (IGNORED_STATEMENT.test(statement)) return [];
  const asList = (value) => (Array.isArray(value) ? value : value ? [value] : null);
  const handlers = [
    [/^create (?:or replace )?function\b/, (s) => asList(functionObject("function", s))],
    [/^create (?:or replace )?procedure\b/, (s) => asList(functionObject("procedure", s))],
    [/^create (?:(?:global |local )?(?:temp |temporary |unlogged ))?table\b/, tableObjects],
    [/^alter table\b/, alterTableObjects],
    [/^create (?:unique )?index\b/, (s) => asList(indexObject(s))],
    [/^create policy\b/, (s) => asList(policyObject(s))],
    [/^(?:grant|revoke)\b/, grantObjects],
    [/^create (?:or replace )?(?:constraint )?trigger\b/, (s) => asList(triggerObject(s))],
    [/^create (?:or replace )?(?:temp |temporary )?(?:recursive )?(?:materialized )?view\b/, (s) => asList(viewObject(s))],
    [/^create extension\b/, (s) => asList(extensionObject(s))],
    [/^create (?:type|domain)\b/, (s) => asList(typeObject(s))],
    [/^drop\b/, dropObjects],
    [/^alter\b/, (s) => asList(otherAlterObject(s))],
  ];
  for (const [test, handle] of handlers) {
    if (test.test(statement)) {
      const objects = handle(statement);
      if (objects?.length) return objects;
      break;
    }
  }
  return [genericObject(statement)];
}

function canonicalObject(object) {
  const out = { kind: object.kind, schema: object.schema ?? null, name: object.name };
  if (object.attrs !== undefined) {
    const entries = Object.entries(object.attrs).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length) out.attrs = Object.fromEntries(entries);
  }
  return out;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const identityOf = (o) => `${o.kind}|${o.schema ?? ""}|${o.name}`;
const fullKeyOf = (o) => `${identityOf(o)}|${stableStringify(o.attrs ?? null)}`;

function orderedObjects(sql) {
  const objects = [];
  for (const statement of scan(sql, { split: true, lower: true })) {
    for (const object of statementObjects(statement)) objects.push(canonicalObject(object));
  }
  return objects;
}

/** Sorted, de-duplicated list of {kind, schema, name, attrs?} created or altered by the SQL. */
export function extractStructuralSignature(sql) {
  const byKey = new Map();
  for (const object of orderedObjects(sql)) byKey.set(fullKeyOf(object), object);
  return [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, object]) => object);
}

export function structuralHash(sql) {
  return createHash("sha256").update(stableStringify(extractStructuralSignature(sql)), "utf8").digest("hex");
}

export const objectLabel = (o) => `${o.kind}:${o.schema ? `${o.schema}.` : ""}${o.name}`;

function diffSignatures(a, b) {
  const aKeys = new Map(a.map((o) => [fullKeyOf(o), o]));
  const bKeys = new Map(b.map((o) => [fullKeyOf(o), o]));
  const aIds = new Map(a.map((o) => [identityOf(o), o]));
  const bIds = new Map(b.map((o) => [identityOf(o), o]));
  const onlyInA = [];
  const onlyInB = [];
  const changed = [];
  for (const [key, object] of aKeys) {
    if (bKeys.has(key)) continue;
    if (bIds.has(identityOf(object))) changed.push({ object: objectLabel(object), a: object.attrs ?? null, b: bIds.get(identityOf(object)).attrs ?? null });
    else onlyInA.push(objectLabel(object));
  }
  for (const [key, object] of bKeys) {
    if (!aKeys.has(key) && !aIds.has(identityOf(object))) onlyInB.push(objectLabel(object));
  }
  return { shared: [...aKeys.keys()].filter((k) => bKeys.has(k)).length, aCount: aKeys.size, bCount: bKeys.size, onlyInA, onlyInB, changed };
}

/**
 * Proves (or declines to prove) that two migrations do the same thing. Equivalence
 * is only ever concluded from SQL content; names and descriptions are not evidence.
 */
export function compareMigrations(aSql, bSql) {
  const unknown = (confidence, evidence, structuralDiff = null) => ({ status: "UNKNOWN", confidence, evidence, structuralDiff });
  if (isPlaceholderSql(aSql) || isPlaceholderSql(bSql)) {
    const which = [isPlaceholderSql(aSql) && "a", isPlaceholderSql(bSql) && "b"].filter(Boolean).join(" and ");
    return unknown(0, [`${which} is a placeholder (empty, select 1 or applied via execute_sql): no content to compare`]);
  }
  const hashA = normalizedMigrationHash(aSql);
  const hashB = normalizedMigrationHash(bSql);
  if (hashA === hashB) {
    return { status: "MATCH_EXACT", confidence: 1, evidence: [`normalized migration hash ${hashA} is equal`], structuralDiff: { shared: extractStructuralSignature(aSql).length, onlyInA: [], onlyInB: [], changed: [] } };
  }
  const orderA = orderedObjects(aSql);
  const orderB = orderedObjects(bSql);
  const sigA = extractStructuralSignature(aSql);
  const sigB = extractStructuralSignature(bSql);
  if (!sigA.length || !sigB.length) return unknown(0, ["a migration has no extractable structural objects"]);
  const diff = diffSignatures(sigA, sigB);
  const { onlyInA, onlyInB, changed } = diff;
  if (!onlyInA.length && !onlyInB.length && !changed.length) {
    const sameOrder = orderA.map(fullKeyOf).join("\n") === orderB.map(fullKeyOf).join("\n");
    if (!sameOrder) {
      return unknown(0.5, [`same ${sigA.length} structural objects but in a different statement order; order can change the outcome`], diff);
    }
    return {
      status: "MATCH_SEMANTIC",
      confidence: 0.95,
      evidence: [`structural hash ${structuralHash(aSql).slice(0, 16)} equal`, `${sigA.length} structural objects identical (kind, schema, name, attributes) in the same order`, "normalized hashes differ only by comment or whitespace-level formatting"],
      structuralDiff: diff,
    };
  }
  if (!changed.length && (!onlyInA.length || !onlyInB.length)) {
    const smallerIsA = !onlyInA.length;
    const smaller = smallerIsA ? diff.aCount : diff.bCount;
    const larger = smallerIsA ? diff.bCount : diff.aCount;
    return {
      status: "PARTIAL_EQUIVALENT",
      confidence: Number(Math.min(0.9, 0.5 + 0.4 * (smaller / larger)).toFixed(2)),
      evidence: [
        `all ${smaller} structural objects of ${smallerIsA ? "a" : "b"} are present with identical attributes in ${smallerIsA ? "b" : "a"} (${larger} objects)`,
        `${larger - smaller} objects exist only in ${smallerIsA ? "b" : "a"}`,
      ],
      structuralDiff: { ...diff, subset: smallerIsA ? "a_subset_of_b" : "b_subset_of_a" },
    };
  }
  const overlap = diff.shared / Math.max(diff.aCount, diff.bCount);
  const evidence = [`cannot prove equivalence: ${diff.shared} shared, ${onlyInA.length} only in a, ${onlyInB.length} only in b, ${changed.length} changed`];
  if (changed.length) evidence.push(`objects with the same identity but different attributes: ${changed.slice(0, 5).map((c) => c.object).join(", ")}`);
  return unknown(Number((0.3 * overlap).toFixed(2)), evidence, diff);
}

/** Share of `sql`'s structural objects (with equal attributes) found in the union of `others`. */
export function coverageByUnion(sql, others) {
  const sig = extractStructuralSignature(sql);
  const pool = new Set(others.flatMap((other) => extractStructuralSignature(other).map(fullKeyOf)));
  const missing = sig.filter((o) => !pool.has(fullKeyOf(o)));
  return { total: sig.length, covered: sig.length - missing.length, missing: missing.map(objectLabel) };
}
