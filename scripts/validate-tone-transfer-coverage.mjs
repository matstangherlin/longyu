/**
 * RC2.2.7 — validate:tone-transfer-coverage
 *
 * O tom saiu do exercício de tom? Este gate responde isso estruturalmente.
 *
 * Tudo aqui é computado contra `ALL_LESSONS` e contra o registro — nada é
 * hardcoded. Mexer no currículo tem de quebrar este gate em vez de deixar a
 * transferência tonal silenciosamente voltar a zero.
 */

import { require } from "./lib/v495a-runtime.mjs";

const { ALL_LESSONS } = require("../../src/data/journey.ts");
const {
  TONE_TRANSFER_TASKS,
  TONE_SANDHI_TARGET_IDS,
  toneTransferKnowledgeTargetIds,
  toneTransferToneCoverage,
  toneTransferSandhiCoverage,
} = require("../../src/data/toneTransfer.ts");

const MIN_TASKS = 12;
const MIN_LESSONS = 6;
const MIN_CONVERSATION_TASKS = 4;
const REQUIRED_TONES = [1, 2, 3, 4];
const REQUIRED_SANDHI = ["third-third", "bu", "yi"];
const CJK = /[㐀-鿿]/u;

const failures = [];
const fail = (code, where, why) => failures.push({ code, where, why });

/** Índice: cada passo de transferência tonal, com vizinho anterior e lição. */
const materialized = new Map();
for (const lesson of ALL_LESSONS) {
  const steps = lesson.steps ?? [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step?.pedagogicalEvidence?.rung !== "TRANSFER") continue;
    const ids = step.pedagogicalEvidence.knowledgeTargetIds ?? [];
    if (!ids.includes("concept:tone-system")) continue;
    const key = `${lesson.id}::${step.correctAnswer ?? step.answer ?? ""}::${step.title ?? ""}`;
    materialized.set(key, { lesson, step, index, previous: steps[index - 1] });
  }
}

const seenIds = new Set();
const lessonsWithTasks = new Set();
let conversationTasks = 0;

for (const task of TONE_TRANSFER_TASKS) {
  const where = task.id;

  if (seenIds.has(task.id)) fail("DUPLICATE_TASK", where, "id repetido no registro");
  seenIds.add(task.id);

  // Copy em PT e EN obrigatórias em tudo que o aluno lê.
  for (const field of ["titlePt", "titleEn", "situationPt", "situationEn", "toneReminderPt", "toneReminderEn"]) {
    if (!String(task[field] ?? "").trim()) fail("MISSING_COPY", where, `${field} vazio`);
  }
  if (task.titlePt === task.titleEn) fail("UNTRANSLATED", where, "titlePt === titleEn");
  if (task.situationPt === task.situationEn) fail("UNTRANSLATED", where, "situationPt === situationEn");
  if (task.toneReminderPt === task.toneReminderEn) fail("UNTRANSLATED", where, "lembrete tonal não traduzido");

  // Situação com hànzì viraria cópia, não produção.
  if (CJK.test(task.situationPt)) fail("SITUATION_SHOWS_HANZI", where, "situationPt mostra hànzì");
  if (CJK.test(task.situationEn)) fail("SITUATION_SHOWS_HANZI", where, "situationEn mostra hànzì");
  if (!CJK.test(task.targetHanzi ?? "")) fail("TARGET_WITHOUT_HANZI", where, "targetHanzi sem hànzì");
  if (!String(task.targetPinyin ?? "").trim()) fail("MISSING_PINYIN", where, "targetPinyin vazio");

  // Sem tom declarado a tarefa não é tonal — e o gate tonal deixaria de contá-la.
  const tones = task.tones ?? [];
  if (!tones.length) fail("NO_TONES", where, "tarefa sem tom declarado");
  for (const tone of tones) {
    if (!REQUIRED_TONES.includes(tone)) fail("UNKNOWN_TONE", where, `tom ${tone} fora de 1..4`);
  }
  for (const rule of task.sandhi ?? []) {
    if (!REQUIRED_SANDHI.includes(rule)) fail("UNKNOWN_SANDHI", where, `sandhi desconhecido "${rule}"`);
  }

  // Os alvos de conhecimento são o que faz a tarefa contar como tonal.
  const targetIds = toneTransferKnowledgeTargetIds(task);
  if (!targetIds.includes("concept:tone-system")) {
    fail("NO_TONE_SYSTEM_TARGET", where, "faltou concept:tone-system");
  }
  for (const rule of task.sandhi ?? []) {
    if (!targetIds.includes(TONE_SANDHI_TARGET_IDS[rule])) {
      fail("SANDHI_TARGET_MISSING", where, `id de ${rule} ausente dos knowledgeTargetIds`);
    }
  }

  // A lição existe e o passo foi MATERIALIZADO nela — registro sem uso é mentira.
  const lesson = ALL_LESSONS.find((item) => item.id === task.lessonId);
  if (!lesson) {
    fail("UNKNOWN_LESSON", where, `lessonId ${task.lessonId} não está em ALL_LESSONS`);
    continue;
  }
  lessonsWithTasks.add(task.lessonId);

  const key = `${task.lessonId}::${task.targetHanzi}::${task.titlePt}`;
  const placed = materialized.get(key);
  if (!placed) {
    fail("NOT_MATERIALIZED", where, `nenhum passo TRANSFER em ${task.lessonId} corresponde a esta tarefa`);
    continue;
  }

  // O motor tem de ser o que já existe. StepKind novo é proibido nesta remessa.
  if (placed.step.kind !== "free_production") {
    fail("NEW_ENGINE", where, `kind "${placed.step.kind}" — a remessa reusa free_production`);
  }
  // TRANSFER = resposta invisível. Opção, banco ou dica devolvem reconhecimento.
  if ((placed.step.options ?? []).length) fail("SUPPORT_LEAK", where, "passo oferece alternativas");
  if ((placed.step.bank ?? []).length) fail("SUPPORT_LEAK", where, "passo oferece banco de peças");
  if (placed.step.isNoHint !== true) fail("SUPPORT_LEAK", where, "passo não está marcado sem dica");

  // Contexto de conversa é VERIFICADO, não declarado: o passo anterior na
  // lição precisa ser a própria cena que a tarefa diz retomar.
  if (task.context === "conversation") {
    conversationTasks += 1;
    if (!task.sceneId) {
      fail("MISSING_SCENE", where, 'context "conversation" sem sceneId');
    } else if (placed.previous?.kind !== "conversation_scene") {
      fail(
        "NOT_AFTER_CONVERSATION",
        where,
        `passo anterior é "${placed.previous?.kind ?? "nenhum"}", não conversation_scene`
      );
    } else if (placed.previous.sceneId !== task.sceneId) {
      fail(
        "SCENE_MISMATCH",
        where,
        `declara ${task.sceneId} mas vem depois de ${placed.previous.sceneId}`
      );
    }
  } else if (task.sceneId) {
    fail("UNUSED_SCENE", where, 'sceneId declarado fora de context "conversation"');
  }
}

