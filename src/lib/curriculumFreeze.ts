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
 *
 * RC2.3.13F (Culture Deep Expansion) advanced 5a64821d0b7d → fea5455e1461:
 * CultureItems 30 → 36, native lessons 30 → 36 (hub-only). Journey culture
 * nodes stay 20. Mandarin lesson/topic counts unchanged. Fingerprint moves
 * only because `cultureNative.ts` is a CURRICULUM_SOURCE.
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
 * RC2.3.13R.3.1 — PRE_BETA_FREEZE_EXCEPTION.
 *
 * Real-device owner QA exposed beta blockers (canonical exercise skips, audio
 * truncation, personalized utterance cuts, distractor leakage, visual
 * repetition, mobile activity fit). This exception allows learner-runtime
 * correctness fixes only — not product redesign or curriculum expansion.
 *
 * Reason: REAL_DEVICE_BETA_BLOCKER_FIX
 * Counts stay frozen: 134 lessons, 113 topics, 36 CultureItems.
 */
export const PRE_BETA_FREEZE_EXCEPTION = {
  id: "RC2_3_13R3_1_LEARNING_INTEGRITY",
  reason: "REAL_DEVICE_BETA_BLOCKER_FIX",
  allows: [
    "canonical activity integrity fixes",
    "audio continuity / personalized utterance playback",
    "distractor quality / name-leak repair",
    "deterministic visual variety",
    "small-viewport activity layout compaction",
  ],
  forbids: ["new lessons", "new topics", "new CultureItems", "new StepKind", "mastery math changes", "feature redesign"],
  gates: [
    "validate:canonical-activity-integrity",
    "validate:distractor-quality",
    "gate:rc2-3-13r3-1-learning-integrity",
  ],
} as const;

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
 *
 * RC2.3.0 avançou c48b008c9c1e → 99cbc002710c.
 *
 * Mudaram `src/data/journey.ts` (campos `pedagogyRole` / discovery no LessonStep)
 * e `src/data/foundationTopicPlans.ts` (piloto humano “pela manhã” no Pass 1
 * de mandarim). Contagens congeladas intactas: 134 lições, 113 tópicos, 30
 * CultureItems. Sem StepKind novo. Ver `RC2_3_0_PEDAGOGY_V6_CONTENT_EXCEPTION`.
 *
 * RC2.3.1 avançou 99cbc002710c → c3861b5fb65f.
 *
 * Adicionou `visualConceptId` em `LessonStep` e o motor Visual First
 * (`resolveCurriculumVisual`, cenas, first exposure). Sem lição/StepKind novo.
 * Ver `RC2_3_1_VISUAL_FIRST_CONTENT_EXCEPTION`.
 *
 * RC2.3.2 avançou c3861b5fb65f → e566a250c5a6.
 *
 * Adicionou metadata Everyday Mandarin em `LessonStep` + motor
 * `applyEverydayMandarinToPlan` (cenários/intents). Sem lição/StepKind novo.
 * Ver `RC2_3_2_HUMAN_EVERYDAY_CONTENT_EXCEPTION`.
 *
 * RC2.3.3 mantém e566a250c5a6 (Culture Deep aprofunda Culture Missions / gates
 * sem mudar o hash da Jornada de mandarim). Ver `RC2_3_3_CULTURE_DEEP_CONTENT_EXCEPTION`.
 */
// RC2.3.13F: hub-only Culture V2 expansion (36 items / 36 native lessons).
export const RC_BASE_FINGERPRINT = "fea5455e1461";
export const RC1_EXPECTED_LESSON_COUNT = 134;
export const RC1_EXPECTED_TEACHING_TOPIC_COUNT = 113;
export const RC1_MERGE_SHA = "c4441b68ae2388027d72e3af748417ef7caf2bb6";

/**
 * Culture Atlas counts.
 * RC2.3.13F intentionally expands hub-only CultureItems (36) + native lessons (36).
 * Journey culture nodes stay at 20 — Mandarin fingerprint unchanged.
 */
export const RC2_EXPECTED_CULTURE_ITEMS = 36;
export const RC2_EXPECTED_CULTURE_NATIVE_LESSONS = 36;
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
/**
 * RC2.3.13E — ProgressionShell navigation-state preservation.
 *
 * SYSTEM: ProgressionShell navigation-state preservation
 * SCOPE: UX_NAVIGATION_ONLY
 * PEDAGOGICAL_AUTHORITY: NONE
 *
 * Remembers Journey/Culture mode, anchors, and scroll. Must NOT unlock Mandarin
 * lessons, change Mastery/SRS/grading/XP/economy, or act as a second curriculum.
 */
export const RC2_3_13E_PROGRESSION_SHELL_EXCEPTION = {
  id: "RC2_3_13E_PROGRESSION_SHELL",
  system: "ProgressionShell navigation-state preservation",
  scope: "UX_NAVIGATION_ONLY",
  pedagogicalAuthority: "NONE",
  modules: ["src/lib/progressionShellState.ts"] as const,
  mayRemember: ["route", "anchor", "scroll", "last mode"] as const,
  forbids: [
    "Mandarin lesson unlock",
    "Mastery state",
    "SRS due status",
    "grading",
    "XP",
    "economy",
    "second pedagogical progression engine",
  ],
  fingerprint: RC_BASE_FINGERPRINT,
  gate: "gate:rc2-3-13e-progression-shell-culture",
} as const;

/**
 * RC2.3.13F — Culture Deep Expansion (hub-only CultureItems + 12-path taxonomy).
 *
 * SYSTEM: Culture V2 path model + FLAGSHIP_DEEP content
 * SCOPE: CULTURE_CONTENT_ONLY
 * PEDAGOGICAL_AUTHORITY: NONE for Mandarin Journey / Mastery / SRS
 *
 * Intentionally raises cultureItems/nativeLessons counts. Must NOT change
 * Mandarin lesson count, teaching topics, Journey culture nodes, Mastery math,
 * SRS, billing, or JEV learner runtime.
 */
