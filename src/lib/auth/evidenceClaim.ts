/**
 * RC2.3.8 — move anonymous (device-only) evidence into a signed-in account,
 * ONLY together with the local progress claim. Idempotent and lossless:
 *   Learner Evidence Record → union by stable event id (mergeRecords)
 *   speech evidence         → union by (activity, mode, at)
 *   Hànzì form evidence     → per character, per channel: max (counts never summed)
 * After a successful claim the anonymous namespace is cleared, so the next
 * guest on a shared device starts empty.
 */
import { ANONYMOUS_NAMESPACE, readNamespace, removeNamespace, scopedKey } from "../accountStorage";
import { LER_STORAGE_KEY, mergeRecords, type LearnerEvidenceRecord } from "../mastery/evidence";
import { resetRecorderMemo } from "../mastery/recorder";

const SPEECH_KEY = "longyu:speech-evidence-v1";
const HANZI_KEY = "longyu:hanzi-form-evidence-v1";
const CELEBRATED_KEY = "longyu:mastery-celebrated-v1";

function parse<T>(raw: string | null): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(base: string, ns: string, value: unknown): void {
  try {
    localStorage.setItem(scopedKey(base, ns), JSON.stringify(value));
  } catch {
    /* quota */
  }
}

type SpeechFile = { version: number; events: { activityId: string; mode: string; at: number }[] };
type HanziMap = Record<string, Record<string, unknown>>;

export function mergeSpeech(a: SpeechFile | null, b: SpeechFile | null): SpeechFile | null {
  if (!a && !b) return null;
  const seen = new Set<string>();
  const events = [...(a?.events ?? []), ...(b?.events ?? [])]
    .filter((e) => {
      const k = `${e.activityId}|${e.mode}|${e.at}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((x, y) => x.at - y.at)
    .slice(-200);
  return { version: a?.version ?? b?.version ?? 1, events };
}

export function mergeHanzi(a: HanziMap | null, b: HanziMap | null): HanziMap | null {
  if (!a && !b) return null;
  const out: HanziMap = { ...(b ?? {}) };
  for (const [charId, row] of Object.entries(a ?? {})) {
    const other = out[charId];
    if (!other) {
      out[charId] = row;
      continue;
    }
    const merged: Record<string, unknown> = { ...other };
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "number" && typeof other[k] === "number") merged[k] = Math.max(v, other[k] as number);
    }
    out[charId] = merged;
  }
  return out;
}

export function claimAnonymousEvidence(targetNs: string): { moved: boolean } {
  if (typeof localStorage === "undefined" || targetNs === ANONYMOUS_NAMESPACE) return { moved: false };
  try {
    const anonLer = parse<LearnerEvidenceRecord>(readNamespace(LER_STORAGE_KEY, ANONYMOUS_NAMESPACE));
    const anonSpeech = parse<SpeechFile>(readNamespace(SPEECH_KEY, ANONYMOUS_NAMESPACE));
    const anonHanzi = parse<HanziMap>(readNamespace(HANZI_KEY, ANONYMOUS_NAMESPACE));
    const anonCelebrated = parse<string[]>(readNamespace(CELEBRATED_KEY, ANONYMOUS_NAMESPACE));
    if (!anonLer && !anonSpeech && !anonHanzi && !anonCelebrated) return { moved: false };

    if (anonLer) {
      const target = parse<LearnerEvidenceRecord>(readNamespace(LER_STORAGE_KEY, targetNs));
      write(LER_STORAGE_KEY, targetNs, target ? mergeRecords(target, anonLer) : anonLer);
    }
    const speech = mergeSpeech(anonSpeech, parse<SpeechFile>(readNamespace(SPEECH_KEY, targetNs)));
    if (speech) write(SPEECH_KEY, targetNs, speech);
    const hanzi = mergeHanzi(anonHanzi, parse<HanziMap>(readNamespace(HANZI_KEY, targetNs)));
    if (hanzi) write(HANZI_KEY, targetNs, hanzi);
    if (anonCelebrated) {
      const target = parse<string[]>(readNamespace(CELEBRATED_KEY, targetNs)) ?? [];
      write(CELEBRATED_KEY, targetNs, [...new Set([...target, ...anonCelebrated])].slice(-500));
    }
    for (const base of [LER_STORAGE_KEY, SPEECH_KEY, HANZI_KEY, CELEBRATED_KEY, "longyu:learner-evidence-legacy-v1", "longyu:hanzi-writing-telemetry-v1"]) removeNamespace(base, ANONYMOUS_NAMESPACE);
    resetRecorderMemo();
    return { moved: true };
  } catch {
    return { moved: false };
  }
}
