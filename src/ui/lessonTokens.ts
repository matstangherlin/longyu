/**
 * V4.9.8B.2 — tokens únicos do Lesson Player / Conversation / Victory / Journey.
 * Valores-espelho das CSS vars `--lesson-*` em `src/index.css`.
 */
export const LESSON_UI = {
  maxWidth: "42rem",
  padding: "0.75rem",
  cardRadius: "1rem",
  buttonHeight: "2.75rem",
  mobileGap: "0.5rem",
  desktopGap: "0.75rem",
  sectionSpacing: "0.75rem",
} as const;

export const LESSON_UI_CLASS = {
  frame: "lesson-ui-frame",
  card: "lesson-ui-card",
  section: "lesson-ui-section",
  gap: "lesson-ui-gap",
  cta: "lesson-ui-cta",
} as const;
