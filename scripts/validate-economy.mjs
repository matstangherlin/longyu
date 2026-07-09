import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  errors.push(message);
}

// ——— economy.ts: constantes canônicas ———
const economyPath = "src/data/economy.ts";
let economySrc = "";
if (!fs.existsSync(path.join(root, economyPath))) {
  fail(`Falta ${economyPath}`);
} else {
  economySrc = read(economyPath);
  const requiredExports = [
    "DAILY_CHARGES_FREE",
    "CHARGE_FREE_ACTIVITIES",
    "FREE_REVIEW_SESSION_LIMIT",
    "PRO_LESSON_QI_BONUS",
    "PRO_CHEST_QI_MULTIPLIER",
    "PRO_MISSION_QI_MULTIPLIER",
    "PRO_CHEST_RARE_BONUS",
    "PRO_CHEST_FOCUS_PASS_CHANCE",
    "ECONOMY_SUMMARY",
    "RETRY_QUESTION_QI",
    "MODULE_RETRY_QI",
  ];
  for (const token of requiredExports) {
    if (!economySrc.includes(`export const ${token}`) && !economySrc.includes(`export const ${token} =`)) {
      if (!economySrc.includes(token)) fail(`economy.ts sem export ${token}`);
    }
  }
  if (!economySrc.includes("essential_review") || !economySrc.includes("mistake_correction")) {
    fail("CHARGE_FREE_ACTIVITIES deve incluir revisão essencial e correção imediata");
  }
  if (Number(economySrc.match(/DAILY_CHARGES_FREE = (\d+)/)?.[1]) !== 5) {
    fail("DAILY_CHARGES_FREE deve ser 5");
  }
}

// ——— store: Pro não gasta Qi; baús com focus_pass ———
const storeSrc = read("src/lib/store.ts");
if (!storeSrc.includes('"focus_pass"')) {
  fail("store.ts deve suportar recompensa focus_pass nos baús");
}
if (!storeSrc.includes("PRO_CHEST_FOCUS_PASS_CHANCE")) {
  fail("generateChestRewards deve usar PRO_CHEST_FOCUS_PASS_CHANCE");
}
if (!/hasProAccess\(state\)\) return true/.test(storeSrc)) {
  fail("spendQi deve isentar usuários Pro");
}
if (!storeSrc.includes("isPremiumStory")) {
  fail("completeImmersionSession deve rastrear histórias premium");
}

// ——— missões Pro mínimas ———
const missionsSrc = read("src/data/missions.ts");
const proMissionIds = [
  "daily-pro-fix",
  "daily-pro-review",
  "daily-pro-immersion",
  "daily-pro-streak",
  "weekly-pro-xp",
  "weekly-pro-immersion",
  "weekly-pro-story",
];
for (const id of proMissionIds) {
  if (!missionsSrc.includes(`id: "${id}"`)) {
    fail(`missions.ts sem missão Pro "${id}"`);
  }
}
const freeMissionIds = [
  "daily-reviews",
  "daily-fix-errors",
  "daily-immersion",
  "daily-tones",
];
for (const id of freeMissionIds) {
  const block = missionsSrc.slice(missionsSrc.indexOf(`id: "${id}"`), missionsSrc.indexOf(`id: "${id}"`) + 200);
  if (block.includes("pro: true")) {
    fail(`Missão grátis "${id}" não pode ser pro`);
  }
}

// ——— EconomyExplainer nas telas-chave ———
const explainerScreens = [
  "src/features/loja/LojaPage.tsx",
  "src/features/missoes/MissoesPage.tsx",
  "src/features/treino/TreinoPage.tsx",
  "src/features/ligas/LigasPage.tsx",
];
for (const screen of explainerScreens) {
  const text = read(screen);
  if (!text.includes("EconomyExplainer")) {
    fail(`${screen} deve usar EconomyExplainer`);
  }
}

// ——— chestMeta focus_pass ———
const chestMetaSrc = read("src/components/chests/chestMeta.tsx");
if (!chestMetaSrc.includes("focus_pass")) {
  fail("chestMeta.tsx deve documentar focus_pass");
}

// ——— package.json ———
const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["validate:economy"]) {
  fail('package.json sem script "validate:economy"');
}
if (!pkg.scripts?.["validate:beta"]?.includes("validate:economy")) {
  fail("validate:beta deve incluir validate:economy");
}

if (errors.length > 0) {
  console.error("ERRO: validate:economy falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:economy passou.");
