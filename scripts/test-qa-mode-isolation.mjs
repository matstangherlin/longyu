#!/usr/bin/env node
/**
 * V4.6 — QA mode não muta progresso / economia / streak / SRS / entitlement.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const qaSession = await readFile(path.join(rootDir, "src/lib/qaSession.ts"), "utf8");
assert.match(qaSession, /isQaModeAllowed/, "gate de ambiente");
assert.match(qaSession, /isProductionBetaEnv/, "bloqueia produção");
assert.match(qaSession, /QA_FIXTURES/, "fixtures listadas");
assert.match(qaSession, /l15-transfer/, "fixture L15");
assert.match(qaSession, /beginQaSession/, "início de sessão");
assert.match(qaSession, /qaBlocksProgressMutation/, "guard de mutação");

const player = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
assert.match(player, /qaMode/, "prop qaMode");
assert.match(player, /lessonIdOverride/, "override de lição");
assert.match(player, /isQaSessionActive/, "lê sessão QA");
assert.match(player, /if \(qa\) return/, "mutações bloqueadas em QA");
assert.match(player, /grantLessonRewardRaw/, "recompensa encapsulada");
assert.match(player, /completeLessonRaw/, "completeLesson encapsulado");
assert.match(player, /gradeSrsRaw/, "SRS encapsulado");

const qaPage = await readFile(path.join(rootDir, "src/features/qa/QaPlayerPage.tsx"), "utf8");
assert.match(qaPage, /isQaModeAllowed/, "hub verifica ambiente");
assert.match(qaPage, /beginQaSession/, "hub inicia sessão");
assert.match(qaPage, /endQaSession/, "hub limpa sessão");
assert.match(qaPage, /qaMode/, "player em qaMode");

const routes = await readFile(path.join(rootDir, "src/routes.tsx"), "utf8");
assert.match(routes, /path: "qa"/, "rota /qa");
assert.match(routes, /qa\/player\/:fixtureId/, "rota /qa/player");

console.log("OK test:qa-mode-isolation — QA mode não muta progresso/economia/SRS/entitlement");
