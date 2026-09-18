#!/usr/bin/env node
/**
 * Mutation tests for public-beta-trust honesty gate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPublicBetaTrust } from "./lib/public-beta-trust.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = assertPublicBetaTrust(root);
assert.equal(baseline.ok, true, baseline.failures.join("; "));

const copyRel = [
  "src/features/privacy/PrivacyPage.tsx",
  "src/features/privacy/TermsPage.tsx",
  "src/routes.tsx",
  "src/lib/auth/publicRoutes.ts",
  "src/locales/pt-BR.ts",
  "src/locales/en.ts",
  "src/lib/privacyCopy.ts",
  "src/services/telemetryConsent.ts",
  "src/services/pedagogyEvents.ts",
  "src/components/privacy/TelemetryConsentModal.tsx",
  "src/components/feedback/FeedbackModal.tsx",
  "src/services/feedbackService.ts",
  "src/lib/clientDiagnostics.ts",
  "src/components/system/ErrorBoundary.tsx",
  "src/services/privacyService.ts",
  "src/features/settings/SettingsPage.tsx",
  "src/features/dados/DadosLocaisPage.tsx",
  "src/lib/feedback.ts",
  "src/features/landing/LandingPage.tsx",
  "src/features/about/AboutPage.tsx",
  "package.json",
  "docs/release/public-beta-incident-runbook.md",
  "docs/release/public-beta-launch-day.md",
  "docs/release/public-beta-observability-map.md",
  "docs/reports/rc2-2-4-public-beta-trust-ops.md",
  "docs/release/human-qa-prebeta.json",
  "docs/release/rc1-operational-checks.json",
  "docs/release/public-beta-core.json",
  "supabase/functions/delete-account/index.ts",
];

function withTempTree(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-trust-"));
  for (const rel of copyRel) {
    const src = path.join(root, rel);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  mutate(tmp);
  return assertPublicBetaTrust(tmp);
}

function kill(label, mutate) {
  const result = withTempTree(mutate);
  assert.equal(result.ok, false, `${label} should FAIL`);
  console.log(`KILLED ${label}: ${result.failures[0]}`);
}

kill("Privacy still data-legal-later", (tmp) => {
  const p = path.join(tmp, "src/features/privacy/PrivacyPage.tsx");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace('data-privacy-notice="public-beta"', 'data-legal-later=""'));
});

kill("Privacy PT only (strip en privacyNotice)", (tmp) => {
  const p = path.join(tmp, "src/locales/en.ts");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/privacyNotice:\s*\{[\s\S]*?\n  \},/, "/* privacyNotice removed */"));
});

kill("Anonymous telemetry copy with profile id", (tmp) => {
  const p = path.join(tmp, "src/lib/privacyCopy.ts");
  fs.writeFileSync(
    p,
    fs.readFileSync(p, "utf8").replace("dados pedagógicos e de uso", "dados anônimos de uso")
  );
});

kill("Feedback queued shows sent only", (tmp) => {
  const p = path.join(tmp, "src/components/feedback/FeedbackModal.tsx");
  fs.writeFileSync(
    p,
    fs
      .readFileSync(p, "utf8")
      .replace(/result\.queued \? "queued" : "sent"/, '"sent"')
      .replace(/feedback\.thanksQueued/g, "feedback.thanks")
      .replace(/data-feedback-delivery=\{delivery\}/, "")
  );
});

kill("Terms route removed", (tmp) => {
  const p = path.join(tmp, "src/routes.tsx");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/\{\s*path:\s*"termos"[^}]*\},?\s*/, ""));
});

kill("Terms claims LGPD certified", (tmp) => {
  const p = path.join(tmp, "src/features/privacy/TermsPage.tsx");
  fs.writeFileSync(
    p,
    fs.readFileSync(p, "utf8").replace("{t(\"terms.beta\")}", '"Longyu is LGPD compliant and legally certified."')
  );
});

kill("Support email diverges", (tmp) => {
  const p = path.join(tmp, "src/features/privacy/PrivacyPage.tsx");
  fs.writeFileSync(
    p,
    fs.readFileSync(p, "utf8").replace(
      /t\("privacyNotice.contact", \{ email: FEEDBACK_EMAIL \}\)/,
      't("privacyNotice.contact", { email: "support@longyu.app" })'
    )
  );
});

kill("Incident runbook missing", (tmp) => {
  fs.unlinkSync(path.join(tmp, "docs/release/public-beta-incident-runbook.md"));
});

kill("Launch-day checklist missing", (tmp) => {
  fs.unlinkSync(path.join(tmp, "docs/release/public-beta-launch-day.md"));
});

kill("Sentry dependency added", (tmp) => {
  const p = path.join(tmp, "package.json");
  const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
  pkg.dependencies = { ...(pkg.dependencies || {}), "@sentry/react": "^8.0.0" };
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
});

kill("cloud_auth flipped PASS", (tmp) => {
  const p = path.join(tmp, "docs/release/rc1-operational-checks.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.checks.cloud_auth.pass = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("human QA invented PASS", (tmp) => {
  const p = path.join(tmp, "docs/release/human-qa-prebeta.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.founderQa = "PASS";
  data.l1ToL20 = "PASS";
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("verdict GO in report", (tmp) => {
  const p = path.join(tmp, "docs/reports/rc2-2-4-public-beta-trust-ops.md");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/NO-GO/g, "GO"));
});

console.log("PASS test:public-beta-trust");
