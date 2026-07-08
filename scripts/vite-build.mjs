import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
const extraArgs = process.argv.slice(2);

const result = spawnSync(process.execPath, [viteEntry, "build", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
