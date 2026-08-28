import { test, expect } from "@playwright/test";
import { seedLegacyLocalProgress, seedMissingDraftFinalize, seedOnboardedSession, seedPendingCloudOnboarding, waitForLazyPage } from "./helpers";

test.describe("TEST-032 — route guard cloud-first", () => {
  for (const path of ["/jornada", "/licao/p1-o-que-e-mandarim/player", "/treino", "/revisao", "/missoes"]) {
    test(`anônimo em ${path} não vê conteúdo privado`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/(comecar|login|salvar-progresso|finalizar-cadastro)(\?|$)/, { timeout: 15_000 });
      await expect(page.getByTestId("auth-gate")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /Jornada|Treino|Revisão|Missões/i })).toHaveCount(0);
    });
  }
});

test.describe("TEST-033 — funil fresco /comecar", () => {
  test("landing → começar → objetivo → self assessment, sem skip de conta", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Começar agora/i }).click();
    await page.waitForURL("**/comecar");
    await expect(page.getByRole("heading", { name: /ponto de partida/i })).toBeVisible();
    await page.getByRole("button", { name: /^Começar/i }).click();
    await expect(page.getByText(/Por que você quer aprender mandarim/i)).toBeVisible();
    await page.getByRole("button", { name: /Preparar uma viagem/i }).click();
    await page.getByRole("button", { name: /^Continuar/i }).click();
    await expect(page.getByText(/Quanto mandarim você já sabe/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Deixar para depois/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Continuar sem conta/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Nunca estudei mandarim/i }).click();
    await page.getByRole("button", { name: /^Continuar/i }).click();
    await expect(page.getByText(/Pergunta 1/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Deixar para depois/i })).toHaveCount(0);
  });

  test("conta é obrigatória após o resultado; backend local falha fechado", async ({ page }) => {
    await page.goto("/comecar");
    await page.getByRole("button", { name: /^Começar/i }).click();
    await page.getByRole("button", { name: /Preparar uma viagem/i }).click();
    await page.getByRole("button", { name: /^Continuar/i }).click();
    await page.getByRole("button", { name: /Nunca estudei mandarim/i }).click();
    await page.getByRole("button", { name: /^Continuar/i }).click();

    for (let i = 0; i < 12; i += 1) {
      const result = page.getByText(/Encontramos seu ponto de partida/i);
      if (await result.isVisible().catch(() => false)) break;
      const option = page.locator('button[aria-pressed]').first();
      await option.click({ timeout: 8_000 });
      await page.getByRole("button", { name: /^Confirmar/i }).click();
    }

    await expect(page.getByText(/Encontramos seu ponto de partida/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Deixar para depois|Continuar sem conta/i })).toHaveCount(0);
    await page.getByTestId("create-account-cta").click();
    await expect(page.getByRole("heading", { name: /Crie sua conta para salvar o resultado/i })).toBeVisible();
    await page.getByPlaceholder("Ex.: Matheus").fill("Ana Teste");
    await page.locator('input[type="email"]').fill("ana.teste@example.com");
    await page.locator('input[type="password"]').first().fill("senha123");
    await page.locator('input[type="password"]').nth(1).fill("senha123");
    await page.getByRole("button", { name: /Criar minha conta e salvar o resultado/i }).click();
    await expect(
      page.getByText(/Não foi possível conectar ao Longyu agora|We could not reach Longyu right now/i)
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/jornada/);
  });
});

test.describe("TEST-034 — migração local legado", () => {
  test("não entra na Jornada; pede para salvar progresso", async ({ page }) => {
    await seedLegacyLocalProgress(page);
    await page.goto("/");
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/salvar-progresso/);
    await expect(page.getByRole("heading", { name: /Salve seu progresso para continuar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Criar conta/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Já tenho uma conta/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Jornada/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Criar conta/i }).click();
    await page.waitForURL(/\/comecar/);
    await expect(page.getByRole("heading", { name: /Crie sua conta para salvar o resultado/i })).toBeVisible();
  });
});

test.describe("AUTH-003 — logout não vira conta local", () => {
  test("sair volta à landing e /jornada não mostra progresso anterior", async ({ page, context }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/jornada/);
    await expect(page.getByRole("heading", { level: 1, name: "Primeiro contato" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sair$/i })).toBeVisible();
    await page.getByRole("button", { name: /^Sair$/i }).click();
    await page.waitForURL(/\/$/);
    await expect(page.getByRole("link", { name: /Começar agora/i })).toBeVisible();

    // seedOnboardedSession regrava o store em todo goto desta page. Prova o
    // localStorage já limpo numa page nova do mesmo origin.
    const guest = await context.newPage();
    await guest.goto("/jornada");
    await guest.waitForURL(/\/(comecar|login|salvar-progresso|finalizar-cadastro)(\?|$)/, { timeout: 15_000 });
    await expect(guest.getByRole("heading", { level: 1, name: "Primeiro contato" })).toHaveCount(0);
    await expect(guest.getByRole("button", { name: /^Sair$/i })).toHaveCount(0);
    await guest.close();
  });
});

test.describe("TEST-025 — sessao cloud sem onboarding nao abre Journey", () => {
  for (const path of ["/jornada", "/licao/p1-o-que-e-mandarim/player", "/treino", "/revisao", "/missoes"]) {
    test(`pending em ${path} vai para /finalizar-cadastro`, async ({ page }) => {
      await seedPendingCloudOnboarding(page);
      await page.goto(path);
      await page.waitForURL(/\/finalizar-cadastro/, { timeout: 15_000 });
      await expect(page.getByTestId("auth-gate")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /Jornada|Treino|Revisão|Missões/i })).toHaveCount(0);
      await expect(page.getByTestId("finalize-onboarding")).toBeVisible();
      await expect(page.getByRole("heading", { name: /ponto de partida/i })).toBeVisible();
    });
  }
});

test.describe("TEST-026 — draft ausente falha fechado", () => {
  test("nao marca onboarding e oferece refazer o teste", async ({ page }) => {
    await seedMissingDraftFinalize(page);
    await page.goto("/finalizar-cadastro");
    await expect(page.getByTestId("finalize-onboarding")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Precisamos finalizar seu ponto de partida/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Tentar novamente/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Refazer teste de nivelamento/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/jornada/);
    await page.getByRole("link", { name: /Refazer teste de nivelamento/i }).click();
    await page.waitForURL(/\/comecar\?refazer=1/);
    await expect(page.getByRole("heading", { name: /ponto de partida/i })).toBeVisible();
  });
});

