import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

const migrationName = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .find((name) => name.endsWith("_economy_anti_cheat_qi.sql"));
const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";
const store = fs.readFileSync(path.join(root, "src", "lib", "store.ts"), "utf8");
const missions = fs.readFileSync(path.join(root, "src", "data", "missions.ts"), "utf8");

assert(Boolean(migrationName), "migration economy_anti_cheat_qi existe");
assert(/once_per_lesson/i.test(migration), "grant_lesson_reward é once-per-lesson");
assert(
  /v_key := left\('lesson-reward:' \|\| v_lesson, 128\)/i.test(migration),
  "chave de recompensa não inclui attempt_id"
);
assert(
  /economy_verified_mission_metric/i.test(migration) &&
    /client_metric_ignored/i.test(migration),
  "claim_mission ignora métrica do cliente e usa evidência server-side"
);
assert(
  /p_metric_value é ignorado/i.test(migration) || /ignorado de propósito/i.test(migration),
  "comentário anti-cheat explícito em claim_mission"
);
assert(
  /pro', true/i.test(migration) && /consume_charge/i.test(migration),
  "Pro também registra atividade em consume_charge"
);
assert(/SERVER_VERIFIED_MISSION_IDS/.test(missions), "lista de missões verificáveis no cliente");
assert(
  /SERVER_VERIFIED_MISSION_IDS/.test(store) &&
    /Missão ainda sem evidência no servidor/i.test(store),
  "store só paga Qi server-verified e reverte se o servidor rejeitar"
);
assert(
  !/lesson-reward:' \|\| p_lesson_id \|\| ':' \|\| p_attempt_id/i.test(migration),
  "não volta a mintar por attempt_id"
);

if (failures.length) {
  console.error("test:economy-anti-cheat FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: Qi de lição/missão não aceita mentira do cliente.");
