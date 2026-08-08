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
  .find((name) => name.endsWith("_harden_subscription_event_ordering.sql"));
const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";
const webhook = fs.readFileSync(
  path.join(root, "supabase", "functions", "stripe-webhook", "index.ts"),
  "utf8"
);

assert(Boolean(migrationName), "migration harden_subscription_event_ordering existe");
assert(/stripe_event_id text/i.test(migration), "subscriptions ganha stripe_event_id");
assert(/p_event_id text/i.test(migration), "RPC recebe p_event_id");
assert(/terminal_canceled/i.test(migration), "cancelamento no mesmo segundo é terminal");
assert(/duplicate_event/i.test(migration), "mesmo event.id é idempotente");
assert(
  /p_event_created > v_row\.stripe_event_created/i.test(migration),
  "ordem usa created estritamente maior"
);
assert(/p_event_id: eventId/.test(webhook), "webhook envia event.id ao RPC");
assert(
  !/p_event_created >= s\.stripe_event_created/i.test(migration),
  "migration nova não usa >= puro no created"
);

if (failures.length) {
  console.error("test:subscription-event-ordering FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: ordenação composta Stripe preservada.");
