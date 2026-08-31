export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  TARGET_LANGUAGE,
  I18N_NAMESPACES,
  INTERFACE_LOCALE_STORAGE_KEY,
  LONGYU_I18N_VERSION,
  LOCALE_HTML_LANG,
  LOCALE_OG,
  LOCALE_DISPLAY_NAME,
  isSupportedLocale,
  type SupportedLocale,
  type InterfaceLocale,
  type TargetLanguage,
  type I18nNamespace,
} from "./config";

export {
  parseInterfaceLocale,
  getInterfaceLocale,
  setInterfaceLocale,
  bootstrapInterfaceLocale,
  subscribeInterfaceLocale,
  applyDocumentLocale,
  readPersistedInterfaceLocale,
  resetInterfaceLocaleForTests,
} from "./locale";

export { t, interpolate, flattenCatalog, consumeMissingTranslationKeys, peekMissingTranslationKeys } from "./catalog";
export type { MessageKey, MessageCatalog, TranslateVars } from "./catalog";

export { I18nProvider, useI18n, useTranslation } from "./provider";

export {
  formatDate,
  formatDateTime,
  formatNumber,
} from "./format";

export {
  localizeUserMessage,
  matchUserMessageKey,
} from "./errors";

export {
  localInterfaceLocaleAdapter,
  cloudInterfaceLocaleAdapter,
  activeInterfaceLocaleAdapter,
  resolvePreferredInterfaceLocale,
} from "./cloudAdapter";
export type { InterfaceLocaleAdapter } from "./cloudAdapter";

export {
  resolveLocalizedText,
  isCanonicalZhField,
  isLocalizableInstructionField,
  CANONICAL_ZH_FIELD_NAMES,
  LOCALIZABLE_INSTRUCTION_FIELD_NAMES,
  CONTENT_LAYERS,
  TEXT_ROLES,
} from "./pedagogy";
export type {
  LocalizedText,
  CanonicalZhContent,
  LocalizableInstructionContent,
  LocalizedLessonOverlay,
  ContentLayer,
  TextRole,
} from "./pedagogy";

export {
  FIRST_20_TEACHING_TOPIC_IDS,
  isFirst20TeachingTopic,
} from "./overlays/first20";
export {
  TOPICS_21_50_TEACHING_TOPIC_IDS,
  TOPICS_51_80_TEACHING_TOPIC_IDS,
  TOPICS_81_113_TEACHING_TOPIC_IDS,
  TOPICS_21_80_TEACHING_TOPIC_IDS,
  TOPICS_21_113_TEACHING_TOPIC_IDS,
  TOPICS_1_50_TEACHING_TOPIC_IDS,
  TOPICS_1_80_TEACHING_TOPIC_IDS,
  TOPICS_1_113_TEACHING_TOPIC_IDS,
  FAIL_CLOSED_TEACHING_TOPIC_COUNT,
  isTopics2150TeachingTopic,
  isTopics5180TeachingTopic,
  isTopics81113TeachingTopic,
  isTopics150TeachingTopic,
  isTopics180TeachingTopic,
  isTopics1113TeachingTopic,
  pedagogyLocId,
  pedagogyMetaLocId,
} from "./overlays/teachingTopics";
export {
  localizedAchievementTitle,
  localizedAchievementDesc,
  localizedAchievementCategory,
  localizedAchievementReward,
  localizedBadgeTitle,
  localizedRewardSource,
  ACCURACY_SERENE_BADGE,
  ACCURACY_SERENE_REWARD_ID,
  ACCURACY_SERENE_LOC_ID,
} from "./achievements";

export {
  resolveInstructionText,
  answersEquivalent,
  scoredAnswersMatch,
  hasEnglishOverlay,
  toCanonicalAnswerIdentity,
} from "./overlays/instructionGloss";
export { localizeLessonStep, localizeLessonTitle, canonicalStepFingerprint } from "./overlays/localizeLesson";
export { localizeReviewExercise } from "./overlays/localizeReview";
