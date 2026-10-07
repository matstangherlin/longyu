/**
 * RC2.3.5 — gate:rc2-3-5-speech (pure checks over an injectable runtime).
 *
 * G1 CANONICAL_AUDIO     contrast members resolve; same canonical speaker
 * G2 CONFOUNDED_CONTRAST every contrast changes exactly ONE dimension
 * G3 ELIGIBILITY         untaught → never graded; demo-only → discovery only
 * G4 NON_BLOCKING        every failure class has an exit; retry is bounded
 * G5 PRIVACY             no network path in the speech/recording files; evidence drops raw fields
 * G6 ENGINE_JARGON       learner copy never shows engine/locale/service terms
 * G7 EVIDENCE_HONESTY    ASR never becomes a tone/pronunciation score
 * G8 AUDIO_ARBITRATION   recording / model / self-playback own the audio in turn
 * G9 PILOT_LADDER        perception → production → transfer; model audio canonical
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./v495a-runtime.mjs";

export const SPEECH_FILES = {
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  contrastDrill: "src/features/pinyin/PronunciationContrastDrill.tsx",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  speech: "src/lib/speech.ts",
  speechEvidence: "src/lib/speechEvidence.ts",
  selfPlayback: "src/lib/selfPlayback.ts",
};

/** Learner-visible message keys of the speech surfaces. */
const LEARNER_KEY_RE = /^player\.(speech|mic|pron|selfCompare|voice|cannotSpeak|listening|speak|stopListening|yourRecording|youLabel|targetLabel)/;
const JARGON_RE = /SpeechRecognizer|recognizer|\blocale\b|zh-CN|\bengine\b|\bmotor\b|timeout|model package|pacote de modelo|ERROR_|\bAPI\b|MediaRecorder|getUserMedia|WebView/i;
const TONE_CLAIM_RE = /tom (está )?(perfeito|correto|certo)|acertou o (primeiro|segundo|terceiro|quarto) tom|pronúncia \d+ ?%|\d+ ?% de pronúncia|perfect tone|tone (is )?(perfect|correct)|pronunciation \d+ ?%/i;
const NETWORK_RE = /\bfetch\(|getSupabaseClient|functions\.invoke|sendBeacon|XMLHttpRequest|new FormData|\.upload\(/;

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else if (typeof v === "string") out[key] = v;
  }
  return out;
}

