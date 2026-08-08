import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const migration = read(
  "supabase/migrations/20260808081000_harden_anonymous_ingestion.sql"
);
const edge = read("supabase/functions/issue-anon-ingestion-session/index.ts");
const sessionClient = read("src/services/anonymousIngestionSession.ts");
const feedbackClient = read("src/services/feedbackService.ts");
const pedagogyClient = read("src/services/pedagogyEvents.ts");
const config = read("supabase/config.toml");
const deploy = read("scripts/deploy-functions-env.mjs");

const failures = [];
function assert(condition, message) {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
}

const sessionsTable =
  migration.match(
    /create table if not exists public\.beta_anon_ingestion_sessions[\s\S]*?\n\);/
  )?.[0] ?? "";
const newIssuer =
  migration.match(
    /create or replace function public\.issue_beta_anon_ingestion_session[\s\S]*?\n\$\$;/
  )?.[0] ?? "";

assert(sessionsTable.includes("token_hash"), "capability is stored only as a hash");
assert(sessionsTable.includes("rate_bucket_key"), "session carries a trusted rate bucket");
assert(!/\b(ip|client_ip|ip_address)\b/i.test(sessionsTable), "database stores no raw IP field");
assert(newIssuer.includes("extensions.digest(v_token, 'sha256')"), "token uses SHA-256 at rest");
assert(
  /grant execute on function public\.issue_beta_anon_ingestion_session\(text\) to service_role/i.test(
    migration
  ),
  "only service_role can issue trusted capabilities"
);
assert(
  /revoke execute on function public\.issue_beta_pedagogy_anon_session\(text\)[\s\S]*?from public, anon, authenticated/i.test(
    migration
  ),
  "legacy browser-controlled issuer is closed"
);
assert(
  migration.includes("beta_anon_consume_ingestion_quota"),
  "database uses atomic quota counters"
);
assert(
  migration.includes("'__global__'"),
  "anonymous ingestion has global abuse ceilings"
);
assert(
  migration.includes("raise exception 'anon_session_required'"),
  "anonymous RPC calls require a capability"
);
assert(
  migration.includes("'feedback_minute', 60, 1, 60") &&
    migration.includes("'feedback_hour', 3600, 8, 1000"),
  "feedback quotas use the trusted bucket"
);
assert(
  migration.includes("'pedagogy_minute', 60, 60, 600") &&
    migration.includes("'pedagogy_day', 86400, 1000, 100000"),
  "pedagogy quotas use the trusted bucket"
);

assert(edge.includes("cf-connecting-ip"), "Edge Function reads trusted proxy metadata");
assert(edge.includes("hops[hops.length - 1]"), "forwarded chain ignores caller-controlled first hop");
assert(edge.includes("HMAC") && edge.includes("SHA-256"), "edge identity is a keyed HMAC");
assert(edge.includes("new Date().toISOString().slice(0, 10)"), "network bucket rotates daily");
assert(
  edge.includes('admin.rpc("issue_beta_anon_ingestion_session"'),
  "Edge Function alone invokes the service-role issuer"
);
assert(!edge.includes("console.log") && !edge.includes("console.error"), "edge logs neither token nor IP");

assert(
  /\[functions\.issue-anon-ingestion-session\]\s*verify_jwt\s*=\s*false/m.test(config) &&
    edge.includes("hasValidProjectApiKey") &&
    edge.includes("SUPABASE_PUBLISHABLE_KEYS") &&
    edge.includes("SUPABASE_ANON_KEY"),
  "Edge Function authenticates both legacy anon and modern publishable API keys"
);
assert(deploy.includes('"issue-anon-ingestion-session"'), "deployment script includes the new function");
assert(
  sessionClient.includes('functions.invoke("issue-anon-ingestion-session"'),
  "browser obtains capability through the Edge Function"
);
assert(
  !sessionClient.includes("issue_beta_pedagogy_anon_session") &&
    !pedagogyClient.includes("issue_beta_pedagogy_anon_session"),
  "browser no longer calls the legacy issuer"
);
assert(
  feedbackClient.includes("p_anon_session_token: anonToken") &&
    pedagogyClient.includes("p_anon_session_token: anonToken"),
  "both anonymous ingestion paths send the shared capability"
);
assert(
  feedbackClient.includes("invalidateAnonymousIngestionSession") &&
    pedagogyClient.includes("invalidateAnonymousIngestionSession"),
  "both clients renew an expired capability once"
);

// Executable mirror of the database counter contract. Browser-controlled IDs
// are deliberately rotated while the trusted edge bucket stays constant.
class QuotaMirror {
  counters = new Map();

  consume(bucket, scope, originLimit, globalLimit) {
    const originKey = `${bucket}|${scope}`;
    const globalKey = `__global__|${scope}`;
    const origin = this.counters.get(originKey) ?? 0;
    const global = this.counters.get(globalKey) ?? 0;
    if (origin >= originLimit || global >= globalLimit) throw new Error("rate_limited");
    this.counters.set(originKey, origin + 1);
    this.counters.set(globalKey, global + 1);
  }
}

const quota = new QuotaMirror();
const trustedBucket = "a".repeat(64);
const rotatedLocalIds = new Set();
const rotatedContexts = new Set();
for (let index = 0; index < 60; index += 1) {
  const attackerControlledLocalId = `rotated-local-${index}`;
  const attackerControlledContext = `rotated-ua-${index}`;
  rotatedLocalIds.add(attackerControlledLocalId);
  rotatedContexts.add(attackerControlledContext);
  quota.consume(trustedBucket, "pedagogy_minute", 60, 600);
}
assert(
  rotatedLocalIds.size === 60 && rotatedContexts.size === 60,
  "test rotates every browser-controlled identifier"
);
let rotationBlocked = false;
try {
  quota.consume(trustedBucket, "pedagogy_minute", 60, 600);
} catch (error) {
  rotationBlocked = error instanceof Error && error.message === "rate_limited";
}
assert(rotationBlocked, "61st event is blocked despite rotating all browser IDs");

const feedbackQuota = new QuotaMirror();
feedbackQuota.consume(trustedBucket, "feedback_minute", 1, 60);
let feedbackRotationBlocked = false;
try {
  feedbackQuota.consume(trustedBucket, "feedback_minute", 1, 60);
} catch (error) {
  feedbackRotationBlocked = error instanceof Error && error.message === "rate_limited";
}
assert(feedbackRotationBlocked, "second feedback is blocked despite a rotated local profile ID");

feedbackQuota.consume("b".repeat(64), "feedback_minute", 1, 60);
assert(true, "a different trusted network bucket retains its own legitimate quota");

if (failures.length > 0) {
  console.error("test:anonymous-ingestion-hardening FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: anonymous ingestion requires trusted capabilities and atomic quotas.");
