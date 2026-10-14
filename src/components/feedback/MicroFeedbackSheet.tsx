/**
 * RC2.3.13G — one-question micro-feedback bottom sheet.
 * Compact, dismissible, never awards XP for answers.
 */

import { useId } from "react";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import {
  MICRO_FEEDBACK_COPY,
  microFeedbackAwardsReward,
  type MicroFeedbackKind,
} from "../../lib/beta/betaMicroFeedback";
import { useTranslation } from "../../i18n/useTranslation";
import { recordTechEvent } from "../../lib/techEvents";

export function MicroFeedbackSheet({
  kind,
  onAnswer,
  onDismiss,
}: {
  kind: MicroFeedbackKind;
  onAnswer: (answerId: string) => void;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const { instructionLocale } = useTranslation();
  const copy = MICRO_FEEDBACK_COPY[kind];
  const question = instructionLocale === "en" ? copy.questionEn : copy.questionPt;

  return (
    <ModalOverlay onBackdropClick={onDismiss} labelledBy={titleId}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="micro-feedback-sheet"
        data-feedback-kind={kind}
        className="mx-auto w-full max-w-md rounded-t-3xl border border-line bg-surface p-4 pb-[max(1rem,var(--app-safe-bottom))] shadow-lg sm:rounded-3xl"
      >
        <h2 id={titleId} className="text-base font-semibold text-ink">
          {question}
        </h2>
        <div className="mt-3 flex flex-col gap-2" role="group" aria-label={question}>
          {copy.answers.map((answer) => {
            const label = instructionLocale === "en" ? answer.en : answer.pt;
            return (
              <button
                key={answer.id}
                type="button"
                data-testid={`micro-feedback-answer-${answer.id}`}
                data-cta-hierarchy="secondary"
                className="min-h-12 w-full rounded-2xl border border-line bg-surface-2 px-3 text-left text-sm font-medium text-ink"
                onClick={() => {
                  void microFeedbackAwardsReward(answer.id);
                  recordTechEvent("micro_feedback_answered", {
                    feedbackKind: kind,
                    answerId: answer.id,
                  });
                  onAnswer(answer.id);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            data-testid="micro-feedback-dismiss"
            data-cta-hierarchy="tertiary"
            onClick={() => {
              recordTechEvent("micro_feedback_dismissed", { feedbackKind: kind });
              onDismiss();
            }}
          >
            {instructionLocale === "en" ? "Not now" : "Agora não"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
