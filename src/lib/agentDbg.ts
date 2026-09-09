/** Temporary debug sink for skip-through stall investigation. Remove after the fix. */
export function agentDbg(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;
  const payload = { hypothesisId, location, message, data, timestamp: Date.now() };
  const w = window as Window & { __agentDbg?: unknown[] };
  w.__agentDbg = w.__agentDbg ?? [];
  if (w.__agentDbg.length > 200) w.__agentDbg.shift();
  w.__agentDbg.push(payload);
  try {
    console.info("[agent-dbg]", JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
