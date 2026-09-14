/**
 * Fontes que os gates da V4.10A.1 leem. Fica em um lugar só para que o gate e
 * a mutação ataquem exatamente o mesmo arquivo.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

export const BUSINESS_MIGRATION = "supabase/migrations/20260914180000_business_seat_integrity.sql";

export const BUSINESS_FOUNDATION = [
  "supabase/migrations/20260825043000_business_foundation.sql",
  "supabase/migrations/20260825062000_business_operational_hardening.sql",
];

export function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

export function businessMigrationSource() {
  return readSource(BUSINESS_MIGRATION);
}

export function businessFoundationSource() {
  return BUSINESS_FOUNDATION.map(readSource).join("\n");
}

/** Fontes do cliente que poderiam furar o painel lendo tabela privada direto. */
export function businessClientSources() {
  const roots = ["src/pages", "src/components", "src/services", "src/commercial"];
  const found = {};
  for (const root of roots) {
    const absolute = path.join(ROOT, root);
    if (!fs.existsSync(absolute)) continue;
    for (const file of walk(absolute)) {
      if (!/business|organization|family/i.test(path.basename(file))) continue;
      found[path.relative(ROOT, file).split(path.sep).join("/")] = fs.readFileSync(file, "utf8");
    }
  }
  return found;
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}
