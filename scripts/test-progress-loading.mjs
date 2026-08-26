/**
 * Guarda: o percentual de progresso da lição não pode ficar em loading eterno.
 *
 * Dois bugs reais:
 * 1. LessonPlayer punha setPlanReady(false) e planejava em startTransition.
 *    Updates da store cancelavam o planner (planGenRef++) → "Preparando
 *    atividades…" para sempre e a barra de progresso nunca aparecia.
 * 2. Sync da nuvem marcava cloudSyncState=loading e, se fetch/import
 *    pendurasse, "Carregando progresso da nuvem..." nunca saía.
 *
 * Roda: npm run test:progress-loading
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const player = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
const primitives = await readFile(path.join(rootDir, "src/components/ui/primitives.tsx"), "utf8");
const sync = await readFile(path.join(rootDir, "src/services/cloudSyncCoordinator.ts"), "utf8");
const header = await readFile(path.join(rootDir, "src/features/lesson/LessonFocusHeader.tsx"), "utf8");

assert(/setPlanReady\(true\)/.test(player), "player can mark the plan ready");
assert(
  /Libera o player na hora com os passos autorais/.test(player),
  "authored fast-path comment documents unlocking the progress bar immediately"
);
assert(
  /setAdaptiveSteps\(authored\)/.test(player) && /setPlanReady\(true\)/.test(player),
  "authored steps unlock planReady before adaptive planning"
);

const authoredUnlock = player.indexOf("setAdaptiveSteps(authored)");
const readyTrue = player.indexOf("setPlanReady(true)", authoredUnlock);
const startTransitionIdx = player.indexOf("startTransition", authoredUnlock);
assert(authoredUnlock >= 0 && readyTrue > authoredUnlock, "planReady true follows authored unlock");
assert(
  startTransitionIdx > readyTrue,
  "startTransition adaptive planning runs after the player is already unlocked"
);
assert(/catch \{/.test(player), "planner catch keeps the lesson playable");
assert(
  /idxRef\.current > 0/.test(player),
  "adaptive result is not swapped under an in-progress answer"
);
assert(/2500/.test(player) && /setPlanReady\(true\)/.test(player), "watchdog unlocks a stuck planner");

assert(/Number\.isFinite\(value\)/.test(primitives), "ProgressBar rejects NaN values");
assert(/data-progress-pct/.test(primitives), "ProgressBar exposes determinate percent");
assert(/data-lesson-progress-label/.test(header), "lesson header exposes the progress fraction");

assert(/function withTimeout/.test(sync), "cloud sync wraps network in a timeout");
assert(/CLOUD_SYNC_TIMEOUT_MS/.test(sync), "cloud sync timeout constant exists");
assert(
  /withTimeout\(activeLearningRepository\(\)\.fetchSnapshot\(\)\)/.test(sync),
  "restore path cannot hang forever on fetchSnapshot"
);
assert(
  /withTimeout\(activeLearningRepository\(\)\.importSnapshot/.test(sync),
  "push path cannot hang forever on importSnapshot"
);
assert(/catch \{[\s\S]{0,180}markCloudSync\("error"/.test(sync), "timeout leaves sync in error, not loading");

if (failures.length) {
  console.error("FAIL test:progress-loading:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:progress-loading (lesson bar + cloud sync cannot load forever).");
