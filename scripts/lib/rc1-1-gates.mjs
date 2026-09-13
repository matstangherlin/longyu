/**
 * RC1.1 — Learning Loop Hardening.
 *
 * Cada gate aqui protege uma correção que veio de QA real, não uma métrica
 * inventada. O formato segue o resto do repositório: uma função por gate,
 * devolvendo `{ failures }`, para o script `test:*` poder matar o gate com
 * mutações e provar que ele morde.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

let tsHookInstalled = false;
export function installTsRequireHook() {
  if (tsHookInstalled) return;
  tsHookInstalled = true;
  require.extensions[".ts"] = (module, filename) =>
    module._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      filename
    );
  require.extensions[".tsx"] = require.extensions[".ts"];
}

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

/**
 * Remove comentários antes de procurar por código.
 *
 * Sem isto o gate se autoacusa: o comentário que EXPLICA por que
 * `cloudSync === finished` não pode existir casa com a busca por
 * `cloudSync === finished`. Um gate que confunde a documentação da regra com a
 * violação da regra não protege nada — só ensina a não escrever comentários.
 */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function loadModule(rel) {
  installTsRequireHook();
  return require(path.join(process.cwd(), rel));
}

// ── validate:review-advance ────────────────────────────────────────────────

/**
 * P0/P0.1–P0.6 — a revisão nunca fica presa depois de responder.
 *
 * O gate olha para a máquina de estados (o contrato) e para as telas que a
 * consomem. Um estado híbrido — feedback e "esperando resposta" ao mesmo
 * tempo — é o que fazia nenhum CTA ser o CTA certo.
 */
export function validateReviewAdvance(data = {}) {
  const { fail, failures } = failList();
  const machineSource = data.machineSource ?? read("src/features/lesson/taskFlowMachine.ts");
  const review = data.reviewSource ?? read("src/features/revisao/RevisaoPage.tsx");
  const moduleTest = data.moduleTestSource ?? read("src/features/challenge/ModuleChallengePage.tsx");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");

  for (const state of ["idle", "answered", "feedback", "advancing", "completed"]) {
    if (!machineSource.includes(`"${state}"`)) {
      fail("STATE_MACHINE", "taskFlowMachine", `estado "${state}" ausente`);
    }
  }
  for (const evt of ["ANSWER", "VERIFY", "FEEDBACK", "CONTINUE", "SETTLED"]) {
    if (!machineSource.includes(evt)) {
      fail("STATE_MACHINE", "taskFlowMachine", `evento ${evt} ausente`);
    }
  }
  if (!machineSource.includes("assertTaskFlowInvariant")) {
    fail("INVARIANT", "taskFlowMachine", "falta o invariante feedback × waitingForAnswer");
  }
  if (!machineSource.includes("resolveAdvanceDestination") || !machineSource.includes("resolvePostResultDestination")) {
    fail("NEXT_POINTER", "taskFlowMachine", "P12.1: destino precisa ser resolvido por uma função só");
  }
  if (!machineSource.includes("completeLocalFirst") || !machineSource.includes("CompletionLedger")) {
    fail("LOCAL_FIRST", "taskFlowMachine", "P0.5/P0.6: conclusão local-first e ledger idempotente ausentes");
  }

  // P12.2 — o destino nunca pode depender de sync de nuvem.
  if (/cloudSync[A-Za-z]*\s*===\s*"?finished/.test(code(machineSource))) {
    fail("SYNC_BLOCKS", "taskFlowMachine", "destino acoplado a cloudSync");
  }
  if (/cloudSyncState/.test(code(player))) {
    fail("SYNC_BLOCKS", "LessonPlayer", "P12.2: o player não pode assinar cloudSyncState");
  }

  // P0.2 — depois do feedback existe um CTA de continuar, e ele é sticky.
  if (!/data-review-continue/.test(review)) {
    fail("CONTINUE_CTA", "RevisaoPage", "P0.2: falta o CTA Continuar do feedback");
  }
  if (!/data-review-sticky-actions/.test(review) || !/sticky/.test(review)) {
    fail("STICKY_CTA", "RevisaoPage", "P0.2: CTA precisa ficar sticky no mobile");
  }
  // P0.6 — Continuar duas vezes não pode contar duas vezes.
  if (!/gradedReviewKeysRef/.test(review)) {
    fail("IDEMPOTENT", "RevisaoPage", "P0.6: falta guarda de duplo Continuar");
  }
  // P13 — o item recém-respondido não volta colado.
  if (!/nextQueuePosition/.test(review)) {
    fail("DUE_RACE", "RevisaoPage", "P13: avanço precisa pular o item recém-respondido");
  }
  // P0.4 — o último item encerra a sessão em vez de reiniciar o índice.
  if (!/pos \+ 1 >= questions\.length/.test(moduleTest)) {
    fail("LAST_ITEM", "ModuleChallengePage", "P0.4: último item precisa finalizar a sessão");
  }
  if (!/if \(!answered\) return;/.test(moduleTest)) {
    fail("IDEMPOTENT", "ModuleChallengePage", "P0.6: avanço sem resposta não pode passar");
  }

  return { failures };
}

