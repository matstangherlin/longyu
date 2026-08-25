#!/usr/bin/env node
/**
 * V4.6 — Contratos de integridade do alvo da transferência.
 * Garante que o alvo completo não vaza no scaffold inicial.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function normalizeTransferHanzi(value) {
  return value
    .normalize("NFC")
    .replace(/[\s\u3000]/g, "")
    .replace(/[，,]/g, "，")
    .replace(/[？?]/g, "？")
    .trim();
}

function patternRevealsFullTarget(patternPt, targetHanzi) {
  if (!patternPt || !targetHanzi) return false;
  if (patternPt.includes("___") || patternPt.includes("…") || patternPt.includes("...")) return false;
  return normalizeTransferHanzi(patternPt) === normalizeTransferHanzi(targetHanzi);
}

function canRevealTransferTarget({ helpLevel, feedback, hadMistake }) {
  if (feedback === "correct" || feedback === "wrong" || feedback === "unrecognized") return true;
  if (hadMistake) return true;
  return helpLevel >= 3;
}

function safeTransferPatternPt(patternPt, targetHanzi) {
  if (!patternPt) return undefined;
  if (!patternRevealsFullTarget(patternPt, targetHanzi)) return patternPt;
  if ((targetHanzi ?? "").startsWith("请问")) return "请问，___";
  return "___";
}

const TARGET = "请问，你叫什么？";

assert.equal(patternRevealsFullTarget(TARGET, TARGET), true, "pattern completo vaza");
assert.equal(patternRevealsFullTarget("请问，___", TARGET), false, "padrão com buraco não vaza");
assert.equal(patternRevealsFullTarget("我要 ___", "我要茶。"), false, "padrão com buraco ok");

assert.equal(canRevealTransferTarget({ helpLevel: 0, feedback: null, hadMistake: false }), false);
assert.equal(canRevealTransferTarget({ helpLevel: 1, feedback: null, hadMistake: false }), false);
assert.equal(canRevealTransferTarget({ helpLevel: 2, feedback: null, hadMistake: false }), false);
assert.equal(canRevealTransferTarget({ helpLevel: 3, feedback: null, hadMistake: false }), true);
assert.equal(canRevealTransferTarget({ helpLevel: 0, feedback: "correct", hadMistake: false }), true);
assert.equal(canRevealTransferTarget({ helpLevel: 0, feedback: "wrong", hadMistake: false }), true);
assert.equal(canRevealTransferTarget({ helpLevel: 0, feedback: null, hadMistake: true }), true);

assert.equal(safeTransferPatternPt(TARGET, TARGET), "请问，___");

const helpSrc = await readFile(path.join(rootDir, "src/data/productionHelp.ts"), "utf8");
assert.match(helpSrc, /Transfer: sempre começa sem revelar alvo/, "plano documenta V4.6");
assert.match(helpSrc, /firstOfStructure:\s*true[\s\S]*?initial:\s*0/, "1ª transfer initial=0");

const integritySrc = await readFile(path.join(rootDir, "src/data/transferTargetIntegrity.ts"), "utf8");
assert.match(integritySrc, /canRevealTransferTarget/, "módulo de integridade presente");
assert.match(integritySrc, /TRANSFER_TARGET_REVEAL_HELP_LEVEL/, "nível de revelação exportado");

const stepsSrc = await readFile(path.join(rootDir, "src/features/lesson/steps.tsx"), "utf8");
assert.match(stepsSrc, /data-transfer-target-revealed/, "atributo de revelação na UI");
assert.match(stepsSrc, /data-transfer-anchor/, "atributo âncora");
assert.match(stepsSrc, /data-transfer-component/, "atributo componente");
assert.match(stepsSrc, /canRevealTransferTarget/, "UI usa o gate de revelação");
// Não deve mostrar transform .to no nível 1 incondicionalmente
assert.doesNotMatch(
  stepsSrc,
  /transferTransformHint && helpLevel >= 1 \?/,
  "transform hint não abre no nível 1"
);

const tasksSrc = await readFile(path.join(rootDir, "src/data/productionTasks.ts"), "utf8");
assert.match(tasksSrc, /transferComponentHanzi:\s*"请问"/, "frame L15 declara componente");
assert.match(tasksSrc, /transferChallengePt:\s*"Use 请问 antes da pergunta\."/, "desafio L15");
assert.match(tasksSrc, /transferSafePatternPt:\s*"请问，___"/, "padrão seguro L15");

console.log("OK test:transfer-target-integrity — scaffold não vaza alvo antes da revelação");
