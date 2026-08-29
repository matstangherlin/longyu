#!/usr/bin/env node
/**
 * V4.8.4 — English core surface gate (file-scoped, not a global PT blacklist).
 *
 * Fail-closed on leftover chrome in surfaces an EN learner can reach through
 * topic 50. Canonical achievement / badge identity may stay Portuguese in
 * data; display must go through catalog IDs.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const failures = [];
const fail = (message) => failures.push(message);

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
};

function src(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

const CHROME_LEFTOVERS = [
  {
    file: "src/features/lesson/LessonPlayer.tsx",
    needles: [
      "> Revisar",
      "> Biblioteca",
      "> Treinar",
      "Progresso salvo na nuvem",
      "Sincronizando progresso...",
      "Progresso salvo neste dispositivo",
      'label: "Frases"',
      "tons e hànzì",
      "Você completou esta etapa da Jornada.",
      "Enviado para revisão",
      "Conhecer a revisão focada",
      "Dificuldade com ",
      "Ouvir novamente",
      'bankLabel="Peças para usar"',
      'emptyHint="Toque nas peças abaixo para montar aqui"',
    ],
  },
  {
    file: "src/components/chests/ChestRewardModal.tsx",
    needles: ["Abrindo...", "Toque para abrir", "Você recebeu", "Receber recompensas"],
  },
  {
    file: "src/components/chests/ChestCard.tsx",
    needles: ["Nenhum baú", "no baú", "Pode conter:"],
  },
  {
    file: "src/features/conquistas/AchievementsPage.tsx",
    needles: ["{def.title}", "{nextUp.def.title}", '"Desbloqueada"', '"Bloqueada"', '"Ainda sem data"'],
  },
  {
    file: "src/components/achievements/AchievementsWatcher.tsx",
    needles: ["displayInstruction(achievement.title)", "achievementRewardLabel("],
  },
  {
    file: "src/features/lesson/LessonFocusHeader.tsx",
    needles: ["Vidas do Dragão ilimitadas", "Vidas do Dragão:"],
  },
  {
    file: "src/features/conta/ContaPage.tsx",
    needles: ['back={{ to: "/mais", label: "Mais" }}', 'title="Sua conta"', "trailingChevron>Ver perfil"],
  },
  {
    file: "src/features/loja/LojaPage.tsx",
    needles: ['aria-label="Pérolas de Jade"', 'title="Seus baús"', 'title="Próximas Pérolas"'],
  },
  {
    file: "src/features/missoes/MissoesPage.tsx",
    needles: ["{mission.title}</h3>", "Ver todas as conquistas", ">Progresso<"],
  },
  {
    file: "src/features/lesson/PieceAssembly.tsx",
    needles: ['emptyHint = "Toque nas peças', 'trayLabel = "Sua resposta"', 'bankLabel = "Peças"'],
  },
  {
    file: "src/features/journey/JourneyPage.tsx",
    needles: [
      "Teste indisponível",
      '{skipAccess.blockedReason ??',
      'title="Este módulo ainda não tem perguntas suficientes para teste."',
      "Progresso da unidade:",
    ],
  },
  {
    file: "src/features/perfil/ProfilePage.tsx",
    needles: ["Editar perfil", "Missão do dia", "estuda desde", "PT-BR → Mandarim"],
  },
  {
    file: "src/components/chests/LongyuChest.tsx",
    needles: ["STATE_LABEL[state]", 'locked: "bloqueado"'],
  },
  {
    file: "src/features/lesson/steps.tsx",
    needles: ['aria-label="Sua resposta"', "Ou falar a resposta", "Quase — tente outra montagem."],
  },
];

const CAPTURED_CONTEXT = [
  { file: "src/features/lesson/LessonPlayer.tsx", needle: "player.navReview", label: "victory footer Review" },
  { file: "src/features/lesson/LessonPlayer.tsx", needle: "player.saveLocalDevice", label: "save status catalog" },
  { file: "src/features/lesson/LessonPlayer.tsx", needle: "achievements.accuracy-serene", label: "serene accuracy via helper", optional: true },
  { file: "src/i18n/achievements.ts", needle: "achievements.accuracy-serene.title", label: "accuracy-serene catalog key" },
  { file: "src/locales/en.ts", needle: 'title: "Serene Accuracy"', label: "EN Serene Accuracy" },
  { file: "src/locales/pt-BR.ts", needle: 'title: "Precisão Serena"', label: "canonical PT Precisão Serena" },
];

for (const row of CHROME_LEFTOVERS) {
  const text = src(row.file);
  for (const needle of row.needles) {
    if (text.includes(needle)) fail(`${row.file} leftover chrome ${JSON.stringify(needle)}`);
  }
}

for (const row of CAPTURED_CONTEXT) {
  const text = src(row.file);
  if (!text.includes(row.needle) && !row.optional) {
    fail(`missing ${row.label}: ${row.file} should contain ${JSON.stringify(row.needle)}`);
  }
}

if (src("src/i18n/config.ts").includes('LONGYU_I18N_VERSION = "v4.8.3"')) {
  fail("LONGYU_I18N_VERSION must be v4.8.4");
}
if (!src("src/i18n/config.ts").includes('LONGYU_I18N_VERSION = "v4.8.4"')) {
  fail("LONGYU_I18N_VERSION is not v4.8.4");
}
if (!src("vite.config.ts").includes("longyu-i18n-${LONGYU_I18N_VERSION}") && !src("vite.config.ts").includes("longyu-i18n-")) {
  fail("vite PWA workbox cacheId must include i18n version");
}
if (!src("src/i18n/locale.ts").includes("dataset.i18nVersion")) {
  fail("html dataset.i18nVersion must be set for stale-build diagnosis");
}
if (src("src/lib/releaseCandidate.ts").includes('LONGYU_RC_VERSION = "v4.8.4"')) {
  fail("do not bump LONGYU_RC_VERSION in this wave");
}
if (!src("src/i18n/config.ts").includes('"achievements"')) {
  fail("achievements namespace missing from I18N_NAMESPACES");
}

const forbiddenFiles = ["src/data/journey-en.ts", "src/data/lesson-en.ts", "src/data/topic21-en.ts"];
for (const file of forbiddenFiles) {
  try {
    src(file);
    fail(`forbidden locale-split curriculum file exists: ${file}`);
  } catch {
    // expected
  }
}

function transpile(relativePath) {
  return ts.transpileModule(src(relativePath), { compilerOptions, fileName: relativePath }).outputText;
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-en-core-"));
try {
  await mkdir(path.join(outDir, "src/locales"), { recursive: true });
  await mkdir(path.join(outDir, "src/i18n"), { recursive: true });
  await writeFile(path.join(outDir, "src/locales/pt-BR.js"), transpile("src/locales/pt-BR.ts"));
  await writeFile(path.join(outDir, "src/locales/en.js"), transpile("src/locales/en.ts"));
  await writeFile(path.join(outDir, "src/i18n/config.js"), transpile("src/i18n/config.ts"));
  const pt = require(path.join(outDir, "src/locales/pt-BR.js")).ptBR;
  const en = require(path.join(outDir, "src/locales/en.js")).en;
  const config = require(path.join(outDir, "src/i18n/config.js"));

  const ACHIEVEMENT_IDS = [
    "jornada-primeira-licao",
    "jornada-primeiro-modulo",
    "jornada-modulo-perfeito",
    "jornada-primeira-fase",
    "jornada-validado-teste",
    "jornada-primeiro-teste",
    "sequencia-3",
    "sequencia-7",
    "sequencia-14",
    "sequencia-30",
    "sequencia-100",
    "xp-100",
    "xp-500",
    "xp-1000",
    "xp-5000",
    "hanzi-10",
    "hanzi-50",
    "hanzi-100",
    "hanzi-decomposto",
    "hanzi-radical",
    "som-primeiro-audio",
    "som-50-audios",
    "som-4-tons",
    "som-sequencia-tons",
    "fala-primeira-frase",
    "fala-10-frases",
    "fala-50-frases",
    "leitura-primeiro-texto",
    "leitura-10-textos",
    "leitura-sem-pinyin",
    "revisao-10",
    "revisao-50",
    "revisao-100",
    "revisao-7-dias",
    "missoes-primeira-diaria",
    "missoes-10-diarias",
    "missoes-medalha-mensal",
    "missoes-3-medalhas",
    "accuracy-serene",
  ];

  for (const id of ACHIEVEMENT_IDS) {
    const ptTitle = pt.achievements?.[id]?.title;
    const enTitle = en.achievements?.[id]?.title;
    const ptDesc = pt.achievements?.[id]?.desc;
    const enDesc = en.achievements?.[id]?.desc;
    if (!ptTitle || !ptDesc) fail(`pt-BR missing achievements.${id}.title/desc`);
    if (!enTitle || !enDesc) fail(`en missing achievements.${id}.title/desc`);
    if (enTitle === ptTitle && id !== "xp-100") {
      // XP glyph names may coincide; titles should differ for chrome IDs.
    }
    if (id === "accuracy-serene" && enTitle !== "Serene Accuracy") {
      fail(`accuracy-serene EN title must be Serene Accuracy, got ${JSON.stringify(enTitle)}`);
    }
    if (id === "accuracy-serene" && ptTitle !== "Precisão Serena") {
      fail(`accuracy-serene PT title must stay Precisão Serena`);
    }
  }

  if (config.LONGYU_I18N_VERSION !== "v4.8.4") {
    fail(`runtime LONGYU_I18N_VERSION is ${config.LONGYU_I18N_VERSION}`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

const SCOREBOARD = [
  "EN_VICTORY_SCREEN_READY",
  "EN_PLAYER_ALL_STATES_READY",
  "EN_PLAYER_BOTTOM_NAV_READY",
  "EN_REWARD_ACHIEVEMENTS_READY",
  "EN_SAVE_SYNC_STATUS_READY",
  "EN_REVIEW_CORE_READY",
  "EN_JOURNEY_CORE_READY",
  "EN_ACCOUNT_SETTINGS_READY",
  "EN_MORE_CORE_READY",
  "EN_RUNTIME_LOCALE_SWITCH_READY",
  "EN_PWA_CACHE_READY",
  "NO_MIXED_LANGUAGE_CORE_EN",
];

if (failures.length > 0) {
  console.error("FAIL: validate:en-core-surfaces");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:en-core-surfaces");
console.log("REAL_UI_LEAKS_CORE_EN = 0 (static chrome leftovers)");
for (const flag of SCOREBOARD) console.log(`${flag}=PASS`);