// ── validate:feedback-audio ────────────────────────────────────────────────

/** P2 — correção revelada toca o mandarim, respeitando mute e dedupe. */
export function validateFeedbackAudio(data = {}) {
  const { fail, failures } = failList();
  const policy = data.policySource ?? read("src/features/lesson/feedbackAudioPolicy.ts");
  const review = data.reviewSource ?? read("src/features/revisao/RevisaoPage.tsx");
  const moduleTest = data.moduleTestSource ?? read("src/features/challenge/ModuleChallengePage.tsx");
  const steps = data.stepsSource ?? read("src/features/lesson/steps.tsx");
  const tts = data.ttsSource ?? read("src/lib/tts.ts");

  if (!policy.includes("decideFeedbackAudio")) {
    fail("POLICY", "feedbackAudioPolicy", "decisão de áudio ausente");
  }
  // P2.5 / mutação 5 e 20 — mute vence.
  if (!/soundEnabled/.test(policy) || !/reason: "muted"/.test(policy)) {
    fail("MUTE", "feedbackAudioPolicy", "P2.5: mute precisa impedir o áudio");
  }
  if (!/autoPlayAudio/.test(policy) || !/reason: "autoplay-off"/.test(policy)) {
    fail("AUTOPLAY_PREF", "feedbackAudioPolicy", "preferência de autoplay ignorada");
  }
  // P2.3 — dedupe por stepId + attemptId + estado.
  if (!/stepId\}#\$\{.*attemptId\}#\$\{.*outcome\}/.test(policy)) {
    fail("DEDUPE", "feedbackAudioPolicy", "P2.3: chave de dedupe precisa ser stepId+attemptId+outcome");
  }
  if (!/duplicate-step-audio/.test(policy)) {
    fail("DEDUPE", "feedbackAudioPolicy", "P2.3: listening recém-tocado não pode disparar de novo");
  }
  // P17 — feedback e vitória nunca ao mesmo tempo.
  if (!/victorySoundActive/.test(policy) || !/feedbackToVictorySequence/.test(policy)) {
    fail("NO_OVERLAP", "feedbackAudioPolicy", "P17: som de vitória não pode sobrepor o feedback");
  }
  // P2.4 — botão de replay continua existindo.
  if (!/showReplayButton/.test(policy)) {
    fail("REPLAY", "feedbackAudioPolicy", "P2.4: replay precisa continuar disponível");
  }

  for (const [ref, source] of [
    ["RevisaoPage", review],
    ["ModuleChallengePage", moduleTest],
    ["steps", steps],
  ]) {
    if (!source.includes("decideFeedbackAudio")) {
      fail("WIRING", ref, "P2: feedback sem áudio automático");
    }
    if (!source.includes("scheduleAutoSpeak")) {
      fail("WIRING", ref, "P2: falta disparar a fala do alvo");
    }
  }

  // P3 — o TTS aceita nome próprio, mas não copy de interface.
  if (!/properNames/.test(tts) || !/MandarinSpeechOptions/.test(tts)) {
    fail("PROPER_NAMES", "tts", "P3: nomes próprios não são falados");
  }
  if (!/speakableProperNames/.test(tts)) {
    fail("PROPER_NAMES", "tts", "P3.1: lista de nomes permitidos ausente");
  }

  return { failures };
}

// ── validate:task-modality-coherence ───────────────────────────────────────

