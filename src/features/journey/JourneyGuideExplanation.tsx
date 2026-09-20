import { useState } from "react";
import { GuideDialogue } from "../../components/guide/GuideDialogue";

export type JourneyGuideExplanationProps = {
  /** Stable id for tests / analytics (e.g. booster node id). */
  id: string;
  /** Existing pedagogical copy — never invented at runtime. */
  message: string;
  className?: string;
};

/**
 * Thin Journey adapter over the canonical GuideDialogue.
 *
 * No new state machine, typewriter, mascot, or motion — only Journey layout
 * and dismiss-after-DONE so the trail handoff never blocks the activity card.
 */
export function JourneyGuideExplanation({
  id,
  message,
  className = "",
}: JourneyGuideExplanationProps) {
  const [dismissed, setDismissed] = useState(false);
  const trimmed = String(message ?? "").trim();
  if (!trimmed || dismissed) return null;

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
        onComplete={() => setDismissed(true)}
        data-testid="journey-guide-dialogue"
        className="gap-2 sm:gap-3"
      />
    </div>
  );
}
