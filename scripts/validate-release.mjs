/** Validação estática do sistema de versões e patches. */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    errors.push(`Falta arquivo: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

const changelog = read("CHANGELOG.md");
const releaseNotes = read("src/data/releaseNotes.ts");
const appMeta = read("src/lib/appMeta.ts");
const buildInfo = read("src/components/system/BuildInfo.tsx");
const releaseModal = read("src/components/release/ReleaseNotesProvider.tsx");
const pwaPrompt = read("src/components/pwa/PwaUpdatePrompt.tsx");
const viteConfig = read("vite.config.ts");
const netlify = read("netlify.toml");
const pkg = JSON.parse(read("package.json") || "{}");

if (!changelog.includes("## ")) errors.push("CHANGELOG.md vazio");
if (!/RELEASE_NOTES/.test(releaseNotes)) errors.push("releaseNotes.ts sem RELEASE_NOTES");
if (!/lastSeenReleaseVersion|longyu:lastSeenReleaseVersion/.test(releaseModal + read("src/lib/releaseStorage.ts"))) {
  errors.push("sem persistência lastSeenReleaseVersion");
}
if (!/registerType:\s*"prompt"/.test(viteConfig)) errors.push("PWA não usa registerType prompt");
if (!/shouldDeferPwaUpdate|getPwaUpdateBlockReason/.test(pwaPrompt + read("src/lib/pwaUpdatePolicy.ts"))) {
  errors.push("PWA sem política de adiamento");
}
if (!/VITE_APP_VERSION/.test(viteConfig)) errors.push("vite.config sem VITE_APP_VERSION");
if (!/index\.html/.test(netlify)) errors.push("netlify.toml sem headers para index.html");
if (!pkg.scripts?.["release:check"]) errors.push("package.json sem release:check");
if (buildInfo && !/BuildInfo/.test(read("src/features/about/AboutPage.tsx"))) {
  errors.push("AboutPage sem BuildInfo");
}

if (errors.length > 0) {
  console.error("ERRO: validate:release falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:release passou.");
