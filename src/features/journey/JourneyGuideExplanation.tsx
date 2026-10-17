import { useEffect, useState } from "react";
import { GuideDialogue } from "../../components/guide/GuideDialogue";
import { GuideLine } from "../../components/guide/GuideLine";
import { useStore } from "../../lib/store";

export type JourneyGuideExplanationProps = {
  /** Stable id for tests / analytics (e.g. booster node id). */
  id: string;
  /** Existing pedagogical copy — never invented at runtime. */
  message: string;
  className?: string;
  /**
   * RC2.3.13R.3.2.5 — after the learner has finished this guide once:
   * "hide" (handoffs: the card speaks for itself) or "static" (the culture
   * gate's reason stays readable, without typewriter, voice or Continue).
   */
  whenSeen?: "hide" | "static";
};

const SEEN_KEY_PREFIX = "longyu:journey-guide-seen:";

function readSeen(accountId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(`${SEEN_KEY_PREFIX}${accountId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

function markSeen(accountId: string, id: string): void {
  try {
    const seen = readSeen(accountId);
    seen.add(id);
    window.localStorage.setItem(`${SEEN_KEY_PREFIX}${accountId}`, JSON.stringify([...seen].slice(-200)));
  } catch {
    /* storage unavailable: the guide simply plays again next time */
  }
}

/**
 * Thin Journey adapter over the canonical GuideDialogue.
 *
 * No new state machine, typewriter, mascot, or motion — only Journey layout
 * and dismiss-after-DONE so the trail handoff never blocks the activity card.
 * RC2.3.13R.3.2.5 — a guide the learner finished is remembered (per account):
 * coming back from a lesson no longer replays ~4 s of typing and voice blips.
 */
export function JourneyGuideExplanation({
  id,
  message,
  className = "",
  whenSeen = "hide",
}: JourneyGuideExplanationProps) {
  const accountId = useStore((s) => s.currentAccountId);
  const [seenBefore] = useState(() => readSeen(accountId).has(id));
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (dismissed) markSeen(accountId, id);
  }, [dismissed, accountId, id]);
  const trimmed = String(message ?? "").trim();
  if (!trimmed || dismissed) return null;

  if (seenBefore) {
    if (whenSeen === "hide") return null;
    return (
      <div className={["w-full max-w-[20rem] px-1", className].join(" ")} data-journey-guide-seen={id}>
        <GuideLine text={trimmed} size={40} data-testid="journey-guide-line" />
      </div>
    );
  }

  return (
    <div
      className={[
        "journey-guide-explanation w-full max-w-[20rem] px-1",
        className,
      ].join(" ")}
      data-journey-guide-explanation={id}
      data-journey-guide-active="true"
    >
      <GuideDialogue
        messages={[trimmed]}
        size="compact"
        actionVariant="outline"
        onComplete={() => setDismissed(true)}
        data-testid="journey-guide-dialogue"
        className="gap-2 sm:gap-3"
      />
    </div>
  );
}
