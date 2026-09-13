#!/usr/bin/env node
/**
 * Mutação 19 do contrato RC1.2: "release report aponta SHA antigo como
 * candidate → freshness fail".
 *
 * Evidência velha descreve outro produto. Auth, sync, Stripe, device, rollback
 * e PWA dependem do bundle publicado — se o candidate mudou, a evidência
 * precisa ser refeita ou explicitamente declarada compatível.
 */
import assert from "node:assert/strict";
import { validateReleaseEvidenceFreshness, loadOperationalChecks } from "./lib/rc1-2-gates.mjs";

const real = loadOperationalChecks();
assert.deepEqual(
  validateReleaseEvidenceFreshness({ checksJson: real }).failures,
  [],
  "controle positivo: nenhum check passando, nada a envelhecer"
);

function doc(patch) {
  return { ...JSON.parse(JSON.stringify(real)), ...patch };
}

const CANDIDATE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const mutations = [
  [
    "check passando sem candidate declarado",
    doc({
      release_candidate_sha: "",
      checks: {
        ...real.checks,
        cloud_auth: { ...real.checks.cloud_auth, pass: true, commitSha: "abc1234" },
      },
    }),
    "NO_CANDIDATE_SHA",
  ],
  [
    "evidência de um SHA que não é o candidate",
    doc({
      release_candidate_sha: CANDIDATE,
      checks: {
        ...real.checks,
        cloud_sync: { ...real.checks.cloud_sync, pass: true, commitSha: "bbbbbbb" },
      },
    }),
    "STALE_EVIDENCE",
  ],
  [
    "história do freeze sobrescrita pelo candidate",
    doc({ release_candidate_sha: CANDIDATE, curriculum_base_sha: CANDIDATE }),
    "HISTORY_LOST",
  ],
  [
    "SHA do freeze de currículo ausente",
    doc({ curriculum_base_sha: "" }),
    "NO_CURRICULUM_BASE",
  ],
];

for (const [label, checksJson, expectedCode] of mutations) {
  const codes = validateReleaseEvidenceFreshness({ checksJson }).failures.map((f) => f.code);
  assert.ok(
    codes.includes(expectedCode),
    `mutação "${label}" não detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// SHA curto que é prefixo do candidate continua válido — o gate não pode virar
// uma exigência de digitar 40 caracteres à mão.
const shortOk = validateReleaseEvidenceFreshness({
  checksJson: doc({
    release_candidate_sha: CANDIDATE,
    checks: {
      ...real.checks,
      cloud_auth: { ...real.checks.cloud_auth, pass: true, commitSha: CANDIDATE.slice(0, 7) },
    },
  }),
}).failures.map((f) => f.code);
assert.ok(!shortOk.includes("STALE_EVIDENCE"), `SHA curto compatível deveria passar (${shortOk.join(",")})`);
console.log("OK SHA curto compatível com o candidate é aceito");

console.log("PASS test:release-evidence-freshness");
