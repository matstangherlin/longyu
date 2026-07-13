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

// ——— planFeatures.ts exists and exports core symbols ———
const planFeaturesPath = "src/data/planFeatures.ts";
let planSrc = "";
if (!fs.existsSync(path.join(root, planFeaturesPath))) {
  fail(`Falta ${planFeaturesPath}`);
} else {
  planSrc = read(planFeaturesPath);

  const requiredIds = [
    "jornada",
    "correcao_imediata",
    "cargas",
    "revisao_basica",
    "revisao_ilimitada",
    "erros_detalhados",
    "treino_focado",
    "pinyin_lab",
    "hanzi_lab",
    "imersao",
    "historias_extras",
    "ligas",
    "ligas_estatisticas",
    "missoes_pro",
    "baus_pro",
    "qi_bonus",
    "plano_estudo_inteligente",
    "estatisticas_avancadas",
  ];

  for (const id of requiredIds) {
    if (!planSrc.includes(`id: "${id}"`)) {
      fail(`planFeatures.ts sem feature id "${id}"`);
    }
  }

  const featuresStart = planSrc.indexOf("PLAN_FEATURES");
  const alwaysFree = ["jornada", "correcao_imediata", "revisao_basica", "ligas"];
  for (const id of alwaysFree) {
    const start = planSrc.indexOf(`id: "${id}"`, featuresStart);
    const end = planSrc.indexOf("\n  },", start);
    const block = planSrc.slice(start, end > start ? end : start + 600);
    if (!block.includes("alwaysFree: true")) {
      fail(`Feature "${id}" deve ter alwaysFree: true`);
    }
    if (block.includes("paywallKind:")) {
      fail(`Feature "${id}" não pode ter paywallKind (sempre grátis)`);
    }
  }

  const correcaoStart = planSrc.indexOf('id: "correcao_imediata"', featuresStart);
  const correcao = planSrc.slice(correcaoStart, correcaoStart + 500);
  if (!correcao.includes('plano: "free"')) {
    fail("correcao_imediata deve ser plano free");
  }

  const proOnly = [
    "revisao_ilimitada",
    "erros_detalhados",
    "treino_focado",
    "historias_extras",
    "ligas_estatisticas",
    "missoes_pro",
    "estatisticas_avancadas",
  ];
  for (const id of proOnly) {
    const start = planSrc.indexOf(`id: "${id}"`, featuresStart);
    const block = planSrc.slice(start, start + 300);
    if (!block.includes('plano: "pro"')) {
      fail(`Feature Pro "${id}" deve ter plano: "pro"`);
    }
    if (!block.includes("proBenefit:")) {
      fail(`Feature Pro "${id}" sem proBenefit`);
    }
  }
}

// ——— Paywall CTA padronizado ———
const paywallSrc = read("src/components/pro/ProPaywall.tsx");
if (!paywallSrc.includes("PRO_PAYWALL_CTA")) {
  fail("ProPaywall.tsx deve usar PRO_PAYWALL_CTA de planFeatures");
}
if (!paywallSrc.includes("PRO_PAYWALL_CTA") && !paywallSrc.includes("Ver planos Pro")) {
  fail('ProPaywall.tsx deve ter CTA "Ver planos Pro" (PRO_PAYWALL_CTA)');
}
if (/Pro Preview/i.test(paywallSrc)) {
  fail('ProPaywall.tsx não deve mencionar "Pro Preview"');
}

// ——— ProPage usa matriz ———
const proPageSrc = read("src/features/pro/ProPage.tsx");
for (const token of ["getProPageFreeHighlights", "getProPageProHighlights", "PLAN_FEATURES", "PRO_BENEFIT_GROUPS"]) {
  if (!proPageSrc.includes(token)) {
    fail(`ProPage.tsx deve importar/usar ${token}`);
  }
}
if (/Pro Preview/i.test(proPageSrc)) {
  fail('ProPage.tsx não deve mencionar "Pro Preview"');
}

// ——— Paywalls importam copy central ———
if (!paywallSrc.includes("PAYWALL_COPY")) {
  fail("ProPaywall.tsx deve usar PAYWALL_COPY de planFeatures");
}

const paywallKinds = [
  "energy",
  "errors",
  "weak_spots",
  "story",
  "review",
  "pinyin",
  "hanzi",
  "reports",
  "leagues",
];
if (planSrc) {
  for (const kind of paywallKinds) {
    if (!planSrc.includes(`${kind}:`)) {
      fail(`PAYWALL_COPY sem kind "${kind}"`);
    }
  }
}

// ——— UI pública sem Pro Preview ———
const publicUiGlobs = [
  "src/features",
  "src/components",
];
const previewPattern = /Pro Preview|preview Pro|ativar Pro local/i;
for (const dir of publicUiGlobs) {
  const full = path.join(root, dir);
  for (const file of walk(full)) {
    if (!/\.(tsx|ts)$/.test(file)) continue;
    if (file.includes("SettingsPage.tsx")) continue; // DEV toggle
    const text = fs.readFileSync(file, "utf8");
    if (previewPattern.test(text)) {
      fail(`${path.relative(root, file)} menciona Pro Preview na UI pública`);
    }
  }
}

// ——— Entitlements: preview só em dev ———
const entitlementsSrc = read("src/lib/entitlements.ts");
if (!entitlementsSrc.includes("isDevPreviewAllowed")) {
  fail("entitlements.ts deve exportar isDevPreviewAllowed");
}
if (!entitlementsSrc.includes("VITE_ALLOW_PRO_PREVIEW")) {
  fail("entitlements.ts deve checar VITE_ALLOW_PRO_PREVIEW");
}
if (!/isPreview && isDevPreviewAllowed\(\)/.test(entitlementsSrc)) {
  fail("effectivePremium deve exigir isDevPreviewAllowed para preview local");
}

const storeSrc = read("src/lib/store.ts");
if (!storeSrc.includes("version: 16")) {
  fail("store.ts persist deve estar na versão 16 (recentConversationSceneIds + moduleSkipUsage)");
}
if (!storeSrc.includes("moduleSkipUsage")) {
  fail("store.ts deve persistir moduleSkipUsage");
}
if (!storeSrc.includes("recentConversationSceneIds")) {
  fail("store.ts deve persistir recentConversationSceneIds");
}
if (!storeSrc.includes("reconcileFreePlanEnergy")) {
  fail("store.ts deve reconciliar cargas ao sair do Pro");
}

// ——— package.json script ———
const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["validate:plans"]) {
  fail('package.json sem script "validate:plans"');
}
if (!pkg.scripts?.["test:entitlements"]) {
  fail('package.json sem script "test:entitlements"');
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

if (errors.length > 0) {
  console.error("ERRO: validate:plans falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:plans passou.");
