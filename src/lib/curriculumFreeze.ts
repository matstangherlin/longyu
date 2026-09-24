/**
 * Curriculum identity is the Journey fingerprint, not a feature-branch SHA.
 *
 * V4.11A.3 (China History Essentials) closed the Culture Atlas:
 * CultureItems 24 → 30, Culture Native Lessons 24 → 30, History 0 → 6.
 * Journey Culture nodes stay at 20 (history wave is hub-only).
 * Core Mandarin lesson count (134) and teaching topics (113) unchanged.
 *
 * Fingerprint advanced: 943a8f9fb720 → 516692632525 because
 * `cultureNative.ts` + `cultureLessons.ts` are CURRICULUM_SOURCES.
 * Do not restore the prior fingerprint.
 *
 * CURRICULUM_FREEZE = RC2_CONTENT_FREEZE marks content closed for RC2.
 * CONTENT_FREEZE_SHA ≠ RELEASE_CANDIDATE_SHA — the latter stays empty
 * until a real deploy candidate exists.
 *
 * Supersedes any older doc that treated 40be45d as a current RC2 candidate.
 */
export const CURRICULUM_FREEZE = "RC2_CONTENT_FREEZE" as const;
/**
 * After RC2.1.2: no new product features until public beta GO/NO-GO.
 * Allowed: P0/P1 blockers, security, a11y, auth/sync, devices, release tooling, QA fixes.
 * Forbidden: new lessons, CultureItems, exercise modes, AI, gamification, commercial launches.
 */
export const FEATURE_FREEZE = "PUBLIC_BETA" as const;

/**
 * RC2.2.7 — CONTROLLED_PEDAGOGY_CONTENT_EXCEPTION.
 *
 * A única exceção aberta sob `FEATURE_FREEZE`, e ela é estreita de propósito:
 * o currículo tinha 190 tarefas com consciência tonal e ZERO transferência — o
 * aluno percebia contorno, escolhia número e marcava marca, sempre dentro de um
 * exercício cujo assunto era o tom, e nunca usava o tom para dizer algo a
 * alguém. Isso é um buraco pedagógico, não um recurso faltando.
 *
 * O que a exceção PERMITE: tarefas novas dentro de lições que já existem,
 * usando motor que já existe (`free_production`) e vocabulário que a própria
 * lição já ensinou.
 *
 * O que ela não permite — e os gates recusam: lição nova, CultureItem novo,
 * StepKind novo, vocabulário novo, teoria tonal nova.
 *
 * Contagens congeladas continuam intactas: 134 lições, 113 tópicos, 30
 * CultureItems. O que muda é densidade de tarefa dentro do que já existia.
 */
export const CONTROLLED_PEDAGOGY_CONTENT_EXCEPTION = {
  id: "RC2_2_7_TONE_TRANSFER",
  scope: "tone transfer tasks inside existing lessons",
  allows: ["new tasks in existing lessons", "existing engines only", "already-taught vocabulary"],
  forbids: ["new lessons", "new CultureItems", "new StepKind", "new vocabulary", "new tone theory"],
  gates: [
    "validate:tone-transfer-coverage",
    "validate:tone-transfer-honesty",
    "test:tone-transfer",
    "validate:tone-teach-before-test",
  ],
} as const;

/**
 * RC2.2.7 avançou 516692632525 → 327de1df0f33.
 *
 * Mudaram `src/data/journey.ts` (12 passos de transferência tonal),
 * `src/features/lesson/lessonTasks.ts` e o novo `src/data/toneTransfer.ts`,
 * que passou a ser CURRICULUM_SOURCE — sem isso, mexer na copy dessas tarefas
 * não moveria o fingerprint e o relatório mentiria por omissão.
 *
 * Não restaurar o fingerprint anterior: ele descreveria um currículo que não
 * existe mais. Congelar identidade é registrar o que mudou, não fingir que
 * nada mudou.
 *
 * RC2.2.9 avançou 327de1df0f33 → c48b008c9c1e.
 *
 * Mudaram `src/data/conversationScenes.ts` (duas cenas dedicadas:
 * gostos-na-casa, perguntar-o-caminho), `src/features/lesson/lessonTasks.ts`
 * (ponto único que aplica os passos de fechamento ao plano real) e o novo
 * `src/data/capabilityClosureSteps.ts`, que passou a ser CURRICULUM_SOURCE.
 * Nenhuma lição, tópico, CultureItem ou StepKind novo; nenhum chunk novo — os
 * passos apontam para chunks que já estavam no registry e que o ciclo lexical
 * já declarava, mas que o planner nunca entregava ao aluno.
 */
