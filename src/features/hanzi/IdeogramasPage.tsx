import { Link } from "react-router-dom";
import { IconBook, IconChevron } from "../../components/ui/Icon";
import { ButtonLink } from "../../components/ui/primitives";
import { useStore } from "../../lib/store";
import { canAccessHanziLab, useIsPro } from "../../lib/proAccess";
import { todayKey } from "../../lib/storage";
import { HANZI_PRACTICE_ROUND, recommendedHanziMode } from "../../lib/hanziPracticeRounds";
import { HubPage, HubProStrip } from "../../components/layout/HubLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { HANZI_MODE_META, hanziModeMeta } from "./hanziTrainingModes";

/**
 * RC2.2.14 · AD–AK — hub de Ideogramas focado em treinar.
 *
 * Acima da dobra: "Treinar agora" com o modo recomendado (rodada de 8).
 * Depois a grade compacta de modos (2 colunas, o card inteiro é o alvo).
 * Atlas é consulta (secundário) e o laboratório Pro fica no fim.
 * Rotas: /ideogramas = hub · /hanzi?mode=… = treino · /hanzi/atlas = Atlas.
 */
export function IdeogramasPage() {
  const { t } = useTranslation();
  const learnedChars = useStore((s) => s.learnedChars);
  const completedLessons = useStore((s) => s.completedLessons);
  const accountId = useStore((s) => s.currentAccountId);
  const practiceKeys = useStore((s) => s.dailyTasks?.practiceRewardKeys);
  const isPremium = useIsPro();
  const access = canAccessHanziLab({ isPremium, completedLessons });
  const recommended = hanziModeMeta(recommendedHanziMode(practiceKeys, accountId, todayKey(), learnedChars.length));

  return (
    <HubPage compact className="space-y-4" data-testid="ideogramas-hub">
      <h1 className="font-serif text-2xl font-semibold text-ink">{t("hanziHub.title")}</h1>

      <section
        data-testid="hanzi-train-now"
        data-recommended-mode={recommended.id}
        className="rounded-3xl border border-accent/20 bg-[radial-gradient(circle_at_85%_10%,rgb(var(--accent-soft)),rgb(var(--surface))_60%)] p-4 shadow-card"
      >
        <div className="flex items-start gap-3">
          <span className="hanzi grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-3xl text-accent" aria-hidden>
            {recommended.glyph}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{t("hanziHub.recommended")}</div>
            <div className="mt-0.5 font-serif text-lg font-semibold text-ink">{t(recommended.titleKey)}</div>
            <div className="text-sm text-ink-soft">{t("hanziHub.roundOf", { n: HANZI_PRACTICE_ROUND })}</div>
          </div>
        </div>
        {access.allowed ? (
          <ButtonLink to={`/hanzi?mode=${recommended.id}`} size="lg" className="mt-4 w-full shadow-lift" data-testid="hanzi-train-now-cta">
            {t("hanziHub.trainNow")} <IconChevron width={18} height={18} />
          </ButtonLink>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-2 px-3 py-2 text-sm text-ink-soft" data-testid="hanzi-locked-reason">
            {access.reason ?? t("hanziHub.locked")}
          </p>
        )}
      </section>

      <section aria-labelledby="hanzi-modes-title">
        <h2 id="hanzi-modes-title" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t("hanziHub.modesTitle")}
        </h2>
        <HanziModeGrid allowed={access.allowed} />
      </section>

      <Link
        to="/hanzi/atlas"
        data-testid="hanzi-atlas-link"
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-line/70 bg-surface px-4 py-3 transition hover:bg-surface-2"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-soft">
          <IconBook width={18} height={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{t("hanziHub.atlasTitle")}</span>
          <span className="block truncate text-xs text-ink-soft">
            {t("hanziHub.atlasSeen", { count: learnedChars.length })} · {t("hanziHub.atlasDesc")}
          </span>
        </span>
        <IconChevron width={16} height={16} className="shrink-0 text-ink-faint" />
      </Link>

      <div data-testid="hanzi-pro-lab">
        <HubProStrip isPremium={isPremium} />
      </div>
    </HubPage>
  );
}

/** Grade compacta de modos: 2 colunas, o card inteiro abre o treino. */
export function HanziModeGrid({ allowed }: { allowed: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="hanzi-mode-grid">
      {HANZI_MODE_META.map((mode) => {
        const body = (
          <>
            <span className="hanzi grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-xl text-ink" aria-hidden>
              {mode.glyph}
            </span>
            <span className="mt-2 block text-sm font-semibold leading-tight text-ink">{t(mode.titleKey)}</span>
            <span className="mt-0.5 block text-xs leading-4 text-ink-soft">{t(mode.descKey)}</span>
          </>
        );
        const className =
          "flex min-h-[7.5rem] flex-col rounded-2xl border border-line/70 bg-surface p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45";
        return allowed ? (
          <Link key={mode.id} to={`/hanzi?mode=${mode.id}`} data-hanzi-mode={mode.id} className={`${className} hover:bg-surface-2 active:scale-[0.99]`}>
            {body}
          </Link>
        ) : (
          <div key={mode.id} data-hanzi-mode={mode.id} aria-disabled="true" className={`${className} opacity-60`}>
            {body}
            <span className="mt-auto pt-1 text-[11px] font-semibold text-ink-faint">{t("hanziHub.locked")}</span>
          </div>
        );
      })}
    </div>
  );
}

