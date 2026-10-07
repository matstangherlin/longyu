#!/usr/bin/env node
/**
 * test:rc2-3-5-speech — mutation testing for gate:rc2-3-5-speech.
 * Each mutation breaks ONE speech rule and the right code must fire.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSpeechRuntime, runSpeechGate } from "./lib/speech-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadSpeechRuntime(root);
assert.deepEqual(runSpeechGate(base), [], "estado real precisa passar");

const lib = (patch) => ({ ...base.library, ...patch });
const first = base.library.accepted[0];
const src = (key, from, to) => ({ ...base.src, [key]: base.src[key].replace(from, to) });
const withMsg = (lang, key, value) => ({ ...base.messages, [lang]: { ...base.messages[lang], [key]: value } });

const cases = [
  ["1. A/B com locutores diferentes", { library: lib({ accepted: [{ ...first, b: { ...first.b, speaker: "tts-device-voice" } }, ...base.library.accepted.slice(1)] }) }, "SPEAKER_MISMATCH"],
  ["2. áudio-modelo ausente", { library: lib({ accepted: [{ ...first, a: { ...first.a, audioId: "audio:missing:v1" } }, ...base.library.accepted.slice(1)] }) }, "MISSING_MODEL_AUDIO"],
  ["3. reconhecimento vira bloqueio obrigatório", { fallbackActions: (c, o) => base.fallbackActions(c, o).filter((a) => a !== "continue_without_speaking") }, "RECOGNITION_BLOCKS"],
  ["4. jargão do motor na tela do aluno", { messages: withMsg("pt", "player.speechServiceUnavailable", "SpeechRecognizer indisponível (locale zh-CN).") }, "ENGINE_JARGON"],
  ["5. gravação crua enviada", { src: src("selfCompare", "countAttempt();", "countAttempt(); void fetch('/upload', { method: 'POST', body: blob });") }, "RAW_AUDIO_UPLOAD"],
  ["6. recognizedText vira toneCorrect", { normalizeEvidence: (input) => ({ ...base.normalizeEvidence(input), toneCorrect: input.recognitionSucceeded }) }, "ASR_AS_TONE_SCORE"],
  ["6b. copy promete tom perfeito pelo ASR", { messages: withMsg("pt", "player.pronOkTone", "Frase reconhecida — tom perfeito!") }, "ASR_AS_TONE_SCORE"],
  ["7. alvo não ensinado entra em produção", { eligibility: (entry, _known, opts) => base.eligibility(entry, new Set([entry.a.hanzi, entry.b.hanzi]), { ...opts, perceptionPassed: true }) }, "UNTAUGHT_GRADED"],
  ["8. atividade sem fallback", { pilot: [{ ...base.pilot[0], fallback: undefined }, ...base.pilot.slice(1)] }, "NO_FALLBACK"],
  ["9. par confundido (tom + inicial)", { minimalPairs: [...base.minimalPairs, { id: "mp_bad", a: { hanzi: "是", pinyin: "shì" }, b: { hanzi: "西", pinyin: "xī" } }] }, "CONFOUNDED_CONTRAST"],
  ["10. drill toca A/B sem voz comum", { src: src("contrastDrill", "soundsShareCanonicalVoice(", "alwaysTrue(") }, "MIXED_VOICE_DRILL"],
  ["11. reconhecimento em loop", { shouldLeave: () => false }, "RECOGNITION_LOOP"],
  ["12. gravação sem dono de áudio", { src: src("selfCompare", 'claimAudio("RECORDING"', 'noop("RECORDING"') }, "ARBITER_BYPASS"],
  ["13. produção antes da percepção no piloto", { pilot: [{ ...base.pilot[0], ladder: ["PRODUCTION", "PERCEPTION"] }, ...base.pilot.slice(1)] }, "LADDER_ORDER"],
  ["14. gravação temporária não é apagada", { src: src("selfCompare", /URL\.revokeObjectURL/g, "keepObjectURL") }, "RECORDING_NOT_DELETED"],
  ["15. evidência guarda a transcrição", { normalizeEvidence: (input) => ({ ...base.normalizeEvidence(input), transcript: input.transcript }) }, "RAW_FIELD_STORED"],
];

let killed = 0;
for (const [label, patch, code] of cases) {
  const got = new Set(runSpeechGate({ ...base, ...patch }).map((f) => f.code));
  assert.ok(got.has(code), `mutação "${label}" deveria falhar com ${code}; veio ${[...got].join(", ") || "nada"}`);
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS test:rc2-3-5-speech (${killed}/${cases.length} mutações mortas)`);
