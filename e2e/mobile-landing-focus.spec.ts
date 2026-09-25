import { expect, test, type Page } from "@playwright/test";
import { seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14 · A–I — primeira dobra da landing no celular: marca, dragão,
 * promessa, teste guiado e "Já tenho uma conta". Sem cards de benefício,
 * BetaNotice, tema ou rodapé na primeira dobra.
 */
const VIEWPORTS = [
  [360, 740],
  [360, 800],
  [390, 844],
  [412, 915],
  [432, 960],
] as const;

async function openLanding(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await seedTelemetryDeclined(page);
  await page.goto("/");
  await waitForLazyPage(page);
  await expect(page.getByTestId("mobile-welcome")).toBeVisible();
}

async function inFirstFold(page: Page, testId: string, height: number) {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, `${testId} ausente`).not.toBeNull();
  expect(box!.y, `${testId} acima do topo`).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, `${testId} abaixo da dobra`).toBeLessThanOrEqual(height);
}

for (const [width, height] of VIEWPORTS) {
  test(`landing ${width}×${height}: como começar está na primeira dobra`, async ({ page }) => {
    await openLanding(page, width, height);
    await inFirstFold(page, "mobile-welcome-header", height);
    await inFirstFold(page, "landing-guided-try", height);
    await inFirstFold(page, "landing-has-account", height);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("landing-guided-try")).toHaveText(/Fazer teste guiado · 2 min/);
    // Fora da primeira dobra (ou fora da tela no celular).
    await expect(page.getByText("Comece pelo básico")).toBeHidden();
    await expect(page.getByRole("button", { name: /modo escuro|modo claro|dark mode|light mode/i })).toBeHidden();
    const footer = await page.locator('[data-testid="mobile-welcome"] footer').boundingBox();
    expect(footer!.y).toBeGreaterThanOrEqual(height - 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/rc2-2-14/landing-${width}x${height}.png` });
  });
}

test("idioma compacto abre folha e troca para EN", async ({ page }) => {
  await openLanding(page, 390, 844);
  const button = page.getByTestId("landing-locale-button");
  await expect(button).toHaveText(/PT-BR/);
  const box = await button.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);
  await button.click();
  await expect(page.getByTestId("landing-locale-sheet")).toBeVisible();
  await page.locator('[data-locale-option="en"]').click();
  await expect(page.getByTestId("landing-locale-sheet")).toHaveCount(0);
  await expect(page.getByTestId("landing-guided-try")).toHaveText(/guided try/i);
  await expect(button).toHaveText(/EN/);
});

test("desktop mantém a landing de duas colunas com o teste guiado como opção", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedTelemetryDeclined(page);
  await page.goto("/");
  await waitForLazyPage(page);
  await expect(page.getByTestId("landing-hero")).toBeVisible();
  await expect(page.getByRole("link", { name: /Começar agora/i })).toBeVisible();
  await expect(page.getByTestId("landing-guided-try-desktop")).toBeVisible();
  await expect(page.getByTestId("mobile-welcome")).toBeHidden();
});
