import { test, expect, type Page } from "@playwright/test";
import { seedInterfaceLocale, seedLessonPlayerReady, waitForLazyPage } from "./helpers";

/**
 * V4.9.4 — o primeiro contato pergunta idioma UMA vez.
 *
 * A tela `/comecar` exibia dois seletores com as mesmas duas opções: um no
 * header (idioma da interface) e outro dentro do Welcome (idioma do curso).
 * A distinção é real no produto e continua valendo em Configurações, mas no
 * primeiro contato ela não tem como ser entendida — quem chega para aprender
 * mandarim não sabe que existem dois idiomas a decidir, nem qual dos dois a
 * pergunta se refere.
 *
 * Esta suíte mede a subtração: um seletor só, que decide os dois valores, e
 * uma tela com uma ação principal.
 */

const LOCALE_SELECTS = '[data-testid="interface-locale-select"], [data-testid="instruction-locale-select"]';

async function openOnboarding(page: Page, locale: "pt-BR" | "en" = "pt-BR") {
  await seedInterfaceLocale(page, locale);
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

test.describe("V4.9.4 — uma escolha de idioma no onboarding", () => {
  test("1 · existe exatamente um seletor de idioma visível", async ({ page }) => {
    await openOnboarding(page);
    await expect(page.locator(LOCALE_SELECTS)).toHaveCount(1);
  });

  test("2 · o Welcome não tem mais o cartão de idioma do curso", async ({ page }) => {
    await openOnboarding(page);
    await expect(page.getByTestId("onboarding-course-language")).toHaveCount(0);
    await expect(page.getByTestId("instruction-locale-select")).toHaveCount(0);
    // A linha "Idioma estudado: 中文" era informação fixa disfarçada de campo.
    await expect(page.getByTestId("onboarding-welcome")).not.toContainText("中文");
  });

  test("3 · PT-BR → EN muda interface, curso e copy de uma vez", async ({ page }) => {
    await openOnboarding(page, "pt-BR");
    expect(await locales(page)).toEqual({ interface: "pt-BR", instruction: "pt-BR" });

    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
    // A copy responde na hora: a escolha não fica esperando um recarregamento.
    await expect(page.getByRole("heading", { name: /find your starting point/i })).toBeVisible();
  });

  test("4 · EN → PT-BR faz o inverso", async ({ page }) => {
    await openOnboarding(page, "en");
    expect(await locales(page)).toEqual({ interface: "en", instruction: "en" });

    await page.getByTestId("interface-locale-select").selectOption("pt-BR");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "pt-BR");
    await expect(page.getByRole("heading", { name: /encontrar seu ponto de partida/i })).toBeVisible();
  });

  test("5 · a escolha atravessa welcome → goal → level → quiz, sem perguntar de novo", async ({
    page,
  }) => {
    await openOnboarding(page, "pt-BR");
    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByRole("button", { name: /^Get started$/i }).click();
    await expect(page.locator(LOCALE_SELECTS)).toHaveCount(1);
    await page.getByTestId("onboarding-choice-travel").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();
    await expect(page.locator(LOCALE_SELECTS)).toHaveCount(1);
    await page.getByTestId("onboarding-choice-zero").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    // Em nenhuma etapa apareceu uma segunda pergunta de idioma.
    await expect(page.locator(LOCALE_SELECTS)).toHaveCount(1);
    expect(await locales(page)).toEqual({ interface: "en", instruction: "en" });
  });

  test("6 · recarregar a página mantém a escolha", async ({ page }) => {
    // Semeadura só no primeiro documento.
    //
    // `seedInterfaceLocale` regrava o valor a cada navegação, então um reload
    // desfazia a escolha do usuário e o teste mediria o próprio andaime em vez
    // do produto. `seedInstructionLocale` já guarda contra isso; aqui a mesma
    // guarda é aplicada ao idioma da interface, sem mexer no helper
    // compartilhado — o que a asserção quer saber é se a escolha PERSISTE.
    await page.addInitScript(() => {
      if (localStorage.getItem("longyu:interface-locale") === null) {
        localStorage.setItem("longyu:interface-locale", "pt-BR");
      }
    });
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.getByTestId("onboarding-welcome")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.reload();
    await waitForLazyPage(page);
    expect(await locales(page)).toEqual({ interface: "en", instruction: "en" });
    await expect(page.getByTestId("interface-locale-select")).toHaveValue("en");
  });

  test("7 · o placement recebe o idioma escolhido", async ({ page }) => {
    await openOnboarding(page, "pt-BR");
    await page.getByTestId("interface-locale-select").selectOption("en");

    await page.getByRole("button", { name: /^Get started$/i }).click();
    await page.getByTestId("onboarding-choice-travel").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();
    await page.getByTestId("onboarding-choice-zero").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // As perguntas do placement são conteúdo de instrução, não chrome: se elas
    // saíssem em português, o seletor teria mudado só a moldura.
    await expect(page.getByTestId("placement-quiz")).toBeVisible();
    await expect(page.getByText(/Question 1/i)).toBeVisible();
    await expect(page.getByText(/Pergunta 1/)).toHaveCount(0);
    expect((await locales(page)).instruction).toBe("en");
  });

  test("8 · a escolha do onboarding fica persistida para a criação de conta", async ({ page }) => {
    await openOnboarding(page, "pt-BR");
    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");

    // O contrato de locale que o cadastro envia lê estas chaves; o onboarding
    // precisa deixar as duas coerentes antes de chegar lá.
    const stored = await page.evaluate(() => ({
      interface: localStorage.getItem("longyu:interface-locale"),
      instruction: localStorage.getItem("longyu:instruction-locale"),
    }));
    expect(stored).toEqual({ interface: "en", instruction: "en" });
  });

  test("9 · depois do onboarding, Configurações ainda separa os dois idiomas", async ({ page }) => {
    // A simplificação é do primeiro contato, não do produto: quem quiser a
    // interface num idioma e o curso em outro continua podendo.
    await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });
    await page.goto("/ajustes");
    await waitForLazyPage(page);

    await expect(page.getByTestId("interface-locale-select")).toBeVisible();
    await expect(page.getByTestId("instruction-locale-select")).toBeVisible();

    await page.getByTestId("instruction-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
    await page.getByTestId("interface-locale-select").selectOption("pt-BR");
    // Escolha manual de curso continua sendo soberana sobre a da interface.
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
  });

  test("10 · o Longyu aparece uma vez só na primeira tela", async ({ page }) => {
    await openOnboarding(page);
    const wordmarks = await page.getByText(/^Longyu$/).count();
    expect(wordmarks, "o wordmark do header e o do hero estavam duplicando a marca").toBe(1);
  });

  test("13 · a escolha vale mesmo para quem já tinha escolhido o curso antes", async ({ page }) => {
    // Este é o caso que o seletor do onboarding existe para resolver, e o que
    // eu tinha deixado sem cobertura.
    //
    // `setLocale` propaga para o curso através de `followInterfaceLocale`, que
    // respeita um override manual anterior. Numa sessão nova não há override,
    // então mudar só a interface já parecia funcionar — e os testes 3 e 4
    // passavam mesmo com a sincronização explícita removida. Para quem já tinha
    // fixado o curso à mão, porém, escolher "English" no onboarding deixaria a
    // interface em inglês e o curso em português: as duas metades da mesma
    // escolha discordando.
    await page.addInitScript(() => {
      localStorage.setItem("longyu:interface-locale", "pt-BR");
      localStorage.setItem("longyu:instruction-locale", "pt-BR");
      localStorage.setItem("longyu:instruction-locale-user-override", "1");
    });
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.getByTestId("onboarding-welcome")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
  });

  test("11 · 390×844: o topo cabe sem o seletor dominar a largura", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOnboarding(page);

    const select = page.getByTestId("interface-locale-select");
    const box = await select.boundingBox();
    expect(box, "seletor sem caixa").not.toBeNull();
    // Continua tocável, sem tomar a barra de progresso para si.
    expect(box!.height).toBeGreaterThanOrEqual(40);
    expect(box!.width).toBeLessThanOrEqual(390 * 0.5);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("12 · o seletor continua alcançável e rotulado para leitor de tela", async ({ page }) => {
    await openOnboarding(page);
    const select = page.getByTestId("interface-locale-select");
    await select.focus();
    await expect(select).toBeFocused();
    // Sem rótulo visível, o nome acessível ainda precisa existir.
    const name = await select.evaluate((el) => {
      const id = el.getAttribute("id");
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      return label?.textContent?.trim() ?? "";
    });
    expect(name.length).toBeGreaterThan(0);
  });
});
