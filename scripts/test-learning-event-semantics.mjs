#!/usr/bin/env node
/**
 * Mutações da semântica de evento (P23 · 5, 6, 7, 8).
 *
 * A mutação 6 é o bug original, reduzido a uma linha: `grade(knew)` chamando
 * `recordDailyTask("phrasesSpoken")`. Ela morre duas vezes — aqui, no
 * contrato, e no compilador, porque `phrasesSpoken` não é mais um
 * `DailyTaskKey`. Duas travas para a mesma mentira é proporcional ao tempo que
 * ela sobreviveu: quatro remessas.
 */
import assert from "node:assert/strict";
import { validateLearningEventSemantics } from "./lib/rc1-5-gates.mjs";

const events = {
  audioHeard: { id: "audioHeard", meaning: "Áudio reproduzido.", trigger: "TTS concluiu.", capability: "tts_playback" },
  phrasesReviewed: {
    id: "phrasesReviewed",
    meaning: "Frase revisada.",
    trigger: "Autoavaliação de chunk.",
    capability: "phrase_chunk_training",
  },
  phrasesSpoken: {
    id: "phrasesSpoken",
    meaning: "Fala realmente tentada.",
    trigger: "Voz capturada pelo reconhecedor.",
    capability: "speech_recognition",
    requiresSpeechAttempt: true,
  },
  reviewsDone: { id: "reviewsDone", meaning: "Item revisado.", trigger: "Atividade concluída.", capability: "review_remediation" },
};

const base = {
  events,
  dailyTaskKeys: ["audioHeard", "phrasesReviewed", "reviewsDone"],
  speechEventIds: ["phrasesSpoken"],
  sourceFiles: {
    "src/features/fala/FalaPage.tsx": 'function grade(knew) { recordDailyTask("phrasesReviewed"); }',
    "src/features/lesson/PronunciationPractice.tsx":
      'const handle = recognizeOnce((t) => { if (t.trim()) recordSpeechAttempt({ id, captured: true }); });',
  },
};

assert.deepEqual(validateLearningEventSemantics(base).failures, [], "controle positivo");

const mutations = [
  [
    'M6 — "Já sabia" volta a registrar fala',
    {
      ...base,
      sourceFiles: {
        ...base.sourceFiles,
        "src/features/fala/FalaPage.tsx":
          'function grade(knew) { if (knew) recordDailyTask("phrasesSpoken"); }',
      },
    },
    "SPEECH_VIA_DAILY_TASK",
  ],
  [
    'M7 — "Ainda não" volta a registrar fala',
    {
      ...base,
      sourceFiles: {
        ...base.sourceFiles,
        "src/features/fala/FalaPage.tsx":
          'function grade(knew) { if (!knew) recordDailyTask("phrasesSpoken"); }',
      },
    },
    "SPEECH_VIA_DAILY_TASK",
  ],
  [
    "M5 — ouvir o TTS passa a contar como falar",
    {
      ...base,
      sourceFiles: {
        ...base.sourceFiles,
        "src/components/ui/SpeakButton.tsx": 'onEnd(() => recordDailyTask("phrasesSpoken"));',
      },
    },
    "SPEECH_VIA_DAILY_TASK",
  ],
  [
    "M5 — uma tela sem microfone declara tentativa de fala",
    {
      ...base,
      sourceFiles: {
        ...base.sourceFiles,
        "src/features/immersion/ImmersionPage.tsx": 'onChoice(() => recordSpeechAttempt({ id, captured: true }));',
      },
    },
    "SPEECH_ATTEMPT_WITHOUT_MIC",
  ],
  [
    "M8 — a fala volta a ser uma tarefa diária declarável",
    { ...base, dailyTaskKeys: [...base.dailyTaskKeys, "phrasesSpoken"] },
    "SPEECH_EVENT_IS_DAILY_TASK",
  ],
  [
    "M8 — some o contador de revisão e ninguém declara o que ele media",
    { ...base, events: Object.fromEntries(Object.entries(events).filter(([id]) => id !== "phrasesReviewed")) },
    "UNDECLARED_EVENT",
  ],
  [
    "evento inventariado sem significado",
    { ...base, events: { ...events, reviewsDone: { id: "reviewsDone", meaning: "", trigger: "" } } },
    "EVENT_WITHOUT_MEANING",
  ],
];

for (const [label, input, expected] of mutations) {
  const codes = validateLearningEventSemantics(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:learning-event-semantics");