/** P4 — a atividade precisa pedir algo que o renderer representa. */
export function validateTaskModalityCoherence(data = {}) {
  const { fail, failures } = failList();
  const contract = data.contractSource ?? read("src/features/lesson/taskModalityCoherence.ts");

  for (const needle of [
    "ALLOWED_KINDS_BY_SKILL",
    "REQUIRED_AFFORDANCE_BY_SKILL",
    "phraseBuilderReadiness",
    "PHRASE_BUILDER_FORBIDDEN_SKILLS",
  ]) {
    if (!contract.includes(needle)) fail("CONTRACT", "taskModalityCoherence", `falta ${needle}`);
  }
  // P4.2 — tarefa de tom usa interação de tom.
  if (!/tone_identification: \["tone", "tone_pair"/.test(contract)) {
    fail("TONE_TASK", "taskModalityCoherence", "P4.2: tone_identification precisa de tone/tone_pair");
  }
  // P4.3 — nada de score tonal por microfone sem avaliador acústico.
  if (!/allowsSpeechScoring/.test(contract) || !/hasAcousticToneEvaluator/.test(contract)) {
    fail("FAKE_TONE_SCORE", "taskModalityCoherence", "P4.3: produção de tom sem avaliador precisa ser recusada");
  }

  const runtimeFailures = data.runtimeFailures ?? scanPlanModalityCoherence();
  for (const violation of runtimeFailures) {
    fail("RUNTIME", violation.ref, violation.message);
  }
  return { failures, scanned: runtimeFailures.length };
}

/**
 * Varre o plano REAL de cada lição em cada pass. É esta varredura que
 * encontrou "Monte a frase" com alvo de um caractere e banco 妈/一/人/木 em 26
 * lições — um gate que só lesse o contrato não teria visto nada.
 */
export function scanPlanModalityCoherence() {
  installTsRequireHook();
  const root = process.cwd();
  const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
  const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));
  const { checkTaskModalityCoherence } = require(path.join(root, "src/features/lesson/taskModalityCoherence.ts"));

  const violations = [];
  for (const lesson of ALL_LESSONS) {
    for (const pass of [1, 2, 3, 4]) {
      let steps;
      try {
        steps = lessonRoundStepsFor(lesson, { masteryPass: pass });
      } catch {
        continue;
      }
      for (const step of steps ?? []) {
        for (const violation of checkTaskModalityCoherence(step)) {
          // Só os códigos de Phrase Builder falham a build: os demais existem
          // para o relatório e descrevem escolhas autorais legítimas.
          if (violation.code !== "PHRASE_BUILDER_INJECTED" && violation.code !== "PHRASE_BUILDER_UNSUPPORTED") {
            continue;
          }
          violations.push({ ref: `${lesson.id} p${pass}`, message: violation.message });
        }
      }
    }
  }
  return violations;
}

// ── validate:adaptive-plus-round ───────────────────────────────────────────

