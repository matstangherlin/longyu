import { expect, test, type Locator, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import {
  advanceUntilSelector,
  assertLessonActionDockedOutsideAnswers,
  seedProOnTopOfSession,
} from "./lesson-player-mobile-helpers";

async function openComparison(page: Page): Promise<Locator> {
  await seedLessonPlayerReady(page, "l26b");
  await seedProOnTopOfSession(page);
  await page.goto("/licao/l26b/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);

  const comparison = page.locator("[data-compare-with-image]").first();
  const found = await advanceUntilSelector(page, "[data-compare-with-image]", 90, 110_000);
  expect(found).toBe(true);
  return comparison;
}

test.describe("compare_with_image — comparação visual", () => {
  test.setTimeout(120_000);
  test("renderiza na jornada e aceita a imagem correta", async ({ page }) => {
    const comparison = await openComparison(page);
    await expect(comparison).toHaveAttribute("data-compare-level", "1");
    const tiles = comparison.locator("[data-image-choice-ready] button");
    await expect(tiles).toHaveCount(2);
    await expect(comparison.locator('[data-image-choice-ready="1"]')).toBeVisible({ timeout: 12_000 });

    await comparison.getByRole("button", { name: /^Opção \d+:.*restaurante/i }).click();
    await expect(comparison.getByRole("status")).toContainText("Certo");
    await expect(comparison.getByRole("status")).toContainText("饭馆");
  });

  test("erro explica a diferença sem marcar a associação ambígua", async ({ page }) => {
    const comparison = await openComparison(page);
    await comparison.getByRole("button", { name: /^Opção \d+:.*cardápio/i }).click();
    const retryDialog = page.getByRole("dialog", { name: "Quer tentar de novo?" });
    await expect(retryDialog).toContainText("Você escolheu 菜单");
    await expect(retryDialog).toContainText("饭馆 — restaurante");
  });

  test("falha de asset troca a imagem por fallback", async ({ page }) => {
    const comparison = await openComparison(page);
    await comparison.locator("img").evaluateAll((images) => {
      for (const image of images) image.dispatchEvent(new Event("error"));
    });
    await expect(comparison.locator('[data-visual-fallback="1"]')).toHaveCount(2);
    const diagnostics = await page.evaluate(() => sessionStorage.getItem("longyu:client-diagnostics") ?? "");
    expect(diagnostics).toContain('"area":"visual-asset"');
  });

  test("layout 2-up cabe em mobile e mantém o CTA visível", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const comparison = await openComparison(page);
    await expect(comparison.locator("[data-image-choice-ready] button")).toHaveCount(2);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
    await comparison.getByRole("button", { name: /^Opção \d+:.*restaurante/i }).click();
    await expect(
      page.locator("[data-lesson-action-region]").getByRole("button", { name: "Continuar" })
    ).toBeVisible();
    await assertLessonActionDockedOutsideAnswers(page);
  });
});
