#!/usr/bin/env node
/**
 * Fixtures das regras do lint de conteúdo. O scan do currículo é `lint:content`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  hasDoublePunctuation,
  hasUnresolvedPlaceholder,
  isChoiceQuestion,
  missingPieces,
} from "./lib/content-lint-rules.mjs";

assert.equal(hasDoublePunctuation("Monte: Olá.."), true);
assert.equal(hasDoublePunctuation("Monte: Tudo bem?."), true);
assert.equal(hasDoublePunctuation("Complete: Onde fica?."), true);
assert.equal(hasDoublePunctuation("Monte: Olá."), false);
assert.equal(hasDoublePunctuation("Monte: Tudo bem?"), false);
assert.equal(hasDoublePunctuation("Transforme: 你好，我叫..."), false);

assert.equal(hasUnresolvedPlaceholder("meu nome é você"), true);
assert.equal(hasUnresolvedPlaceholder("我叫 você"), true);
assert.equal(hasUnresolvedPlaceholder("Como podemos te chamar, {nome}?"), true);
assert.equal(hasUnresolvedPlaceholder("Aluno local"), true);
assert.equal(hasUnresolvedPlaceholder("onde você está"), false);
assert.equal(hasUnresolvedPlaceholder("todo o tempo"), false);

assert.equal(isChoiceQuestion("Reconhecer de verdade"), false);
assert.equal(isChoiceQuestion("Distinguir ouvir × escolher × montar neste laboratório."), false);
assert.equal(isChoiceQuestion("Qual opção é 你?"), true);
assert.equal(isChoiceQuestion("Reconheça o sentido"), true);
assert.equal(isChoiceQuestion("Você quer dizer: Meu nome é Lucas."), true);
assert.equal(isChoiceQuestion("Mandarim, neste tema, é principalmente…"), true);

const missing = missingPieces("你好", ["你", "一", "人", "木"]);
assert.deepEqual(missing, ["好"]);
assert.deepEqual(missingPieces("你好", ["你", "好", "一"]), []);
assert.deepEqual(missingPieces("你好", ["你", "好"]), []);

const baseline = JSON.parse(readFileSync("scripts/lint-content.baseline.json", "utf8"));
const early = (baseline.entries ?? []).filter((item) => item.phase === "p1" || item.phase === "p2");
assert.deepEqual(early, []);
const player = readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8");
assert.match(player, /from "\.\/reviewTargets"/);
assert.doesNotMatch(player, /function reviewTargetsForMistake/);

console.log("test:lint-content PASS");
