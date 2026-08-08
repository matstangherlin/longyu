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
  .find((name) => name.endsWith("_harden_client_reward_claims.sql"));
const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";
const store = fs.readFileSync(path.join(root, "src", "lib", "store.ts"), "utf8");
const storyAttestation = fs.readFileSync(
  path.join(root, "src", "services", "storyEnergyAttestation.ts"),
  "utf8"
);
const immersion = fs.readFileSync(
  path.join(root, "src", "features", "immersion", "ImmersionPage.tsx"),
  "utf8"
);

assert(Boolean(migrationName), "migration harden_client_reward_claims existe");
assert(
  /client_metrics_ignored/i.test(migration) && /attestation_required/i.test(migration),
  "grant_lesson_reward ignora métricas do cliente e exige attestação"
);
assert(
  /economy_eligible_stories/i.test(migration) && /start_story_energy_session/i.test(migration),
  "histórias elegíveis + sessão de energia"
);
assert(
  /league_xp_server_amount/i.test(migration) && /no_server_evidence/i.test(migration),
  "XP de liga deriva amount/evidência no servidor"
);
assert(/daily_xp_cap/i.test(migration), "teto diário soft de XP de liga");
assert(
  /completeReferralLessonAttestation/i.test(store) &&
    /attestation_required/i.test(store),
  "store espera attestação antes do grant de Qi de lição"
);
assert(
  /awaitStoryEnergyAttestation/i.test(store) && /beginStoryEnergyAttestation/i.test(immersion),
  "cliente inicia/espera sessão de energia de história"
);
assert(/start_story_energy_session/i.test(storyAttestation), "helper chama RPC de sessão");

if (failures.length) {
  console.error("test:client-reward-claims FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: recompensas do cliente exigem evidência server-side.");
