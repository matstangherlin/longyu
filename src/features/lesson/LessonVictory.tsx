import { useEffect, useMemo, useRef, useState } from "react";
import { journeyCultureAllowsSkip, type JourneyCultureGuidanceType } from "../../lib/journeyCultureGuidance";
import { Mascot } from "../../components/brand/Mascot";
import { Button } from "../../components/ui/primitives";
import { IconChevron, IconStar } from "../../components/ui/Icon";
import { t } from "../../i18n/catalog";
import { playSoundFx } from "../../lib/soundFx";
import { useStore } from "../../lib/store";
import { LESSON_UI_CLASS } from "../../ui/lessonTokens";
import {
  buildLessonCompletionSummary,
  type LessonCompletionSkill,
} from "./buildLessonCompletionSummary";

export type LessonVictoryContext = "lesson" | "culture" | "review" | "test" | "mission";

export function LessonVictory({
  context = "lesson",
  title,
  headline,
  stars,
  xp,
  accuracy,
  errorCount,
  assistanceCount,
  mistakesBySkill,
  displayName,
  locale,
  recovered,
  recoveredBanner,
  pendingStarsHint,
  topicLines,
  primaryLabel,
  primaryTestId,
  onPrimary,
  guided = false,
  learned,
  cultureNext,
}: {
  context?: LessonVictoryContext;
  title: string;
  headline?: string;
  stars: number;
  xp: number;
  accuracy: number;
  errorCount: number;
  assistanceCount?: number;
  mistakesBySkill?: Partial<Record<LessonCompletionSkill, number>>;
  displayName?: string;
  locale: "pt" | "en";
  recovered?: boolean;
  recoveredBanner?: string;
  pendingStarsHint?: string;
  topicLines?: { title: string; lessonLine?: string; remainingLine?: string };
  primaryLabel: string;
  primaryTestId: string;
  onPrimary: () => void;
  /** RC2.2.17B · PART CR — mesmo shell da aula: sem card, recap antes das recompensas. */
  guided?: boolean;
  /** O que a lição ensinou (hànzì · pinyin · sentido), no máximo 3. */
  learned?: Array<{ hanzi: string; pinyin?: string; meaning?: string }>;
  /**
   * RC2.2.19 — o "Continuar" leva à aula de Cultura RECOMENDADA do tópico:
   * a tela diz isso e oferece voltar à Jornada (recomendação, não pedágio).
   */
  cultureNext?: { type: JourneyCultureGuidanceType; line: string; skipLabel: string; onSkip: () => void };
}) {
  const soundEffects = useStore((s) => s.soundEffects);
  const [motionReady, setMotionReady] = useState(false);
  const [shownXp, setShownXp] = useState(0);
  const playedRef = useRef(false);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const summary = useMemo(
    () =>
      buildLessonCompletionSummary({
        accuracy,
        errorCount,
        assistanceCount,
        mistakesBySkill,
        displayName,
        locale,
      }),
    [accuracy, errorCount, assistanceCount, mistakesBySkill, displayName, locale]
  );

  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    if (soundEffects) playSoundFx("lessonComplete", soundEffects);
    if (reducedMotion) {
      setShownXp(xp);
      setMotionReady(true);
      return;
    }
    const timers = [
      window.setTimeout(() => setMotionReady(true), 300),
      window.setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const t0 = Math.min(1, (now - start) / 400);
          setShownXp(Math.round(xp * t0));
          if (t0 < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 1000),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reducedMotion, soundEffects, xp]);

  const heading =
    headline ??
    (context === "culture"
      ? t("culture.lessonComplete")
      : context === "review"
        ? t("player.reviewComplete")
        : context === "test"
          ? t("player.testComplete")
          : context === "mission"
            ? t("player.missionComplete")
            : t("player.lessonComplete"));

  return (
    /*
     * RC1.3 · P24 — compactação do desktop, sem redesenho.
     *
     * A Victory da RC1.1 continua idêntica em conteúdo e hierarquia. O que muda
     * é só a altura: no mobile o card ocupa a tela e o CTA fica grudado embaixo
     * (P24.3, sticky continua fazendo sentido com o polegar); no desktop, onde o
     * conteúdo é curto, `h-full` + `flex-1` esticavam o card até quase 100dvh e
     * abriam um vazio enorme entre o resumo e "Voltar à Jornada" (P24.2).
     *
     * A compactação é `roomy:`, não `sm:`. `sm:` é largura, e um celular deitado
     * (667x360) satisfaz `sm` com 360px de altura: o card deixava de ocupar a
     * tela, crescia até a altura do conteúdo e levava o CTA para fora do alcance.
     * `roomy` exige largura de `sm` E altura sobrando.
     *
     * E, em qualquer tamanho, a região de conteúdo continua encolhível
     * (`min-h-0 flex-1 overflow-y-auto`). Quando o conteúdo passa do teto do
     * card, ela rola; o CTA, que é `shrink-0`, nunca é empurrado para fora do
     * `overflow-hidden` da seção. Foi exatamente isso que um `flex-none` aqui
     * causou: o CTA saía do card recortado e não dava mais para sair da tela.
     */
    <div
      className={`mx-auto flex h-full min-h-0 w-full max-w-xl flex-col pb-[var(--app-safe-bottom)] roomy:h-auto roomy:justify-start roomy:py-4 ${LESSON_UI_CLASS.frame}`}
      data-lesson-victory
      data-lesson-victory-shell="minimal"
      data-lesson-victory-compact="desktop"
      data-testid={context === "culture" ? "culture-victory" : undefined}
      data-victory-context={context}
      data-guided-recap={guided ? "true" : undefined}
    >
      <section
        className={
          guided
            ? "flex min-h-0 flex-1 flex-col overflow-hidden text-center roomy:max-h-[calc(100dvh-4rem)] roomy:flex-none"
            : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-accent-soft bg-[radial-gradient(circle_at_50%_0%,rgba(183,121,31,.2),rgb(var(--surface))_38%,rgb(var(--bg))_100%)] text-center shadow-lift roomy:max-h-[calc(100dvh-4rem)] roomy:flex-none"
        }
      >
        <div
          data-lesson-activity-scroll
          data-lesson-scroll-region
          data-lesson-victory-scroll
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pb-5 pt-4 [-webkit-overflow-scrolling:touch] sm:px-6"
        >
          <div className="mx-auto inline-flex rounded-full bg-surface/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent shadow-card">
            {title}
          </div>

          <div
            className={`relative mx-auto mt-2 h-16 w-20 shrink-0 ${motionReady || reducedMotion ? "lesson-victory-in" : ""}`}
            data-testid={context === "culture" ? "culture-stars" : undefined}
            data-victory-mascot
          >
            <div className="absolute inset-x-0 top-0 flex justify-center">
              <Mascot size={56} variant="celebrate" animated={!reducedMotion} />
            </div>
          </div>

          <h1 className="mt-2 text-balance font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {heading}
          </h1>
          {summary.perfect ? (
            <p className="mt-1 text-sm font-semibold text-accent" data-testid="culture-perfect" data-victory-perfect>
              {t("player.perfectCelebration")}
            </p>
          ) : summary.greeting ? (
            <p className="mt-1 text-sm text-ink-soft">{summary.greeting}</p>
          ) : null}

          {topicLines ? (
            <div className="mx-auto mt-1 max-w-md" data-testid="topic-victory-copy">
              <p className="text-sm font-semibold text-ink">{topicLines.title}</p>
              {topicLines.lessonLine ? (
                <p className="mt-0.5 text-xs text-ink-soft sm:text-sm" data-testid="topic-victory-lesson">
                  {topicLines.lessonLine}
                </p>
              ) : null}
              {topicLines.remainingLine ? (
                <p className="mt-1 text-sm font-medium text-accent" data-testid="topic-victory-remaining">
                  {topicLines.remainingLine}
                </p>
              ) : null}
            </div>
          ) : null}

          {learned && learned.length > 0 ? (
            // PART CR/CS — primeiro o que foi aprendido; XP e estrelas depois.
            <div className="mx-auto mt-4 w-full max-w-sm text-left" data-victory-learned>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">{t("player.youLearned")}</p>
              <ul className="mt-2 grid gap-1.5">
                {learned.map((item) => (
                  <li key={item.hanzi} className="flex items-baseline gap-2">
                    <span className="hanzi text-2xl text-ink">{item.hanzi}</span>
                    {item.pinyin ? <span className="pinyin text-sm text-ink-soft">{item.pinyin}</span> : null}
                    {item.meaning ? <span className="text-sm text-ink-soft">· {item.meaning}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-center gap-1.5" data-victory-stars>
            {[1, 2, 3].map((n) => (
              <IconStar
                key={n}
                width={26}
                height={26}
                className={n <= stars ? "longyu-star-spark text-accent" : "text-line"}
                fill={n <= stars ? "currentColor" : "none"}
                style={{ animationDelay: reducedMotion ? "0ms" : `${550 + (n - 1) * 150}ms` }}
              />
            ))}
          </div>

          {recovered && recoveredBanner ? (
            <div className="mx-auto mt-2.5 rounded-xl border border-[rgb(var(--good)/0.3)] bg-[rgb(var(--good)/0.1)] px-3 py-2 text-xs font-semibold text-[rgb(var(--good))]" data-review-recovered>
              {recoveredBanner}
            </div>
          ) : null}
          {pendingStarsHint ? (
            <div className="mx-auto mt-2.5 rounded-xl border border-accent-soft bg-accent-soft/45 px-3 py-2 text-xs font-medium text-accent">
              {pendingStarsHint}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-stretch justify-center gap-2" data-testid={context === "culture" ? "culture-score" : "lesson-victory-score"}>
            <span data-testid={context === "culture" ? "culture-xp" : "lesson-victory-xp"} data-victory-xp>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-soft bg-accent-soft/60 px-3 py-1.5 text-sm font-semibold text-accent shadow-card">
                <span className="font-serif tabular-nums">+{shownXp || xp}</span>
                <span className="text-xs font-medium opacity-80">XP</span>
              </span>
            </span>
            <span data-victory-accuracy className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink shadow-card">
              <span className="font-serif tabular-nums">{accuracy}%</span>
              <span className="text-xs font-medium opacity-80">{t("player.accuracy")}</span>
            </span>
          </div>

          {/*
            P14.1/P14.4 — no máximo um ponto forte e um foco, e o ponto forte
            só se apresenta como tal quando é verdadeiro. Sem evidência
            positiva, a linha é uma constatação neutra, sem o rótulo
            "Ponto forte" por cima de uma precisão ruim.
          */}
          <div className="mx-auto mt-4 w-full max-w-sm space-y-2 text-left" data-victory-summary>
            <div
              className={
                summary.hasRealStrength
                  ? "rounded-2xl border border-[rgb(var(--good)/0.25)] bg-[rgb(var(--good)/0.08)] px-3 py-2.5"
                  : "rounded-2xl border border-line bg-surface-2/60 px-3 py-2.5"
              }
              data-victory-highlight
              data-victory-strength={summary.hasRealStrength ? "real" : "neutral"}
            >
              {summary.hasRealStrength ? (
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--good))]">
                  {t("player.strongPoint")}
                </div>
              ) : null}
              <p className={`text-sm font-medium text-ink${summary.hasRealStrength ? " mt-0.5" : ""}`}>
                {summary.highlight}
              </p>
            </div>
            {summary.focus ? (
              <div className="rounded-2xl border border-accent-soft bg-accent-soft/30 px-3 py-2.5" data-victory-focus>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                  {t("player.toImprove")}
                </div>
                <p className="mt-0.5 text-sm font-medium text-ink">{summary.focus}</p>
              </div>
            ) : null}
          </div>
          {/*
            P14.2/P14.3 — o que não entra aqui: oferta Pro, estado de
            sincronização, card cultural, missões, acordeões, nav inferior e
            qualquer segundo CTA. A conclusão é recompensa emocional; Pro tem
            superfícies próprias e o sync acontece em background (P0.5).
          */}
        </div>

        {/* P24.3 — sticky no mobile; com folga vertical o CTA só segue o conteúdo. */}
        <div
          data-lesson-victory-actions
          className={
            guided
              ? "shrink-0 bg-bg/95 px-3 pb-[max(0.75rem,var(--app-safe-bottom))] pt-2.5 sm:px-6 roomy:pb-4"
              : "shrink-0 border-t border-accent-soft/60 bg-[rgb(var(--surface)/0.98)] px-3 pb-[max(0.75rem,var(--app-safe-bottom))] pt-2.5 sm:px-6 roomy:border-t-0 roomy:pb-4"
          }
          data-guided-action-dock={guided ? true : undefined}
        >
          {cultureNext && (
            <p className="mb-2 text-center text-sm leading-5 text-ink-soft" data-culture-guidance-type={cultureNext.type} data-testid="victory-culture-next">
              {cultureNext.line}
            </p>
          )}
          <Button className={`min-h-12 w-full shadow-lift ${LESSON_UI_CLASS.cta}`} size="lg" data-testid={primaryTestId} data-victory-primary onClick={onPrimary}>
            {primaryLabel}
            <IconChevron width={18} height={18} />
          </Button>
          {cultureNext && journeyCultureAllowsSkip(cultureNext.type) && (
            <Button variant="ghost" size="lg" className="mt-1 min-h-11 w-full" data-testid="victory-culture-skip" onClick={cultureNext.onSkip}>
              {cultureNext.skipLabel}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
