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
  .find((name) => name.endsWith("_harden_economy_reward_trust.sql"));

assert(Boolean(migrationName), "migration harden_economy_reward_trust existe");

const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";

assert(
  /drop policy if exists "user_economy_insert_own"/i.test(migration) &&
    /drop policy if exists "user_economy_update_own"/i.test(migration),
  "remove policies de escrita em user_economy"
);
assert(
  /drop policy if exists "user_chests_insert_own"/i.test(migration) &&
    /drop policy if exists "user_missions_insert_own"/i.test(migration) &&
    /drop policy if exists "user_achievements_insert_own"/i.test(migration),
  "remove policies de escrita em inventário/missões/conquistas"
);
assert(
  /revoke insert, update, delete on table public\.user_economy from authenticated/i.test(
    migration
  ),
  "revoga INSERT/UPDATE/DELETE de user_economy para authenticated"
);
assert(
  /operation = 'migrate_local_economy'/i.test(migration) &&
    /already_migrated/i.test(migration) &&
    /v_cap_qi/i.test(migration),
  "migrate_local_economy é one-shot com tetos"
);
assert(
  /economy_period_key_acceptable/i.test(migration) &&
    /invalid_period_key/i.test(migration),
  "claim_mission valida period_key"
);
assert(
  /league_source_key_acceptable/i.test(migration) &&
    /daily_event_cap/i.test(migration),
  "add_league_weekly_xp exige source_key conhecido e teto diário"
);
assert(
  /daily_reward_cap/i.test(migration) && /attempt_id inválido/i.test(migration),
  "grant_lesson_reward limita mint diário e attempt_id curto"
);
assert(
  /insert into public\.user_chests/i.test(migration),
  "claim_league_week_reward grava baú no inventário servidor"
);

const smoke = path.join(root, "scripts", "sql", "economy-reward-trust-smoke.sql");
assert(fs.existsSync(smoke), "smoke SQL de economia existe");

if (failures.length) {
  console.error("test:economy-reward-trust FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: economia/liga deixam de aceitar self-award direto.");
