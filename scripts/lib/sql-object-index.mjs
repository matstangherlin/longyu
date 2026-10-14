import fs from "node:fs";
import path from "node:path";

export const MIGRATION_DIRS = ["supabase/migrations", "supabase/pending"];

const IDENT = String.raw`"?([a-z_][a-z0-9_]*)"?`;
const PUBLIC = String.raw`(?:public\.)?`;

export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, "");
}

/**
 * Dollar-quoted blocks. `kind` separates bodies that only run when a function
 * is called (`as $$ ... $$`) from bodies that execute during the migration
 * (`do $$ ... $$`, `execute $f$ ... $f$`).
 */
export function dollarBlocks(sql) {
  const blocks = [];
  const open = /\$([a-z_]*)\$/gi;
  let match;
  while ((match = open.exec(sql))) {
    const tag = match[0];
    const start = match.index + tag.length;
    const end = sql.indexOf(tag, start);
    if (end < 0) break;
    const before = sql.slice(Math.max(0, match.index - 40), match.index).toLowerCase();
    let kind = "other";
    if (/\bdo\s*$/.test(before)) kind = "do";
    else if (/\bexecute\s*$/.test(before)) kind = "execute";
    else if (/\bas\s*$/.test(before)) kind = "function-body";
    blocks.push({ kind, tag, openAt: match.index, start, end, closeAt: end + tag.length });
    open.lastIndex = end + tag.length;
  }
  return blocks;
}

