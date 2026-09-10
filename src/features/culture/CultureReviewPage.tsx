import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCultureItem } from "../../data/culture";
import { cultureText } from "../../data/cultureQuest";
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
  if (!step) return null;
  if (step.kind === "sequence") {
    const sequence = step.sequence ?? [];
    if (sequence.length < 2) return null;
    const byId = new Map(sequence.map((row) => [row.id, cultureText(row.label, "pt-BR")]));
    const parts = (step.sequenceCorrect ?? sequence.map((row) => row.id))
      .map((id) => byId.get(id) ?? "")
      .filter(Boolean);
    const bank = sequence.map((row) => cultureText(row.label, "pt-BR")).filter(Boolean);
    if (parts.length < 2 || bank.length < 2) return null;
    return {
      kind: "sentence_build",
      title: cultureText(step.prompt, "pt-BR"),
      prompt: cultureText(step.prompt, "pt-BR"),
      target: parts,
      targetParts: parts,
      bank,
      correctAnswer: parts.join(""),
    };
  }
  const preferred = step.options?.find((option) => option.preferred);
  const options = (step.options ?? []).map((option) => cultureText(option.label, "pt-BR")).filter(Boolean);
  if (!preferred || options.length < 2) return null;
  return {
    kind: "contextual_choice",
    title: cultureText(step.prompt, "pt-BR"),
    situationPt: cultureText(step.prompt, "pt-BR"),
    dialoguePrompt: cultureText(step.prompt, "pt-BR"),
    correctAnswer: cultureText(preferred.label, "pt-BR"),
    options,
    explanation: cultureText(preferred.feedback, "pt-BR"),
  };
}

export function CultureReviewPage() {
  const { t, instructionLocale } = useTranslation();
  const navigate = useNavigate();
  const reviewCultureMemory = useStore((s) => s.reviewCultureMemory);
  const [tasks] = useState(() => buildCultureReviewSession(useStore.getState().cultureMemoryById ?? {}));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const task = tasks[index];
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
          <Button className="min-h-12" onClick={() => advance(true)} data-testid="culture-complete">
            {t("culture.keepGoing")}
          </Button>
        )}
      </Card>
    </HubPage>
  );
}
