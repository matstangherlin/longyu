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

test.describe("RC2.3.13R typography + motion", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("Culture card uses semantic type roles", async ({ page }) => {
    await openApp(page, "/cultura");
    const card = page.getByTestId("culture-progress");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-typography", "culture-current-path");
    const eyebrow = card.locator(".type-eyebrow").first();
    const title = card.locator(".type-card-title").first();
    await expect(eyebrow).toBeVisible();
    await expect(title).toBeVisible();
    const cta = page.getByTestId("culture-next-cta");
    if ((await cta.count()) > 0) {
      await expect(cta).toHaveAttribute("data-cta-hierarchy", "primary");
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("Journey → Culture keeps chrome stable and enters with direction", async ({ page }) => {
    await openApp(page, "/jornada");
    const topBefore = await page.getByTestId("global-topbar").boundingBox();
    const switchBefore = await page.getByTestId("progression-shell-switch").boundingBox();
    expect(topBefore && switchBefore).toBeTruthy();

    await page.getByTestId("progression-tab-culture").click();
    await expect(page).toHaveURL(/\/cultura$/);
    await expect(page.getByTestId("progression-shell")).toHaveAttribute("data-progression-mode", "culture");
    const panel = page.getByTestId("progression-shell-panel");
    await expect(panel).toHaveAttribute("data-enter", /from-right|none/);
    await expect(panel).toHaveClass(/progression-panel-enter/);

    await expect
      .poll(async () => {
        const t = await page.getByTestId("global-topbar").boundingBox();
        const s = await page.getByTestId("progression-shell-switch").boundingBox();
        return t != null && s != null;
      })
      .toBe(true);

    const topAfter = (await page.getByTestId("global-topbar").boundingBox())!;
    const switchAfter = (await page.getByTestId("progression-shell-switch").boundingBox())!;
    expect(Math.abs(topAfter.y - topBefore!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(switchAfter.y - switchBefore!.y)).toBeLessThanOrEqual(1);
  });

  test("Culture → Journey reverse enter; sticky chrome stable", async ({ page }) => {
    await openApp(page, "/cultura");
    await page.getByTestId("progression-tab-journey").click();
    await expect(page).toHaveURL(/\/jornada$/);
    const panel = page.getByTestId("progression-shell-panel");
    await expect(panel).toHaveAttribute("data-enter", /from-left|none/);
    await expect(page.getByTestId("global-topbar")).toBeVisible();
  });

  test("reduced-motion still switches modes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openApp(page, "/jornada");
    await page.getByTestId("progression-tab-culture").click();
    await expect(page).toHaveURL(/\/cultura$/);
    await expect(page.getByTestId("progression-tab-culture")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("culture-progress")).toBeVisible();
  });
});
