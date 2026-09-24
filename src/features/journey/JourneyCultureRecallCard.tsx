import { useMemo, useRef, useState } from "react";
import { ALL_LESSONS } from "../../data/journey";
import { CULTURE_NATIVE_LESSONS } from "../../data/cultureLessons";
import { CULTURE_ITEMS } from "../../data/culture";
import { cultureText } from "../../data/cultureQuest";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import {
  dismissCultureRecall,
  hanziIn,
  planCultureJourneyRecall,
  readDismissedCultureRecall,
  type CultureJourneyRecall,
} from "../../lib/cultureJourneyRecall";
import { ProseGlossText } from "../../components/hanzi/ProseGlossText";
import { IconLantern } from "../../components/ui/Icon";

/** Respondidos nesta carga: o cartão fica com o feedback em vez de sumir. */
const answeredThisSession = new Set<string>();

/** RC2.2.11 — o único lembrete de Cultura que a Jornada mostra agora (ou nenhum). */
export function useCultureJourneyRecall(): CultureJourneyRecall | null {
  const cultureMemoryById = useStore((s) => s.cultureMemoryById);
  const cultureCompletedIds = useStore((s) => s.cultureCompletedIds);
  const completedLessons = useStore((s) => s.completedLessons);
  const [dismissed] = useState(() => readDismissedCultureRecall());
  const [now] = useState(() => Date.now());
  const lastRef = useRef<CultureJourneyRecall | null>(null);
  const plan = useMemo(() => {
    const done = new Set(completedLessons ?? []);
    const doneLessons = ALL_LESSONS.filter((lesson) => done.has(lesson.id) && lesson.lessonDomain !== "culture");
    const ordered = doneLessons.map((lesson) => lesson.id);
    const taught = new Set(cultureCompletedIds ?? []);
    const knownHanzi = new Set([
      ...hanziIn(doneLessons.map((lesson) => lesson.steps)),
      ...hanziIn(CULTURE_NATIVE_LESSONS.filter((lesson) => taught.has(lesson.cultureItemId ?? "")).map((lesson) => lesson.steps)),
    ]);
    return planCultureJourneyRecall({
      knownHanzi,
      cultureMemoryById: cultureMemoryById ?? {},
      cultureCompletedIds: cultureCompletedIds ?? [],
      completedJourneyLessonIds: ordered,
      dismissedTargetIds: dismissed,
      now,
    });
  }, [completedLessons, cultureCompletedIds, cultureMemoryById, dismissed, now]);
  // Responder reagenda a memória e o plano muda; o cartão respondido fica na
  // tela com o feedback até a próxima visita.
  const last = lastRef.current;
  if (last && answeredThisSession.has(last.task.targetId)) return last;
  lastRef.current = plan;
  return plan;
}

export function JourneyCultureRecallCard({ recall }: { recall: CultureJourneyRecall }) {
  const { instructionLocale } = useTranslation();
  const locale = instructionLocale === "en" ? "en" : "pt-BR";
  const en = locale === "en";
  const reviewCultureMemory = useStore((s) => s.reviewCultureMemory);
  const [picked, setPicked] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const { task } = recall;
  const item = CULTURE_ITEMS.find((entry) => entry.id === task.cultureItemId);
  const options = task.step.options ?? [];
  if (hidden || !item || options.length < 2) return null;
  const chosen = options.find((option) => option.id === picked);

  return (
    <aside
      className="w-[min(100%,340px)] rounded-2xl border border-accent/30 bg-surface/95 px-3.5 py-3 shadow-card"
      data-testid="journey-culture-recall"
      data-culture-item={task.cultureItemId}
      data-culture-target={task.targetId}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
          <IconLantern width={17} height={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            {en ? `Remember · ${item.titleEn}` : `Lembra? · ${item.titlePt}`}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-ink">
            <ProseGlossText text={cultureText(task.step.prompt, locale)} />
          </p>
          <div className="mt-2 grid gap-1.5">
            {options.map((option) => {
              const state = !picked ? "idle" : option.id === picked ? (option.preferred ? "right" : "wrong") : option.preferred ? "right" : "idle";
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(picked)}
                  data-testid="journey-culture-recall-option"
                  data-state={state}
                  onClick={() => {
                    setPicked(option.id);
                    answeredThisSession.add(task.targetId);
                    // Mesmo espaçamento da Revisão de Cultura; fonte = Jornada.
                    reviewCultureMemory(task.targetId, option.preferred, "journey");
                  }}
                  className={[
                    "min-h-10 rounded-xl border px-3 py-2 text-left text-[12px] leading-4 transition",
                    state === "right" ? "border-[rgb(var(--good)/0.5)] bg-[rgb(var(--good)/0.1)] text-ink" : "",
                    state === "wrong" ? "border-wrong/40 bg-wrong-soft text-ink" : "",
                    state === "idle" ? "border-line bg-surface text-ink-soft hover:border-accent/40" : "",
                  ].join(" ")}
                >
                  <ProseGlossText text={cultureText(option.label, locale)} />
                </button>
              );
            })}
          </div>
          {chosen ? (
            <p className="mt-2 text-[12px] leading-4 text-ink-soft" data-testid="journey-culture-recall-feedback" aria-live="polite">
              <ProseGlossText text={cultureText(chosen.feedback, locale)} />
            </p>
          ) : (
            <button
              type="button"
              className="mt-2 min-h-9 text-[11px] font-medium text-ink-faint hover:underline"
              data-testid="journey-culture-recall-dismiss"
              onClick={() => {
                dismissCultureRecall(task.targetId);
                setHidden(true);
              }}
            >
              {en ? "Not now" : "Agora não"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
