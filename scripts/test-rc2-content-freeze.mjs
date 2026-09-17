#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateRc2ContentFreeze, RC2_CONTENT_FREEZE_EXPECTED as E } from "./lib/rc2-content-freeze.mjs";

function base() {
  return {
    freeze: {
      CURRICULUM_FREEZE: E.freeze,
      RC_BASE_FINGERPRINT: E.fingerprint,
    },
    fingerprint: E.fingerprint,
    counts: { lessons: E.lessons, teachingTopics: E.teachingTopics },
    culture: {
      items: E.cultureItems,
      native: E.cultureNative,
      journeyNodes: E.journeyCultureNodes,
      history: E.historyItems,
    },
    operationalChecks: { release_candidate_sha: "", checks: {} },
    candidateManifest: { status: "PREPARING" },
  };
}

function kill(label, mutate, code) {
  const data = base();
  mutate(data);
  const { failures } = validateRc2ContentFreeze(data);
  assert.ok(failures.some((f) => f.code === code), `${label} → ${code}; got ${failures.map((f) => f.code)}`);
  console.log(`KILLED ${label}: ${code}`);
}

{
  const { failures } = validateRc2ContentFreeze(base());
  assert.equal(failures.length, 0);
  console.log("PASS positive rc2-content-freeze");
}

kill("CultureItems 31", (d) => {
  d.culture.items = 31;
}, "CULTURE_ITEMS");
kill("Core 135", (d) => {
  d.counts.lessons = 135;
}, "LESSON_COUNT");
kill("Topics 114", (d) => {
  d.counts.teachingTopics = 114;
}, "TOPIC_COUNT");
kill("Fingerprint drift", (d) => {
  d.fingerprint = "deadbeefdead";
}, "FINGERPRINT_DRIFT");
kill("SHA before deploy", (d) => {
  d.operationalChecks.release_candidate_sha = "abc123";
  d.candidateManifest.status = "PREPARING";
}, "CANDIDATE_SHA_TOO_EARLY");

console.log("PASS test:rc2-content-freeze");
