import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CULTURE_COMPLETE_XP, getCultureItem, localizedCulture } from "../../data/culture";
import { getCultureMission } from "../../data/cultureMissions";
import {
  cultureText,
  isCultureStepScored,
  type CultureMissionStep,
} from "../../data/cultureQuest";
import { Button, ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { HubPage } from "../../components/layout/HubLayout";
import { useStore } from "../../lib/store";
import { trackCultureEvent } from "../../services/cultureEvents";
import { useTranslation } from "../../i18n/useTranslation";
import { cultureCategoryLabel } from "./CultureCard";
import { CultureBeat, CultureVisual } from "./CultureQuestVisuals";
import { pickNextCultureMissionId } from "../../lib/cultureMastery";

function optionClass(selected: boolean, revealed: boolean, preferred: boolean) {
  if (!revealed) {
    return selected ? "border-accent bg-accent-soft/40 text-ink" : "border-line bg-surface text-ink";
  }
  if (preferred) return "border-[rgb(var(--good))] bg-[rgb(var(--good)/0.08)] text-ink";
  if (selected) return "border-line bg-surface-2 text-ink-soft";
  return "border-line bg-surface text-ink";
}

function unionWith(ids: readonly string[], extra: string): string[] {
  return extra ? [...new Set([...ids, extra])] : [...ids];
}

export function CultureMissionPlayer() {
  const { t, instructionLocale } = useTranslation();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const item = getCultureItem(id);
  const mission = getCultureMission(id);
  const startCultureItem = useStore((s) => s.startCultureItem);
  const completeCultureMission = useStore((s) => s.completeCultureMission);
  const saveCultureItem = useStore((s) => s.saveCultureItem);
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const savedIds = useStore((s) => s.cultureSavedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);

  const from = params.get("from") || (location.state as { from?: string } | null)?.from || "/cultura";
  const fromJourney = params.get("src") === "journey";

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [pendingLeft, setPendingLeft] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);
  const [memoryCorrect, setMemoryCorrect] = useState(true);
  const [victory, setVictory] = useState(false);
  const [resultStars, setResultStars] = useState<1 | 2 | 3>(1);
  const [xpGranted, setXpGranted] = useState(0);
  const [newSeals, setNewSeals] = useState<string[]>([]);

  useEffect(() => {
    if (!item || !mission) return;
    startCultureItem(item.id);
    trackCultureEvent(fromJourney ? "culture_from_journey" : "culture_mission_start", { id: item.id });
  }, [item, mission, fromJourney, startCultureItem]);

  const step: CultureMissionStep | undefined = mission?.steps[index];
  const locale = instructionLocale;
  const copy = item ? localizedCulture(item, locale) : null;
  const scoredTotal = useMemo(() => mission?.steps.filter(isCultureStepScored).length ?? 0, [mission]);

  if (!item || !mission || !copy) {
    return (
      <HubPage data-testid="culture-missing">
        <Card className="p-5">
          <h1 className="font-serif text-2xl font-semibold text-ink">{t("culture.missingTitle")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("culture.missingBody")}</p>
          <ButtonLink to="/cultura" className="mt-4">
            {t("culture.backToHub")}
          </ButtonLink>
        </Card>
      </HubPage>
    );
  }

  const itemId = item.id;

  function onBack() {
    navigate(from.startsWith("/") ? from : "/cultura");
  }

  function resetStepUi() {
    setSelected(null);
    setOrder([]);
    setMatched([]);
    setPendingLeft(null);
    setRevealed(false);
  }

  function gradeCurrent(): boolean {
    if (!step || !isCultureStepScored(step)) return true;
    if (step.kind === "sequence") return (step.sequenceCorrect ?? []).join() === order.join();
    if (step.kind === "match") return (step.matchPairs ?? []).every((pair) => matched.includes(pair.id));
    return Boolean(step.options?.find((option) => option.id === selected)?.preferred);
  }

  function onCheck() {
    if (!step) return;
    const ok = gradeCurrent();
    setRevealed(true);
    if (isCultureStepScored(step)) {
      setScoredCount((count) => count + 1);
      if (ok) setCorrectCount((count) => count + 1);
      if (step.kind === "culture_recall" && !ok) setMemoryCorrect(false);
      trackCultureEvent("culture_step_answer", { id: itemId, step: step.id, ok });
    }
  }

  function onContinue() {
    if (!step || !mission) return;
    if (isCultureStepScored(step) && !revealed) {
      onCheck();
      return;
    }
    if (index + 1 >= mission.steps.length) {
      const scored = scoredCount || scoredTotal;
      const score = scored > 0 ? correctCount / scored : 0;
      const outcome = completeCultureMission({
        itemId,
        score,
        memoryCorrect,
        scoredCount: scored,
        correctCount,
      });
      setResultStars(outcome.stars);
      setXpGranted(outcome.grantedXp ? CULTURE_COMPLETE_XP : 0);
      setNewSeals(outcome.newSeals);
      setVictory(true);
      trackCultureEvent("culture_mission_complete", {
        id: itemId,
        stars: outcome.stars,
        xp: outcome.grantedXp ? CULTURE_COMPLETE_XP : 0,
      });
      return;
    }
    setIndex((current) => current + 1);
    resetStepUi();
  }

  const selectedOption = step?.options?.find((option) => option.id === selected);
  const nextId = pickNextCultureMissionId(unionWith(completedIds, victory ? item.id : ""), startedIds);
  const progress = mission.steps.length ? (index + (victory ? 1 : 0)) / mission.steps.length : 0;
  const needsAnswer = Boolean(step && isCultureStepScored(step) && !revealed);
  const ctaDisabled =
    (needsAnswer && step?.kind !== "match" && step?.kind !== "sequence" && !selected) ||
    Boolean(step && step.kind === "sequence" && !revealed && order.length !== (step.sequence?.length ?? 0)) ||
    Boolean(step && step.kind === "match" && !revealed && matched.length !== (step.matchPairs?.length ?? 0));

  if (victory) {
    return (
      <HubPage data-testid="culture-item" data-culture-id={item.id}>
        <Card className="space-y-3 p-5" data-testid="culture-victory">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{t("culture.missionDoneEyebrow")}</p>
          <h1 className="font-serif text-2xl font-semibold text-ink">{copy.title}</h1>
          <p className="text-2xl" data-testid="culture-stars" data-stars={resultStars}>
            {"★".repeat(resultStars)}
            {"☆".repeat(3 - resultStars)}
          </p>
          <ul className="space-y-1 text-sm text-ink">
            {mission.takeaways.map((row) => (
              <li key={row.pt}>✓ {cultureText(row, locale)}</li>
            ))}
          </ul>
          {xpGranted > 0 ? (
            <p className="text-sm font-medium text-accent" data-testid="culture-xp">
              +{xpGranted} XP
            </p>
          ) : (
            <p className="text-sm text-ink-soft" data-testid="culture-xp-replay">
              {t("culture.replayNoXp")}
            </p>
          )}
          {newSeals.length > 0 ? (
            <p className="text-sm" data-testid="culture-new-seal">
              {t("culture.newSeal")}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {nextId && nextId !== item.id ? (
              <ButtonLink to={`/cultura/${nextId}`} className="min-h-12" data-testid="culture-next-mission">
                {t("culture.nextMission")}
              </ButtonLink>
            ) : null}
            <Button className="min-h-12" variant="outline" onClick={onBack} data-testid="culture-back-journey">
              {fromJourney ? t("culture.backToJourney") : t("culture.backToHub")}
            </Button>
          </div>
        </Card>
      </HubPage>
    );
  }

  return (
    <HubPage data-testid="culture-item" data-culture-id={item.id}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="min-h-11 text-sm font-medium text-accent" onClick={onBack} data-testid="culture-back">
          {t("common.back")}
        </button>
        <Pill>{cultureCategoryLabel(item.category, t)}</Pill>
      </div>
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" data-testid="culture-mission-progress">
          <div className="h-full bg-accent" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <p className="text-xs text-ink-faint">
          {t("culture.missionProgress", { current: index + 1, total: mission.steps.length })}
        </p>
      </div>
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{t("culture.missionEyebrow")}</p>
        <h1 className="mt-1 text-balance font-serif text-2xl font-semibold text-ink">{copy.title}</h1>
      </header>
      {step ? (
        <Card className="space-y-3 p-4" data-testid="culture-mission-step" data-step-kind={step.kind}>
          <CultureVisual kind={step.visual ?? step.beats?.find((beat) => beat.visual)?.visual} />
          {step.prompt ? <p className="text-sm font-medium leading-6 text-ink">{cultureText(step.prompt, locale)}</p> : null}
          {step.body ? <p className="text-sm leading-6 text-ink">{cultureText(step.body, locale)}</p> : null}
          {index === 0 ? <p className="text-sm leading-6 text-ink">{copy.situation}</p> : null}
          <div className="space-y-3">
            {(step.beats ?? []).map((beat) => (
              <CultureBeat key={beat.id} beat={beat} locale={locale} />
            ))}
          </div>
          {step.options ? (
            <div className="grid gap-2" data-testid={step.kind === "culture_recall" ? "culture-mini-check" : "culture-options"}>
              {step.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`culture-option-${option.id}`}
                  onClick={() => {
                    if (!revealed) setSelected(option.id);
                  }}
                  className={["min-h-11 rounded-xl border px-3 py-2 text-left text-sm", optionClass(selected === option.id, revealed, option.preferred)].join(" ")}
                >
                  {cultureText(option.label, locale)}
                </button>
              ))}
            </div>
          ) : null}
          {step.kind === "sequence" && step.sequence ? (
            <div className="grid gap-2" data-testid="culture-sequence">
              {step.sequence
                .filter((row) => !order.includes(row.id))
                .map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm"
                    onClick={() => setOrder((current) => [...current, row.id])}
                  >
                    {cultureText(row.label, locale)}
                  </button>
                ))}
            </div>
          ) : null}
          {step.kind === "match" && step.matchPairs ? (
            <div className="grid grid-cols-2 gap-2" data-testid="culture-match">
              <div className="grid gap-2">
                {step.matchPairs.map((pair) => (
                  <button
                    key={`L-${pair.id}`}
                    type="button"
                    disabled={matched.includes(pair.id)}
                    onClick={() => setPendingLeft(pair.id)}
                    className={["min-h-11 rounded-xl border px-2 py-2 text-left text-sm", pendingLeft === pair.id ? "border-accent bg-accent-soft/40" : "border-line bg-surface"].join(" ")}
                  >
                    {cultureText(pair.left, locale)}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                {step.matchPairs.map((pair) => (
                  <button
                    key={`R-${pair.id}`}
                    type="button"
                    disabled={matched.includes(pair.id)}
                    onClick={() => {
                      if (pendingLeft === pair.id) setMatched((current) => [...current, pair.id]);
                      setPendingLeft(null);
                    }}
                    className="min-h-11 rounded-xl border border-line bg-surface px-2 py-2 text-left text-sm"
                  >
                    {cultureText(pair.right, locale)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {revealed && selectedOption ? (
            <p className="text-sm leading-6 text-ink-soft" data-testid="culture-check-feedback">
              {selectedOption.mayVary ? `${t("culture.mayVary")} ` : ""}
              {cultureText(selectedOption.feedback, locale)}
            </p>
          ) : null}
          {step.kind === "culture_summary" ? (
            <button type="button" className="min-h-11 text-sm font-medium text-accent" data-testid="culture-sources-open" onClick={() => setSourcesOpen(true)}>
              {t("culture.sourcesAndContext")}
            </button>
          ) : (
            <p className="text-xs text-ink-faint">{t("culture.sourcedHint")}</p>
          )}
        </Card>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          className="min-h-12"
          onClick={onContinue}
          disabled={ctaDisabled}
          data-testid="culture-complete"
        >
          {needsAnswer ? t("culture.checkAnswer") : t("culture.keepGoing")}
        </Button>
        <Button
          variant="outline"
          className="min-h-12"
          onClick={() => {
            saveCultureItem(item.id, true);
            trackCultureEvent("culture_save", { id: item.id });
          }}
          disabled={savedIds.includes(item.id)}
          data-testid="culture-save"
        >
          {savedIds.includes(item.id) ? t("culture.saved") : t("culture.saveForLater")}
        </Button>
      </div>
      {sourcesOpen ? (
        <Card className="p-4" data-testid="culture-sources-drawer">
          <h2 className="font-serif text-lg font-semibold text-ink">{t("culture.sources")}</h2>
          {copy.variability ? <p className="mt-2 text-sm leading-6 text-ink-soft">{copy.variability}</p> : null}
          <ul className="mt-2 space-y-2 text-sm text-ink-soft">
            {item.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} className="text-accent underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <span> — {source.publisher}</span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="mt-2 min-h-11" onClick={() => setSourcesOpen(false)}>
            {t("common.close")}
          </Button>
        </Card>
      ) : null}
    </HubPage>
  );
}