/** P6 — média das quatro rodadas, gatilho <= 2.0, Plus uma vez só. */
export function validateAdaptivePlusRound(data = {}) {
  const { fail, failures } = failList();
  const source = data.plusSource ?? read("src/features/lesson/plusRound.ts");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");
  const detail = data.detailSource ?? read("src/features/lesson/LessonDetailPage.tsx");
  const plus = data.plusModule ?? loadModule("src/features/lesson/plusRound.ts");

  // P6.3 — os exemplos do contrato, verificados de verdade.
  const cases = [
    [{ 1: 3, 2: 3, 3: 2, 4: 2 }, 2.5, false],
    [{ 1: 2, 2: 2, 3: 2, 4: 2 }, 2.0, true],
    [{ 1: 1, 2: 2, 3: 2, 4: 3 }, 2.0, true],
    [{ 1: 1, 2: 1, 3: 2, 4: 2 }, 1.5, true],
    [{ 1: 3, 2: 3, 3: 3, 4: 2 }, 2.75, false],
  ];
  for (const [passStars, expectedAverage, expectedPlus] of cases) {
    const average = plus.topicAverageStars(passStars);
    if (average !== expectedAverage) {
      fail("AVERAGE", JSON.stringify(passStars), `média ${average} ≠ ${expectedAverage}`);
    }
    if (plus.needsPlusRound(average) !== expectedPlus) {
      fail("TRIGGER", JSON.stringify(passStars), `gatilho ${!expectedPlus} para média ${average}`);
    }
  }
  // Rodada faltando: sem média, sem Plus.
  if (plus.topicAverageStars({ 1: 2, 2: 2, 3: 2 }) !== null) {
    fail("AVERAGE", "3 rodadas", "média não pode existir antes das quatro rodadas");
  }

  // P6.5 — enquanto a Plus é necessária, o tema não é dominado.
  const weak = { passStars: { 1: 2, 2: 2, 3: 2, 4: 2 } };
  if (plus.topicMasteryPhase(weak) !== "plus_required") {
    fail("NOT_MASTERED", "topicMasteryPhase", "P6.5: tema não pode ser dominado antes da Plus");
  }
  // P6.6 — depois da Plus o tema fecha, e a Plus não volta.
  if (plus.topicMasteryPhase({ ...weak, plusCompleted: true }) !== "mastered") {
    fail("AFTER_PLUS", "topicMasteryPhase", "P6.6: tema precisa fechar depois da Plus");
  }
  if (plus.plusRoundAvailable({ ...weak, plusCompleted: true })) {
    fail("PLUS_ONCE", "plusRoundAvailable", "P6.6: Plus não pode reaparecer");
  }

  // P7.3 — a Plus é curta.
  if (plus.PLUS_ROUND_MIN_TASKS !== 6 || plus.PLUS_ROUND_MAX_TASKS !== 10) {
    fail("SIZE", "plusRound", "P7.3: a Plus tem entre 6 e 10 tarefas");
  }
  // P11.1 — a chave de XP não pode ter data nem tentativa.
  const rewardId = plus.plusRoundXpRewardId("l5");
  if (!/^plus-round:l5$/.test(rewardId)) {
    fail("XP_FARM", "plusRoundXpRewardId", `P11.1: chave "${rewardId}" permite farm`);
  }
  // P6.4 — a média nunca sai de XP.
  const averageBody = code(
    source.slice(source.indexOf("export function topicAverageStars"), source.indexOf("export function needsPlusRound"))
  );
  if (/\bxp\b/i.test(averageBody)) {
    fail("AVERAGE_SOURCE", "topicAverageStars", "P6.4: média não pode derivar de XP");
  }

  // Freeze: a Plus é sessão, não lição de catálogo.
  if (/lesson-5-plus/.test(code(source)) || /lesson-5-plus/.test(code(player))) {
    fail("FREEZE", "plusRound", "P6: a Plus não pode virar lesson canônica");
  }
  if (!/reforco=1/.test(player) || !/isPlusRoundSession/.test(player)) {
    fail("WIRING", "LessonPlayer", "P6: sessão de Reforço + não ligada");
  }
  if (!/plusRoundAvailable/.test(detail) || !/data-topic-plus-round/.test(detail)) {
    fail("WIRING", "LessonDetailPage", "P9: card do tema sem estado de Reforço +");
  }

  return { failures };
}

// ── validate:adaptive-remediation-diversity ────────────────────────────────

