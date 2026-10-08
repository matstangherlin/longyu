#!/usr/bin/env node
/**
 * test:free-tier-guardrails — RC2.3.4A "Longyu must fail cheaply".
 * Exercises every kill switch / threshold in budgetPolicy.ts and asserts the
 * static wiring (Jev purpose + timeout, Stripe webhook truth, Netlify deploy
 * rule, outage fallbacks). Pure: no network, no provider calls.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";
import { netlifyBuildDecision } from "./lib/netlify-deploy-policy.mjs";

const P = tsRequire("../../supabase/functions/_shared/budgetPolicy.ts");
const read = (rel) => fs.readFileSync(rel, "utf8");
let checks = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  checks += 1;
};

// 1. Policy defaults + env can only switch optional spend off; overage never on.
const defaults = P.resolveCostPolicy(() => undefined);
ok(defaults.FREE_TIER_FIRST && !defaults.ALLOW_PAID_OVERAGE, "free tier first, no overage");
ok(!defaults.JEV_RUNTIME_ENABLED, "JEV_RUNTIME_ENABLED=false by default");
ok(!defaults.MARKETING_EMAIL_ENABLED && !defaults.HIGH_VOLUME_REPLAY_ENABLED, "marketing/replay off by default");
const hostile = P.resolveCostPolicy((k) => ({ ALLOW_PAID_OVERAGE: "true", FREE_TIER_FIRST: "false" })[k]);
ok(!hostile.ALLOW_PAID_OVERAGE && hostile.FREE_TIER_FIRST, "env cannot enable paid overage");
const killed = P.resolveCostPolicy((k) => (k === "JEV_DEV_AUDIT_ENABLED" ? "false" : undefined));
ok(!killed.JEV_DEV_AUDIT_ENABLED, "dev-audit kill switch");

// 2. Thresholds.
const lv = (u, l) => P.budgetLevel(u, l);
ok(lv(69, 100) === "GREEN" && lv(70, 100) === "WARN" && lv(85, 100) === "CRITICAL", "70/85 thresholds");
ok(lv(95, 100) === "DEGRADE_NONESSENTIAL" && lv(100, 100) === "EXHAUSTED", "95/100 thresholds");
ok(lv(null, 100) === "UNKNOWN" && lv(5, 0) === "UNKNOWN", "unknown usage is UNKNOWN, not GREEN");

// 3. Degradation order: essential never; optional first; important only when exhausted.
const on = P.resolveCostPolicy((k) => (k.endsWith("_ENABLED") ? "true" : undefined));
for (const cap of Object.keys(P.CAPABILITY_TIER)) {
  const tier = P.CAPABILITY_TIER[cap];
  for (const level of ["GREEN", "WARN", "CRITICAL", "DEGRADE_NONESSENTIAL", "EXHAUSTED", "UNKNOWN"]) {
    const allowed = P.capabilityAllowed(cap, level, on);
    if (tier === "ESSENTIAL") ok(allowed, `${cap} must never degrade (${level})`);
    if (tier === "OPTIONAL") ok(allowed === !["DEGRADE_NONESSENTIAL", "EXHAUSTED"].includes(level), `${cap} @ ${level}`);
    if (tier === "IMPORTANT") ok(allowed === (level !== "EXHAUSTED"), `${cap} @ ${level}`);
  }
}
for (const cap of ["auth_login", "entitlement_truth", "progress_sync", "security_email"]) {
  ok(P.CAPABILITY_TIER[cap] === "ESSENTIAL", `${cap} is ESSENTIAL`);
}
ok(!P.capabilityAllowed("jev_learner_runtime", "GREEN", defaults), "Jev learner runtime off at GREEN");
ok(!P.capabilityAllowed("marketing_email", "GREEN", defaults), "marketing email off at GREEN");
ok(!P.capabilityAllowed("session_replay", "GREEN", defaults), "replay off at GREEN");

// 4. Email: idempotency, dedupe, per-user cap, critical never capped.
const now = 1_000_000_000;
const base = { userId: "u1", now, level: "GREEN", policy: on };
ok(P.decideEmail({ ...base, template: "password_recovery", eventKey: "r1", history: [] }).send, "first recovery mail sends");
const dupHistory = [{ userId: "u1", template: "password_recovery", eventKey: "r1", at: now - 1000 }];
ok(P.decideEmail({ ...base, template: "password_recovery", eventKey: "r1", history: dupHistory }).reason === "DUPLICATE", "same event deduped");
const storm = Array.from({ length: 20 }, (_, i) => ({ userId: "u1", template: "progress_reminder", eventKey: `d${i}`, at: now - i * 1000 }));
ok(P.decideEmail({ ...base, template: "progress_reminder", eventKey: "d99", history: storm }).reason === "USER_RATE_LIMIT", "a bug cannot send 20 reminders");
ok(P.decideEmail({ ...base, template: "security_alert", eventKey: "s1", history: storm }).send, "critical mail not rate-capped");
ok(P.decideEmail({ ...base, template: "marketing_campaign", eventKey: "m1", history: [], policy: defaults }).reason === "POLICY_DISABLED", "marketing disabled");
ok(P.decideEmail({ ...base, template: "onboarding_welcome", eventKey: "o1", history: [], level: "EXHAUSTED" }).reason === "BUDGET_DEGRADED", "important mail off when exhausted");
ok(P.decideEmail({ ...base, template: "confirm_signup", eventKey: "c1", history: [], level: "EXHAUSTED" }).send, "signup confirmation survives exhaustion");

// 5. Jev: stable hash + breaker.
ok(P.stableInputHash({ a: 1, b: [2, 3] }) === P.stableInputHash({ b: [2, 3], a: 1 }), "hash is key-order stable");
ok(P.stableInputHash({ a: 1 }) !== P.stableInputHash({ a: 2 }), "hash discriminates");
const br = P.createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
br.recordFailure(0); br.recordFailure(1);
ok(br.canCall(2), "closed below threshold");
br.recordFailure(3);
ok(!br.canCall(4) && br.state(4) === "OPEN", "opens at threshold");
ok(br.canCall(1003) && br.state(1003) === "HALF_OPEN", "half-open after cooldown");
br.recordFailure(1004);
ok(!br.canCall(1005), "half-open failure reopens");
br.recordSuccess();
ok(br.canCall(1006) && br.state(1006) === "CLOSED", "success closes");

const jev = read("supabase/functions/_shared/jev.ts");
ok(/JEV_TIMEOUT_MS = 3_000/.test(jev), "Jev timeout is short (3 s)");
ok(/purpose: JevPurpose/.test(jev) && /jev_disabled_by_policy/.test(jev), "askJev requires purpose + policy");
ok(/jev_circuit_open/.test(jev), "askJev honours the breaker");
const triage = read("supabase/functions/triage-feedback/index.ts");
ok(/askJev\([^)]*"DEV_AUDIT"\)/.test(triage) && /jevAllowed\("DEV_AUDIT"\)/.test(triage), "triage is DEV_AUDIT and checks the kill switch");
ok(/jevInputHash/.test(triage) && /ai_triaged_at", "is", null/.test(triage), "triage dedupes identical input");
const srcFiles = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) srcFiles.push(p); } };
walk("src");
ok(!srcFiles.some((f) => /typesafe\.ai|askJev|triage-feedback\b/.test(read(f)) && !/feedbackService\.ts$/.test(f)), "no learner runtime path calls Jev");
ok(!srcFiles.some((f) => /VITE_(ALLOW_PAID_OVERAGE|JEV_|TYPESAFE)/.test(read(f))), "security-sensitive cost flags are not VITE_*");

// 6. Netlify: production only on explicit release; previews free.
ok(!netlifyBuildDecision({ context: "production", commitMessage: "fix typo" }).build, "small commit does not publish");
ok(netlifyBuildDecision({ context: "production", commitMessage: "RC2.3.5 [release]" }).build, "[release] publishes");
ok(netlifyBuildDecision({ context: "production", commitMessage: "x", force: "1" }).build, "owner force publishes");
ok(netlifyBuildDecision({ context: "deploy-preview", commitMessage: "x" }).build, "previews always build");
ok(/ignore = "node scripts\/netlify-ignore-build\.mjs"/.test(read("netlify.toml")), "netlify.toml wires the ignore hook");

// 7. Stripe: signed webhook, idempotent by event id, server-side entitlement.
const webhook = read("supabase/functions/stripe-webhook/index.ts");
ok(/constructEventAsync\(/.test(webhook), "webhook signature verified");
ok(/onConflict: "stripe_event_id"/.test(webhook), "webhook idempotent by stripe_event_id");
ok(!srcFiles.some((f) => /from\("subscriptions"\)\s*\.(insert|update|upsert)|is_premium\s*:/.test(read(f))), "client never writes premium/subscription truth");
const ent = read("src/services/entitlementService.ts");
ok(/rpc\("get_server_entitlement"\)/.test(ent), "entitlement read from server RPC");
ok(/transportFailed && snapshot === null && previous/.test(ent), "backend outage keeps the session's entitlement");

// 8. Provider outage ≠ learning outage (static evidence).
ok(/enqueueFeedback/.test(read("src/services/feedbackService.ts")), "feedback queues locally when backend is down");
ok(/Falha do V6 nunca bloqueia a sessão/.test(read("src/features/lesson/LessonPlayer.tsx")), "pedagogy overlay failure never blocks a lesson");

console.log(`PASS test:free-tier-guardrails (${checks} checks)`);
