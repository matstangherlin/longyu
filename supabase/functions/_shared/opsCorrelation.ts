/** Correlação sem PII. Não logar body, email, senha ou token. */

export const OPS_CORS_EXTRA_HEADERS =
  "x-longyu-correlation-id, x-longyu-session-id, x-longyu-op";

export function readOpsCorrelation(req: Request): {
  correlationId: string;
  sessionId: string;
  op: string;
} {
  return {
    correlationId: (req.headers.get("x-longyu-correlation-id") ?? "").slice(0, 80),
    sessionId: (req.headers.get("x-longyu-session-id") ?? "").slice(0, 80),
    op: (req.headers.get("x-longyu-op") ?? "").slice(0, 40),
  };
}

export function logOpsEdge(
  req: Request,
  phase: "start" | "ok" | "error",
  extra?: { code?: string; stripeEventId?: string; stripeEventType?: string },
): void {
  const ids = readOpsCorrelation(req);
  const payload: Record<string, string> = {
    ...ids,
    phase,
  };
  if (extra?.code) payload.code = extra.code.replace(/[^\w.:-]/g, "_").slice(0, 64);
  if (extra?.stripeEventId) payload.stripeEventId = extra.stripeEventId.slice(0, 80);
  if (extra?.stripeEventType) payload.stripeEventType = extra.stripeEventType.slice(0, 80);
  console.log(`[longyu-ops] ${JSON.stringify(payload)}`);
}
