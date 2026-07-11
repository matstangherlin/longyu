import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

const BLOCKED_METADATA_KEYS = [
  "password",
  "senha",
  "token",
  "secret",
  "email",
  "answer",
  "response",
  "text",
  "feedback",
  "speech",
  "utterance",
  "transcript",
  "typed",
  "input",
  "phrase",
  "sentence",
  "user_answer",
  "student_answer",
  "selectedanswer",
  "correctanswer",
  "useranswer",
];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requirePath(relativePath, label) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) {
    fail(`Falta ${label}: ${relativePath}`);
    return false;
  }
  return true;
}

function walkTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ——— Artefatos obrigatórios ———
requirePath("supabase/migrations/005_analytics_events.sql", "migration analytics");
requirePath("supabase/functions/submit-analytics/index.ts", "edge function submit-analytics");
requirePath("src/services/analyticsService.ts", "analyticsService");
requirePath("src/lib/analytics/events.ts", "catálogo de eventos");
requirePath("src/lib/analytics/sanitize.ts", "sanitização");
requirePath("src/components/analytics/AnalyticsBootstrap.tsx", "AnalyticsBootstrap");

const analyticsService = read("src/services/analyticsService.ts");
for (const token of ["QUEUE_KEY", "MAX_QUEUE", "MAX_SESSION_EVENTS", "BATCH_SIZE", "flushAnalyticsQueue", "shouldLogOnly"]) {
  if (!analyticsService.includes(token)) fail(`analyticsService.ts sem ${token}`);
}
if (!analyticsService.includes('import.meta.env.DEV') && !analyticsService.includes("VITE_ANALYTICS_PERSIST")) {
  fail("analyticsService.ts deve respeitar modo DEV / VITE_ANALYTICS_PERSIST");
}

const sanitizeSrc = read("src/lib/analytics/sanitize.ts");
for (const key of ["password", "email", "feedback", "user_answer", "STEP_MISTAKE_ALLOWED"]) {
  if (!sanitizeSrc.includes(key)) fail(`sanitize.ts deve tratar chave sensível: ${key}`);
}

const eventsSrc = read("src/lib/analytics/events.ts");
const requiredEvents = [
  "landing_viewed",
  "onboarding_completed",
  "lesson_abandoned",
  "step_mistake",
  "pro_offer_shown",
  "checkout_started",
  "sync_failed",
  "app_error",
];
for (const event of requiredEvents) {
  if (!eventsSrc.includes(event)) fail(`events.ts sem evento ${event}`);
}

// ——— Payloads no código: nenhuma chave privada ———
const srcRoot = path.join(root, "src");
if (fs.existsSync(srcRoot)) {
  const files = walkTsFiles(srcRoot);
  const trackPattern = /trackAnalytics\s*\(\s*\{[\s\S]*?metadata\s*:\s*\{([\s\S]*?)\}/g;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes("trackAnalytics") && !text.includes("trackStepMistake")) continue;

    for (const match of text.matchAll(trackPattern)) {
      const metadataBody = match[1].toLowerCase();
      for (const blocked of BLOCKED_METADATA_KEYS) {
        const keyPattern = new RegExp(`\\b${blocked}\\b\\s*:`);
        if (keyPattern.test(metadataBody)) {
          fail(`${path.relative(root, file)}: metadata de analytics contém chave proibida "${blocked}"`);
        }
      }
    }

    if (text.includes("trackStepMistake") && /selectedAnswer|userAnswer|correctAnswer/.test(text)) {
      const stepMistakeCalls = text.match(/trackStepMistake\s*\(\s*\{[\s\S]*?\}\s*\)/g) ?? [];
      for (const call of stepMistakeCalls) {
        if (/selectedAnswer|userAnswer|correctAnswer|password|email|feedback/.test(call)) {
          fail(`${path.relative(root, file)}: trackStepMistake não pode incluir respostas privadas`);
        }
      }
    }
  }
}

// ——— package.json ———
const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["validate:analytics"]) {
  fail('package.json sem script "validate:analytics"');
}
if (!pkg.scripts?.["validate:beta"]?.includes("validate:analytics")) {
  fail("validate:beta deve incluir validate:analytics");
}

if (errors.length > 0) {
  console.error("ERRO: validate:analytics falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:analytics passou.");
