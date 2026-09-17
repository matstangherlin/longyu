#!/usr/bin/env node
/**
 * validate:feature-truth — P1, P3, P10, P22.
 *
 * O registro de capacidades é a única fonte do que o produto sabe fazer. Este
 * gate cobra três coisas que o bug da /fala violava ao mesmo tempo: nenhum
 * paywall aponta para capacidade que não existe, nenhuma capacidade que esta
 * remessa não implementa se declara no ar, e nenhuma tela deriva
 * disponibilidade do estado Pro do usuário.
 */
import fs from "node:fs";
import path from "node:path";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateFeatureTruth } from "./lib/rc1-5-gates.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
installTsRequireHook();

const { FEATURE_TRUTH, PAYWALL_CAPABILITY } = require(path.join(root, "src/product/featureTruth.ts"));
const { PRODUCT_TRUTH } = require(path.join(root, "src/commercial/productTruth.ts"));

/** Os PaywallKind de verdade, lidos do tipo — não de uma lista paralela. */
const planFeatures = fs.readFileSync(path.join(root, "src/data/planFeatures.ts"), "utf8");
const kindBlock = /export type PaywallKind =([\s\S]*?);/.exec(planFeatures)?.[1] ?? "";
const paywallKinds = [...kindBlock.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);

const SURFACES = [
  "src/features/fala/FalaPage.tsx",
  "src/components/pro/ProPaywall.tsx",
  "src/components/product/FeatureRoadmapNote.tsx",
  "src/features/settings/SettingsPage.tsx",
];

const surfaceSources = Object.fromEntries(
  SURFACES.filter((rel) => fs.existsSync(path.join(root, rel))).map((rel) => [
    rel,
    fs.readFileSync(path.join(root, rel), "utf8"),
  ])
);

const { failures } = validateFeatureTruth({
  registry: FEATURE_TRUTH,
  paywallCapability: PAYWALL_CAPABILITY,
  paywallKinds,
  productTruth: PRODUCT_TRUTH,
  surfaceSources,
});

if (failures.length > 0) {
  console.error(`validate:feature-truth falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

const counts = Object.values(FEATURE_TRUTH).reduce((acc, entry) => {
  acc[entry.status] = (acc[entry.status] ?? 0) + 1;
  return acc;
}, {});
const summary = Object.entries(counts)
  .map(([status, total]) => `${status}=${total}`)
  .join(" · ");
console.log(
  `OK: validate:feature-truth — ${Object.keys(FEATURE_TRUTH).length} capacidades (${summary}) · ${paywallKinds.length} paywalls mapeados`
);
