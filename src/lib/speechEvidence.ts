/**
 * RC2.3.5 — Speech Evidence Contract (local-first, minimal).
 *
 * Hand-off para RC2.3.6 (Personal Mastery): registra O QUE ACONTECEU numa
 * atividade de fala — nunca uma nota de pronúncia. Cada campo é uma evidência
 * distinta e não se converte na outra:
 *
 *   modelHeard          ≠ discriminou corretamente   (perceptionCorrect conta isso)
 *   recordingCaptured   ≠ pronunciou corretamente
 *   recognitionSucceeded≠ tom correto                (ASR transcreve texto, não mede pitch)
 *   completed           ≠ conceito dominado
 *
 * NÃO é coletado (o tipo não tem onde guardar): áudio do microfone, URL/blob
 * da gravação, transcrição, voiceprint, qualquer feature acústica/biométrica.
 * Fica só no aparelho; sync de nuvem é decisão da arquitetura existente.
 */

import { speechToEvidence } from "./mastery/adapters";
import { recordLearningEvidence } from "./mastery/recorder";
import { readScoped, writeScoped } from "./accountStorage";

export const SPEECH_EVIDENCE_STORAGE_KEY = "longyu:speech-evidence-v1";
export const SPEECH_EVIDENCE_SCHEMA_VERSION = 1;
const MAX_EVENTS = 200;

export const SPEECH_EVIDENCE_MODES = ["PERCEPTION", "SELF_COMPARE", "ASR", "CONVERSATIONAL_TRANSFER"] as const;
export type SpeechEvidenceMode = (typeof SPEECH_EVIDENCE_MODES)[number];

export interface SpeechLearningEvidence {
  conceptId: string;
  activityId: string;
  mode: SpeechEvidenceMode;
  modelHeard: boolean;
  recordingCaptured: boolean;
  selfPlaybackHeard: boolean;
  recognitionAttempted: boolean;
  /** Só "o aparelho transcreveu o alvo". Não é pronúncia nem tom. */
  recognitionSucceeded?: boolean;
  /** Rodadas de identificação com áudio confirmado (percepção). */
  perceptionTrials: number;
  perceptionCorrect: number;
  retryCount: number;
  completed: boolean;
  at: number;
}

/** Campos aceitos — qualquer outro (transcript, audioUrl, score…) é descartado. */
export const SPEECH_EVIDENCE_FIELDS = [
  "conceptId",
  "activityId",
  "mode",
  "modelHeard",
  "recordingCaptured",
  "selfPlaybackHeard",
  "recognitionAttempted",
  "recognitionSucceeded",
  "perceptionTrials",
  "perceptionCorrect",
  "retryCount",
  "completed",
  "at",
] as const;

export type SpeechEvidenceInput = Pick<SpeechLearningEvidence, "conceptId" | "activityId" | "mode"> &
  Partial<Omit<SpeechLearningEvidence, "conceptId" | "activityId" | "mode">>;

const int = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Normaliza para o contrato: só campos conhecidos, tipos estritos, nada extra. */
export function normalizeSpeechEvidence(input: SpeechEvidenceInput, now = Date.now()): SpeechLearningEvidence {
  const mode = (SPEECH_EVIDENCE_MODES as readonly string[]).includes(input.mode) ? input.mode : "SELF_COMPARE";
  const trials = int(input.perceptionTrials);
  const out: SpeechLearningEvidence = {
    conceptId: String(input.conceptId).slice(0, 120),
    activityId: String(input.activityId).slice(0, 160),
    mode,
    modelHeard: input.modelHeard === true,
    recordingCaptured: input.recordingCaptured === true,
    selfPlaybackHeard: input.selfPlaybackHeard === true,
    recognitionAttempted: input.recognitionAttempted === true,
    perceptionTrials: trials,
    perceptionCorrect: Math.min(int(input.perceptionCorrect), trials),
    retryCount: int(input.retryCount),
    completed: input.completed === true,
    at: typeof input.at === "number" ? input.at : now,
  };
  // Sucesso de reconhecimento só existe se houve tentativa.
  if (out.recognitionAttempted && typeof input.recognitionSucceeded === "boolean") {
    out.recognitionSucceeded = input.recognitionSucceeded;
  }
  // Ouvir a si mesmo exige ter gravado.
  if (!out.recordingCaptured) out.selfPlaybackHeard = false;
  return out;
}

function readEvents(): SpeechLearningEvidence[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = readScoped(SPEECH_EVIDENCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; events?: SpeechLearningEvidence[] };
    return Array.isArray(parsed?.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

function writeEvents(events: SpeechLearningEvidence[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    writeScoped(
      SPEECH_EVIDENCE_STORAGE_KEY,
      JSON.stringify({ version: SPEECH_EVIDENCE_SCHEMA_VERSION, events: events.slice(-MAX_EVENTS) })
    );
  } catch {
    /* quota / modo privado — evidência é opcional, nunca bloqueia */
  }
}

export function recordSpeechEvidence(input: SpeechEvidenceInput): SpeechLearningEvidence {
  const event = normalizeSpeechEvidence(input);
  writeEvents([...readEvents(), event]);
  // RC2.3.6 — hand-off to the Learner Evidence Record (counts only, never audio).
  try {
    recordLearningEvidence(speechToEvidence(event));
  } catch {
    /* evidence is optional */
  }
  return event;
}

export function listSpeechEvidence(): SpeechLearningEvidence[] {
  return readEvents();
}

export interface SpeechEvidenceSummary {
  conceptId: string;
  activities: number;
  modelHeard: number;
  perceptionTrials: number;
  perceptionCorrect: number;
  recordings: number;
  selfPlaybacks: number;
  recognitionAttempts: number;
  recognitionSuccesses: number;
  retries: number;
  completions: number;
}

/** Contagens por conceito — evidência separada por canal, sem nota única. */
export function summarizeSpeechEvidence(conceptId: string, events: readonly SpeechLearningEvidence[] = readEvents()): SpeechEvidenceSummary {
  const rows = events.filter((e) => e.conceptId === conceptId);
  return {
    conceptId,
    activities: rows.length,
    modelHeard: rows.filter((e) => e.modelHeard).length,
    perceptionTrials: rows.reduce((n, e) => n + e.perceptionTrials, 0),
    perceptionCorrect: rows.reduce((n, e) => n + e.perceptionCorrect, 0),
    recordings: rows.filter((e) => e.recordingCaptured).length,
    selfPlaybacks: rows.filter((e) => e.selfPlaybackHeard).length,
    recognitionAttempts: rows.filter((e) => e.recognitionAttempted).length,
    recognitionSuccesses: rows.filter((e) => e.recognitionSucceeded === true).length,
    retries: rows.reduce((n, e) => n + e.retryCount, 0),
    completions: rows.filter((e) => e.completed).length,
  };
}

/** Percepção concluída com maioria de acertos (com áudio confirmado) — abre produção. */
export function perceptionPassed(summary: SpeechEvidenceSummary): boolean {
  return summary.perceptionTrials >= 2 && summary.perceptionCorrect / summary.perceptionTrials >= 0.66;
}
