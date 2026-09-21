/**
 * RC2.2.7 — test:tone-transfer
 *
 * Comportamento da transferência tonal: o tom sai do exercício de tom e vira
 * comunicação. Exercita as MESMAS funções puras que a Jornada e os gates
 * consultam — passar aqui tem de significar passar lá.
 *
 * Inclui a fronteira que fecha a remessa: a classificação tonal passou a ser
 * SEMÂNTICA (degrau + alvo de conhecimento), não mais a palavra "transfer" na
 * copy. Há caso para os dois lados dessa troca.
 */

import assert from "node:assert/strict";
import { require } from "./lib/v495a-runtime.mjs";

const { ALL_LESSONS } = require("../../src/data/journey.ts");
const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
const {
  TONE_TRANSFER_TASKS,
  TONE_SANDHI_TARGET_IDS,
  toneTransferTaskById,
  toneTransferTasksForLesson,
  toneTransferKnowledgeTargetIds,
  toneTransferToneCoverage,
  toneTransferSandhiCoverage,
} = require("../../src/data/toneTransfer.ts");

const cases = [];
const it = (name, fn) => {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({ name, ok: false, why: error?.message ?? String(error) });
  }
};

/** Passos de transferência tonal como a Jornada realmente os materializa. */
function materializedToneTransferSteps() {
  const found = [];
  for (const lesson of ALL_LESSONS) {
    const steps = lesson.steps ?? [];
    steps.forEach((step, index) => {
      const evidence = step?.pedagogicalEvidence;
      if (evidence?.rung !== "TRANSFER") return;
      if (!(evidence.knowledgeTargetIds ?? []).includes("concept:tone-system")) return;
      found.push({ lesson, step, index, previous: steps[index - 1] });
    });
  }
  return found;
}

/** Réplica da classificação de `validate:tone-teach-before-test` (RC2.2.7). */
function classifiesAsToneTransfer(step) {
  const ids = step?.pedagogicalEvidence?.knowledgeTargetIds ?? [];
  const hasToneTarget = ids.some((id) => id === "concept:tone-system" || /^concept:tone-[1-4]$/u.test(id));
  return step?.pedagogicalEvidence?.rung === "TRANSFER" && hasToneTarget;
}

// ── Registro: forma e lookups ────────────────────────────────────────────────
it("o registro entrega pelo menos 12 tarefas", () => {
  assert.ok(TONE_TRANSFER_TASKS.length >= 12, `apenas ${TONE_TRANSFER_TASKS.length}`);
});

it("ids são únicos e resolvíveis", () => {
  const ids = TONE_TRANSFER_TASKS.map((task) => task.id);
  assert.equal(new Set(ids).size, ids.length, "id repetido");
  for (const id of ids) assert.equal(toneTransferTaskById(id).id, id);
});

it("id desconhecido falha fechado em vez de devolver tarefa vazia", () => {
  assert.throws(() => toneTransferTaskById("tt-nao-existe"), /Unknown tone transfer task/u);
});

it("toneTransferTasksForLesson devolve só as tarefas daquela lição", () => {
  for (const task of TONE_TRANSFER_TASKS) {
    const forLesson = toneTransferTasksForLesson(task.lessonId);
    assert.ok(forLesson.some((entry) => entry.id === task.id));
    assert.ok(forLesson.every((entry) => entry.lessonId === task.lessonId));
  }
  assert.deepEqual(toneTransferTasksForLesson("lição-que-não-existe"), []);
});

// ── Alvos de conhecimento: o metadado é o que classifica ─────────────────────
it("todo alvo inclui concept:tone-system e os tons declarados", () => {
  for (const task of TONE_TRANSFER_TASKS) {
    const ids = toneTransferKnowledgeTargetIds(task);
    assert.ok(ids.includes("concept:tone-system"), task.id);
    for (const tone of task.tones) assert.ok(ids.includes(`concept:tone-${tone}`), `${task.id} tom ${tone}`);
  }
});

it("cada sandhi declarado vira um alvo de conhecimento próprio", () => {
  for (const task of TONE_TRANSFER_TASKS) {
    const ids = toneTransferKnowledgeTargetIds(task);
    for (const rule of task.sandhi ?? []) {
      assert.ok(ids.includes(TONE_SANDHI_TARGET_IDS[rule]), `${task.id} ${rule}`);
    }
  }
});

// ── Cobertura ────────────────────────────────────────────────────────────────
it("os quatro tons têm transferência", () => {
  assert.deepEqual(toneTransferToneCoverage(), [1, 2, 3, 4]);
});

it("os três sandhi têm transferência", () => {
  const coverage = toneTransferSandhiCoverage().sort();
  assert.deepEqual(coverage, ["bu", "third-third", "yi"]);
});