export const RC2_3_13F_CULTURE_DEEP_EXPANSION_EXCEPTION = {
  id: "RC2_3_13F_CULTURE_DEEP_EXPANSION",
  system: "Culture V2 path model + FLAGSHIP_DEEP content",
  scope: "CULTURE_CONTENT_ONLY",
  pedagogicalAuthority: "NONE",
  modules: [
    "src/data/culturePaths.ts",
    "src/data/culture13fNewItems.ts",
    "src/data/cultureDeepSchema.ts",
  ] as const,
  forbids: [
    "Mandarin curriculum change",
    "Mastery math change",
    "SRS algorithm change",
    "Journey culture node count change",
    "billing change",
    "JEV learner runtime ON",
  ],
  /** Typed fingerprint advance: hub-only CultureItems 30→36 move cultureNative CURRICULUM_SOURCE. */
  previousFingerprint: "5a64821d0b7d",
  fingerprint: "fea5455e1461",
  cultureItems: RC2_EXPECTED_CULTURE_ITEMS,
  cultureNativeLessons: RC2_EXPECTED_CULTURE_NATIVE_LESSONS,
  journeyCultureNodes: RC2_EXPECTED_JOURNEY_CULTURE_NODES,
  culturePaths: 12,
  gate: "gate:rc2-3-13f-culture-deep-expansion",
} as const;

