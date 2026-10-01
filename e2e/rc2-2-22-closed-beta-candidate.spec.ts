import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.22 — Closed Beta Candidate (parte Web/E2E).
 *
 * Prova o painel de Beta QA e o relato "Encontrou um problema?" no navegador.
 * Nada disso é PHYSICAL PASS nem sessão humana: é o instrumento que o tester
 * vai usar no aparelho.
 */
const STORE_VERSION = 21;

async function seed(page: Page) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      guidance: { version: 2, enabled: false, initialized: true, records: {} },
      completedLessons: ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin"],
    },
    version: STORE_VERSION,
  });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc2222-seeded")) return;
    sessionStorage.setItem("rc2222-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function openQa(page: Page) {
  await page.goto("/qa/device");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

test.describe("RC2.2.22 · Beta QA em /qa/device", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("recursos em repouso, carga da sessão e velocidade percebida", async ({ page }) => {
    await seed(page);
    await openQa(page);
    const panel = page.getByTestId("qa-beta-console");
    await expect(panel).toBeVisible();
    // Web: sem contadores nativos; os do JS em repouso = 0.
    await expect(panel).toHaveAttribute("data-idle-leaks", "");
    await expect(page.locator('[data-qa-resource="activeObservers"]')).toHaveText("0");
    await expect(page.getByTestId("qa-session-load")).toContainText("orientações 0/2");
    await page.locator('[data-perceived-speed="SLOW"]').click();
    await page.getByTestId("qa-mobile-refresh").click();
    await expect(page.getByTestId("qa-mobile-json")).toContainText('"perceived_speed"');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("relato: comentário com e-mail recusado; relato válido sanitizado e nunca PASS físico", async ({ page }) => {
    await seed(page);
    await openQa(page);
    const reporter = page.getByTestId("beta-issue-reporter");
    await expect(reporter).toBeVisible();
    await expect(page.locator("[data-issue-category]")).toHaveCount(9);
    await expect(page.getByTestId("beta-issue-generate")).toBeDisabled();
    await page.locator('[data-issue-category="AUDIO"]').click();
    await page.getByTestId("beta-issue-comment").fill("não ouvi; meu email é ana@exemplo.com");
    await page.getByTestId("beta-issue-generate").click();
    await expect(page.getByTestId("beta-issue-error")).toBeVisible();
    await expect(reporter).toHaveAttribute("data-issue-state", "draft");

    await page.getByTestId("beta-issue-comment").fill("toquei no alto-falante e não saiu som");
    await page.getByTestId("beta-issue-generate").click();
    await expect(reporter).toHaveAttribute("data-issue-state", "ready");
    const text = (await page.getByTestId("beta-issue-json").textContent()) ?? "";
    const packet = JSON.parse(text) as { category: string; physicalPass: boolean; context: Record<string, string> };
    expect(packet.category).toBe("AUDIO");
    expect(packet.physicalPass).toBe(false);
    expect(packet.context.route).toBe("/qa/device");
    expect(packet.context.viewport).toBe("390x844");
    expect(text).not.toMatch(/@|password|senha|"otp"|access_token|refresh_token|transcript/i);
  });

  test("a entrada flutuante não aparece fora do build de tester", async ({ page }) => {
    await seed(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.getByTestId("beta-issue-entry")).toHaveCount(0);
  });
});
