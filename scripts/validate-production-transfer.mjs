/**
 * validate:production-transfer — portão da onda pedagógica 2.
 *
 * A onda 1 provou VARIEDADE. Esta prova que o aluno é cobrado sem apoio:
 *
 *  1. produção livre não pode ter alternativa, banco de peças nem hànzì no
 *     enunciado — se tiver, virou reconhecimento com outro nome;
 *  2. a frase alvo da TRANSFERÊNCIA não pode existir no currículo (nem como
 *     chunk, nem como microfrase, nem em passo autoral). Se existir, o aluno
 *     pode ter decorado, e o exercício não prova estrutura nenhuma;
 *  3. o reparo conversacional precisa oferecer estratégias distintas e uma
 *     fala de recuperação que o aluno consiga escrever com o que já viu;
 *  4. nada é gerado com glifo que o aluno ainda não encontrou;
 *  5. os motores precisam aparecer no PLANO REAL de uma fração mínima das
 *     lições — declarar motor que nunca roda não vale;
 *  6. objetivo comunicativo com mais de uma estrutura precisa ACEITAR as duas
 *     frases: se 我要茶 e 我想喝茶 não valem as duas, o objetivo é decorativo;
 *  7. produção ABERTA precisa oferecer escolha real (3+ respostas certas) e
 *     nunca revelar uma resposta esperada no enunciado;
 *  8. a CONVERSA sem apoio (produce_reply) tem que existir de verdade no topo
 *     da escada de variantes — se a cena "independente" continua entregando
 *     alternativas, o nível é rótulo.
 *
 * Gera reports/production-transfer-report.md.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/production-transfer-report.md");
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

// Escapes explícitos: com os caracteres literais, U+F900 normaliza para U+8C48
// em NFC e a classe passa a aceitar Hangul e uso privado.
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()]/g;
const clean = (value) => String(value ?? "").replace(PUNCT_RE, "").trim();

// Fração mínima das 122 lições que precisa receber cada motor no plano real.
// A produção livre e a transferência são gerais; o reparo depende de o aluno
// já conhecer 请再说一遍 / 我听不懂 — vocabulário que só entra depois da
// metade do curso, e por isso o piso dele é menor de propósito.
const MIN_LESSON_SHARE = { free_production: 0.5, transfer_task: 0.6, conversation_repair: 0.15 };
// Produção aberta depende de o aluno já ter três formas de cumprir um mesmo
// objetivo, o que só acontece depois de o vocabulário crescer um pouco.
const MIN_OPEN_PRODUCTION_LESSONS = 0.2;
// Uma resposta certa não basta para chamar de escolha.
const MIN_OPEN_ANSWERS = 3;
// Aluno com histórico: é ele que alcança os níveis altos da variante, e só
// nesses níveis a conversa perde as alternativas.
const MIN_UNAIDED_CONVERSATION_LESSONS = 0.3;

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-production-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/data/productionTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/vocabulary.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo para validate:production-transfer.");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const { VOCABULARY } = load("src/data/vocabulary.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
  const {
    SENTENCE_FRAMES,
    FRAME_TASKS,
    REPAIR_SITUATIONS,
    REPAIR_STRATEGY_LABELS,
    CORPUS_SENTENCES,
    OPEN_PRODUCTION_GOALS,
    openProductionTasksFor,
  } = load("src/data/productionTasks.js");

  // ——— 1. Integridade do catálogo ———
  const vocabById = new Map(VOCABULARY.map((entry) => [entry.id, entry]));
  const chunkById = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));

  for (const frame of SENTENCE_FRAMES) {
    assert(Boolean(frame.goal), `${frame.id}: estrutura sem objetivo comunicativo`);
    assert(chunkById.has(frame.anchorChunkId), `${frame.id}: âncora inexistente no corpus (${frame.anchorChunkId})`);
    assert(frame.fillers.length > 0, `${frame.id}: frame sem peças`);
    assert(Array.isArray(frame.slots) && frame.slots.length > 0, `${frame.id}: frame sem scaffold de slots`);
    assert(
      frame.slots.some((slot) => slot.hole),
      `${frame.id}: scaffold sem buraco — a ordem não mostra o que preencher`
    );
    assert(!CJK_RE.test(frame.situationTemplatePt), `${frame.id}: o enunciado da situação mostra hànzì`);
    assert(frame.situationTemplatePt.includes("{item}"), `${frame.id}: situação sem o buraco {item}`);
    if (frame.quantifiers?.length) {
      assert(
        frame.situationTemplatePt.includes("{qty}"),
        `${frame.id}: frame com quantidade mas sem {qty} no enunciado`
      );
    }
    if (frame.timeFillers?.length) {
      assert(
        frame.prefix.startsWith("我"),
        `${frame.id}: timeFillers só fazem sentido com prefixo começando em 我 (sujeito → tempo → resto)`
      );
      assert(
        Boolean(frame.situationWithTimeTemplatePt?.includes("{time}")),
        `${frame.id}: timeFillers sem situationWithTimeTemplatePt com {time}`
      );
      for (const timeFiller of frame.timeFillers) {
        assert(vocabById.has(timeFiller.vocabId), `${frame.id}: tempo fora do corpus (${timeFiller.vocabId})`);
      }
    }
    for (const filler of frame.fillers) {
      assert(vocabById.has(filler.vocabId), `${frame.id}: peça fora do corpus (${filler.vocabId})`);
      assert(Boolean(filler.promptPt?.trim()), `${frame.id}/${filler.vocabId}: peça sem texto em português`);
    }
    for (const siblingId of frame.alsoAcceptFrameIds ?? []) {
      assert(
        SENTENCE_FRAMES.some((candidate) => candidate.id === siblingId),
        `${frame.id}: frase irmã inexistente (${siblingId})`
      );
    }
  }

  const taskIds = new Set();
  for (const task of FRAME_TASKS) {
    assert(!taskIds.has(task.id), `tarefa duplicada: ${task.id}`);
    taskIds.add(task.id);
    assert(CJK_RE.test(task.targetHanzi), `${task.id}: alvo sem hànzì`);
    assert(!CJK_RE.test(task.situationPt), `${task.id}: situação com hànzì (viraria cópia)`);
    assert(Boolean(task.targetPinyin.trim()), `${task.id}: alvo sem pinyin`);
    assert(Array.isArray(task.slots) && task.slots.length > 0, `${task.id}: tarefa sem scaffold de slots`);
    assert(
      task.isNovelCombination === !CORPUS_SENTENCES.has(clean(task.targetHanzi)),
      `${task.id}: rótulo de combinação inédita não bate com o corpus`
    );
    // Só a transferência mostra a âncora. Na produção livre a frase alvo PODE
    // ser a própria frase-âncora — produzir do zero o que antes vinha montado
    // continua sendo o exercício.
    if (task.isNovelCombination) {
      assert(
        clean(task.anchor.hanzi) !== clean(task.targetHanzi),
        `${task.id}: âncora igual ao alvo — não há o que transferir`
      );
    }
  }

  // (6) Objetivo com mais de uma estrutura tem que valer para as duas frases.
  // Um objetivo declarado que nunca faz duas realizações se aceitarem é só um
  // rótulo — e o aluno continua sendo punido por dizer certo de outro jeito.
  const framesByGoal = new Map();
  for (const frame of SENTENCE_FRAMES) {
    framesByGoal.set(frame.goal, [...(framesByGoal.get(frame.goal) ?? []), frame.id]);
  }
  for (const [goal, frameIds] of framesByGoal) {
    if (frameIds.length < 2) continue;
    const withSiblings = FRAME_TASKS.filter((task) => task.goal === goal && task.siblingAnswers.length > 0);
    assert(
      withSiblings.length > 0,
      `objetivo ${goal} tem ${frameIds.length} estruturas mas nenhuma tarefa aceita a frase irmã`
    );
    for (const task of withSiblings) {
      for (const sibling of task.siblingAnswers) {
        assert(
          task.accepts.some((value) => clean(value) === clean(sibling)),
          `${task.id}: frase irmã "${sibling}" listada mas não aceita`
        );
        assert(
          clean(sibling) !== clean(task.targetHanzi),
          `${task.id}: frase irmã igual ao próprio alvo`
        );
      }
    }
  }

  for (const situation of REPAIR_SITUATIONS) {
    assert(chunkById.has(situation.npcChunkId), `${situation.id}: fala do NPC fora do corpus`);
    assert(situation.correct.length > 0, `${situation.id}: reparo sem movimento correto`);
    const overlap = situation.correct.filter((move) =>
      situation.wrong.some((other) => other.strategy === move.strategy)
    );
    assert(overlap.length === 0, `${situation.id}: estratégia listada como certa e errada ao mesmo tempo`);
    for (const move of [...situation.correct, ...situation.wrong]) {
      assert(Boolean(REPAIR_STRATEGY_LABELS[move.strategy]), `${situation.id}: estratégia sem rótulo (${move.strategy})`);
      assert(Boolean(move.whyPt?.trim()), `${situation.id}/${move.strategy}: movimento sem justificativa`);
      if (move.chunkId) {
        assert(chunkById.has(move.chunkId), `${situation.id}/${move.strategy}: fala fora do corpus (${move.chunkId})`);
      }
    }
  }

  // ——— 2. Currículo: o que a jornada realmente mostra ao aluno ———
  const authoredSentences = new Set();
  const curriculumGlyphs = new Set();
  for (const lesson of ALL_LESSONS) {
    for (const step of lesson.steps) {
      const texts = [
        step.hanzi,
        step.text,
        step.answer,
        step.correctAnswer,
        step.audioText,
        step.sourceText,
        step.target?.join(""),
        step.targetParts?.join(""),
        ...(step.options ?? []),
        ...(step.lines ?? []).map((line) => line.hanzi),
        ...(step.nodes ?? []).flatMap((node) => [node.hanzi, node.interaction?.correctAnswer, ...(node.interaction?.options ?? [])]),
        step.checkpoint?.correctAnswer,
        ...(step.checkpoint?.options ?? []),
      ];
      for (const text of texts) {
        const value = clean(text);
        if (value && CJK_RE.test(value)) authoredSentences.add(value);
      }
    }
  }

  // ——— 3. Planos reais ———
  const counts = { free_production: 0, transfer_task: 0, conversation_repair: 0 };
  const lessonsWith = {
    free_production: new Set(),
    transfer_task: new Set(),
    conversation_repair: new Set(),
  };
  const framesSeen = new Set();
  const openGoalsSeen = new Set();
  const lessonsWithOpen = new Set();
  const lessonsWithUnaidedConversation = new Set();
  let unaidedReplies = 0;
  const strategiesSeen = new Set();
  const novelTargets = new Set();
  let stepsAudited = 0;

  const charById = new Map(load("src/data/characters.js").CHARACTERS.map((char) => [char.id, char]));
  const lessonGlyphs = (lesson) => {
    const glyphs = new Set();
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      const [type, id] = String(ref).split(":");
      const source = type === "chunk" ? chunkById.get(id) : type === "char" ? charById.get(id) : null;
      if (source) for (const glyph of clean(source.hanzi)) glyphs.add(glyph);
    }
    for (const step of lesson.steps) {
      const texts = [
        step.hanzi,
        step.text,
        step.answer,
        step.correctAnswer,
        step.audioText,
        step.blankAnswer,
        step.sentenceBefore,
        step.sentenceAfter,
        step.targetHanzi,
        step.target?.join(""),
        step.targetParts?.join(""),
        ...(step.options ?? []),
        ...(step.bank ?? []),
        ...(step.lines ?? []).map((line) => line.hanzi),
        ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
        ...(step.nodes ?? []).map((node) => node.hanzi),
      ];
      for (const text of texts) {
        for (const glyph of clean(text)) if (CJK_RE.test(glyph)) glyphs.add(glyph);
      }
    }
    return glyphs;
  };

  // Núcleo sempre disponível (CORE_REVIEW_REFS em lessonTasks): a jornada trata
  // este punhado de frases como repertório permanente do aluno, independente da
  // posição da lição. O gerador enxerga esses glifos desde o começo, então o
  // portão precisa medir contra o mesmo contrato — senão reprovaria uma decisão
  // de currículo que é anterior a estes motores.
  const CORE_REVIEW_CHUNK_IDS = [
    "nihao",
    "wohenhao",
    "xiexie",
    "zaijian",
    "wojiao",
    "wobuhui",
    "nijiaoshenme",
    "woxianghe",
    "mingtianjian",
    "nihaoma",
    "jintianhenhao",
    "zheshishui",
    "nashirenm",
  ];
  for (const id of CORE_REVIEW_CHUNK_IDS) {
    const chunk = chunkById.get(id);
    if (chunk) for (const glyph of clean(chunk.hanzi)) curriculumGlyphs.add(glyph);
  }

  // Histórico simulado de um aluno que já completou bastante conversa: é o que
  // faz a variante subir para independent/audio_first. Sem isto o portão só
  // veria a experiência de quem abriu o app hoje.
  const veteranHistory = Array.from({ length: 14 }, (_, index) => ({
    sceneId: `history-scene-${index}`,
    intent: `history-intent-${index}`,
    result: "completed",
  }));

  for (const lesson of ALL_LESSONS) {
    // O glifo só é "conhecido" pelo currículo percorrido até esta lição
    // (inclusive) — a mesma regra que o gerador aplica em knownGlyphsFor.
    for (const glyph of lessonGlyphs(lesson)) curriculumGlyphs.add(glyph);
    const knownSoFar = new Set(curriculumGlyphs);

    // A conversa sem apoio só aparece para o aluno veterano; auditar o plano
    // dele é a única forma de saber se o topo da escada existe.
    for (const step of lessonRoundStepsFor(lesson, { conversationHistory: veteranHistory, silent: true })) {
      if (step.kind !== "conversation_scene") continue;
      for (const node of step.nodes ?? []) {
        const interaction = node.interaction;
        if (interaction?.type !== "produce_reply") continue;
        unaidedReplies += 1;
        lessonsWithUnaidedConversation.add(lesson.id);
        const ref = `${lesson.id}/${step.sceneId}/${node.id}`;
        assert((interaction.options ?? []).length === 0, `${ref}: conversa sem apoio ainda mostra alternativas`);
        assert(
          (interaction.accepts ?? []).some((value) => CJK_RE.test(value ?? "")),
          `${ref}: conversa sem apoio sem resposta aceita em hànzì`
        );
        assert(Boolean(interaction.wrongNextNodeId), `${ref}: conversa sem apoio sem ramo de erro`);
        for (const glyph of clean(interaction.correctAnswer)) {
          if (!CJK_RE.test(glyph)) continue;
          assert(knownSoFar.has(glyph), `${ref}: pede o glifo "${glyph}" antes de a jornada apresentá-lo`);
        }
      }
    }

    for (const attemptNumber of [0, 1, 2]) {
      const plan = lessonRoundStepsFor(lesson, { attemptNumber, silent: true });
      for (const step of plan) {
        if (!(step.kind in counts)) continue;
        counts[step.kind] += 1;
        lessonsWith[step.kind].add(lesson.id);
        stepsAudited += 1;

        const ref = `${lesson.id}/${attemptNumber}/${step.kind}`;
        const validation = validateExercise(step);
        assert(validation.valid, `${ref}: ${validation.errors.join("; ")}`);

        const answer = step.correctAnswer ?? step.answer ?? "";
        // (1) Nenhum apoio na tela.
        assert((step.options ?? []).length === 0, `${ref}: ofereceu alternativas`);
        assert((step.bank ?? []).length === 0, `${ref}: ofereceu banco de peças`);
        assert((step.targetParts ?? []).length === 0, `${ref}: entregou a frase em peças`);

        if (step.kind === "conversation_repair") {
          strategiesSeen.add(step.repairStrategy);
          const options = step.repairStrategyOptions ?? [];
          assert(options.length >= 3, `${ref}: menos de 3 estratégias`);
          assert(options.includes(step.repairStrategy), `${ref}: estratégia correta fora das opções`);
          // A certa não pode ficar sempre no mesmo lugar.
          continue;
        }

        if (step.productionFrameId) framesSeen.add(step.productionFrameId);
        assert(Boolean(step.situationPt?.trim()), `${ref}: sem situação em português`);
        assert(!CJK_RE.test(step.situationPt ?? ""), `${ref}: situação com hànzì`);

        // (7) Produção aberta: escolha real e nada de alvo escondido no texto.
        if (step.productionOpen) {
          openGoalsSeen.add(step.productionGoal);
          lessonsWithOpen.add(lesson.id);
          const distinct = new Set(
            (step.accepts ?? []).filter((value) => CJK_RE.test(value ?? "")).map((value) => clean(value))
          );
          assert(
            distinct.size >= MIN_OPEN_ANSWERS,
            `${ref}: produção aberta com só ${distinct.size} resposta(s) certa(s) — mínimo ${MIN_OPEN_ANSWERS}`
          );
          assert(Boolean(step.productionGoal), `${ref}: produção aberta sem objetivo`);
          assert(
            !CJK_RE.test(step.productionHintPt ?? ""),
            `${ref}: a dica da produção aberta mostra hànzì`
          );
          assert(
            (step.productionExamples ?? []).length >= MIN_OPEN_ANSWERS,
            `${ref}: produção aberta sem exemplos para a correção`
          );
          // O aluno escolhe o conteúdo: o enunciado não pode nomear um item só.
          assert(!step.productionFrameId, `${ref}: produção aberta presa a uma estrutura única`);
        }

        if (step.kind === "transfer_task") {
          const target = clean(answer);
          novelTargets.add(target);
          // (2) O coração do motor: a frase alvo não pode ser ensinada.
          assert(!CORPUS_SENTENCES.has(target), `${ref}: alvo "${answer}" já é frase do corpus`);
          assert(!authoredSentences.has(target), `${ref}: alvo "${answer}" já aparece num passo autoral`);
          assert(
            clean(step.transferAnchorHanzi) !== target,
            `${ref}: âncora igual ao alvo`
          );
        }

        // (4) Nada exige glifo que o currículo ainda não apresentou. Na
        // produção aberta a checagem vale para TODAS as respostas aceitas —
        // qualquer uma delas é uma frase que o aluno pode legitimamente
        // escolher escrever.
        const gated = step.productionOpen
          ? [...new Set((step.accepts ?? []).filter((value) => CJK_RE.test(value ?? "")))]
          : [answer];
        for (const sentence of gated) {
          for (const glyph of clean(sentence)) {
            if (!CJK_RE.test(glyph)) continue;
            assert(knownSoFar.has(glyph), `${ref}: cobra o glifo "${glyph}" antes de a jornada apresentá-lo`);
          }
        }
      }
    }
  }

  // (5) Presença real no plano.
  for (const [kind, share] of Object.entries(MIN_LESSON_SHARE)) {
    const minimum = Math.floor(ALL_LESSONS.length * share);
    assert(
      lessonsWith[kind].size >= minimum,
      `${kind}: só ${lessonsWith[kind].size}/${ALL_LESSONS.length} lições (mínimo ${minimum})`
    );
  }
  for (const frame of SENTENCE_FRAMES) {
    const reachable = FRAME_TASKS.some((task) => task.frameId === frame.id);
    assert(reachable, `${frame.id}: frame não gera nenhuma tarefa`);
  }
  assert(framesSeen.size >= 5, `só ${framesSeen.size} estruturas diferentes chegaram ao plano real (mínimo 5)`);
  const minOpenLessons = Math.floor(ALL_LESSONS.length * MIN_OPEN_PRODUCTION_LESSONS);
  assert(
    lessonsWithOpen.size >= minOpenLessons,
    `produção aberta em só ${lessonsWithOpen.size}/${ALL_LESSONS.length} lições (mínimo ${minOpenLessons})`
  );
  assert(
    openGoalsSeen.size >= 4,
    `só ${openGoalsSeen.size} objetivo(s) de produção aberta no plano real (mínimo 4)`
  );
  for (const copy of OPEN_PRODUCTION_GOALS) {
    assert(!CJK_RE.test(copy.situationPt), `${copy.goal}: situação aberta mostra hànzì`);
    assert(copy.situationPt.trim().length > 0, `${copy.goal}: situação aberta vazia`);
  }
  const minUnaidedLessons = Math.floor(ALL_LESSONS.length * MIN_UNAIDED_CONVERSATION_LESSONS);
  assert(
    lessonsWithUnaidedConversation.size >= minUnaidedLessons,
    `conversa sem apoio em só ${lessonsWithUnaidedConversation.size}/${ALL_LESSONS.length} lições (mínimo ${minUnaidedLessons})`
  );
  assert(strategiesSeen.size >= 2, `só ${strategiesSeen.size} estratégia(s) de reparo no plano real (mínimo 2)`);

  const lines = [
    "# Relatório de produção, transferência e reparo (plano real)",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "## Resumo",
    "",
    "| Indicador | Valor |",
    "|-----------|------:|",
    `| Estruturas (frames) declaradas | ${SENTENCE_FRAMES.length} |`,
    `| Tarefas geradas pelos frames | ${FRAME_TASKS.length} |`,
    `| — produção (frase já ensinada) | ${FRAME_TASKS.filter((task) => !task.isNovelCombination).length} |`,
    `| — transferência (combinação inédita) | ${FRAME_TASKS.filter((task) => task.isNovelCombination).length} |`,
    `| Objetivos comunicativos | ${framesByGoal.size} |`,
    `| Tarefas que aceitam frase irmã | ${FRAME_TASKS.filter((task) => task.siblingAnswers.length > 0).length} |`,
    `| Objetivos de produção aberta declarados | ${OPEN_PRODUCTION_GOALS.length} |`,
    `| Objetivos de produção aberta no plano real | ${openGoalsSeen.size} |`,
    `| Lições com produção aberta | ${lessonsWithOpen.size} / ${ALL_LESSONS.length} |`,
    `| Falas de conversa sem apoio (aluno veterano) | ${unaidedReplies} |`,
    `| Lições com conversa sem apoio | ${lessonsWithUnaidedConversation.size} / ${ALL_LESSONS.length} |`,
    `| Situações de reparo | ${REPAIR_SITUATIONS.length} |`,
    `| Passos auditados no plano real (3 tentativas) | ${stepsAudited} |`,
    `| Lições com produção livre | ${lessonsWith.free_production.size} / ${ALL_LESSONS.length} |`,
    `| Lições com transferência | ${lessonsWith.transfer_task.size} / ${ALL_LESSONS.length} |`,
    `| Lições com reparo conversacional | ${lessonsWith.conversation_repair.size} / ${ALL_LESSONS.length} |`,
    `| Estruturas diferentes no plano real | ${framesSeen.size} |`,
    `| Frases inéditas cobradas | ${novelTargets.size} |`,
    "",
    "> Uma frase só entra como **transferência** quando não existe em `chunks.ts`,",
    "> em `vocabulary.ts` nem em nenhum passo autoral da jornada. Se o aluno acerta,",
    "> ele aplicou a estrutura — não pode ter decorado, porque nunca a viu pronta.",
    "",
    "## Frases inéditas cobradas por transferência",
    "",
  ];
  for (const target of [...novelTargets].sort().slice(0, 60)) lines.push(`- ${target}`);
  if (novelTargets.size > 60) lines.push(`- …mais ${novelTargets.size - 60}.`);
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (failures.length > 0) {
    console.error(`\nvalidate:production-transfer encontrou ${failures.length} problema(s):`);
    for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
    if (failures.length > 40) console.error(`...mais ${failures.length - 40}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:production-transfer passou (${SENTENCE_FRAMES.length} estruturas · ${FRAME_TASKS.length} tarefas · ${novelTargets.size} frases inéditas · ${stepsAudited} passos no plano real).`
    );
    console.log(
      `     lições: produção ${lessonsWith.free_production.size} · transferência ${lessonsWith.transfer_task.size} · reparo ${lessonsWith.conversation_repair.size} · aberta ${lessonsWithOpen.size}.`
    );
    console.log(
      `     objetivos: ${framesByGoal.size} declarados · ${openGoalsSeen.size} abertos no plano · ${FRAME_TASKS.filter((task) => task.siblingAnswers.length > 0).length} tarefas com frase irmã.`
    );
    console.log(
      `     conversa sem apoio: ${unaidedReplies} falas em ${lessonsWithUnaidedConversation.size} lições.`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
