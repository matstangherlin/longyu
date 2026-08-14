/**
 * V3.9 · TEST-004 — Integridade de conteúdo da revisão.
 *
 * Bug de origem (QA em Android real): um card de revisão exibiu
 *
 *     明天见 · nǐ hǎo · Até amanhã.
 *
 * ou seja, hànzì e significado de um item com o pinyin de OUTRO. O banco está
 * correto (`chunk:mingtianjian` = "míngtiān jiàn"), então a corrupção nascia na
 * montagem do registro de erro, que juntava campos de fontes diferentes.
 *
 * Este validador percorre TODOS os passos da jornada, resolve a identidade
 * lexical exatamente como o runtime resolve e falha se qualquer combinação
 * hànzì ↔ pinyin ↔ significado não pertencer à mesma unidade lexical.
 *
 * Roda: npm run validate:review-content-integrity
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-review-integrity-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/features/lesson/errorLexicalIdentity.ts",
      "src/features/revisao/reviewExerciseBuilder.ts",
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
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("falha ao compilar as fontes da jornada");

  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const lexical = require(path.join(outDir, "src/features/lesson/errorLexicalIdentity.js"));
  const { CHUNKS } = require(path.join(outDir, "src/data/chunks.js"));
  const { CHARACTERS } = require(path.join(outDir, "src/data/characters.js"));

  const { resolveLexicalIdentity, isCoherentPinyin, normalizeHanzi, normalizePinyin } = lexical;

  // ---------------------------------------------------------------------
  // 0. O banco em si tem de ser coerente — é a fonte da verdade dos cards.
  // ---------------------------------------------------------------------
  const chunkByText = new Map();
  for (const chunk of CHUNKS) {
    const key = normalizeHanzi(chunk.hanzi);
    const previous = chunkByText.get(key);
    if (previous && normalizePinyin(previous.pinyin) !== normalizePinyin(chunk.pinyin)) {
      fail(
        `CHUNKS divergem para "${chunk.hanzi}": ${previous.id}="${previous.pinyin}" vs ` +
          `${chunk.id}="${chunk.pinyin}" — a revisão não teria como escolher.`
      );
    }
    if (!previous) chunkByText.set(key, chunk);
  }

  // Sentinela explícita do bug reproduzido em aparelho real.
  const mingtianjian = CHUNKS.find((chunk) => chunk.id === "mingtianjian");
  if (!mingtianjian) {
    fail("chunk:mingtianjian sumiu — a sentinela do bug 明天见 → nǐ hǎo não pode ser verificada.");
  } else {
    const identity = resolveLexicalIdentity(mingtianjian.hanzi);
    if (normalizePinyin(identity?.pinyin ?? "") !== normalizePinyin("míngtiān jiàn")) {
      fail(`SENTINELA: 明天见 resolveu pinyin "${identity?.pinyin}" — esperado "míngtiān jiàn".`);
    }
    if (isCoherentPinyin("明天见", "nǐ hǎo")) {
      fail("SENTINELA: 明天见 aceitou o pinyin de 你好 — o bug P0-001 voltou.");
    }
  }

  // ---------------------------------------------------------------------
  // 1. Toda glosa declarada num passo tem de descrever o hànzì que acompanha.
  //    É exatamente aqui que nascia o par corrompido.
  // ---------------------------------------------------------------------
  const lessons = ALL_LESSONS.map((lesson) => ({ unit: { id: lesson.unitId }, lesson }));
  if (lessons.length === 0) fail("nenhuma lição encontrada — validador cego.");

  let checkedGlosses = 0;
  let checkedSteps = 0;

  const glossesForStep = (step) => {
    const pairs = [
      { owner: step.hanzi ?? step.text, pinyin: step.pinyin, meaning: step.pt, field: "step.pinyin" },
      { owner: step.sourceText, pinyin: step.sourcePinyin, meaning: step.sourceMeaning, field: "step.sourcePinyin" },
      { owner: step.targetHanzi, pinyin: step.targetPinyin, meaning: step.targetMeaningPt, field: "step.targetPinyin" },
    ];
    for (const line of step.lines ?? []) {
      pairs.push({ owner: line.hanzi, pinyin: line.pinyin, meaning: line.pt, field: "line.pinyin" });
    }
    return pairs;
  };

  for (const { unit, lesson } of lessons) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      checkedSteps += 1;
      const where = `${unit.id}/${lesson.id} passo ${index} (${step.kind})`;

      for (const gloss of glossesForStep(step)) {
        if (!gloss.owner || !gloss.pinyin) continue;
        if (!lexical.isSingleTarget(gloss.owner)) continue;
        checkedGlosses += 1;
        if (!isCoherentPinyin(gloss.owner, gloss.pinyin)) {
          const expected = resolveLexicalIdentity(gloss.owner)?.pinyin;
          fail(
            `${where}: ${gloss.field}="${gloss.pinyin}" não pertence a "${gloss.owner}" ` +
              `(banco diz "${expected}").`
          );
        }
      }

      // -------------------------------------------------------------------
      // 2. A identidade que o card de erro usaria: hànzì, pinyin e significado
      //    têm de sair da MESMA unidade.
      // -------------------------------------------------------------------
      const target =
        step.hanzi ??
        (typeof step.correctAnswer === "string" ? step.correctAnswer : undefined) ??
        step.answer ??
        step.blankAnswer;
      if (!target || !lexical.isSingleTarget(target)) continue;
      if (normalizeHanzi(target).length === 0) continue;
      if (!/[\u4e00-\u9fff]/u.test(target)) continue;

      const identity = resolveLexicalIdentity(target, [
        { ownerHanzi: step.hanzi ?? step.text, pinyin: step.pinyin, meaningPt: step.pt },
        { ownerHanzi: step.sourceText, pinyin: step.sourcePinyin, meaningPt: step.sourceMeaning },
      ]);
      if (!identity) {
        fail(`${where}: alvo "${target}" não resolveu identidade lexical alguma.`);
        continue;
      }
      if (!isCoherentPinyin(identity.hanzi, identity.pinyin)) {
        fail(
          `${where}: card montaria "${identity.hanzi}" com pinyin "${identity.pinyin}" — ` +
            `unidades diferentes (P0-001).`
        );
      }

      const canonicalChunk = chunkByText.get(normalizeHanzi(identity.hanzi));
      if (canonicalChunk) {
        if (identity.pinyin && normalizePinyin(identity.pinyin) !== normalizePinyin(canonicalChunk.pinyin)) {
          fail(
            `${where}: "${identity.hanzi}" recebeu pinyin "${identity.pinyin}" mas ` +
              `${canonicalChunk.id} define "${canonicalChunk.pinyin}".`
          );
        }
        if (identity.meaningPt && identity.meaningPt !== canonicalChunk.meaningPt) {
          fail(
            `${where}: "${identity.hanzi}" recebeu significado "${identity.meaningPt}" mas ` +
              `${canonicalChunk.id} define "${canonicalChunk.meaningPt}".`
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // 3. Peças de montagem (P0-005): as peças corretas têm de reconstruir o
  //    alvo — nenhuma peça pode vazar de outro exercício.
  // ---------------------------------------------------------------------
  let checkedPieces = 0;
  for (const { unit, lesson } of lessons) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      const target = step.target ?? step.targetParts;
      if (!Array.isArray(target) || target.length === 0) continue;
      const bank = step.bank ?? step.distractors;
      if (!Array.isArray(bank) || bank.length === 0) continue;
      checkedPieces += 1;
      const where = `${unit.id}/${lesson.id} passo ${index} (${step.kind})`;
      const missing = target.filter((piece) => !bank.includes(piece));
      if (missing.length > 0) {
        fail(`${where}: peças do alvo ausentes do banco: ${missing.join(", ")} (P0-005).`);
      }
      const joined = target.join("");
      const expectedHanzi = step.hanzi ?? step.correctAnswer;
      // `hanzi_build` monta um caractere a partir dos COMPONENTES (\u65e5+\u6708 = \u660e):
      // a concatena\u00e7\u00e3o n\u00e3o deve bater com o alvo, por defini\u00e7\u00e3o.
      const buildsFromComponents = step.kind === "hanzi_build" || step.kind === "compose";
      if (
        !buildsFromComponents &&
        expectedHanzi &&
        /[\u4e00-\u9fff]/u.test(expectedHanzi) &&
        lexical.isSingleTarget(expectedHanzi)
      ) {
        if (normalizeHanzi(joined) !== normalizeHanzi(expectedHanzi)) {
          fail(
            `${where}: peças montam "${joined}" mas o alvo declarado é "${expectedHanzi}" (P0-005).`
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // 4. TEST-004 — gerar TODAS as questões de revisão possíveis e validar cada
  //    card montado. É aqui que "明天见 → nǐ hǎo" tem de ser impossível.
  // ---------------------------------------------------------------------
  const builder = require(path.join(outDir, "src/features/revisao/reviewExerciseBuilder.js"));
  const { newItem } = require(path.join(outDir, "src/lib/srs.js"));
  const { RADICALS } = require(path.join(outDir, "src/data/radicals.js"));

  const DOMAINS = ["som", "pinyin", "forma", "significado", "uso", "leitura", "fala"];
  const seeds = [
    ...CHUNKS.map((chunk) => ({ type: "chunk", itemId: chunk.id })),
    ...CHARACTERS.map((char) => ({ type: "char", itemId: char.id })),
    ...RADICALS.map((radical) => ({ type: "radical", itemId: radical.id })),
  ];
  const learnedItems = seeds.map((seed) => newItem(seed.type, seed.itemId, { track: "fala" }));

  let builtCards = 0;
  const cardFailures = new Set();
  const noteCard = (message) => cardFailures.add(message);

  const checkCard = (exercise, where) => {
    if (!exercise) return;
    builtCards += 1;
    const entity = exercise.entity ?? {};

    // hanzi ↔ pinyin: o par mais crítico. Nunca de unidades diferentes.
    if (entity.hanzi && entity.pinyin && !isCoherentPinyin(entity.hanzi, entity.pinyin)) {
      noteCard(
        `${where}: card "${entity.hanzi}" exibiria pinyin "${entity.pinyin}" — ` +
          `banco diz "${canonicalIdentityOf(entity.hanzi)}" (P0-001).`
      );
    }

    // hanzi ↔ significado.
    const canonicalChunk = entity.hanzi ? chunkByText.get(normalizeHanzi(entity.hanzi)) : undefined;
    if (canonicalChunk && entity.meaningPt && entity.meaningPt !== canonicalChunk.meaningPt) {
      noteCard(
        `${where}: card "${entity.hanzi}" exibiria significado "${entity.meaningPt}" mas ` +
          `${canonicalChunk.id} define "${canonicalChunk.meaningPt}".`
      );
    }

    // answer ∈ options — resposta correta tem de estar entre as alternativas.
    if (Array.isArray(exercise.options) && exercise.options.length > 0) {
      const values = exercise.options.map((option) => option.value);
      if (!values.includes(exercise.answer)) {
        noteCard(`${where}: resposta "${exercise.answer}" não está entre as opções [${values.join(" | ")}].`);
      }
    }

    // pieces ↔ target — nenhuma peça de outro exercício pode vazar (P0-005).
    if (Array.isArray(exercise.pieces) && Array.isArray(exercise.targetValues)) {
      const pieces = exercise.pieces.map((piece) => piece.value);
      const missing = exercise.targetValues.filter(
        (value) => pieces.filter((piece) => piece === value).length <
          exercise.targetValues.filter((other) => other === value).length
      );
      if (missing.length > 0) {
        noteCard(`${where}: peças não cobrem o alvo — faltam ${missing.join(", ")} (P0-005).`);
      }
      if (exercise.targetValues.join("") && exercise.answer) {
        const assembled = normalizeHanzi(exercise.targetValues.join(""));
        const expected = normalizeHanzi(exercise.answer);
        if (assembled && expected && assembled !== expected && /[一-鿿]/u.test(expected)) {
          noteCard(`${where}: peças montam "${assembled}" mas a resposta é "${expected}" (P0-005).`);
        }
      }
    }

    // audioText ↔ answer: o áudio não pode falar outro item.
    if (exercise.audioText && entity.hanzi) {
      const spoken = normalizeHanzi(exercise.audioText);
      const shown = normalizeHanzi(entity.hanzi);
      if (spoken && shown && spoken !== shown && !spoken.includes(shown) && !shown.includes(spoken)) {
        noteCard(`${where}: áudio diria "${exercise.audioText}" num card de "${entity.hanzi}".`);
      }
    }
  };

  const canonicalIdentityOf = (hanzi) => lexical.canonicalIdentity(hanzi)?.pinyin ?? "(sem pinyin canônico)";

  for (const seed of seeds) {
    for (const domain of DOMAINS) {
      for (const reps of [0, 1, 2, 3]) {
        const item = { ...newItem(seed.type, seed.itemId, { track: "fala", reviewDomain: domain }), reps };
        let exercise = null;
        try {
          exercise = builder.buildReviewExercise({ item, learnedItems, domain });
        } catch (error) {
          noteCard(`${seed.type}:${seed.itemId} dom=${domain} reps=${reps}: exceção — ${error.message}`);
          continue;
        }
        checkCard(exercise, `${seed.type}:${seed.itemId} dom=${domain} reps=${reps}`);
      }
    }
  }

  // ---------------------------------------------------------------------
  // 5. Caminho de REMEDIAÇÃO (o do bug reproduzido). `targets` é acumulado na
  //    ordem em que o passo declara os textos — num `match_pairs` o primeiro
  //    alvo é o primeiro par da tela, não o que o aluno errou. O card tem de
  //    seguir o item errado, nunca o primeiro alvo da lista.
  // ---------------------------------------------------------------------
  const mistakeFor = (missedHanzi, missedMeaning, targets) => ({
    id: "audit:1",
    lessonId: "audit",
    moduleId: "audit",
    phaseId: "audit",
    taskId: "audit",
    questionId: "audit:q",
    type: "match_pairs",
    prompt: "Combine os pares.",
    correctAnswer: missedHanzi,
    selectedAnswer: "Resposta incorreta",
    hanzi: missedHanzi,
    meaningPt: missedMeaning,
    timestamp: Date.now(),
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: "significado",
    targets,
  });

  const asTarget = (type, itemId, domain) => ({ type, itemId, domain, track: "fala" });

  // Cenário exato do screenshot: o aluno erra 明天见 num passo cujo PRIMEIRO
  // alvo declarado é 你好. O card não pode sair com o som de 你好.
  const adversarial = mistakeFor("明天见", "Até amanhã.", [
    asTarget("chunk", "nihao", "significado"),
    asTarget("chunk", "mingtianjian", "significado"),
  ]);
  for (const remediationStep of [0, 1, 2, 3]) {
    let exercise = null;
    try {
      exercise = builder.buildReviewExerciseFromMistake({
        mistake: adversarial,
        learnedItems,
        remediationStep,
      });
    } catch (error) {
      fail(`remediação 明天见 passo ${remediationStep}: exceção — ${error.message}`);
      continue;
    }
    if (!exercise) continue;
    const entity = exercise.entity ?? {};
    if (normalizeHanzi(entity.hanzi ?? "") !== normalizeHanzi("明天见")) {
      fail(
        `SENTINELA remediação (passo ${remediationStep}): card do erro de 明天见 saiu com ` +
          `"${entity.hanzi}" — seguiu targets[0] em vez do item errado (P0-002).`
      );
    }
    if (entity.pinyin && !isCoherentPinyin(entity.hanzi, entity.pinyin)) {
      fail(
        `SENTINELA remediação (passo ${remediationStep}): "${entity.hanzi}" saiu com pinyin ` +
          `"${entity.pinyin}" (P0-001).`
      );
    }
    checkCard(exercise, `remediação 明天见 passo ${remediationStep}`);
  }

  // Varredura ampla do mesmo caminho: cada chunk errado, com um alvo estranho
  // à frente na lista, tem de continuar gerando um card do próprio chunk.
  for (const chunk of CHUNKS) {
    const decoy = chunk.id === "nihao" ? "xiexie" : "nihao";
    const mistake = mistakeFor(chunk.hanzi, chunk.meaningPt, [
      asTarget("chunk", decoy, "significado"),
      asTarget("chunk", chunk.id, "significado"),
    ]);
    let exercise = null;
    try {
      exercise = builder.buildReviewExerciseFromMistake({ mistake, learnedItems, remediationStep: 0 });
    } catch (error) {
      noteCard(`remediação ${chunk.id}: exceção — ${error.message}`);
      continue;
    }
    if (!exercise) continue;
    const entity = exercise.entity ?? {};
    if (normalizeHanzi(entity.hanzi ?? "") !== normalizeHanzi(chunk.hanzi)) {
      noteCard(
        `remediação ${chunk.id}: erro em "${chunk.hanzi}" gerou card de "${entity.hanzi}" ` +
          `(seguiu o alvo decoy "${decoy}" — P0-002).`
      );
    }
    checkCard(exercise, `remediação ${chunk.id}`);
  }

  for (const failure of cardFailures) fail(failure);

  console.log(
    `Revisão · integridade: ${lessons.length} lições · ${checkedSteps} passos · ` +
      `${checkedGlosses} glosas · ${checkedPieces} montagens · ${builtCards} cards gerados · ` +
      `${CHUNKS.length} chunks · ${CHARACTERS.length} caracteres.`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problema(s) de integridade na revisão:\n`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("Integridade da revisão OK — hànzì, pinyin e significado sempre da mesma unidade.");
