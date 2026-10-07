/**
 * RC2.2.32 — Canonical Voice, Speech UX, Guidance Delivery & Sensory Consistency.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

export const FILES = {
  policy: "src/lib/audio/audioEnginePolicy.ts",
  voice: "src/lib/audio/voiceConsistency.ts",
  playback: "src/lib/audioPlayback.ts",
  contrast: "src/lib/audioContrastPairs.ts",
  pedagogical: "src/lib/pedagogicalInlineGuidance.ts",
  pedagogicalUi: "src/components/guidance/PedagogicalInlineTip.tsx",
  guidance: "src/lib/guidanceOrchestrator.ts",
  speech: "src/lib/speech.ts",
  speechFailure: "src/lib/speechFailure.ts",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  speechDiag: "src/lib/speechDiagnostics.ts",
  speechDiagPanel: "src/features/lesson/SpeechDiagnosticsPanel.tsx",
  haptics: "src/lib/haptics.ts",
  sensory: "src/lib/sensoryFeedbackMatrix.ts",
  conversationIntegrity: "src/lib/conversationIntegrity.ts",
  conversationScene: "src/features/lesson/ConversationSceneStep.tsx",
  conversationRuntime: "src/lib/conversationRuntime.ts",
  som: "src/features/som/SomPage.tsx",
  toneContrast: "src/components/tone/ToneContrastCard.tsx",
  immersion: "src/features/immersion/ImmersionPage.tsx",
  steps: "src/features/lesson/steps.tsx",
  hanziBuilder: "src/components/hanzi/HanziBuilderExercise.tsx",
  toneTrace: "src/components/tone/ToneTrace.tsx",
  imageChoice: "src/features/lesson/StepImageChoice.tsx",
  manifest: "src/data/audioManifest.generated.ts",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  appGradle: "android/app/build.gradle",
  reportVoice: "docs/reports/rc2-2-32-voice-consistency.md",
  reportSpeech: "docs/reports/rc2-2-32-speech-experience.md",
  reportGuidance: "docs/reports/rc2-2-32-guidance-physical-contract.md",
  reportSensory: "docs/reports/rc2-2-32-sensory-feedback.md",
  reportConversation: "docs/reports/rc2-2-32-conversation-integrity.md",
  reportClosure: "docs/reports/rc2-2-32-closure.md",
  matrix: "docs/release/rc2-2-32-physical-matrix.json",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  return {
    src,
    matrix: exists(FILES.matrix) ? JSON.parse(read(FILES.matrix)) : null,
    reports: {
      voice: exists(FILES.reportVoice),
      speech: exists(FILES.reportSpeech),
      guidance: exists(FILES.reportGuidance),
      sensory: exists(FILES.reportSensory),
      conversation: exists(FILES.reportConversation),
      closure: exists(FILES.reportClosure),
    },
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

export async function validateVoiceConsistency(s) {
  const { failures, fail } = collector();
  if (!/CANONICAL_VOICE_PROFILE\s*=\s*"zh-CN-XiaoxiaoNeural"/.test(s.src.voice)) {
    fail("CANONICAL_VOICE_MISSING", FILES.voice, "zh-CN-XiaoxiaoNeural");
  }
  if (!/FIXED_CONTENT_NATIVE_TTS_FALLBACK/.test(s.src.voice)) {
    fail("FALLBACK_GATE_MISSING", FILES.voice, "FIXED_CONTENT_NATIVE_TTS_FALLBACK");
  }
  if (!/recordVoicePlayback/.test(s.src.voice)) {
    fail("VOICE_INSTRUMENTATION", FILES.voice, "recordVoicePlayback defined");
  }
  if (!/\brecordVoicePlayback\s*\(/.test(s.src.playback)) {
    fail("VOICE_INSTRUMENTATION", FILES.playback, "recordVoicePlayback called from playback");
  }
  // FIXED order must NOT include native-tts / web-tts.
  const order = s.src.policy.match(/FIXED_CONTENT_ENGINE_ORDER[\s\S]*?\] as const/)?.[0] ?? "";
  if (/native-tts/.test(order) || /web-tts/.test(order)) {
    fail("FIXED_CONTENT_TTS_IN_ORDER", FILES.policy, "FIXED_CONTENT_ENGINE_ORDER must exclude TTS");
  }
  if (!/fixedContentAllowsTtsEngine/.test(s.src.policy)) {
    fail("FIXED_TTS_BLOCKER", FILES.policy, "fixedContentAllowsTtsEngine");
  }
  if (!/contentClass !== "FIXED_CONTENT"/.test(s.src.playback) && !/contentClass !== 'FIXED_CONTENT'/.test(s.src.playback)) {
    fail("ASSET_FALLBACK_STILL_TTS", FILES.playback, "FIXED must not silent-TTS on asset fail");
  }
  // Pedagogical surfaces must route via playMandarinAudio / requestMandarinSpeech.
  for (const [key, label] of [
    ["som", "Tone Trainer"],
    ["toneContrast", "ToneContrastCard"],
    ["immersion", "Immersion"],
    ["steps", "lesson steps"],
  ]) {
    const body = s.src[key];
    if (/from ["'].*\/tts["']/.test(body) && /\bspeak\s*\(/.test(body) && !/playMandarinAudio/.test(body)) {
      fail("DIRECT_SPEAK_BYPASS", FILES[key], `${label} still uses raw speak() without canonical player`);
    }
  }
  if (!/speaker:\s*"fixed-speech-xiaoxiao-v1"/.test(s.src.manifest)) {
    fail("CORPUS_SPEAKER", FILES.manifest, "canonical speaker tag");
  }
  const entries = (s.src.manifest.match(/audioId:/g) || []).length;
  if (entries < 600) fail("CORPUS_TOO_SMALL", FILES.manifest, `expected ~657, got ${entries}`);
  if (!s.reports.voice) fail("VOICE_REPORT_MISSING", FILES.reportVoice, "report");
  return failures;
}

export async function validateSpeechExperience(s) {
  const { failures, fail } = collector();
  if (!/Não consegui analisar sua fala agora/.test(s.src.speech)) {
    fail("HUMAN_SPEECH_MESSAGE", FILES.speech, "student-facing recognition fallback copy");
  }
  if (!/SPEAKING_STAGES|speakingStageFor/.test(s.src.selfCompare)) {
    fail("SPEAKING_STAGES", FILES.selfCompare, "OUÇA→GRAVE→OUÇA VOCÊ→COMPARE");
  }
  if (!/speechDiagnosticsEnabled/.test(s.src.speechDiagPanel)) {
    fail("DIAG_GATED", FILES.speechDiagPanel, "diagnostics only when enabled");
  }
  // Student-facing copy must not show raw diagnostic field names as UI text.
  // Property names in updateSpeechDiagnostics(...) are QA-only and allowed.
  for (const file of [s.src.selfCompare, s.src.pronunciation]) {
    if (/>\s*MODEL_MISSING\s*</.test(file) || /["'`]MODEL_MISSING["'`]/.test(file) && /return\s+["'`]MODEL_MISSING/.test(file)) {
      fail("TECH_LEAK_STUDENT_UI", FILES.selfCompare, "MODEL_MISSING");
    }
    if (/>\s*recognitionService\s*</.test(file) || /\{recognitionService\}/.test(file)) {
      fail("TECH_LEAK_STUDENT_UI", FILES.selfCompare, "recognitionService");
    }
    if (/>\s*metadataDuration\s*</.test(file) || /\{metadataDuration\}/.test(file)) {
      fail("TECH_LEAK_STUDENT_UI", FILES.selfCompare, "metadataDuration");
    }
    if (/>\s*recordingEngine\s*</.test(file) || /\{recordingEngine\}/.test(file)) {
      fail("TECH_LEAK_STUDENT_UI", FILES.selfCompare, "recordingEngine");
    }
  }
  if (!/sameCanonicalVoiceRequired/.test(s.src.contrast)) {
    fail("CONTRAST_SAME_VOICE", FILES.contrast, "contrast pairs require same canonical voice");
  }
  if (!/contrast:xi-shi:v2/.test(s.src.contrast) || !/contrast:ma-tones/.test(s.src.contrast)) {
    fail("CONTRAST_SEED", FILES.contrast, "xī/shí and mā tones seed pairs");
  }
  if (!/PedagogicalInlineTip/.test(s.src.selfCompare)) {
    fail("SPEECH_INLINE_TIP", FILES.selfCompare, "first-use speech tip");
  }
  if (!s.reports.speech) fail("SPEECH_REPORT_MISSING", FILES.reportSpeech, "report");
  return failures;
}

export async function validateGuidanceDelivery(s) {
  const { failures, fail } = collector();
  if (!/GUIDANCE_SESSION_BUDGET\s*=\s*1/.test(s.src.guidance)) {
    fail("GLOBAL_BUDGET", FILES.guidance, "global budget must stay 1");
  }
  if (!/pedagogicalInlineGuidance/.test(s.src.guidance)) {
    fail("INLINE_SEPARATION_DOC", FILES.guidance, "orchestrator must document inline separation");
  }
  if (!/PEDAGOGICAL_INLINE_DEFINITIONS/.test(s.src.pedagogical)) {
    fail("INLINE_DEFS", FILES.pedagogical, "inline definitions");
  }
  if (!/shouldAutoShowPedagogicalInline/.test(s.src.pedagogical)) {
    fail("INLINE_AUTO", FILES.pedagogical, "first-exposure auto show");
  }
  if (!/data-pedagogical-inline-help/.test(s.src.pedagogicalUi)) {
    fail("INLINE_HELP_BUTTON", FILES.pedagogicalUi, "? help button");
  }
  for (const [key, interaction] of [
    ["hanziBuilder", "hanzi_builder"],
    ["toneTrace", "tone_trace"],
    ["imageChoice", "image_choice"],
    ["toneContrast", "audio_contrast"],
  ]) {
    if (!new RegExp(`interaction="${interaction}"`).test(s.src[key])) {
      fail("INLINE_NOT_WIRED", FILES[key], interaction);
    }
  }
  if (!/activeLearning/.test(s.src.guidance)) {
    fail("ACTIVE_LEARNING_BLOCK", FILES.guidance, "global guidance blocked during learning");
  }
  if (!/GUIDANCE_RENDER_EVIDENCE_MS/.test(s.src.guidance)) {
    fail("RENDER_EVIDENCE", FILES.guidance, "must not mark seen without render");
  }
  if (!s.reports.guidance) fail("GUIDANCE_REPORT_MISSING", FILES.reportGuidance, "report");
  return failures;
}

export async function validateSensoryFeedback(s) {
  const { failures, fail } = collector();
  if (!/hapticsEnabled/.test(s.src.haptics)) fail("HAPTICS_PREF", FILES.haptics, "hapticsEnabled gate");
  if (!/HAPTIC_MAP/.test(s.src.haptics)) fail("HAPTIC_MAP", FILES.haptics, "closed event map");
  if (!/SENSORY_FEEDBACK_MATRIX/.test(s.src.sensory)) fail("SENSORY_MATRIX", FILES.sensory, "matrix export");
  if (!/answerCorrect/.test(s.src.sensory) || !/answerWrong/.test(s.src.sensory)) {
    fail("SENSORY_EVENTS", FILES.sensory, "correct/wrong rows");
  }
  if (!/scroll[\s\S]*allowed:\s*false/.test(s.src.sensory)) {
    fail("NO_SCROLL_HAPTIC", FILES.sensory, "scroll must be forbidden");
  }
  if (!/haptic\("answerCorrect"\)/.test(s.src.hanziBuilder) && !/haptic\("piecePlaced"\)/.test(s.src.hanziBuilder)) {
    fail("BUILDER_HAPTIC", FILES.hanziBuilder, "builder must haptic on place/correct");
  }
  if (!s.reports.sensory) fail("SENSORY_REPORT_MISSING", FILES.reportSensory, "report");
  return failures;
}

export async function validateConversationIntegrity(s) {
  const { failures, fail } = collector();
  if (!/inspectSpeechText|inspectConversationGraph/.test(s.src.conversationIntegrity)) {
    fail("INTEGRITY_API", FILES.conversationIntegrity, "inspect APIs");
  }
  if (!/EMPTY_SPEECH|TRUNCATED_SPEECH|SCAFFOLD_LEAK/.test(s.src.conversationIntegrity)) {
    fail("INTEGRITY_CODES", FILES.conversationIntegrity, "issue codes");
  }
  // Conversation must remain state-first / not audio-gated.
  if (/audioGatesContinue:\s*true/.test(s.src.conversationScene)) {
    fail("AUDIO_GATES_CONTINUE", FILES.conversationScene, "conversation must not gate on audio");
  }
  if (!/conversationReducer|setLineIndex|onDone/.test(s.src.conversationScene) && !/conversationReducer/.test(s.src.conversationRuntime)) {
    fail("CONVERSATION_RUNTIME", FILES.conversationRuntime, "runtime present");
  }
  if (!s.reports.conversation) fail("CONVERSATION_REPORT_MISSING", FILES.reportConversation, "report");
  return failures;
}

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  if (!s.matrix) {
    fail("MATRIX_MISSING", FILES.matrix, "physical matrix");
    return failures;
  }
  const required = [
    "guidedTry",
    "canonicalVoice10Utterances",
    "completeLesson",
    "conversation10Nodes",
    "recordVoice",
    "hearSelfRecording",
    "recognitionFallback",
    "hanziInteractive",
    "hapticFeel",
    "answerWrong",
    "answerCorrect",
    "lessonCompleteCeremony",
    "firstGuidance",
    "cultureEntry",
    "returnJourney",
    "reviewEntry",
  ];
  const ids = new Set((s.matrix.requiredChecks ?? []).map((c) => c.id));
  for (const id of required) {
    if (!ids.has(id)) fail("MATRIX_INCOMPLETE", FILES.matrix, id);
  }
  for (const check of s.matrix.requiredChecks ?? []) {
    if (check.result === "PASS" && check.evidence !== "PHYSICAL") {
      fail("FAKE_PHYSICAL_PASS", check.id, "auto PASS without PHYSICAL evidence");
    }
  }
  if (s.matrix.waveReadyForClosedBeta === true) {
    const pending = (s.matrix.requiredChecks ?? []).filter((c) => c.result === "NOT_RUN" || c.result === "FAIL");
    if (pending.length) fail("BETA_CLAIM_WITHOUT_PHYSICAL", FILES.matrix, `${pending.length} checks pending`);
  }
  if (/billingclient|BillingClient/i.test(s.src.appGradle)) {
    fail("BILLING_ENABLED", FILES.appGradle, "#273 frozen — no billing");
  }
  if (!s.reports.closure) fail("CLOSURE_REPORT_MISSING", FILES.reportClosure, "closure report");
  return failures;
}

export const VALIDATORS = {
  "voice-consistency": validateVoiceConsistency,
  "speech-experience": validateSpeechExperience,
  "guidance-delivery": validateGuidanceDelivery,
  "sensory-feedback": validateSensoryFeedback,
  "conversation-integrity": validateConversationIntegrity,
  "physical-truth": validatePhysicalTruth,
};