export function loadSpeechRuntime(root) {
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const lib = tsRequire("../../src/lib/audioContrastPairs.ts");
  const failure = tsRequire("../../src/lib/speechFailure.ts");
  const evidence = tsRequire("../../src/lib/speechEvidence.ts");
  const pilot = tsRequire("../../src/lib/speechPilot.ts");
  const manifest = tsRequire("../../src/data/audioManifest.generated.ts");
  const voice = tsRequire("../../src/lib/audio/voiceConsistency.ts");
  const { MINIMAL_PAIRS } = tsRequire("../../src/data/perceptionDrills.ts");
  const { PRONUNCIATION_CORE_BR } = tsRequire("../../src/data/pronunciationCoreBr.ts");
  const { ptBR } = tsRequire("../../src/locales/pt-BR.ts");
  const { en } = tsRequire("../../src/locales/en.ts");
  return {
    library: lib.buildContrastLibrary(),
    classify: lib.classifyContrast,
    side: (hanzi, pinyin) => {
      const entry = manifest.audioEntryByText(hanzi);
      const seg = lib.pinyinSegments(pinyin);
      return { hanzi, pinyin, meaningPt: "", tone: lib.pinyinTone(pinyin), ...seg, audioId: entry?.audioId ?? null, speaker: entry?.speaker ?? null };
    },
    eligibility: lib.contrastEligibility,
    allows: lib.contrastAllows,
    soundsShareCanonicalVoice: lib.soundsShareCanonicalVoice,
    canonicalSpeaker: voice.CANONICAL_SPEAKER_TAG,
    audioEntryByText: manifest.audioEntryByText,
    minimalPairs: MINIMAL_PAIRS,
    coreBr: PRONUNCIATION_CORE_BR,
    failureCategories: failure.SPEECH_FAILURE_CATEGORIES,
    fallbackActions: failure.speechFallbackActions,
    shouldLeave: failure.shouldLeaveRecognition,
    normalizeEvidence: evidence.normalizeSpeechEvidence,
    evidenceFields: evidence.SPEECH_EVIDENCE_FIELDS,
    pilot: pilot.SPEECH_PILOT,
    ladderOrdered: pilot.pilotLadderIsOrdered,
    // audioArbiter importa techEvents (import.meta) — lê a lista do código.
    audioOwners: [...(read("src/lib/audioArbiter.ts").match(/AUDIO_OWNERS = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]),
    messages: { pt: flatten(ptBR), en: flatten(en) },
    src: Object.fromEntries(Object.entries(SPEECH_FILES).map(([k, rel]) => [k, read(rel)])),
  };
}

export function runSpeechGate(rt) {
  const failures = [];
  const fail = (code, subject, message) => failures.push({ code, subject, message });
  const accepted = rt.library.accepted;

  // G1 — canonical audio, same speaker.
  if (accepted.length < 40) fail("LIBRARY_TOO_SMALL", "library", `${accepted.length} pares aceitos`);
  for (const e of accepted) {
    for (const s of [e.a, e.b]) {
      const entry = rt.audioEntryByText(s.hanzi);
      if (!entry || entry.audioId !== s.audioId) fail("MISSING_MODEL_AUDIO", e.id, `${s.hanzi} sem asset canônico`);
    }
    if (e.a.speaker !== rt.canonicalSpeaker || e.b.speaker !== e.a.speaker) fail("SPEAKER_MISMATCH", e.id, `${e.a.speaker} × ${e.b.speaker}`);
  }
  for (const d of rt.minimalPairs) {
    const a = rt.audioEntryByText(d.a.hanzi);
    const b = rt.audioEntryByText(d.b.hanzi);
    if (!a || !b) fail("MISSING_MODEL_AUDIO", d.id, "par da Jornada sem asset");
    else if (a.speaker !== b.speaker || a.speaker !== rt.canonicalSpeaker) fail("SPEAKER_MISMATCH", d.id, `${a.speaker} × ${b.speaker}`);
  }
  if (!/soundsShareCanonicalVoice\(/.test(rt.src.contrastDrill) || !/audioReady \?/.test(rt.src.contrastDrill)) {
    fail("MIXED_VOICE_DRILL", "PronunciationContrastDrill", "drill toca A/B sem exigir voz canônica comum");
  }

  // G2 — one dimension per contrast.
  for (const e of accepted) {
    const cls = rt.classify(e.a, e.b);
    if (typeof cls === "string") fail("CONFOUNDED_CONTRAST", e.id, cls);
  }
  for (const d of rt.minimalPairs) {
    const cls = rt.classify(rt.side(d.a.hanzi, d.a.pinyin), rt.side(d.b.hanzi, d.b.pinyin));
    if (typeof cls === "string") fail("CONFOUNDED_CONTRAST", d.id, `${d.a.pinyin}/${d.b.pinyin}: ${cls}`);
  }
  for (const c of rt.coreBr) {
    for (let i = 1; i < c.sounds.length; i += 1) {
      const cls = rt.classify(rt.side(c.sounds[0].hanzi, c.sounds[0].pinyin), rt.side(c.sounds[i].hanzi, c.sounds[i].pinyin));
      if (typeof cls === "string") fail("CONFOUNDED_CONTRAST", c.id, cls);
    }
  }

  // G3 — eligibility.
  const sample = accepted.find((e) => !e.discoveryOnly);
  if (sample) {
    const none = new Set();
    const both = new Set([sample.a.hanzi, sample.b.hanzi]);
    const one = new Set([sample.a.hanzi]);
    if (rt.allows(rt.eligibility(sample, none), "PERCEPTION")) fail("UNTAUGHT_GRADED", sample.id, "par não visto vale nota");
    if (rt.allows(rt.eligibility(sample, one), "PERCEPTION")) fail("UNTAUGHT_GRADED", sample.id, "só um lado visto vale nota");
    if (!rt.allows(rt.eligibility(sample, none), "DISCOVERY")) fail("DISCOVERY_BLOCKED", sample.id, "ouvir sem nota bloqueado");
    if (rt.allows(rt.eligibility(sample, both), "PRODUCTION")) fail("PRODUCTION_BEFORE_PERCEPTION", sample.id, "produção sem percepção concluída");
    if (!rt.allows(rt.eligibility(sample, both, { perceptionPassed: true }), "PRODUCTION")) fail("PRODUCTION_BLOCKED", sample.id, "produção nunca abre");
    const silent = { ...sample, b: { ...sample.b, audioId: null } };
    if (rt.eligibility(silent, both, { perceptionPassed: true }) !== "NOT_READY") fail("MISSING_MODEL_AUDIO", sample.id, "par mudo elegível");
  }
  for (const demo of accepted.filter((e) => e.discoveryOnly)) {
    if (rt.allows(rt.eligibility(demo, new Set([demo.a.hanzi, demo.b.hanzi]), { perceptionPassed: true }), "PERCEPTION")) {
      fail("UNTAUGHT_GRADED", demo.id, "par contrastOnly vale nota");
    }
  }

  // G4 — non-blocking.
  for (const category of rt.failureCategories) {
    for (const canRecord of [true, false]) {
      const actions = rt.fallbackActions(category, { canRecord, canDownload: false });
      if (!actions.includes("continue_without_speaking")) fail("RECOGNITION_BLOCKS", category, "sem 'continuar sem falar'");
      if (canRecord && ["NO_SERVICE", "NO_ZH_CN", "NETWORK", "UNKNOWN"].includes(category) && !actions.includes("record_compare")) {
        fail("NO_SELF_COMPARE_FALLBACK", category, "sem gravar e comparar");
      }
    }
    if (category !== "PERMISSION_DENIED" && !rt.shouldLeave(5, category)) fail("RECOGNITION_LOOP", category, "retry sem limite");
  }
  for (const [name, src] of [["SelfComparePractice", rt.src.selfCompare], ["PronunciationPractice", rt.src.pronunciation]]) {
    if (!/cannotSpeakNow|speechContinueWithout/.test(src)) fail("RECOGNITION_BLOCKS", name, "sem saída sem falar");
  }

  // G5 — privacy.
  for (const [name, src] of Object.entries(rt.src)) {
    if (NETWORK_RE.test(src)) fail("RAW_AUDIO_UPLOAD", name, "caminho de rede no código de fala/gravação");
  }
  const probe = rt.normalizeEvidence({ conceptId: "c", activityId: "a", mode: "ASR", transcript: "你好", audioUrl: "blob:x", score: 99, toneCorrect: true, recognitionAttempted: true, recognitionSucceeded: true });
  for (const key of Object.keys(probe)) {
    if (!rt.evidenceFields.includes(key)) fail("RAW_FIELD_STORED", key, "evidência guarda campo fora do contrato");
  }
  if (!/URL\.revokeObjectURL/.test(rt.src.selfCompare) || !/nativeDeletePracticeRecording/.test(rt.src.selfCompare)) {
    fail("RECORDING_NOT_DELETED", "SelfComparePractice", "gravação temporária não é apagada");
  }

  // G6 — engine jargon in learner copy.
  for (const [lang, msgs] of Object.entries(rt.messages)) {
    for (const [key, value] of Object.entries(msgs)) {
      if (LEARNER_KEY_RE.test(key) && JARGON_RE.test(value)) fail("ENGINE_JARGON", `${lang}:${key}`, value.slice(0, 80));
    }
  }

  // G7 — evidence honesty.
  for (const key of rt.evidenceFields) {
    if (/tone|score|accura|pronunciationCorrect|transcript|audio(Url|Blob|Uri)|pitch/i.test(key)) fail("ASR_AS_TONE_SCORE", key, "campo de nota/áudio no contrato");
  }
  if (Object.prototype.hasOwnProperty.call(probe, "toneCorrect")) fail("ASR_AS_TONE_SCORE", "probe", "toneCorrect sobreviveu");
  for (const [lang, msgs] of Object.entries(rt.messages)) {
    for (const [key, value] of Object.entries(msgs)) {
      if (TONE_CLAIM_RE.test(value)) fail("ASR_AS_TONE_SCORE", `${lang}:${key}`, value.slice(0, 80));
    }
  }
  if (/setCorrect\([^)]*tone|toneCorrect/.test(rt.src.pronunciation)) fail("ASR_AS_TONE_SCORE", "PronunciationPractice", "reconhecimento vira tom");

  // G8 — audio arbitration.
  for (const owner of ["CANONICAL_MEDIA", "SELF_PLAYBACK", "RECORDING", "RECOGNITION"]) {
    if (!rt.audioOwners.includes(owner)) fail("ARBITER_OWNER_MISSING", owner, "dono de áudio ausente");
  }
  if (!/claimAudio\("RECORDING"/.test(rt.src.selfCompare)) fail("ARBITER_BYPASS", "SelfComparePractice", "gravação sem claimAudio");
  if (!/claimAudio\("SELF_PLAYBACK"/.test(rt.src.selfCompare)) fail("ARBITER_BYPASS", "SelfComparePractice", "reprodução sem claimAudio");
  if (!/releaseAudio\("SELF_PLAYBACK"/.test(rt.src.selfCompare)) fail("ARBITER_LEAK", "SelfComparePractice", "posse não liberada");

  // G9 — pilot ladder.
  const byPair = new Map(accepted.map((e) => [`${e.a.hanzi}|${e.b.hanzi}`, e]));
  if (rt.pilot.length < 8) fail("PILOT_INCOMPLETE", "pilot", `${rt.pilot.length} itens`);
  for (const item of rt.pilot) {
    if (!rt.ladderOrdered(item.ladder)) fail("LADDER_ORDER", item.id, item.ladder.join(">"));
    if (!rt.audioEntryByText(item.modelAudioText)) fail("MISSING_MODEL_AUDIO", item.id, item.modelAudioText);
    if (!item.fallback) fail("NO_FALLBACK", item.id, "sem fallback");
    if (item.contrastPair) {
      const key = [...item.contrastPair].sort().join("|");
      const entry = byPair.get(key);
      if (!entry) fail("PILOT_PAIR_NOT_IN_LIBRARY", item.id, key);
      else {
        if (!item.ladder.includes("PERCEPTION")) fail("LADDER_ORDER", item.id, "contraste sem percepção");
        if (rt.allows(rt.eligibility(entry, new Set()), "PRODUCTION")) fail("UNTAUGHT_GRADED", item.id, "produção para aluno novo");
      }
    }
  }
  return failures;
}
