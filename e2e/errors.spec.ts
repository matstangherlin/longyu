import { test, expect } from "@playwright/test";
import { seedOnboardedSession } from "./helpers";

const STORE_VERSION = 12;

test.describe("recuperação de crash", () => {
  test("ErrorBoundary aparece, recupera jornada e preserva progresso local", async ({ page }) => {
    await seedOnboardedSession(page, ["l1", "p1-o-que-e-mandarim"]);

    await page.addInitScript(() => {
      localStorage.setItem("longyu:e2e-force-crash", "1");
    });

    await page.goto("/jornada");

    await expect(page.getByRole("heading", { name: /O Longyu encontrou um problema/i })).toBeVisible();
    await expect(page.getByText(/Seu progresso local continua salvo/i)).toBeVisible();

    const fingerprint = await page.evaluate(() => window.__longyuErrorTest?.peekFingerprint() ?? null);
    expect(fingerprint).toBeTruthy();

    await page.evaluate(() => {
      localStorage.removeItem("longyu:e2e-force-crash");
    });

    await page.getByRole("button", { name: /Voltar à Jornada/i }).click();
    await page.waitForURL("**/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { state?: { completedLessons?: string[] } };
      return parsed.state?.completedLessons ?? [];
    });

    expect(progress).toEqual(expect.arrayContaining(["l1", "p1-o-que-e-mandarim"]));
  });

  test("botão Enviar relatório prepara fingerprint sem apagar progresso", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);

    await page.addInitScript(() => {
      localStorage.setItem("longyu:e2e-force-crash", "1");
    });

    await page.goto("/jornada");
    await expect(page.getByRole("heading", { name: /O Longyu encontrou um problema/i })).toBeVisible();

    await page.getByRole("button", { name: /Enviar relatório/i }).click();
    await expect(page.getByText(/Relatório preparado/i)).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("longyu-v1"));
    expect(stored).toContain(`"version":${STORE_VERSION}`);
    expect(stored).toContain("l1");
  });
});
