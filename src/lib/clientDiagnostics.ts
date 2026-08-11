/**
 * Diagnósticos curtos no cliente para beta (crash, sync, RPC).
 * Não enviam sozinhos: alimentam o modal de feedback / mailto.
 * Sem PII — mensagem sanitizada e truncada.
 */

import { currentRoute, getAppVersion, sanitizeFeedbackMessage } from "./feedback";
import { appEnvironmentLabel } from "./appEnvironment";

export type ClientDiagnosticKind = "render_error" | "sync_error" | "rpc_error" | "runtime";

export interface ClientDiagnostic {
  kind: ClientDiagnosticKind;
  area: string;
  message: string;
  route: string;
  appVersion: string;
  env: string;
  at: number;
}

const STORAGE_KEY = "longyu:client-diagnostics";
const MAX_ITEMS = 8;

function canUseStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

function readAll(): ClientDiagnostic[] {
  if (!canUseStorage()) return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientDiagnostic[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ClientDiagnostic[]): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* quota */
  }
}

/** Registra um diagnóstico curto (sessionStorage). Seguro chamar em hot paths. */
export function recordClientDiagnostic(input: {
  kind: ClientDiagnosticKind;
  area: string;
  message: string;
  route?: string;
}): void {
  const entry: ClientDiagnostic = {
    kind: input.kind,
    area: String(input.area ?? "app").slice(0, 64),
    message: sanitizeFeedbackMessage(String(input.message ?? "erro")).slice(0, 280),
    route: String(input.route ?? currentRoute()).slice(0, 300),
    appVersion: getAppVersion(),
    env: appEnvironmentLabel(),
    at: Date.now(),
  };

  const next = [...readAll().filter((item) => !(item.kind === entry.kind && item.area === entry.area && item.message === entry.message)), entry];
  writeAll(next);

  if (typeof console !== "undefined") {
    console.error(`[Longyu diagnostic:${entry.kind}:${entry.area}]`, entry.message, {
      route: entry.route,
      appVersion: entry.appVersion,
      env: entry.env,
    });
  }
}

export function peekClientDiagnostics(): ClientDiagnostic[] {
  return readAll();
}

/** Texto curto para pré-preencher feedback técnico. */
export function formatDiagnosticsForFeedback(limit = 3): string {
  const items = readAll().slice(-limit);
  if (items.length === 0) return "";
  return items
    .map((item) => {
      const when = new Date(item.at).toISOString();
      return `[${when}] ${item.kind}/${item.area}: ${item.message} (rota ${item.route}, v${item.appVersion})`;
    })
    .join("\n");
}

export function clearClientDiagnostics(): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Abre o modal de feedback via evento global (funciona fora do React tree). */
export function requestFeedbackOpen(detail?: {
  screen?: string;
  route?: string;
  lessonId?: string;
  exerciseKind?: string;
  exerciseIndex?: number;
  activityProblem?: boolean;
  preferTechnical?: boolean;
}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("longyu:open-feedback", { detail: detail ?? {} }));
}
