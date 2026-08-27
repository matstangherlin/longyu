/**
 * Correlação operacional sem PII (STG-011).
 * Identifica onde signup/placement/finalize/sync/checkout travou.
 * Nunca registra email, senha, token ou corpo de request.
 */
export const OPS_CORRELATION_HEADER = "x-longyu-correlation-id";
export const OPS_SESSION_HEADER = "x-longyu-session-id";
export const OPS_NAME_HEADER = "x-longyu-op";
const SESSION_STORAGE_KEY = "longyu:ops-session";

export type OpsName =
  | "signup"
  | "placement"
  | "finalize"
  | "lesson_complete"
  | "sync"
  | "checkout"
  | "billing_portal"
  | "webhook"
  | "anon_ingestion"
  | "delete_account"
  | "business_lead";

export type OpsPhase = "start" | "ok" | "error";

let memorySessionId = "";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ly_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOpsSessionId(): string {
  if (typeof sessionStorage !== "undefined") {
    try {
      const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (existing && existing.length >= 8 && existing.length <= 80) return existing;
      const created = randomId();
      sessionStorage.setItem(SESSION_STORAGE_KEY, created);
      return created;
    } catch {
      /* private mode */
    }
  }
  if (!memorySessionId) memorySessionId = randomId();
  return memorySessionId;
}

export function newOpsCorrelationId(): string {
  return randomId();
}

function safeCode(value: string | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/[^\w.:-]/g, "_")
    .slice(0, 64);
}

export function noteOps(op: OpsName, correlationId: string, phase: OpsPhase, extra?: { code?: string }): void {
  if (typeof console === "undefined") return;
  const payload: Record<string, string> = {
    op,
    correlationId: correlationId.slice(0, 80),
    sessionId: getOpsSessionId().slice(0, 80),
    phase,
  };
  const code = safeCode(extra?.code);
  if (code) payload.code = code;
  const line = `[longyu-ops] ${JSON.stringify(payload)}`;
  if (phase === "error") console.error(line);
  else console.info(line);
}

export function edgeOpsInit(op: OpsName): {
  correlationId: string;
  sessionId: string;
  headers: Record<string, string>;
} {
  const correlationId = newOpsCorrelationId();
  const sessionId = getOpsSessionId();
  noteOps(op, correlationId, "start");
  return {
    correlationId,
    sessionId,
    headers: {
      [OPS_CORRELATION_HEADER]: correlationId,
      [OPS_SESSION_HEADER]: sessionId,
      [OPS_NAME_HEADER]: op,
    },
  };
}
