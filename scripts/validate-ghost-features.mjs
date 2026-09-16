#!/usr/bin/env node
/**
 * validate:ghost-features — P13, P2.1, P2.3.
 *
 * Feature fantasma é a que aparece na tela com cara de utilizável e não
 * existe. As quatro formas que a RC1.5 encontrou, todas na mesma tela:
 *
 * 1. CTA de aquisição ("Praticar com IA") para recurso inexistente;
 * 2. paywall aberto por recurso `coming_soon`;
 * 3. botão cujo handler responde "em breve" — existe para frustrar;
 * 4. tela decidindo sozinha o que existe, sem perguntar ao registro.
 */
import fs from "node:fs";
import path from "node:path";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateGhostFeatures } from "./lib/rc1-5-gates.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
installTsRequireHook();

const { FEATURE_TRUTH, PAYWALL_CAPABILITY } = require(path.join(root, "src/product/featureTruth.ts"));

/** Toda tela que pode abrir paywall ou anunciar recurso. */
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx$/.test(entry.name)) yield full;
  }
}

const surfaceSources = {};
for (const base of ["src/features", "src/components"]) {
  for (const file of walk(path.join(root, base))) {
    surfaceSources[path.relative(root, file).split(path.sep).join("/")] = fs.readFileSync(file, "utf8");
  }
}

const { failures } = validateGhostFeatures({
  registry: FEATURE_TRUTH,
  paywallCapability: PAYWALL_CAPABILITY,
  surfaceSources,
});

if (failures.length > 0) {
  console.error(`validate:ghost-features falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

const ghosts = Object.values(FEATURE_TRUTH)
  .filter((entry) => entry.status === "coming_soon" || entry.status === "disabled")
  .map((entry) => entry.id);
console.log(
  `OK: validate:ghost-features — ${Object.keys(surfaceSources).length} telas varridas · ${ghosts.length} capacidades fora do ar (${ghosts.join(", ")}) e nenhuma delas vende`
);
