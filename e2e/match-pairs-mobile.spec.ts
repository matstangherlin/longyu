import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";

async function openMatchPairs(page: Page) {
  await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", {
    masteryLevel: 1,
    isPremium: true,
    folego: 20,
  });
  await page.goto("/licao/p1-o-que-e-mandarim/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const reached = await advanceUntilSelector(page, "[data-match-pairs-board]", 12, 60_000);
  expect(reached).toBe(true);
}

async function assertTwoColumnBoard(page: Page) {
  const board = page.locator("[data-match-pairs-board]");
  const left = board.locator('[data-pair-column="left"]');
  const right = board.locator('[data-pair-column="right"]');
  const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()]);

  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();
  if (!leftBox || !rightBox) return;
  expect(Math.abs(leftBox.y - rightBox.y)).toBeLessThanOrEqual(2);
  expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(rightBox.x + 1);

  for (const side of ["left", "right"] as const) {
    const tiles = board.locator(`[data-pair-side="${side}"]`);
    const count = await tiles.count();
    let previousBottom = -Infinity;
    for (let index = 0; index < count; index += 1) {
      const box = await tiles.nth(index).boundingBox();
      expect(box, `${side} tile ${index} sem geometria`).not.toBeNull();
      if (!box) continue;
      expect(box.y, `${side} tile ${index} sobrepõe o anterior`).toBeGreaterThanOrEqual(previousBottom - 1);
      previousBottom = box.y + box.height;
    }
  }
}

async function completeEveryPair(page: Page) {
  const board = page.locator("[data-match-pairs-board]");
  const ids = await board.locator('[data-pair-side="left"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.pairId ?? "").filter(Boolean)
  );

  for (const id of ids) {
    await board.locator(`[data-pair-side="left"][data-pair-id="${id}"]`).click();
    await board.locator(`[data-pair-side="right"][data-pair-id="${id}"]`).click();
  }
}

for (const viewport of [
  { label: "Android pequeno", width: 360, height: 640 },
  { label: "Android típico", width: 390, height: 844 },
] as const) {
  test.describe(`pares mobile · ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("não sobrepõe e avança depois do último par", async ({ page }) => {
      await openMatchPairs(page);
      await assertTwoColumnBoard(page);
      await completeEveryPair(page);

      await expect(page.locator('[data-current-step-kind="match_pairs"]')).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator("[data-match-pairs-board]")).toHaveCount(0);
    });

    test("conclusão sobrevive a rerender do player", async ({ page }) => {
      await openMatchPairs(page);
      const before = Number(
        await page.locator("[data-current-step-index]").getAttribute("data-current-step-index")
      );
      await completeEveryPair(page);

      // Reproduz o churn real que tornava o bug intermitente: barra do browser,
      // teclado ou rotação atualizam a visualViewport enquanto a animação do
      // último par ainda aguarda o callback de conclusão.
      await page.waitForTimeout(60);
      await page.setViewportSize({
        width: viewport.width,
        height: Math.max(560, viewport.height - 24),
      });

      await expect(page.locator("[data-current-step-index]")).toHaveAttribute(
        "data-current-step-index",
        String(before + 1),
        { timeout: 5_000 }
      );
      await expect(page.locator("[data-match-pairs-board]")).toHaveCount(0);
    });

    test("usa superfície e texto escuros no tema dark", async ({ page }) => {
      await openMatchPairs(page);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await assertTwoColumnBoard(page);

      const colors = await page.locator("[data-match-pairs-board] [data-pair-tile]").first().evaluate((node) => {
        const style = window.getComputedStyle(node);
        const parseRgb = (value: string) =>
          (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (rgb: number[]) => {
          const channels = rgb.map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.03928
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const background = style.backgroundColor;
        const color = style.color;
        const backgroundLuminance = luminance(parseRgb(background));
        const colorLuminance = luminance(parseRgb(color));
        return {
          background,
          color,
          backgroundLuminance,
          contrast: (colorLuminance + 0.05) / (backgroundLuminance + 0.05),
        };
      });
      expect(colors.backgroundLuminance).toBeLessThan(0.03);
      expect(colors.contrast).toBeGreaterThanOrEqual(4.5);
    });
  });
}