export const RC_BASE_FINGERPRINT = "c48b008c9c1e";
export const RC1_EXPECTED_LESSON_COUNT = 134;
export const RC1_EXPECTED_TEACHING_TOPIC_COUNT = 113;
export const RC1_MERGE_SHA = "c4441b68ae2388027d72e3af748417ef7caf2bb6";

/** Culture Atlas counts frozen at V4.11A.3 closure. */
export const RC2_EXPECTED_CULTURE_ITEMS = 30;
export const RC2_EXPECTED_CULTURE_NATIVE_LESSONS = 30;
export const RC2_EXPECTED_JOURNEY_CULTURE_NODES = 20;
export const RC2_EXPECTED_HISTORY_ITEMS = 6;

/**
 * Tip SHA of the V4.11A.3 content freeze. Stamped after the freeze commit lands.
 * Distinct from RELEASE_CANDIDATE_SHA (deploy candidate — still empty).
 */
export const RC2_CONTENT_FREEZE_SHA = "24ba129d79e61124c7d6dd3aaa3756eb9a6adf40";

/** Intentionally empty until a real public-beta deploy candidate exists. */
export const RELEASE_CANDIDATE_SHA = "";

/**
 * RC2.2.9 — BETA_PEDAGOGY_FREEZE.
 *
 * Depois do fechamento das capacidades conversacionais, o escopo pedagógico
 * da Public Beta está congelado. Qualquer lição, tópico, CultureItem, sistema
 * de progressão, moeda, SRS, motor de desafio, motor de conquistas ou feature
 * pública nova precisa ATUALIZAR este registro de propósito — o gate
 * validate:beta-pedagogy-freeze recusa a adição silenciosa.
 *
 * Continuam livres (não mexem no que está congelado): correção de bug,
 * acessibilidade, performance, compatibilidade Android, segurança, engenharia
 * de release, correções de QA e correção de copy.
 */
