#!/usr/bin/env node
/**
 * gate:rc2-3-13-closed-beta — closed beta ops honesty.
 * NEVER treats OWNER_ACTION_REQUIRED / CODE_READY as GO.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  checkDualSha,
  checkNoTestersBeforeGo,
  checkLiveBillingOff,
  checkRcImmutableAfterDistribution,
  checkCohortJump,
  checkLon001,
  lon001SiblingProbe,
} from "./lib/rc2-3-13-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel, fallback = null) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;
};
const exists = (rel) => fs.existsSync(path.join(root, rel));

function load() {
  let head = "";
  try {
    head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    head = "";
  }
  return {
    head,
    entry: readJson("docs/release/closed-beta-entry-criteria.json", { result: "OWNER_ACTION_REQUIRED" }),
    dual: readJson("docs/release/rc-dual-sha.json"),
    artifacts: readJson("docs/release/rc-artifacts.json"),
    candidate: readJson("docs/release/rc-candidate.json"),
    registry: readJson("docs/beta/tester-registry.json", { testers: [] }),
    snapshot: readJson("docs/beta/beta-entry-snapshot.json"),
    goDoc: exists("docs/release/CLOSED_BETA_GO.md"),
  };
}

function validate() {
  const w = load();
  const errors = [];
  if (!w.dual) errors.push("dual:DUAL_SHA_MISSING");
  else errors.push(...checkDualSha({ dual: w.dual, artifacts: w.artifacts, candidate: w.candidate }).map((e) => `dual:${e}`));
  errors.push(...checkNoTestersBeforeGo({ entryResult: w.entry.result, registry: w.registry }).map((e) => `invite:${e}`));
  errors.push(...checkLiveBillingOff({ candidate: w.candidate, entry: w.entry }).map((e) => `billing:${e}`));
  errors.push(
    ...checkRcImmutableAfterDistribution({ dual: w.dual, candidate: w.candidate, headSha: w.head }).map((e) => `rc:${e}`)
  );
  // Never claim GO docs while entry ≠ GO
  if (w.goDoc && w.entry.result !== "GO") errors.push("go:CLOSED_BETA_GO_DOC_WHILE_NOT_GO");
  if (w.snapshot?.status === "ACTIVE" && w.entry.result !== "GO") errors.push("invite:TESTERS_BEFORE_ENTRY_GO");
  if (w.entry.result === "GO" && w.entry.hostedCi !== "PASS") errors.push("go:GO_WHILE_HOSTED_NOT_PASS");
  if (["OWNER_ACTION_REQUIRED", "NO_GO", "PENDING"].includes(w.entry.result) === false && w.entry.result !== "GO") {
    // unknown
  }
  // CODE_READY must never be treated as PASS for entry
  for (const [k, v] of Object.entries(w.entry.betaRequired ?? {})) {
    if (v === "CODE_READY" && w.entry.result === "GO" && ["SPEECH_PHYSICAL_PASS", "HANZI_PHYSICAL_PASS", "OWNER_RC_PHYSICAL_ACCEPTANCE", "OBSERVABILITY_PASS", "ROLLBACK_PASS"].includes(k)) {
      errors.push("go:CODE_READY_TREATED_AS_PASS");
    }
  }
  errors.push(...checkLon001(JSON.stringify(w.dual) + JSON.stringify(w.registry)).map((e) => `lon001:${e}`));
  if (!exists("docs/reports/rc2-3-13-closure.md")) errors.push("docs:CLOSURE_MISSING");
  if (!exists("docs/beta/README.md")) errors.push("docs:BETA_README_MISSING");

  if (errors.length) {
    console.error("FAIL validate:rc2-3-13-closed-beta");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    `PASS validate:rc2-3-13-closed-beta · entry=${w.entry.result} · artifact=${w.dual?.artifactSourceSha?.slice(0, 7)} · cert=${w.dual?.certificationHeadSha?.slice(0, 7)} · testers=${(w.registry?.testers ?? []).length}`
  );
}

function test() {
  let ok = true;
  const must = (label, code, errs) => {
    if (!errs.includes(code)) {
      console.error(`KILL MISS ${label}: expected ${code}, got ${JSON.stringify(errs)}`);
      ok = false;
    } else console.log(`KILL OK ${label} → ${code}`);
  };
  must(
    "1 testers before GO",
    "TESTERS_BEFORE_ENTRY_GO",
    checkNoTestersBeforeGo({
      entryResult: "OWNER_ACTION_REQUIRED",
      registry: { testers: [{ id: "t1", status: "INVITED" }] },
    })
  );
  must(
    "3 artifact hash mismatch",
    "ARTIFACT_HASH_MISMATCH",
    checkDualSha({
      dual: { artifactSourceSha: "a".repeat(40), certificationHeadSha: "b".repeat(40), apkSha256: "x".repeat(64) },
      artifacts: { sourceSha: "a".repeat(40), apk: { sha256: "y".repeat(64) } },
      candidate: { gitSha: "a".repeat(40) },
    })
  );
  must(
    "5 source sha mismatch",
    "ARTIFACT_SOURCE_SHA_MISMATCH",
    checkDualSha({
      dual: { artifactSourceSha: "a".repeat(40), certificationHeadSha: "b".repeat(40) },
      artifacts: { sourceSha: "c".repeat(40) },
      candidate: { gitSha: "a".repeat(40) },
    })
  );
  must(
    "9 live stripe",
    "LIVE_BILLING_ENABLED",
    checkLiveBillingOff({ candidate: { liveMonetization: true, androidIap: "DISABLED_FOR_BETA" }, entry: { commercialMode: "FREE_ONLY" } })
  );
  must(
    "11 play purchase",
    "PLAY_PURCHASE_ENABLED",
    checkLiveBillingOff({
      candidate: { liveMonetization: false, androidIap: "ENABLED" },
      entry: { commercialMode: "FREE_ONLY" },
    })
  );
  must(
    "6 RC1 mutated",
    "RC1_MUTATED_AFTER_DISTRIBUTION",
    checkRcImmutableAfterDistribution({
      dual: { distributed: true, immutable: true, artifactSourceSha: "a".repeat(40), runtimeChanged: true },
      candidate: { gitSha: "a".repeat(40), distributed: true },
      headSha: "b".repeat(40),
    })
  );
  must("27 cohort jump", "COHORT_JUMP", checkCohortJump({ fromWave: 1, toWave: 3 }));
  must("55 lon001", ["ATO", "MURUS_TOUCHED"].join(""), checkLon001(`${lon001SiblingProbe()} x`));
  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-13-closed-beta");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
