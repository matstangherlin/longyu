import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CHUNKS } from "../../data/chunks";
import {
  getCultureItem,
  localizedCulture,
  miniOptionLabel,
  CULTURE_COMPLETE_XP,
} from "../../data/culture";
import { getLesson } from "../../data/journey";
import { HubPage } from "../../components/layout/HubLayout";
import { Button, ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { useStore } from "../../lib/store";
import { trackCultureEvent } from "../../services/cultureEvents";
import { useTranslation } from "../../i18n/useTranslation";
import { cultureCategoryLabel } from "./CultureCard";
import { displayLessonTitle, displayInstruction } from "../../i18n/overlays/journeyChrome";

export function CultureItemPage() {
  const { t, instructionLocale } = useTranslation();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const item = getCultureItem(id);
  const completeCultureItem = useStore((s) => s.completeCultureItem);
  const saveCultureItem = useStore((s) => s.saveCultureItem);
  const startCultureItem = useStore((s) => s.startCultureItem);
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const savedIds = useStore((s) => s.cultureSavedIds);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const from = params.get("from") || (location.state as { from?: string } | null)?.from || "/cultura";
  const fromJourney = params.get("src") === "journey";

  useEffect(() => {
    if (!item) return;
    startCultureItem(item.id);
    trackCultureEvent(fromJourney ? "culture_from_journey" : "culture_open", { id: item.id });
  }, [item, fromJourney, startCultureItem]);

  const copy = item ? localizedCulture(item, instructionLocale) : null;
  const relatedLessons = useMemo(
    () => (item?.relatedLessonIds ?? []).map((lessonId) => getLesson(lessonId)).filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson)),
    [item]
  );
  const relatedChunks = useMemo(
    () =>
      (item?.relatedChunkRefs ?? [])
        .map((chunkId) => CHUNKS.find((chunk) => chunk.id === chunkId))
        .filter((chunk): chunk is (typeof CHUNKS)[number] => Boolean(chunk)),
    [item]
  );

  if (!item || !copy) {
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

  const completed = completedIds.includes(item.id);
  const saved = savedIds.includes(item.id);
  const check = item.miniCheck;
  const correct = selected === check.correctOptionId;
  const itemId = item.id;

  function onCheck() {
    if (!selected) return;
    setRevealed(true);
  }

  function onComplete() {
    completeCultureItem(itemId);
    trackCultureEvent("culture_complete", { id: itemId, xp: CULTURE_COMPLETE_XP });
  }

  function onSave() {
    saveCultureItem(itemId, true);
    trackCultureEvent("culture_save", { id: itemId });
  }

  function onBack() {
    navigate(from.startsWith("/") ? from : "/cultura");
  }

  return (
    <HubPage data-testid="culture-item" data-culture-id={item.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="min-h-11 text-sm font-medium text-accent" onClick={onBack} data-testid="culture-back">
          {t("common.back")}
        </button>
        <Pill>{cultureCategoryLabel(item.category, t)}</Pill>
      </div>

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{t("culture.eyebrow")}</p>
        <h1 className="mt-1 text-balance font-serif text-2xl font-semibold text-ink">{copy.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("culture.minutes", { n: item.estimatedMinutes })}</p>
      </header>

      <Section kicker={t("culture.sectionSituation")} body={copy.situation} />
      <Section kicker={t("culture.sectionNotice")} body={copy.notice} />
      <Section kicker={t("culture.sectionWhy")} body={copy.why} />
      <Section kicker={t("culture.sectionPractice")} body={copy.practice} />
      {copy.variability ? <Section kicker={t("culture.sectionVary")} body={copy.variability} /> : null}

      {relatedChunks.length > 0 && (
        <Card className="p-4">
          <h2 className="font-serif text-lg font-semibold text-ink">{t("culture.sectionMandarin")}</h2>
          <ul className="mt-3 space-y-3">
            {relatedChunks.slice(0, 3).map((chunk) => (
              <li key={chunk.id}>
                <MandarinText hanzi={chunk.hanzi} pinyin={chunk.pinyin} size="md" />
                <p className="mt-1 text-sm text-ink-soft">{displayInstruction(chunk.meaningPt, instructionLocale)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4" data-testid="culture-mini-check">
        <h2 className="font-serif text-lg font-semibold text-ink">{t("culture.sectionCheck")}</h2>
        <p className="mt-2 text-sm leading-6 text-ink">{copy.miniPrompt}</p>
        <div className="mt-3 grid gap-2">
          {check.options.map((option) => (
            <button
              key={option.id}
              type="button"
              data-testid={`culture-option-${option.id}`}
              onClick={() => {
                setSelected(option.id);
                setRevealed(false);
              }}
              className={[
                "min-h-11 rounded-xl border px-3 py-2 text-left text-sm",
                selected === option.id ? "border-accent bg-accent-soft/40 text-ink" : "border-line bg-surface text-ink",
              ].join(" ")}
            >
              {miniOptionLabel(option, instructionLocale)}
            </button>
          ))}
        </div>
        <Button className="mt-3 min-h-11" onClick={onCheck} disabled={!selected}>
          {t("culture.checkAnswer")}
        </Button>
        {revealed && (
          <p className={`mt-3 text-sm ${correct ? "text-[rgb(var(--good))]" : "text-ink-soft"}`} data-testid="culture-check-feedback">
            {correct ? t("culture.checkCorrect") : t("culture.checkTryAgain")} {copy.miniExplanation}
          </p>
        )}
      </Card>

      {relatedLessons.length > 0 && (
        <Card className="p-4">
          <h2 className="font-serif text-lg font-semibold text-ink">{t("culture.relatedLessons")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {relatedLessons.map((lesson) => (
              <li key={lesson.id}>
                <Link to={`/licao/${lesson.id}`} className="text-accent underline-offset-2 hover:underline">
                  {displayLessonTitle(lesson.title, instructionLocale)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="font-serif text-lg font-semibold text-ink">{t("culture.sources")}</h2>
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
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="min-h-12" onClick={onComplete} disabled={completed} data-testid="culture-complete">
          {completed ? t("culture.completed") : t("culture.complete")}
        </Button>
        <Button variant="outline" className="min-h-12" onClick={onSave} disabled={saved} data-testid="culture-save">
          {saved ? t("culture.saved") : t("culture.saveForLater")}
        </Button>
      </div>
    </HubPage>
  );
}

function Section({ kicker, body }: { kicker: string; body: string }) {
  return (
    <section className="space-y-1">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{kicker}</h2>
      <p className="text-sm leading-6 text-ink">{body}</p>
    </section>
  );
}
