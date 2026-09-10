import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedUnlockedLessonSession,
  seedMissionsSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";
import { expectCultureLessonPlayer, playCultureLessonToVictory, readCulturePersist } from "./culture-lesson-helpers";

type PersistSlice = {
  srs: Record<string, unknown>;
  points: number;
  completedLessons: string[];
  cultureCompletedIds: string[];
  cultureMasteryById: Record<string, { stars?: number; completed?: boolean }>;
};

async function readPersist(page: Page): Promise<PersistSlice> {
  const slice = await readCulturePersist(page);
  return {
    srs: slice.srs,
    points: slice.points,
    completedLessons: slice.completedLessons,
    cultureCompletedIds: slice.cultureCompletedIds,
    cultureMasteryById: slice.cultureMasteryById,
  };
}

function hotelMastery(lessonId: string, level: number) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const completed = ALL_LESSONS.slice(0, Math.max(0, index)).map((lesson) => lesson.id);
  const now = Date.now();
  const byId: Record<string, { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }> = {};
  for (const id of completed) {
    const lesson = ALL_LESSONS.find((item) => item.id === id);
    if (!lesson || lesson.isReview || lesson.reviewMasteryMode) continue;
    byId[id] = { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now };
  }
  if (level > 0) {
    byId[lessonId] = {
      level,
      passCount: level,
      lastPass: Math.max(1, level),
      recoveryPending: false,
      updatedAt: now,
    };
  }
  return byId;
}

async function openMissionPlayer(page: Page, lessonId: string, masteryLevel = 0) {
  await seedUnlockedLessonSession(page, lessonId, {
    lessonMasteryById: hotelMastery(lessonId, masteryLevel),
  });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
}

async function clickVisible(page: Page, name: RegExp) {
  const btn = page.getByRole("button", { name }).first();
  if (await btn.isVisible().catch(() => false) && !(await btn.isDisabled().catch(() => true))) {
    await btn.click().catch(() => undefined);
    return true;
  }
  return false;
}

/** Drive a V2 conversation a few beats: continue, produce, or pick an option. */
async function driveConversation(page: Page, steps: number) {
  const scene = page.locator("[data-conversation-scene]");
  for (let i = 0; i < steps; i += 1) {
    await dismissBlockingOverlays(page);
    if (!(await scene.isVisible().catch(() => false))) return;
    const textarea = scene.locator("textarea").first();
    if (await textarea.isVisible().catch(() => false)) {
      const prompt = (await scene.locator("p").allTextContents()).join(" ");
      const draft = /reserva/i.test(prompt)
        ? "我有预订"
        : /passaporte|documento/i.test(prompt)
          ? "这是我的护照"
          : /quarto/i.test(prompt)
            ? "我的房间在哪里？"
            : /portão/i.test(prompt)
              ? "登机口在哪里？"
              : /repetir|devagar/i.test(prompt)
                ? "请再说一遍"
                : "谢谢";
      await textarea.fill(draft);
      await clickVisible(page, /^(Verificar|Check|Confirmar|Confirm)$/);
      await page.waitForTimeout(180);
      continue;
    }
    const option = scene.getByRole("button", { name: /^(Opção|Option) \d+:/ }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click().catch(() => undefined);
      await clickVisible(page, /^(Verificar|Check|Confirmar|Confirm)$/);
      await page.waitForTimeout(180);
      continue;
    }
    if (await clickVisible(page, /^(Responder|Reply|Continuar|Continue|Concluir|Finish)(?:\s*>)?$/)) {
      await page.waitForTimeout(180);
      continue;
    }
    break;
  }
}

test.describe("V4.9.8B hotel + airport survival", () => {
  test("p6-survival-mandarin opens the hotel-checkin-register lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p6-survival-mandarin");
    await page.goto("/licao/p6-survival-mandarin");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "hotel-checkin-register");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "hotel-checkin-register");
  });

  test("hotel mission page has no second culture card; Hub/Journey share the native lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p7-imersao-hotel");
    await page.goto("/licao/p7-imersao-hotel");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: check-in no hotel/i })).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveCount(0);
  });

  test("hotel player reaches reception conversation with reservation, not Matheus", async ({ page }) => {
    test.setTimeout(120_000);
    await openMissionPlayer(page, "p7-imersao-hotel", 0);
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 40, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
    await expect(page.getByText(/Hotel|Aeroporto|Recepcionista|Viajante/i).first()).toBeVisible();
    await driveConversation(page, 8);
    await expect(page.getByText("Matheus perguntou")).toHaveCount(0);
    await expect(page.getByText(/有预订吗？|我有预订|请给我护照/)).toBeVisible();
  });

  test("airport mission starts inside the airport, not on the street", async ({ page }) => {
    test.setTimeout(120_000);
    await openMissionPlayer(page, "p7-imersao-aeroporto", 0);
    await expect(page.getByText(/Já no aeroporto|Already at the airport/i).first()).toBeVisible({ timeout: 20_000 });
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 40, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
    const body = await page.locator("[data-conversation-scene]").innerText();
    expect(body).not.toMatch(/机场在哪里？/);
    await expect(page.getByText(/Funcionário|Staff|Aeroporto|Airport|Viajante|Traveller/i).first()).toBeVisible();
    await driveConversation(page, 6);
    await expect(page.getByText(/护照|登机口/)).toBeVisible();
  });

  test("master travel transfer reuses hotel → mobility → airport language", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p7-imersao-viagem");
    await page.goto("/licao/p7-imersao-viagem");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: hotel ao aeroporto/i })).toBeVisible();
    await expect(page.getByText(/Hotel → caminho → transporte → aeroporto|Hotel → route → transport → airport/i).first()).toBeVisible();
  });

  test("hotel culture lesson teaches before the task and Hub shares progress", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/hotel-checkin-register");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "hotel-checkin-register");
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    const before = await readPersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("hotel-checkin-register");
    expect(persist.cultureMasteryById["hotel-checkin-register"]?.stars).toBeGreaterThanOrEqual(1);
    expect(persist.completedLessons).toContain("culture-hotel-checkin-register");
    expect(Object.keys(persist.srs)).toEqual(Object.keys(before.srs));

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 20/);
    await expect(page.locator('[data-culture-id="hotel-checkin-register"]').first()).toHaveAttribute(
      "data-culture-status",
      "completed"
    );
  });

  test("hotel culture replay does not duplicate XP", async ({ page }) => {
    test.setTimeout(120_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/hotel-checkin-register");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await playCultureLessonToVictory(page);
    const afterFirst = await readPersist(page);
    expect(afterFirst.points).toBeGreaterThan(0);

    await page.goto("/licao/culture-hotel-checkin-register/player?src=cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-xp")).toContainText("+0");
    const afterReplay = await readPersist(page);
    expect(afterReplay.points).toBe(afterFirst.points);
  });
});

test.describe("V4.9.8B hotel + airport 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hotel mission and culture lesson fit the phone viewport", async ({ page }) => {
    test.setTimeout(90_000);
    await seedUnlockedLessonSession(page, "p7-imersao-hotel");
    await page.goto("/licao/p7-imersao-hotel");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: check-in no hotel/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);

    await page.goto("/cultura/hotel-checkin-register");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "hotel-checkin-register");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);
  });
});
