#!/usr/bin/env node
/**
 * RC1.3 · P32 — mutações 16 a 23 (pedagogia de tom).
 *
 * O que estas mutações protegem é uma ideia só: um contraste tonal só ensina se
 * for a MESMA sílaba-base, com tons diferentes, palavras diferentes,
 * significados visíveis e áudio — apresentado ANTES de ser cobrado, sem
 * contrabandear vocabulário novo e sem inventar nota de pronúncia.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateToneContrastNoNewVocab, validateToneContrastProgression } from "./lib/rc1-3-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const sets = require(path.join(root, "src/data/toneContrastSets.ts"));
const enrichment = require(path.join(root, "src/features/lesson/toneContrastEnrichment.ts"));
const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));

const killed = [];
const kill = (label) => {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
};

const control = validateToneContrastProgression();
assert.equal(control.failures.length, 0, `controle positivo falhou: ${JSON.stringify(control.failures)}`);
const controlVocab = validateToneContrastNoNewVocab();
assert.equal(controlVocab.failures.length, 0, `controle positivo falhou: ${JSON.stringify(controlVocab.failures)}`);

const base = sets.TONE_CONTRAST_SETS[0];
assert.ok(base, "nenhum contraste tonal declarado");

// ── Mutação 16: o par tem sílabas-base diferentes ─────────────────────────
{
  for (const set of sets.TONE_CONTRAST_SETS) {
    assert.equal(
      sets.stripToneMarks(set.a.pinyin),
      sets.stripToneMarks(set.b.pinyin),
      `${set.id}: bases diferentes`
    );
    assert.equal(sets.stripToneMarks(set.a.pinyin), set.baseSyllable, `${set.id}: base declarada não confere`);
  }
  const mutated = { ...base, b: { ...base.b, pinyin: "bà" } };
  const violations = sets.validateToneContrastSet(mutated);
  assert.ok(
    violations.some((violation) => violation.code === "BASE_SYLLABLE_MISMATCH"),
    "base diferente passou"
  );
  kill("Mutação 16 · tone pair com sílabas-base diferentes");
}

// ── Mutação 17: o par usa o mesmo tom ─────────────────────────────────────
{
  for (const set of sets.TONE_CONTRAST_SETS) {
    assert.notEqual(set.a.dictionaryTone, set.b.dictionaryTone, `${set.id}: mesmo tom nos dois membros`);
  }
  const mutated = { ...base, b: { ...base.b, dictionaryTone: base.a.dictionaryTone } };
  assert.ok(
    sets.validateToneContrastSet(mutated).some((violation) => violation.code === "SAME_TONE"),
    "mesmo tom passou"
  );
  kill("Mutação 17 · tone pair usa o mesmo tom");
}

// ── Mutação 18: o par não mostra significados ────────────────────────────
{
  for (const set of sets.TONE_CONTRAST_SETS) {
    assert.ok(set.a.meaningPt?.trim(), `${set.id}: membro A sem significado`);
    assert.ok(set.b.meaningPt?.trim(), `${set.id}: membro B sem significado`);
    assert.notEqual(
      set.a.meaningPt.toLowerCase(),
      set.b.meaningPt.toLowerCase(),
      `${set.id}: significados iguais não ensinam função lexical`
    );
  }
  const missing = { ...base, b: { ...base.b, meaningPt: "" } };
  assert.ok(
    sets.validateToneContrastSet(missing).some((violation) => violation.code === "MISSING_MEANING"),
    "par sem significado passou"
  );
  const same = { ...base, b: { ...base.b, meaningPt: base.a.meaningPt } };
  assert.ok(
    sets.validateToneContrastSet(same).some((violation) => violation.code === "SAME_MEANING"),
    "significados iguais passaram"
  );
  kill("Mutação 18 · tone pair não mostra meanings");
}

// ── Mutação 19: o par não tem áudio ──────────────────────────────────────
{
  for (const set of sets.TONE_CONTRAST_SETS) {
    assert.ok(set.a.audioTarget?.trim(), `${set.id}: membro A sem áudio`);
    assert.ok(set.b.audioTarget?.trim(), `${set.id}: membro B sem áudio`);
  }
  const mutated = { ...base, a: { ...base.a, audioTarget: "" } };
  assert.ok(
    sets.validateToneContrastSet(mutated).some((violation) => violation.code === "MISSING_AUDIO"),
    "par sem áudio passou"
  );
  // P17.1 — o cartão oferece A, B, comparação e devagar.
  const card = fs.readFileSync(path.join(root, "src/components/tone/ToneContrastCard.tsx"), "utf8");
  for (const marker of ["data-tone-contrast-play", "data-tone-contrast-compare", "data-tone-contrast-slow"]) {
    assert.match(card, new RegExp(marker), `o cartão não oferece ${marker}`);
  }
  kill("Mutação 19 · tone pair não possui áudio");
}

// ── Mutação 20: o teste tonal vem antes da apresentação do par ───────────
{
  const lessonById = new Map(ALL_LESSONS.map((lesson) => [lesson.id, lesson]));
  const lessonIds = [...new Set(sets.TONE_CONTRAST_SETS.flatMap((set) => set.taughtIn))];
  let foundAuthoredGap = false;
  for (const lessonId of lessonIds) {
    const lesson = lessonById.get(lessonId);
    // O currículo autoral tem o buraco — é ele que estamos corrigindo.
    if (enrichment.findToneContrastGaps(lessonId, lesson.steps).length > 0) foundAuthoredGap = true;
    const plans = [lesson.steps];
    for (const pass of [1, 2, 3, 4]) {
      try {
        plans.push(lessonRoundStepsFor(lesson, { masteryPass: pass }));
      } catch {
        /* pass que não planeja não invalida as outras */
      }
    }
    for (const steps of plans) {
      const enriched = enrichment.withToneContrastTeaching(lesson, steps);
      assert.equal(
        enrichment.findToneContrastGaps(lessonId, enriched).length,
        0,
        `${lessonId}: ainda cobra o contraste antes de apresentar o par`
      );
      // O cartão inserido é NÃO pontuado (intro) e vem ANTES do teste.
      const cardIndex = enriched.findIndex((step) => step.toneContrastSetId);
      if (cardIndex >= 0) {
        assert.equal(enriched[cardIndex].kind, "intro", `${lessonId}: cartão de contraste é pontuado`);
      }
    }
  }
  assert.ok(foundAuthoredGap, "o cenário de teste-antes-do-ensino desapareceu: o teste perdeu o alvo");
  kill("Mutação 20 · teste tonal vem antes da apresentação do par");
}

