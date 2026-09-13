#!/usr/bin/env node
/**
 * Mutações de P2/P3 — áudio de feedback e nome próprio no TTS.
 *
 * Além das mutações de contrato, este script exercita as funções puras: é
 * onde "mute ainda toca áudio" e "copy PT entra no TTS" morrem de verdade,
 * não por leitura de arquivo.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { installTsRequireHook, validateFeedbackAudio } from "./lib/rc1-1-gates.mjs";

const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(rel, "utf8");
const base = {
  policySource: read("src/features/lesson/feedbackAudioPolicy.ts"),
  reviewSource: read("src/features/revisao/RevisaoPage.tsx"),
  moduleTestSource: read("src/features/challenge/ModuleChallengePage.tsx"),
  stepsSource: read("src/features/lesson/steps.tsx"),
  ttsSource: read("src/lib/tts.ts"),
};

assert.deepEqual(validateFeedbackAudio(base).failures, [], "controle positivo");

const mutations = [
  ["mute deixa de barrar o áudio", { policySource: base.policySource.replace(/reason: "muted"/g, 'reason: "ok"') }, "MUTE"],
  [
    "dedupe perde a tentativa",
    { policySource: base.policySource.replace(/\$\{request\.stepId\}#\$\{request\.attemptId\}#\$\{request\.outcome\}/g, "${request.stepId}") },
    "DEDUPE",
  ],
  [
    "som de vitória pode sobrepor o feedback",
    { policySource: base.policySource.replace(/victorySoundActive/g, "ignoredFlag") },
    "NO_OVERLAP",
  ],
  ["replay some quando o autoplay falha", { policySource: base.policySource.replace(/showReplayButton/g, "hidden") }, "REPLAY"],
  [
    "correção do teste de módulo deixa de tocar",
    { moduleTestSource: base.moduleTestSource.replace(/decideFeedbackAudio/g, "noAudio") },
    "WIRING",
  ],
  ["revisão deixa de tocar a correção", { reviewSource: base.reviewSource.replace(/scheduleAutoSpeak/g, "noSpeak") }, "WIRING"],
  ["TTS volta a apagar nomes próprios", { ttsSource: base.ttsSource.replace(/properNames/g, "ignored") }, "PROPER_NAMES"],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateFeedbackAudio({ ...base, ...patch }).failures.map((failure) => failure.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (esperado ${expectedCode})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// ── Comportamento real da política ────────────────────────────────────────
installTsRequireHook();
const { decideFeedbackAudio } = require(path.join(process.cwd(), "src/features/lesson/feedbackAudioPolicy.ts"));

const played = new Set();
const request = {
  stepId: "q2",
  attemptId: 1,
  outcome: "wrong",
  target: "再见",
  soundEnabled: true,
  autoPlayAudio: true,
};

// Mutação 4 do contrato: errar 再见 tem de tocar 再见.
const first = decideFeedbackAudio(request, played);
assert.equal(first.play, true, "correção errada precisa tocar o alvo");
assert.equal(first.text, "再见");
assert.equal(first.reason, "correction");
played.add(first.key);

// Mutação 5/20: mute manda.
assert.equal(decideFeedbackAudio({ ...request, stepId: "q3", soundEnabled: false }, new Set()).play, false);
assert.equal(
  decideFeedbackAudio({ ...request, stepId: "q3", soundEnabled: false }, new Set()).reason,
  "muted"
);
assert.equal(decideFeedbackAudio({ ...request, stepId: "q4", autoPlayAudio: false }, new Set()).play, false);

// P2.3: a mesma chave não toca duas vezes; outra tentativa toca.
assert.equal(decideFeedbackAudio(request, played).play, false, "re-render não pode repetir o áudio");
assert.equal(decideFeedbackAudio({ ...request, attemptId: 2 }, played).play, true, "nova tentativa toca de novo");

// P17: feedback e vitória nunca juntos.
assert.equal(decideFeedbackAudio({ ...request, stepId: "q9", victorySoundActive: true }, new Set()).play, false);

// Sem alvo mandarim não há o que tocar.
assert.equal(decideFeedbackAudio({ ...request, stepId: "q7", target: "Continue" }, new Set()).play, false);

// ── P3: nome próprio sim, copy de interface não ───────────────────────────
const ttsSource = read("src/lib/tts.ts");
const start = ttsSource.indexOf("const CJK_RANGE");
const end = ttsSource.indexOf("function defaultSpeakableProperNames(");
assert.ok(start >= 0 && end > start, "bloco mandarinSpeechText não encontrado");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-rc11-tts-"));
fs.writeFileSync(
  path.join(outDir, "speech.js"),
  ts.transpileModule(ttsSource.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
);
const { mandarinSpeechText } = require(path.join(outDir, "speech.js"));
const names = { properNames: ["Matheus"] };

// Mutação 7: apagar o nome do alvo é falha.
assert.equal(mandarinSpeechText("我叫 Matheus。", names), "我叫 Matheus");
assert.equal(mandarinSpeechText("我叫Matheus。", names), "我叫 Matheus");

// Mutação 6: copy PT/EN nunca entra, nem quando um nome declarado aparece nela.
const leaked = mandarinSpeechText("O que Matheus responde com 我叫Matheus?", names);
assert.equal(leaked, "我叫", `copy PT vazou para o TTS: ${leaked}`);
for (const word of ["O que", "responde", "Escolha", "Pressione", "Minha resposta"]) {
  assert.ok(!leaked.includes(word), `"${word}" não pode ser falado`);
}
assert.equal(mandarinSpeechText("Escolha abaixo: 你好", names), "你好");
// Pinyin puro continua passando intacto.
assert.equal(mandarinSpeechText("nǐ hǎo", names), "nǐ hǎo");
// Nome não declarado continua sendo tratado como andaime.
assert.equal(mandarinSpeechText("我叫 Matheus。", { properNames: [] }), "我叫");

console.log("PASS test:feedback-audio");