// Passo TRANSFER tonal na Jornada sem tarefa no registro = segunda lista.
if (materialized.size !== TONE_TRANSFER_TASKS.length) {
  fail(
    "REGISTRY_DRIFT",
    "toneTransfer",
    `${materialized.size} passos TRANSFER tonais na Jornada contra ${TONE_TRANSFER_TASKS.length} no registro`
  );
}

if (TONE_TRANSFER_TASKS.length < MIN_TASKS) {
  fail("TOO_FEW_TASKS", "toneTransfer", `${TONE_TRANSFER_TASKS.length} tarefas, mínimo ${MIN_TASKS}`);
}
if (lessonsWithTasks.size < MIN_LESSONS) {
  fail("TOO_FEW_LESSONS", "toneTransfer", `${lessonsWithTasks.size} lições, mínimo ${MIN_LESSONS}`);
}
if (conversationTasks < MIN_CONVERSATION_TASKS) {
  fail(
    "TOO_FEW_CONVERSATION",
    "toneTransfer",
    `${conversationTasks} em conversa, mínimo ${MIN_CONVERSATION_TASKS}`
  );
}

const toneCoverage = toneTransferToneCoverage();
for (const tone of REQUIRED_TONES) {
  if (!toneCoverage.includes(tone)) fail("TONE_NOT_COVERED", "toneTransfer", `tom ${tone} sem transferência`);
}
const sandhiCoverage = toneTransferSandhiCoverage();
for (const rule of REQUIRED_SANDHI) {
  if (!sandhiCoverage.includes(rule)) fail("SANDHI_NOT_COVERED", "toneTransfer", `sandhi ${rule} sem transferência`);
}

console.log(
  JSON.stringify(
    {
      tasks: TONE_TRANSFER_TASKS.length,
      lessons: [...lessonsWithTasks].sort(),
      conversationTasks,
      toneCoverage,
      sandhiCoverage,
      materialized: materialized.size,
      failures,
    },
    null,
    2
  )
);

if (failures.length) process.exitCode = 1;
else console.log("PASS validate:tone-transfer-coverage");
