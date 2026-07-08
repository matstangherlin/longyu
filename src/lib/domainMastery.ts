import { DOMAIN_ORDER, type DomainTrack } from "../data/domains";
import { ALL_LESSONS, type Skill } from "../data/journey";
import type { SRSItem } from "./srs";

const SKILL_TRACK: Record<Skill, DomainTrack> = {
  som: "som",
  fala: "fala",
  hanzi: "hanzi",
  leitura: "leitura",
  sistema: "hanzi",
};

export interface DomainMastery {
  track: DomainTrack;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  reviewedItems: number;
}

export function domainMastery(
  completedLessons: string[],
  srs: Record<string, SRSItem>
): DomainMastery[] {
  const completed = new Set(completedLessons);

  return DOMAIN_ORDER.map((track) => {
    const lessons = ALL_LESSONS.filter((lesson) => SKILL_TRACK[lesson.skill] === track);
    const completedForTrack = lessons.filter((lesson) => completed.has(lesson.id)).length;
    const lessonScore = lessons.length > 0 ? completedForTrack / lessons.length : 0;

    const items = Object.values(srs).filter((item) => inferTrack(item) === track);
    const srsScore = items.length > 0
      ? items.reduce((sum, item) => sum + itemStrength(item), 0) / items.length
      : 0;

    // Lição mede exposição; SRS mede retenção. Misturar os dois evita barra falsa.
    const percent = Math.round(Math.min(1, lessonScore * 0.65 + srsScore * 0.35) * 100);

    return {
      track,
      percent,
      completedLessons: completedForTrack,
      totalLessons: lessons.length,
      reviewedItems: items.length,
    };
  });
}

function inferTrack(item: SRSItem): DomainTrack {
  if (item.track) return item.track;
  if (item.type === "chunk") return "fala";
  return "hanzi";
}

function itemStrength(item: SRSItem): number {
  const repsScore = Math.min(0.55, item.reps * 0.14);
  const intervalScore = Math.min(0.4, item.intervalDays * 0.04);
  const lapsePenalty = Math.min(0.35, item.lapses * 0.1);
  return Math.max(0, Math.min(1, repsScore + intervalScore + 0.05 - lapsePenalty));
}
