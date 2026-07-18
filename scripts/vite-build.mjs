import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
const extraArgs = process.argv.slice(2);

// Alinha VITE_APP_VERSION com package.json quando a env não foi definida no CI/Netlify.
if (!process.env.VITE_APP_VERSION?.trim()) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    if (pkg.version) process.env.VITE_APP_VERSION = String(pkg.version);
  } catch {
    /* ignore */
  }
}

if (!process.env.VITE_APP_ENV?.trim()) {
  // Build de produção local/CI sem contexto Netlify → Production Beta.
  process.env.VITE_APP_ENV = "production_beta";
}

const result = spawnSync(process.execPath, [viteEntry, "build", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