/** P8 — a Plus repete o conhecimento, não o exercício. */
export function validateAdaptiveRemediationDiversity(data = {}) {
  const { fail, failures } = failList();
  const plus = data.plusModule ?? loadModule("src/features/lesson/plusRound.ts");

  const evidence = [
    { ref: "char:zaijian", skill: "meaning", signal: "wrong", stepKind: "comprehend", pass: 1 },
    { ref: "char:zaijian", skill: "meaning", signal: "wrong", stepKind: "comprehend", pass: 2 },
    { ref: "char:ma1", skill: "tone", signal: "wrong", stepKind: "tone", pass: 2 },
    { ref: "char:hao", skill: "hanzi", signal: "wrong", stepKind: "recognize", pass: 3 },
    { ref: "char:xiexie", skill: "listening", signal: "skip", pass: 3 },
  ];
  const topicSteps = [
    { kind: "comprehend", charId: "nihao" },
    { kind: "listen_select", charId: "buyong" },
    { kind: "match_pairs", charId: "qingwen" },
    { kind: "dialogue_choice", charId: "duibuqi" },
    { kind: "fill_blank", charId: "meiguanxi" },
  ];
  const plan = plus.buildPlusRoundPlan({ topicId: "l5", evidence, topicSteps, size: 8 });
  const report = plus.checkRemediationDiversity(plan);
  for (const failure of report.failures) fail("DIVERSITY", "plusRound", failure);

  // P8.1 — quem errou múltipla escolha de significado não recebe a mesma.
  const meaningSlot = plan.slots.find((slot) => slot.ref === "char:zaijian");
  if (meaningSlot && meaningSlot.kind === "comprehend") {
    fail("SAME_MODALITY", "char:zaijian", "P8.1: significado errado voltou como a mesma múltipla escolha");
  }
  // P8.2 — tom errado não volta no mesmo exercício de tom.
  const toneSlot = plan.slots.find((slot) => slot.ref === "char:ma1");
  if (toneSlot && toneSlot.kind === "tone") {
    fail("SAME_MODALITY", "char:ma1", "P8.2: tom errado repetiu o mesmo áudio");
  }
  // P8.3 — hànzì errado sobe pela escada (áudio → hànzì antes de fill).
  const hanziSlot = plan.slots.find((slot) => slot.ref === "char:hao");
  if (hanziSlot && hanziSlot.kind === "recognize") {
    fail("SAME_MODALITY", "char:hao", "P8.3: reconhecimento errado voltou igual");
  }
  // P7 — a Plus revisa o tema, não só a lista de erros.
  if (plan.recallShare <= 0) {
    fail("RECALL", "plusRound", "P7: a Plus precisa incluir recall geral do tema");
  }
  if (plan.weakShare <= 0.4) {
    fail("WEAK_FOCUS", "plusRound", "P7: a Plus precisa se concentrar onde houve dificuldade");
  }
  // P8.5 — um plano que é só clone dos erros tem que falhar.
  const clonePlan = {
    topicId: "l5",
    slots: evidence.slice(0, 6).map((item) => ({
      ref: item.ref,
      origin: "weak",
      kind: item.stepKind ?? "comprehend",
      previousKind: item.stepKind ?? "comprehend",
      skill: item.skill,
    })),
    weakShare: 1,
    recallShare: 0,
  };
  if (plus.checkRemediationDiversity(clonePlan).ok) {
    fail("GATE_BLIND", "checkRemediationDiversity", "P8.5: clone dos erros precisa falhar");
  }

  return { failures };
}

// ── validate:victory-minimalism ────────────────────────────────────────────

/** P14 — a Victory celebra; não é dashboard, relatório nem vitrine de Pro. */
export function validateVictoryMinimalism(data = {}) {
  const { fail, failures } = failList();
  const victory = data.victorySource ?? read("src/features/lesson/LessonVictory.tsx");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");
  const summary = data.summarySource ?? read("src/features/lesson/buildLessonCompletionSummary.ts");
  const build = data.summaryModule ?? loadModule("src/features/lesson/buildLessonCompletionSummary.ts");

  // P14.3 / mutação 16 — nenhum upsell na vitória.
  if (/ProOfferBanner|ProOffer|seeProPlans|viewPlans|PRO_PAYWALL_CTA/.test(code(victory))) {
    fail("PRO_UPSELL", "LessonVictory", "P14.3: oferta Pro não entra na vitória");
  }
  const victoryBlock = player.slice(player.indexOf("<LessonVictory"), player.indexOf("</>", player.indexOf("<LessonVictory")));
  if (/ProOfferBanner/.test(victoryBlock)) {
    fail("PRO_UPSELL", "LessonPlayer", "P14.3: a vitória não recebe faixa de oferta");
  }
  // P14.2 / mutação 17 — nada de estado operacional de sync.
  if (/saveStatusLabel|saveSyncing|saveLocalSafeRetry|cloudSyncState/.test(code(victory))) {
    fail("SYNC_TEXT", "LessonVictory", "P14.2: texto de sincronização não entra na vitória");
  }
  // P14.2 — sem dashboard, acordeão, card cultural, missões ou nav inferior.
  for (const [needle, reason] of [
    [/CultureTouchpoint|touchpointEyebrow/, "CULTURE_CARD"],
    [/missionsUpdated/, "MISSIONS"],
    [/guidedReinforcement/, "GUIDED"],
    [/leaveFeedback/, "FEEDBACK"],
    [/CollapsibleInfoCard|<details/, "ACCORDION"],
    [/player\.navReview|player\.navLibrary/, "BOTTOM_NAV"],
  ]) {
    if (needle.test(code(victory))) fail(reason, "LessonVictory", `P14.2: ${needle} não pertence à vitória`);
  }
  // P30 / mutação 18 — um CTA primário, e só um botão de ação.
  const primaryCount = (code(victory).match(/data-victory-primary/g) ?? []).length;
  if (primaryCount !== 1) {
    fail("CTA_COUNT", "LessonVictory", `P14: ${primaryCount} CTAs primários (esperado 1)`);
  }
  if (/data-victory-review-errors/.test(code(victory))) {
    fail("CTA_COUNT", "LessonVictory", "P14.2: CTA secundário removido da vitória");
  }
  // P16/P16.2 — celebração curta, respeitando mute e reduced-motion.
  if (!/prefers-reduced-motion/.test(victory)) {
    fail("REDUCED_MOTION", "LessonVictory", "P16.2: animação precisa respeitar reduced-motion");
  }
  if (!/soundEffects/.test(victory) || !/playSoundFx/.test(victory)) {
    fail("SOUND", "LessonVictory", "P16.1: som de conclusão ausente ou sem respeitar mute");
  }
  if (!/playedRef/.test(victory)) {
    fail("REPLAY", "LessonVictory", "P11.1: a vitória não pode repetir efeitos a cada render");
  }

  // P14.4 / mutação 19 — "ponto forte" só com evidência real.
  if (!/hasRealStrength/.test(summary) || !/hasRealStrength/.test(victory)) {
    fail("FAKE_STRENGTH", "buildLessonCompletionSummary", "P14.4: falta a marca de destaque verdadeiro");
  }
  const bad = build.buildLessonCompletionSummary({ accuracy: 20, errorCount: 8 });
  if (bad.hasRealStrength) {
    fail("FAKE_STRENGTH", "summary", "P14.4: 20% de precisão não é ponto forte");
  }
  if (/20/.test(bad.highlight)) {
    fail("FAKE_STRENGTH", "summary", `P14.4: destaque elogia precisão ruim ("${bad.highlight}")`);
  }
  if (!bad.focus) {
    fail("FOCUS", "summary", "P14.5: sessão ruim precisa de um foco útil");
  }
  const good = build.buildLessonCompletionSummary({ accuracy: 100, errorCount: 0 });
  if (!good.hasRealStrength || !good.perfect) {
    fail("STRENGTH", "summary", "sessão perfeita precisa manter o destaque");
  }

  return { failures };
}

