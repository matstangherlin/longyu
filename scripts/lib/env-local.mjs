import fs from "node:fs";
import path from "node:path";

export function projectRoot() {
  return path.resolve(import.meta.dirname, "..", "..");
}

export function readEnvFile(filename) {
  const filePath = path.join(projectRoot(), filename);
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function mergedEnv(extra = {}) {
  return {
    ...readEnvFile(".env"),
    ...readEnvFile(".env.local"),
    ...process.env,
    ...extra,
  };
}

export function ensureEnvLocalFromExample() {
  const root = projectRoot();
  const target = path.join(root, ".env.local");
  const example = path.join(root, ".env.example");
  if (fs.existsSync(target) || !fs.existsSync(example)) return false;
  fs.copyFileSync(example, target);
  return true;
}
