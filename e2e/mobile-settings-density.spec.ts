import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14 · BS–CE — Configurações no celular: índice curto (≤ 7), cada
 * categoria numa subpágina com Voltar inteligente; desktop continua com a
 * página única. Testes de som e diagnóstico ficam em Avançado.
 */

async function open(page: Page, path: string) {
  await seedOnboardedSession(page, ["l1", "l2", "l3"]);
  await page.goto(path);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

test.describe("RC2.2.14 — Configurações mobile", () => {
  test("índice com 7 categorias, alvos ≥ 48px, sem testes de som no topo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/config");
    const index = page.getByTestId("settings-index");
    await expect(index).toBeVisible();
    const rows = index.locator("[data-settings-category]");
    await expect(rows).toHaveCount(7);
    for (let i = 0; i < 7; i += 1) {
      const box = await rows.nth(i).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
    }
    await expect(page.getByTestId("settings-sound-tests")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("categoria abre em subpágina e o Voltar volta ao índice", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/config");
    await page.locator('[data-settings-category="som"]').click();
    await expect(page).toHaveURL(/\/config\/som$/);
    await expect(page.getByTestId("settings-category-title")).toHaveText(/Som e vibração/);
    await expect(page.getByTestId("settings-sound-tests")).toHaveCount(0);
    // Web: vibração é só do app Android.
    await expect(page.getByTestId("settings-haptics-card")).toHaveCount(0);
    await page.getByTestId("smart-back").click();
    await expect(page).toHaveURL(/\/config$/);
    await expect(page.getByTestId("settings-index")).toBeVisible();
  });

  test("testes de som moram em Avançado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/config/avancado");
    await expect(page.getByTestId("settings-sound-tests")).toBeVisible();
  });

  test("âncora antiga /config#sons abre a categoria Som", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/config#sons");
    await expect(page).toHaveURL(/\/config\/som#sons$/);
  });

  test("desktop mantém a página única", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "/config");
    await expect(page.locator('[data-settings-view="full"]')).toBeVisible();
    await expect(page.getByTestId("settings-index")).toHaveCount(0);
    await expect(page.locator("#tema")).toBeVisible();
    await expect(page.getByTestId("settings-sound-tests")).toBeVisible();
  });
});
