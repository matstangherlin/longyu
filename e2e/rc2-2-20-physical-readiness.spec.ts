import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.20 — Physical Beta Readiness (parte Web/E2E).
 *
 * WEB/E2E PASS ≠ PHYSICAL PASS: isto prova a superfície de QA físico, os
 * contratos e os estados no navegador. Nenhum teste físico vira PASS aqui — o
 * navegador é recusado de propósito como PHYSICAL PASS.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];

async function seed(page: Page, state: Record<string, unknown> = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      guidance: { version: 2, enabled: false, initialized: true, records: {} },
      ...state,
    },
    version: STORE_VERSION,
  });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc2220-seeded")) return;
    sessionStorage.setItem("rc2220-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

test.describe("RC2.2.20 · /qa/device", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mostra build, os 12 testes NOT_RUN e a matriz crítica que não passa", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 });
    await open(page, "/qa/device");
    const surface = page.getByTestId("qa-device");
    await expect(surface).toBeVisible();
    await expect(surface).toHaveAttribute("data-physical-matrix", "NOT_PASS");
    await expect(page.locator("[data-qa-test]")).toHaveCount(12);
    await expect(page.locator('[data-qa-test][data-qa-status="NOT_RUN"]')).toHaveCount(12);
    await expect(page.getByTestId("qa-device-runtime")).toHaveText("web");
    await expect(page.getByTestId("qa-device-web-warning")).toBeVisible();
    // Sem scroll horizontal no 390.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("PASS no navegador é recusado; FAIL precisa de nota; nota com PII é recusada; FAIL com nota entra", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 });
    await open(page, "/qa/device");
    const card = page.locator('[data-qa-test="guidedTryAudioDevice"]');
    await card.locator('[data-qa-field="status"]').selectOption("PASS");
    await card.locator('[data-qa-field="deviceClass"]').selectOption("OWNER_DEVICE");
    await card.locator('[data-qa-field="evidenceType"]').selectOption("OWNER_OBSERVED");
    await card.locator("[data-qa-save]").click();
    const errors = card.locator("[data-qa-errors]");
    await expect(errors).toBeVisible();
    await expect(errors).toHaveAttribute("data-qa-errors", /PASS_ON_WEB_OR_EMULATOR/);
    await expect(errors).toHaveAttribute("data-qa-errors", /PASS_WITHOUT_VERSION_CODE/);
    await expect(card).toHaveAttribute("data-qa-status", "NOT_RUN");

    await card.locator('[data-qa-field="status"]').selectOption("FAIL");
    await card.locator("[data-qa-save]").click();
    await expect(card.locator("[data-qa-errors]")).toHaveAttribute("data-qa-errors", /FAIL_WITHOUT_NOTE/);

    await card.locator('[data-qa-field="note"]').fill("não tocou; meu email é ana@exemplo.com");
    await card.locator("[data-qa-save]").click();
    await expect(card.locator("[data-qa-errors]")).toHaveAttribute("data-qa-errors", /NOTE_HAS_PII/);

    await card.locator('[data-qa-field="note"]').fill("Toquei 🔊 e não saiu som; Continuar sem áudio apareceu.");
    await card.locator("[data-qa-save]").click();
    await expect(card).toHaveAttribute("data-qa-status", "FAIL");
    // Persistiu só neste aparelho e nunca virou PASS.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu:device-qa:v1") ?? "{}"));
    expect(saved.guidedTryAudioDevice.status).toBe("FAIL");
    await expect(page.getByTestId("qa-device")).toHaveAttribute("data-physical-matrix", "NOT_PASS");
  });

  test("retrato de update: sem mudança entre antes e depois, nada é apontado", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, points: 320 });
    await open(page, "/qa/device");
    await page.getByTestId("qa-upgrade-take").click();
    await page.getByTestId("qa-upgrade-compare").click();
    const result = page.getByTestId("qa-upgrade-result");
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-violations", "");
    const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu:upgrade-snapshot:v1") ?? "null"));
    expect(snapshot.completedLessons).toBe(THROUGH_L2.length);
    // Só contagens: nada de e-mail, nome ou username no retrato.
    expect(JSON.stringify(snapshot)).not.toMatch(/@|name|username|email/i);
  });

  test("o link de QA físico aparece no Mais só em build de QA", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 });
    await open(page, "/mais");
    await expect(page.getByTestId("more-device-qa")).toBeVisible();
  });
});

test.describe("RC2.2.20 · Pronunciation Core BR", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("contraste b × p: ver → ouvir → comparar → identificar → produzir (opcional)", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 });
    await open(page, "/pinyin");
    // No celular a seção vive na aba "Iniciais" (junto com "Como a boca faz").
    await page.getByRole("button", { name: "Iniciais", exact: true }).first().click();
    const section = page.getByTestId("pronunciation-core-br");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("[data-contrast-open]")).toHaveCount(11);
    await section.locator('[data-contrast-open="b-p"]').click();
    const drill = page.getByTestId("contrast-drill");
    await expect(drill).toHaveAttribute("data-stage", "see");
    await expect(page.getByTestId("contrast-note")).toContainText("sem sopro");
    // Não há opção de resposta antes de ouvir: começa por ver.
    await expect(drill.locator("[data-contrast-option]")).toHaveCount(0);
    await page.getByTestId("contrast-next").click();
    for (const stage of ["hear_a", "hear_b", "compare"]) {
      await expect(drill).toHaveAttribute("data-stage", stage);
      await page.getByTestId("contrast-play").click();
      // Áudio pode tocar ou falhar no navegador de teste: nos dois casos a saída aparece.
      await expect(page.getByTestId("contrast-next")).toBeEnabled({ timeout: 15_000 });
      await page.getByTestId("contrast-next").click();
    }
    await expect(drill).toHaveAttribute("data-stage", "identify");
    for (let round = 0; round < 3; round += 1) {
      await page.getByTestId("contrast-play").click();
      const option = drill.locator("[data-contrast-option]").first();
      await expect(option).toBeEnabled({ timeout: 15_000 });
      await option.click();
      await expect(page.getByTestId("contrast-feedback")).toBeVisible();
      await page.getByTestId("contrast-next").click();
    }
    await expect(drill).toHaveAttribute("data-stage", "produce");
    await expect(page.getByTestId("contrast-score")).toBeVisible();
    await expect(page.getByTestId("self-compare")).toBeVisible();
  });
});
