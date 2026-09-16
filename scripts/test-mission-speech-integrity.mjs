#!/usr/bin/env node
/**
 * Mutações de missão de fala (P23 · 9).
 *
 * "Fale 5 frases" concluída com cinco cliques em "Já sabia" é a forma mais
 * cara da mentira: ela paga XP e Qi por algo que não aconteceu, e ensina o
 * aluno que falar é opcional. A regra vale nos dois sentidos, e a segunda
 * direção é a que costuma passar batido — uma missão que exige microfone
 * aparecendo para quem não tem microfone é uma meta impossível fixa no topo
 * da tela.
 */
import assert from "node:assert/strict";
import { validateMissionSpeechIntegrity } from "./lib/rc1-5-gates.mjs";

const SPEAKING_CLAIM_PATTERN =
  /\b(fale|falar|falando|falou|pronuncie|pronunciar|speak|speaking|spoke|say it|out loud)\b|em voz alta/i;

const speakMission = {
  id: "daily-speak",
  title: "Fale 1 frase em voz alta",
  desc: "Use o microfone em uma tarefa de fala da jornada e fale de verdade.",
  metric: "spokenToday",
  requiresPlatform: "speech_recognition",
};
const reviewMission = {
  id: "daily-phrases",
  title: "Use 3 frases aprendidas",
  desc: "Pratique frases da jornada em fala, imersão ou treino livre.",
  metric: "phrasesToday",
};

const base = {
  missions: [speakMission, reviewMission],
  speechMetrics: ["spokenToday"],
  speakingPattern: SPEAKING_CLAIM_PATTERN,
  aggregates: { spokenToday: "tasks.phrasesSpoken", phrasesToday: "tasks.phrasesReviewed" },
  platformCapableMetrics: { spokenToday: "tasks.phrasesSpoken" },
};

assert.deepEqual(validateMissionSpeechIntegrity(base).failures, [], "controle positivo");

const mutations = [
  [
    "M9 — a missão de falar passa a aceitar revisão",
    { ...base, missions: [{ ...speakMission, metric: "phrasesToday" }, reviewMission] },
    "SPEAKING_MISSION_WITHOUT_SPEECH_METRIC",
  ],
  [
    'M9 — a missão de revisão ganha copy de fala ("Fale 3 frases")',
    {
      ...base,
      missions: [speakMission, { ...reviewMission, title: "Fale 3 frases aprendidas" }],
    },
    "SPEAKING_MISSION_WITHOUT_SPEECH_METRIC",
  ],
  [
    "P8.2 — a missão de fala perde a exigência de microfone",
    { ...base, missions: [{ ...speakMission, requiresPlatform: undefined }, reviewMission] },
    "IMPOSSIBLE_MISSION",
  ],
  [
    "métrica de fala com copy que não promete fala",
    {
      ...base,
      missions: [{ ...speakMission, title: "Ganhe XP hoje", desc: "Acumule pontos." }, reviewMission],
    },
    "SPEECH_METRIC_WITHOUT_SPEAKING_COPY",
  ],
  [
    "M10 — o agregado de fala passa a ler o contador de revisão",
    { ...base, aggregates: { ...base.aggregates, spokenToday: "tasks.phrasesReviewed" } },
    "AGGREGATE_WRONG_SOURCE",
  ],
  [
    "o agregado de fala some",
    { ...base, aggregates: { phrasesToday: "tasks.phrasesReviewed" } },
    "MISSING_AGGREGATE",
  ],
];

for (const [label, input, expected] of mutations) {
  const codes = validateMissionSpeechIntegrity(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:mission-speech-integrity");
