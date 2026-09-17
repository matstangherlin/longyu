#!/usr/bin/env node
/**
 * validate:product-claims — P12, P17, P18.
 *
 * Varre as superfícies públicas atrás de afirmação que o produto não cumpre.
 * Não é um linter de palavra proibida: "IA" pode aparecer, desde que o texto
 * ao redor deixe claro que é roadmap. O que não passa é o meio-termo — a
 * frase que soa disponível para um recurso que não está no ar.
 *
 * PT-BR e EN entram juntos de propósito (P17): a verdade da capacidade é
 * comum aos idiomas, e uma tradução otimista é uma mentira igual.
 */
import fs from "node:fs";
import path from "node:path";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateProductClaims, validateClaimLocaleParity } from "./lib/rc1-5-gates.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
installTsRequireHook();

const { FEATURE_TRUTH } = require(path.join(root, "src/product/featureTruth.ts"));

/** Tudo que o público lê: telas, copy de plano, landing, SEO, HTML de entrada. */
const SURFACE_GLOBS = [
  "src/features/fala",
  "src/features/pro",
  "src/features/landing",
  "src/features/marketing",
  "src/features/onboarding",
  "src/features/settings",
  "src/features/about",
  "src/components/pro",
  "src/components/product",
  "src/components/seo",
  "src/data/planFeatures.ts",
  "src/data/achievements.ts",
  "src/data/missions.ts",
  "src/lib/seo.ts",
  "index.html",
  "public/sitemap.xml",
];

function* walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    yield target;
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|html|xml)$/.test(entry.name)) yield full;
  }
}

const surfaceSources = {};
for (const rel of SURFACE_GLOBS) {
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) continue;
  for (const file of walk(absolute)) {
    surfaceSources[path.relative(root, file).split(path.sep).join("/")] = fs.readFileSync(file, "utf8");
  }
}

// Chaveado pelo CAMINHO real, não por "pt-BR"/"en": é o caminho que diz onde
// corrigir, e é a extensão que faz o scanner tirar os comentários antes de
// varrer — um comentário explicando um claim removido não pode reprovar o
// arquivo que o removeu.
const locales = {
  "src/locales/pt-BR.ts": fs.readFileSync(path.join(root, "src/locales/pt-BR.ts"), "utf8"),
  "src/locales/en.ts": fs.readFileSync(path.join(root, "src/locales/en.ts"), "utf8"),
};

const failures = [
  ...validateProductClaims({ registry: FEATURE_TRUTH, surfaceSources }).failures,
  ...validateClaimLocaleParity({ registry: FEATURE_TRUTH, locales }).failures,
];

if (failures.length > 0) {
  console.error(`validate:product-claims falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

console.log(
  `OK: validate:product-claims — ${Object.keys(surfaceSources).length} superfícies varridas, PT-BR e EN em paridade, 0 fantasmas`
);
