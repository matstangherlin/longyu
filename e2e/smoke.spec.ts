import { test, expect } from "@playwright/test";
import { seedLeagueDemoSession, seedOnboardedSession } from "./helpers";

test.describe("smoke", () => {
  test("app abre onboarding ou jornada", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Longyu|Mandarim com som/i).first()).toBeVisible();
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
