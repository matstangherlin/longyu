/**
 * RC2.3.7 — tiny in-memory log of sensory decisions (QA panel only).
 * Records what fired and what was suppressed and why; never persisted, never sent.
 */
export type SensoryChannelLog = "sound" | "haptic" | "ceremony" | "guidance";
export type SensoryOutcome = "played" | "suppressed";

export interface SensoryLogEntry {
  at: number;
  channel: SensoryChannelLog;
  event: string;
  outcome: SensoryOutcome;
  /** Why it was suppressed (setting off, gesture window, audio owner…). */
  reason?: string;
}

const MAX = 40;
const entries: SensoryLogEntry[] = [];
const counts = { played: 0, suppressed: 0 };

export function logSensory(entry: Omit<SensoryLogEntry, "at">): void {
  entries.push({ ...entry, at: Date.now() });
  if (entries.length > MAX) entries.shift();
  counts[entry.outcome] += 1;
}

export function sensoryLogSnapshot(): { entries: readonly SensoryLogEntry[]; played: number; suppressed: number } {
  return { entries: [...entries], ...counts };
}

export function resetSensoryLogForTests(): void {
  entries.length = 0;
  counts.played = 0;
  counts.suppressed = 0;
}
