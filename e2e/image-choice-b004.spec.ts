import { test, expect, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedFoundationThrough, waitForLazyPage } from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";

/**
 * B004 — image_choice: 4 tiles terminam em ready/fallback; nunca eternamente em loading;
 * opções só habilitam quando a grade está pronta. Light + dark; Chromium + WebKit.
 */

async function openImageChoiceStep(page: Page): Promise<boolean> {
  await seedFoundationThrough(page, "p1-engine-2-lab");
  await page.goto("/licao/p4-char-ren/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Entendi" }).click().catch(() => undefined);
  }
  return advanceUntilSelector(page, "[data-image-choice-ready]", 40, 120_000);
}

async function assertImageChoiceSettled(page: Page) {
  const grid = page.locator("[data-image-choice-ready]").first();
  await expect(grid).toBeVisible({ timeout: 20_000 });

  // Grade precisa sair de loading em tempo finito (timeout VisualConceptImage = 6s + folga).
  await expect(grid).toHaveAttribute("data-image-choice-ready", "1", { timeout: 20_000 });
  await expect(page.getByText("Carregando imagens…")).toHaveCount(0);

  const tiles = grid.locator("button");
  await expect(tiles).toHaveCount(4);

  for (let i = 0; i < 4; i += 1) {
    const tile = tiles.nth(i);
    await expect(tile).toBeEnabled();
    const settled = await tile.evaluate((el) => {
      const ready = el.querySelector('[data-visual-status="ready"]');
      const fallback = el.querySelector("[data-visual-fallback='1']");
      const loading = el.querySelector('[data-visual-status="loading"]');
      return {
        ready: Boolean(ready),
        fallback: Boolean(fallback),
        loading: Boolean(loading),
      };
    });
    expect(settled.loading, `tile ${i} ainda em loading`).toBe(false);
    expect(settled.ready || settled.fallback, `tile ${i} sem ready/fallback`).toBe(true);
  }
}

const themes = [
  { name: "light", theme: "light" as const },
  { name: "dark", theme: "dark" as const },
];

test.describe("B004 — image_choice ready/fallback", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { name, theme } of themes) {
    test(`grade 4 tiles settled (${name})`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.addInitScript((value) => {
        const raw = localStorage.getItem("longyu-v1");
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 16 };
        parsed.state = { ...parsed.state, theme: value };
        localStorage.setItem("longyu-v1", JSON.stringify(parsed));
      }, theme);

      const found = await openImageChoiceStep(page);
      expect(found).toBe(true);
      await page.evaluate((value) => {
        document.documentElement.setAttribute("data-theme", value);
      }, theme);
      await assertImageChoiceSettled(page);
    });
  }

  test("nunca fica eternamente em loading (timeout do preload)", async ({ page }) => {
    test.setTimeout(150_000);
    const found = await openImageChoiceStep(page);
    expect(found).toBe(true);
    const grid = page.locator("[data-image-choice-ready]").first();
    // Se loading persistir > 12s, falha (VisualConceptImage timeout é 6s).
    await expect
      .poll(async () => grid.getAttribute("data-image-choice-ready"), { timeout: 12_000 })
      .toBe("1");
    await expect(page.locator('[data-visual-status="loading"]')).toHaveCount(0);
  });
});
