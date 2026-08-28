import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { TONE_TRAINER_PACKS } from "../src/data/toneTrainer";

// Deve acompanhar `version` do persist em src/lib/store.ts: seeds com versão
// antiga passam pelas migrações (a v14, por exemplo, remove o isPremium de
// preview) e deixam de representar o estado que o teste quer simular.
const STORE_VERSION = 20;

type SeedState = Record<string, unknown>;

function buildStorePayload(state: SeedState) {
  return JSON.stringify({ state, version: STORE_VERSION });
}

/** V4.6 — temas já em completedLessons atrás do ponteiro viram 4/4 (não relocka). */
function topicPathMasteryById(
  completedLessons: string[],
  override?: { lessonId: string; level: number }
): Record<string, { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }> {
  const acquired = new Set(completedLessons);
  const pointer = ALL_LESSONS.findIndex((lesson) => !acquired.has(lesson.id));
  const last = pointer < 0 ? ALL_LESSONS.length : pointer;
  const now = Date.now();
  const byId: Record<string, { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }> = {};
  for (let index = 0; index < last; index += 1) {
    const lesson = ALL_LESSONS[index];
    if (!lesson || !acquired.has(lesson.id)) continue;
    if (lesson.isReview || lesson.reviewMasteryMode) continue;
    byId[lesson.id] = { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now };
  }
  if (override) {
    const lastPass = Math.max(1, Math.min(4, override.level || 1));
    byId[override.lessonId] = {
      level: override.level,
      passCount: override.level,
      lastPass,
      recoveryPending: false,
      updatedAt: now,
    };
  }
  return byId;
}

function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Nos e2e comuns, marca decisão de telemetria para o modal não bloquear fluxos. */
export async function seedTelemetryDeclined(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem("longyu:telemetry-consent") === null) {
      localStorage.setItem("longyu:telemetry-consent", "0");
    }
  });
}

/** Interface locale for V4.8.0. Not part of the pedagogical Zustand persist. */
export async function seedInterfaceLocale(page: Page, locale: "pt-BR" | "en") {
  await page.addInitScript((value) => {
    localStorage.setItem("longyu:interface-locale", value);
  }, locale);
}

/** Pedagogy e2e: marca sessão local seeded. Production ignora este marker. */
export async function allowE2ELocalSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("longyu:e2e-allow-local", "1");
  });
}

/** TEST-025: sessao cloud simulada com onboarding_completed=false. */
export async function seedPendingCloudOnboarding(page: Page) {
  await seedTelemetryDeclined(page);
  await page.addInitScript(() => {
    localStorage.setItem("longyu:e2e-session-audience", "cloud_pending_onboarding");
  });
}

/** TEST-026: finalize sem draft no servidor. */
export async function seedMissingDraftFinalize(page: Page) {
  await seedPendingCloudOnboarding(page);
  await page.addInitScript(() => {
    localStorage.setItem("longyu:e2e-finalize-code", "missing_draft");
  });
}

export async function dismissBlockingOverlays(page: Page) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const privacy = page.getByRole("dialog", { name: /Ajude a melhorar o Longyu|Help improve Longyu/i });
    if (await privacy.isVisible().catch(() => false)) {
      const decline = page.getByRole("button", { name: /Agora não|Not now/i });
      if (await decline.isVisible().catch(() => false)) {
        await decline.click({ timeout: 2_000 }).catch(() => undefined);
      }
      await page.waitForTimeout(120);
      continue;
    }
    const achievement = page.getByRole("dialog", { name: /medalha|conquista|medal|achievement/i });
    if (await achievement.isVisible().catch(() => false)) {
      const continueBtn = achievement.getByRole("button", { name: /Continuar|Fechar|Ok|Continue|Close/i }).first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click({ timeout: 2_000, force: true }).catch(() => undefined);
      } else {
        await page.keyboard.press("Escape").catch(() => undefined);
      }
      await page.waitForTimeout(120);
      continue;
    }
    const streak = page.getByRole("dialog", { name: /Ofensiva atualizada|Streak updated/i });
    if (await streak.isVisible().catch(() => false)) {
      const continueBtn = streak.getByRole("button", { name: /^(Continuar|Continue)$/i }).first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click({ timeout: 2_000, force: true }).catch(() => undefined);
      } else {
        await page.keyboard.press("Escape").catch(() => undefined);
      }
      await page.waitForTimeout(150);
      continue;
    }
    // Fôlego esgotado: o CTA primário vai para /pro. Voltar para a tarefa.
    const folegoBack = page.getByRole("button", { name: /Voltar e tentar acertar/i });
    if (await folegoBack.isVisible().catch(() => false)) {
      await folegoBack.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(120);
      continue;
    }
    // Qualquer outro dialog modal que bloqueie cliques (WebKit é mais sensível).
    const otherDialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    if (await otherDialog.isVisible().catch(() => false)) {
      const dismiss = otherDialog.getByRole("button", { name: /Continuar|Fechar|Ok|Depois|Entendi|Continue|Close|Later|Not now|Agora não/i }).first();
      if (await dismiss.isVisible().catch(() => false)) {
        await dismiss.click({ timeout: 2_000 }).catch(() => undefined);
      } else {
        await page.keyboard.press("Escape").catch(() => undefined);
      }
      await page.waitForTimeout(120);
      continue;
    }
    return;
  }
}

