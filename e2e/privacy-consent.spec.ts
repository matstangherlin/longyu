import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";

test.describe("privacy consent", () => {
  test("sem escolha: modal aparece e padrão não envia telemetria", async ({ page }) => {
    await seedOnboardedSession(page, []);
    // Remove a decisão padrão dos helpers para simular primeiro acesso.
    await page.addInitScript(() => {
      localStorage.removeItem("longyu:telemetry-consent");
    });
    await page.goto("/jornada");
    await expect(page.getByRole("heading", { name: /Ajude a melhorar o Longyu/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Permitir dados de melhoria/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Agora não/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ver detalhes/i })).toBeVisible();

    const consent = await page.evaluate(() => localStorage.getItem("longyu:telemetry-consent"));
    expect(consent).toBeNull();
  });

  test("Agora não grava escolha false e limpa necessidade do modal", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.addInitScript(() => {
      localStorage.removeItem("longyu:telemetry-consent");
    });
    await page.goto("/jornada");
    await page.getByRole("button", { name: /Agora não/i }).click();
    await expect(page.getByRole("heading", { name: /Ajude a melhorar o Longyu/i })).toHaveCount(0);

    const consent = await page.evaluate(() => localStorage.getItem("longyu:telemetry-consent"));
    expect(consent).toBe("0");
  });

  test("ajustes: privacidade permite revogar e limpar fila", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.addInitScript(() => {
      localStorage.setItem("longyu:telemetry-consent", "1");
      localStorage.setItem(
        "longyu:beta-pedagogy-queue",
        JSON.stringify([{ eventType: "lesson_started", attempts: 0 }])
      );
    });
    await page.goto("/ajustes#privacidade-dados");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.locator("#privacidade-dados").scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(page.getByText(/Privacidade e dados/i).first()).toBeVisible();
    await expect(page.getByText(/Dados pedagógicos de melhoria/i)).toBeVisible();

    // Medalhas podem reaparecer após hidratação (WebKit/Firefox) e bloquear o switch.
    for (let i = 0; i < 8; i += 1) {
      await dismissBlockingOverlays(page);
      await page.keyboard.press("Escape").catch(() => undefined);
      if ((await page.locator('[role="dialog"][aria-modal="true"]').count()) === 0) break;
      await page.waitForTimeout(200);
    }
    const toggle = page.getByRole("switch", { name: /Dados pedagógicos de melhoria/i });
    await expect(toggle).toBeVisible();
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click({ timeout: 8_000, force: true });
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("longyu:telemetry-consent")), {
        timeout: 10_000,
      })
      .toBe("0");
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("longyu:beta-pedagogy-queue")), {
        timeout: 10_000,
      })
      .toBeNull();
  });

  test("feedback manual abre sem depender da telemetria", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/jornada");
    await page.getByLabel(/Enviar feedback/i).click();
    await expect(page.getByRole("heading", { name: /Feedback beta/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Enviar$/i })).toBeVisible();
  });
});
