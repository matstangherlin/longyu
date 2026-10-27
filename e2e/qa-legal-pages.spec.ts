import { expect, test } from "@playwright/test";
import { seedCourseDirection, startExperiencedPlacement, waitForLazyPage } from "./helpers";

test("privacidade e termos abrem sem login @qa-legal", async ({ page }) => {
  await page.goto("/privacidade");
  await waitForLazyPage(page);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByTestId("privacy-controller")).toContainText("[PREENCHER:");
  await expect(page.getByTestId("privacy-rights-mail")).toHaveAttribute("href", /mailto:beta@longyu\.app/);
  await expect(page.getByTestId("privacy-account-deletion")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ajustes|Configurações|Settings/i }).first()).toBeVisible();
  await page.getByTestId("privacy-controller").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/qa-legal-privacidade-${test.info().project.name}.png` });

  await page.goto("/termos");
  await waitForLazyPage(page);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByTestId("terms-minors")).toContainText("18");
  await expect(page.getByTestId("terms-subscription")).toContainText(/cobrança/i);
  await expect(page.getByTestId("terms-venue")).toContainText("[PREENCHER:");
});

test("cadastro sem 18 anos não envia a conta @qa-legal", async ({ page }) => {
  test.setTimeout(90_000);
  await seedCourseDirection(page, "pt-zh");
  await page.goto("/comecar");
  await startExperiencedPlacement(page);
  for (let i = 0; i < 12; i += 1) {
    const result = page.getByText(/Encontramos seu ponto de partida/i).first();
    if (await result.isVisible().catch(() => false)) break;
    await page.locator("button[aria-pressed]").first().click({ timeout: 8_000 });
    await page.getByRole("button", { name: /^Confirmar/i }).click();
  }
  await page.getByTestId("create-account-cta").click();
  await page.getByPlaceholder("Ex.: Mariana", { exact: true }).fill("Ana Teste");
  await page.locator('input[type="email"]').fill("ana.teste@example.com");
  await page.getByTestId("signup-username").fill("ana_teste");
  await page.getByTestId("signup-identity-continue").click();
  await page.locator('input[type="password"]').first().fill("senha123");
  await page.locator('input[type="password"]').nth(1).fill("senha123");
  await page.getByTestId("signup-submit").click();
  await expect(page.getByText("A beta fechada é só para quem tem 18 anos ou mais.")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-legal-idade-${test.info().project.name}.png` });
  await page.getByTestId("signup-adult").check();
  await expect(page.getByRole("link", { name: "Termos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacidade" })).toBeVisible();
});
