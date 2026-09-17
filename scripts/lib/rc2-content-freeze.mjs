/**
 * V4.11A.3 / RC2.1 — Content freeze guard.
 *
 * After Atlas closure, curriculum identity is frozen. Any drift in core
 * Mandarin counts, culture catalog size, Journey culture nodes, or fingerprint
 * fails unless an explicit unfreeze is documented.
 */

import fs from "node:fs";
import path from "node:path";

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

const EXPECTED = {
  freeze: "RC2_CONTENT_FREEZE",
  fingerprint: "516692632525",
  lessons: 134,
  teachingTopics: 113,
  cultureItems: 30,
  cultureNative: 30,
  journeyCultureNodes: 20,
  historyItems: 6,
};

export function validateRc2ContentFreeze(data = {}) {
  const { fail, failures } = failList();
  const freeze = data.freeze ?? {};
  const fingerprint = data.fingerprint;
  const counts = data.counts ?? {};
  const culture = data.culture ?? {};

  if (freeze.CURRICULUM_FREEZE !== EXPECTED.freeze) {
    fail("FREEZE_LABEL", "curriculumFreeze", `esperado ${EXPECTED.freeze}, got ${freeze.CURRICULUM_FREEZE}`);
  }
  if (freeze.RC_BASE_FINGERPRINT !== EXPECTED.fingerprint) {
    fail("FREEZE_FINGERPRINT", "curriculumFreeze", `esperado ${EXPECTED.fingerprint}, got ${freeze.RC_BASE_FINGERPRINT}`);
  }
  if (fingerprint && fingerprint !== EXPECTED.fingerprint) {
    fail("FINGERPRINT_DRIFT", "journey", `computed ${fingerprint} ≠ frozen ${EXPECTED.fingerprint}`);
  }
  if (counts.lessons !== EXPECTED.lessons) {
    fail("LESSON_COUNT", "journey", `${counts.lessons} ≠ ${EXPECTED.lessons}`);
  }
  if (counts.teachingTopics !== EXPECTED.teachingTopics) {
    fail("TOPIC_COUNT", "journey", `${counts.teachingTopics} ≠ ${EXPECTED.teachingTopics}`);
  }
  if (Number.isFinite(culture.items) && culture.items !== EXPECTED.cultureItems) {
    fail("CULTURE_ITEMS", "culture", `${culture.items} ≠ ${EXPECTED.cultureItems}`);
  }
  if (Number.isFinite(culture.native) && culture.native !== EXPECTED.cultureNative) {
    fail("CULTURE_NATIVE", "culture", `${culture.native} ≠ ${EXPECTED.cultureNative}`);
  }
  if (Number.isFinite(culture.journeyNodes) && culture.journeyNodes !== EXPECTED.journeyCultureNodes) {
    fail("JOURNEY_CULTURE_NODES", "nodes", `${culture.journeyNodes} ≠ ${EXPECTED.journeyCultureNodes}`);
  }
  if (Number.isFinite(culture.history) && culture.history !== EXPECTED.historyItems) {
    fail("HISTORY_COUNT", "history", `${culture.history} ≠ ${EXPECTED.historyItems}`);
  }

  // release_candidate_sha must stay empty until a real deploy candidate exists.
  if (data.operationalChecks) {
    const sha = data.operationalChecks.release_candidate_sha ?? "";
    const candidate = data.candidateManifest;
    if (sha && candidate?.status === "PREPARING") {
      fail("CANDIDATE_SHA_TOO_EARLY", "operational-checks", "release_candidate_sha preenchido antes de DEPLOYED");
    }
    if (sha && candidate?.candidateSha && sha !== candidate.candidateSha) {
      fail("CANDIDATE_SHA_MISMATCH", "operational-checks", "release_candidate_sha ≠ candidateSha do manifesto");
    }
  }

  return { failures, expected: EXPECTED };
}

