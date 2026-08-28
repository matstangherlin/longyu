import { test, expect } from "@playwright/test";
import { seedInterfaceLocale, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

async function completePlacement(page: import("@playwright/test").Page) {
  for (let i = 0; i < 16; i += 1) {
    const result = page.getByTestId("placement-result");
    if (await result.isVisible().catch(() => false)) return;
    const option = page.locator("[data-testid^='placement-option-']").first();
    await option.click({ timeout: 8_000 });
    await page.getByRole("button", { name: /^(Confirmar|Confirm)$/i }).click();
  }
}

test.describe("V4.8.1 onboarding + Placement i18n", () => {
  test.beforeEach(async ({ page }) => {
    await seedTelemetryDeclined(page);
  });

  test("onboarding PT-BR: /comecar → goal → self-assessment → Placement → result", async ({ page }) => {
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { name: /ponto de partida/i })).toBeVisible();
    await page.getByRole("button", { name: /^Começar$/i }).click();
    await expect(page.getByText(/Por que você quer aprender mandarim/i)).toBeVisible();
    await page.getByTestId("onboarding-choice-travel").click();
    await page.getByRole("button", { name: /^Continuar$/i }).click();
    await expect(page.getByText(/Quanto mandarim você já sabe/i)).toBeVisible();
    await page.getByTestId("onboarding-choice-zero").click();
    await page.getByRole("button", { name: /^Continuar$/i }).click();
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.getByText(/Pergunta 1/i)).toBeVisible();
    await completePlacement(page);
    await expect(page.getByTestId("placement-result")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Ponto de partida recomendado/i)).toBeVisible();
    await expect(page.getByTestId("create-account-cta")).toBeVisible();
  });

  test("onboarding EN: full funnel without Portuguese chrome leak", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(/learn Mandarin/i);
    await expect(page.getByRole("heading", { name: /right place for you to start/i })).toBeVisible();
    await expect(page.getByText(/Primeiro o Longyu encontra/)).toHaveCount(0);
    await page.getByRole("button", { name: /^Get started$/i }).click();
    await expect(page.getByText(/Why do you want to learn Mandarin/i)).toBeVisible();
    await expect(page.getByText(/Por que você quer aprender/)).toHaveCount(0);
    await page.getByTestId("onboarding-choice-travel").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();
    await expect(page.getByText(/How much Mandarin do you already know/i)).toBeVisible();
    await expect(page.getByText(/Nunca estudei mandarim/)).toHaveCount(0);
    await page.getByTestId("onboarding-choice-zero").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.getByText(/Question 1/i)).toBeVisible();
    await expect(page.getByText(/Meaning|Sound and pinyin|Tones/i).first()).toBeVisible();
    await expect(page.getByText(/Pergunta 1/)).toHaveCount(0);
    await expect(page.locator("[data-hanzi='你好'], .hanzi").first()).toBeVisible();
    await completePlacement(page);
    await expect(page.getByTestId("placement-result")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Recommended starting point/i)).toBeVisible();
    await expect(page.getByText(/Placement confidence/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Create my account and save the result/i })).toBeVisible();
    await expect(page.getByText(/Ponto de partida recomendado/)).toHaveCount(0);
    await expect(page.getByText(/Criar minha conta e salvar o resultado/)).toHaveCount(0);
    await page.getByTestId("create-account-cta").click();
    await expect(page.getByRole("heading", { name: /Create your account to save the result/i })).toBeVisible();
    await expect(page.getByText(/Crie sua conta para salvar o resultado/)).toHaveCount(0);
  });

  test("mid-flow language switch keeps goal, experience, and Placement progress", async ({ page }) => {
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await page.getByRole("button", { name: /^Começar$/i }).click();
    await page.getByTestId("onboarding-choice-travel").click();
    await page.getByRole("button", { name: /^Continuar$/i }).click();
    await page.getByTestId("onboarding-choice-zero").click();
    await page.getByRole("button", { name: /^Continuar$/i }).click();
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.getByText(/Pergunta 1/i)).toBeVisible();
    const firstOption = page.locator("[data-testid^='placement-option-']").first();
    const firstOptionId = await firstOption.getAttribute("data-testid");
    await firstOption.click();

    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText(/Question 1/i)).toBeVisible();
    await expect(page.getByText(/Pergunta 1/)).toHaveCount(0);
    await expect(page.locator(`[data-testid="${firstOptionId}"]`)).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("interface-locale-select").selectOption("pt-BR");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByText(/Pergunta 1/i)).toBeVisible();
    await expect(page.locator(`[data-testid="${firstOptionId}"]`)).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel(/Voltar|Back/i).click();
    await expect(page.getByTestId("onboarding-choice-zero")).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel(/Voltar|Back/i).click();
    await expect(page.getByTestId("onboarding-choice-travel")).toHaveAttribute("aria-pressed", "true");
  });
});