/**
 * Aguarda o fim do Suspense de rotas lazy (code-splitting).
 * Sem isso, testes podem inspecionar o fallback "Carregando…" e falhar.
 */
export async function waitForLazyPage(page: Page) {
  const fallback = page.locator('[aria-label="Carregando página"], [aria-label="Loading page"]');
  const appeared = await fallback
    .first()
    .waitFor({ state: "visible", timeout: 800 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await fallback.first().waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
  }
}

/**
 * Firefox costuma mostrar "Ouça e imite" (你好) antes do listen_select.
 * Avança Entendi / Não posso falar / Continuar até `[data-option-index]`.
 */
export async function advanceToChoiceOptions(page: Page, timeoutMs = 15_000) {
  const options = page.locator("[data-option-index]");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await options.first().isVisible().catch(() => false)) return;
    const skipSpeak = page.getByRole("button", { name: /Não posso falar agora/i });
    const continueBtn = page.getByRole("button", { name: /^Continuar$/i });
    const entendi = page.getByRole("button", { name: /^Entendi$/i });
    if (await skipSpeak.isVisible().catch(() => false)) {
      await skipSpeak.click().catch(() => undefined);
    } else if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click().catch(() => undefined);
    } else if (await entendi.isVisible().catch(() => false)) {
      await entendi.click().catch(() => undefined);
    }
    await page.waitForTimeout(180);
  }
  await expect(options.first()).toBeVisible({ timeout: 5_000 });
}

/** Clique resiliente quando overlays/re-renders desanexam o botão. */
export async function clickStable(page: Page, name: RegExp, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    await dismissBlockingOverlays(page);
    const button = page.getByRole("button", { name });
    await button.first().waitFor({ state: "visible", timeout: 8_000 });
    try {
      await button.first().click({ timeout: 4_000 });
      return;
    } catch {
      await page.waitForTimeout(200);
    }
  }
  await page.getByRole("button", { name }).first().click({ force: true });
}

export async function seedOnboardedSession(page: Page, completedLessons: string[] = ["l1"]) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
    // Testes que nÃ£o exercitam medalhas nÃ£o devem receber um modal assÃ­ncrono
    // depois que o helper de overlays jÃ¡ terminou. MantÃ©m os desbloqueios em
    // espera e elimina interferÃªncia entre specs executadas em paralelo.
    holdAchievementModals: true,
    lessonMasteryById: topicPathMasteryById(completedLessons),
  }));
}

/** Sessão onboarded com estado extra (missões, baús, Pro). */
export async function seedMissionsSession(page: Page, extra: SeedState = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: ["l1"],
    holdAchievementModals: true,
    ...extra,
  }));
}

/** Conclui todas as lições fundamentais até (e incluindo) `throughLessonId`. */
export async function seedFoundationThrough(page: Page, throughLessonId: string) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const foundation = [
    "p1-o-que-e-mandarim",
    "p1-o-que-e-pinyin",
    "p1-o-que-e-tom",
    "p1-o-que-e-hanzi",
    "p1-primeiros-hanzi",
    "p1-engine-2-lab",
  ];
  const index = foundation.indexOf(throughLessonId);
  const completedLessons = index >= 0 ? foundation.slice(0, index + 1) : foundation;
  const lessonStarsById = Object.fromEntries(completedLessons.map((id) => [id, 3]));
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
    lessonStarsById,
    lessonMasteryById: topicPathMasteryById(completedLessons),
    achievementsUnlocked: { "jornada-primeira-licao": Date.now() },
  }));
}

