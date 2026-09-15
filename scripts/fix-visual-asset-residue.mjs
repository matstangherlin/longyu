#!/usr/bin/env node
/**
 * RC1.3 · P10.1/P11.1 — corrige o ARQUIVO, não o CSS.
 *
 * O QA reportou a árvore ainda exibindo fundo ao redor da base. A tentação é
 * esconder com `mix-blend-mode`, máscara ou um container da mesma cor; nada
 * disso corrige o asset — só disfarça em um tema e reaparece no outro. Aqui o
 * resíduo sai do SVG.
 *
 * Uso:
 *   node scripts/fix-visual-asset-residue.mjs --check           (só lista)
 *   node scripts/fix-visual-asset-residue.mjs <arquivo…>        (corrige)
 *
 * P11.1 — sem argumentos e sem `--check`, o script NÃO reescreve o catálogo
 * inteiro: ele lista o que encontrou e pede os arquivos explicitamente. Corrigir
 * em massa um pipeline que também produziu arte legítima é como o halo apareceu.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { findResidueShapes, stripResidue } from "./lib/visual-transparency.mjs";

const rootDir = process.cwd();
const VISUALS_DIR = path.join(rootDir, "src/assets/visuals");

async function svgFiles() {
  const out = [];
  for (const entry of await readdir(VISUALS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of await readdir(path.join(VISUALS_DIR, entry.name))) {
      if (file.endsWith(".svg")) out.push(path.join(VISUALS_DIR, entry.name, file));
    }
  }
  return out.sort();
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check") || args.length === 0;
const targets = args.filter((arg) => !arg.startsWith("--"));

const files = targets.length > 0 ? targets.map((file) => path.resolve(rootDir, file)) : await svgFiles();

let found = 0;
for (const file of files) {
  const svg = await readFile(file, "utf8");
  const findings = await findResidueShapes(sharp, svg);
  if (findings.length === 0) continue;
  found += findings.length;
  const rel = path.relative(rootDir, file);
  console.log(`\n${rel}`);
  for (const finding of findings) {
    console.log(
      `  ${finding.reason} ${finding.fill}` +
        (finding.subjectRevealed != null
          ? ` revela ${finding.subjectRevealed}px (${(finding.ratio * 100).toFixed(2)}% do sujeito)`
          : ` box=[${finding.box.x0.toFixed(0)},${finding.box.y0.toFixed(0)}→${finding.box.x1.toFixed(0)},${finding.box.y1.toFixed(0)}]`)
    );
  }
  if (checkOnly) continue;
  const { svg: cleaned, removed } = await stripResidue(sharp, svg);
  await writeFile(file, cleaned, "utf8");
  console.log(`  → corrigido: ${removed.length} caminho(s) removido(s)`);
}

if (found === 0) console.log("Nenhum resíduo de fundo encontrado.");
else if (checkOnly) console.log(`\n${found} resíduo(s). Passe os arquivos a corrigir como argumento.`);