/** SQL that runs at migration time: function bodies removed. */
export function executableSql(sql) {
  const blocks = dollarBlocks(sql).filter((block) => block.kind === "function-body");
  let out = "";
  let cursor = 0;
  for (const block of blocks) {
    out += sql.slice(cursor, block.openAt) + " /*body*/ ";
    cursor = block.closeAt;
  }
  return out + sql.slice(cursor);
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/**
 * Parse one migration into the objects it defines (tables, views, functions,
 * columns) and the public objects it references. Text-based by design: this is
 * a planning aid, not a SQL parser, and every consumer treats misses as
 * "unresolved" rather than "absent".
 */
export function parseMigrationSql(rawSql) {
  const sql = stripSqlComments(rawSql);
  const doBlocks = dollarBlocks(sql).filter((block) => block.kind === "do");
  const inDoBlock = (index) => doBlocks.some((block) => index > block.openAt && index < block.closeAt);
  const guardedDo = (index) =>
    doBlocks.some((block) => {
      if (!(index > block.openAt && index < block.closeAt)) return false;
      return /to_regclass|to_regprocedure|if\s+(not\s+)?exists|information_schema/i.test(sql.slice(block.start, block.end));
    });

  const defined = { tables: [], views: [], functions: [], columns: [], policies: [], indexes: [] };
  const push = (list, entry) => {
    if (!list.some((item) => item.name === entry.name)) list.push(entry);
  };

  for (const m of sql.matchAll(new RegExp(String.raw`create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${PUBLIC}${IDENT}`, "gi"))) {
    if (/^\s*auth\./i.test(sql.slice(m.index + 6, m.index + 60))) continue;
    push(defined.tables, { name: m[1], mode: "create", conditional: inDoBlock(m.index), guarded: guardedDo(m.index), line: lineOf(sql, m.index) });
  }
  for (const m of sql.matchAll(new RegExp(String.raw`create\s+(or\s+replace\s+)?(?:materialized\s+)?view\s+${PUBLIC}${IDENT}`, "gi"))) {
    push(defined.views, { name: m[2], mode: m[1] ? "replace" : "create", conditional: inDoBlock(m.index), guarded: guardedDo(m.index), line: lineOf(sql, m.index) });
  }
  for (const m of sql.matchAll(new RegExp(String.raw`create\s+(or\s+replace\s+)?function\s+${PUBLIC}${IDENT}\s*\(`, "gi"))) {
    const prefix = sql.slice(m.index, m.index + m[0].length);
    if (/\bauth\./i.test(prefix) || /\bstorage\./i.test(prefix) || /\bcron\./i.test(prefix)) continue;
    push(defined.functions, { name: m[2], mode: m[1] ? "replace" : "create", conditional: inDoBlock(m.index), guarded: guardedDo(m.index), line: lineOf(sql, m.index) });
  }
  for (const stmt of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${PUBLIC}${IDENT}([^;]*);`, "gi"))) {
    for (const col of stmt[2].matchAll(new RegExp(String.raw`add\s+column\s+(?:if\s+not\s+exists\s+)?${IDENT}`, "gi"))) {
      push(defined.columns, { name: `${stmt[1]}.${col[1]}`, mode: "create", conditional: inDoBlock(stmt.index), guarded: guardedDo(stmt.index), line: lineOf(sql, stmt.index) });
    }
  }
  for (const m of sql.matchAll(new RegExp(String.raw`create\s+policy\s+("[^"]+"|[a-z_0-9]+)\s+on\s+${PUBLIC}${IDENT}`, "gi"))) {
    push(defined.policies, { name: `${m[2]}.${m[1].replace(/"/g, "")}`, mode: "create", conditional: inDoBlock(m.index), guarded: guardedDo(m.index), line: lineOf(sql, m.index) });
  }
  for (const m of sql.matchAll(new RegExp(String.raw`create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?${IDENT}`, "gi"))) {
    push(defined.indexes, { name: m[1], mode: "create", conditional: inDoBlock(m.index), guarded: guardedDo(m.index), line: lineOf(sql, m.index) });
  }

  const qualified = [];
  for (const m of sql.matchAll(/\bpublic\.("?)([a-z_][a-z0-9_]*)\1(\s*\()?/gi)) {
    qualified.push({ name: m[2], call: Boolean(m[3] && m[3].length === 1 && !/\s/.test(m[3])), index: m.index, guarded: guardedDo(m.index) });
  }

  const modifies = new Set();
  for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${PUBLIC}${IDENT}`, "gi"))) modifies.add(m[1]);

  const hazards = scanHazards(sql);

  const flags = {
    usesAuthUsers: /\bauth\.users\b/i.test(sql),
    usesCron: /\bcron\.(schedule|alter_job|unschedule)/i.test(sql),
    usesVault: /\bvault\./i.test(sql),
    createsExtension: [...sql.matchAll(/create\s+extension\s+(?:if\s+not\s+exists\s+)?"?([a-z0-9_-]+)"?/gi)].map((m) => m[1]),
    touchesStorage: /\bstorage\.(buckets|objects)/i.test(sql),
    wrapsTransaction: /^\s*begin\s*;/im.test(sql),
  };

  return { defined, qualified, modifies: [...modifies], hazards, flags };
}

function scanHazards(sql) {
  const exec = executableSql(sql);
  const clip = (text) => text.replace(/\s+/g, " ").trim().slice(0, 140);
  const target = (text) => text.match(/(?:public\.)?"?([a-z_][a-z0-9_]*)"?/i)?.[1] ?? null;
  const item = (statement, table) => ({ statement: clip(statement), table });
  const destructive = [];
  for (const m of exec.matchAll(/(?:^|;)\s*(drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?[^;]*)/gi)) destructive.push(item(m[1], m[2]));
  for (const m of exec.matchAll(/(?:^|;)\s*(truncate\s+(?:table\s+)?(?:only\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?[^;]*)/gi)) destructive.push(item(m[1], m[2]));
  for (const m of exec.matchAll(/(?:^|;)\s*(delete\s+from\s+(?:only\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?[^;]*)/gi)) destructive.push(item(m[1], m[2]));
  for (const m of exec.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?([^;]*);/gi)) {
    for (const col of m[2].matchAll(/drop\s+column\s+(?:if\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) destructive.push(item(`alter table ${m[1]} drop column ${col[1]}`, m[1]));
    for (const col of m[2].matchAll(/alter\s+column\s+"?([a-z_][a-z0-9_]*)"?\s+(?:set\s+data\s+)?type\s+[^,;]+/gi)) destructive.push(item(`alter table ${m[1]} alter column ${col[1]} type`, m[1]));
  }
  for (const m of exec.matchAll(/(?:^|;)\s*(drop\s+(?:view|type|schema)\s+(?:if\s+exists\s+)?([^;]+))/gi)) destructive.push(item(m[1], target(m[2])));

  const find = (re) => [...exec.matchAll(re)].map((m) => clip(m[0]));
  const reversibleDrops = [
    ...find(/drop\s+function\s+(?:if\s+exists\s+)?[^;]+/gi),
    ...find(/drop\s+policy\s+(?:if\s+exists\s+)?[^;]+/gi),
    ...find(/drop\s+trigger\s+(?:if\s+exists\s+)?[^;]+/gi),
    ...find(/drop\s+constraint\s+(?:if\s+exists\s+)?[^;]+/gi),
    ...find(/drop\s+index\s+(?:if\s+exists\s+)?[^;]+/gi),
  ];
  const dataMigration = [];
  for (const m of exec.matchAll(/insert\s+into\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?[^;]{0,100}/gi)) dataMigration.push(item(m[0], m[1]));
  for (const m of exec.matchAll(/\bupdate\s+(?:only\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s+set\b/gi)) dataMigration.push(item(m[0], m[1]));
  const privilegeChanges = [...find(/\brevoke\s+[^;]+/gi), ...find(/\bgrant\s+[^;]+/gi)];
  const addedConstraints = [...exec.matchAll(/add\s+constraint\s+"?([a-z_][a-z0-9_]*)"?/gi)].map((m) => m[1]);
  const droppedConstraints = [...exec.matchAll(/drop\s+constraint\s+(?:if\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)].map((m) => m[1]);
  return { destructive, reversibleDrops, dataMigration, privilegeChanges, addedConstraints, droppedConstraints };
}

export function migrationSortKey(file) {
  return path.basename(file);
}

export function loadMigrationFiles(root, dirs = MIGRATION_DIRS) {
  const files = [];
  for (const dir of dirs) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).filter((f) => f.endsWith(".sql")).sort()) {
      const file = `${dir}/${name}`;
      files.push({ file, dir, name, sql: fs.readFileSync(path.join(root, file), "utf8") });
    }
  }
  files.sort((a, b) => {
    const pa = a.dir === "supabase/pending" ? 1 : 0;
    const pb = b.dir === "supabase/pending" ? 1 : 0;
    return pa - pb || a.name.localeCompare(b.name);
  });
  files.forEach((entry, index) => {
    entry.order = index;
  });
  return files;
}

/** Literal `.from("x")`, `.rpc("x")` usages inside supabase/functions sources. */
export function scanEdgeFunctionSources(root) {
  const base = path.join(root, "supabase/functions");
  const out = {};
  if (!fs.existsSync(base)) return out;
  const shared = [];
  const readTree = (dir) => {
    const acc = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) acc.push(...readTree(full));
      else if (/\.(ts|mjs|js)$/.test(entry.name) && !/\.test\./.test(entry.name)) acc.push(full);
    }
    return acc;
  };
  const scan = (files) => {
    const tables = new Set();
    const rpcs = new Set();
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/\.from\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/g)) tables.add(m[1]);
      for (const m of text.matchAll(/\.rpc\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/g)) rpcs.add(m[1]);
    }
    return { tables: [...tables].sort(), rpcs: [...rpcs].sort() };
  };
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "_shared") {
      shared.push(...readTree(path.join(base, entry.name)));
      continue;
    }
    out[entry.name] = { files: readTree(path.join(base, entry.name)) };
  }
  const sharedScan = scan(shared);
  for (const [slug, info] of Object.entries(out)) {
    const own = scan(info.files);
    const importsShared = info.files.some((f) => /_shared/.test(fs.readFileSync(f, "utf8")));
    out[slug] = {
      source: `supabase/functions/${slug}`,
      tables: own.tables,
      rpcs: own.rpcs,
      sharedTables: importsShared ? sharedScan.tables : [],
      sharedRpcs: importsShared ? sharedScan.rpcs : [],
    };
  }
  return out;
}

/** Which migration introduces each public object (earliest `create`, ties by sort order). */
export function buildDefinitionIndex(parsedByFile) {
  const index = { table: new Map(), view: new Map(), function: new Map(), column: new Map() };
  const kinds = [
    ["tables", "table"],
    ["views", "view"],
    ["functions", "function"],
    ["columns", "column"],
  ];
  for (const { file, parsed } of parsedByFile) {
    for (const [listKey, kind] of kinds) {
      for (const item of parsed.defined[listKey]) {
        const slot = index[kind].get(item.name) ?? { introducing: null, definers: [] };
        slot.definers.push({ file, mode: item.mode, conditional: item.conditional });
        if (!slot.introducing && !item.conditional) slot.introducing = file;
        index[kind].set(item.name, slot);
      }
    }
  }
  for (const kindMap of Object.values(index)) {
    for (const slot of kindMap.values()) {
      if (!slot.introducing && slot.definers.length) slot.introducing = slot.definers[0].file;
    }
  }
  return index;
}
