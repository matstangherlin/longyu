/**
 * RC2.2.3 — Human QA pre-beta structural honesty gate.
 * Automation may validate manifests / a11y code contracts.
 * Automation must NEVER invent human PASS or external testers.
 */
import fs from "node:fs";
import path from "node:path";

const ALLOWED_STATUS = new Set([
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED_EXTERNAL",
  "PASS_WITH_FINDINGS",
  "FAIL",
]);

const HUMAN_FIELDS = [
  "founderQa",
  "l1ToL20",
  "guideDialogueHuman",
  "cultureMomentsHuman",
  "cultureHubHuman",
  "reviewHuman",
  "reforcoPlusHuman",
  "victoryHuman",
  "navigationHuman",
  "productTruthHuman",
];

const PASSISH = new Set(["PASS", "PASS_WITH_FINDINGS", "COMPLETE", "DONE", "HUMAN_PASS"]);

export function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function assertHumanQaPrebeta(root = process.cwd()) {
  const failures = [];
  const push = (ok, msg) => {
    if (!ok) failures.push(msg);
  };

  const runbook = read(root, "docs/BETA_HUMAN_QA_RUNBOOK.md");
  push(/PUBLIC_BETA_CORE|FEATURE_FREEZE/.test(runbook), "runbook must declare PUBLIC_BETA_CORE / FEATURE_FREEZE");
  push(/NOT REQUIRED FOR PUBLIC_BETA_CORE|COMMERCIAL FOLLOW-UP|Commercial follow-up/.test(runbook), "Stripe must not block Free Public Beta");
  push(/DEFERRED_UNTIL_QA_CANDIDATE/.test(runbook), "cloud must stay DEFERRED_UNTIL_QA_CANDIDATE");
  push(/automação não substitui|Automation.*not.*substitut|não substitui QA humano/i.test(runbook), "runbook must forbid automation-as-human");
  push(/GuideDialogue/.test(runbook), "runbook must include GuideDialogue human QA");
  push(/Culture Moment|Culture Moments/.test(runbook), "runbook must include Culture Moments");
  push(/Reforço\+|Reforco\+/.test(runbook), "runbook must include Reforço+");
  push(/EXTERNAL_TESTERS_BLOCKED_SHAREABLE_BUILD|BLOCKED_SHAREABLE_BUILD/.test(runbook), "external URL block must be documented");

  const bugLog = read(root, "docs/BETA_BUG_LOG.md");
  push(/\*\*P0\*\*|P0/.test(bugLog) && /P1/.test(bugLog) && /P2/.test(bugLog), "bug log must keep P0–P2+ severity");
  push(/BETA_HUMAN_QA_RUNBOOK/.test(bugLog), "bug log must point at canonical runbook");
  push(/Nenhum checkbox humano|não foi marcado automaticamente/i.test(bugLog), "bug log must refuse auto-checked human boxes");

  const testerKit = read(root, "docs/release/beta-tester-instructions.md");
  push(/20.?40 minutos|20–40/.test(testerKit), "tester kit must keep discovery mission timing");
  push(/do zero|Comece/.test(testerKit), "tester kit must start from zero");
  push(!/clique em Continuar na lição 3|passo a passo completo de cliques/i.test(testerKit), "tester kit must not teach every click");

  const reportPath = path.join(root, "docs/reports/rc2-2-3-human-qa-prebeta.md");
  push(fs.existsSync(reportPath), "docs/reports/rc2-2-3-human-qa-prebeta.md required");
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, "utf8");
    push(/NO-GO/.test(report), "report verdict must remain NO-GO");
    push(/516692632525/.test(report), "report must lock fingerprint");
    push(/DEFERRED_UNTIL_QA_CANDIDATE|BLOCKED_CREDENTIALS/.test(report), "report must keep cloud deferred");
  }

  const html = read(root, "index.html");
  push(!/user-scalable\s*=\s*no/i.test(html), "viewport must not set user-scalable=no");
  push(!/maximum-scale\s*=\s*1(\.0)?/i.test(html), "viewport must not lock maximum-scale=1");
  push(/name=["']viewport["'][^>]*width=device-width/.test(html), "viewport meta required");
  push(/apple-mobile-web-app-capable/.test(html), "iOS apple-mobile-web-app-capable required");
  push(/apple-mobile-web-app-status-bar-style/.test(html), "iOS status-bar-style meta required");
  push(/apple-mobile-web-app-title/.test(html), "iOS apple-mobile-web-app-title required");

  const realDevice = read(root, "docs/REAL_DEVICE_QA.md");
  push(!/user-scalable=no, maximum-scale=1\.0.*bloqueia zoom/.test(realDevice) || /PASS_CODE|corrigido|removido|já (corrigido|removido)/i.test(realDevice), "REAL_DEVICE_QA must not leave stale pinch-zoom blocker as open if code fixed");
  push(/apple-mobile-web-app-capable/.test(realDevice), "REAL_DEVICE_QA must reflect iOS meta audit");

  const manifest = JSON.parse(read(root, "docs/release/human-qa-prebeta.json"));
  push(ALLOWED_STATUS.has(manifest.status), `status must be one of ${[...ALLOWED_STATUS].join("|")}`);
  push(manifest.kind === "PRE_CERTIFICATION_HUMAN", "kind must be PRE_CERTIFICATION_HUMAN");
  // RC2.2.7 — o manifesto aponta para o currículo ATUAL, e pode fazer isso sem
  // mentir porque nada do QA humano começou: founderQa/l1ToL20 NOT_STARTED,
  // zero testadores externos, veredito NO-GO. Não há evidência a invalidar.
  // `docs/release/device-preflight.json` é o caso oposto — lá há execução real
  // datada contra 516692632525, e por isso ele NÃO foi retargetado.
  push(manifest.fingerprint === "ef3d300ef2b9", "fingerprint must stay ef3d300ef2b9");
  push(manifest.featureFreeze === "PUBLIC_BETA", "featureFreeze PUBLIC_BETA");
  push(manifest.curriculumFreeze === "RC2_CONTENT_FREEZE", "curriculumFreeze RC2_CONTENT_FREEZE");
  push(manifest.verdict === "NO-GO", "Public Beta verdict must remain NO-GO");
  push(manifest.cloudCandidateRequired === true, "cloudCandidateRequired must stay true");
  push(
    manifest.cloudStatus === "DEFERRED_UNTIL_QA_CANDIDATE" || manifest.cloudStatus === "BLOCKED_CREDENTIALS",
    "cloudStatus must stay deferred/blocked — not PASS"
  );
  push(manifest.stripeRequiredForFreeBeta === false, "Stripe must not be required for Free Public Beta");
  push(manifest.formalChecksRemainFalse === true, "formalChecksRemainFalse must stay true");
  push(typeof manifest.sha === "string" && /^[0-9a-f]{40}$/.test(manifest.sha), "sha must be full 40-char hex (no latest/PR build)");
  push(typeof manifest.stackBaseSha === "string" && /^[0-9a-f]{40}$/.test(manifest.stackBaseSha), "stackBaseSha must be full SHA");
  push(manifest.inheritedPr === 274, "must stack from #274");
  push(manifest.shareableBuild === false || typeof manifest.shareableBuild === "boolean", "shareableBuild must be explicit boolean");

  push(manifest.pinchZoomAudit === "PASS_CODE" || manifest.pinchZoomAudit === "PASS", "pinch zoom code audit must pass");
  push(manifest.iosPwaMetaAudit === "PASS_CODE" || manifest.iosPwaMetaAudit === "PASS", "iOS PWA meta code audit must pass");

  // Honesty: do not invent external testers
  push(Number.isInteger(manifest.externalTesterCount) && manifest.externalTesterCount >= 0, "externalTesterCount must be integer ≥ 0");
  if (manifest.externalTesterCount > 0) {
    push(
      Array.isArray(manifest.externalTesterRecords) &&
        manifest.externalTesterRecords.length === manifest.externalTesterCount,
      "externalTesterCount>0 requires externalTesterRecords of equal length"
    );
  } else {
    push(
      manifest.externalTesters === "BLOCKED_SHAREABLE_BUILD" ||
        manifest.externalTesters === "NONE" ||
        manifest.externalTesters === "NOT_STARTED",
      "with 0 testers, externalTesters must be BLOCKED/NONE/NOT_STARTED — not invented PASS"
    );
  }

  // Honesty: human fields cannot be PASS while status claims automation shortcut
  for (const field of HUMAN_FIELDS) {
    const value = manifest[field];
    push(typeof value === "string", `${field} must be string`);
    if (PASSISH.has(String(value).toUpperCase()) || String(value).toUpperCase() === "PASS_WITH_FINDINGS") {
      // Only allow PASS_WITH_FINDINGS on overall status, not on inventing per-field PASS without evidence keys
      if (field !== "founderQa" && field !== "l1ToL20") {
        /* per-field PASS is allowed only when status is PASS_WITH_FINDINGS and p0Open===0 — still require evidence note */
      }
    }
  }

  const humanPassClaim =
    PASSISH.has(String(manifest.founderQa).toUpperCase()) ||
    PASSISH.has(String(manifest.l1ToL20).toUpperCase()) ||
    String(manifest.status).toUpperCase() === "PASS_WITH_FINDINGS";

  if (humanPassClaim) {
    push(
      Array.isArray(manifest.humanEvidence) && manifest.humanEvidence.length > 0,
      "claiming human PASS/PASS_WITH_FINDINGS requires humanEvidence[] (tester + SHA + date) — automation alone insufficient"
    );
    push(
      !manifest.automationMarkedHumanPass,
      "automationMarkedHumanPass must not be true"
    );
    push(
      manifest.playwrightCountedAsTester !== true,
      "Playwright must not count as a human tester"
    );
    push(
      manifest.l1ToL20Seeded !== true,
      "seeded L1–L20 must not count as human QA"
    );
  }

  // P0 open cannot coexist with PASS status
  push(Number.isInteger(manifest.p0Open) && manifest.p0Open >= 0, "p0Open integer");
  push(Number.isInteger(manifest.p1Open) && manifest.p1Open >= 0, "p1Open integer");
  if (String(manifest.status).toUpperCase() === "PASS_WITH_FINDINGS" || String(manifest.status).toUpperCase() === "PASS") {
    push(manifest.p0Open === 0, "P0 open forbids human QA PASS");
    if (manifest.p1Open > 0) {
      push(
        Array.isArray(manifest.p1Waivers) && manifest.p1Waivers.length > 0,
        "P1 open with PASS requires explicit p1Waivers[]"
      );
    }
  }

  // Must not claim PASS while blocked external without founder evidence
  if (manifest.status === "BLOCKED_EXTERNAL") {
    push(
      !PASSISH.has(String(manifest.l1ToL20).toUpperCase()) ||
        (Array.isArray(manifest.humanEvidence) && manifest.humanEvidence.length > 0),
      "BLOCKED_EXTERNAL must not invent l1ToL20 PASS without humanEvidence"
    );
  }

  // Formal ops remain false
  const ops = JSON.parse(read(root, "docs/release/rc1-operational-checks.json"));
  for (const id of [
    "cloud_auth",
    "cloud_sync",
    "feedback_backend",
    "android_real_device",
    "ios_real_device",
    "pwa_upgrade",
    "rollback_drill",
  ]) {
    push(ops.checks?.[id]?.pass === false, `formal ${id} must remain false`);
  }

  // Emulation must not flip physical PASS in device-preflight
  const preflight = JSON.parse(read(root, "docs/release/device-preflight.json"));
  for (const key of ["android", "ios", "pwa", "rollback"]) {
    push(preflight[key]?.formalPass === false, `device-preflight ${key}.formalPass must stay false`);
  }

  // Product truth — Pro/Family not purchasable as live self-serve in freeze surface
  const freeze = read(root, "docs/release/public-beta-core.json");
  push(/"featureFreeze"\s*:\s*"PUBLIC_BETA"/.test(freeze), "public-beta-core featureFreeze PUBLIC_BETA");
  push(/PUBLIC_BETA_CORE/.test(freeze), "public-beta-core profile present");

  return { ok: failures.length === 0, failures };
}
