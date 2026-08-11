import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedFreshJourneySession } from "./helpers";

/**
 * Lesson Player Viewport & Scroll Hardening
 * Regra: avançar nunca herda o scroll da atividade anterior.
 */
test.describe("lesson player — viewport & scroll", () => {
  test("após Continuar, a nova atividade começa no topo da região rolável", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);

    const frame = page.locator("[data-lesson-player-frame]");
    const scroller = page.locator("[data-lesson-activity-scroll]");
    await expect(frame).toBeVisible();
    await expect(scroller).toBeVisible();

    // Shell do player usa visualViewport / 100dvh (sem página longa por acidente).
    const heights = await page.evaluate(() => {
      const el = document.querySelector("[data-lesson-player-frame]") as HTMLElement | null;
      return {
        frame: el?.getBoundingClientRect().height ?? 0,
        vv: window.visualViewport?.height ?? window.innerHeight,
      };
    });
    expect(heights.frame).toBeGreaterThan(200);
    expect(Math.abs(heights.frame - heights.vv)).toBeLessThan(8);

    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();

    // Simula aluno que rolou até embaixo na atividade atual.
    await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await page.getByRole("button", { name: /你好/ }).first().click();
    const verificar = page.getByRole("button", { name: /^Verificar$/ }).first();
    if (await verificar.isVisible().catch(() => false)) {
      await verificar.click();
    }

    const continuar = page.getByRole("button", { name: /^Continuar$/ }).first();
    await expect(continuar).toBeVisible({ timeout: 8_000 });
    await continuar.click();

    // Nova atividade montada: scroll da região deve voltar ao início.
    await expect
      .poll(async () => scroller.evaluate((node) => node.scrollTop), { timeout: 5_000 })
      .toBe(0);

    await expect(page.locator("[data-lesson-step-frame]")).toBeVisible();
    const windowScroll = await page.evaluate(() => window.scrollY);
    expect(windowScroll).toBe(0);
  });
});
