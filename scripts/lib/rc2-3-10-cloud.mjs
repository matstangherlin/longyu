/**
 * RC2.3.10 — Cloud Launch Certification: pure rules.
 *
 * Every function here is pure (inputs in, verdict out) so the mutation suite
 * in scripts/rc2-3-10-cloud-certification.mjs can prove each rule bites.
 * Nothing here reads production; production facts arrive through the
 * committed snapshot (docs/launch/production-snapshot.json).
 */
import { createHash } from "node:crypto";
import { CLOUD_REQUIRED_GATES, STATUS, worstOf } from "./product-truth.mjs";

/** One vocabulary, one gate list: both live in scripts/lib/product-truth.mjs. */
export { STATUS, worstOf };

// ---------------------------------------------------------------------------
// Migration ledger
// ---------------------------------------------------------------------------

export const LEDGER_STATES = ["MATCH", "LEGACY_EQUIVALENT", "PROD_ONLY", "REPO_ONLY", "UNKNOWN"];

/** Same normalization as the production read (see snapshot.migrationHashMethod). */
export function normalizedMigrationHash(sql) {
  const normalized = String(sql).replace(/--[^\n]*/g, "").replace(/[\s;]+/g, "");
  return createHash("md5").update(normalized, "utf8").digest("hex");
}

const EMPTY_MD5 = "d41d8cd98f00b204e9800998ecf8427e";

