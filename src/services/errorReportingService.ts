import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  buildErrorPayload,
  type ErrorReportInput,
  type ErrorReportSource,
} from "../lib/errorReport";

const OFFLINE_QUEUE_KEY = "longyu:error-report-queue";
const OFFLINE_QUEUE_MAX = 20;

interface QueuedErrorReport {
  payload: ReturnType<typeof buildErrorPayload>;
  queuedAt: number;
}

interface SessionFingerprintState {
  count: number;
  reported: boolean;
}

const sessionFingerprints = new Map<string, SessionFingerprintState>();
let flushTimer: number | null = null;
let onlineListenerInstalled = false;

function readOfflineQueue(): QueuedErrorReport[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedErrorReport[];
    return Array.isArray(parsed) ? parsed.slice(-OFFLINE_QUEUE_MAX) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: QueuedErrorReport[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-OFFLINE_QUEUE_MAX)));
  } catch {
    /* quota */
  }
}

function enqueueOffline(payload: ReturnType<typeof buildErrorPayload>): void {
  const queue = readOfflineQueue();
  queue.push({ payload, queuedAt: Date.now() });
  writeOfflineQueue(queue);
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function sendPayload(payload: ReturnType<typeof buildErrorPayload>): Promise<boolean> {
  if (!isSupabaseBackendEnabled()) return false;

  const client = getSupabaseClient();
  if (!client) return false;

  const rpcArgs = {
    p_error_name: payload.error_name,
    p_message: payload.message,
    p_stack: payload.stack,
    p_route: payload.route,
    p_app_version: payload.app_version,
    p_build_sha: payload.build_sha,
    p_browser: payload.browser,
    p_viewport: payload.viewport,
    p_last_safe_action: payload.last_safe_action,
    p_fingerprint: payload.fingerprint,
    p_occurrence_delta: payload.occurrence_delta,
  };

  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    const { error } = await client.rpc("report_app_error", rpcArgs);
    return !error;
  }

  const { data, error } = await client.functions.invoke("submit-app-error", {
    body: payload,
  });

  if (error) return false;
  const body = data as { ok?: boolean } | null;
  return Boolean(body?.ok);
}

async function flushOfflineQueue(): Promise<void> {
  if (!isOnline()) return;
  const queue = readOfflineQueue();
  if (queue.length === 0) return;

  const remaining: QueuedErrorReport[] = [];
  for (const item of queue) {
    const ok = await sendPayload(item.payload);
    if (!ok) remaining.push(item);
  }
  writeOfflineQueue(remaining);
}

function scheduleOfflineFlush(): void {
  if (onlineListenerInstalled || typeof window === "undefined") return;
  onlineListenerInstalled = true;
  window.addEventListener("online", () => {
    void flushOfflineQueue();
  });
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushOfflineQueue();
  }, 1500);
}

export async function reportAppError(input: ErrorReportInput): Promise<{ queued: boolean; reported: boolean }> {
  const payload = buildErrorPayload(input);
  const fingerprint = payload.fingerprint;

  const session = sessionFingerprints.get(fingerprint) ?? { count: 0, reported: false };
  session.count += input.occurrenceDelta ?? 1;
  sessionFingerprints.set(fingerprint, session);

  if (session.reported) {
    payload.occurrence_delta = 1;
    if (!isOnline()) {
      enqueueOffline(payload);
      scheduleOfflineFlush();
      return { queued: true, reported: false };
    }
    const ok = await sendPayload(payload);
    if (!ok) {
      enqueueOffline(payload);
      scheduleFlush();
      return { queued: true, reported: false };
    }
    return { queued: false, reported: true };
  }

  session.reported = true;
  sessionFingerprints.set(fingerprint, session);
  payload.occurrence_delta = session.count;

  if (!isOnline()) {
    enqueueOffline(payload);
    scheduleOfflineFlush();
    return { queued: true, reported: false };
  }

  const ok = await sendPayload(payload);
  if (!ok) {
    enqueueOffline(payload);
    scheduleFlush();
    return { queued: true, reported: false };
  }
  return { queued: false, reported: true };
}

export function reportAppErrorFromUnknown(
  error: unknown,
  options: { source?: ErrorReportSource; route?: string } = {}
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  void reportAppError({
    errorName: err.name || "Error",
    message: err.message || "Erro desconhecido",
    stack: err.stack,
    route: options.route,
    source: options.source,
  });
}

export function installGlobalErrorCapture(): void {
  if (typeof window === "undefined") return;
  scheduleOfflineFlush();

  window.addEventListener("error", (event) => {
    void reportAppError({
      errorName: event.error?.name ?? "Error",
      message: event.message || "Erro global",
      stack: event.error?.stack,
      source: "window",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportAppErrorFromUnknown(event.reason, { source: "unhandledrejection" });
  });

  window.__longyuErrorTest = {
    peekFingerprint: peekLastPreparedErrorFingerprint,
    queueSize: getOfflineErrorQueueSize,
    reset: resetErrorReportingForTests,
  };

  void flushOfflineQueue();
}

export function getOfflineErrorQueueSize(): number {
  return readOfflineQueue().length;
}

/** Usado em testes E2E para confirmar que o relatório foi preparado. */
export function peekLastPreparedErrorFingerprint(): string | null {
  const queue = readOfflineQueue();
  if (queue.length > 0) return queue[queue.length - 1]?.payload.fingerprint ?? null;
  const last = [...sessionFingerprints.entries()].at(-1);
  return last?.[0] ?? null;
}

export function resetErrorReportingForTests(): void {
  sessionFingerprints.clear();
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }
}
