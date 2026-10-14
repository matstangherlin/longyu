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

async function chromeRects(page: import("@playwright/test").Page) {
  const topbar = page.getByTestId("global-topbar");
  const switchEl = page.getByTestId("progression-shell-switch");
  await expect(topbar).toBeVisible();
  await expect(switchEl).toBeVisible();
  // Sticky remounts on mode switch can briefly yield null boundingBox; poll until stable.
  await expect
    .poll(async () => {
      const t = await topbar.boundingBox();
      const s = await switchEl.boundingBox();
      return t != null && s != null && t.height > 0 && s.height > 0;
    })
    .toBe(true);
  const topBox = (await topbar.boundingBox())!;
  const switchBox = (await switchEl.boundingBox())!;
  return { topBox, switchBox };
}

test.describe("RC2.3.13H.1 sticky progression chrome", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("topbar + switch stay immobile while journey content scrolls", async ({ page }) => {
    await openApp(page, "/jornada");
    const before = await chromeRects(page);

    const node = page.locator("[data-progression-node]").first();
    const hasNode = (await node.count()) > 0;
    let nodeBeforeY: number | null = null;
    if (hasNode) {
      const box = await node.boundingBox();
      nodeBeforeY = box?.y ?? null;
    }

    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(150);

    const after = await chromeRects(page);
    expect(Math.abs(after.topBox.y - before.topBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.switchBox.y - before.switchBox.y)).toBeLessThanOrEqual(1);
    // Switch sits under topbar
    expect(after.switchBox.y).toBeGreaterThanOrEqual(after.topBox.y + after.topBox.height - 2);

    if (hasNode && nodeBeforeY != null) {
      const nodeAfter = await node.boundingBox();
      expect(nodeAfter).toBeTruthy();
      expect(Math.abs((nodeAfter?.y ?? 0) - nodeBeforeY)).toBeGreaterThan(40);
    } else {
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(200);
    }
  });

  test("culture scroll keeps sticky stack; mode switch from deep scroll", async ({ page }) => {
    await openApp(page, "/cultura");
    const before = await chromeRects(page);
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(150);
    const mid = await chromeRects(page);
    expect(Math.abs(mid.topBox.y - before.topBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(mid.switchBox.y - before.switchBox.y)).toBeLessThanOrEqual(1);

    await page.getByTestId("progression-tab-journey").click();
    await expect(page).toHaveURL(/\/jornada$/);
    await expect(page.getByTestId("progression-shell")).toHaveAttribute("data-progression-mode", "journey");
    const journey = await chromeRects(page);
    expect(Math.abs(journey.topBox.y - before.topBox.y)).toBeLessThanOrEqual(1);

    await page.getByTestId("progression-tab-culture").click();
    await expect(page).toHaveURL(/\/cultura$/);
    await expect(page.getByTestId("progression-shell")).toHaveAttribute("data-progression-mode", "culture");
    const back = await chromeRects(page);
    expect(Math.abs(back.topBox.y - before.topBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.switchBox.y - before.switchBox.y)).toBeLessThanOrEqual(1);
  });

  test("immersive lesson does not stack global progression chrome", async ({ page }) => {
    await openApp(page, "/jornada");
    await page.goto("/licao/p1-o-que-e-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("global-topbar")).toHaveCount(0);
    await expect(page.getByTestId("progression-shell-switch")).toHaveCount(0);
  });

  test("no horizontal overflow at 360", async ({ page }) => {
    await openApp(page, "/jornada");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
