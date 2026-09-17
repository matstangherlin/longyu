/**
 * Journey Culture Moments — presentation integration only.
 *
 * Not a curriculum source: does not create CultureItems, CultureLessons,
 * or JOURNEY_NODES. Each moment references an existing cultureItemId and
 * opens the canonical culture lesson when the learner chooses Explorar.
 */

export type JourneyCultureMoment = {
  id: string;
  cultureItemId: string;
  /** Mandarin topic after which the moment card appears. */
  afterTopicId: string;
  priority: number;
  optional: true;
  /** Placement rationale for audits / reports (not shown to learners). */
  reason: string;
  /** Optional eyebrow override key kind for card chrome. */
  eyebrowKind?: "culture" | "history" | "literature" | "symbol" | "festival";
  /** Presentation teaser only — already present in the CultureItem body/title. */
  teaserZh?: string;
  teaserPinyin?: string;
};

/**
 * First wave: 5 hub-only flagship items that were missing from the Journey trail.
 * Spring Festival stays on its existing CULTURE_LESSON journey node (l25) —
 * no duplicate moment card for the same item.
 */
export const JOURNEY_CULTURE_MOMENTS: readonly JourneyCultureMoment[] = [
  {
    id: "moment-chinese-dragon",
    cultureItemId: "chinese-dragon",
    afterTopicId: "l26",
    priority: 10,
    optional: true,
    eyebrowKind: "symbol",
    teaserZh: "龙",
    teaserPinyin: "lóng",
    reason:
      "l26 is early meal/host etiquette — 龙 appears in festival décor and celebration context without medical/emergency conflict.",
  },
  {
    id: "moment-lantern-festival",
    cultureItemId: "lantern-festival",
    afterTopicId: "l25",
    priority: 20,
    optional: true,
    eyebrowKind: "festival",
    teaserZh: "元宵节",
    teaserPinyin: "Yuánxiāojié",
    reason:
      "l25 already anchors Spring Festival explore node; Lantern Festival closes the same lunisolar New Year period.",
  },
  {
    id: "moment-sun-wukong",
    cultureItemId: "sun-wukong",
    afterTopicId: "l9",
    priority: 30,
    optional: true,
    eyebrowKind: "literature",
    teaserZh: "孙悟空",
    teaserPinyin: "Sūn Wùkōng",
    reason:
      "l9 is early titles/school — literature interlude is safe; relatedLessonIds include l9. Not history.",
  },
  {
    id: "moment-journey-to-the-west",
    cultureItemId: "journey-to-the-west",
    afterTopicId: "l24",
    priority: 40,
    optional: true,
    eyebrowKind: "literature",
    teaserZh: "西游记",
    teaserPinyin: "Xīyóujì",
    reason:
      "l24 family/home context sits near Mid-Autumn explore; classical literature moment before denser city units.",
  },
  {
    id: "moment-china-history-timeline",
    cultureItemId: "china-history-timeline",
    afterTopicId: "p1-o-que-e-mandarim",
    priority: 50,
    optional: true,
    eyebrowKind: "history",
    reason:
      "Early orientation after Mandarin intro — History Timeline is the Atlas doorway; dynasty lessons stay hub-only.",
  },
] as const;

export const JOURNEY_CULTURE_MOMENT_MAX = 6;

export function cultureMomentsAfterTopic(topicId: string): JourneyCultureMoment[] {
  return JOURNEY_CULTURE_MOMENTS.filter((moment) => moment.afterTopicId === topicId).sort(
    (a, b) => a.priority - b.priority
  );
}

export function journeyCultureMomentById(id: string): JourneyCultureMoment | undefined {
  return JOURNEY_CULTURE_MOMENTS.find((moment) => moment.id === id);
}

export function journeyCultureMomentFocusParam(momentId: string): string {
  return `culture-moment:${momentId}`;
}

/** Build LessonPlayer search so victory returns to Journey scrolled to this moment. */
export function cultureMomentPlayerSearch(momentId: string): string {
  const from = `/jornada?focus=${encodeURIComponent(journeyCultureMomentFocusParam(momentId))}`;
  return `?src=jornada&from=${encodeURIComponent(from)}`;
}