export const BETA_PEDAGOGY_FREEZE = {
  id: "RC2_2_9_BETA_PEDAGOGY_FREEZE",
  since: "RC2.2.9",
  fingerprint: RC_BASE_FINGERPRINT,
  counts: {
    lessons: 134,
    teachingTopics: 113,
    cultureItems: 36,
    cultureNativeLessons: 36,
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
    // RC2.3.13E — UX navigation position memory only (see RC2_3_13E_PROGRESSION_SHELL_EXCEPTION).
    "src/lib/progressionShellState.ts",
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

/**
 * RC2.2.11 — exceção controlada ao BETA_PEDAGOGY_FREEZE (BY).
 *
 * Coerência de experiência, não expansão: nenhuma lição, tópico, CultureItem,
 * StepKind, moeda, SRS ou motor novo. As áreas abaixo mexem só em
 * apresentação, navegação, identidade e na ligação entre sistemas que já
 * existem. O fingerprint continua c48b008c9c1e (nenhuma CURRICULUM_SOURCE
 * mudou) e as contagens do freeze não se movem.
 */
export const RC2_2_11_EXPERIENCE_COHERENCE_EXCEPTION = {
  id: "RC2_2_11_EXPERIENCE_COHERENCE",
  scope: "presentation, navigation, identity and wiring of existing systems",
  areas: [
    "culture gloss (existing GlossText)",
    "culture Dragon contract (existing GuideDialogue)",
    "culture → journey recall (existing culture memory)",
    "immersion bubbles + canonical cast (existing stories)",
    "sync notice policy (existing sync)",
    "league fast path (existing league)",
    "achievement presentation (existing engine)",
    "profile layout",
    "username + identifier login (profiles.username)",
    "SmartBack (existing router)",
  ],
  forbids: [
    "new lessons",
    "new teaching topics",
    "new CultureItems",
    "new StepKind",
    "new SRS",
    "new achievement/medal engine",
    "new culture engine",
    "new navigation engine",
    "new league sync",
    "new currency",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-11-experience-coherence",
} as const;

/**
 * RC2.2.13 — exceção controlada ao BETA_PEDAGOGY_FREEZE para a experiência
 * nativa do Android: navegação/densidade mobile, voz (TTS + reconhecimento)
 * pelas MESMAS funções speak()/recognizeOnce(), permissões e lembretes locais
 * derivados da ofensiva que já existe. Nenhum conteúdo, tópico, lição,
 * CultureItem, StepKind, SRS, mastery ou regra de ofensiva muda; o
 * fingerprint continua c48b008c9c1e.
 */
export const RC2_2_13_ANDROID_NATIVE_UX_EXCEPTION = {
  id: "RC2_2_13_ANDROID_NATIVE_UX",
  scope: "Android shell, voice adapters, permissions and local reminders over existing systems",
  areas: [
    "safe-area tokens (--app-safe-*)",
    "compact TopBar + TabBar Jornada/Praticar/Cultura/Missões/Mais",
    "mobile density (Culture, Immersion, Profile)",
    "native TTS adapter behind speak()",
    "native SpeechRecognizer adapter behind recognizeOnce()",
    "first-launch permission intro",
    "Settings: permissions, notifications, audio and speech",
    "local streak/comeback reminders derived from existing streak + lastStudyDate",
  ],
  forbids: [
    "new lessons",
    "new teaching topics",
    "new CultureItems",
    "new StepKind",
    "new SRS or mastery rule",
    "new streak engine",
    "tone accuracy claims",
    "push server / Firebase",
    "exact alarms",
    "location, camera or contacts permissions",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-13-native-mobile-experience",
} as const;

/**
 * RC2.2.14 — exceção controlada ao BETA_PEDAGOGY_FREEZE para foco mobile,
 * confiabilidade da lição, treino de Hànzì, recompensas de treino e
 * vibração. Tudo sobre sistemas que já existem: o contrato de avanço é
 * documentação verificável do StepRenderer atual, o teste guiado reusa os
 * dados da Lição 1 sem gravar nada, as rodadas de hànzì reusam builders,
 * quizzes, SRS, addXp, missões e PEARL_HANZI_MILESTONES, e Configurações só
 * agrupa as seções existentes. O fingerprint continua c48b008c9c1e.
 */
export const RC2_2_14_MOBILE_LEARNING_POLISH_EXCEPTION = {
  id: "RC2_2_14_MOBILE_LEARNING_POLISH",
  scope: "Mobile landing, guided try, lesson step reliability, Hànzì training focus, practice rewards, haptics and Settings grouping",
  areas: [
    "mobile/native welcome + compact language sheet",
    "guided Mandarin try (no persistence) from Lesson 1 data",
    "per-StepKind advance contract, plan lock, step identity keys, tap-through guard, stall fail-safe",
    "Hànzì hub (train now, 2-column modes, Atlas secondary) + focused rounds of 8",
    "practice round XP via existing addXp with idempotent round keys and a daily cap",
    "native haptics adapter + hapticsEnabled preference",
    "Settings index with category subpages (same sections)",
    "stage line 'Etapa X/Y', conversation cast density",
  ],
  forbids: [
    "new lessons",
    "new teaching topics",
    "new CultureItems",
    "new StepKind",
    "new SRS or mastery rule",
    "new currency or economy",
    "new reward engine",
    "new Hànzì engine",
    "new Settings system",
    "haptic on every tap, nav, scroll or audio",
    "persistent learner from the guided try",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-14-mobile-learning-polish",
} as const;

/**
 * RC2.2.17 — exceção controlada para a jornada guiada e a confiabilidade de
 * mídia nativa. Tudo é apresentação e confiabilidade sobre os motores que já
 * existem: contrato de reprodução sobre tts.ts, avanço resiliente no
 * LessonPlayer atual, capacidade de reconhecimento + autoavaliação sobre o
 * LongyuSpeechPlugin, onboarding único no ComecarPage + Teste guiado V2,
 * camada guiada (guidanceLevelForLesson) sobre o LessonPlayer e ToneContour
 * evoluído. Nenhuma lição, tópico, CultureItem, StepKind, cena ou regra de
 * SRS/domínio muda; o fingerprint continua c48b008c9c1e.
 */
export const RC2_2_17_GUIDED_LEARNING_RELIABILITY_EXCEPTION = {
  id: "RC2_2_17_GUIDED_LEARNING_RELIABILITY",
  scope: "Guided journey presentation, native media reliability (audio/speech), single onboarding, tones guided visual, Settings visibility",
  areas: [
    "playMandarinAudio playback contract (no click = heard)",
    "lesson advance resilience (side effects never block, no same-text loop, nested token tap selects)",
    "RecognitionCapability (language != permission), model download, temporary local self-compare",
    "single onboarding: Guided Try V2 → daily goal → account; placement opt-in",
    "guided presentation layer + guided ToneContour (pitch, gesture, height)",
    "danger zone in Account, Appearance System/Light/Dark, localized examples",
  ],
  forbids: [
    "new lessons",
    "new StepKind",
    "LessonEngineV2 / GuidedJourneyEngine / OnboardingV3Engine / ToneEngineV2",
    "new SRS or mastery rule",
    "mastery, XP, stars or lesson completion from the guided try",
    "tone or pronunciation score without a pitch analyzer",
    "uploading or persisting learner recordings",
    "tongue position as the cause of tone contour",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-17-guided-learning-reliability",
} as const;

/**
 * RC2.2.18 — Progressive Discovery, Guided Coachmarks & Feature Unlocks.
 * Só apresentação e navegação: a disponibilidade das áreas é derivada do
 * progresso que já existe (nada salvo como "desbloqueado"), a descoberta
 * guarda apenas visto/dispensado por conta. Nenhuma lição, tópico,
 * CultureItem, StepKind, SRS, domínio, XP ou regra de progressão muda.
 */
export const RC2_2_18_PROGRESSIVE_DISCOVERY_EXCEPTION = {
  id: "RC2_2_18_PROGRESSIVE_DISCOVERY",
  scope: "Progressive disclosure of app areas, guided coachmarks/unlock reveals, derived navigation, progressive permissions",
  areas: [
    "FEATURE_AVAILABILITY registry + PROGRESSIVE_DISCOVERY_RULES (pure, derived)",
    "GuidanceOrchestrator (one per session, never during learning, skip/now-not/skip-all)",
    "TabBar/Sidebar/Mais/Praticar derived from the registry in stable order",
    "FeatureUnavailablePage for Culture/Immersion/Phase Challenge deep links",
    "Settings › Aprendizagem › Dicas guiadas (toggle + reset)",
    "permissions: microphone in the speech step, notification offer after the first session",
  ],
  forbids: [
    "new lessons, topics, CultureItems or StepKinds",
    "saved unlock flags duplicating curriculum progress",
    "XP, achievements, Qi or mastery for unlocking, opening or reading guidance",
    "Pro bypass of pedagogical unlocks",
    "random, clock or weekday unlock rules",
    "locking account, settings, privacy, delete account, appearance, language, help or logout",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-18-progressive-discovery",
} as const;

/**
 * RC2.2.17B — exceção controlada de apresentação: a Jornada passa a usar o
 * GuidedLessonShell (tela cheia, cabeçalho simples, sem o Card antigo, uma
 * ação principal no dock, PREPARE como micro-passo visual, micro-páginas de
 * ensino). O motor é o mesmo LessonPlayer/StepRenderer. Nenhuma lição, ordem,
 * tópico, StepKind, resposta, referência de domínio, SRS ou XP muda; o
 * fingerprint continua c48b008c9c1e.
 */
export const RC2_2_17B_GUIDED_JOURNEY_PARITY_EXCEPTION = {
  id: "RC2_2_17B_GUIDED_JOURNEY_PARITY",
  scope: "Journey lesson presentation parity with the Guided Try (shell, header, viewport, action dock, presentation-only stages)",
  areas: [
    "GuidedLessonShell / GuidedLessonHeader / GuidedStepSurface / GuidedLessonActionDock",
    "STEP_PRESENTATION_CONTRACTS (layout, actionPlacement, alignment, scroll, feedback, interaction)",
    "PREPARE presentation stage and teach micro-pages (presentation only)",
    "shared guided primitives with GuidedTryPage",
    "compact error sheet in the initial flow; phase challenge exam in the same shell",
  ],
  forbids: [
    "LessonEngineV2 or a second StepRenderer",
    "new lessons, lesson ids, order, topics or StepKinds",
    "answer keys or mastery refs changed for layout",
    "presentation stage counting as step, XP, mastery, task or SRS",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-17b-guided-journey-parity",
} as const;

/**
 * RC2.2.19 — GUIDED · SIMPLE · PHYSICALLY VERIFIED. Orientação com evidência
 * de render, diagnóstico de fala/gravação, cadastro rastreado, recuperação de
 * senha por código, revisão em rodadas (mesma fila do SRS), cena de história
 * e descoberta de perfil/conta. Nenhuma lição, tópico, StepKind, resposta,
 * agenda de SRS, domínio ou XP muda; o fingerprint continua c48b008c9c1e.
 */
export const RC2_2_19_GUIDED_SIMPLE_VERIFIED_EXCEPTION = {
  id: "RC2_2_19_GUIDED_SIMPLE_VERIFIED",
  scope: "Guidance truth, device diagnostics, auth recovery/signup trace, review composition, story scene, profile/account discoverability",
  areas: [
    "guidance records AUTO_SEEDED/SHOWN/DISMISSED/SNOOZED/SKIPPED with render evidence; never relock",
    "DEV/QA audio/advance trace and speech/recording diagnostics",
    "signup stage trace; in-app password recovery by 6-digit code",
    "ReviewSessionComposer over the existing SRS queue (order, rounds, format shift only)",
    "StorySceneShell (InteractiveStoryPlayer), profile first fold, Mais › Você",
  ],
  forbids: [
    "new SRS, Lesson Engine, Story Engine or Profile Engine",
    "new lessons, lesson ids, order, topics or StepKinds",
    "SRS schedule, grades or mastery changed by the composer",
    "guidance marked seen without render evidence",
    "relocking areas a mature account already had",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-19-guided-simple-verified",
} as const;

/**
 * RC2.2.22 — exceção controlada para o CLOSED BETA CANDIDATE. Nenhuma lição,
 * id, ordem, tópico, StepKind, SRS, economia ou progresso muda; o
 * fingerprint continua c48b008c9c1e. Só prontidão formal, triagem de
 * segurança, compatibilidade por aparelho, Beta QA (relato sanitizado e
 * sessões humanas por ID) e lint de produto (complexidade/repetição).
 */
export const RC2_2_22_CLOSED_BETA_CANDIDATE_EXCEPTION = {
  id: "RC2_2_22_CLOSED_BETA_CANDIDATE",
  scope: "Closed Beta readiness state machine, security triage, device compatibility model, Beta QA issue packet and human QA sessions, resource counters, product lint (screen complexity, bad repetition, first-20 audit), TTS playback end timeout and pronunciation-contrast UI watchdog",
  areas: [
    "NOT_READY → PRE_CANDIDATE → CANDIDATE → CLOSED_BETA_READY only with typed physical/Play evidence",
    "failure classification with evidence: LONGYU_BUG vs device/service/network/configuration",
    "Beta QA issue packet and human sessions: no e-mail, OTP, token, transcript, recording; testers by ID",
    "resource counters and session popup load in /qa/device (QA builds only)",
    "playMandarinAudio NO_END_TIMEOUT after onstart; PronunciationContrastDrill unlocks Continuar if TTS sticks on Tocando…",
  ],
  forbids: [
    "Closed Beta declared ready by code",
    "new cloud feedback architecture while #273 is frozen",
    "brand-specific hacks without a capability abstraction",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-22-closed-beta-candidate",
} as const;

/**
 * RC2.2.23 — exceção controlada para CONVERGÊNCIA DE PRODUTO. Nenhuma lição,
 * id, ordem, tópico, StepKind ou SRS muda; o fingerprint continua
 * c48b008c9c1e. Muda a entrega (orientação, energia, navegação, densidade,
 * apresentação da revisão/tons/imersão). Economia: errar deixa de custar Carga
 * (CONSECUTIVE_MISTAKE_CHARGE_COST = 0, nomes exportados intactos) e prática/
 * replay deixam de cobrar — sem moeda nova.
 */
export const RC2_2_23_PRODUCT_CONVERGENCE_EXCEPTION = {
  id: "RC2_2_23_PRODUCT_CONVERGENCE",
  scope: "Guidance delivery (anchor fallback, reason codes, QA panel), energy soft landing, earned tab bar and More 'You' group, review round cap and short feedback, Hànzì size floors per role, tone microlesson, immersion reaction",
  areas: [
    "guidance never dropped silently: unanchored bottom card + 13 reason codes; AUTO_SEEDED stays pending",
    "errors cost only Vidas; only NEW progression consumes Cargas; zero Cargas keeps review/practice/culture/replay open",
    "tabs earned progressively (new account: Jornada + Mais; max 3 early)",
    "review: max 2 of the same target per round of 5–8 (3 only as remediation), same SRS",
    "tone microlesson SEE→HEAR→IMITATE→DISCRIMINATE→RECOGNIZE→USE WORD→USE CONTEXT, one concept per screen, no pitch score",
  ],
  forbids: [
    "new lessons, lesson ids, order, topics or StepKinds",
    "new SRS, new StoryEngine or new currency",
    "Pro as the only path out of zero Cargas",
    "pitch explained through tongue/mouth position",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-23-product-convergence",
} as const;

/**
 * RC2.2.24 — exceção controlada para PARIDADE ANDROID. Nenhuma lição, id,
 * ordem, tópico, StepKind, SRS ou economia muda; fingerprint c48b008c9c1e.
 * Muda runtime/navegação/apresentação: TTS correlacionado por requestId,
 * transição de conversa sem áudio, prova de render da etapa, âncora de volta
 * à Jornada, handoff entre abas, focus mode, Tone Trace e conta única.
 */
export const RC2_2_24_ANDROID_LEARNING_PARITY_EXCEPTION = {
  id: "RC2_2_24_ANDROID_LEARNING_PARITY",
  scope: "Native TTS event contract (requestId/utteranceId), Guided Try listen CTA, conversation transition truth (V1/V2), step render truth, JourneyReturnAnchor, cross-tab handoff, focus activity mode, Tone Trainer focus round, Tone Trace, single-account UI",
  areas: [
    "CTA releases only on STARTED/DONE of the SAME requestId; DONE without START = TTS_START_EVENT_MISSED",
    "goTo never calls TTS; audio speaks after the next node is in the DOM; 800 ms DOM stall surfaced",
    "advanced = next step rendered in the DOM, not setIdx",
    "return to the Journey by semantic anchor (phase/unit/lesson/node), never top by default",
    "Tone Trainer: hub ≠ round; focus round without stats/pack list; Tone Trace with Pointer Events, no pitch claims",
    "one Longyu account: no local profiles in production UI",
  ],
  forbids: [
    "new lessons, lesson ids, order, topics or StepKinds",
    "audio controlling node/step navigation",
    "pitch scoring without measurement",
    "local identity as production UX",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-24-android-learning-parity",
} as const;

/**
 * RC2.2.25 — exceção controlada para FECHAMENTO DA EXPERIÊNCIA DE PRODUTO.
 * Nenhuma lição, id, ordem, tópico, StepKind, SRS, economia ou progresso
 * muda; o fingerprint continua c48b008c9c1e. Só apresentação: hub ≠
 * atividade, conta/sair, ordem do Mais, CTA e cópia de fala.
 */
export const RC2_2_25_PRODUCT_EXPERIENCE_CLOSURE_EXCEPTION = {
  id: "RC2_2_25_PRODUCT_EXPERIENCE_CLOSURE",
  scope: "Guided experience gold standard, surface inventory, hub vs activity focus (Review, Pinyin Lab, Speaking, Immersion), account first fold and logout discoverability, More group order, CTA without rewards, speech copy without engine talk, Tone Trace memory stage, culture task handoff",
  areas: [
    "every StepKind classified GUIDED_NATIVE or GUIDED_COMPATIBLE; LEGACY_PRESENTATION = 0",
    "activities run without TopBar/TabBar/counters/streak; hubs show only [Começar]",
    "Review round is short and guided, without analytics; reward stays in the result",
    "Sair da conta visible without scroll in Conta and as a full-width row in Mais",
    "More order VOCÊ · ESTUDAR · SOCIAL · PROGRESSO · SISTEMA",
  ],
  forbids: [
    "new engines or a second lesson player",
    "new lessons, lesson ids, order, topics or StepKinds",
    "owner acceptance or physical PASS generated automatically",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-25-product-experience-closure",
} as const;

/**
 * RC2.2.27 — exceção controlada para a CAUSA REAL do TTS Android. Nenhuma
 * lição, id, ordem, tópico, StepKind, SRS, economia ou progresso muda; o
 * fingerprint continua c48b008c9c1e. Só o plugin LongyuSpeech existente
 * (registro de requests, isSpeaking, cancelSpeak), a sessão única de fala
 * mandarim, o painel forense de QA e a apresentação da conclusão.
 */
export const RC2_2_27_ANDROID_TTS_ROOT_CAUSE_EXCEPTION = {
  id: "RC2_2_27_ANDROID_TTS_ROOT_CAUSE",
  scope: "Native TTS request lifecycle registry, isSpeaking probe, conditional stop, superseded requests, own-request cancellation, single Mandarin speech session (manual and autoplay), Guided Try audio deadline recovery, ANDROID TTS FORENSICS QA panel, build identity verdict, sequential completion presentation",
  areas: [
    "every TTS request has requestId/utteranceId/state/timestamps; a newer request supersedes, never overwrites",
    "start confirmed by onStart, isSpeaking of the same request, DONE or direct ACK",
    "autoplay and manual playback share requestMandarinSpeech; a bubble cancels only its own request",
    "QA logs LongyuTTS never carry spoken text",
    "completion reveal is presentation only: no new reward, XP, Qi, streak or medal is granted",
  ],
  forbids: [
    "a second TTS engine or a second lesson player",
    "new lessons, lesson ids, order, topics or StepKinds",
    "physical PASS or owner acceptance generated automatically",
    "spoken text, voice recording, OTP, e-mail, password or token logged",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-27-android-tts-root-cause",
} as const;

/**
 * RC2.2.28 — áudio canônico (asset-first), Media3 player, reducer puro de
 * conversa, provenance dual-SHA e fechamento dos deadlocks de Continuar.
 * Nenhuma lição, id, ordem, tópico, StepKind, SRS, economia ou progresso muda;
 * o fingerprint continua c48b008c9c1e. TTS vira fallback — não infraestrutura.
 */
export const RC2_2_28_DETERMINISTIC_AUDIO_EXCEPTION = {
  id: "RC2_2_28_DETERMINISTIC_AUDIO",
  scope: "Canonical audio manifest + core pack, Media3/ExoPlayer LongyuMedia plugin, HTMLAudioElement web player, TTS fallback-only for fixed content, Guided Try core asset path, pure conversationReducer, audio-after-DOM, audio gate DEGRADED, dual SHA build provenance, completion unit/phase/unlock deltas, expanded no-scroll, TTS-independence gate",
  areas: [
    "fixed learning audio has audioId; core pack ships in APK; extended may be CDN/cache",
    "playCanonicalAudio({ audioId, uri, requestId }) with IDLE/PREPARING/READY/PLAYING/ENDED/ERROR",
    "conversationReducer is pure; audio is a side-effect after DOM_VISIBLE; CONTINUE always commits",
    "Guided Try listen uses core asset; TTS disabled still advances; CTA enables on HEARD or DEGRADED",
    "sourceHeadSha and workflowSha are independent; merge SHA is not stale APK",
  ],
  forbids: [
    "new lessons, lesson ids, order, topics or StepKinds",
    "physical PASS or owner acceptance generated automatically",
    "making device TTS a hard dependency for Guided Try / authored conversations / Tone / Review",
    "spoken text, voice recording, OTP, e-mail, password or token logged",
    "enabling Android billing or Production Play in this wave",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-28-deterministic-audio",
} as const;

/**
 * RC2.2.29 — launch convergence: full canonical audio, zero learner debug UI,
 * conversation transition lock, owner-request register, guidance/tone/copy
 * closures. Fingerprint remains c48b008c9c1e. No new engines.
 */
export const RC2_2_29_LAUNCH_CONVERGENCE_EXCEPTION = {
  id: "RC2_2_29_LAUNCH_CONVERGENCE",
  scope: "Full FIXED_CANONICAL audio coverage + quality gate, learner UI without technical debug, conversation pointer/click/lock/DOM failsafe (Continue stall P1), owner-request closure OR01–OR60, Tone Trace first-use guidance, local-profile copy cleanup, completion deltas preserved, stacked launch convergence gate",
  areas: [
    "FIXED_CONTENT_MISSING_AUDIO = 0 (dynamic-only classified separately)",
    "Guided Try and pedagogical surfaces show no TTS/plugin/requestId diagnostics",
    "conversation APK traces pointer→click→lock→commit→DOM→audio; forceRelease on DOM; failsafe same transitionId",
    "owner-request-closure.json tracks OR01–OR60 until OWNER_ACCEPTED (CODE_READY ≠ DONE)",
    "tone_trace_first_use_v1, tone_confusion_2_3_v1, profile_entry_v1 registered in guidance",
  ],
  forbids: [
    "new LessonEngine, SRS, StoryEngine or ProfileEngine",
    "touching #273 / changing package / enabling Android billing or Production Play",
    "physical PASS or owner acceptance generated automatically",
    "marking owner-rejected or critical P1 items DONE without APK_PASS/OWNER_ACCEPTED",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-29-launch-convergence",
} as const;

/**
 * RC2.2.30 — CLOSED BETA ENTRY & REAL LEARNER VALIDATION.
 * No new engines. Prove APK / Play Internal / human learning. Fingerprint c48b008c9c1e.
 */
export const RC2_2_30_CLOSED_BETA_ENTRY_EXCEPTION = {
  id: "RC2_2_30_CLOSED_BETA_ENTRY",
  scope: "Closed Beta status machine (PREPARING→CLOSED_ACTIVE), Play Internal + N→N+1 truth, physical matrix honesty, OR01–OR60 carry-forward without reset, human-learning reports, release P1 burn-down — no architecture rebuild",
  areas: [
    "CLOSED_BETA_ENTRY=false while release P1 open; CODE_READY≠APK_PASS; Web≠Physical",
    "Play install ≠ sideload; debug APK ≠ Internal; N→N+1 must preserve progress",
    "Conversation 20/20 + Guided Try 10/10 + Signup/OTP/Self Compare physical required before READY_FOR_CLOSED",
    "owner-request-closure imported from RC2.2.29 without state reset",
    "human-learning report separates OBSERVED / INFERRED / NOT_TESTED",
  ],
  forbids: [
    "new LessonEngine, SRS, StoryEngine or ProfileEngine",
    "touching #273 / changing package / enabling Android billing or Production Play",
    "auto physical PASS / OWNER_ACCEPTED / Closed Active without cohort",
    "accepting Conversation 19/20 or Guided Try 9/10 as PASS",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-30-closed-beta-entry",
} as const;

/**
 * RC2.2.31 — ANDROID AUDIO ROOT-CAUSE + CONVERSATION DEADLOCK.
 * Stacked on #303 tip a70bff9d. No new engines/curriculum. Fingerprint c48b008c9c1e.
 */
export const RC2_2_31_ANDROID_RUNTIME_CLOSURE_EXCEPTION = {
  id: "RC2_2_31_ANDROID_RUNTIME_CLOSURE",
  scope: "Request-aware Media3 cancel, mediaId-correlated callbacks, AssetManager preflight, CANONICAL_MEDIA owner, conversation single-source runtime.nodeId, NativeSafeAction, audio-quality-v2 — no new gamification/curriculum/Pro",
  areas: [
    "cancel(A) must not kill B; MediaItem.mediaId=requestId; stale callbacks ignored",
    "androidAssetPath + AssetManager.openFd before ExoPlayer; asset:/// not public/ guess",
    "Guided Try / Conversation physical FAILS from #303 recorded — Closed Beta NO-GO",
    "conversation V1+V2 NativeSafeAction; no dual nodeId; audio after DOM only",
  ],
  forbids: [
    "new LessonEngine, SRS, StoryEngine, ProfileEngine or reward engine",
    "touching #273 / changing package / enabling Android billing or Production Play",
    "declaring CLOSED_BETA while Guided Try or Conversation still FAIL",
    "treating file-exists or exo.play() as audible without position proof",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-31-android-runtime-closure",
} as const;

/**
 * RC2.2.31B — FULL ANDROID RUNTIME CLOSURE on #304 tip 8a063323.
 * Full Mandarin speech corpus, session-scoped listeners, promise terminals,
 * conversation all-actions. Fingerprint c48b008c9c1e. Closed Beta NO-GO until APK.
 */
export const RC2_2_31B_ANDROID_RUNTIME_FINAL_EXCEPTION = {
  id: "RC2_2_31B_ANDROID_RUNTIME_FINAL",
  scope: "Full fixed Mandarin speech corpus, AQV3 silencedetect, session-scoped Media3 listeners, SUPERSEDED/CANCELLED promise terminals, ConversationActionBoundary, real input traces — no new gamification/curriculum/Pro",
  areas: [
    "0 extended-tone placeholders for Mandarin phrases; 657 speech assets + provenance",
    "session-scoped capturedRequestId/generation; stale callback never becomes B",
    "every playCanonicalAudio Promise settles (ENDED|ERROR|CANCELLED|SUPERSEDED)",
    "conversation Continue/Reveal/Repair/stall-retry via ConversationActionBoundary",
  ],
  forbids: [
    "new LessonEngine, SRS, StoryEngine, ProfileEngine or reward engine",
    "touching #273 / changing package / enabling Android billing or Production Play",
    "declaring CLOSED_BETA or APK PASS without owner physical acceptance",
    "Chromium-only E2E counting as Android WebView proof",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-31b-android-runtime-final",
} as const;

/**
 * RC2.2.31C — ANDROID WEBVIEW GESTURE ROOT CAUSE on #305 tip 96d6dc7d.
 * Separate Web Speech from native TTS; Direct MediaPlayer; conversation
 * independent of audio helpers. Fingerprint c48b008c9c1e. Closed Beta NO-GO.
 */
export const RC2_2_31C_ANDROID_WEBVIEW_GESTURE_EXCEPTION = {
  id: "RC2_2_31C_ANDROID_WEBVIEW_GESTURE_ROOT_CAUSE",
  scope: "webSpeechSynthesis guard, noteUserGesture never-throw, gesture out of conversation critical path, Direct Asset MediaPlayer, honest playback proof, Guided Try asset-first recovery — no new gamification/curriculum/Pro",
  areas: [
    "Native TTS availability != Web Speech API availability",
    "Conversation advance/goTo never calls noteUserGesture",
    "playCanonicalAudio always reached after best-effort gesture",
    "Direct MediaPlayer primary for packaged fixed speech; Media3 fallback",
  ],
  forbids: [
    "new LessonEngine, SRS, StoryEngine, ProfileEngine or reward engine",
    "touching #273 / changing package / enabling Android billing or Production Play",
    "declaring CLOSED_BETA or APK PASS without owner physical acceptance",
    "READY/ENDED laundering as audible HEARD without position/isPlaying proof",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-31c-android-runtime-root-cause",
} as const;

export const RC2_2_31D_APK_RUNTIME_PROOF_EXCEPTION = {
  id: "RC2_2_31D_APK_RUNTIME_PROOF",
  scope: "real emulator WebView instrumented tests, async Direct→Media3 failover, NativeSafeAction safeObserve, state-first conversation, audio focus, pedagogical fail-open — no new gamification/curriculum/Pro",
  areas: [
    "ANDROID_BUILD_PASS separated from ANDROID_EMULATOR_RUNTIME_PASS",
    "observer/trace/haptic never block pedagogical CTAs",
    "Direct async failure failover to Media3 same requestId before terminal ERROR",
    "Guided Try / Conversation fail-open when audio degraded",
  ],
  forbids: [
    "new LessonEngine, SRS, StoryEngine, ProfileEngine or reward engine",
    "touching #273 / changing package / enabling Android billing or Production Play",
    "declaring CLOSED_BETA or APK PASS without owner physical acceptance",
    "counting Node gate or assembleDebug as emulator runtime PASS",
    "new lessons, lesson ids, order, topics or StepKinds",
  ],
  fingerprint: "a91d31d0c0de",
  gate: "gate:rc2-2-31d-apk-runtime-proof",
} as const;

/**
 * RC2.3.0 — Pedagogy V6 content exception (intentional fingerprint advance).
 *
 * Exceção estreita sob BETA_PEDAGOGY_FREEZE: o motor pedagógico muda
 * (Descoberta, budgets 7–15, anti-repetição perceptiva, piloto visual/humano)
 * e duas CURRICULUM_SOURCES recebem anotações/piloto — sem lição nova, sem
 * CultureItem novo, sem StepKind novo, sem migração das 134.
 */
export const RC2_3_2_HUMAN_EVERYDAY_CONTENT_EXCEPTION = {
  id: "RC2_3_2_HUMAN_EVERYDAY",
  scope: "everydayIntent metadata on LessonStep + Everyday Mandarin scenarios/apply (no new lessons/StepKinds)",
  previousFingerprint: "c3861b5fb65f",
  fingerprint: "e566a250c5a6",
  gate: "gate:rc2-3-2-human-everyday",
} as const;

/**
 * RC2.3.3 — Culture Deep Journey (stories, moment/deep modes, editorial gates).
 * No new CultureItems / lessons / StepKinds. Fingerprint unchanged from RC2.3.2.
 */
export const RC2_3_3_CULTURE_DEEP_CONTENT_EXCEPTION = {
  id: "RC2_3_3_CULTURE_DEEP",
  scope: "CultureDeepContract + Moment/Deep modes + flagship story depth + editorial gates (no new CultureItems/lessons/StepKinds)",
  allows: [
    "CultureMission story/decision/reaction densification for existing 30 items",
    "CultureVisualId registry + outcome kinds",
    "Journey Culture Moment query mode=journey",
    "EverydayIntent bridges to existing CultureItems",
    "Device QA Culture Deep panel + audit reports",
  ],
  forbids: [
    "new CultureItems / culture lesson ids beyond the frozen 30",
    "new Mandarin lessons / StepKinds",
    "touching #273 / Android billing",
    "declaring OWNER_CULTURE_ACCEPTANCE or APK_PASS without physical proof",
  ],
  previousFingerprint: "e566a250c5a6",
  fingerprint: "e566a250c5a6",
  gate: "gate:rc2-3-3-culture-deep",
} as const;

/**
 * RC2.3.4 — Hànzì Progressive Writing (trace / memory / form evidence).
 * No new lessons / StepKinds. Fingerprint unchanged. Builder SVG ≠ handwriting truth.
 */
export const RC2_3_4_HANZI_WRITING_CONTENT_EXCEPTION = {
  id: "RC2_3_4_HANZI_PROGRESSIVE_WRITING",
  scope: "HanziLearningStage + HandwritingReference + local canvas scoring + form evidence (no new lessons/StepKinds)",
  allows: [
    "Verified authorial handwriting references (subset)",
    "Trace / memory / draw_missing_stroke practice modes",
    "LessonStep writing metadata annotations via applyHanziProgressiveWritingToPlan",
    "Local form evidence channels separate from meaning",
    "Device QA Hànzì Writing panel + audit/coverage reports",
  ],
  forbids: [
    "grading handwriting from HanziBuilder SVG / font outlines",
    "new Mandarin lessons / StepKinds",
    "OCR / remote handwriting APIs / cloud sync",
    "touching #273 / Android billing",
    "declaring OWNER_HANZI_ACCEPTANCE or APK_PASS without physical proof",
    "parallel second Hànzì system replacing builders",
  ],
  previousFingerprint: "e566a250c5a6",
  fingerprint: "e566a250c5a6",
  gate: "gate:rc2-3-4-hanzi-writing",
} as const;

/** PR #314: reserve all pass bonuses and mandatory capability closure steps. */
export const RC2_3_4_CI_BUDGET_CORRECTION = {
  id: "RC2_3_4_CI_BUDGET_CORRECTION",
  scope: "Existing mastery pass selection budget only; no lesson, topic, vocabulary or StepKind additions",
  previousFingerprint: "e566a250c5a6",
  fingerprint: "5a64821d0b7d",
  gate: "validate:topic-mastery-depth",
} as const;

export const RC2_3_1_VISUAL_FIRST_CONTENT_EXCEPTION = {
  id: "RC2_3_1_VISUAL_FIRST",
  scope: "visualConceptId on LessonStep + Visual First curriculum resolver/scenes (no new lessons/StepKinds)",
  previousFingerprint: "99cbc002710c",
  fingerprint: "c3861b5fb65f",
  gate: "gate:rc2-3-1-visual-first",
} as const;

export const RC2_3_0_PEDAGOGY_V6_CONTENT_EXCEPTION = {
  id: "RC2_3_0_PEDAGOGY_V6",
  scope: "Discovery stage + progressive mastery budgets + perceptual variety on early Journey pilot",
  allows: [
    "LessonStep pedagogyRole / discovery annotations",
    "foundation Pass-1 human-context copy (existing lesson)",
    "mastery pass budget policy (runtime planner)",
    "pedagogyV6 engine modules + LessonPlayer wire",
  ],
  forbids: [
    "new lessons / lesson ids / topic order",
    "new CultureItems / StepKinds",
    "mass migration of 134 lessons",
    "touching #273 / Android billing",
    "declaring OWNER_PEDAGOGICAL_ACCEPTANCE without physical proof",
  ],
  previousFingerprint: "c48b008c9c1e",
  fingerprint: "99cbc002710c",
  gate: "gate:rc2-3-0-pedagogy-v6",
} as const;

/**
 * RC2.2.21 — exceção controlada para ESTABILIDADE MOBILE NATIVA. Nenhuma
 * lição, id, ordem, tópico, StepKind, SRS, economia ou progresso muda; o
 * fingerprint continua c48b008c9c1e. Só o plugin LongyuSpeech existente, o
 * árbitro de áudio, o diagnóstico de QA e a navegação (VOLTAR/modais).
 */
export const RC2_2_21_MOBILE_NATIVE_STABILITY_EXCEPTION = {
  id: "RC2_2_21_MOBILE_NATIVE_STABILITY",
  scope: "Native self-voice playback contract, speech recognizer strategy and diagnostics, TTS audio attributes, audio arbiter, lifecycle pause/stop, Android Back priority, modal stack, tap-through, mobile diagnostic console",
  areas: [
    "LongyuSpeech practice playback: AudioAttributes media/speech, transient focus, PLAYING only after isPlaying, stable error codes",
    "pause interrupts, stop/destroy delete the temporary practice file",
    "recognizer on-device only with zh-CN installed; RMS/recognizer diagnostics; no infinite retry",
    "one audio owner at a time (IDLE/TTS/SELF_PLAYBACK/RECORDING/RECOGNITION)",
    "Back: keyboard → modal → guidance → subview → route → exit at root; one modal closes per Back",
    "tech event buffer (150, memory only, QA builds) and sanitized diagnostic JSON",
  ],
  forbids: [
    "physical PASS generated automatically",
    "a second plugin or a second audio engine",
    "new lessons, lesson ids, order, topics or StepKinds",
    "voice recording, transcript, OTP, e-mail, password or token stored, logged or uploaded",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-21-mobile-native-stability",
} as const;

/**
 * RC2.2.20 — Physical Beta Readiness. Superfície de QA físico (/qa/device, só
 * DEV/Preview/QA Candidate/`VITE_DEVICE_QA`), trilhas no APK de diagnóstico,
 * contratos de update N→N+1, recuo de etapa travada, categorias de falha de
 * fala/cadastro, espaçamento semântico da Revisão e Pronunciation Core BR no
 * Pinyin Lab (fora das fontes congeladas). Nenhuma lição, ordem, tópico,
 * StepKind, SRS, economia ou progresso muda; o fingerprint continua c48b008c9c1e.
 */
export const RC2_2_20_PHYSICAL_BETA_READINESS_EXCEPTION = {
  id: "RC2_2_20_PHYSICAL_BETA_READINESS",
  scope: "Physical QA surface and evidence contract, device diagnostics, upgrade snapshot, stall fallback, speech/signup failure categories, review spacing, Pronunciation Core BR (Pinyin Lab)",
  areas: [
    "/qa/device: 12 physical tests, PASS only with testedAt/buildSha/versionCode/deviceClass/evidenceType, never on web/emulator",
    "lesson/audio/speech traces also in device-QA builds (never plain production_beta)",
    "upgrade N→N+1 snapshot compare (counts only, no PII)",
    "stalled step: retry / reload step / report (QA); never auto-skip",
    "ReviewSessionComposer MIN_TARGET_GAP and surface target (order only)",
    "Pronunciation Core BR contrasts in the Pinyin Lab",
  ],
  forbids: [
    "physical PASS generated automatically",
    "new SRS, Lesson Engine, Story Engine, Guidance Engine, Profile Engine or Auth Engine",
    "new lessons, lesson ids, order, topics or StepKinds",
    "SRS schedule, grades or mastery changed by the composer",
    "OTP, e-mail, password, token or voice recording stored or logged",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-20-physical-beta-readiness",
} as const;

/**
 * RC2.2.14B — exceção controlada para idioma e curso. A interface passa a
 * seguir o idioma do sistema (com escolha manual soberana) e o curso vira
 * CourseDirection explícito (pt-zh, en-zh; registro pronto para es/fr/de).
 * O instructionLocale é derivado do curso; o conteúdo é o mesmo (canônico +
 * overlays). Nenhuma lição, tópico, CultureItem, StepKind, SRS ou progresso
 * muda; o fingerprint continua c48b008c9c1e.
 */
export const RC2_2_14B_LOCALE_COURSE_DIRECTION_EXCEPTION = {
  id: "RC2_2_14B_LOCALE_COURSE_DIRECTION",
  scope: "System interface locale, explicit CourseDirection, course picker, onboarding/settings language UX",
  areas: [
    "resolvePreferredInterfaceLocale (manual > system > fallback EN)",
    "COURSE_DIRECTIONS registry (pt-zh, en-zh; es/fr/de registered, unavailable)",
    "course picker before the Guided Try and onboarding",
    "per-account courseDirection + profiles.instruction_locale (existing column)",
    "Settings: Idioma do aplicativo + Curso rows",
  ],
  forbids: [
    "new lessons or duplicated curriculum per language",
    "separate learner profile per course",
    "progress, SRS, XP or mastery change on course switch",
    "course inferred from the system language",
    "language dropdown on the Android landing",
    "Supabase migration for course direction",
  ],
  fingerprint: "c48b008c9c1e",
  gate: "gate:rc2-2-14b-locale-course-direction",
} as const;
