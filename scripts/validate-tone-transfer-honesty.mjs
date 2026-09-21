/**
 * RC2.2.7 — validate:tone-transfer-honesty
 *
 * `analyzePronunciation` (src/lib/speech.ts) compara sílabas reconhecidas em
 * ordem. Ela NÃO mede altura, contorno nem duração — não há análise de pitch
 * nenhuma no caminho. Logo, nenhuma tela pode dizer ao aluno que o TOM dele
 * saiu certo: seria afirmar uma medição que o produto não faz.
 *
 * Este gate recusa três coisas:
 *   1. copy que reivindica avaliação de tom (registro, lições e locales);
 *   2. lembrete tonal sem a ressalva explícita de que o app confere sílabas;
 *   3. a ressalva ficar desatualizada — se alguém implementar análise de tom
 *      de verdade, o tripwire estrutural avisa que a copy precisa ser revista.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { require } from "./lib/v495a-runtime.mjs";

const root = process.cwd();
const { ALL_LESSONS } = require("../../src/data/journey.ts");
const { TONE_TRANSFER_TASKS } = require("../../src/data/toneTransfer.ts");

const failures = [];
const fail = (code, where, why) => failures.push({ code, where, why });

/** Frases que afirmam avaliação de tom. Ensinar tom é permitido; julgar, não. */
const EVALUATION_CLAIMS = [
  { pattern: /\bseu tom\b/iu, label: 'pt: "seu tom"' },
  { pattern: /\btom (?:está|esta|ficou|saiu|foi)\s+(?:correto|certo|perfeito|bom|ótimo|otimo)\b/iu, label: "pt: tom está correto" },
  { pattern: /\b(?:acertou|errou|acerte|erre)\s+o\s+tom\b/iu, label: "pt: acertou/errou o tom" },
  { pattern: /\btom\s+(?:correto|incorreto|errado)\b/iu, label: "pt: tom correto/errado" },
  { pattern: /\byour tone\s+(?:is|was|sounds|sounded)\b/iu, label: "en: your tone is" },
  { pattern: /\b(?:correct|incorrect|wrong|perfect)\s+tone\b/iu, label: "en: correct/wrong tone" },
  { pattern: /\btone\s+(?:accuracy|score|match|detection|analysis)\b/iu, label: "en: tone accuracy/score" },
  { pattern: /\b(?:detecta|detectamos|medimos|avaliamos|analisamos)\s+(?:o\s+)?tom\b/iu, label: "pt: medimos o tom" },
];

/** A ressalva que todo lembrete tonal precisa carregar, em cada idioma. */
const HONESTY_PT = /confere as sílabas, não o tom/iu;
const HONESTY_EN = /checks the syllables, not the tone/iu;

function scan(text, where, code = "TONE_EVALUATION_CLAIM") {
  const value = String(text ?? "");
  if (!value) return;
  for (const claim of EVALUATION_CLAIMS) {
    if (claim.pattern.test(value)) {
      fail(code, where, `${claim.label} — o app não mede tom`);
    }
  }
}

// 1. O registro de transferência tonal.
for (const task of TONE_TRANSFER_TASKS) {
  for (const field of ["titlePt", "titleEn", "situationPt", "situationEn", "toneReminderPt", "toneReminderEn"]) {
    scan(task[field], `${task.id}.${field}`);
  }
  if (!HONESTY_PT.test(task.toneReminderPt ?? "")) {
    fail("MISSING_HONESTY_CLAUSE", `${task.id}.toneReminderPt`, "lembrete sem a ressalva de sílabas");
  }
  if (!HONESTY_EN.test(task.toneReminderEn ?? "")) {
    fail("MISSING_HONESTY_CLAUSE", `${task.id}.toneReminderEn`, "reminder without the syllable caveat");
  }
}

// 2. Toda a copy de lição — a promessa vale na Jornada inteira, não só aqui.
const LESSON_TEXT_FIELDS = ["title", "body", "prompt", "promptPt", "explanation", "situationPt", "productionHintPt", "suggestion", "dialoguePrompt"];
for (const lesson of ALL_LESSONS) {
  for (const step of lesson.steps ?? []) {
    for (const field of LESSON_TEXT_FIELDS) scan(step?.[field], `${lesson.id}.${field}`);
    for (const option of step?.options ?? []) scan(option, `${lesson.id}.options`);
  }
}

// 3. Locales: o feedback de fala é onde a mentira seria mais cara.
for (const locale of ["pt-BR", "en"]) {
  const file = path.join(root, `src/locales/${locale}.ts`);
  const source = readFileSync(file, "utf8");
  for (const line of source.split("\n")) {
    if (!/pron[A-Za-z]*\s*:/.test(line)) continue;
    scan(line, `locales/${locale}`);
  }
  const honest = locale === "pt-BR" ? HONESTY_PT : HONESTY_EN;
  if (!honest.test(source)) {
    fail("MISSING_HONESTY_CLAUSE", `locales/${locale}`, "feedback de fala sem a ressalva de sílabas");
  }
}

// 4. Tripwire estrutural: a ressalva só é honesta enquanto `analyzePronunciation`
//    não medir tom. Se alguém implementar análise real, este gate avisa — a copy
//    passaria a ser modesta demais, e precisa ser revista de propósito.
const speechSource = readFileSync(path.join(root, "src/lib/speech.ts"), "utf8");
const PITCH_ANALYSIS = /\b(?:AnalyserNode|getFloatFrequencyData|getByteFrequencyData|autocorrelat|fundamentalFrequency|pitchDetect|f0)\b/iu;
if (PITCH_ANALYSIS.test(speechSource)) {
  fail(
    "SPEECH_GAINED_PITCH_ANALYSIS",
    "src/lib/speech.ts",
    "há análise de pitch agora — revise a copy que afirma que o app não mede tom"
  );
}

console.log(
  JSON.stringify(
    {
      tasks: TONE_TRANSFER_TASKS.length,
      lessonsScanned: ALL_LESSONS.length,
      claimPatterns: EVALUATION_CLAIMS.length,
      pitchAnalysisInSpeech: PITCH_ANALYSIS.test(speechSource),
      failures,
    },
    null,
    2
  )
);

if (failures.length) process.exitCode = 1;
else console.log("PASS validate:tone-transfer-honesty");
