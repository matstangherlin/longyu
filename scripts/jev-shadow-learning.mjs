#!/usr/bin/env node
/**
 * npm run gate:jev-shadow-learning
 *   validate — shadow-only struggle lab invariants
 *   test     — 20 mutation kills + calibration metrics
 *   report   — regenerate docs/research/jev-shadow-struggle-report.json
 *
 * Never enables learner runtime. No production experiment without owner approval.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkBehavioral,
  checkSources,
  loadDefaultShadowSources,
  loadShadowModules,
  simulateCalibration,
} from "./lib/jev-shadow-learning-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] === "test" ? "test" : process.argv[2] === "report" ? "report" : "validate";
const CERT_PATH = path.join(root, "docs/jev/shadow-struggle-lab.json");
const REPORT_PATH = path.join(root, "docs/research/jev-shadow-struggle-report.json");

function writeReport() {
  const sources = loadDefaultShadowSources();
  const m = loadShadowModules();
  const records = simulateCalibration(m.shadow, sources.calibrationJson);
  const metrics = m.shadow.computeShadowMetrics(records, { jevAvailable: true });
  const report = {
    schema: "longyu-jev-shadow-struggle-report/1",
    policyVersion: "shadow-struggle-v1",
    generatedAt: new Date().toISOString(),
    note: "Synthetic/calibration-backed shadow metrics. No PII. Learner runtime OFF.",
    ...metrics,
    sampleSource: "calibration-dataset",
    realBetaEvents: 0,
    learningMetrics: ["falseInterruptionRate", "missedStruggleRate", "agreementRate"],
    nonLearningMetricsExcluded: ["sessionLength", "engagement", "xp"],
    killSwitch: "JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED=false",
    recommendation: metrics.recommendation,
    promotionBlockedUntil: [
      "meaningful_sample_size",
      "privacy_pass",
      "cost_pass",
      "false_interruption_acceptable",
      "failure_fallback_verified",
      "human_pedagogical_review",
      "explicit_owner_approval",
    ],
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, REPORT_PATH)} · recommendation=${report.recommendation}`);
  return report;
}

function validate() {
  // Keep report fresh for validate.
  writeReport();
  const sources = loadDefaultShadowSources();
  const m = loadShadowModules();
  const errors = [...checkSources(sources), ...checkBehavioral(m, sources.calibrationJson)];
  if (errors.length) {
    console.error("FAIL validate:jev-shadow-learning");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  const cert = fs.existsSync(CERT_PATH) ? JSON.parse(fs.readFileSync(CERT_PATH, "utf8")) : null;
  const learner = cert?.JEV_LEARNER_RUNTIME ?? "UNKNOWN";
  const shadowRuntime = cert?.JEV_SHADOW_STRUGGLE_RUNTIME ?? "UNKNOWN";
  if (learner !== "OFF" || shadowRuntime !== "OFF") {
    console.error("FAIL validate:jev-shadow-learning — runtime must stay OFF");
    process.exit(1);
  }
  console.log(
    `PASS validate:jev-shadow-learning · policy=shadow-struggle-v1 · learnerRuntime=OFF · shadowRuntime=OFF · rec=${cert?.recommendation ?? "n/a"}`,
  );
}

function expectKill(label, code, run) {
  const errors = run();
  if (!errors.includes(code)) {
    console.error(`KILL MISS ${label} — expected ${code}, got [${errors.join(", ")}]`);
    process.exit(1);
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function test() {
  const base = loadDefaultShadowSources();
  const m = loadShadowModules();

  expectKill("1 learner-visible during shadow", "LEARNER_VISIBLE_DURING_SHADOW", () =>
    checkSources({
      ...base,
      shadowSource: `${base.shadowSource}\nappliedToLearner: true\nJEV_SHADOW_STRUGGLE_RUNTIME_ENABLED: true\n`,
    }),
  );

  expectKill("2 raw audio uploaded", "RAW_AUDIO_UPLOADED", () =>
    checkSources({
      ...base,
      shadowSource: `${base.shadowSource}\nuploadRawAudio(blob); sendRawAudioToJev();\n`,
    }),
  );

  expectKill("3 hanzi strokes uploaded", "HANZI_STROKES_UPLOADED", () =>
    checkSources({
      ...base,
      shadowSource: `${base.shadowSource}\nuploadStrokePath(points); stroke_points = pts;\n`,
    }),
  );

  expectKill("4 email/user id sent", "EMAIL_OR_USER_ID_SENT", () => {
    const fake = {
      ...m,
      shadow: {
        ...m.shadow,
        containsForbiddenShadowPayload: (t) =>
          String(t).includes("raw_audio")
            ? ["raw_audio"]
            : String(t).includes("stroke")
              ? ["hanzi_strokes"]
              : [],
      },
    };
    return checkBehavioral(fake, base.calibrationJson);
  });

  expectKill("5 Jev changes Mastery", "JEV_CHANGES_MASTERY", () =>
    checkSources({
      ...base,
      shadowSource: base.shadowSource
        .replace(/assertNoMasteryWrite|appliedToLearner:\s*false|FORBIDDEN_SHADOW_WRITES/g, "noop"),
    }),
  );

  expectKill("6 Jev grades answer", "JEV_GRADES_ANSWER", () =>
    checkSources({
      ...base,
      shadowSource: `${base.shadowSource}\ngradeCorrect(); setGrade(); writeMastery();\n`,
    }),
  );

  expectKill("7 Jev grades tone", "JEV_GRADES_TONE", () =>
    checkSources({
      ...base,
      shadowSource: `${base.shadowSource}\n// gradeTone: tone was correct acoustically\n`,
    }),
  );

  expectKill("8 Jev invents exercise", "JEV_INVENTS_EXERCISE", () => {
    const fake = {
      ...m,
      shadow: {
        ...m.shadow,
        resolveShadowChoice: () => ({ choice: "MAKE_NEW_DRILL", abstained: false, reason: "ok" }),
      },
    };
    return checkBehavioral(fake, base.calibrationJson);
  });

  expectKill("9 bypasses teach-before-test", "BYPASSES_TEACH_BEFORE_TEST", () => {
    const fake = {
      ...m,
      shadow: {
        ...m.shadow,
        buildCandidateSet: (s) => [...m.shadow.buildCandidateSet(s), "SWITCH_TO_EASIER_EVIDENCE"],
      },
    };
    return checkBehavioral(fake, base.calibrationJson);
  });

  expectKill("10 exposes future curriculum", "EXPOSES_FUTURE_CURRICULUM", () =>
    checkSources({
      ...base,
      shadowSource: `${base.shadowSource}\nunlockCurriculum(futureUnit); exposeFuture();\n`,
    }),
  );

  expectKill("11 no deterministic fallback", "NO_DETERMINISTIC_FALLBACK", () =>
    checkSources({
      ...base,
      shadowSource: base.shadowSource.replace(/deterministicIntervention|deterministic/g, "aiOnly"),
    }),
  );

  expectKill("12 no abstention", "NO_ABSTENTION", () =>
    checkSources({
      ...base,
      shadowSource: base.shadowSource.replace(/ABSTAIN/g, "FORCE"),
    }),
  );

  expectKill("13 runtime without promotion", "RUNTIME_ENABLED_WITHOUT_PROMOTION", () =>
    checkSources({
      ...base,
      budgetPolicySource: base.budgetPolicySource.replace(
        "JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED: false",
        "JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED: true",
      ),
    }),
  );

  expectKill("14 experiment without owner approval", "EXPERIMENT_WITHOUT_OWNER_APPROVAL", () => {
    const fake = {
      ...m,
      shadow: {
        ...m.shadow,
        recommendShadowPromotion: () => "READY_FOR_CONTROLLED_EXPERIMENT",
        computeShadowMetrics: () => ({
          events: 5,
          uniqueStates: 5,
          jevAvailable: true,
          interveneRate: 0.5,
          agreementRate: 1,
          falseInterruptionRate: 0,
          missedStruggleRate: 0,
          lowConfidenceRate: 0,
          abstainRate: 0,
          estimatedCallsPer100Sessions: 1,
          costEstimate: 1,
          recommendation: "READY_FOR_CONTROLLED_EXPERIMENT",
        }),
      },
    };
    return checkBehavioral(fake, base.calibrationJson);
  });

  expectKill("15 cost unchecked", "COST_UNCHECKED", () =>
    checkSources({
      ...base,
      shadowSource: base.shadowSource.replace(/costEstimate|costUnits|estimatedCallsPer100Sessions/g, "noCost"),
      reportJson: JSON.stringify({ recommendation: "KEEP_SHADOW" }),
    }),
  );

  expectKill("16 call on every tap", "CALL_ON_EVERY_TAP", () =>
    checkSources({
      ...base,
      shadowSource: base.shadowSource.replace(/shouldTriggerShadowCall/g, "alwaysCall"),
    }),
  );

  expectKill("17 engagement as learning metric", "ENGAGEMENT_AS_LEARNING_METRIC", () => {
    const fake = {
      ...m,
      shadow: {
        ...m.shadow,
        isLearningRelevantMetric: () => true,
      },
    };
    return checkBehavioral(fake, base.calibrationJson);
  });

  expectKill("18 shadow changes progression", "SHADOW_CHANGES_PROGRESSION", () =>
    checkSources({
      ...base,
      shadowSource: base.shadowSource
        .replace(/appliedToLearner:\s*false/g, "appliedToLearner: maybe")
        .replace(/applied_to_learner boolean not null default false/g, "applied_ok"),
      reportJson: "{}",
      calibrationJson: "{}",
      certJson: "{}",
    }),
  );

  expectKill("19 API key client-side", "API_KEY_CLIENT_SIDE", () =>
    checkSources({
      ...base,
      clientSources: [{ file: "src/lib/evil.ts", text: 'const k = import.meta.env.VITE_TYPESAFE_API_KEY;\n' }],
    }),
  );

  expectKill("20 Atomurus", "ATOMURUS_TOUCHED", () =>
    checkSources({ ...base, shadowSource: `${base.shadowSource}\n// Atomurus\n` }),
  );

  // Behavioral calibration checks
  const records = simulateCalibration(m.shadow, base.calibrationJson);
  if (!records.length) {
    console.error("KILL MISS calibration empty");
    process.exit(1);
  }
  const invented = records.find((r) => r.inputHash && true);
  const inventCase = records.find((r) => r.jevChoice === "ABSTAIN" && r.abstained);
  if (!inventCase) {
    console.error("KILL MISS invent/abstain path missing");
    process.exit(1);
  }
  console.log("KILL OK invent→abstain calibration path");

  const noTrigger = JSON.parse(base.calibrationJson).cases.find((c) => c.expectNoTrigger);
  if (noTrigger && m.shadow.shouldTriggerShadowCall(noTrigger.signals)) {
    console.error("KILL MISS first-error should not trigger");
    process.exit(1);
  }
  console.log("KILL OK sparse trigger on first error");

  void invented;
  console.log("PASS test:jev-shadow-learning · 20 kills");
}

if (mode === "test") test();
else if (mode === "report") writeReport();
else validate();
