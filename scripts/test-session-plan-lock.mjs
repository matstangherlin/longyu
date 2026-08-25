/**
 * Guarda: o plano adaptativo da lição NÃO pode desmontar a atividade no meio
 * da resposta só porque srs / erros / progresso de hànzì mudaram.
 *
 * Bug real (loop de atividade): ao acertar o Hànzì Builder, recordHanziBuilderResult
 * atualiza hanziBuilderProgress → o efeito de planejamento rodava de novo →
 * setPlanReady(false) → tela "Preparando atividades…" → remount do passo vazio.
 *
 * Roda: npm run test:session-plan-lock
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

assert(/sessionPlanRef/.test(player), "sessionPlanRef exists");
assert(/planNonce/.test(player), "planNonce exists to unlock on retry");
assert(
  /Sessão já tem plano — ignore churn de srs/.test(player),
  "early-return comment documents mid-session churn ignore"
);
assert(
  /sessionPlanRef\.current = \{[\s\S]{0,180}?lessonId: lessonIdAtStart[\s\S]{0,180}?steps: planned/.test(
    player
  ),
  "plan is locked when adaptive steps are applied"
);
assert(
  /locked && locked\.lessonId === foundLesson\.id && locked\.nonce === planNonce/.test(player),
  "lock early-returns when lesson+nonce match"
);
assert(
  /masteryChanged|canReplanForMastery/.test(player),
  "topic path may replan at step 0 when mastery hydrates"
);

// retryLesson must unlock before starting a new attempt.
const retryIdx = player.indexOf("function retryLesson(");
assert(retryIdx >= 0, "retryLesson exists");
const retrySlice = player.slice(retryIdx, retryIdx + 900);
assert(/sessionPlanRef\.current = null/.test(retrySlice), "retryLesson clears sessionPlanRef");
assert(/setPlanNonce/.test(retrySlice), "retryLesson bumps planNonce");
assert(/setPlanReady\(false\)/.test(retrySlice), "retryLesson resets planReady");

// Ordering inside the planner effect: lock check before fast-path setPlanReady(false).
const lockIdx = player.indexOf("locked && locked.lessonId === foundLesson.id && locked.nonce === planNonce");
const fastPathReady = player.indexOf("setAdaptiveSteps(authoredEnrichedSteps)");
const fastPathFalse = player.indexOf("setPlanReady(false)", fastPathReady);
assert(lockIdx >= 0 && fastPathReady > lockIdx, "authored fast-path comes after lock check");
assert(fastPathFalse > fastPathReady, "setPlanReady(false) for replan sits on the unlocked path");

if (failures.length) {
  console.error("FAIL test:session-plan-lock:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:session-plan-lock (adaptive plan locked for lesson session).");
