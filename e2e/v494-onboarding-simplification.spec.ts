import { test, expect, type Page } from "@playwright/test";
import { seedCourseDirection, seedLessonPlayerReady, switchCourseInSettings, switchInterfaceLocaleInSettings, waitForLazyPage, startExperiencedPlacement } from "./helpers";

/**
 * V4.9.4 → RC2.2.14B — o primeiro contato decide idioma UMA vez, e agora sem
 * seletor nenhum no onboarding.
 *
 * V4.9.4 trocou dois seletores por um só que decidia interface e curso. A
 * RC2.2.14B separa de vez: a INTERFACE segue o idioma do sistema (Configurações
 * › Idioma do aplicativo para mudar) e o CURSO é escolhido uma vez, antes do
 * primeiro aprendizado. O onboarding só mostra o curso, com "Alterar"
 * discreto — nada de perguntar "qual idioma?" de novo.
 */

async function openOnboarding(page: Page, course: "pt-zh" | "en-zh" = "pt-zh") {
  await seedCourseDirection(page, course);
  await page.goto("/comecar");
  await waitForLazyPage(page);
  await expect(page.getByTestId("onboarding-welcome")).toBeVisible({ timeout: 15_000 });
}

/** Os dois valores de idioma, lidos do DOM (a fonte que a aplicação publica). */
async function locales(page: Page) {
  return page.evaluate(() => ({
    interface: document.documentElement.lang,
    instruction: document.documentElement.dataset.instructionLocale,
  }));
}

test.describe("V4.9.4 / RC2.2.14B — idioma decidido uma vez", () => {
  test("1 · o onboarding não tem seletor de idioma", async ({ page }) => {
    await openOnboarding(page);
    await expect(page.locator("select")).toHaveCount(0);
    await expect(page.getByTestId("course-direction-chip")).toBeVisible();
  });

  test("2 · o Welcome não tem cartão de idioma do curso", async ({ page }) => {
    await openOnboarding(page);
    await expect(page.getByTestId("onboarding-course-language")).toHaveCount(0);
    await expect(page.getByTestId("onboarding-welcome")).not.toContainText("中文");
  });

  test("3 · aparelho PT + curso en-zh: interface PT, instrução EN", async ({ page }) => {
    await openOnboarding(page, "en-zh");
    expect(await locales(page)).toEqual({ interface: "pt-BR", instruction: "en" });
    await expect(page.getByRole("heading", { name: /encontrar seu ponto de partida/i })).toBeVisible();
  });

  test("4 · sem curso escolhido, /comecar pede o curso primeiro", async ({ page }) => {
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/curso\?next=%2Fcomecar/);
  });

  test("5 · a escolha atravessa welcome → meta → teste de nível → quiz sem perguntar de novo", async ({ page }) => {
    await openOnboarding(page, "en-zh");
    await startExperiencedPlacement(page);
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.locator("select")).toHaveCount(0);
    await expect(page.getByTestId("course-picker")).toHaveCount(0);
    expect((await locales(page)).instruction).toBe("en");
  });

  test("6 · recarregar a página mantém o curso", async ({ page }) => {
    await openOnboarding(page, "en-zh");
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.getByTestId("onboarding-welcome")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("course-direction-chip")).toHaveAttribute("data-course-direction", "en-zh");
  });

  test("7 · o curso escolhido fica persistido para a criação de conta", async ({ page }) => {
    await openOnboarding(page, "en-zh");
    const stored = await page.evaluate(() => ({
      instruction: localStorage.getItem("longyu:instruction-locale"),
      pending: localStorage.getItem("longyu:course-direction-pending"),
    }));
    // O cadastro envia instruction_locale derivado do curso.
    expect(stored).toEqual({ instruction: "en", pending: "en-zh" });
  });

  test("8 · Configurações separa idioma do aplicativo e curso", async ({ page }) => {
    await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });
    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    await expect(page.getByTestId("settings-interface-locale-row")).toBeVisible();
    await expect(page.getByTestId("settings-course-row")).toBeVisible();
    await switchCourseInSettings(page, "en-zh");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
    await switchInterfaceLocaleInSettings(page, "pt-BR");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
  });

  test("9 · o Longyu aparece uma vez só na primeira tela", async ({ page }) => {
    await openOnboarding(page);
    const wordmarks = await page.getByText(/^Longyu$/).count();
    expect(wordmarks, "o wordmark do header e o do hero estavam duplicando a marca").toBe(1);
  });

  test("10 · 390×844: o curso no topo não domina a largura", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOnboarding(page);
    const chip = page.getByTestId("course-direction-chip");
    const box = await chip.boundingBox();
    expect(box, "chip sem caixa").not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(40);
    expect(box!.width).toBeLessThanOrEqual(390 * 0.62);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("11 · o curso é alcançável e rotulado para leitor de tela", async ({ page }) => {
    await openOnboarding(page);
    const chip = page.getByTestId("course-direction-chip");
    await chip.focus();
    await expect(chip).toBeFocused();
    await expect(chip).toHaveAttribute("aria-label", /Curso: Português → Mandarim\. Alterar/);
  });
});