// ── Mutação 21: vocabulário não ensinado entra em scored contrast ────────
// ── Mutação 22: contrastOnly entra em mastery ────────────────────────────
{
  const contrastOnly = new Set(sets.contrastOnlyHanzi());
  assert.ok(contrastOnly.size > 0, "nenhuma palavra marcada como contrastOnly");
  for (const lesson of ALL_LESSONS) {
    for (const hanzi of lesson.newHanzi ?? []) {
      assert.ok(!contrastOnly.has(hanzi), `${lesson.id}: ${hanzi} é contrastOnly e está em newHanzi`);
    }
    for (const item of lesson.libraryItems ?? []) {
      assert.ok(
        !contrastOnly.has(String(item).split(":")[1]),
        `${lesson.id}: ${item} é contrastOnly e está em libraryItems`
      );
    }
  }
  // O cartão avisa o aluno de que aquilo é demonstração.
  const card = fs.readFileSync(path.join(root, "src/components/tone/ToneContrastCard.tsx"), "utf8");
  assert.match(card, /data-tone-contrast-only-note/, "o cartão não sinaliza vocabulário de demonstração");
  kill("Mutações 21 e 22 · vocabulário escondido / contrastOnly em mastery");
}

// ── Mutação 23: SpeechRecognition tratado como Tone Analyzer ─────────────
{
  assert.ok(enrichment.claimsFakeToneScore("seu 3º tom está 87% correto"), "score falso não detectado");
  assert.ok(enrichment.claimsFakeToneScore("Pronúncia perfeita!"), "elogio sem medição não detectado");
  assert.ok(enrichment.claimsFakeToneScore("tone accuracy: 92%"), "tone accuracy não detectada");
  assert.ok(!enrichment.claimsFakeToneScore("Repita em voz alta."), "copy honesta foi reprovada");
  assert.ok(!enrichment.claimsFakeToneScore("Compare com o áudio."), "copy honesta foi reprovada");
  for (const allowed of enrichment.TONE_SPEAKING_ALLOWED_COPY_PT) {
    assert.ok(!enrichment.claimsFakeToneScore(allowed), `copy permitida reprovada: ${allowed}`);
  }
  kill("Mutação 23 · SpeechRecognition tratado como Tone Analyzer");
}

// ── P18.4/P22.1: o recall atrasado muda de abordagem ────────────────────
{
  const approaches = [1, 2, 3].map((occurrence) => enrichment.toneContrastApproachForOccurrence(occurrence));
  assert.equal(new Set(approaches).size, 3, `abordagens repetidas: ${approaches.join(", ")}`);
  assert.equal(approaches[0], "audio_to_word", "a primeira abordagem deveria ser áudio → palavra");
  kill("P18.4/P22.1 · o contraste volta com abordagem diferente");
}

console.log(`PASS test:tone-contrast-progression — ${killed.length} mutações mortas, com controle positivo.`);
