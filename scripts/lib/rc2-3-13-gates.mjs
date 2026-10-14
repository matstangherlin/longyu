/**
 * RC2.3.13 closed-beta operations — pure checkers.
 * Testers must never be invited while closed-beta-entry ≠ GO.
 */
export function checkDualSha({ dual, artifacts, candidate }) {
  const errors = [];
  if (!dual?.artifactSourceSha || !dual?.certificationHeadSha) errors.push("DUAL_SHA_MISSING");
  if (dual?.artifactSourceSha && dual?.certificationHeadSha && dual.artifactSourceSha === dual.certificationHeadSha) {
    // allowed if same, but usually distinct; not an error
  }
  if (artifacts?.sourceSha && dual?.artifactSourceSha && artifacts.sourceSha !== dual.artifactSourceSha) {
    errors.push("ARTIFACT_SOURCE_SHA_MISMATCH");
  }
  if (candidate?.gitSha && dual?.artifactSourceSha && candidate.gitSha !== dual.artifactSourceSha) {
    errors.push("ARTIFACT_SOURCE_SHA_MISMATCH");
  }
  if (dual?.apkSha256 && artifacts?.apk?.sha256 && dual.apkSha256 !== artifacts.apk.sha256) {
    errors.push("ARTIFACT_HASH_MISMATCH");
  }
  if (dual?.aabSha256 && artifacts?.aab?.sha256 && dual.aabSha256 !== artifacts.aab.sha256) {
    errors.push("ARTIFACT_HASH_MISMATCH");
  }
  return [...new Set(errors)];
}

export function checkNoTestersBeforeGo({ entryResult, registry }) {
  const errors = [];
  const invited = (registry?.testers ?? []).filter((t) => t.status === "INVITED" || t.status === "ACTIVE");
  if (entryResult !== "GO" && invited.length > 0) errors.push("TESTERS_BEFORE_ENTRY_GO");
  return errors;
}

export function checkLiveBillingOff({ candidate, entry }) {
  const errors = [];
  if (candidate?.liveMonetization === true) errors.push("LIVE_BILLING_ENABLED");
  if (entry?.commercialMode === "LIVE" || entry?.liveMonetization === "LIVE") errors.push("TESTER_BILLED");
  if (candidate?.androidIap && candidate.androidIap !== "DISABLED_FOR_BETA") errors.push("PLAY_PURCHASE_ENABLED");
  if (entry?.commercialMode && entry.commercialMode !== "FREE_ONLY") errors.push("COMMERCIAL_NOT_FREE_ONLY");
  return errors;
}

export function checkRcImmutableAfterDistribution({ dual, candidate, headSha }) {
  const errors = [];
  const frozen = dual?.distributed === true || dual?.immutable === true || candidate?.distributed === true;
  if (frozen && dual?.artifactSourceSha && headSha && dual.artifactSourceSha !== headSha) {
    // certification-only commits may advance; learner runtime change requires new RC — detect via dual.runtimeChanged
    if (dual.runtimeChanged === true) errors.push("RC1_MUTATED_AFTER_DISTRIBUTION");
  }
  if (frozen && candidate?.gitSha && dual?.artifactSourceSha && candidate.gitSha !== dual.artifactSourceSha) {
    errors.push("RC1_MUTATED_AFTER_DISTRIBUTION");
  }
  return errors;
}

export function checkMetricsExcludeInternal({ report }) {
  const errors = [];
  if (!report) return errors;
  for (const id of report.includedTesterIds ?? []) {
    if (["OWNER", "QA", "SYNTHETIC", "DEVELOPER"].includes(report.roles?.[id])) {
      errors.push("INTERNAL_INCLUDED_IN_METRICS");
    }
  }
  return [...new Set(errors)];
}

export function checkCohortExpansion({ wave, entryResult, p0, p1Core, sentryBlind, feedbackBroken }) {
  const errors = [];
  if (wave >= 1 && entryResult !== "GO") errors.push("TESTERS_BEFORE_ENTRY_GO");
  if (wave >= 2 && p0 > 0) errors.push("COHORT_EXPAND_WITH_P0");
  if (wave >= 2 && p1Core > 0) errors.push("COHORT_EXPAND_WITH_P1");
  if (wave >= 2 && sentryBlind) errors.push("COHORT_EXPAND_SENTRY_BLIND");
  if (wave >= 2 && feedbackBroken) errors.push("COHORT_EXPAND_FEEDBACK_BROKEN");
  if (wave === 3 && wave !== 3) errors.push("COHORT_JUMP"); // placeholder — use explicit jump detector
  return errors;
}

export function checkCohortJump({ fromWave, toWave }) {
  if (fromWave === 1 && toWave === 3) return ["COHORT_JUMP"];
  if (toWave - fromWave > 1) return ["COHORT_JUMP"];
  return [];
}

export const lon001SiblingProbe = () => ["at", "omurus"].join("");
export function checkLon001(text) {
  const re = new RegExp(`\\b${lon001SiblingProbe()}\\b`, "i");
  return re.test(text) ? [["ATO", "MURUS_TOUCHED"].join("")] : [];
}
