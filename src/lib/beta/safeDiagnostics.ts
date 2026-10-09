/**
 * RC2.3.13G — safe automatic diagnostics for problem reports.
 * Never attach email, tokens, raw audio, stroke traces, or free answers.
 */

import { getAppEnvironmentLabel, getAppVersion, getCommitSha, currentRoute } from "../feedback";
import { makeDiagnosticId, viewportClassFromSize } from "./betaEvents";

export interface SafeDiagnosticsPayload {
  diagnosticId: string;
  appVersion: string;
  releaseId: string;
  sourceSha: string;
  platform: string;
  route: string;
  lessonId?: string;
  cultureNodeId?: string;
  lastErrorCode?: string;
  online: boolean;
  viewportClass: string;
}

const FORBIDDEN_DIAG_KEYS =
  /email|token|authorization|cookie|password|stroke|waveform|transcript|microphone|rawAudio|refresh|access_token/i;

export function buildSafeDiagnostics(opts?: {
  lessonId?: string;
  cultureNodeId?: string;
  lastErrorCode?: string;
}): SafeDiagnosticsPayload {
  const width = typeof window !== "undefined" ? window.innerWidth : 0;
  const height = typeof window !== "undefined" ? window.innerHeight : 0;
  const platform =
    typeof navigator !== "undefined"
      ? String(navigator.platform || "web").slice(0, 40)
      : "web";
  return {
    diagnosticId: makeDiagnosticId(),
    appVersion: getAppVersion().slice(0, 40),
    releaseId: getAppEnvironmentLabel().slice(0, 40),
    sourceSha: getCommitSha().slice(0, 40),
    platform,
    route: currentRoute().slice(0, 200),
    lessonId: opts?.lessonId?.slice(0, 80),
    cultureNodeId: opts?.cultureNodeId?.slice(0, 80),
    lastErrorCode: opts?.lastErrorCode?.slice(0, 80),
    online: typeof navigator !== "undefined" ? navigator.onLine !== false : true,
    viewportClass: viewportClassFromSize(width, height),
  };
}

/** Gate helper — returns forbidden keys found in a payload. */
export function findForbiddenDiagnosticKeys(payload: Record<string, unknown>): string[] {
  const bad: string[] = [];
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_DIAG_KEYS.test(key)) bad.push(key);
  }
  return bad;
}

/** Assert payload is report-safe (no nested blobs). */
export function isDiagnosticsPayloadSafe(payload: Record<string, unknown>): boolean {
  if (findForbiddenDiagnosticKeys(payload).length) return false;
  for (const value of Object.values(payload)) {
    if (value && typeof value === "object") return false;
    if (typeof value === "string" && FORBIDDEN_DIAG_KEYS.test(value)) return false;
  }
  return true;
}
