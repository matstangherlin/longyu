import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedInterfaceLocale, waitForLazyPage } from "./helpers";

/**
 * V4.10A.1 — as superfícies comerciais novas, no tamanho em que a maioria vai
 * abri-las (P27), nos dois idiomas (P28) e com o que a navegação por teclado
 * precisa encontrar (P29).
 *
 * O viewport é fixado em 390×844 de propósito: é o iPhone que mais aparece nos
 * dados de acesso brasileiros, e é onde uma tabela larga demais transforma a
 * página inteira em rolagem lateral.
 */
const PHONE = { width: 390, height: 844 };

async function openPro(page: import("@playwright/test").Page) {
  await page.goto("/pro");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-pro-page]")).toBeVisible();
}

test.describe("V4.10A.1 — superfícies comerciais", () => {
  test.use({ viewport: PHONE });

  test("planos mostram o preço aprovado e o ciclo troca o valor", async ({ page }) => {
    await openPro(page);

    // Anual é o padrão: dez meses, não doze.
    await expect(page.locator("[data-plan-price='pro']")).toContainText("170");
    await expect(page.locator("[data-plan-price='family']")).toContainText("270");

    await page.getByTestId("billing-cycle-switch").getByRole("button", { name: /mensal|monthly/i }).click();
    await expect(page.locator("[data-plan-price='pro']")).toContainText("17");
    await expect(page.locator("[data-plan-price='family']")).toContainText("27");

    // O valor mostrado nunca é "a definir": ele está aprovado.
    await expect(page.locator("[data-pro-page]")).not.toContainText(/Preço a definir|Price pending/i);
  });

  test("mercado internacional troca a moeda sem converter câmbio", async ({ page }) => {
    await openPro(page);
    await page.getByLabel(/País de cobrança|Billing country/i).selectOption("US");
    await expect(page.locator("[data-plan-price='pro']")).toContainText("$");
    await expect(page.locator("[data-plan-price='pro']")).toContainText("50");
    await expect(page.locator("[data-plan-price='pro']")).not.toContainText("R$");
  });

  test("cada plano declara o que ele é hoje", async ({ page }) => {
    await openPro(page);
    // Free existe de verdade; Pro e Família ainda não têm caminho de compra;
    // Business é piloto por contrato. Cada rótulo sai do registro de verdade.
    await expect(page.locator("[data-plan-availability='free']")).toHaveText(/Disponível|Available/i);
    await expect(page.locator("[data-plan-availability='pro']")).toHaveText(/Em breve|Coming soon/i);
    await expect(page.locator("[data-plan-availability='family']")).toHaveText(/Em breve|Coming soon/i);
    await expect(page.locator("[data-plan-availability='business']")).toHaveText(/Piloto|Pilot/i);
  });

  test("a página não rola de lado no celular", async ({ page }) => {
    await openPro(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("o seletor de ciclo é anunciado como grupo e marca o estado", async ({ page }) => {
    await openPro(page);
    const group = page.getByTestId("billing-cycle-switch");
    await expect(group).toHaveAttribute("role", "group");
    const annual = group.getByRole("button", { name: /anual|annual/i });
    const monthly = group.getByRole("button", { name: /mensal|monthly/i });
    await expect(annual).toHaveAttribute("aria-pressed", "true");
    await monthly.click();
    await expect(monthly).toHaveAttribute("aria-pressed", "true");
    await expect(annual).toHaveAttribute("aria-pressed", "false");
  });

  test("em inglês a tela comercial não volta para o português", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await openPro(page);
    await expect(page.locator("[data-pro-page]")).toContainText(/Billing cycle|Monthly|Annual/i);
    await expect(page.locator("[data-pro-page]")).not.toContainText(/Ciclo de cobrança/i);
  });

  test("a porta do painel Business leva ao login com destino", async ({ page }) => {
    await page.goto("/business/login");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const cta = page.locator("[data-business-login]").getByRole("link", { name: /entrar|sign in/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /\/login\?next=%2Fbusiness%2Fdashboard/);
  });

  test("o link de convite Family sobrevive a quem ainda não entrou", async ({ page }) => {
    // Sem isto o token morre no onboarding: a pessoa clica no convite, cai em
    // /comecar e o link some da URL.
    await page.goto("/familia/convite/token-de-teste-sem-backend");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page).toHaveURL(/\/familia\/convite\//);
    await expect(page.locator("[data-family-invite-page]")).toBeVisible();
  });
});