export function validateRc2CandidateConfig(data = {}) {
  const { fail, failures } = failList();
  const candidate = data.candidateManifest ?? {};
  const status = candidate.status ?? "PREPARING";

  const allowed = new Set(["PREPARING", "DEPLOYED", "EVIDENCE_IN_PROGRESS", "BLOCKED", "READY_FOR_FINAL_GATE"]);
  if (!allowed.has(status)) {
    fail("BAD_STATUS", "rc2-candidate", `status ${status} inválido`);
  }
  if (status === "GO") {
    fail("EARLY_GO", "rc2-candidate", "GO não é status de manifesto RC2.1");
  }

  if (status === "PREPARING" || status === "BLOCKED") {
    // Honest pre-deploy states: no production-like claims required yet.
    if (candidate.backendMode === "local" && status === "DEPLOYED") {
      fail("LOCAL_BACKEND", "rc2-candidate", "candidate DEPLOYED não pode usar backend local");
    }
    return { failures };
  }

  // status >= DEPLOYED
  if (!candidate.candidateSha) fail("MISSING_SHA", "rc2-candidate", "candidateSha obrigatório quando status >= DEPLOYED");
  if (!candidate.deploymentUrl) fail("MISSING_URL", "rc2-candidate", "deploymentUrl obrigatório quando status >= DEPLOYED");
  if (candidate.backendMode === "local") fail("LOCAL_BACKEND", "rc2-candidate", "deploy-preview/local não é candidate cloud");
  if (candidate.backendMode !== "supabase") fail("BAD_BACKEND", "rc2-candidate", `backendMode=${candidate.backendMode}`);
  if (candidate.fixtures === true || candidate.fixtures === "true") {
    fail("FIXTURES_ON", "rc2-candidate", "VITE_USE_TEST_FIXTURES deve ser false");
  }
  if (candidate.environment === "production") {
    fail("PROD_QA", "rc2-candidate", "QA candidate não pode apontar para production DB");
  }
  if (!candidate.contentFreezeSha) fail("MISSING_CONTENT_FREEZE", "rc2-candidate", "contentFreezeSha ausente");
  if (candidate.fingerprint && candidate.fingerprint !== EXPECTED.fingerprint) {
    fail("CANDIDATE_FP", "rc2-candidate", "fingerprint do candidate diverge do freeze");
  }

  return { failures };
}

export function validateRc2CandidateDrift(data = {}) {
  const { fail, failures } = failList();
  const candidate = data.candidateManifest ?? {};
  const operational = data.operationalChecks ?? {};
  const runtimeSha = data.runtimeHeadSha ?? "";

  if ((candidate.status === "DEPLOYED" || candidate.status === "EVIDENCE_IN_PROGRESS" || candidate.status === "READY_FOR_FINAL_GATE") && candidate.candidateSha) {
    const releaseSha = operational.release_candidate_sha ?? "";
    if (releaseSha && releaseSha !== candidate.candidateSha) {
      fail("DRIFT_RELEASE_SHA", "operational-checks", "release_candidate_sha drift vs manifesto");
    }
    // Evidence on an old SHA while runtime moved: fail freshness-style.
    for (const [key, row] of Object.entries(operational.checks ?? {})) {
      if (row?.pass === true && row.commitSha && row.commitSha !== candidate.candidateSha) {
        fail("STALE_EVIDENCE", key, `evidence commitSha ${row.commitSha} ≠ candidate ${candidate.candidateSha}`);
      }
    }
    if (runtimeSha && runtimeSha !== candidate.candidateSha && data.reuseOldEvidence === true) {
      fail("RUNTIME_DRIFT", "HEAD", "runtime HEAD ≠ candidateSha com evidência antiga reutilizada");
    }
  }

  return { failures };
}

export function loadRc2CandidateManifest(root = process.cwd()) {
  const rel = "docs/release/rc2-candidate.json";
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

export { EXPECTED as RC2_CONTENT_FREEZE_EXPECTED };