/** File stem without the legacy NNN_ or timestamp_ prefix. */
export function migrationStem(file) {
  return String(file).replace(/^.*\//, "").replace(/\.sql$/, "").replace(/^(\d{3}|\d{14})_/, "");
}

/**
 * Production rows → repo files. MATCH needs equal normalized content; a name
 * match with different content is UNKNOWN (never assumed equivalent); a row
 * whose applied SQL is only a placeholder is UNKNOWN too — its real SQL ran
 * outside the history table.
 */
export function buildMigrationLedger({ production, repo }) {
  const byHash = new Map();
  for (const file of repo) {
    if (!byHash.has(file.hash)) byHash.set(file.hash, []);
    byHash.get(file.hash).push(file.file);
  }
  const used = new Set();
  const entries = [];
  for (const row of production) {
    const placeholder = Boolean(row.placeholderText) || row.normalizedMd5 === EMPTY_MD5;
    const exact = !placeholder ? (byHash.get(row.normalizedMd5) ?? []) : [];
    const candidates = repo.filter((file) => migrationStem(file.file) === row.name || migrationStem(file.file) === migrationStem(row.name));
    let state;
    let repoFile = null;
    let evidence;
    let action;
    if (exact.length === 1) {
      state = "MATCH";
      repoFile = exact[0];
      evidence = `normalized content md5 ${row.normalizedMd5} equals ${repoFile}`;
      action = "none";
    } else if (placeholder) {
      state = "UNKNOWN";
      repoFile = candidates[0]?.file ?? null;
      evidence = `history row is a placeholder (${row.length} chars): real SQL was applied outside supabase_migrations`;
      action = "prove the objects it stands for by object-level diff (OA-SCHEMA-DIFF); never re-run or repair blindly";
    } else if (candidates.length) {
      state = "UNKNOWN";
      repoFile = candidates[0].file;
      evidence = `name matches ${repoFile} but normalized content differs (prod ${row.normalizedMd5} vs repo ${candidates[0].hash})`;
      action = "diff the applied SQL against the repo file before calling it equivalent";
    } else {
      state = "PROD_ONLY";
      evidence = "no repo file with this name or content";
      action = "trace the change; add it to the repo or document why production carries it";
    }
    if (repoFile && state === "MATCH") used.add(repoFile);
    entries.push({ version: row.version, name: row.name, repoFile, state, normalizedMd5: row.normalizedMd5, evidence, action });
  }
  const accounted = new Set([...used, ...entries.map((e) => e.repoFile).filter(Boolean)]);
  for (const file of repo) {
    if (accounted.has(file.file)) continue;
    entries.push({
      version: null,
      name: migrationStem(file.file),
      repoFile: file.file,
      state: "REPO_ONLY",
      normalizedMd5: file.hash,
      evidence: "no production history row with this name or content",
      action: /^\d{3}_/.test(migrationStem(file.file)) || /^\d{3}_/.test(file.file.replace(/^.*\//, ""))
        ? "pre-history baseline file: confirm its objects exist in production (schema diff) before treating as applied"
        : "pending for production: apply only through PRODUCTION_MIGRATION_READY",
    });
  }
  return entries;
}

export function summarizeLedger(entries) {
  const byState = Object.fromEntries(LEDGER_STATES.map((s) => [s, entries.filter((e) => e.state === s).length]));
  const reconciled = byState.UNKNOWN === 0 && byState.PROD_ONLY === 0 && entries.every((e) => e.state !== "REPO_ONLY" || e.plan);
  return { byState, status: reconciled ? "PASS" : "BLOCKED" };
}

/** @returns {string[]} error codes */
export function checkMigrationLedger(ledger, { production, repo }) {
  const errors = [];
  const entries = ledger?.entries ?? [];
  for (const e of entries) if (!LEDGER_STATES.includes(e.state)) errors.push(`UNKNOWN_STATE:${e.name}`);
  const matched = entries.filter((e) => e.state === "MATCH").map((e) => e.repoFile);
  if (new Set(matched).size !== matched.length) errors.push("DUPLICATE_MAPPING");
  const hashOf = new Map(repo.map((f) => [f.file, f.hash]));
  for (const e of entries.filter((x) => x.state === "MATCH")) {
    const row = production.find((p) => p.name === e.name && p.version === e.version);
    if (!row || hashOf.get(e.repoFile) !== row.normalizedMd5) errors.push(`MATCH_WITHOUT_EQUAL_CONTENT:${e.name}`);
  }
  for (const row of production) if (!entries.some((e) => e.version === row.version && e.name === row.name)) errors.push(`PRODUCTION_ROW_MISSING:${row.name}`);
  for (const file of repo) if (!entries.some((e) => e.repoFile === file.file)) errors.push(`REPO_FILE_MISSING:${file.file}`);
  const summary = summarizeLedger(entries);
  if (ledger?.status === "PASS" && summary.status !== "PASS") errors.push("FALSE_PASS:ledger");
  return errors;
}

// ---------------------------------------------------------------------------
// Cloud matrix
// ---------------------------------------------------------------------------

export const REQUIRED_GATES = CLOUD_REQUIRED_GATES;

/** Gates whose PASS is only ever a person's signature. */
export const OWNER_ONLY_GATES = ["OWNER_CLOUD_ACCEPTANCE"];

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_EVIDENCE_AGE_DAYS = 30;

/** @returns {string[]} error codes */
export function checkCloudMatrix(matrix) {
  const errors = [];
  const gates = matrix?.gates ?? {};
  const generatedAt = Date.parse(matrix?.generatedAt ?? "");
  for (const id of REQUIRED_GATES) if (!gates[id]) errors.push(`MISSING_GATE:${id}`);
  for (const [id, gate] of Object.entries(gates)) {
    if (!STATUS.includes(gate.status)) errors.push(`STATUS_VOCABULARY:${id}=${gate.status}`);
    if (gate.status === "PASS" && !(Array.isArray(gate.evidence) && gate.evidence.length)) errors.push(`FALSE_PASS:${id}`);
    if (OWNER_ONLY_GATES.includes(id) && gate.status === "PASS" && !gate.ownerSignature) errors.push(`OWNER_ACCEPTANCE_AUTO:${id}`);
    if (gate.status === "PASS" && gate.readAt && Number.isFinite(generatedAt)) {
      const age = (generatedAt - Date.parse(gate.readAt)) / DAY_MS;
      if (!(age <= MAX_EVIDENCE_AGE_DAYS)) errors.push(`STALE_EVIDENCE:${id}`);
    }
  }
  // Provenance: a verified surface must carry the certified SHA.
  const certified = matrix?.provenance?.certifiedSha ?? null;
  for (const row of matrix?.provenance?.surfaces ?? []) {
    if (row.verified === "PASS" && (!certified || !row.sha || !String(certified).startsWith(String(row.sha).slice(0, 7)) || !String(row.sha).startsWith(String(certified).slice(0, 7)))) {
      errors.push(`INVALID_RELEASE_EVIDENCE:${row.surface}`);
    }
  }
  const overall = overallCloud(matrix);
  if (matrix?.overall === "PASS" && overall !== "PASS") errors.push("FALSE_PASS:overall");
  return errors;
}

/** Every evidence path a gate cites must exist (no gate may point at a report never written). */
export function checkEvidenceFiles(matrix, exists) {
  const errors = [];
  for (const [id, gate] of Object.entries(matrix?.gates ?? {})) {
    for (const ref of gate.evidence ?? []) {
      if (/^[\w.-]+(\/[\w.-]+)+$/.test(ref) && !exists(ref)) errors.push(`MISSING_CLOUD_EVIDENCE:${id}:${ref}`);
    }
  }
  return errors;
}

/** Cloud certification is PASS only when every required gate is PASS. */
export function overallCloud(matrix) {
  const gates = matrix?.gates ?? {};
  return worstOf(REQUIRED_GATES.map((id) => gates[id]?.status ?? "NOT_RUN"));
}

// ---------------------------------------------------------------------------
// PRODUCTION_MIGRATION_READY — the single authority for any production migration
// ---------------------------------------------------------------------------

export const MIGRATION_READINESS_STEPS = [
  ["candidateSha", "SHA candidato conhecido"],
  ["schemaDiff", "schema diff atual (≤ 7 dias)"],
  ["ledgerReconciled", "ledger de migrations reconciliado"],
  ["backupVerified", "export/backup verificado"],
  ["reviewed", "migration revisada"],
  ["downStrategy", "down strategy ou nota de irreversibilidade"],
  ["ownerApproval", "aprovação do owner"],
];

/**
 * Fail closed: missing evidence is a blocker, never a default PASS. Steps 8–11
 * (apply, advisors, smoke, Product Truth refresh) are the post-apply checklist
 * and are reported, not pre-conditions.
 */
export function productionMigrationReady(request, now = Date.now()) {
  const blockers = [];
  const r = request ?? {};
  if (!/^[0-9a-f]{40}$/.test(String(r.candidateSha ?? ""))) blockers.push("candidateSha");
  const diffAge = (now - Date.parse(r.schemaDiff?.readAt ?? "")) / DAY_MS;
  if (!(r.schemaDiff?.status === "PASS" && diffAge <= 7 && diffAge >= 0)) blockers.push("schemaDiff");
  if (r.ledger?.status !== "PASS") blockers.push("ledgerReconciled");
  if (!(r.backup?.verified === true && r.backup?.sourceProject && r.backup?.takenAt)) blockers.push("backupVerified");
  if (!(r.review?.reviewer && r.review?.migrations?.length)) blockers.push("reviewed");
  if (!(r.down?.strategy || r.down?.irreversibleNote)) blockers.push("downStrategy");
  if (!(r.ownerApproval?.by && r.ownerApproval?.at)) blockers.push("ownerApproval");
  return {
    status: blockers.length ? "BLOCKED" : "PASS",
    blockers,
    postApply: ["apply", "advisors", "cloudSmoke", "productTruthRefresh"],
  };
}

// ---------------------------------------------------------------------------
// Artifact provenance + bundle secrets
// ---------------------------------------------------------------------------

/** Secret shapes that must never reach a shipped bundle. */
export const BUNDLE_SECRET_PATTERNS = [
  ["SUPABASE_SERVICE_ROLE_JWT", (text) => jwtsWithRole(text, "service_role").length > 0],
  ["SUPABASE_SECRET_KEY", (text) => /\bsb_secret_[A-Za-z0-9_-]{16,}/.test(text)],
  ["POSTGRES_CONNECTION_STRING", (text) => /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`@]+@/.test(text)],
  ["STRIPE_SECRET_KEY", (text) => /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/.test(text)],
  ["RESEND_API_KEY", (text) => /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/.test(text)],
  ["SENTRY_AUTH_TOKEN", (text) => /\bsntrys_[A-Za-z0-9+/=_-]{20,}/.test(text)],
  ["JEV_CLIENT_CALL", (text) => /api\.typesafe\.ai/.test(text)],
  ["SECRET_ENV_NAME", (text) => /\b(TYPESAFE_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SMTP_PASS(?:WORD)?|SENTRY_AUTH_TOKEN|TURNSTILE_SECRET_KEY|STRIPE_SECRET_KEY)\b/.test(text)],
];

function jwtsWithRole(text, role) {
  const out = [];
  for (const match of String(text).matchAll(/eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      if (payload?.role === role) out.push(match[0]);
    } catch {
      /* not a JWT */
    }
  }
  return out;
}

/**
 * @param {{ versionJson: object, expectedSha: string, expectedFingerprint: string, files: Record<string,string> }} input
 * @returns {string[]} error codes
 */
export function checkArtifactProvenance({ versionJson, expectedSha, expectedFingerprint, files }) {
  const errors = [];
  const v = versionJson ?? {};
  if (!/^[0-9a-f]{40}$/.test(String(v.commitSha ?? ""))) errors.push("ARTIFACT_SHA_MISSING");
  else if (expectedSha && v.commitSha !== expectedSha) errors.push("WRONG_SHA");
  if (!/^[0-9a-f]{12}$/.test(String(v.curriculumFingerprint ?? ""))) errors.push("ARTIFACT_FINGERPRINT_MISSING");
  else if (expectedFingerprint && v.curriculumFingerprint !== expectedFingerprint) errors.push("WRONG_FINGERPRINT");
  if (!["dev", "internal", "closed", "production"].includes(v.buildChannel)) errors.push("ARTIFACT_CHANNEL_MISSING");
  if (v.buildChannel === "production") {
    if (v.deviceQaBuild === true) errors.push("QA_FLAG_IN_PRODUCTION");
    if (v.testFixtures === true) errors.push("TEST_FIXTURES_IN_PRODUCTION");
  }
  for (const [file, text] of Object.entries(files ?? {})) {
    for (const [code, test] of BUNDLE_SECRET_PATTERNS) if (test(text)) errors.push(`SECRET_IN_BUNDLE:${code}:${file}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Turnstile / Jev static guarantees
// ---------------------------------------------------------------------------

/** create-account must fail closed without the secret; skip only with TURNSTILE_ALLOW_SKIP=1. */
export function checkTurnstileFailClosed(createAccountSource, productionConfigs) {
  const errors = [];
  const src = String(createAccountSource);
  if (!/captcha_unavailable/.test(src)) errors.push("TURNSTILE_NOT_FAIL_CLOSED");
  if (!/TURNSTILE_ALLOW_SKIP"\)\?\.trim\(\) === "1"/.test(src)) errors.push("TURNSTILE_SKIP_NOT_EXPLICIT");
  if (/allowSkip\s*=\s*true|TURNSTILE_ALLOW_SKIP"\)\s*!==/.test(src)) errors.push("TURNSTILE_SKIP_DEFAULT_ON");
  for (const [file, text] of Object.entries(productionConfigs ?? {})) {
    if (/TURNSTILE_ALLOW_SKIP\s*[=:]\s*["']?1/.test(String(text))) errors.push(`TURNSTILE_SKIP_IN_PRODUCTION_CONFIG:${file}`);
  }
  return errors;
}

/** Repo Jev guardrails that the production triage-feedback must carry. */
export function checkJevGuardrails({ jevSource, budgetPolicySource, triageSource }) {
  const errors = [];
  const jev = String(jevSource);
  const policy = String(budgetPolicySource);
  const triage = String(triageSource);
  if (!/JEV_TIMEOUT_MS\s*=\s*\d/.test(jev) || !/AbortController/.test(jev)) errors.push("JEV_TIMEOUT_MISSING");
  if (!/createCircuitBreaker\(/.test(jev) || !/jev_circuit_open/.test(jev)) errors.push("JEV_CIRCUIT_BREAKER_MISSING");
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(policy)) errors.push("JEV_RUNTIME_ENABLED_BY_DEFAULT");
  if (!/out\.ALLOW_PAID_OVERAGE\s*=\s*false/.test(policy)) errors.push("PAID_OVERAGE_NOT_FORCED_OFF");
  if (!/jevAllowed\("DEV_AUDIT"\)/.test(triage)) errors.push("JEV_KILL_SWITCH_MISSING");
  if (!/BATCH_LIMIT\s*=\s*\d+/.test(triage)) errors.push("JEV_BATCH_CAP_MISSING");
  if (!/jevInputHash\(/.test(triage)) errors.push("JEV_DEDUPE_MISSING");
  if (!/is_beta_admin/.test(triage)) errors.push("JEV_TRIAGE_NOT_ADMIN_ONLY");
  if (!/resolveTypesafeApiKey/.test(jev) || /VITE_/.test(jev)) errors.push("JEV_KEY_NOT_SERVER_ONLY");
  return errors;
}
