/**
 * RC2.3.6 — React access to Personal Mastery (memoised; recomputed only when
 * evidence, completed lessons or due reviews change).
 */
import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import { dueItems } from "../../lib/srs";
import { knowledgeGraph } from "../../lib/mastery/knowledgeGraph";
import { createPersonalMastery, type PersonalMastery } from "../../lib/mastery/personalMastery";
import { currentRecord, seedLegacyBaselineOnce, subscribeLearningEvidence } from "../../lib/mastery/recorder";
import { targetForSrsItem } from "../../lib/mastery/practiceQueue";
import { CHARACTERS } from "../../data/characters";
import { chunkById } from "../../data/chunks";

const glyphByCharId = new Map(CHARACTERS.map((c) => [c.id, c.hanzi]));

export function useLearnerMastery(): PersonalMastery {
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeLearningEvidence(() => setVersion((v) => v + 1)), []);

  // Pre-RC2.3.6 progress becomes a weak "already met" prior — once, nothing invented.
  useEffect(() => {
    const items = new Map<string, { text: string; reps: number; lastAt: number }>();
    for (const item of Object.values(srs ?? {})) {
      const text = item.type === "char" ? glyphByCharId.get(item.itemId) : item.type === "chunk" ? chunkById[item.itemId]?.hanzi : undefined;
      if (!text) continue;
      const prev = items.get(text);
      const lastAt = item.reviewedAt ?? item.createdAt;
      items.set(text, { text, reps: Math.max(prev?.reps ?? 0, item.reps + 1), lastAt: Math.max(prev?.lastAt ?? 0, lastAt) });
    }
    if (seedLegacyBaselineOnce([...items.values()]) > 0) setVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time seed
  }, []);

  const dueKey = useMemo(() => {
    const due = dueItems(srs ?? {});
    return due.map((i) => targetForSrsItem(i)).filter((t): t is string => !!t).sort().join(",");
  }, [srs]);

  return useMemo(
    () =>
      createPersonalMastery({
        record: currentRecord(),
        graph: knowledgeGraph(),
        completedLessons: completedLessons ?? [],
        srsDueTargets: new Set(dueKey ? dueKey.split(",") : []),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` tracks evidence writes
    [completedLessons, dueKey, version]
  );
}
