#!/usr/bin/env node
/**
 * RC2.2.32 — asserts de contrato (fonte) para voz, contraste, inline, fala e sensorial.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

let failed = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`PASS ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${label}: ${err instanceof Error ? err.message : err}`);
  }
}

check("canonical voice profile", () => {
  const voice = read("src/lib/audio/voiceConsistency.ts");
  assert.match(voice, /zh-CN-XiaoxiaoNeural/);
  assert.match(voice, /FIXED_CONTENT_NATIVE_TTS_FALLBACK/);
  assert.match(voice, /recordVoicePlayback/);
});

check("FIXED order excludes TTS", () => {
  const policy = read("src/lib/audio/audioEnginePolicy.ts");
  const order = policy.match(/FIXED_CONTENT_ENGINE_ORDER[\s\S]*?\] as const/)?.[0] ?? "";
  assert.ok(order.includes("canonical-asset"));
  assert.ok(order.includes("textual-fallback"));
  assert.ok(!order.includes("native-tts"), order);
  assert.ok(!order.includes("web-tts"), order);
});

check("playback blocks FIXED TTS fallback", () => {
  const playback = read("src/lib/audioPlayback.ts");
  assert.match(playback, /fixedContentAllowsTtsEngine/);
  assert.match(playback, /noteVoiceDecision/);
  assert.match(playback, /contentClass !== "FIXED_CONTENT"/);
});

check("contrast seed texts in corpus", () => {
  const manifest = read("src/data/audioManifest.generated.ts");
  for (const text of ["西", "十", "谢", "小", "妈", "麻", "马", "骂"]) {
    assert.ok(manifest.includes(`textKey: "${text}"`), `missing ${text}`);
  }
  assert.match(manifest, /fixed-speech-xiaoxiao-v1/);
  const count = (manifest.match(/audioId:/g) || []).length;
  assert.ok(count >= 600, `corpus size ${count}`);
});

check("contrast pairs require same voice", () => {
  const contrast = read("src/lib/audioContrastPairs.ts");
  assert.match(contrast, /sameCanonicalVoiceRequired:\s*true/);
  assert.match(contrast, /contrast:xi-shi:v1/);
  assert.match(contrast, /auditAudioContrastPairs/);
});

check("inline guidance separate from global budget", () => {
  const ped = read("src/lib/pedagogicalInlineGuidance.ts");
  assert.match(ped, /NÃO consome orçamento de sessão/);
  assert.match(ped, /shouldAutoShowPedagogicalInline/);
  assert.match(ped, /hanzi_builder/);
  assert.match(ped, /speech_self_compare/);
  const orch = read("src/lib/guidanceOrchestrator.ts");
  assert.match(orch, /pedagogicalInlineGuidance/);
  assert.match(orch, /GUIDANCE_SESSION_BUDGET\s*=\s*1/);
});

check("conversation integrity detectors", () => {
  const src = read("src/lib/conversationIntegrity.ts");
  for (const code of ["EMPTY_SPEECH", "TRUNCATED_SPEECH", "SCAFFOLD_LEAK", "NO_CONTINUATION", "UNDEFINED_LITERAL"]) {
    assert.ok(src.includes(code), code);
  }
  assert.match(src, /inspectSpeechText/);
  assert.match(src, /inspectConversationGraph/);
});

check("speech student message is human", () => {
  const speech = read("src/lib/speech.ts");
  assert.match(speech, /Não consegui analisar sua fala agora/);
});

check("sensory matrix forbids scroll/nav haptics", () => {
  const sensory = read("src/lib/sensoryFeedbackMatrix.ts");
  assert.match(sensory, /event: "scroll"[\s\S]*?allowed: false/);
  assert.match(sensory, /event: "navigation"[\s\S]*?allowed: false/);
  assert.match(sensory, /answerCorrect/);
  const haptics = read("src/lib/haptics.ts");
  assert.match(haptics, /hapticsEnabled/);
});

check("pedagogical surfaces use canonical player", () => {
  for (const rel of [
    "src/features/som/SomPage.tsx",
    "src/components/tone/ToneContrastCard.tsx",
    "src/features/immersion/ImmersionPage.tsx",
    "src/features/lesson/steps.tsx",
    "src/features/pinyin/PinyinLabPage.tsx",
  ]) {
    const body = read(rel);
    assert.ok(body.includes("playMandarinAudio"), `${rel} missing playMandarinAudio`);
  }
});

check("#273 billing still absent", () => {
  const gradle = read("android/app/build.gradle");
  assert.ok(!/billingclient|BillingClient/i.test(gradle));
});

check("reports and physical matrix exist", () => {
  for (const rel of [
    "docs/reports/rc2-2-32-voice-consistency.md",
    "docs/reports/rc2-2-32-speech-experience.md",
    "docs/reports/rc2-2-32-guidance-physical-contract.md",
    "docs/reports/rc2-2-32-sensory-feedback.md",
    "docs/reports/rc2-2-32-conversation-integrity.md",
    "docs/reports/rc2-2-32-closure.md",
    "docs/release/rc2-2-32-physical-matrix.json",
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
  }
  const matrix = JSON.parse(read("docs/release/rc2-2-32-physical-matrix.json"));
  assert.equal(matrix.waveReadyForClosedBeta, false);
  assert.ok(matrix.requiredChecks.every((c) => c.result !== "PASS" || c.evidence === "PHYSICAL"));
});

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nPASS test-rc2-2-32-unit");
