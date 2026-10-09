/**
 * RC2.3.13B — Home cognitive blocks for Journey (/jornada).
 * Hierarchy: Continue (primary) → Today (secondary) → Seu Mandarim (tertiary) → Descobrir (tertiary).
 */
import { Link } from "react-router-dom";
import { Button, ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { IconChevron, IconFlame, IconRefresh } from "../../components/ui/Icon";
import { Mascot } from "../../components/brand/Mascot";
import { useTranslation } from "../../i18n/useTranslation";
import { STATE_LABEL_PT } from "../../lib/mastery/personalMastery";
import {
  HOME_HREFS,
  type ExploreRecommendation,
  type HomeContinueRecommendation,
  type MasteryHomeSnapshot,
  type TodayRecommendation,
} from "../../lib/home/homeRecommendations";

function continueLabel(
  rec: HomeContinueRecommendation,
  t: (key: string) => string
): string {
  switch (rec.kind) {
    case "START_FIRST":
      return t("home.startFirstLesson");
    case "FALLBACK_REVIEW":
      return t("home.continueReview");
    case "FALLBACK_PRACTICE":
      return t("home.continuePractice");
    case "FALLBACK_EXPLORE":
      return t("home.continueExplore");
    case "CONTINUE_LESSON":
    default:
      return t("journey.continue");
  }
}

export function HomeCompactChrome({
  greeting,
  streak,
  offline,
}: {
  greeting: string;
  streak: number;
  offline: boolean;
}) {
  const { t } = useTranslation();
  return (
    <header
      className="flex items-center justify-between gap-2"
      data-testid="home-compact-chrome"
      data-home-section="chrome"
    >
      <p className="min-w-0 truncate text-sm text-ink-soft" data-testid="home-greeting">
        {greeting}
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        {offline && (
          <Pill tone="muted" className="gap-1" data-testid="offline-indicator">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" aria-hidden /> {t("shell.offline")}
          </Pill>
        )}
        {streak > 0 && (
          <Pill tone="accent" className="gap-1" aria-label={t("shell.streakAria", { streak })} data-testid="home-streak">
            <IconFlame width={12} height={12} /> {streak}d
          </Pill>
        )}
      </div>
    </header>
  );
}

export function HomeContinueCard({
  rec,
  phaseLabel,
  moduleTitle,
  lessonTitle,
  progressLabel,
  nextStepHint,
  journeyComplete,
  onContinue,
}: {
  rec: HomeContinueRecommendation;
  phaseLabel: string;
  moduleTitle: string;
  lessonTitle?: string;
  progressLabel?: string;
  nextStepHint?: string;
  journeyComplete: boolean;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  if (rec.kind === "NONE") {
    return (
      <Card
        className="relative overflow-hidden border-accent/15 bg-[radial-gradient(circle_at_0%_0%,rgb(var(--accent-soft))_0%,rgb(var(--surface))_58%,rgb(var(--surface))_100%)] p-4 shadow-lift sm:p-5"
        data-testid="home-continue"
        data-home-section="continue"
        data-continue-kind="NONE"
        data-cta-hierarchy="primary"
      >
        <h1 className="font-serif text-2xl font-semibold leading-tight text-ink">{t("journey.completed")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("journey.availableComplete")}</p>
        <div className="mt-3 flex justify-end">
          <Mascot size={56} variant="celebrate" className="shrink-0" />
        </div>
      </Card>
    );
  }

  const label = continueLabel(rec, t);
  const title =
    rec.kind === "START_FIRST"
      ? t("home.startFirstTitle")
      : rec.kind === "FALLBACK_REVIEW"
        ? t("home.fallbackReviewTitle")
        : rec.kind === "FALLBACK_PRACTICE"
          ? t("home.fallbackPracticeTitle")
          : rec.kind === "FALLBACK_EXPLORE"
            ? t("home.fallbackExploreTitle")
            : t("home.continueWhereLeft");

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-accent/20 bg-[radial-gradient(circle_at_0%_0%,rgb(var(--accent-soft))_0%,rgb(var(--surface))_58%,rgb(var(--surface))_100%)] p-4 shadow-lift sm:p-5"
      data-testid="home-continue"
      data-home-section="continue"
      data-continue-kind={rec.kind}
      data-cta-hierarchy="primary"
      data-lesson-id={rec.lessonId}
      aria-labelledby="home-continue-heading"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-surface/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent shadow-card">
          {phaseLabel}
        </span>
        {journeyComplete ? (
          <Mascot size={40} variant="celebrate" className="shrink-0" />
        ) : null}
      </div>

      <h1 id="home-continue-heading" className="relative mt-2 font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl">
        {title}
      </h1>
      {(moduleTitle || lessonTitle) && (
        <h2 className="relative mt-1 truncate text-base font-semibold text-ink sm:text-lg">
          {lessonTitle ?? moduleTitle}
        </h2>
      )}
      {moduleTitle && lessonTitle && (
        <p className="relative mt-0.5 truncate text-xs text-ink-faint">{moduleTitle}</p>
      )}
      {progressLabel && (
        <p className="relative mt-1 text-xs font-medium text-ink-soft" data-testid="home-continue-progress">
          {progressLabel}
        </p>
      )}
      {nextStepHint && (
        <p className="relative mt-1 line-clamp-2 text-xs leading-4 text-ink-soft" data-testid="home-continue-hint">
          {nextStepHint}
        </p>
      )}

      <div className="relative mt-4">
        <Button
          className="min-h-12 w-full border-b-[3px] border-b-[rgb(var(--accent-strong))] shadow-none active:translate-y-px active:border-b-[1px] sm:w-auto sm:min-w-[12rem] sm:px-8"
          size="lg"
          onClick={onContinue}
          data-testid="home-continue-cta"
          data-coachmark-target="journey-continue"
          data-cta-hierarchy="primary"
          aria-label={label}
        >
          <span className="leading-none">{label}</span>
          <IconChevron width={18} height={18} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

export function HomeTodayForYou({ rec }: { rec: TodayRecommendation }) {
  const { instructionLocale } = useTranslation();
  const en = instructionLocale === "en";
  return (
    <section
      className="rounded-2xl border border-line/55 bg-surface p-3.5 shadow-card sm:p-4"
      data-testid="home-today"
      data-home-section="today"
      data-today-kind={rec.kind}
      data-cta-hierarchy="secondary"
      aria-labelledby="home-today-heading"
    >
      <h2
        id="home-today-heading"
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
      >
        {en ? "Today for you" : "Hoje para você"}
      </h2>
      <p className="mt-1.5 text-sm leading-5 text-ink" data-testid="home-today-reason">
        {en ? rec.reasonEn : rec.reasonPt}
      </p>
      <div className="mt-3">
        <ButtonLink
          to={rec.href}
          variant="secondary"
          size="md"
          className="min-h-11 w-full justify-center sm:w-auto sm:min-w-[9rem]"
          data-testid="home-today-cta"
          data-cta-hierarchy="secondary"
        >
          {rec.kind === "REVIEW_DUE" ? <IconRefresh width={14} height={14} aria-hidden /> : null}
          <span>{en ? rec.ctaEn : rec.ctaPt}</span>
        </ButtonLink>
      </div>
    </section>
  );
}

export function HomeSeuMandarim({ snapshot }: { snapshot: MasteryHomeSnapshot }) {
  const { instructionLocale } = useTranslation();
  const en = instructionLocale === "en";
  if (!snapshot.hasEvidence) return null;

  return (
    <section
      className="rounded-2xl border border-line/45 bg-surface/90 p-3.5 sm:p-4"
      data-testid="home-mastery"
      data-home-section="mastery"
      data-cta-hierarchy="tertiary"
      aria-labelledby="home-mastery-heading"
    >
      <h2
        id="home-mastery-heading"
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
      >
        {en ? "Your Mandarin" : "Seu Mandarim"}
      </h2>
      <p className="mt-1 text-[11px] leading-4 text-ink-faint" data-testid="home-mastery-value">
        {en
          ? "Longyu measures what you can do — not only lessons finished."
          : "O Longyu mede o que você consegue fazer — não só lições concluídas."}
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink" data-testid="home-mastery-counts">
        <li>
          <span className="font-semibold tabular-nums">{snapshot.firm}</span>{" "}
          <span className="text-ink-soft">{en ? "firm" : STATE_LABEL_PT.STRONG.toLowerCase()}</span>
        </li>
        <li>
          <span className="font-semibold tabular-nums">{snapshot.developing}</span>{" "}
          <span className="text-ink-soft">{en ? "building" : STATE_LABEL_PT.DEVELOPING.toLowerCase()}</span>
        </li>
        <li>
          <span className="font-semibold tabular-nums">{snapshot.needsAttention}</span>{" "}
          <span className="text-ink-soft">
            {en ? "need attention" : `${STATE_LABEL_PT.NEEDS_PRACTICE.toLowerCase()}`}
          </span>
        </li>
      </ul>
      <Link
        to={HOME_HREFS.DOMINIO}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
        data-testid="home-mastery-cta"
        data-cta-hierarchy="tertiary"
      >
        {en ? "See my mastery →" : "Ver meu domínio →"}
      </Link>
    </section>
  );
}

export function HomeExploreBlock({ rec }: { rec: ExploreRecommendation }) {
  const { instructionLocale } = useTranslation();
  const en = instructionLocale === "en";
  return (
    <section
      className="rounded-2xl border border-dashed border-line/55 bg-surface/70 p-3.5 sm:p-4"
      data-testid="home-explore"
      data-home-section="explore"
      data-culture-item={rec.cultureItemId}
      data-cta-hierarchy="tertiary"
      aria-labelledby="home-explore-heading"
    >
      <h2
        id="home-explore-heading"
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
      >
        {en ? "Discover" : "Descobrir"}
      </h2>
      <h3 className="mt-1.5 text-sm font-semibold leading-5 text-ink" data-testid="home-explore-title">
        {en ? rec.titleEn : rec.titlePt}
      </h3>
      <Link
        to={rec.href}
        className="mt-2.5 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
        data-testid="home-explore-cta"
        data-cta-hierarchy="tertiary"
      >
        {en ? "Explore culture →" : "Explorar cultura →"}
      </Link>
    </section>
  );
}
