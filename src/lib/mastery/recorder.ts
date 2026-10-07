/**
 * RC2.3.6 — runtime recorder for the Learner Evidence Record.
 *
 * Every call is a side effect that can never block or break learning: all
 * errors are swallowed. Storage is local only (cloud sync is a contract in
 * docs/types/tests, not a runtime path).
 */
import { appendEvidence, loadRecord, saveRecord, type LearnerEvidenceRecord, type LearningEvidence } from "./evidence";
import { legacyPriorToEvidence, type LegacyItemPrior } from "./adapters";

let memo: LearnerEvidenceRecord | null = null;
const listeners = new Set<() => void>();

export function currentRecord(): LearnerEvidenceRecord {
  memo ??= loadRecord();
  return memo;
}

export function recordLearningEvidence(events: readonly LearningEvidence[]): number {
  if (!events.length) return 0;
  try {
    const rec = currentRecord();
    const deviceEvents = events.map((e) => (e.deviceId ? e : { ...e, deviceId: rec.deviceId }));
    const { record, added } = appendEvidence(rec, deviceEvents);
    if (added > 0) {
      memo = record;
      saveRecord(record);
      for (const fn of listeners) {
        try {
          fn();
        } catch {
          /* listener errors never reach the activity */
        }
      }
    }
    return added;
  } catch {
    return 0;
  }
}

export function subscribeLearningEvidence(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const LEGACY_FLAG = "longyu:learner-evidence-legacy-v1";

/**
 * One-time baseline from pre-RC2.3.6 progress: one OBSERVED prior per item the
 * learner already met. Nothing else is inferred (no handwriting, no speech).
 */
export function seedLegacyBaselineOnce(items: readonly LegacyItemPrior[]): number {
  try {
    if (typeof localStorage === "undefined" || localStorage.getItem(LEGACY_FLAG)) return 0;
    const added = recordLearningEvidence(legacyPriorToEvidence(items));
    localStorage.setItem(LEGACY_FLAG, String(Date.now()));
    return added;
  } catch {
    return 0;
  }
}

/** Test helper: drop the in-memory copy. */
export function resetRecorderMemo(): void {
  memo = null;
}
