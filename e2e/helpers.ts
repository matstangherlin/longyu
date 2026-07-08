import type { Page } from "@playwright/test";

const STORE_VERSION = 12;

type SeedState = Record<string, unknown>;

function buildStorePayload(state: SeedState) {
  return JSON.stringify({ state, version: STORE_VERSION });
}

export async function dismissBlockingOverlays(page: Page) {
  const achievement = page.getByRole("dialog", { name: /medalha/i });
  if (await achievement.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Continuar/i }).click();
  }
}

export async function seedOnboardedSession(page: Page, completedLessons: string[] = ["l1"]) {
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons,
  }));
}

export async function seedFreshJourneySession(page: Page) {
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu-v1", payload);
  }, buildStorePayload({
    accountSetupComplete: true,
    completedLessons: [],
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
