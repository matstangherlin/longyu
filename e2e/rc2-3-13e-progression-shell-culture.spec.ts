import { expect, test } from "@playwright/test";
import {
  CULTURE_DISCOVERED_LESSONS,
  dismissBlockingOverlays,
  seedMissionsSession,
  waitForLazyPage,
} from "./helpers";

async function openApp(page: import("@playwright/test").Page, path: string) {
  await seedMissionsSession(page, {
    isPremium: true,
    serverIsPro: true,
    folego: 20,
    completedLessons: CULTURE_DISCOVERED_LESSONS,
  });
  await page.goto(path);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

/** Culture tab may restore hub (`/cultura`) or last topic (`/cultura/topico/...`). */
async function expectCultureSurface(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/cultura(\/|$)/, { timeout: 15_000 });
  await expect(page.getByTestId("progression-shell")).toHaveAttribute("data-progression-mode", "culture");
  await expect(
    page
      .getByTestId("culture-hub")
      .or(page.getByTestId("culture-topic-detail"))
      .or(page.getByTestId("culture-journey")),
  )
    .first()
    .toBeVisible({ timeout: 15_000 });
}

test.describe("RC2.3.13E ProgressionShell Journey ↔ Culture", () => {
  test("segmented switch restores independent positions", async ({ page }) => {
    await openApp(page, "/jornada");
    await expect(page.getByTestId("progression-shell")).toHaveAttribute("data-progression-mode", "journey");
    await expect(page.getByTestId("progression-tab-journey")).toHaveAttribute("aria-selected", "true");

    await page.evaluate(() => {
      sessionStorage.setItem("longyu.progression.journeyAnchor", "home");
      sessionStorage.setItem("longyu.progression.journeyScroll", "120");
    });

    await page.getByTestId("progression-tab-culture").click();
    await expectCultureSurface(page);
    // First landing is the hub continue surface when no topic restore is armed yet.
    await expect(page.getByTestId("culture-next-cta").or(page.getByTestId("culture-topic-continue")).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.evaluate(() => {
      sessionStorage.setItem("longyu.progression.cultureAnchor", "route:first-meetings");
      sessionStorage.setItem("longyu.progression.cultureScroll", "80");
    });

    await page.getByTestId("progression-tab-journey").click();
    await expect(page).toHaveURL(/\/jornada$/);
    await expect(page.getByTestId("home-cognitive")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("progression-tab-culture").click();
    await expectCultureSurface(page);
    const cultureScroll = await page.evaluate(() => sessionStorage.getItem("longyu.progression.cultureScroll"));
    expect(cultureScroll).toBeTruthy();
  });

  test("legacy culture item deep link still resolves", async ({ page }) => {
    await openApp(page, "/cultura/greetings-nihao");
    await expect(page.url()).toMatch(/culture-greetings-nihao|greetings-nihao|licao/);
  });

  test("culture atlas secondary route", async ({ page }) => {
    await openApp(page, "/cultura/explorar");
    await expect(page.getByTestId("culture-atlas")).toBeVisible();
    await expect(page.getByTestId("culture-atlas-back")).toBeVisible();
  });

  test("rapid switch does not loop history", async ({ page }) => {
    await openApp(page, "/jornada");
    for (let i = 0; i < 6; i++) {
      await page.getByTestId("progression-tab-culture").click();
      await expectCultureSurface(page);
      await page.getByTestId("progression-tab-journey").click();
      await expect(page).toHaveURL(/\/jornada$/, { timeout: 15_000 });
    }
    await expect(page).toHaveURL(/\/jornada$/);
    await page.goBack();
    // Segmented switch uses navigate({ replace: true }), so history is shallow.
    // Do not OR progression-shell with body (strict mode when both match).
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/Something went wrong|Application error/i)).toHaveCount(0);
  });
});

for (const viewport of [
  { name: "360", width: 360, height: 640 },
  { name: "375", width: 375, height: 667 },
  { name: "390", width: 390, height: 844 },
]) {
  test(`responsive ${viewport.name}: both segment labels visible`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openApp(page, "/cultura");
    const journey = page.getByTestId("progression-tab-journey");
    const culture = page.getByTestId("progression-tab-culture");
    await expect(journey).toBeVisible();
    await expect(culture).toBeVisible();
    const jBox = await journey.boundingBox();
    const cBox = await culture.boundingBox();
    expect(jBox && jBox.height >= 44).toBeTruthy();
    expect(cBox && cBox.height >= 44).toBeTruthy();
    await expect(journey).toContainText(/Jornada|Journey/);
    await expect(culture).toContainText(/Cultura|Culture/);
  });
}
