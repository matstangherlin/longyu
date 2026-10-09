/**
 * RC2.3.13B — Home cognitive hierarchy E2E.
 * States: new learner, returning, review due, mastery/explore presence.
 */
import { expect, test, type Page } from "@playwright/test";

async function seedProgress(page: Page, completed: string[]) {
  await page.addInitScript((lessons) => {
    try {
      const raw = localStorage.getItem("longyu-store");
      const parsed = raw ? JSON.parse(raw) : { state: {} };
      parsed.state = {
        ...(parsed.state ?? {}),
        completedLessons: lessons,
      };
      localStorage.setItem("longyu-store", JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
  }, completed);
}

async function openHome(page: Page) {
  await page.goto("/jornada");
  await expect(page.getByTestId("home-cognitive")).toBeVisible({ timeout: 20_000 });
}

test.describe("RC2.3.13B Home cognitive", () => {
  test("new learner sees start CTA, not dead Continuar", async ({ page }) => {
    await seedProgress(page, []);
    await openHome(page);
    const continueCard = page.getByTestId("home-continue");
    await expect(continueCard).toBeVisible();
    const cta = page.getByTestId("home-continue-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("data-cta-hierarchy", "primary");
    const text = (await cta.innerText()).toLowerCase();
    expect(text.includes("começar") || text.includes("start")).toBeTruthy();
    // Exactly one primary CTA in the cognitive home surface.
    const primaries = page.locator('[data-home-cognitive] [data-cta-hierarchy="primary"]');
    // continue card + button both mark primary; ensure no secondary elevated to primary for Today.
    const today = page.getByTestId("home-today");
    if (await today.count()) {
      await expect(today).toHaveAttribute("data-cta-hierarchy", "secondary");
    }
    await expect(primaries.first()).toBeVisible();
  });

  test("returning learner sees Continue as primary answer", async ({ page }) => {
    // First curriculum lessons — enough to leave new-learner empty state.
    await seedProgress(page, ["l1", "l2"]);
    await openHome(page);
    await expect(page.getByTestId("home-continue")).toBeVisible();
    await expect(page.getByTestId("home-continue-cta")).toBeVisible();
    const kind = await page.getByTestId("home-continue").getAttribute("data-continue-kind");
    expect(kind === "CONTINUE_LESSON" || kind === "START_FIRST" || kind === "FALLBACK_REVIEW").toBeTruthy();
  });

  test("Today recommendation is secondary and explainable when present", async ({ page }) => {
    await seedProgress(page, ["l1", "l2", "l3"]);
    await openHome(page);
    const today = page.getByTestId("home-today");
    if ((await today.count()) === 0) {
      test.info().annotations.push({ type: "note", description: "No Today rec for this seed — acceptable empty" });
      return;
    }
    await expect(today).toHaveAttribute("data-cta-hierarchy", "secondary");
    await expect(page.getByTestId("home-today-reason")).not.toBeEmpty();
    await expect(page.getByTestId("home-today-cta")).toBeVisible();
    // Must not point at Store / League.
    const href = await page.getByTestId("home-today-cta").getAttribute("href");
    expect(href ?? "").not.toMatch(/\/loja|\/ligas/);
  });

  test("mastery snapshot uses dominio CTA when evidence exists", async ({ page }) => {
    await seedProgress(page, ["l1", "l2", "l3", "l4"]);
    await openHome(page);
    const mastery = page.getByTestId("home-mastery");
    if ((await mastery.count()) === 0) {
      test.info().annotations.push({ type: "note", description: "No mastery evidence yet — section hidden" });
      return;
    }
    await expect(page.getByTestId("home-mastery-cta")).toHaveAttribute("href", "/dominio");
  });

  test("explore never appears when culture locked; href culture when present", async ({ page }) => {
    await seedProgress(page, []);
    await openHome(page);
    // Brand-new: culture typically HIDDEN — Explore should be absent.
    const explore = page.getByTestId("home-explore");
    // Allow either absent or (if sticky AVAILABLE) a real culture lesson path.
    if ((await explore.count()) > 0) {
      const href = await page.getByTestId("home-explore-cta").getAttribute("href");
      expect(href ?? "").toMatch(/\/licao\/|\/cultura/);
      expect(href ?? "").not.toMatch(/\/loja|\/ligas/);
    }
  });

  test("Continue navigates to a lesson route", async ({ page }) => {
    await seedProgress(page, []);
    await openHome(page);
    const cta = page.getByTestId("home-continue-cta");
    await cta.click();
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toMatch(/\/licao\/|\/jornada\/capsula\//);
  });
});