function buildCompletedToneTrainer() {
  const now = Date.now();
  return Object.fromEntries(
    TONE_TRAINER_PACKS.map((pack) => [
      pack.id,
      {
        packId: pack.id,
        attempts: 1,
        bestScore: 12,
        bestTotal: 12,
        completed: true,
        lastAttemptAt: now,
        totalRounds: 12,
        totalCorrect: 12,
        errorsByTone: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    ])
  );
}

/** Fundação completa + pré-requisitos da jornada para abrir o player de `lessonId`. */
export async function seedLessonPlayerReady(
  page: Page,
  lessonId: string,
  options: { masteryLevel?: number; isPremium?: boolean; folego?: number } = {}
) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const foundation = [
    "p1-o-que-e-mandarim",
    "p1-o-que-e-pinyin",
    "p1-o-que-e-tom",
    "p1-o-que-e-hanzi",
    "p1-primeiros-hanzi",
    "p1-engine-2-lab",
  ];
  const targetIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const journeyCompleted =
    targetIndex > 0 ? ALL_LESSONS.slice(0, targetIndex).map((lesson) => lesson.id) : [];
  const completedLessons = [...foundation, ...journeyCompleted];
  const lessonStarsById = Object.fromEntries(completedLessons.map((id) => [id, 3]));
  const lessonMasteryById = topicPathMasteryById(
    completedLessons,
    typeof options.masteryLevel === "number" ? { lessonId, level: options.masteryLevel } : undefined
  );
  const isPremium = options.isPremium ?? false;
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
    lessonStarsById,
    lessonMasteryById,
    isPremium,
    serverIsPro: isPremium,
    folego: options.folego ?? (isPremium ? 20 : undefined),
    holdAchievementModals: true,
    toneTrainer: buildCompletedToneTrainer(),
    achievementsUnlocked: { "jornada-primeira-licao": Date.now() },
  }));
}

export async function seedFreshJourneySession(
  page: Page,
  options: { isPremium?: boolean; points?: number; holdAchievementModals?: boolean } = {}
) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript((payload: string) => {
    // Só na primeira navegação do contexto. Regravar apagaria o progresso
    // da L1 quando o teste abre a L2 na mesma conta nova.
    if (!localStorage.getItem("longyu-v1")) {
      localStorage.setItem("longyu-v1", payload);
    }
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: [],
    isPremium: options.isPremium ?? false,
    serverIsPro: options.isPremium ?? false,
    points: options.points ?? 20,
    folego: options.isPremium ? 20 : undefined,
    holdAchievementModals: options.holdAchievementModals ?? false,
  }));
}

/** V4.7.4 — Jornada num nível de mastery do primeiro tema, sem jogar as passes. */
export async function seedTopicMasterySession(
  page: Page,
  level: number,
  extra: SeedState = {}
) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const first = ALL_LESSONS[0]?.id ?? "p1-o-que-e-mandarim";
  const clamped = Math.max(0, Math.min(4, level));
  const now = Date.now();
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: clamped > 0 ? [first] : [],
    lessonStarsById: clamped > 0 ? { [first]: 3 } : {},
    lessonMasteryById:
      clamped > 0
        ? {
            [first]: {
              level: clamped,
              passCount: clamped,
              lastPass: clamped,
              recoveryPending: false,
              updatedAt: now,
            },
          }
        : {},
    holdAchievementModals: true,
    points: 40,
    ...extra,
  }));
}

/** Liga em modo demo com XP semanal local (conta não-cloud). */
export async function seedLeagueDemoSession(page: Page, weeklyXp = 15) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const week = isoWeekKey();
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: ["l1"],
    weeklyXp,
    xpWeekKey: week,
    leagueJoinedAt: Date.now(),
    leagueTier: "bronze",
  }));
}

/** Sessão com lição concluída em 2★ e erro pendente para revisão (fluxo pós-lição). */
export async function seedLessonRecoverySession(
  page: Page,
  options: { lessonId?: string; stars?: number; isPremium?: boolean } = {}
) {
  const lessonId = options.lessonId ?? "l1";
  const stars = options.stars ?? 2;
  const isPremium = options.isPremium ?? true;

  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ payload }: { payload: string }) => {
      localStorage.setItem("longyu-v1", payload);
    },
    {
      payload: buildStorePayload({
        accountSetupComplete: true,
        completedLessons: [lessonId],
        learnedChunks: ["nihao"],
        lessonStarsById: { [lessonId]: stars },
        // O runner usa um build de preview isolado e explicitamente autoriza o
        // preview Pro. serverIsPro continua efêmero e nunca vem do navegador.
        isPremium,
        achievementsUnlocked: { "jornada-primeira-licao": Date.now() },
        recentActivityErrors: [
          {
            id: "e2e-pending-error",
            lessonId,
            moduleId: "u1-1",
            phaseId: "p1",
            taskId: `${lessonId}:1`,
            questionId: `${lessonId}:1`,
            exerciseId: `${lessonId}:1`,
            type: "listen_select",
            prompt: "Toque no que ouviu",
            correctAnswer: "你好",
            selectedAnswer: "谢谢",
            topic: "Olá",
            tokens: ["你好", "谢谢"],
            hanzi: "你好",
            pinyin: "nǐ hǎo",
            meaningPt: "Olá",
            timestamp: Date.now(),
            wrongCount: 1,
            skill: "fala",
            targets: [{ type: "chunk", itemId: "nihao", domain: "significado", track: "fala" }],
          },
        ],
      }),
    }
  );
}

