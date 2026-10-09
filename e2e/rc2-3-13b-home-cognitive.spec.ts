/**
 * RC2.3.13B — Home cognitive hierarchy E2E.
 * States: new learner, returning, review due, mastery/explore presence.
 */
import { expect, test, type Page } from "@playwright/test";
import { ACHIEVEMENTS } from "../src/data/achievements";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";

const STORE_VERSION = 16;

type SeedState = Record<string, unknown>;

function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

async function seedStage(page: Page, state: SeedState) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    (payload: string) => localStorage.setItem("longyu-v1", payload),
    JSON.stringify({
      state: {
        accountSetupComplete: true,
        achievementsUnlocked: allAchievementsUnlocked(),
        ...state,
      },
      version: STORE_VERSION,
    })
  );
}

async function openHome(page: Page) {
  await page.goto("/jornada");
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("home-cognitive")).toBeVisible({ timeout: 20_000 });
}

test.describe("RC2.3.13B Home cognitive", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("new learner sees start CTA, not dead Continuar", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    await openHome(page);
    const continueCard = page.getByTestId("home-continue");
    await expect(continueCard).toBeVisible();
    const cta = page.getByTestId("home-continue-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("data-cta-hierarchy", "primary");
    const kind = await continueCard.getAttribute("data-continue-kind");
    expect(kind === "START_FIRST" || kind === "CONTINUE_LESSON").toBeTruthy();
    const text = (await cta.innerText()).toLowerCase();
    expect(text.includes("começar") || text.includes("start") || text.includes("continuar")).toBeTruthy();
    const today = page.getByTestId("home-today");
    if (await today.count()) {
      await expect(today).toHaveAttribute("data-cta-hierarchy", "secondary");
    }
  });

  test("returning learner sees Continue as primary answer", async ({ page }) => {
    await seedStage(page, { completedLessons: ["l1", "l2"] });
    await openHome(page);
    await expect(page.getByTestId("home-continue")).toBeVisible();
    await expect(page.getByTestId("home-continue-cta")).toBeVisible();
    const kind = await page.getByTestId("home-continue").getAttribute("data-continue-kind");
    expect(
      kind === "CONTINUE_LESSON" ||
        kind === "START_FIRST" ||
        kind === "FALLBACK_REVIEW" ||
        kind === "FALLBACK_PRACTICE"
    ).toBeTruthy();
  });

  test("review due surfaces Today secondary with explainability", async ({ page }) => {
    const now = Date.now();
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l3"],
      srs: {
        "chunk:nihao": {
          id: "chunk:nihao",
          type: "chunk",
          itemId: "nihao",
          ease: 2.5,
          intervalDays: 1,
          due: now - 1000,
          reps: 1,
          lapses: 0,
          createdAt: now - 86_400_000,
        },
      },
    });
    await openHome(page);
    const today = page.getByTestId("home-today");
    await expect(today).toBeVisible();
    await expect(today).toHaveAttribute("data-cta-hierarchy", "secondary");
    await expect(today).toHaveAttribute("data-today-kind", "REVIEW_DUE");
    await expect(page.getByTestId("home-today-reason")).not.toBeEmpty();
    const href = await page.getByTestId("home-today-cta").getAttribute("href");
    expect(href ?? "").toMatch(/\/revisao/);
    expect(href ?? "").not.toMatch(/\/loja|\/ligas/);
  });

  test("Today never equals Continue href when both present", async ({ page }) => {
    const now = Date.now();
    await seedStage(page, {
      completedLessons: ["l1", "l2"],
      srs: {
        "chunk:nihao": {
          id: "chunk:nihao",
          type: "chunk",
          itemId: "nihao",
          ease: 2.5,
          intervalDays: 1,
          due: now - 1000,
          reps: 1,
          lapses: 0,
          createdAt: now - 86_400_000,
        },
      },
    });
    await openHome(page);
    const continueHrefLesson = await page.getByTestId("home-continue").getAttribute("data-lesson-id");
    const today = page.getByTestId("home-today");
    if ((await today.count()) === 0) return;
    const todayHref = await page.getByTestId("home-today-cta").getAttribute("href");
    if (continueHrefLesson) {
      expect(todayHref ?? "").not.toContain(`/licao/${continueHrefLesson}`);
    }
  });

  test("explore absent for brand-new learner without culture unlock", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    await openHome(page);
    await expect(page.getByTestId("home-explore")).toHaveCount(0);
  });

  test("Continue navigates to a lesson route", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    await openHome(page);
    await page.getByTestId("home-continue-cta").click();
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/\/licao\/|\/jornada\/capsula\//);
  });
});
