import type { Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { TONE_TRAINER_PACKS } from "../src/data/toneTrainer";

// Deve acompanhar `version` do persist em src/lib/store.ts: seeds com versão
// antiga passam pelas migrações (a v14, por exemplo, remove o isPremium de
// preview) e deixam de representar o estado que o teste quer simular.
const STORE_VERSION = 16;

type SeedState = Record<string, unknown>;

function buildStorePayload(state: SeedState) {
  return JSON.stringify({ state, version: STORE_VERSION });
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

export async function dismissBlockingOverlays(page: Page) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const privacy = page.getByRole("dialog", { name: /Ajude a melhorar o Longyu/i });
    if (await privacy.isVisible().catch(() => false)) {
      const decline = page.getByRole("button", { name: /Agora não/i });
      if (await decline.isVisible().catch(() => false)) {
        await decline.click({ timeout: 2_000 }).catch(() => undefined);
      }
      await page.waitForTimeout(120);
      continue;
    }
    const achievement = page.getByRole("dialog", { name: /medalha|conquista/i });
    if (await achievement.isVisible().catch(() => false)) {
      const continueBtn = achievement.getByRole("button", { name: /Continuar|Fechar|Ok/i }).first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click({ timeout: 2_000 }).catch(() => undefined);
      } else {
        await page.keyboard.press("Escape").catch(() => undefined);
      }
      await page.waitForTimeout(120);
      continue;
    }
    // Qualquer outro dialog modal que bloqueie cliques (WebKit é mais sensível).
    const otherDialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    if (await otherDialog.isVisible().catch(() => false)) {
      const dismiss = otherDialog.getByRole("button", { name: /Continuar|Fechar|Ok|Depois|Entendi/i }).first();
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
  await page.locator('[aria-label="Carregando página"]').waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
  await page.getByText("Carregando…").first().waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
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
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
  }));
}

/** Conclui todas as lições fundamentais até (e incluindo) `throughLessonId`. */
export async function seedFoundationThrough(page: Page, throughLessonId: string) {
  await seedTelemetryDeclined(page);
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
export async function seedLessonPlayerReady(page: Page, lessonId: string) {
  await seedTelemetryDeclined(page);
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
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
    lessonStarsById,
    toneTrainer: buildCompletedToneTrainer(),
    achievementsUnlocked: { "jornada-primeira-licao": Date.now() },
  }));
}

export async function seedFreshJourneySession(
  page: Page,
  options: { isPremium?: boolean; points?: number } = {}
) {
  await seedTelemetryDeclined(page);
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: [],
    isPremium: options.isPremium ?? false,
    points: options.points ?? 20,
  }));
}

/** Liga em modo demo com XP semanal local (conta não-cloud). */
export async function seedLeagueDemoSession(page: Page, weeklyXp = 15) {
  await seedTelemetryDeclined(page);
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
        // O e2e roda contra o build de produção, onde o preview local
        // (isPremium) não concede Pro (effectivePremium exige DEV ou flag de
        // build). O Pro real chega via entitlement do servidor persistido em
        // serverIsPro — é esse campo que simula um assinante aqui.
        isPremium,
        serverIsPro: isPremium,
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
        // Evita modal de medalha no meio da oferta de revisão.
        achievementsUnlocked: {
          "jornada-primeira-licao": Date.now(),
          "som-primeiro-audio": Date.now(),
        },
        lifetimeStats: { audioHeard: 3, lessonsCompleted: completedLessons.length },
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
