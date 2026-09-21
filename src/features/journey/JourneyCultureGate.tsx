import { Link } from "react-router-dom";
import { CULTURE_ITEMS } from "../../data/culture";
import { CULTURE_SEALS } from "../../data/cultureQuest";
import { cultureLessonPlayerPath } from "../../data/cultureNative";
import { useTranslation } from "../../i18n/useTranslation";
import type { CultureProgressionGateEvaluation } from "../../lib/cultureProgressionGate";
import { JourneyGuideExplanation } from "./JourneyGuideExplanation";

/**
 * RC2.2.6 — marco cultural na trilha.
 *
 * Aparece antes do tópico que ele guarda, para que chegar ali não pareça bug.
 * O tom é de preparo, não de pedágio: o dragão diz por que o próximo trecho
 * assume aquele contexto, e o CTA abre exatamente a próxima Culture Lesson que
 * falta — nunca o Hub genérico.
 */
export function JourneyCultureGate({
  evaluation,
}: {
  evaluation: CultureProgressionGateEvaluation;
}) {
  const { locale } = useTranslation();
  const en = locale === "en";
  const { gate, completed, total, completedItemIds, missingItemIds, nextItemId, status } = evaluation;

  // Marco já resolvido (selo na mão ou usuário legado) não ocupa a trilha.
  if (evaluation.ready) return null;

  const seal = CULTURE_SEALS.find((item) => item.id === gate.requiredSealId);
  const requiredIds = [...completedItemIds, ...missingItemIds];
  const orderedIds = requiredIds.sort((a, b) => {
    const orderOf = (id: string) => CULTURE_ITEMS.find((item) => item.id === id)?.order ?? 0;
    return orderOf(a) - orderOf(b);
  });

  const title = en ? gate.titleEn : gate.titlePt;
  const reason = en ? gate.reasonEn : gate.reasonPt;
  const ctaLabel = en ? "Continue through Culture" : "Continuar pela Cultura";

  return (
    <div
      className="flex w-full max-w-[22rem] flex-col items-stretch gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card"
      data-journey-culture-gate={gate.id}
      data-culture-gate-status={status}
      data-culture-gate-progress={`${completed}/${total}`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-xl leading-none">
          {seal?.emoji ?? "🐉"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="text-[11px] font-medium text-ink-soft" data-testid="culture-gate-progress">
            {en ? `${completed} of ${total} done` : `${completed} de ${total} concluídas`}
          </p>
        </div>
      </div>

      {/* O dragão explica o porquê, no mesmo GuideDialogue canônico da RC2.2.5. */}
      <JourneyGuideExplanation id={`culture-gate-${gate.id}`} message={reason} className="max-w-none" />

      <ul className="flex flex-col gap-1" data-testid="culture-gate-items">
        {orderedIds.map((itemId) => {
          const item = CULTURE_ITEMS.find((entry) => entry.id === itemId);
          const done = completedItemIds.includes(itemId);
          return (
            <li
              key={itemId}
              className="flex items-start gap-2 text-[12px] leading-5"
              data-culture-gate-item={itemId}
              data-culture-gate-item-done={done ? "true" : "false"}
            >
              <span aria-hidden className={done ? "text-good" : "text-ink-faint"}>
                {done ? "✓" : "○"}
              </span>
              <span className={done ? "text-ink-soft line-through" : "text-ink"}>
                {item ? (en ? item.titleEn : item.titlePt) : itemId}
              </span>
            </li>
          );
        })}
      </ul>

      {nextItemId && (
        <Link
          to={cultureLessonPlayerPath(nextItemId, `?src=jornada&from=${encodeURIComponent("/jornada")}&gate=${gate.id}`)}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-lift transition hover:bg-accent-strong"
          data-testid="culture-gate-cta"
          data-culture-gate-next={nextItemId}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
