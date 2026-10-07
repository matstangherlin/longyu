#!/usr/bin/env node
/**
 * test:rc2-3-7-sensory-guidance — mutation testing for gate:rc2-3-7-sensory-guidance.
 * Each mutation reintroduces ONE forbidden behaviour; the right code must fire.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSensoryRuntime, runSensoryGate } from "./lib/sensory-guidance-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadSensoryRuntime(root);
assert.deepEqual(runSensoryGate(base), [], "estado real precisa passar");

const swap = (text, from, to) => {
  assert.ok(String(text).includes(from), `mutação vazia: ${String(from).slice(0, 80)}`);
  return String(text).split(from).join(to);
};
const file = (rel, from, to) => ({ srcFiles: { ...base.srcFiles, [rel]: swap(base.srcFiles[rel], from, to) } });
const src = (key, from, to) => ({ src: { ...base.src, [key]: swap(base.src[key], from, to) } });
const msg = (key, value) => ({ messages: { ...base.messages, pt: { ...base.messages.pt, [key]: value } } });

const cases = [
  ["1. vibrar navegação", file("src/components/layout/TabBar.tsx", "import ", 'import { haptic } from "../../lib/haptics";\nimport '), "NO_HAPTIC_NAVIGATION"],
  ["2. vibrar scroll", file("src/features/journey/JourneyPage.tsx", "import ", 'const onScrollVibrate = () => window.addEventListener("scroll", () => { haptic("selection"); });\nimport '), "NO_HAPTIC_SCROLL"],
  ["3. duas orientações ao mesmo tempo", { selectGuidance: (ctx) => { const one = base.selectGuidance(ctx); return one ? [one, one] : one; } }, "ONE_GUIDANCE_AT_A_TIME"],
  ["4. ignora orçamento de orientação", { selectGuidance: (ctx) => base.selectGuidance({ ...ctx, session: { ...ctx.session, shownIds: [] } }) }, "GUIDANCE_BUDGET"],
  ["5. som com ajuste OFF", { sfxDecision: (i) => base.sfxDecision({ ...i, enabled: true, soundEffectsSetting: true }) }, "SOUND_PREFERENCE"],
  ["6. vibração com ajuste OFF", { hapticDecision: (i) => base.hapticDecision({ ...i, enabled: true }) }, "HAPTIC_PREFERENCE"],
  ["7. 'SpeechRecognizer' na tela do aluno", msg("player.voiceUnavailable", "SpeechRecognizer indisponível."), "NO_ENGINE_LANGUAGE"],
  ["8. 'Tocando' no toque, antes do áudio", file("src/features/lesson/steps.tsx", 'listen === "PLAYING"\n            ? tr("guidedTry.audioPlaying")', 'listen !== "IDLE"\n            ? tr("guidedTry.audioPlaying")'), "AUDIO_TRUTH"],
  ["9. cerimônia de conclusão duplicada", { hapticDecision: (i) => (i.event === "lessonComplete" ? { fire: i.enabled } : base.hapticDecision(i)) }, "CEREMONY_DEDUPE"],
  ["10. CTA 'Continuar +20 XP'", msg("common.continue", "Continuar +20 XP"), "CTA_NO_REWARD"],
  ["11. primeiro uso repete toda sessão", { selectGuidance: (ctx) => base.selectGuidance({ ...ctx, state: { ...ctx.state, records: {} } }) }, "FIRST_USE_ONCE"],
  ["12. movimento reduzido ignorado", { completionSchedule: (stages) => base.completionSchedule(stages, false) }, "REDUCED_MOTION"],
  ["12b. CSS anima shake com movimento reduzido", src("css", "  .longyu-error-shake,\n", ""), "REDUCED_MOTION"],
  ["13. erro só em vermelho (sem texto)", msg("review.feedbackWrong", ""), "NOT_COLOR_ONLY"],
  ["14. erro técnico sem saída", src("errorBoundary", 't("common.retry")', 't("common.ok")'), "TECHNICAL_ERROR_EXIT"],
  ["15. retorno vai ao topo da Jornada", src("journey", "consumeJourneyReturnAnchor()", "null"), "RETURN_CONTEXT"],
  ["15b. prática de domínio volta à Jornada", src("review", 'masterySession ? "/dominio" : "/jornada"', '"/jornada"'), "RETURN_CONTEXT"],
  ["16. Seu Domínio mostra nota crua", src("dominio", "{STATE_LABEL_PT[state]}", "{STATE_LABEL_PT[state]} {Math.round(pm.getDimensionState(r.targetId, r.view).estimate * 100)}%"), "MASTERY_NO_RAW_SCORE"],
  ["17. Jev ligado no runtime do aluno", { srcFiles: { ...base.srcFiles, "src/lib/jevLearner.ts": "fetch('https://api.typesafe.ai/v1/systemone')" } }, "JEV_RUNTIME_OFF"],
  ["17b. flag JEV_RUNTIME_ENABLED true", src("budgetPolicy", /JEV_RUNTIME_ENABLED:\s*false/.exec(base.src.budgetPolicy)[0], "JEV_RUNTIME_ENABLED: true"), "JEV_RUNTIME_OFF"],
  ["19. orientação em rota que não existe", { guidance: { ...base.guidance, GUIDANCE_DEFINITIONS: [...base.guidance.GUIDANCE_DEFINITIONS, { ...base.guidance.GUIDANCE_DEFINITIONS[0], id: "ghost_v1", surfaces: ["/tons"] }] } }, "GUIDANCE_BUDGET"],
  ["18. som de acerto não cansa? (fadiga desligada)", { sfxDecision: (i) => ({ ...base.sfxDecision(i), gain: 1 }) }, "SFX_FATIGUE"],
];

let killed = 0;
for (const [label, patch, code] of cases) {
  const got = new Set(runSensoryGate({ ...base, ...patch }).map((f) => f.code));
  assert.ok(got.has(code), `mutação "${label}" deveria falhar com ${code}; veio ${[...got].join(", ") || "nada"}`);
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS test:rc2-3-7-sensory-guidance (${killed}/${cases.length} mutações mortas)`);