it("pelo menos 6 lições recebem transferência tonal", () => {
  const lessons = new Set(TONE_TRANSFER_TASKS.map((task) => task.lessonId));
  assert.ok(lessons.size >= 6, `apenas ${lessons.size}`);
});

it("pelo menos 4 tarefas acontecem em contexto de conversa", () => {
  const inConversation = TONE_TRANSFER_TASKS.filter((task) => task.context === "conversation");
  assert.ok(inConversation.length >= 4, `apenas ${inConversation.length}`);
});

// ── Materialização na Jornada ────────────────────────────────────────────────
it("registro e Jornada têm o mesmo número de passos — nunca uma segunda lista", () => {
  assert.equal(materializedToneTransferSteps().length, TONE_TRANSFER_TASKS.length);
});

it("toda tarefa de conversa entra logo depois da cena que ela diz retomar", () => {
  const steps = materializedToneTransferSteps();
  for (const task of TONE_TRANSFER_TASKS.filter((entry) => entry.context === "conversation")) {
    const placed = steps.find(
      (entry) => entry.lesson.id === task.lessonId && entry.step.title === task.titlePt
    );
    assert.ok(placed, `${task.id} não materializada`);
    assert.equal(placed.previous?.kind, "conversation_scene", task.id);
    assert.equal(placed.previous?.sceneId, task.sceneId, task.id);
  }
});

it("o motor é o que já existia: free_production, sem StepKind novo", () => {
  for (const entry of materializedToneTransferSteps()) {
    assert.equal(entry.step.kind, "free_production", entry.lesson.id);
  }
});

it("TRANSFER não mostra a resposta: sem opções, sem banco, sem dica", () => {
  for (const { step, lesson } of materializedToneTransferSteps()) {
    assert.equal((step.options ?? []).length, 0, lesson.id);
    assert.equal((step.bank ?? []).length, 0, lesson.id);
    assert.equal((step.wordBank ?? []).length, 0, lesson.id);
    assert.equal(step.isNoHint, true, lesson.id);
    assert.equal(step.helpMode, "disabled", lesson.id);
  }
});

it("a situação nunca mostra hànzì — senão seria cópia, não produção", () => {
  const cjk = /[㐀-鿿]/u;
  for (const { step, lesson } of materializedToneTransferSteps()) {
    assert.ok(step.situationPt, lesson.id);
    assert.equal(cjk.test(step.situationPt), false, `${lesson.id}: ${step.situationPt}`);
  }
});

it("a resposta modelo tem hànzì e aceita a variante com ponto final", () => {
  const cjk = /[㐀-鿿]/u;
  for (const task of TONE_TRANSFER_TASKS) {
    assert.ok(cjk.test(task.targetHanzi), task.id);
    const placed = materializedToneTransferSteps().find(
      (entry) => entry.lesson.id === task.lessonId && entry.step.title === task.titlePt
    );
    assert.ok(placed.step.accepts.includes(task.targetHanzi), task.id);
  }
});

// ── Honestidade de fala ──────────────────────────────────────────────────────
it("todo lembrete tonal declara que o app confere sílabas, não tom", () => {
  for (const task of TONE_TRANSFER_TASKS) {
    assert.match(task.toneReminderPt, /confere as sílabas, não o tom/u, task.id);
    assert.match(task.toneReminderEn, /checks the syllables, not the tone/u, task.id);
  }
});

it("nenhum lembrete afirma que o tom do aluno saiu certo", () => {
  const claim = /\bseu tom\b|\btom\s+(?:correto|certo|errado)\b|\byour tone\s+(?:is|was)\b/iu;
  for (const task of TONE_TRANSFER_TASKS) {
    assert.equal(claim.test(task.toneReminderPt), false, task.id);
    assert.equal(claim.test(task.toneReminderEn), false, task.id);
  }
});

it("o lembrete vai para explanation — depois da tentativa, não antes", () => {
  for (const task of TONE_TRANSFER_TASKS) {
    const placed = materializedToneTransferSteps().find(
      (entry) => entry.lesson.id === task.lessonId && entry.step.title === task.titlePt
    );
    assert.equal(placed.step.explanation, task.toneReminderPt, task.id);
    assert.equal(placed.step.situationPt.includes(task.toneReminderPt), false, task.id);
  }
});

// ── Classificação semântica (a troca que a RC2.2.7 fez) ──────────────────────
it("degrau TRANSFER com alvo tonal classifica como transferência tonal", () => {
  assert.equal(
    classifiesAsToneTransfer({
      pedagogicalEvidence: { rung: "TRANSFER", knowledgeTargetIds: ["concept:tone-2"] },
    }),
    true
  );
});