export const BETA_PEDAGOGY_FREEZE = {
  id: "RC2_2_9_BETA_PEDAGOGY_FREEZE",
  since: "RC2.2.9",
  fingerprint: RC_BASE_FINGERPRINT,
  counts: {
    lessons: 134,
    teachingTopics: 113,
    cultureItems: 30,
    cultureNativeLessons: 30,
    journeyCultureNodes: 20,
    cultureMoments: 5,
    toneTransferPlayable: 12,
    conversationCapabilities: 31,
    conversationCapabilitiesRuntimeReady: 31,
  },
  blocks: [
    "new lesson",
    "new teaching topic",
    "new CultureItem",
    "new major progression system",
    "new currency",
    "new SRS",
    "new challenge engine",
    "new achievement engine",
    "new public Beta feature",
  ],
  allows: [
    "bug fix",
    "accessibility",
    "performance",
    "Android compatibility",
    "security",
    "release engineering",
    "QA fixes",
    "copy correction",
  ],
  /**
   * Módulos de progressão, economia, SRS, desafio e conquista existentes
   * (src/lib, src/data, src/features/challenge). Arquivo novo com esse papel
   * = sistema novo = atualização explícita do freeze.
   */
  systemModules: [
    "src/data/achievements.ts",
    "src/data/cultureProgressionGates.ts",
    "src/data/economy.ts",
    "src/data/lexicalProgression.ts",
    "src/data/masteryCoverage.ts",
    "src/data/masteryLoop.ts",
    "src/data/masteryPassSpacing.ts",
    "src/data/masteryPilot.ts",
    "src/data/masteryQuality.ts",
    "src/data/masteryWave1Bonus.ts",
    "src/data/pearlMilestones.ts",
    "src/data/reviewExamples.ts",
    "src/data/reviewMastery.ts",
    "src/data/topicMastery.ts",
    "src/data/topicMasteryBonus.ts",
    "src/data/topicMasterySpecs.ts",
    "src/features/challenge/ModuleChallengePage.tsx",
    "src/features/challenge/PhaseChallengePage.tsx",
    "src/features/challenge/examBuilder.ts",
    "src/lib/cloudPearlProActivation.ts",
    "src/lib/conversationVocabularySrs.ts",
    "src/lib/cultureMastery.ts",
    "src/lib/cultureProgressionGate.ts",
    "src/lib/domainMastery.ts",
    "src/lib/economyIntentQueue.ts",
    "src/lib/economyServerBridge.ts",
    "src/lib/economyTypes.ts",
    "src/lib/leagueLiveFixture.ts",
    "src/lib/leagueLiveView.ts",
    "src/lib/leagueXpKeys.ts",
    "src/lib/leagueXpSync.ts",
    "src/lib/leagues.ts",
    "src/lib/pearlEconomy.ts",
    "src/lib/pearlPro.ts",
    "src/lib/phaseChallenge.ts",
    "src/lib/srs.ts",
    "src/lib/streak.ts",
    "src/lib/streakRecoveryPrompt.ts",
  ],
  /** Superfície da economia (src/data/economy.ts): export novo = moeda/regra nova. */
  economyExports: [
    "DAILY_CHARGES_FREE", "CHARGE_COST_ACTIVITY", "STORY_ENERGY_DAILY_CAP", "CONSECUTIVE_MISTAKE_CHARGE_THRESHOLD",
    "CONSECUTIVE_MISTAKE_CHARGE_COST", "FREE_REVIEW_SESSION_LIMIT", "REVIEW_DAILY_SESSION_TARGET", "BREATH_LIVES",
    "BREATH_RECOVERY_QI", "FOLEGO_START", "FOLEGO_MAX_FREE", "FOLEGO_SKIP_COST", "FOLEGO_PERFECT_ROUND_REWARD",
    "FOLEGO_PERFECT_EARN_CHANCE", "FOLEGO_DAILY_EARN_CAP", "FOLEGO_PENDING_MASTERY_REPS", "RETRY_QUESTION_QI",
    "MODULE_RETRY_QI", "THREE_STAR_ACCURACY", "THREE_STAR_SHORT_ACCURACY", "PASS_ACCURACY", "MODULE_REVIEW_PASS_ACCURACY",
    "LESSON_BASE_XP", "LESSON_PASS_XP", "LESSON_PASS_PRACTICE_XP", "LESSON_TOPIC_MASTERED_XP_BONUS",
    "LESSON_THREE_STAR_XP_BONUS", "LESSON_THREE_STAR_QI", "LESSON_NO_SKIP_QI", "PRO_LESSON_QI_BONUS",
    "PRO_CHEST_QI_MULTIPLIER", "PRO_MISSION_QI_MULTIPLIER", "PRO_CHEST_RARE_BONUS", "PRO_CHEST_FOCUS_PASS_CHANCE",
    "DAILY_GOAL_QI", "CHARGE_FREE_ACTIVITIES", "ECONOMY_SUMMARY", "MODULE_PASS_QI", "MODULE_SKIP_VALIDATION_QI",
    "SHOP_PRICES", "QI_PACK_AMOUNT", "FOCUS_PASS_HOURS", "PEARL_PRICES", "PEARL_PRO_PASS_DAYS", "PEARL_PRO_COOLDOWN_DAYS",
    "PEARL_PRO_COST", "FOCUS_PASS_48H_HOURS", "PEARL_STREAK_MILESTONES", "PearlMilestoneDef", "PEARL_ERROR_MILESTONES",
    "PEARL_HANZI_MILESTONES", "PEARL_AUDIO_MILESTONES", "PEARL_PRODUCTION_MILESTONES", "PEARL_JOURNEY_PHASE_MASTER_PEARLS",
    "PEARL_JOURNEY_MAJOR_PEARLS", "PEARL_MONTHLY_CHALLENGE_PEARLS", "PEARL_ECONOMY_SUMMARY", "ChestRarity",
    "CHEST_RARITY_META",
  ],
  /** Features públicas registradas em src/product/featureTruth.ts. */
  featureTruthIds: [
    "journey_learning", "review_remediation", "tone_contrast_training", "tts_playback", "phrase_chunk_training",
    "hanzi_lab", "pinyin_lab", "immersion_audio", "interactive_stories", "daily_energy", "qi_economy",
    "focused_training", "error_insights", "weak_spot_plan", "progress_reports", "leagues", "speech_recognition",
    "family_management", "business_dashboard", "ai_roleplay", "pronunciation_feedback", "tone_scoring",
  ],
} as const;
