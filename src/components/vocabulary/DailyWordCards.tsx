import { Link } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import { todayKey } from "../../lib/storage";
import { activeCourseDirection } from "../../lib/courseDirectionState";
import { dailyVocabularyCandidate, meaningForDirection, shiftDayKey } from "../../lib/dailyVocabulary";
import { DAILY_VOCABULARY_ROUTE, type DailyVocabularyExposure } from "../../lib/dailyVocabularyPlan";
import { Pinyin } from "../hanzi/Pinyin";

const EMPTY: readonly DailyVocabularyExposure[] = [];

/**
 * RC2.2.15 · CA–CB — card pequeno "Palavra de hoje" na Jornada. Só aparece
 * com a Palavra do dia ligada, uma palavra definida para hoje e ainda não
 * praticada. Fica abaixo de Continuar e da Revisão (prioridade: lição →
 * revisão → palavra).
 */
export function DailyWordTodayCard() {
  const { t } = useTranslation();
  const enabled = useStore((s) => s.dailyVocabularyPrefs?.enabled === true);
  const exposures = useStore((s) => s.dailyVocabulary?.exposures ?? EMPTY);
  const today = todayKey();
  const exposure = exposures.find((entry) => entry.dateKey === today);
  const candidate = exposure ? dailyVocabularyCandidate(exposure.lexicalId) : null;
  if (!enabled || !exposure || exposure.practicedAt != null || !candidate) return null;
  const meaning = meaningForDirection(candidate, activeCourseDirection() ?? "pt-zh") ?? candidate.meaningPt;
  return (
    <Link
      to={`${DAILY_VOCABULARY_ROUTE}/${candidate.id}`}
      data-testid="daily-word-card"
      data-lexical-id={candidate.id}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-card transition active:scale-[0.99]"
    >
      <span className="hanzi shrink-0 text-3xl leading-none text-ink" lang="zh-CN">
        {candidate.hanzi}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{t("dailyWord.todayCard")}</span>
        <span className="block truncate text-sm text-ink">
          <Pinyin text={candidate.pinyin} className="font-semibold" /> · {meaning}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">{t("dailyWord.todayLearn")}</span>
    </Link>
  );
}

/**
 * RC2.2.15 · CO / DY–DZ — "Descobertas" dentro do Atlas: hoje, ontem e esta
 * semana, com o estado real (nova / aberta / praticada). Sem calendário, sem
 * ofensiva própria.
 */
export function DailyDiscoveries() {
  const { t } = useTranslation();
  const exposures = useStore((s) => s.dailyVocabulary?.exposures ?? EMPTY);
  const today = todayKey();
  const yesterday = shiftDayKey(today, -1);
  const weekStart = shiftDayKey(today, -6);
  const recent = exposures
    .filter((entry) => entry.dateKey <= today && entry.dateKey >= weekStart)
    .filter((entry) => dailyVocabularyCandidate(entry.lexicalId))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  if (recent.length === 0) return null;
  const direction = activeCourseDirection() ?? "pt-zh";
  const groups: { label: string; items: DailyVocabularyExposure[] }[] = [
    { label: t("dailyWord.today"), items: recent.filter((entry) => entry.dateKey === today) },
    { label: t("dailyWord.yesterday"), items: recent.filter((entry) => entry.dateKey === yesterday) },
    { label: t("dailyWord.thisWeek"), items: recent.filter((entry) => entry.dateKey < yesterday) },
  ].filter((group) => group.items.length > 0);
  return (
    <section className="space-y-2 rounded-2xl border border-line bg-surface p-4 shadow-card" data-testid="atlas-discoveries">
      <h2 className="font-serif text-lg font-semibold text-ink">{t("dailyWord.discoveries")}</h2>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{group.label}</div>
          <ul className="mt-1 divide-y divide-line/70">
            {group.items.map((entry) => {
              const candidate = dailyVocabularyCandidate(entry.lexicalId)!;
              const status = entry.practicedAt != null ? "practiced" : entry.openedAt != null ? "opened" : "new";
              return (
                <li key={`${entry.dateKey}:${entry.lexicalId}`}>
                  <Link
                    to={`${DAILY_VOCABULARY_ROUTE}/${candidate.id}`}
                    className="flex min-h-12 items-center gap-3 py-1.5"
                    data-discovery={candidate.id}
                    data-discovery-status={status}
                  >
                    <span className="hanzi w-12 shrink-0 text-2xl text-ink" lang="zh-CN">{candidate.hanzi}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      <Pinyin text={candidate.pinyin} /> · {meaningForDirection(candidate, direction) ?? candidate.meaningPt}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {t(status === "practiced" ? "dailyWord.statusPracticed" : status === "opened" ? "dailyWord.statusOpened" : "dailyWord.statusNew")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
