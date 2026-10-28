#!/usr/bin/env node
/**
 * QA 2026-10 · prompt 21 — LGY-015, LGY-027 · R-18 (R1, R3, R4).
 *
 * (a) item só apresentado não é promovido; (b) 4 passes no mesmo dia = no
 * máximo 1 promoção; (c) acerto com ajuda = no máximo `hard`; (d) intervalo
 * com teto; (e) ease com teto; (f) 8 lapsos = leech, fora da fila normal;
 * (g) etapa avaliada errada gera alvo de revisão. Mais: item persistido antigo
 * não é rebaixado ao carregar, e o finish() da lição usa a evidência.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

process.env.TZ = "America/Sao_Paulo";

const root = process.cwd();
const out = await mkdtemp(path.join(os.tmpdir(), "longyu-srs-evidence-"));
const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

try {
  const program = ts.createProgram(["src/lib/srs.ts", "src/features/lesson/reviewTargets.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir: out,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    jsx: ts.JsxEmit.ReactJSX,
  });
  if (program.emit().emitSkipped) process.exit(1);
  await writeFile(path.join(out, "package.json"), "{\"type\":\"commonjs\"}\n");
  const load = (rel) => createRequire(import.meta.url)(path.join(out, rel));
  const srs = load("src/lib/srs.js");
  const { reviewTargetsForMistake } = load("src/features/lesson/reviewTargets.js");
  const NOW = new Date("2026-10-28T10:00:00-03:00").getTime();

  // (a) Só apresentado: a lição não dá nota; o item fica em aprendizado.
  assert.equal(srs.lessonEvidenceGrade({ graded: false }), null, "(a) exposição não vira nota");
  assert.equal(srs.lessonEvidenceGrade(undefined), null, "(a) etapa sem resultado não vira nota");
  assert.equal(srs.lessonEvidenceGrade({ graded: true, correct: false }), null, "(a) erro não vira good (o again vem do alvo)");
  const shown = srs.newItem("chunk", "nihao", { now: NOW });
  assert.equal(shown.reps, 0, "(a) item novo nasce em aprendizado");
  assert.equal(shown.intervalDays, 0, "(a) sem intervalo de dia");

  // (b) Acertado sem ajuda nos 4 passes do mesmo dia: 1 promoção no máximo.
  let item = srs.newItem("chunk", "nihao", { now: NOW });
  let promotions = 0;
  for (let pass = 1; pass <= 4; pass += 1) {
    const at = NOW + pass * 20 * MIN;
    const grade = srs.lessonEvidenceGrade({ graded: true, correct: true });
    assert.equal(grade, "good", "(b) acerto sem ajuda = good");
    if (srs.promotedToday(item, at)) continue;
    const next = srs.review(item, grade, at);
    if (next.reps > item.reps || next.intervalDays > item.intervalDays) promotions += 1;
    item = next;
  }
  assert.equal(promotions, 1, "(b) 4 passes no mesmo dia = 1 promoção");
  assert.equal(item.intervalDays, 0, "(b) continua no passo de aprendizado, não 6,6 dias");
  const tomorrow = NOW + DAY;
  assert.equal(srs.promotedToday(item, tomorrow), false, "(b) no dia seguinte pode promover de novo");

  // (c) Com ajuda: teto hard, sem avançar o aprendizado.
  assert.equal(srs.lessonEvidenceGrade({ graded: true, correct: true, assisted: true }), "hard", "(c) acerto com ajuda = hard");
  const assisted = srs.review(srs.newItem("chunk", "nihao", { now: NOW }), "hard", NOW);
  assert.equal(assisted.reps, 0, "(c) hard não avança reps");
  assert.equal(assisted.intervalDays, 0, "(c) hard não gradua");

  // (d) 10 good seguidos: intervalo com teto.
  let graduated = { ...srs.newItem("chunk", "nihao", { now: NOW }), intervalDays: 5, reps: 3, due: NOW };
  for (let i = 0; i < 10; i += 1) graduated = srs.review(graduated, "good", graduated.due);
  assert.equal(srs.MAX_INTERVAL_DAYS, 365, "(d) teto de 365 dias");
  assert.ok(graduated.intervalDays <= srs.MAX_INTERVAL_DAYS, `(d) 10 good ≤ teto (${graduated.intervalDays})`);

  // (e) easy repetido: ease com teto.
  let easy = { ...srs.newItem("chunk", "nihao", { now: NOW }), intervalDays: 1, reps: 1, due: NOW };
  for (let i = 0; i < 20; i += 1) easy = srs.review(easy, "easy", easy.due);
  assert.equal(srs.MAX_EASE, 2.8, "(e) teto de ease 2,8");
  assert.ok(easy.ease <= srs.MAX_EASE, `(e) ease ≤ teto (${easy.ease})`);
  assert.ok(easy.intervalDays <= srs.MAX_INTERVAL_DAYS, "(e) easy também respeita o teto de intervalo");

  // Lapso: reaprende em fração do intervalo anterior, não do zero.
  const mature = { ...srs.newItem("chunk", "nihao", { now: NOW }), intervalDays: 40, reps: 6, due: NOW };
  const lapsed = srs.review(mature, "again", NOW);
  assert.equal(lapsed.intervalDays, 0, "lapso volta ao aprendizado");
  const relearned = srs.review(srs.review(lapsed, "good", NOW + 11 * MIN), "good", NOW + 2 * 60 * MIN);
  assert.equal(relearned.intervalDays, Math.round(40 * srs.LAPSE_INTERVAL_FACTOR), "reaprendido gradua em fração do intervalo anterior");

  // (f) 8 lapsos: leech, fora da fila normal, listado à parte.
  let leech = srs.newItem("chunk", "nihao", { now: NOW });
  for (let i = 0; i < srs.LEECH_LAPSES; i += 1) leech = srs.review(leech, "again", NOW + i * MIN);
  assert.equal(srs.LEECH_LAPSES, 8, "(f) leech em 8 lapsos");
  assert.equal(leech.leech, true, "(f) 8 lapsos = leech");
  const bag = { [leech.id]: { ...leech, due: NOW - 1 }, other: { ...srs.newItem("chunk", "xiexie", { now: NOW }), id: "other", due: NOW - 1 } };
  assert.ok(!srs.dueItems(bag, NOW).some((entry) => entry.id === leech.id), "(f) leech sai da fila normal");
  assert.deepEqual(srs.leechItems(bag).map((entry) => entry.id), [leech.id], "(f) leech aparece em Palavras difíceis");
  let freed = leech;
  for (let i = 0; i < srs.LEECH_RELEASE_REPS; i += 1) freed = srs.review(freed, "good", NOW + DAY * (i + 1));
  assert.equal(freed.leech, false, "(f) remediação acertada tira do leech");

  // Migração: item persistido antigo (sem campos novos) não é rebaixado ao carregar.
  const legacy = { id: "chunk:nihao:significado", type: "chunk", itemId: "nihao", reviewDomain: "significado", ease: 3.1, intervalDays: 500, due: NOW + 10 * DAY, reps: 9, lapses: 9, createdAt: NOW - 400 * DAY };
  assert.ok(srs.isSrsItem(legacy), "item antigo continua válido");
  assert.equal(srs.leechItems({ [legacy.id]: legacy }).length, 0, "item antigo com 9 lapsos não vira leech ao carregar");
  const legacyDue = { ...legacy, due: NOW - 1 };
  assert.equal(srs.dueItems({ [legacy.id]: legacyDue }, NOW)[0]?.intervalDays, 500, "carregar não mexe no intervalo salvo");
  const legacyNext = srs.review(legacyDue, "good", NOW);
  assert.ok(legacyNext.intervalDays <= srs.MAX_INTERVAL_DAYS && legacyNext.ease <= srs.MAX_EASE, "o teto entra na próxima revisão");

  // (g) Toda etapa avaliada com mandarim gera alvo quando errada.
  const introduced = new Set(["chunk:nihao", "chunk:xiexie", "char:ni", "char:hao"]);
  const cases = [
    ["audio_discrimination", { kind: "audio_discrimination", pairReveal: [{ hanzi: "你好" }, { hanzi: "谢谢" }] }],
    ["image_choice", { kind: "image_choice", imageChoiceMode: "choose_hanzi", targetHanzi: "你好" }],
    ["match_pairs", { kind: "match_pairs", pairs: [{ left: "你好", right: "olá" }, { left: "谢谢", right: "obrigado" }] }],
    ["audio_to_action", { kind: "audio_to_action", audioText: "你好", correctAnswer: "你好", options: ["你好", "谢谢"] }],
    ["substitution_drill", { kind: "substitution_drill", sentenceBefore: "", blankAnswer: "谢谢", options: ["你好", "谢谢"] }],
    ["produce sem target", { kind: "produce", correctAnswer: "你好", options: ["你好", "谢谢"] }],
    ["translation_build em pt", { kind: "translation_build", correctAnswer: "Olá", targetParts: ["你", "好"], sourceText: "Olá" }],
    ["conversation_scene em pt", { kind: "conversation_scene", correctAnswer: "Olá.", newRefs: ["chunk:nihao"], learnedRefs: [] }],
    ["listen_select fora do ensinado", { kind: "listen_select", audioText: "谢谢", correctAnswer: "谢谢" }],
  ];
  for (const [label, step] of cases) {
    const targets = reviewTargetsForMistake(step, "fala", label.includes("fora do ensinado") ? new Set(["chunk:nihao"]) : introduced);
    assert.ok(targets.length >= 1, `(g) ${label} gera alvo`);
  }
  const contrast = reviewTargetsForMistake({ kind: "audio_discrimination", pairReveal: [{ hanzi: "你好" }, { hanzi: "谢谢" }] }, "som", introduced);
  assert.ok(contrast.some((target) => target.itemId === "nihao") && contrast.some((target) => target.itemId === "xiexie"), "(g) contraste agenda os dois itens");

  // R1 no player: finish() usa a evidência, não "good" para tudo.
  const player = await readFile(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  const finishBody = player.slice(player.indexOf("function finish(finalCorrect"), player.indexOf("const weakDomains = new Set"));
  assert.match(finishBody, /lessonEvidenceGrade\(/, "finish() gradua pela evidência da etapa");
  assert.match(finishBody, /promotedToday\(/, "finish() respeita 1 promoção por dia");
  assert.doesNotMatch(finishBody, /grade: "good",/, "finish() não dá good fixo para tudo que foi exibido");
  assert.match(player, /stepEvidenceRef\.current\.set\(/, "o player guarda o resultado de cada etapa");
} finally {
  await rm(out, { recursive: true, force: true });
}

console.log("test:srs-evidence PASS");