// ── validate:rc-learning-loop-freeze ───────────────────────────────────────

/**
 * P23 — esta remessa é runtime. Se ela mexer na identidade do currículo, o
 * gate precisa dizer isso em voz alta em vez de deixar passar.
 */
export function validateRcLearningLoopFreeze(data = {}) {
  const { fail, failures } = failList();
  installTsRequireHook();
  const freeze = data.freezeModule ?? loadModule("src/lib/curriculumFreeze.ts");
  const fingerprint = data.fingerprint;
  const counts = data.counts;

  if (freeze.CURRICULUM_FREEZE !== "RC1") {
    fail("FREEZE", "curriculumFreeze", `CURRICULUM_FREEZE=${freeze.CURRICULUM_FREEZE} (esperado RC1)`);
  }
  if (fingerprint && fingerprint !== freeze.RC_BASE_FINGERPRINT) {
    fail(
      "FINGERPRINT",
      "journey",
      `fingerprint ${fingerprint} ≠ ${freeze.RC_BASE_FINGERPRINT} — mudança de currículo exige justificativa explícita`
    );
  }
  if (counts) {
    if (counts.lessons !== freeze.RC1_EXPECTED_LESSON_COUNT) {
      fail("LESSON_COUNT", "journey", `${counts.lessons} lições (esperado ${freeze.RC1_EXPECTED_LESSON_COUNT})`);
    }
    if (counts.teachingTopics !== freeze.RC1_EXPECTED_TEACHING_TOPIC_COUNT) {
      fail(
        "TOPIC_COUNT",
        "journey",
        `${counts.teachingTopics} temas (esperado ${freeze.RC1_EXPECTED_TEACHING_TOPIC_COUNT})`
      );
    }
  }

  // A Plus não pode ter virado conteúdo.
  const journeySource = data.journeySource ?? read("src/data/journey.ts");
  if (/lesson-5-plus|plusRound/.test(code(journeySource))) {
    fail("FREEZE", "journey.ts", "P6: a Plus não pode existir no catálogo");
  }

  return { failures };
}

export function countCurriculum() {
  installTsRequireHook();
  const root = process.cwd();
  const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
  const { isTopicMasteryLesson } = require(path.join(root, "src/data/topicMastery.ts"));
  return {
    lessons: ALL_LESSONS.length,
    teachingTopics: ALL_LESSONS.filter((lesson) => isTopicMasteryLesson(lesson)).length,
  };
}
