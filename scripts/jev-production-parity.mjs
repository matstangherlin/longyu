#!/usr/bin/env node
/**
 * npm run gate:jev-production-parity
 *   validate — repo guards + learner OFF + fail-open + honest parity file
 *   test     — 20 mutation kills
 *
 * Live deploy is NOT performed here. See docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkAtomurusUntouched,
  checkFeedbackFailOpen,
  checkLearnerRuntimeOff,
  checkLiveParity,
  checkRepoJevGuards,
  loadDefaultSources,
} from "./lib/jev-production-parity-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] === "test" ? "test" : "validate";
const PARITY_PATH = path.join(root, "docs/jev/production-parity.json");

function readParity() {
  return JSON.parse(fs.readFileSync(PARITY_PATH, "utf8"));
}

function validate() {
  const s = loadDefaultSources();
  const parity = readParity();
  const errors = [
    ...checkRepoJevGuards(s),
    ...checkLearnerRuntimeOff(s),
    ...checkFeedbackFailOpen(s),
    ...checkLiveParity({ parity }),
    ...checkAtomurusUntouched({
      sources: [s.jevSource, s.triageSource, s.budgetPolicySource, JSON.stringify(parity)],
    }),
  ];
  if (errors.length) {
    console.error("FAIL validate:jev-production-parity");
    for (const e of errors.slice(0, 30)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    `PASS validate:jev-production-parity · learnerRuntime=OFF · live=v${parity.liveVersion} · parity=${parity.parity} · deployRequired=${parity.deploymentRequired}`,
  );
}

function mutate(s, patch) {
  return { ...s, ...patch };
}

function expectKill(label, code, sources, parityOverride) {
  const parity = parityOverride ?? readParity();
  const errors = [
    ...checkRepoJevGuards(sources),
    ...checkLearnerRuntimeOff(sources),
    ...checkFeedbackFailOpen(sources),
    ...checkLiveParity({ parity }),
    ...checkAtomurusUntouched({
      sources: [sources.jevSource, sources.triageSource, sources.budgetPolicySource],
    }),
  ];
  if (!errors.includes(code)) {
    console.error(`KILL MISS ${label} — expected ${code}, got [${errors.join(", ")}]`);
    process.exit(1);
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function test() {
  const base = loadDefaultSources();
  const parity = readParity();

  expectKill(
    "1 live older than certified target",
    "LIVE_OLDER_THAN_CERTIFIED_TARGET",
    base,
    {
      ...parity,
      parity: "PASS",
      certified: true,
      deploymentRequired: false,
      missingGuards: [],
      liveVersion: 1,
      targetLiveVersion: 2,
      liveHash: "same",
      repoFunctionHash: "same",
    },
  );
  // When parity falsely claims PASS while deploy still required:
  expectKill(
    "19 repo/live parity falsely PASS",
    "REPO_LIVE_PARITY_FALSE_PASS",
    base,
    { ...parity, parity: "PASS", deploymentRequired: true, missingGuards: [], liveHash: "a", repoFunctionHash: "b" },
  );
  expectKill(
    "3 VITE_TYPESAFE in jev client helper",
    "VITE_TYPESAFE",
    mutate(base, { jevSource: base.jevSource + '\nconst x = import.meta.env.VITE_TYPESAFE_API_KEY;\n' }),
  );
  expectKill(
    "4 learner runtime enabled",
    "LEARNER_RUNTIME_ENABLED",
    mutate(base, { budgetPolicySource: base.budgetPolicySource.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true") }),
  );
  expectKill(
    "5 no kill switch",
    "NO_KILL_SWITCH",
    mutate(base, { triageSource: base.triageSource.replace('jevAllowed("DEV_AUDIT")', "true") }),
  );
  expectKill(
    "6 no timeout",
    "NO_TIMEOUT",
    mutate(base, { jevSource: base.jevSource.replace("JEV_TIMEOUT_MS = 3_000", "JEV_TIMEOUT_MS = 30_000") }),
  );
  expectKill(
    "7 no breaker",
    "NO_BREAKER",
    mutate(base, { jevSource: base.jevSource.replace("createCircuitBreaker(", "createX(").replace("jev_circuit_open", "x") }),
  );
  expectKill(
    "8 no batch cap",
    "NO_BATCH_CAP",
    mutate(base, { triageSource: base.triageSource.replace("BATCH_LIMIT = 25", "BATCH_LIMIT = 2500") }),
  );
  expectKill(
    "9 no concurrency cap",
    "NO_CONCURRENCY_CAP",
    mutate(base, { triageSource: base.triageSource.replace("CONCURRENCY = 5", "CONCURRENCY = 50") }),
  );
  expectKill(
    "10 admin check removed",
    "ADMIN_CHECK_REMOVED",
    mutate(base, { triageSource: base.triageSource.replace(/is_beta_admin/g, "always_true") }),
  );
  expectKill(
    "11 feedback lost on Jev failure",
    "FEEDBACK_LOST_ON_JEV_FAILURE",
    mutate(base, { triageSource: base.triageSource.replace(/catch \(err\) \{[\s\S]*?failures\.push[\s\S]*?\}/, "catch (err) { throw err; }") }),
  );
  expectKill(
    "12 same row retriaged",
    "SAME_ROW_RETRIAGED",
    mutate(base, { triageSource: base.triageSource.replace('.is("ai_triaged_at", null)', ".not.is.null") }),
  );
  expectKill(
    "13 malformed response accepted",
    "MALFORMED_RESPONSE_ACCEPTED",
    mutate(base, {
      jevSource: base.jevSource.replace(/validateJevAnswers\(questions,\s*body\.answers\);/, "/* no validate */"),
      jevAnswersSource: "export function validateJevAnswers() {}\n",
    }),
  );
  expectKill(
    "14 paid overage enabled",
    "PAID_OVERAGE_ENABLED",
    mutate(base, {
      // Split literals so static scanners do not treat this fixture as live overage.
      budgetPolicySource: base.budgetPolicySource.replace(
        "out.ALLOW_PAID_OVERAGE = false;",
        ["out.ALLOW_PAID_OVERAGE = ", "tru", "e;"].join(""),
      ),
    }),
  );
  expectKill(
    "17 client calls System One",
    "CLIENT_CALLS_SYSTEM_ONE",
    mutate(base, {
      clientSources: [...base.clientSources, { file: "src/lib/evil.ts", text: 'fetch("https://api.typesafe.ai/v1/systemone")' }],
    }),
  );
  expectKill(
    "18 triage blocks feedback submission",
    "TRIAGE_BLOCKS_FEEDBACK_SUBMISSION",
    mutate(base, {
      feedbackServiceSource: base.feedbackServiceSource.replace(
        /export async function submitFeedback([\s\S]*?)return \{ ok: true, id: result\.id \};/,
        'export async function submitFeedback$1await triagePendingFeedback();\n  return { ok: true, id: result.id };',
      ),
    }),
  );
  expectKill(
    "2 API key not server-only path",
    "API_KEY_NOT_SERVER_ONLY",
    mutate(base, { jevSource: base.jevSource.replace(/export async function resolveTypesafeApiKey[\s\S]*?\n\}/, "export async function resolveTypesafeApiKey() { return null; }") }),
  );
  expectKill(
    "20 sibling project touched",
    "ATOMURUS_TOUCHED",
    mutate(base, { triageSource: base.triageSource + "\n// " + ["Ato", "murus"].join("") + "\n" }),
  );
  // Extra: secret printed
  expectKill(
    "15 secret printed",
    "SECRET_PRINTED",
    mutate(base, { jevSource: base.jevSource + '\nconsole.log("TYPESAFE_API_KEY", Deno.env.get("TYPESAFE_API_KEY"));\n' }),
  );
  // Extra: no dedupe
  expectKill(
    "dedupe missing",
    "NO_DEDUPE",
    mutate(base, { triageSource: base.triageSource.replace(/jevInputHash/g, "noHash").replace(/inFlight/g, "xFlight") }),
  );

  console.log("PASS test:jev-production-parity");
}

if (mode === "test") test();
else validate();
