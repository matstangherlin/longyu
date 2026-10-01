#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-30-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = VALIDATORS[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(VALIDATORS).join("|")}>`);
  process.exit(2);
}
const base = await loadState();
if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(`${mode}:${area}`, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: ${from.slice(0, 80)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};

const MUTATIONS = {
  "release-truth": [
    ["[14] P1 open allows Closed Beta", "P1_OPEN_ALLOWS_CLOSED", (s) => {
      s.base = { ...s.base, status: "READY_FOR_CLOSED", closedBetaEntry: false };
      s.bugs = JSON.parse(JSON.stringify(s.bugs));
      s.bugs.open.P1 = ["ANDROID_CONVERSATION_CONTINUE_STALL"];
    }],
    ["[15] P0 open allows beta stages", "P0_OPEN_ALLOWS_BETA", (s) => {
      s.base = { ...s.base, status: "READY_FOR_INTERNAL" };
      s.bugs = JSON.parse(JSON.stringify(s.bugs));
      s.bugs.open.P0 = 1;
    }],
    ["[25] #273 / freeze", "FREEZE_EXCEPTION", src("curriculumFreeze", "RC2_2_30_", "RC2_2_XX_")],
    ["[27] billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
  ],
  "physical-proof": [
    ["[1] CODE_READY auto APK_PASS", "CODE_READY_AUTO_APK", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      s.matrix.requiredChecks[0].result = "PASS";
      s.matrix.requiredChecks[0].evidence = "CODE_READY";
    }],
    ["[2] Web PASS as Physical", "CODE_READY_AUTO_APK", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "guidedTry10ColdStarts") || s.matrix.requiredChecks[0];
      c.result = "PASS";
      c.evidence = "WEB_PASS";
    }],
    ["[3] Conversation 19/20 accepted", "CONVERSATION_19_OF_20", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "conversation20Transitions");
      c.result = "PASS";
      c.evidence = "PHYSICAL";
      c.score = 19;
    }],
    ["[4] Guided Try 9/10 accepted", "GUIDED_TRY_9_OF_10", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "guidedTry10ColdStarts");
      c.result = "PASS";
      c.evidence = "PHYSICAL";
      c.score = 9;
    }],
  ],
  "play-internal": [
    ["[11] sideload as Play install", "SIDELOAD_AS_PLAY", (s) => {
      s.play = JSON.parse(JSON.stringify(s.play));
      s.play.installFromPlay = { status: "PASS", evidence: "sideload apk", artifact: "app-debug.apk" };
    }],
    ["[12] debug APK as Internal", "DEBUG_AS_INTERNAL", (s) => {
      s.play = JSON.parse(JSON.stringify(s.play));
      s.play.installFromPlay = { status: "PASS", evidence: "internal", artifact: "app-debug.apk" };
    }],
  ],
  "play-upgrade": [
    ["[13] N→N+1 without progress PASS", "NN1_PROGRESS_LOST", (s) => {
      s.nn1 = JSON.parse(JSON.stringify(s.nn1));
      s.nn1.status = "PASS";
      s.nn1.preserve = { account: "PASS", progress: "FAIL", xp: "PASS", streak: "PASS", settings: "PASS", cache: "PASS" };
    }],
  ],
  conversation: [
    ["[22] audio controls state", "AUDIO_CONTROLS_STATE", (s) => {
      s.src.conversation = s.src.conversation.replace(
        "function goTo(\n    targetId: string | undefined,\n    _speakTarget?: ConversationNode,\n    opts?: { reuseTransitionId?: string }\n  ) {",
        'function goTo(\n    targetId: string | undefined,\n    _speakTarget?: ConversationNode,\n    opts?: { reuseTransitionId?: string }\n  ) {\n    void playMandarinAudio("x");'
      );
    }],
  ],
  "guided-try": [
    ["debug UI in learner", "DEBUG_IN_LEARNER", src("guidedTry", 'data-testid="guided-try"', 'data-testid="guided-try" data-x="TTS: NATIVE"')],
  ],
  auth: [
    ["[5] signup NOT_RUN accepted for closed", "SIGNUP_NOT_RUN", (s) => {
      s.base = { ...s.base, status: "READY_FOR_CLOSED" };
      s.bugs = JSON.parse(JSON.stringify(s.bugs));
      s.bugs.open.P1 = [];
      s.bugs.open.P0 = 0;
    }],
  ],
  recovery: [
    ["[6] OTP fake PASS", "OTP_FAKE_PASS", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "otpRecovery");
      c.result = "PASS";
      c.evidence = "CODE_READY";
    }],
  ],
  "self-compare": [
    ["[7] Self Compare without hear", "SELF_COMPARE_FAKE", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "selfCompareOwnerHear");
      c.result = "PASS";
      c.evidence = "CODE_READY";
    }],
  ],
  guidance: [
    ["[10] coachmark never shown PASS", "COACHMARK_FAKE", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "toneGuidanceVisible") || s.matrix.requiredChecks.find((x) => x.id === "profileGuidanceVisible");
      c.result = "PASS";
      c.evidence = "CODE";
    }],
  ],
  energy: [
    ["[9] zero Charges no free path", "ZERO_CHARGE_FAKE", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "zeroChargesUsable");
      c.result = "PASS";
      c.evidence = "WEB";
    }],
  ],
  navigation: [
    ["[8] local profile after logout accepted", "LOCAL_ID_FAKE", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const c = s.matrix.requiredChecks.find((x) => x.id === "noLocalIdentity");
      c.result = "PASS";
      c.evidence = "CODE_READY";
    }],
  ],
  completion: [
    ["[18] completion not seen OWNER_ACCEPTED", "COMPLETION_FAKE_OWNER", (s) => {
      s.owner = JSON.parse(JSON.stringify(s.owner));
      const or60 = s.owner.items.find((i) => i.id === "OR60");
      or60.ownerAccepted = true;
      or60.ownerSaw = true;
      or60.apkState = "NOT_RUN";
    }],
  ],
  stability: [],
  "human-learning": [
    ["[17] invented feedback as OBSERVED", "LEARNING_CLASSES", src("learning", "OBSERVED", "GUESSED")],
  ],
  "owner-acceptance": [
    ["[23] owner request reset", "OWNER_FAKE_ACCEPT", (s) => {
      s.owner = JSON.parse(JSON.stringify(s.owner));
      s.owner.items[0].ownerAccepted = true;
      s.owner.items[0].ownerSaw = false;
    }],
  ],
};

const mutations = MUTATIONS[area] ?? [];
let failed = 0;
for (const [label, code, mutate] of mutations) {
  const state = await loadState();
  mutate(state);
  const failures = await gate(state);
  if (!failures.some((f) => f.code === code)) {
    console.error(`FAIL mutation: ${label} (esperava ${code})`);
    console.error(report(`test:${area}`, failures));
    failed += 1;
  } else console.log(`PASS mutation: ${label}`);
}
if (!mutations.length) console.log(`PASS test:${area} (validate-only)`);
process.exit(failed ? 1 : 0);