it("a palavra “transferência” na copy não basta mais — só o metadado conta", () => {
  assert.equal(
    classifiesAsToneTransfer({
      title: "Transfer de tom",
      body: "Esta é uma transferência tonal",
      pedagogicalEvidence: { rung: "PRODUCTION", knowledgeTargetIds: ["concept:tone-1"] },
    }),
    false
  );
});

it("TRANSFER sem alvo tonal não vira transferência tonal", () => {
  assert.equal(
    classifiesAsToneTransfer({
      pedagogicalEvidence: { rung: "TRANSFER", knowledgeTargetIds: ["chunk:nihao"] },
    }),
    false
  );
});

it("o id de sandhi sozinho não classifica: o tom concreto precisa estar lá", () => {
  assert.equal(
    classifiesAsToneTransfer({
      pedagogicalEvidence: {
        rung: "TRANSFER",
        knowledgeTargetIds: ["concept:tone-sandhi-bu"],
      },
    }),
    false
  );
});

// ── Alcançabilidade em runtime ───────────────────────────────────────────────

/** Níveis de maestria (0–3) em que o planner realmente inclui cada tarefa. */
function playedLevels() {
  const byTitle = new Map(TONE_TRANSFER_TASKS.map((task) => [task.titlePt, task]));
  const result = new Map(TONE_TRANSFER_TASKS.map((task) => [task.id, new Set()]));
  for (const lessonId of new Set(TONE_TRANSFER_TASKS.map((task) => task.lessonId))) {
    const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
    for (const masteryLevel of [0, 1, 2, 3]) {
      let plan = [];
      try {
        plan = lessonRoundStepsFor(lesson, { masteryLevel, silent: true }) ?? [];
      } catch {
        plan = [];
      }
      for (const step of plan) {
        const task = byTitle.get(step.title);
        if (task && task.lessonId === lessonId) result.get(task.id).add(masteryLevel);
      }
    }
  }
  return result;
}

it("toda tarefa registrada é jogada em alguma passada — nada de conteúdo morto", () => {
  const levels = playedLevels();
  const dead = [...levels].filter(([, set]) => set.size === 0).map(([id]) => id);
  assert.deepEqual(dead, [], `nunca jogadas: ${dead.join(", ")}`);
});

it("a contagem que vale é a JOGADA, e ela cumpre os mínimos", () => {
  const levels = playedLevels();
  const played = TONE_TRANSFER_TASKS.filter((task) => levels.get(task.id).size > 0);
  assert.ok(played.length >= 12, `apenas ${played.length} jogadas`);
  assert.ok(new Set(played.map((task) => task.lessonId)).size >= 6);
  assert.ok(played.filter((task) => task.context === "conversation").length >= 4);
});

it("transferência não é cobrada na primeira passada — é o degrau mais alto", () => {
  // `applyMasteryPassToPlan` penaliza produção/transferência em `pass <= 1`.
  // Exigir transferência logo na estreia contradiria a espinha de apoio, então
  // aqui o esperado é justamente que a maioria só apareça nas passadas tardias.
  const levels = playedLevels();
  const lateOnly = TONE_TRANSFER_TASKS.filter((task) => {
    const set = levels.get(task.id);
    return set.size > 0 && !set.has(0);
  });
  assert.ok(lateOnly.length > 0, "nenhuma tarefa respeita o adiamento do degrau TRANSFER");
});

// ── Ensinar antes de cobrar ──────────────────────────────────────────────────
it("nenhuma tarefa cobra uma frase antes de a Jornada tê-la apresentado", () => {
  const cjk = /[㐀-鿿]/u;
  for (const task of TONE_TRANSFER_TASKS) {
    const lessonIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === task.lessonId);
    assert.ok(lessonIndex >= 0, task.id);

    let taught = false;
    for (let index = 0; index <= lessonIndex && !taught; index += 1) {
      const lesson = ALL_LESSONS[index];
      const steps = lesson.steps ?? [];
      const limit =
        index === lessonIndex
          ? steps.findIndex((step) => step.title === task.titlePt)
          : steps.length;
      for (let position = 0; position < (limit < 0 ? steps.length : limit); position += 1) {
        const step = steps[position];
        const surface = [step.text, step.hanzi, step.correctAnswer, step.answer, ...(step.options ?? [])]
          .filter((value) => typeof value === "string" && cjk.test(value))
          .join(" ");
        if (surface.includes(task.targetHanzi.replace(/[。？]/gu, ""))) {
          taught = true;
          break;
        }
      }
    }
    assert.ok(taught, `${task.id}: ${task.targetHanzi} cobrado sem exposição anterior`);
  }
});

const failed = cases.filter((entry) => !entry.ok);
console.log(JSON.stringify({ total: cases.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
else console.log(`PASS test:tone-transfer (${cases.length} casos)`);
