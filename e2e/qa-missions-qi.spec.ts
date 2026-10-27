import { expect, test } from "@playwright/test";
import { todayKey } from "../src/lib/storage";
import { seedMissionsSession, waitForLazyPage } from "./helpers";

const day = todayKey();

test("resgatar missão credita e sobrevive ao reload @qa-r08", async ({ page }) => {
  await seedMissionsSession(page, {
    points: 10,
    dailyEnergy: {
      date: day,
      charges: 0,
      maxCharges: 5,
      usedCharges: 0,
      bonusChargesClaimed: {},
      folegoEarned: 0,
      consumedChargeKeys: [],
    },
    dailyTasks: {
      date: day,
      audioHeard: 0,
      phrasesSpoken: 0,
      phrasesReviewed: 0,
      reviewsDone: 10,
      hanziDecomposed: 0,
      microtextsRead: 0,
      errorsCorrected: 0,
      threeStarLessons: 0,
      tonesTrained: 0,
      speechAttemptKeys: [],
      practiceRewardKeys: [],
      claimedMissions: {},
    },
  });
  await page.goto("/missoes");
  await waitForLazyPage(page);
  const card = page.locator('[data-mission-id="daily-reviews"]');
  await expect(card).toHaveAttribute("data-mission-status", "complete");
  await card.getByRole("button", { name: "Resgatar" }).click();
  await expect(card).toHaveAttribute("data-mission-status", "claimed");
  await page.reload();
  await waitForLazyPage(page);
  await expect(page.locator('[data-mission-id="daily-reviews"]')).toHaveAttribute("data-mission-status", "claimed");
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    return raw ? JSON.parse(raw) : null;
  });
  const state = saved?.state ?? saved;
  expect(state.points).toBeGreaterThanOrEqual(16);
  expect(state.dailyEnergy.charges).toBeGreaterThanOrEqual(2);
});

test("abrir outro tema não reduz o Qi @qa-r09", async ({ page }) => {
  await seedMissionsSession(page, { points: 17 });
  await page.goto("/jornada");
  await waitForLazyPage(page);
  await page.goto("/treino");
  await waitForLazyPage(page);
  const points = await page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const saved = raw ? JSON.parse(raw) : null;
    const state = saved?.state ?? saved;
    return state?.points;
  });
  expect(points).toBeGreaterThanOrEqual(17);
});
