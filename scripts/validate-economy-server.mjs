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

if (!fs.existsSync(path.join(root, "supabase/migrations/006_economy_server.sql"))) {
  fail("Falta supabase/migrations/006_economy_server.sql");
}

const sql = read("supabase/migrations/006_economy_server.sql");
for (const token of [
  "economy_ledger",
  "consume_charge",
  "grant_lesson_reward",
  "grant_story_energy",
  "claim_mission",
  "open_chest",
  "spend_qi",
  "migrate_local_economy",
  "idempotency_key",
  "auth.uid()",
]) {
  if (!sql.includes(token)) fail(`006_economy_server.sql sem ${token}`);
}

const bridge = read("src/lib/economyServerBridge.ts");
for (const token of ["shouldUseServerEconomy", "flushEconomyIntentQueue", "serverMigrateLocalEconomy"]) {
  if (!bridge.includes(token)) fail(`economyServerBridge.ts sem ${token}`);
}

const store = read("src/lib/store.ts");
if (!store.includes("economySyncMessage")) fail("store.ts sem economySyncMessage");
if (!store.includes("shouldUseServerEconomy")) fail("store.ts não delega economia ao servidor");

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["test:economy-server"]) fail("package.json sem test:economy-server");

if (errors.length > 0) {
  console.error("ERRO: validate:economy-server falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:economy-server passou.");
