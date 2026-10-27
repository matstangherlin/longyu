import { expect, test } from "@playwright/test";
import { seedOnboardedSession, waitForLazyPage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("longyu:e2e-social-surface", "0");
    localStorage.setItem("longyu:e2e-business-surface", "0");
  });
});

test("social e business desligados somem do perfil e do Mais @qa-social", async ({ page }) => {
  await seedOnboardedSession(page, ["l1"]);
  await page.goto("/perfil");
  await waitForLazyPage(page);
  await expect(page.getByTestId("profile-friends-link")).toHaveCount(0);
  await expect(page.getByTestId("profile-friends-card")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-social-perfil-${test.info().project.name}.png` });
  await expect(page.getByRole("link", { name: /^Amigos$/ })).toHaveCount(0);

  await page.goto("/amigos");
  await expect(page).toHaveURL(/\/perfil$/);
  await page.goto("/convide");
  await expect(page).toHaveURL(/\/perfil$/);

  await page.goto("/mais");
  await waitForLazyPage(page);
  await expect(page.getByRole("link", { name: /^Amigos$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Convide amigos/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Para empresas|Business/i })).toHaveCount(0);

  await page.goto("/business");
  await expect(page).not.toHaveURL(/\/business/);
});

test("404 tem noindex, título e a rota real no relato @qa-social", async ({ page }) => {
  await page.goto("/rota-inexistente");
  await waitForLazyPage(page);
  await expect(page.getByRole("heading", { name: "Esta página não está aqui" })).toBeVisible();
  await expect(page).toHaveTitle(/Página não encontrada/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: "Jornada" })).toBeVisible();
  await page.getByTestId("report-problem").click();
  await expect(page.getByTestId("feedback-technical")).toContainText("/rota-inexistente");
  await expect(page.getByTestId("feedback-technical")).not.toContainText("/404");
  await page.screenshot({ path: `test-results/qa-social-404-${test.info().project.name}.png` });
});

test("/configuracoes abre os ajustes @qa-social", async ({ page }) => {
  await seedOnboardedSession(page, ["l1"]);
  await page.goto("/configuracoes");
  await waitForLazyPage(page);
  await expect(page).toHaveURL(/\/ajustes$/);
});