/**
 * Sessão com última tentativa em 2★ e erro pendente no player (oferta de revisão).
 * Simula armazenamento “bugado” com dump concatenado no explanation — a UI
 * corrigida deve reconstruir um único item coerente.
 */
export async function seedPendingStarRecoverySession(
  page: Page,
  options: {
    lessonId?: string;
    stepIndex?: number;
    exerciseType?: string;
    expectedAnswer?: string;
    isPremium?: boolean;
  } = {}
) {
  const lessonId = options.lessonId ?? "l3";
  const stepIndex = options.stepIndex ?? 5;
  const exerciseType = options.exerciseType ?? "dialogue_choice";
  const expectedAnswer = options.expectedAnswer ?? "我很好";
  const isPremium = options.isPremium ?? true;
  const foundation = [
    "p1-o-que-e-mandarim",
    "p1-o-que-e-pinyin",
    "p1-o-que-e-tom",
    "p1-o-que-e-hanzi",
    "p1-primeiros-hanzi",
    "p1-engine-2-lab",
  ];
  const targetIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const journeyCompleted =
    targetIndex > 0 ? ALL_LESSONS.slice(0, targetIndex).map((lesson) => lesson.id) : [];
  const completedLessons = [...new Set([...foundation, ...journeyCompleted, lessonId])];
  const lessonStarsById = Object.fromEntries(completedLessons.map((id) => [id, id === lessonId ? 2 : 3]));
  const now = Date.now();
  const mistake = {
    id: `e2e-star-mistake-${lessonId}`,
    lessonId,
    questionId: `${lessonId}:${stepIndex}:${exerciseType}`,
    exerciseType,
    prompt: "Escolha a resposta correta",
    expectedAnswer,
    userAnswer: "Pulou ou respondeu incorretamente",
    explanation: "你好 / 你好吗 / 我很好 / 谢谢 / 再见",
    sourceSkill: "fala",
    createdAt: now,
  };

  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ payload }: { payload: string }) => {
      localStorage.setItem("longyu-v1", payload);
    },
    {
      payload: buildStorePayload({
        accountSetupComplete: true,
        completedLessons,
        lessonStarsById,
        isPremium,
        serverIsPro: isPremium,
        folego: 20,
        holdAchievementModals: true,
        // Pré-desbloqueia medalhas que a jornada completa dispararia ao liberar o hold.
        achievementsUnlocked: {
          "jornada-primeira-licao": Date.now(),
          "jornada-primeira-unidade": Date.now(),
          "jornada-primeira-fase": Date.now(),
          "som-primeiro-audio": Date.now(),
        },
        toneTrainer: buildCompletedToneTrainer(),
        lessonAttemptsById: {
          [lessonId]: [
            {
              id: `${lessonId}:${now}`,
              lessonId,
              startedAt: now - 60_000,
              finishedAt: now - 1_000,
              totalQuestions: 8,
              correctCount: 6,
              mistakes: [mistake],
              recoveredMistakes: [],
              finalStars: 2,
            },
          ],
        },
      }),
    }
  );
}

/** TEST-034: conta local antiga com progresso, SEM bypass e2e. */
export async function seedLegacyLocalProgress(page: Page) {
  await seedTelemetryDeclined(page);
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
    localStorage.removeItem("longyu:e2e-allow-local");
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin"],
    xpTotal: 40,
    points: 20,
    streak: 3,
    lastActive: new Date().toISOString().slice(0, 10),
    accounts: {
      local: {
        id: "local",
        name: "Aluno legado",
        authMode: "local",
        createdAt: Date.now() - 86_400_000,
        updatedAt: Date.now() - 3_600_000,
        completedLessons: ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin"],
        xpTotal: 40,
        points: 20,
        streak: 3,
      },
    },
    currentAccountId: "local",
  }));
}
