#!/usr/bin/env node
/**
 * validate:mission-speech-integrity — P8, P8.1, P8.2.
 *
 * Missão que promete fala precisa exigir fala. A regra vale nos dois sentidos:
 * uma missão "fale 5 frases" não pode avançar por revisão, e uma missão que
 * exige fala não pode aparecer em navegador sem microfone.
 */
import fs from "node:fs";
import path from "node:path";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateMissionSpeechIntegrity } from "./lib/rc1-5-gates.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
installTsRequireHook();

const missions = require(path.join(root, "src/data/missions.ts"));
const storeSource = fs.readFileSync(path.join(root, "src/lib/store.ts"), "utf8");

/** De qual contador diário cada agregado de missão lê, direto do store. */
const aggregateBlock = /function missionAggregates\(s: AppState\): MissionAggregates \{([\s\S]*?)\n\}/.exec(
  storeSource
)?.[1] ?? "";
const aggregates = Object.fromEntries(
  [...aggregateBlock.matchAll(/^\s{4}([a-zA-Z]+):\s*([^,\n]+),/gm)].map(([, key, value]) => [key, value.trim()])
);

const { failures } = validateMissionSpeechIntegrity({
  missions: [...missions.DAILY_MISSION_DEFS, ...missions.WEEKLY_MISSION_DEFS],
  speechMetrics: missions.SPEECH_MISSION_METRICS,
  speakingPattern: missions.SPEAKING_CLAIM_PATTERN,
  aggregates,
  platformCapableMetrics: { spokenToday: "tasks.phrasesSpoken" },
});

// P8.2 executado: sem microfone, missão de fala não é sequer oferecida.
const runtime = [];
const withoutMic = missions.missionDefsFor("daily", { speechRecognition: false });
const impossible = withoutMic.filter((def) => def.requiresPlatform === "speech_recognition");
if (impossible.length > 0) {
  runtime.push({
    code: "IMPOSSIBLE_MISSION_OFFERED",
    where: impossible.map((def) => def.id).join(","),
    message: "missão de fala oferecida em plataforma sem reconhecimento de voz",
  });
}

const all = [...failures, ...runtime];
if (all.length > 0) {
  console.error(`validate:mission-speech-integrity falhou com ${all.length} problema(s):`);
  for (const failure of all) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

const speaking = [...missions.DAILY_MISSION_DEFS, ...missions.WEEKLY_MISSION_DEFS].filter((def) =>
  missions.missionUsesSpeechMetric(def)
);
console.log(
  `OK: validate:mission-speech-integrity — phrasesToday lê ${aggregates.phrasesToday}, spokenToday lê ${aggregates.spokenToday} · ${speaking.length} missão(ões) de fala, todas exigindo microfone`
);
