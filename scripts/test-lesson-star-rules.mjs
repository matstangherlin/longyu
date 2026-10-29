#!/usr/bin/env node
/**
 * QA 2026-10 · prompt 22 — LGY-026 (N4, R7) e LGY-031.
 *
 * Faixas de estrelas, mínimo para concluir, Qi graduado e a ligação com o
 * player. `lessonCompletionQi` (o que a vitória mostra) e a fórmula de
 * `grantLessonReward` (o que o store paga) são executadas lado a lado em todos
 * os casos e precisam concordar em 100% deles.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const out = await mkdtemp(path.join(os.tmpdir(), "longyu-star-rules-"));
const read = (rel) => readFile(path.join(root, rel), "utf8");

try {
  for (const rel of ["src/data/economy.ts", "src/features/lesson/lessonStarRules.ts", "src/lib/lessonQi.ts"]) {
    const js = ts.transpileModule(await read(rel), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const dest = path.join(out, rel.replace(/\.ts$/, ".js"));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, js);
  }
  await writeFile(path.join(out, "package.json"), "{\"type\":\"commonjs\"}\n");
  const load = (rel) => createRequire(import.meta.url)(path.join(out, rel));
  const economy = load("src/data/economy.js");
  const rules = load("src/features/lesson/lessonStarRules.js");
  const { lessonCompletionQi } = load("src/lib/lessonQi.js");

  // ── Constantes nomeadas (padrões do prompt 22) ─────────────────────────
  assert.equal(economy.PASS_ACCURACY, 0.6, "mínimo para concluir = 60%");
  assert.equal(economy.TWO_STAR_ACCURACY, 0.8, "2★ a partir de 80%");
  assert.equal(economy.THREE_STAR_ACCURACY, 0.95, "3★ a partir de 95%");
  assert.equal(economy.LESSON_ONE_STAR_QI, 3, "1★ = 3 Qi");
  assert.equal(economy.LESSON_TWO_STAR_QI, 4, "2★ = 4 Qi");
  assert.equal(economy.LESSON_THREE_STAR_QI, 5, "3★ = 5 Qi (igual a hoje)");
  assert.equal(economy.MODULE_REVIEW_PASS_ACCURACY, 0.8, "revisão de módulo mantém 80%");

  // ── Tabela de casos: aula normal ───────────────────────────────────────
  // [rótulo, correct, graded, hadMistakes, outOfLives, estrelas, conclui, perfeito]
  const lessonCases = [
    ["0%", 0, 10, true, false, 0, false, false],
    ["1 acerto em 10", 1, 10, true, false, 0, false, false],
    ["59%", 59, 100, true, false, 0, false, false],
    ["60%", 60, 100, true, false, 1, true, false],
    ["60% em lição curta (3/5)", 3, 5, true, false, 1, true, false],
    ["75%", 6, 8, true, false, 1, true, false],
    ["79%", 79, 100, true, false, 1, true, false],
    ["80%", 8, 10, true, false, 2, true, false],
    ["94%", 94, 100, true, false, 2, true, false],
    ["95%", 19, 20, true, false, 3, true, false],
    ["100% sem erro", 10, 10, false, false, 3, true, true],
    ["100% com erro corrigido na hora", 10, 10, true, false, 3, true, false],
    ["sem vidas com acertos", 5, 10, true, true, 0, false, false],
    ["sem vidas sem acertos", 0, 4, true, true, 0, false, false],
    ["nada avaliado", 0, 0, false, false, 3, true, true],
    ["nada avaliado com erro", 0, 0, true, false, 2, true, false],
  ];
  for (const [label, correct, graded, hadMistakes, outOfLives, stars, completes, perfect] of lessonCases) {
    const got = rules.computeLessonStars({ correct, graded, hadMistakes, outOfLives, isReview: false });
    assert.equal(got, stars, `${label}: ${stars}★ (veio ${got}★)`);
    const done = !outOfLives && rules.canCompleteLesson(got, graded, false, correct);
    assert.equal(done, completes, `${label}: ${completes ? "conclui" : "não conclui"}`);
    assert.equal(rules.isPerfectLesson({ correct, graded, hadMistakes }), perfect, `${label}: selo perfeito = ${perfect}`);
  }
  // Pulo com Fôlego e escuta adiada sem áudio: não são acerto nem erro (saem do
  // denominador); a rodada fica em no máximo 2★, como a regra antiga já dava.
  const skipCases = [
    ["6 certas + 2 pulos de 8, sem erro", 6, 8, false, 2, 2, true],
    ["tudo pulado, sem erro", 0, 8, false, 8, 2, true],
    ["3 escutas adiadas sem áudio de 3 (R-17)", 0, 3, false, 3, 2, true],
    ["3 certas + 1 erro + 4 pulos (75% do respondido)", 3, 8, true, 4, 1, true],
    ["1 certa + 3 erros + 4 pulos (25% do respondido)", 1, 8, true, 4, 0, false],
  ];
  for (const [label, correct, graded, hadMistakes, unscored, stars, completes] of skipCases) {
    const got = rules.computeLessonStars({ correct, graded, hadMistakes, unscored });
    assert.equal(got, stars, `${label}: ${stars}★ (veio ${got}★)`);
    assert.equal(rules.canCompleteLesson(got, graded, false, correct), completes, `${label}: conclui = ${completes}`);
    assert.equal(rules.isPerfectLesson({ correct, graded, hadMistakes, unscored }), false, `${label}: sem selo perfeito`);
  }
  assert.equal(rules.requiredStarsForLesson(false), 1, "aula normal: mínimo 1★ (= 60%)");
  assert.equal(rules.canCompleteLesson(0, 10, false, 1), false, "1 acerto em 10 não conclui a lição");

  // ── Revisão de módulo: regra própria, sem mudança ──────────────────────
  const reviewCases = [
    ["revisão 100% sem erro", 10, 10, false, 3, true],
    ["revisão 100% com erro", 10, 10, true, 2, true],
    ["revisão 90%", 9, 10, true, 2, true],
    ["revisão 80%", 8, 10, true, 2, true],
    ["revisão 79%", 79, 100, true, 1, false],
    ["revisão 0%", 0, 10, true, 0, false],
  ];
  for (const [label, correct, graded, hadMistakes, stars, completes] of reviewCases) {
    const got = rules.computeLessonStars({ correct, graded, hadMistakes, outOfLives: false, isReview: true });
    assert.equal(got, stars, `${label}: ${stars}★ (veio ${got}★)`);
    assert.equal(rules.canCompleteLesson(got, graded, true, correct), completes, `${label}: conclui = ${completes}`);
  }
  assert.equal(rules.requiredStarsForLesson(true), 2, "revisão: mínimo 2★ (80%)");

  // ── Reforço: todos os erros corrigidos na revisão da lição ─────────────
  assert.equal(rules.reforcoRecoversAttempt({ attemptStars: 0, isReview: false }), false, "abaixo do mínimo o Reforço é prática: não conclui");
  assert.equal(rules.reforcoRecoversAttempt({ attemptStars: 1, isReview: false }), true, "1★ + Reforço devolve a 3ª estrela (como antes)");
  assert.equal(rules.reforcoRecoversAttempt({ attemptStars: 2, isReview: false }), true, "2★ + Reforço devolve a 3ª estrela (como antes)");
  assert.equal(rules.reforcoRecoversAttempt({ attemptStars: 1, isReview: true }), true, "revisão de módulo mantém a regra própria");

  // ── Qi: lessonQi (vitória) × grantLessonReward (store), todos os casos ──
  const store = await read("src/lib/store.ts");
  const grant = store.match(
    /grantLessonReward: \(\{ lessonId, attemptId, stars, noSkip \}\) => \{[\s\S]{0,400}?const graduated = lessonQiGraduated\(\);[\s\S]{0,200}?const qiAmount =\s*([\s\S]*?);\n/
  );
  assert.ok(grant, "grantLessonReward lê lessonQiGraduated() e calcula qiAmount");
  const qiNames = ["LESSON_ONE_STAR_QI", "LESSON_TWO_STAR_QI", "LESSON_THREE_STAR_QI", "LESSON_NO_SKIP_QI", "PRO_LESSON_QI_BONUS"];
  const storeQi = new Function(
    "stars",
    "noSkip",
    "pro",
    "graduated",
    ...qiNames,
    `return (${grant[1].replace(/hasProAccess\(state\)/g, "pro")});`
  );
  let compared = 0;
  for (const stars of [0, 1, 2, 3]) {
    for (const noSkip of [false, true]) {
      for (const pro of [false, true]) {
        for (const graduated of [false, true]) {
          const shown = lessonCompletionQi({ stars, noSkip, pro, graduated });
          const paid = storeQi(stars, noSkip, pro, graduated, ...qiNames.map((name) => economy[name]));
          assert.equal(shown, paid, `vitória ${shown} × store ${paid} (★${stars} noSkip=${noSkip} pro=${pro} graduado=${graduated})`);
          compared += 1;
        }
      }
    }
  }
  assert.equal(compared, 32, "32 combinações comparadas");

  // Graduado (padrão do prompt): 1★ = 3, 2★ = 4, 3★ = 5; bônus só a 3★.
  const qi = (stars, extra = {}) => lessonCompletionQi({ stars, noSkip: false, pro: false, graduated: true, ...extra });
  assert.equal(qi(0), 0, "0★: sem Qi");
  assert.equal(qi(1), 3, "1★ = 3 Qi");
  assert.equal(qi(2), 4, "2★ = 4 Qi");
  assert.equal(qi(3), 5, "3★ = 5 Qi");
  assert.equal(qi(1, { noSkip: true, pro: true }), 3, "bônus sem pular e Pro só a 3★ (1★)");
  assert.equal(qi(2, { noSkip: true, pro: true }), 4, "bônus sem pular e Pro só a 3★ (2★)");
  assert.equal(qi(3, { noSkip: true }), 7, "3★ sem pular = 5 + 2");
  assert.equal(qi(3, { noSkip: true, pro: true }), 10, "3★ sem pular no Pro = 5 + 2 + 3 (teto de hoje)");
  // Sem graduação (conta na nuvem antes do SQL pendente): a regra de hoje.
  assert.equal(lessonCompletionQi({ stars: 2, noSkip: true, pro: true }), 0, "sem a chave: 2★ continua 0 (o servidor ainda paga só o pacote de 3★)");
  assert.equal(lessonCompletionQi({ stars: 3, noSkip: true, pro: false }), 7, "sem a chave: 3★ igual a hoje");
  // Critério de aceite: 80% dá 2★ e 4 Qi.
  const eighty = rules.computeLessonStars({ correct: 8, graded: 10, hadMistakes: true, outOfLives: false, isReview: false });
  assert.equal(eighty, 2, "80% = 2★");
  assert.equal(lessonCompletionQi({ stars: eighty, noSkip: true, pro: false, graduated: true }), 4, "80% = 4 Qi");

  // ── A regra mostrada no "?" sai das mesmas constantes ──────────────────
  const facts = rules.lessonRuleFacts();
  assert.deepEqual(
    { one: facts.oneStarPct, two: facts.twoStarPct, three: facts.threeStarPct },
    { one: 60, two: 80, three: 95 },
    "faixas do \"?\" = constantes"
  );
  assert.deepEqual(
    [facts.qiOneStar, facts.qiTwoStar, facts.qiThreeStar, facts.qiNoSkip, facts.qiPro],
    [3, 4, 5, 2, 3],
    "Qi do \"?\" = constantes"
  );
  for (const locale of ["src/locales/pt-BR.ts", "src/locales/en.ts"]) {
    const text = await read(locale);
    for (const key of ["rulesStars", "rulesMinimum", "rulesQiGraduated", "rulesQiThreeStarOnly", "rulesReplay"]) {
      assert.match(text, new RegExp(`\\b${key}: "`), `${locale}: chave ${key}`);
    }
    assert.match(text, /rulesStars: "[^"]*\{one\}[^"]*\{two\}[^"]*\{three\}/, `${locale}: faixas vêm por placeholder`);
    assert.match(text, /rulesQiGraduated: "[^"]*\{one\}[^"]*\{two\}[^"]*\{three\}/, `${locale}: Qi graduado vem por placeholder`);
  }

  // ── Ligações no app ────────────────────────────────────────────────────
  const bridge = await read("src/lib/economyServerBridge.ts");
  assert.match(
    bridge,
    /export function lessonQiGraduated\(\): boolean \{\s*if \(!shouldUseServerEconomy\(\)\) return true;\s*return isCloudGraduatedLessonQiEnabled\(\);/,
    "conta local é graduada; conta na nuvem só com a chave"
  );
  const flags = await read("src/lib/featureFlags.ts");
  assert.match(flags, /flagEnabled\(env\.VITE_GRADUATED_LESSON_QI, false\)/, "chave da nuvem nasce desligada");

  const player = await read("src/features/lesson/LessonPlayer.tsx");
  const qiCalls = player.match(/lessonCompletionQi\(\{[^}]*\}\)/g) ?? [];
  assert.ok(qiCalls.length >= 2, "vitória usa lessonCompletionQi");
  for (const call of qiCalls) assert.match(call, /graduated: lessonQiGraduated\(\)/, `vitória passa a mesma chave do store: ${call}`);
  assert.match(
    player,
    /if \(!reforcoRecoversAttempt\(\{ attemptStars: baseStars, isReview: lesson\.isReview \}\)\) return;\s*recoveryAppliedRef\.current = true;/,
    "abaixo do mínimo o Reforço não conclui a lição"
  );
  assert.equal((player.match(/lessonStars\(\{[^}]*unscored: unscoredGradedSteps\(\)/g) ?? []).length, 3, "as 3 contas de estrela tiram pulos e escutas adiadas");
  assert.match(
    player,
    /if \(currentStepIsGraded && outcome === undefined\) unscoredGradedRef\.current \+= 1;/,
    "etapa avaliada sem resultado (pulo com Fôlego, escuta adiada) fica fora da precisão"
  );
  assert.match(player, /const canRecoverStar = !recovered && finishReason !== "out_of_lives" && !belowMinimum/, "sem vidas e abaixo do mínimo não prometem recuperar estrela");
  const retryBody = (source) => source.slice(source.indexOf("function retryLesson("), source.indexOf("function recoverWithQi("));
  const retry = retryBody(player);
  assert.match(retry, /unscoredGradedRef\.current = 0;/, "tentar de novo zera a contagem");
  assert.match(retry, /setLessonSessionStep\(lesson\.id, null\);/, "tentar de novo começa do início, não retoma no fim");
  assert.match(
    player,
    /unscoredGradedRef\.current = stepsForRender\.slice\(0, resumeAt\)\.filter\(isGradedStep\)\.length;/,
    "retomar no meio: etapas feitas antes de recarregar ficam fora da precisão"
  );
  const finishBody = player.slice(player.indexOf("function finish(finalCorrect"), player.indexOf("playSoundFx(passed ? \"lessonComplete\" : \"blocked\""));
  assert.match(finishBody, /\n    setLessonSessionStep\(lesson\.id, null\);\n    if \(passed\) \{/, "fim de tentativa (concluída ou não) limpa o cursor");
  assert.match(retry, /if \(options\?\.newPass\) setEntryChecked\(false\);/, "tentar de novo não passa pela entrada (sem nova Carga)");
  assert.equal((retry.match(/setEntryChecked\(/g) ?? []).length, 1, "só a rodada nova reabre a entrada");
  assert.match(player, /data-testid="lesson-below-minimum-reforco"/, "abaixo do mínimo: botão Reforço");
  assert.match(player, /data-testid="lesson-below-minimum-retry"/, "abaixo do mínimo: botão Tentar de novo");

  // LGY-031 — resumo com cada erro, em lista semântica, e revisão a um toque.
  assert.match(player, /<ol[^>]*data-review-offer-errors/, "erros em lista ordenada");
  assert.match(player, /data-review-offer-error-answer/, "mostra a resposta do aluno");
  assert.match(player, /data-review-offer-error-correct/, "mostra a resposta certa");
  assert.match(player, /headingRef\.current\?\.focus\(\)/, "foco vai para o título do resumo");

  // ── Servidor: SQL pendente com rollback (não aplicado) ─────────────────
  const up = "supabase/pending/qa-22-graduated-lesson-qi.sql";
  const down = "supabase/pending/qa-22-graduated-lesson-qi.down.sql";
  assert.ok(existsSync(path.join(root, up)) && existsSync(path.join(root, down)), "SQL pendente + rollback");
  const upSql = await read(up);
  assert.match(upSql, /greatest\(1, least\(3, coalesce\(p_stars, 3\)\)\)/, "p_stars só reduz o pacote (1..3, padrão 3)");
  assert.match(upSql, /security definer\s+set search_path = public/i, "security definer com search_path fixo");
  assert.match(upSql, /revoke all on function public\.grant_lesson_reward\(text, text, integer, boolean\) from public;/, "grants mínimos");
  const downSql = await read(down);
  assert.match(downSql, /p_stars \/ p_no_skip são ignorados de propósito/, "rollback volta ao pacote fixo de hoje");
} finally {
  await rm(out, { recursive: true, force: true });
}

console.log("test:lesson-star-rules PASS");
