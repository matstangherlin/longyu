/** RC2.3.9 — content digest of the files an artifact was generated from (REPORT_EVIDENCE_STALE). */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function digestFiles(root, files) {
  const hash = createHash("sha256");
  for (const rel of files) {
    const file = path.join(root, rel);
    hash.update(`${rel}\0`);
    hash.update(fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n") : "<missing>");
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

export const GATE_REGISTRY_SOURCES = [
  "package.json",
  "scripts/release/canonical-suites.mjs",
  "scripts/lib/gate-registry.mjs",
  "docs/release/invariant-ownership.json",
  "docs/release/gate-retirements.json",
  "docs/release/beta-baseline-timing.json",
];
