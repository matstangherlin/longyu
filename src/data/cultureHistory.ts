/**
 * V4.11A.3 — China History essentials: chronology + timeline entries.
 *
 * Not a full dynastic CMS. Just enough structure for Hub timeline UI and
 * chronology gates (Qin < Han < Tang < Song < Ming < Qing).
 */

export type HistoryTimelineEntry = {
  id: string;
  labelPt: string;
  labelEn: string;
  /** Mandarin label when pedagogically useful (e.g. 秦). */
  hanzi?: string;
  pinyin?: string;
  /** Inclusive start year; negative = BCE. */
  startYear?: number;
  /** Inclusive end year; negative = BCE. */
  endYear?: number;
  eraLabelPt: string;
  eraLabelEn: string;
  /** Optional link to a published CultureItem. */
  cultureItemId?: string;
};

/**
 * Canonical History collection order. Gates assert this sequence.
 * Dates are approximate introductory markers from museum / encyclopedia timelines.
 */
export const CULTURE_HISTORY_TIMELINE: readonly HistoryTimelineEntry[] = [
  {
    id: "ancient-context",
    labelPt: "China antiga (contexto)",
    labelEn: "Ancient China (context)",
    eraLabelPt: "antes do império unificado",
    eraLabelEn: "before unified empire",
  },
  {
    id: "qin",
    labelPt: "Qin",
    labelEn: "Qin",
    hanzi: "秦",
    pinyin: "Qín",
    startYear: -221,
    endYear: -206,
    eraLabelPt: "221–206 a.C.",
    eraLabelEn: "221–206 BCE",
    cultureItemId: "qin-unification",
  },
  {
    id: "han",
    labelPt: "Han",
    labelEn: "Han",
    hanzi: "汉",
    pinyin: "Hàn",
    startYear: -206,
    endYear: 220,
    eraLabelPt: "206 a.C.–220 d.C.",
    eraLabelEn: "206 BCE–220 CE",
    cultureItemId: "han-dynasty",
  },
  {
    id: "tang",
    labelPt: "Tang",
    labelEn: "Tang",
    hanzi: "唐",
    pinyin: "Táng",
    startYear: 618,
    endYear: 907,
    eraLabelPt: "618–907 d.C.",
    eraLabelEn: "618–907 CE",
    cultureItemId: "tang-dynasty",
  },
  {
    id: "song",
    labelPt: "Song",
    labelEn: "Song",
    hanzi: "宋",
    pinyin: "Sòng",
    startYear: 960,
    endYear: 1279,
    eraLabelPt: "960–1279 d.C.",
    eraLabelEn: "960–1279 CE",
    cultureItemId: "song-dynasty",
  },
  {
    id: "ming",
    labelPt: "Ming",
    labelEn: "Ming",
    hanzi: "明",
    pinyin: "Míng",
    startYear: 1368,
    endYear: 1644,
    eraLabelPt: "1368–1644 d.C.",
    eraLabelEn: "1368–1644 CE",
    cultureItemId: "ming-qing",
  },
  {
    id: "qing",
    labelPt: "Qing",
    labelEn: "Qing",
    hanzi: "清",
    pinyin: "Qīng",
    startYear: 1644,
    endYear: 1912,
    eraLabelPt: "1644–1911/12 d.C.",
    eraLabelEn: "1644–1911/12 CE",
    cultureItemId: "ming-qing",
  },
  {
    id: "modern-context",
    labelPt: "China moderna (contexto)",
    labelEn: "Modern China (context)",
    eraLabelPt: "após o fim do sistema imperial",
    eraLabelEn: "after the end of the imperial system",
  },
] as const;

/** Dynasty ids used by chronology gates (strict order). */
export const CULTURE_HISTORY_DYNASTY_ORDER = [
  "qin-unification",
  "han-dynasty",
  "tang-dynasty",
  "song-dynasty",
  "ming-qing",
] as const;

export const CULTURE_HISTORY_ITEM_IDS = [
  "china-history-timeline",
  ...CULTURE_HISTORY_DYNASTY_ORDER,
] as const;

export type CultureHistoryItemId = (typeof CULTURE_HISTORY_ITEM_IDS)[number];
