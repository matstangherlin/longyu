import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tscEntry = path.join(root, "node_modules", "typescript", "lib", "tsc.js");
const extraArgs = process.argv.slice(2);

const result = spawnSync(process.execPath, [tscEntry, "--noEmit", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
