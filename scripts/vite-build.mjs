import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveBuildMeta } from "./lib/build-meta.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
const extraArgs = process.argv.slice(2);
const meta = resolveBuildMeta("production");

const result = spawnSync(process.execPath, [viteEntry, "build", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, ...meta },
});

process.exit(result.status ?? 1);
