import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCultureItem } from "../../data/culture";
import { cultureText, isCultureStepScored } from "../../data/cultureQuest";
import type { LessonStep } from "../../data/journey";
import { Button, ButtonLink, Card } from "../../components/ui/primitives";
import { HubPage } from "../../components/layout/HubLayout";
import { useStore } from "../../lib/store";
import { buildCultureReviewSession } from "../../lib/cultureReview";
import { trackCultureEvent } from "../../services/cultureEvents";
import { useTranslation } from "../../i18n/useTranslation";
import { StepRenderer } from "../lesson/steps";

function lessonStepFromReview(task: ReturnType<typeof buildCultureReviewSession>[number]): LessonStep | null {
  const step = task.step;
  if (!step || step.kind === "sequence") return null;
  const preferred = step.options?.find((option) => option.preferred);
  return {
    kind: "contextual_choice",
    title: cultureText(step.prompt, "pt-BR"),
    situationPt: cultureText(step.prompt, "pt-BR"),
    dialoguePrompt: cultureText(step.prompt, "pt-BR"),
    correctAnswer: preferred ? cultureText(preferred.label, "pt-BR") : "",
    options: (step.options ?? []).map((option) => cultureText(option.label, "pt-BR")),
    explanation: preferred ? cultureText(preferred.feedback, "pt-BR") : "",
  };
}

export function CultureReviewPage() {
  const { t, instructionLocale } = useTranslation();
  const navigate = useNavigate();
  const reviewCultureMemory = useStore((s) => s.reviewCultureMemory);
  const [tasks] = useState(() => buildCultureReviewSession(useStore.getState().cultureMemoryById ?? {}));
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const task = tasks[index];
  const step = task?.step;
  const lessonStep = task ? lessonStepFromReview(task) : null;

  function advance(ok: boolean) {
    if (!task) return;
    reviewCultureMemory(task.targetId, ok);
    if (index + 1 >= tasks.length) {
      setDone(true);
      trackCultureEvent("culture_review_complete", { n: tasks.length });
      return;
    }
    setIndex((current) => current + 1);
    setOrder([]);
    setRevealed(false);
  }

  function onContinueSequence() {
    if (!task || !step) return;
    if (!revealed && isCultureStepScored(step)) {
      setRevealed(true);
      return;
    }
    const ok = (step.sequenceCorrect ?? []).join() === order.join();
    advance(ok);
  }

  if (tasks.length === 0) {
    return (
      <HubPage data-testid="culture-review">
        <Card className="p-5">
          <h1 className="font-serif text-2xl font-semibold text-ink">{t("culture.reviewTitle")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("culture.reviewEmpty")}</p>
          <ButtonLink to="/cultura" className="mt-4">
            {t("culture.backToHub")}
          </ButtonLink>
        </Card>
      </HubPage>
    );
  }

  if (done) {
    return (
      <HubPage data-testid="culture-review">
        <Card className="p-5" data-testid="culture-review-done">
          <h1 className="font-serif text-2xl font-semibold text-ink">{t("culture.reviewDone")}</h1>
          <Button className="mt-4 min-h-12" onClick={() => navigate("/cultura")}>
            {t("culture.backToHub")}
          </Button>
        </Card>
      </HubPage>
    );
  }

  const item = getCultureItem(task.cultureItemId);

  return (
    <HubPage data-testid="culture-review">
      <p className="text-xs text-ink-faint">
        {t("culture.missionProgress", { current: index + 1, total: tasks.length })}
      </p>
      <h1 className="font-serif text-2xl font-semibold text-ink">{t("culture.reviewTitle")}</h1>
      {item ? <p className="text-sm text-ink-soft">{instructionLocale === "en" ? item.titleEn : item.titlePt}</p> : null}
      <Card className="mt-3 space-y-3 p-4">
        {lessonStep ? (
          <StepRenderer
            key={task.id}
            step={lessonStep}
            lessonId={`culture-review:${task.targetId}`}
            attemptSeed={task.id}
            onDone={(ok) => advance(ok !== false)}
          />
        ) : (
          <>
            {step?.prompt ? <p className="text-sm font-medium leading-6 text-ink">{cultureText(step.prompt, instructionLocale)}</p> : null}
            {step?.kind === "sequence" && step.sequence ? (
              <div className="grid gap-2" data-testid="culture-sequence">
                {step.sequence
                  .filter((row) => !order.includes(row.id))
                  .map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      data-testid={`culture-seq-${row.id}`}
                      className="min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm"
                      onClick={() => setOrder((current) => [...current, row.id])}
                    >
                      {cultureText(row.label, instructionLocale)}
                    </button>
                  ))}
              </div>
            ) : null}
            <Button className="mt-3 min-h-12" onClick={onContinueSequence} disabled={!revealed && order.length === 0} data-testid="culture-complete">
              {revealed ? t("culture.keepGoing") : t("culture.checkAnswer")}
            </Button>
          </>
        )}
      </Card>
    </HubPage>
  );
}
