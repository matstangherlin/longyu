/**
 * JEV Wave 1 — production parity & triage certification (pure checkers).
 * Learner runtime must stay OFF. Live deploy is a separate owner mutation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

export function walkSrcTs(dir = path.join(ROOT, "src"), out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSrcTs(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Repo-side guards that live triage-feedback v2 must carry. */
export function checkRepoJevGuards({ jevSource, jevAnswersSource, budgetPolicySource, triageSource, opsSource }) {
  const errors = [];
  const jev = String(jevSource);
  const answers = String(jevAnswersSource ?? "");
  const policy = String(budgetPolicySource);
  const triage = String(triageSource);
  void opsSource;

  if (/VITE_TYPESAFE|VITE_JEV|import\.meta\.env/.test(jev)) errors.push("VITE_TYPESAFE");
  if (!/TYPESAFE_API_KEY/.test(jev) || !/resolveTypesafeApiKey/.test(jev)) errors.push("API_KEY_NOT_SERVER_ONLY");
  if (!/export type JevPurpose/.test(jev)) errors.push("JEV_PURPOSE_MISSING");
  if (!/DEV_AUDIT/.test(jev) || !/LEARNER_RUNTIME/.test(jev)) errors.push("JEV_PURPOSE_MISSING");
  if (!/export function jevAllowed/.test(jev)) errors.push("NO_KILL_SWITCH");
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(policy)) errors.push("LEARNER_RUNTIME_ENABLED");
  if (!/JEV_DEV_AUDIT_ENABLED/.test(policy)) errors.push("NO_KILL_SWITCH");
  if (!/JEV_TIMEOUT_MS\s*=\s*3_000/.test(jev) || !/AbortController/.test(jev)) errors.push("NO_TIMEOUT");
  if (!/createCircuitBreaker\(/.test(jev) || !/failureThreshold:\s*3/.test(jev) || !/cooldownMs:\s*60_000/.test(jev)) {
    errors.push("NO_BREAKER");
  }
  if (!/jev_circuit_open/.test(jev)) errors.push("NO_BREAKER");
  if (!/jevInputHash|stableInputHash/.test(jev)) errors.push("NO_DEDUPE");
  if (!/jevInputHash\(/.test(triage) || !/inFlight/.test(triage)) errors.push("NO_DEDUPE");
  if (!/\.eq\("message"/.test(triage) || !/\.eq\("category"/.test(triage) || !/\.eq\("route"/.test(triage)) {
    errors.push("HISTORICAL_REUSE_NOT_EXACT");
  }
  if (!/BATCH_LIMIT\s*=\s*25\b/.test(triage)) errors.push("NO_BATCH_CAP");
  if (!/CONCURRENCY\s*=\s*5\b/.test(triage)) errors.push("NO_CONCURRENCY_CAP");
  if (!/is_beta_admin/.test(triage)) errors.push("ADMIN_CHECK_REMOVED");
  if (!/Authorization/.test(triage)) errors.push("ADMIN_CHECK_REMOVED");
  if (!/jevAllowed\("DEV_AUDIT"\)/.test(triage)) errors.push("NO_KILL_SWITCH");
  if (!/askJev\([^)]*"DEV_AUDIT"\)/.test(triage)) errors.push("LEARNER_RUNTIME_ENABLED");
  if (!/validateJevAnswers\(questions,\s*body\.answers\)/.test(jev)) errors.push("MALFORMED_RESPONSE_ACCEPTED");
  if (!/export function validateJevAnswers/.test(answers) || !/jev_bad_choice/.test(answers)) {
    errors.push("MALFORMED_RESPONSE_ACCEPTED");
  }
  if (!/out\.ALLOW_PAID_OVERAGE\s*=\s*false/.test(policy)) errors.push("PAID_OVERAGE_ENABLED");
  if (/ALLOW_PAID_OVERAGE:\s*true/.test(policy)) errors.push("PAID_OVERAGE_ENABLED");
  if (!/501/.test(triage) || !/TYPESAFE_API_KEY não configurada/.test(triage)) errors.push("MISSING_SECRET_NOT_CONTROLLED");
  if (!/catch \(err\)/.test(triage) || !/failures\.push/.test(triage)) errors.push("FEEDBACK_LOST_ON_JEV_FAILURE");
  if (!/\.is\("ai_triaged_at", null\)/.test(triage)) errors.push("SAME_ROW_RETRIAGED");
  if (/console\.(log|info|debug)\([^)]*TYPESAFE_API_KEY|console\.(log|info).*apiKey/.test(jev + triage)) {
    errors.push("SECRET_PRINTED");
  }
  if (/return json\([^)]*serviceRole|service_role.*json\(/.test(triage)) errors.push("SERVICE_ROLE_RETURNED");
  return [...new Set(errors)];
}

export function checkLearnerRuntimeOff({ budgetPolicySource, featureFlags, clientSources }) {
  const errors = [];
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(String(budgetPolicySource))) errors.push("LEARNER_RUNTIME_ENABLED");
  if (/JEV_LEARNER_RUNTIME\s*=\s*true|JEV_RUNTIME_ENABLED\s*=\s*true/.test(String(featureFlags ?? ""))) {
    errors.push("LEARNER_RUNTIME_ENABLED");
  }
  for (const f of clientSources ?? []) {
    const text = typeof f === "string" ? f : f.text;
    const file = typeof f === "string" ? "" : f.file;
    if (/api\.typesafe\.ai|TYPESAFE_API_KEY|VITE_TYPESAFE|VITE_JEV|\baskJev\b|_shared\/jev/.test(text)) {
      if (!/feedbackService\.ts$/.test(file)) errors.push("CLIENT_CALLS_SYSTEM_ONE");
    }
  }
  return [...new Set(errors)];
}

export function checkFeedbackFailOpen({ feedbackServiceSource, triageSource }) {
  const errors = [];
  const fb = String(feedbackServiceSource);
  const triage = String(triageSource);
  // Learner submit must not invoke triage. Admin may call triagePendingFeedback separately.
  const submitFn = fb.match(/export async function submitFeedback[\s\S]*?(?=\nexport (?:async )?function |\nexport interface )/);
  if (!submitFn || /triage-feedback|triagePendingFeedback|askJev|typesafe\.ai/.test(submitFn[0])) {
    errors.push("TRIAGE_BLOCKS_FEEDBACK_SUBMISSION");
  }
  if (!/enqueueFeedback/.test(fb) || !/submit_beta_feedback/.test(fb)) {
    errors.push("TRIAGE_BLOCKS_FEEDBACK_SUBMISSION");
  }
  if (!/catch \(err\)/.test(triage)) errors.push("FEEDBACK_LOST_ON_JEV_FAILURE");
  return [...new Set(errors)];
}

export function checkLiveParity({ parity }) {
  const errors = [];
  if (!parity) return ["REPO_LIVE_PARITY_FALSE_PASS"];
  if (parity.parity === "PASS" && parity.deploymentRequired === true) errors.push("REPO_LIVE_PARITY_FALSE_PASS");
  if (parity.parity === "PASS" && (parity.missingGuards ?? []).length > 0) errors.push("REPO_LIVE_PARITY_FALSE_PASS");
  // Only after a claimed PASS/certification can "live older than target" kill.
  if (
    (parity.parity === "PASS" || parity.certified === true) &&
    parity.liveVersion != null &&
    parity.targetLiveVersion != null &&
    Number(parity.liveVersion) < Number(parity.targetLiveVersion)
  ) {
    errors.push("LIVE_OLDER_THAN_CERTIFIED_TARGET");
  }
  if (parity.parity === "PASS") {
    if (!(parity.liveHash && parity.repoFunctionHash && parity.liveHash === parity.repoFunctionHash)) {
      errors.push("REPO_LIVE_PARITY_FALSE_PASS");
    }
  }
  return [...new Set(errors)];
}

export function checkAtomurusUntouched({ sources }) {
  const errors = [];
  for (const text of sources ?? []) {
    if (/\bAtomurus\b|\batomurus\b/.test(String(text))) errors.push("ATOMURUS_TOUCHED");
  }
  return [...new Set(errors)];
}

export function loadDefaultSources() {
  return {
    jevSource: readRepo("supabase/functions/_shared/jev.ts"),
    jevAnswersSource: readRepo("supabase/functions/_shared/jevAnswers.ts"),
    budgetPolicySource: readRepo("supabase/functions/_shared/budgetPolicy.ts"),
    triageSource: readRepo("supabase/functions/triage-feedback/index.ts"),
    opsSource: readRepo("supabase/functions/_shared/opsCorrelation.ts"),
    feedbackServiceSource: readRepo("src/services/feedbackService.ts"),
    featureFlags: readRepo("docs/release/feature-flags.json"),
    clientSources: walkSrcTs().map((file) => ({ file, text: fs.readFileSync(file, "utf8") })),
  };
}
