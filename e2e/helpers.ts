import type { Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";

// Deve acompanhar `version` do persist em src/lib/store.ts: seeds com versão
// antiga passam pelas migrações (a v14, por exemplo, remove o isPremium de
// preview) e deixam de representar o estado que o teste quer simular.
const STORE_VERSION = 15;

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
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const privacy = page.getByRole("dialog", { name: /Ajude a melhorar o Longyu/i });
    if (await privacy.isVisible().catch(() => false)) {
      const decline = page.getByRole("button", { name: /Agora não/i });
      if (await decline.isVisible().catch(() => false)) {
        await decline.click().catch(() => undefined);
      }
      await page.waitForTimeout(150);
      continue;
    }
    const achievement = page.getByRole("dialog", { name: /medalha/i });
    if (!(await achievement.isVisible().catch(() => false))) return;
    const continueBtn = page.getByRole("button", { name: /Continuar/i });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click().catch(() => undefined);
    }
    await page.waitForTimeout(150);
  }
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
  const lessonStarsById = Object.fromEntries(
    completedLessons.map((id) => [id, ALL_LESSONS.find((lesson) => lesson.id === id)?.isReview ? 2 : 3])
  );
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
    lessonStarsById,
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
