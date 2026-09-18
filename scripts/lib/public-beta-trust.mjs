/**
 * RC2.2.4 — Public Beta Trust structural gate.
 * Privacy truth, terms, feedback SENT≠QUEUED, telemetry honesty, ops docs.
 */
import fs from "node:fs";
import path from "node:path";

export function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function assertPublicBetaTrust(root = process.cwd()) {
  const failures = [];
  const push = (ok, msg) => {
    if (!ok) failures.push(msg);
  };

  const privacyPage = read(root, "src/features/privacy/PrivacyPage.tsx");
  push(!/data-legal-later/.test(privacyPage), "Privacy must not keep data-legal-later placeholder");
  push(/privacyNotice\./.test(privacyPage), "Privacy notice must use i18n keys");
  push(/FEEDBACK_EMAIL|SUPPORT_EMAIL/.test(privacyPage), "Privacy contact must use canonical email constant");

  const termsPage = read(root, "src/features/privacy/TermsPage.tsx");
  push(/data-terms-notice/.test(termsPage), "Terms surface must exist");
  push(/terms\./.test(termsPage), "Terms must use i18n");
  push(!/LGPD compliant|fully compliant|legally certified/i.test(termsPage), "Terms must not claim legal certification");

  const routes = read(root, "src/routes.tsx");
  push(/path:\s*"privacidade"/.test(routes), "Privacy route required");
  push(/path:\s*"termos"/.test(routes), "Terms route required");

  const publicRoutes = read(root, "src/lib/auth/publicRoutes.ts");
  push(publicRoutes.includes('"/termos"'), "/termos must be public");

  const pt = read(root, "src/locales/pt-BR.ts");
  const en = read(root, "src/locales/en.ts");
  for (const key of [
    "privacyNotice:",
    "terms:",
    "thanksQueued:",
    "local:",
    "telemetry:",
    "deletion:",
    "consent:",
  ]) {
    push(pt.includes(key), `pt-BR missing ${key}`);
    push(en.includes(key), `en missing ${key}`);
  }
  push(!/dados anônimos de uso|anonymous usage data/i.test(pt + en), "Telemetry copy must not claim anonymous when profile id may exist");
  push(/dados pedagógicos e de uso|pedagogical and usage data/i.test(pt + en), "Consent body must use pedagogical/usage wording");
  push(!/LGPD compliant|fully compliant|legally certified/i.test(pt + en), "Locales must not claim legal certification");

  const copy = read(root, "src/lib/privacyCopy.ts");
  push(copy.includes("identificador da conta/perfil"), "Collected list must include account/profile id");
  push(!/dados anônimos|anonymous usage/i.test(copy), "privacyCopy must not say anonymous telemetry");
  push(copy.includes("dados pedagógicos e de uso"), "privacyCopy body must match honest wording");

  const consent = read(root, "src/services/telemetryConsent.ts");
  push(/if \(raw === null\) return false/.test(consent), "Absence of consent = no send");
  push(/clearPedagogyEventQueue/.test(consent), "Revocation clears pedagogy queue");

  const pedagogy = read(root, "src/services/pedagogyEvents.ts");
  push(/!getTelemetryConsent\(\)/.test(pedagogy), "Pedagogy send must check consent");

  const modal = read(root, "src/components/privacy/TelemetryConsentModal.tsx");
  push(/settings\.notNow/.test(modal), "Not now must remain a distinct choice");

  const feedbackModal = read(root, "src/components/feedback/FeedbackModal.tsx");
  push(/result\.queued/.test(feedbackModal), "Feedback UI must branch on queued");
  push(/feedback\.thanksQueued/.test(feedbackModal), "Queued copy key required");
  push(/data-feedback-delivery/.test(feedbackModal), "Delivery state attribute required");

  const feedbackService = read(root, "src/services/feedbackService.ts");
  push(/queued:\s*true/.test(feedbackService), "Service must return queued:true when local");
  push(/dedupeKey|makeDedupeKey|p_client_dedupe_key/.test(feedbackService), "Feedback dedupe must remain");
  push(/flushFeedbackQueue/.test(feedbackService), "Existing flush queue remains authority");
  push(!/getTelemetryConsent/.test(feedbackService), "Feedback ≠ telemetry consent");

  const diagnostics = read(root, "src/lib/clientDiagnostics.ts");
  push(/sessionStorage/.test(diagnostics), "Diagnostics stay in sessionStorage");
  push(/sanitizeFeedbackMessage/.test(diagnostics), "Diagnostics must be sanitized");
  push(/não (são|é) enviad|not (automatically )?upload|manual|feedback/i.test(diagnostics), "Diagnostics must document no auto-upload");

  const errorBoundary = read(root, "src/components/system/ErrorBoundary.tsx");
  push(/handleRetry|Tentar novamente|common\.retry/.test(errorBoundary), "ErrorBoundary retry");
  push(/handleReport|reportProblem|Report/.test(errorBoundary), "ErrorBoundary report");
  push(/jornada|Journey/.test(errorBoundary), "ErrorBoundary back to Journey");
  push(/handleReload|reloadApp|Reload/.test(errorBoundary), "ErrorBoundary reload");
  push(/import\.meta\.env\?\.DEV|import\.meta\.env\.DEV/.test(errorBoundary), "Stack gated to DEV");
  push(!/error\.stack/.test(errorBoundary) || /isDev/.test(errorBoundary), "Production UI must not show stack");

  const privacyService = read(root, "src/services/privacyService.ts");
  push(/buildPrivacyExportBundle/.test(privacyService), "Export bundle required");
  push(/requestAccountDeletion/.test(privacyService), "Account deletion client required");
  push(fs.existsSync(path.join(root, "supabase/functions/delete-account/index.ts")), "delete-account edge function required");

  const settings = read(root, "src/features/settings/SettingsPage.tsx");
  push(/requestExport|privacyPolicy|privacidade/.test(settings), "Export/privacy discoverable in Settings");
  push(/requestDeletion|requestAccountDeletion/.test(settings), "Deletion discoverable in Settings");

  const dados = read(root, "src/features/dados/DadosLocaisPage.tsx");
  push(/eraseLocalData/.test(dados), "Local data deletion path required");

  const feedbackLib = read(root, "src/lib/feedback.ts");
  push(/FEEDBACK_EMAIL\s*=\s*"beta@longyu\.app"/.test(feedbackLib), "Canonical support email beta@longyu.app");
  const emailHits = (pt + en + privacyPage + termsPage + read(root, "src/features/about/AboutPage.tsx"))
    .match(/[a-z0-9._%+-]+@longyu\.app/gi) || [];
  const uniqueEmails = [...new Set(emailHits.map((e) => e.toLowerCase()))];
  push(
    uniqueEmails.length === 0 || (uniqueEmails.length === 1 && uniqueEmails[0] === "beta@longyu.app"),
    `Support email must be single canonical beta@longyu.app (found: ${uniqueEmails.join(", ") || "none"})`
  );

  const landing = read(root, "src/features/landing/LandingPage.tsx");
  push(/to="\/termos"/.test(landing), "Landing footer must link Terms");
  push(/to="\/privacidade"/.test(landing), "Landing footer must link Privacy");

  const about = read(root, "src/features/about/AboutPage.tsx");
  push(/to="\/privacidade"/.test(about) && /to="\/termos"/.test(about), "About must expose trust links");
  push(/FEEDBACK_EMAIL/.test(about), "About must expose support contact");
  push(!/Pro está disponível|buy Pro|purchase Family|Family is available/i.test(about), "About must not sell Pro/Family as available");

  const pkg = read(root, "package.json");
  push(!/"@sentry\//.test(pkg) && !/"sentry"/.test(pkg), "No Sentry dependency without explicit decision");

  const incident = path.join(root, "docs/release/public-beta-incident-runbook.md");
  const launch = path.join(root, "docs/release/public-beta-launch-day.md");
  const obs = path.join(root, "docs/release/public-beta-observability-map.md");
  push(fs.existsSync(incident), "Incident runbook required");
  push(fs.existsSync(launch), "Launch-day runbook required");
  push(fs.existsSync(obs), "Observability map required");
  if (fs.existsSync(incident)) {
    const text = read(root, "docs/release/public-beta-incident-runbook.md");
    push(/SEV0/.test(text) && /SEV1/.test(text), "Incident severities SEV0/SEV1 required");
  }

  const report = path.join(root, "docs/reports/rc2-2-4-public-beta-trust-ops.md");
  push(fs.existsSync(report), "RC2.2.4 report required");
  if (fs.existsSync(report)) {
    const text = read(root, "docs/reports/rc2-2-4-public-beta-trust-ops.md");
    push(/NO-GO/.test(text), "Verdict must remain NO-GO");
    push(/516692632525/.test(text), "Fingerprint locked");
    push(/BLOCKED_CLOUD_VERIFY|CODE_READY/.test(text), "Deletion cloud verify status documented");
  }

  const human = JSON.parse(read(root, "docs/release/human-qa-prebeta.json"));
  push(human.founderQa !== "PASS" && human.l1ToL20 !== "PASS", "Must not invent human QA PASS in this remessa");
  push(human.externalTesterCount === 0, "Must not invent external testers");

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

  const freeze = read(root, "docs/release/public-beta-core.json");
  push(/"featureFreeze"\s*:\s*"PUBLIC_BETA"/.test(freeze), "FEATURE_FREEZE PUBLIC_BETA");

  return { ok: failures.length === 0, failures };
}
