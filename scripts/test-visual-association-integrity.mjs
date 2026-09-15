#!/usr/bin/env node
/**
 * RC1.3 · P32 — mutações 13, 14 e 15 (asset e associação visual).
 *
 * O QA fotografou a árvore com fundo ao redor da base. O reparo tinha de ser no
 * ARQUIVO: esconder por CSS deixaria o defeito vivo e ele voltaria no outro
 * tema. Aqui garantimos o asset limpo, a proibição do disfarce por CSS e a
 * coerência imagem ↔ ref ↔ hànzì ↔ pinyin ↔ significado.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { findCanvasPlates, findResidueShapes } from "./lib/visual-transparency.mjs";
import { validateVisualAssociationIntegrity, validateVisualAssetTransparency } from "./lib/rc1-3-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const visuals = require(path.join(root, "src/data/visualVocabulary.ts"));
const characters = require(path.join(root, "src/data/characters.ts"));

const killed = [];
const kill = (label) => {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
};

const controlIntegrity = validateVisualAssociationIntegrity();
assert.equal(controlIntegrity.failures.length, 0, `controle positivo falhou: ${JSON.stringify(controlIntegrity.failures)}`);
const controlTransparency = await validateVisualAssetTransparency();
assert.equal(
  controlTransparency.failures.length,
  0,
  `controle positivo falhou: ${JSON.stringify(controlTransparency.failures)}`
);

const treePath = path.join(root, "src/assets/visuals/nature/tree.svg");
const treeSvg = fs.readFileSync(treePath, "utf8");

// ── Mutação 13: o asset da árvore ainda tem canvas/fundo opaco ────────────
{
  assert.equal(findCanvasPlates(treeSvg).length, 0, "a árvore ainda tem placa de canvas");
  const residue = await findResidueShapes(sharp, treeSvg);
  assert.equal(residue.length, 0, `a árvore ainda tem resíduo: ${JSON.stringify(residue.map((r) => r.fill))}`);

  // P10.5 — renderizada sobre preto, a ilustração não pode ter nada claro solto
  // na faixa inferior (era exatamente a grama que aparecia na base).
  const size = 240;
  const { data, info } = await sharp(Buffer.from(treeSvg), { density: 200 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let paleAtBase = 0;
  for (let y = Math.floor(info.height * 0.92); y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset + 3] < 128) continue;
      const [r, g, b] = [data[offset], data[offset + 1], data[offset + 2]];
      if (Math.min(r, g, b) >= 0x8c && Math.max(r, g, b) - Math.min(r, g, b) <= 0x30) paleAtBase += 1;
    }
  }
  assert.equal(paleAtBase, 0, `${paleAtBase} pixels claros de fundo na base da árvore`);
  kill("Mutação 13 · tree raw asset ainda possui canvas/fundo opaco");
}

// ── Mutação 14: CSS esconde o fundo mas o asset continua errado ───────────
{
  for (const rel of [
    "src/features/lesson/StepImageChoice.tsx",
    "src/features/lesson/StepCompareWithImage.tsx",
  ]) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    assert.ok(!/mix-blend-mode|mixBlendMode/.test(source), `${rel} esconde o fundo por blend mode`);
  }
  // O arquivo é a fonte da verdade: o SVG não tem mais os caminhos de fundo.
  assert.ok(!treeSvg.includes("#9EBFA0"), "o caminho de chão #9EBFA0 voltou ao arquivo");
  assert.ok(!treeSvg.includes("#B5CEB7"), "o caminho de chão #B5CEB7 voltou ao arquivo");
  assert.ok(!treeSvg.includes("#98BA9A"), "o caminho de chão #98BA9A voltou ao arquivo");
  assert.ok(!treeSvg.includes("#EAF0EA"), "o halo de canvas #EAF0EA voltou ao arquivo");
  kill("Mutação 14 · CSS esconde fundo mas asset continua errado");
}

// ── Mutação 15: a imagem da árvore aponta para o pinyin de outro ref ──────
{
  const tree = visuals.VISUAL_CONCEPTS.find((concept) => concept.id === "tree");
  assert.ok(tree, "conceito da árvore ausente");
  assert.equal(tree.hanzi, "木", "a árvore deixou de apontar para 木");
  assert.equal(tree.charId, "mu", "a árvore deixou de apontar para o ref mu");
  assert.match(tree.pinyin, /^mù/, `pinyin da árvore é "${tree.pinyin}"`);
  const char = characters.CHARACTERS.find((candidate) => candidate.id === tree.charId);
  assert.equal(char.hanzi, tree.hanzi, "hànzì do conceito ≠ hànzì do ref");
  assert.equal(
    char.pinyin.replace(/\s+/g, ""),
    tree.pinyin.replace(/\s+/g, ""),
    "pinyin do conceito ≠ pinyin do ref"
  );
  assert.equal(tree.imageSrc, "nature/tree.svg", "a imagem da árvore mudou de arquivo");

  // Todo conceito visual mantém a mesma coerência.
  const charById = new Map(characters.CHARACTERS.map((candidate) => [candidate.id, candidate]));
  for (const concept of visuals.VISUAL_CONCEPTS) {
    const ref = charById.get(concept.charId);
    if (!ref) continue;
    assert.equal(ref.hanzi, concept.hanzi, `${concept.id}: hànzì divergente do ref`);
  }
  kill("Mutação 15 · imagem da árvore aponta para pinyin de outro ref");
}

// ── P12: a revisão visual deriva do ref canônico, não de texto fixo ───────
{
  const player = fs.readFileSync(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert.match(player, /data-review-visual-concept/, "a revisão visual não expõe o ref canônico");
  const remediation = fs.readFileSync(path.join(root, "src/features/lesson/immediateRemediation.ts"), "utf8");
  assert.match(remediation, /resolveVisualConcept/, "a revisão visual não resolve o conceito canônico");
  assert.ok(!/["'`]mù["'`]/.test(remediation), "pinyin da árvore hardcoded na remediação");
  kill("P12 · associação visual usa o ref canônico");
}

console.log(`PASS test:visual-association-integrity — ${killed.length} mutações mortas, com controle positivo.`);
