/**
 * RC2.2.19 — diagnóstico de FALA para o QA físico.
 *
 * P1 NATIVE_SPEECH_RECOGNITION_NOT_WORKING / SELF_COMPARE_RECORDING_NOT_PROVEN:
 * "microfone autorizado" não prova reconhecimento, e "gravar tocado" não prova
 * gravação. Este painel mostra cada elo separado, do jeito que o aparelho
 * respondeu:
 *
 *   microphonePermission → recognitionService → zhCnSupport →
 *   modelDownloadAvailable/State → recordingEngine → recordingStarted →
 *   recordingDuration → temporaryFileCreated → playbackReady → playbackPlayed
 *
 * Só em DEV, em builds de fixtures (E2E) ou num build que não é production_beta
 * com `localStorage longyu:qa-diagnostics=on`. Sem PII: nunca o áudio, nunca o
 * texto reconhecido, nunca o caminho do arquivo — só estados, códigos e números.
 */
import { useSyncExternalStore } from "react";
import { isProductionBetaEnv } from "./appEnvironment";
import { deviceQaEnabled } from "./deviceQa";

export type Tri = "yes" | "no" | "unknown";

export interface SpeechDiagnostics {
  microphonePermission: string;
  recognitionService: Tri;
  zhCnSupport: string;
  modelDownloadAvailable: Tri;
  modelDownloadState: string;
  recordingEngine: "native" | "web" | "none";
  recordingStarted: Tri;
  recordingDuration: number | null;
  temporaryFileCreated: Tri;
  playbackReady: Tri;
  /** Evidência de que a reprodução da própria voz TERMINOU (não só começou). */
  playbackPlayed: Tri;
  lastErrorCode: string | null;
  // RC2.2.20 — elos separados da TENTATIVA de reconhecimento (permissão e
  // serviço não provam que o aparelho reconheceu fala) e da gravação.
  recognitionStarted: Tri;
  speechDetected: Tri;
  /** Houve resultado (nunca o texto: só sim/não). */
  recognitionResult: Tri;
  /** Tamanho do arquivo temporário em bytes (nunca o conteúdo nem o caminho). */
  fileBytes: number | null;
  playbackStarted: Tri;
  /** Categoria segura da última falha de fala (ver speechFailure.ts). */
  failureCategory: string | null;
}

export const SPEECH_DIAGNOSTIC_FIELDS: readonly (keyof SpeechDiagnostics)[] = [
  "microphonePermission",
  "recognitionService",
  "zhCnSupport",
  "modelDownloadAvailable",
  "modelDownloadState",
  "recordingEngine",
  "recordingStarted",
  "recordingDuration",
  "temporaryFileCreated",
  "playbackReady",
  "playbackPlayed",
  "lastErrorCode",
  "recognitionStarted",
  "speechDetected",
  "recognitionResult",
  "fileBytes",
  "playbackStarted",
  "failureCategory",
];

export const EMPTY_SPEECH_DIAGNOSTICS: SpeechDiagnostics = {
  microphonePermission: "unknown",
  recognitionService: "unknown",
  zhCnSupport: "unknown",
  modelDownloadAvailable: "unknown",
  modelDownloadState: "not_requested",
  recordingEngine: "none",
  recordingStarted: "unknown",
  recordingDuration: null,
  temporaryFileCreated: "unknown",
  playbackReady: "unknown",
  playbackPlayed: "unknown",
  lastErrorCode: null,
  recognitionStarted: "unknown",
  speechDetected: "unknown",
  recognitionResult: "unknown",
  fileBytes: null,
  playbackStarted: "unknown",
  failureCategory: null,
};

/**
 * Gravação só está PROVADA com arquivo criado, duração ≥ mínimo e reprodução
 * da própria voz concluída. Permissão ou "gravou" sozinhos nunca bastam.
 */
export function recordingProven(d: SpeechDiagnostics, minDurationMs = 400): boolean {
  return (
    d.recordingStarted === "yes" &&
    (d.recordingDuration ?? 0) >= minDurationMs &&
    d.temporaryFileCreated === "yes" &&
    // RC2.2.20 — arquivo vazio nunca é gravação; reprodução que não começou não terminou.
    d.fileBytes !== 0 &&
    d.playbackStarted !== "no" &&
    d.playbackPlayed === "yes"
  );
}

/** Reconhecimento de mandarim nunca é inferido só da permissão. */
export function recognitionProven(d: SpeechDiagnostics): boolean {
  return d.microphonePermission === "granted" && d.recognitionService === "yes" && d.zhCnSupport === "SUPPORTED";
}

/**
 * RC2.2.20 — o QA físico precisa de uma TENTATIVA real: capacidade provada
 * + reconhecimento iniciado + fala detectada + resultado devolvido.
 */
export function recognitionAttemptProven(d: SpeechDiagnostics): boolean {
  return recognitionProven(d) && d.recognitionStarted === "yes" && d.speechDetected === "yes" && d.recognitionResult === "yes";
}

let state: SpeechDiagnostics = { ...EMPTY_SPEECH_DIAGNOSTICS };
let version = 0;
const listeners = new Set<() => void>();

export function speechDiagnosticsEnabled(): boolean {
  try {
    // RC2.2.20 — APK de diagnóstico (`VITE_DEVICE_QA=true`), Preview e QA
    // Candidate também: é onde a fala é provada fisicamente.
    if (deviceQaEnabled()) return true;
    if (isProductionBetaEnv()) return false;
    return typeof localStorage !== "undefined" && localStorage.getItem("longyu:qa-diagnostics") === "on";
  } catch {
    return false;
  }
}

export function updateSpeechDiagnostics(patch: Partial<SpeechDiagnostics>): void {
  const next = { ...state, ...patch };
  if (SPEECH_DIAGNOSTIC_FIELDS.every((key) => next[key] === state[key])) return;
  state = next;
  version += 1;
  if (typeof window !== "undefined" && speechDiagnosticsEnabled()) {
    (window as Window & { __longyuSpeechDiagnostics?: SpeechDiagnostics }).__longyuSpeechDiagnostics = { ...state };
  }
  for (const listener of listeners) listener();
}

export function getSpeechDiagnostics(): SpeechDiagnostics {
  return state;
}

export function resetSpeechDiagnosticsForTests(): void {
  state = { ...EMPTY_SPEECH_DIAGNOSTICS };
  version += 1;
  for (const listener of listeners) listener();
}

export function useSpeechDiagnostics(): SpeechDiagnostics {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => 0
  );
  return state;
}
