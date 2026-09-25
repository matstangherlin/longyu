import { test, expect } from "@playwright/test";
import { seedCourseDirection, seedInterfaceLocale, seedTelemetryDeclined, waitForLazyPage, startExperiencedPlacement } from "./helpers";

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

  test("onboarding PT-BR: /comecar → já estudo → meta → Placement opt-in → result", async ({ page }) => {
    await seedCourseDirection(page, "pt-zh");
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { name: /ponto de partida/i })).toBeVisible();
    await expect(page.getByText("Quanto tempo você quer praticar por dia?")).toHaveCount(0);
    await startExperiencedPlacement(page);
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.getByText(/Pergunta 1 de/i)).toBeVisible();
    await completePlacement(page);
    await expect(page.getByTestId("placement-result")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Ponto de partida recomendado/i)).toBeVisible();
    await expect(page.getByTestId("create-account-cta")).toBeVisible();
  });

  test("onboarding EN: full funnel without Portuguese chrome leak", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedCourseDirection(page, "en-zh");
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(/learn Mandarin/i);
    await expect(page.getByRole("heading", { name: /find your starting point/i })).toBeVisible();
    await expect(page.getByText(/encontrar seu ponto de partida/)).toHaveCount(0);
    await page.getByTestId("onboarding-path-experienced").click();
    await expect(page.getByText(/How long do you want to practice each day/i)).toBeVisible();
    await expect(page.getByText(/Quanto tempo você quer praticar/)).toHaveCount(0);
    await page.locator('[data-daily-goal="10"]').click();
    await page.getByTestId("daily-goal-continue").click();
    await page.getByTestId("placement-offer-test").click();
    await expect(page.getByText(/How much Mandarin do you already know/i)).toBeVisible();
    await page.getByTestId("onboarding-choice-words").click();
    await page.getByTestId("level-continue").click();
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();
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

  // RC2.2.14B — não há mais seletor de idioma no onboarding: a interface
  // segue o sistema (aparelho em inglês → onboarding em inglês) e o curso
  // escolhido aparece com "Alterar" discreto, sem perguntar de novo.
  test.describe("EN device", () => {
    test.use({ locale: "en-US" });
    test("interface follows the system; the course is shown, not asked again", async ({ page }) => {
      await seedCourseDirection(page, "pt-zh");
      await page.goto("/comecar");
      await waitForLazyPage(page);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { name: /find your starting point/i })).toBeVisible();
      await expect(page.locator("select")).toHaveCount(0);
      await expect(page.getByTestId("course-direction-chip")).toContainText("Portuguese → Mandarin");
      await page.getByTestId("onboarding-path-experienced").click();
      await expect(page.getByTestId("daily-goal-step")).toBeVisible();
      await expect(page.getByTestId("course-direction-chip")).toHaveAttribute("data-course-direction", "pt-zh");
    });
  });
});
