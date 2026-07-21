import { test, expect } from "@playwright/test";
import { seedLeagueDemoSession, seedOnboardedSession } from "./helpers";

test.describe("smoke", () => {
  test("app abre onboarding ou jornada", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Longyu|Mandarim com som/i).first()).toBeVisible();
  });

  test("usuário novo vê landing pública em /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Começar agora/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Já tenho uma conta/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ativar modo escuro/i })).toBeVisible();
    // Página pública: sem sidebar/tab bar.
    await expect(page.locator("nav")).toHaveCount(0);
  });

  test("landing alterna e persiste os modos escuro e claro", async ({ page }) => {
    await page.goto("/");
    const root = page.locator("html");

    await page.getByRole("button", { name: "Ativar modo escuro" }).click();
    await expect(root).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Ativar modo claro" })).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(root).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Ativar modo claro" }).click();
    await expect(root).toHaveAttribute("data-theme", "clay");
    await expect(page.getByRole("button", { name: "Ativar modo escuro" })).toHaveAttribute("aria-pressed", "false");
  });

  test("mascote pisca sobre a arte integral sem recorte de braço", async ({ page }) => {
    await page.goto("/");
    const mascot = page.locator('[data-mascot-animated="true"]:visible').first();
    await expect(mascot).toBeVisible();

    const closedEyes = mascot.getByTestId("mascot-eyes-closed");
    await expect(closedEyes).toHaveCount(1);
    await expect(closedEyes).toHaveAttribute("src", "/longyu-eyes-closed.svg");
    await expect.poll(async () => closedEyes.evaluate((node) =>
      getComputedStyle(node).animationName === "mascot-eye-blink"
    )).toBe(true);

    const body = mascot.getByTestId("mascot-body");
    await expect(body).toHaveCount(1);
    await expect(body).toHaveAttribute("src", "/longyu-mascot.png");
    await expect(mascot.getByTestId("mascot-hand")).toHaveCount(0);
    await expect(mascot.locator('img[src="/longyu-body.png"]')).toHaveCount(0);
    await expect(mascot.locator('img[src="/longyu-hand-wave.png"]')).toHaveCount(0);
  });

  test("landing: Começar agora vai para /conta", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Começar agora/i }).click();
    await page.waitForURL("**/conta");
    await expect(page.getByRole("button", { name: /Começar/i })).toBeVisible();
  });

  test("landing: Já tenho uma conta vai para /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Já tenho uma conta/i }).click();
    await page.waitForURL("**/login");
    await expect(page.getByRole("heading", { name: /Entrar na conta/i })).toBeVisible();
  });

  test("modo foco esconde chrome na lição", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await expect(page.locator("nav")).toHaveCount(0);
    await expect(page.getByLabel(/Enviar feedback/i)).toHaveCount(0);
    await expect(page.getByLabel(/Sair/i)).toBeVisible();
    await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible();
  });

  test("usuário com conta em / vai para /jornada", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/");
    await page.waitForURL("**/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("página Pro vende o plano comercial, sem Pro Preview", async ({ page }) => {
    await seedOnboardedSession(page);
    await page.goto("/pro");
    await expect(page.getByRole("heading", { name: /30 dias grátis/i })).toBeVisible();
    await expect(page.getByText(/30 dias grátis/i).first()).toBeVisible();
    await expect(page.getByText(/Pro Preview/i)).toHaveCount(0);
  });

  test("ligas demo mostra XP semanal após estudo", async ({ page }) => {
    await seedLeagueDemoSession(page, 15);
    await page.goto("/ligas");
    await expect(page.getByText("15").first()).toBeVisible();
    await expect(page.getByText(/XP/i).first()).toBeVisible();
  });

  test("rota de conta responde", async ({ page }) => {
    await page.goto("/conta");
    await expect(page.getByRole("button", { name: /Começar/i })).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("jornada renderiza em 360px", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("player da primeira lição cabe em 360px", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
  });

  test("ligas renderiza em 360px", async ({ page }) => {
    await seedLeagueDemoSession(page, 12);
    await page.goto("/ligas");
    await expect(page.getByRole("heading", { name: /Liga Bronze/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();
  });

  test("página Pro cabe em 360px", async ({ page }) => {
    await seedOnboardedSession(page);
    await page.goto("/pro");
    await expect(page.getByRole("heading", { name: /30 dias grátis/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Começar 30 dias grátis|Em breve/i })).toBeVisible();
  });
});
