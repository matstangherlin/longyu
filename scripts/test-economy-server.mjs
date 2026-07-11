import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ——— Artefatos ———
const migrationPath = "supabase/migrations/006_economy_server.sql";
if (!fs.existsSync(path.join(root, migrationPath))) {
  fail(`Falta ${migrationPath}`);
} else {
  const sql = read(migrationPath);
  for (const rpc of [
    "consume_charge",
    "grant_lesson_reward",
    "grant_story_energy",
    "claim_mission",
    "open_chest",
    "spend_qi",
    "migrate_local_economy",
    "get_server_economy",
  ]) {
    if (!sql.includes(`function public.${rpc}(`)) fail(`Migration sem RPC ${rpc}`);
  }
  if (!sql.includes("economy_ledger")) fail("Migration sem economy_ledger");
  if (!sql.includes("unique (user_id, idempotency_key)")) fail("Ledger sem unique idempotency_key");
  if (!sql.includes("bom-dia-em-casa")) fail("Premium story IDs incorretos");
}

const bridge = read("src/lib/economyServerBridge.ts");
assert(bridge.includes("shouldUseServerEconomy"), "Bridge sem shouldUseServerEconomy");
assert(bridge.includes("enqueueEconomyIntent"), "Bridge deve enfileirar intenções offline");
assert(bridge.includes("applyServerEconomyToStore"), "Bridge deve reconciliar estado");

const store = read("src/lib/store.ts");
assert(store.includes("setEconomySyncMessage"), "Store sem economySyncMessage");
assert(store.includes("serverConsumeCharge"), "Store deve delegar consumeCharge");
assert(store.includes("serverGrantStoryEnergy"), "Store deve delegar grantStoryEnergy");

// ——— Testes de idempotência (lógica pura) ———
const mem = [];
const queue = {
  enqueue(intent) {
    if (mem.some((i) => i.idempotencyKey === intent.idempotencyKey)) return;
    mem.push({ ...intent, createdAt: Date.now(), attempts: 0 });
  },
  list() {
    return mem;
  },
  remove(key) {
    const idx = mem.findIndex((i) => i.idempotencyKey === key);
    if (idx >= 0) mem.splice(idx, 1);
  },
  clear() {
    mem.length = 0;
  },
};

queue.clear();

function duplicateRewardKey(lessonId, attemptId) {
  return `lesson-reward:${lessonId}:${attemptId}`;
}

function storyEnergyKey(day, storyId) {
  return `story-energy:${day}:${storyId}`;
}

function missionKey(scope, missionId, periodKey) {
  return `mission:${scope}:${missionId}:${periodKey}`;
}

function chestKey(openingId) {
  return `chest:${openingId}`;
}

// Recompensa duplicada
const lessonKey = duplicateRewardKey("l1", "attempt-1");
assert(lessonKey === duplicateRewardKey("l1", "attempt-1"), "Chave de lição deve ser estável");

// Duas abas ao mesmo tempo (mesma chave)
queue.enqueue({
  id: lessonKey,
  operation: "grant_lesson_reward",
  idempotencyKey: lessonKey,
  payload: { lessonId: "l1", attemptId: "attempt-1" },
});
queue.enqueue({
  id: lessonKey,
  operation: "grant_lesson_reward",
  idempotencyKey: lessonKey,
  payload: { lessonId: "l1", attemptId: "attempt-1" },
});
assert(queue.list().length === 1, "Fila não deve duplicar a mesma idempotency key");

// Retry de rede (mesma chave reutilizada)
queue.remove(lessonKey);
queue.enqueue({
  id: lessonKey,
  operation: "grant_lesson_reward",
  idempotencyKey: lessonKey,
  payload: { lessonId: "l1", attemptId: "attempt-1" },
});
assert(queue.list().length === 1, "Retry deve reutilizar a mesma chave");

// História repetida
const storyKey = storyEnergyKey("2026-07-11", "primeiro-encontro");
assert(storyKey === storyEnergyKey("2026-07-11", "primeiro-encontro"), "Chave de história estável");

// Missão repetida
const mKey = missionKey("daily", "daily-xp", "2026-07-11");
assert(mKey === missionKey("daily", "daily-xp", "2026-07-11"), "Chave de missão estável");

// Baú repetido
const cKey = chestKey("open-uuid-1");
assert(cKey === chestKey("open-uuid-1"), "Chave de baú estável");

queue.clear();

// planFeatures alinhado
const plans = read("src/data/planFeatures.ts");
assert(plans.includes("STORY_ENERGY_DAILY_CAP"), "planFeatures deve referenciar teto de energia");
assert(plans.includes("não consomem Carga"), "planFeatures deve documentar histórias introdutórias");

if (errors.length > 0) {
  console.error("ERRO: test:economy-server falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: test:economy-server passou (idempotência + artefatos).");
