#!/usr/bin/env node
/**
 * Mutation tests for mobile-beta-readiness — refuses formal PASS from preflight.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertMobileBetaReadiness } from "./lib/mobile-beta-readiness.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = assertMobileBetaReadiness(root);
assert.equal(baseline.ok, true, baseline.failures.join("; "));

function withTempTree(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-mobile-preflight-"));
  const copyRel = [
    "src/features/lesson/steps.tsx",
    "src/features/lesson/FreeAnswerField.tsx",
    "src/lib/speech.ts",
    "src/features/lesson/feedbackAudioPolicy.ts",
    "src/components/guide/GuideDialogue.tsx",
    "src/hooks/useVisualViewportFrame.ts",
    "src/lib/staleBundle.ts",
    "src/routes.tsx",
    "src/components/system/ErrorBoundary.tsx",
    "src/components/system/PwaUpdateBanner.tsx",
    "vite.config.ts",
    "netlify.toml",
    "docs/release/device-test-matrix.md",
    "docs/release/device-preflight.json",
    "docs/release/rc1-operational-checks.json",
    "src/locales/pt-BR.ts",
    "src/locales/en.ts",
  ];
  for (const rel of copyRel) {
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, rel), dest);
  }
  mutate(tmp);
  return assertMobileBetaReadiness(tmp);
}

function kill(label, mutate) {
  const result = withTempTree(mutate);
  assert.equal(result.ok, false, `${label} should FAIL`);
  console.log(`KILLED ${label}: ${result.failures[0]}`);
}

kill("sticky CTA loses safe-area", (tmp) => {
  const p = path.join(tmp, "src/features/lesson/steps.tsx");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replaceAll("safe-area-inset-bottom", "SAFE_AREA_REMOVED"));
});

kill("speech unavailable keeps dead CTA contract", (tmp) => {
  const p = path.join(tmp, "src/features/lesson/FreeAnswerField.tsx");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/isRecognitionAvailable/g, "ALWAYS_SHOW_MIC"));
});

kill("stale bundle reload loop", (tmp) => {
  const p = path.join(tmp, "src/lib/staleBundle.ts");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/STALE_BUNDLE_RELOAD_KEY/g, "STALE_KEY_REMOVED"));
});

kill("preflight flips formal android PASS", (tmp) => {
  const p = path.join(tmp, "docs/release/device-preflight.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.android.formalPass = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("ops json flips pwa_upgrade PASS from preflight", (tmp) => {
  const p = path.join(tmp, "docs/release/rc1-operational-checks.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.checks.pwa_upgrade.pass = true;
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
});

kill("PWA update banner auto-reloads in a loop", (tmp) => {
  const p = path.join(tmp, "src/components/system/PwaUpdateBanner.tsx");
  // Auto-reload on needRefresh without user click — forbidden loop risk.
  fs.writeFileSync(
    p,
    fs.readFileSync(p, "utf8").replace(
      /onNeedRefresh\(\)\s*\{\s*setNeedRefresh\(true\);\s*\}/,
      "onNeedRefresh() { void updateSWRef.current?.(true); window.location.reload(); }"
    )
  );
});

kill("dialogue_choice loses data-option-index", (tmp) => {
  const p = path.join(tmp, "src/features/lesson/steps.tsx");
  let src = fs.readFileSync(p, "utf8");
  const start = src.indexOf("function StepDialogueChoice");
  const end = src.indexOf("function StepRecognize");
  assert.ok(start >= 0 && end > start, "StepDialogueChoice region");
  const region = src.slice(start, end).replaceAll("optionChoiceDomProps", "OPTION_PROPS_REMOVED");
  fs.writeFileSync(p, src.slice(0, start) + region + src.slice(end));
});

console.log("PASS test:mobile-beta-readiness");
