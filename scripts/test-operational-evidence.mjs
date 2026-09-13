#!/usr/bin/env node
/**
 * Mutações 5–9 do contrato RC1.2.
 *
 * A regra que este gate protege é a única que separa um lançamento de uma
 * esperança: `pass: true` significa que alguém executou, não que o código
 * parece certo. Cada mutação abaixo é uma forma de marcar verde sem ter feito.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateOperationalEvidence, loadOperationalChecks } from "./lib/rc1-2-gates.mjs";

const real = loadOperationalChecks();
const evidenceFiles = Object.fromEntries(
  Object.values(real.checks)
    .map((check) => check.evidence)
    .filter(Boolean)
    .map((rel) => [rel, fs.readFileSync(rel, "utf8")])
);

const base = { checksJson: real, evidenceFiles };
assert.deepEqual(validateOperationalEvidence(base).failures, [], "controle positivo");

/** Clona o documento e aplica um patch no check indicado. */
function withCheck(name, patch) {
  const doc = JSON.parse(JSON.stringify(real));
  doc.checks[name] = { ...doc.checks[name], ...patch };
  return doc;
}

const EXECUTED = {
  pass: true,
  testedAt: "2026-09-13T12:00:00Z",
  environment: "qa",
  commitSha: "06d6bcb",
};
/** Uma evidência que de fato foi executada (não diz NOT_RUN). */
const RAN = `# ok\n\n| date | 2026-09-13 |\n| environment | qa |\n| result | PASS |\n| commitSha | 06d6bcb |\n| model | Pixel 8 |\n| version | Android 15 |\n| sha | antes abc123 depois def456 |\n`;

const mutations = [
  [
    "cloud_auth true sem evidência",
    { checksJson: withCheck("cloud_auth", { pass: true, evidence: "" }) },
    "NO_EVIDENCE_PATH",
  ],
  [
    "evidência aponta para arquivo inexistente",
    { checksJson: withCheck("cloud_auth", { pass: true, evidence: "docs/release/evidence/nao-existe.md" }) },
    "EVIDENCE_MISSING",
  ],
  [
    "pass true sem testedAt/environment/commitSha",
    { checksJson: withCheck("cloud_auth", { pass: true }) },
    "PASS_WITHOUT_PROOF",
  ],
  [
    "pass true com runbook ainda NOT_RUN",
    { checksJson: withCheck("cloud_auth", EXECUTED) },
    "PASS_ON_NOT_RUN",
  ],
  [
    "device real sem modelo/versão",
    {
      checksJson: withCheck("android_real_device", EXECUTED),
      evidenceFiles: {
        ...evidenceFiles,
        "docs/release/evidence/android-real-device.md": "# x\n| date | 2026-09-13 |\n| environment | qa |\n| result | PASS |\n",
      },
    },
    "DEVICE_UNIDENTIFIED",
  ],
  [
    "rollback sem SHA antes/depois",
    {
      checksJson: withCheck("rollback_drill", EXECUTED),
      evidenceFiles: {
        ...evidenceFiles,
        "docs/release/evidence/rollback-drill.md": "# x\n| date | 2026-09-13 |\n| environment | prod |\n| result | PASS |\n",
      },
    },
    "ROLLBACK_NO_SHA",
  ],
  [
    "evidência sem campo result",
    {
      checksJson: withCheck("cloud_auth", EXECUTED),
      evidenceFiles: {
        ...evidenceFiles,
        "docs/release/evidence/cloud-auth.md": "# x\n| date | 2026-09-13 |\n| environment | qa |\n",
      },
    },
    "EVIDENCE_INCOMPLETE",
  ],
  [
    "verdict GO com check pendente",
    { checksJson: { ...real, verdict: "GO" } },
    "VERDICT",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateOperationalEvidence({ ...base, ...patch }).failures.map((f) => f.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// P9.1 — Test Mode não autoriza "live".
const stripeDoc = JSON.parse(JSON.stringify(real));
stripeDoc.checks.stripe_test_mode_e2e = { ...stripeDoc.checks.stripe_test_mode_e2e, ...EXECUTED };
stripeDoc.checks.stripe_live = { ...stripeDoc.checks.stripe_live, ...EXECUTED };
const stripeCodes = validateOperationalEvidence({
  checksJson: stripeDoc,
  evidenceFiles: {
    ...evidenceFiles,
    "docs/release/evidence/stripe-test-mode.md": RAN,
  },
}).failures.map((f) => f.code);
assert.ok(
  stripeCodes.includes("STRIPE_TEST_IS_NOT_LIVE"),
  `Test Mode passando não pode marcar live (obtido ${stripeCodes.join(",")})`
);
console.log("KILLED Test Mode marcado como live: STRIPE_TEST_IS_NOT_LIVE");

// Controle: um check realmente executado PASSA. O gate não pode ser um veto geral.
const okDoc = withCheck("android_real_device", EXECUTED);
const okCodes = validateOperationalEvidence({
  checksJson: okDoc,
  evidenceFiles: { ...evidenceFiles, "docs/release/evidence/android-real-device.md": RAN },
}).failures.map((f) => f.code);
assert.ok(
  !okCodes.includes("PASS_ON_NOT_RUN") && !okCodes.includes("PASS_WITHOUT_PROOF"),
  `check executado de verdade deveria passar (obtido ${okCodes.join(",")})`
);
console.log("OK check executado de verdade é aceito");

console.log("PASS test:operational-evidence");
