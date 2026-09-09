import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCultureItem } from "../../data/culture";
import { cultureText, isCultureStepScored } from "../../data/cultureQuest";
import { Button, ButtonLink, Card } from "../../components/ui/primitives";
import { HubPage } from "../../components/layout/HubLayout";
import { useStore } from "../../lib/store";
import { buildCultureReviewSession } from "../../lib/cultureReview";
import { trackCultureEvent } from "../../services/cultureEvents";
import { useTranslation } from "../../i18n/useTranslation";
import { CultureBeat } from "./CultureQuestVisuals";

export function CultureReviewPage() {
  const { t, instructionLocale } = useTranslation();
  const navigate = useNavigate();
  const memoryById = useStore((s) => s.cultureMemoryById ?? {});
  const reviewCultureMemory = useStore((s) => s.reviewCultureMemory);
  const tasks = useMemo(() => buildCultureReviewSession(memoryById), [memoryById]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const task = tasks[index];
  const step = task?.step;

  function grade(): boolean {
    if (!step) return false;
    if (step.kind === "sequence") return (step.sequenceCorrect ?? []).join() === order.join();
    return Boolean(step.options?.find((option) => option.id === selected)?.preferred);
  }

  function onContinue() {
    if (!task || !step) return;
    if (!revealed && isCultureStepScored(step)) {
      setRevealed(true);
      return;
    }
    const ok = grade();
    reviewCultureMemory(task.targetId, ok);
    if (index + 1 >= tasks.length) {
      setDone(true);
      trackCultureEvent("culture_review_complete", { n: tasks.length });
      return;
    }
    setIndex((current) => current + 1);
    setSelected(null);
    setOrder([]);
    setRevealed(false);
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
  const selectedOption = step?.options?.find((option) => option.id === selected);

  return (
    <HubPage data-testid="culture-review">
      <p className="text-xs text-ink-faint">
        {t("culture.missionProgress", { current: index + 1, total: tasks.length })}
      </p>
      <h1 className="font-serif text-2xl font-semibold text-ink">{t("culture.reviewTitle")}</h1>
      {item ? <p className="text-sm text-ink-soft">{instructionLocale === "en" ? item.titleEn : item.titlePt}</p> : null}
      <Card className="mt-3 space-y-3 p-4">
        {step?.prompt ? <p className="text-sm font-medium leading-6 text-ink">{cultureText(step.prompt, instructionLocale)}</p> : null}
        {(step?.beats ?? []).map((beat) => (
          <CultureBeat key={beat.id} beat={beat} locale={instructionLocale} />
        ))}
        {step?.options ? (
          <div className="grid gap-2">
            {step.options.map((option) => (
              <button
                key={option.id}
                type="button"
                data-testid={`culture-option-${option.id}`}
                onClick={() => setSelected(option.id)}
                className={["min-h-11 rounded-xl border px-3 py-2 text-left text-sm", selected === option.id ? "border-accent bg-accent-soft/40" : "border-line bg-surface"].join(" ")}
              >
                {cultureText(option.label, instructionLocale)}
              </button>
            ))}
          </div>
        ) : null}
        {step?.kind === "sequence" && step.sequence ? (
          <div className="grid gap-2">
            {step.sequence
              .filter((row) => !order.includes(row.id))
              .map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm"
                  onClick={() => setOrder((current) => [...current, row.id])}
                >
                  {cultureText(row.label, instructionLocale)}
                </button>
              ))}
          </div>
        ) : null}
        {revealed && selectedOption ? (
          <p className="text-sm text-ink-soft" data-testid="culture-check-feedback">
            {cultureText(selectedOption.feedback, instructionLocale)}
          </p>
        ) : null}
      </Card>
      <Button className="mt-3 min-h-12" onClick={onContinue} disabled={!revealed && !selected && order.length === 0} data-testid="culture-complete">
        {revealed ? t("culture.keepGoing") : t("culture.checkAnswer")}
      </Button>
    </HubPage>
  );
}
