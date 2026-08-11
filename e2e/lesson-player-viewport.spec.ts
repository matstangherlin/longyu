import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedFreshJourneySession } from "./helpers";

/**
 * Lesson Player Viewport & Scroll Hardening
 * Regra: avançar nunca herda o scroll da atividade anterior.
 */
test.describe("lesson player — viewport & scroll", () => {
  test("após avançar, a nova atividade começa no topo da região rolável", async ({ page }) => {
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

    // Força conteúdo alto e scroll no meio/fim — simula aluno que terminou rolando.
    await scroller.evaluate((node) => {
      const spacer = document.createElement("div");
      spacer.dataset.testSpacer = "1";
      spacer.style.height = "1600px";
      node.appendChild(spacer);
      node.scrollTop = 900;
    });
    await expect
      .poll(async () => scroller.evaluate((node) => node.scrollTop), { timeout: 3_000 })
      .toBeGreaterThan(100);

    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();

    // Nova atividade montada: scroll da região e da janela voltam ao início.
    await expect
      .poll(async () => scroller.evaluate((node) => node.scrollTop), { timeout: 5_000 })
      .toBe(0);
    const windowScroll = await page.evaluate(() => window.scrollY);
    expect(windowScroll).toBe(0);
    await expect(page.locator("[data-lesson-step-frame]")).toBeVisible();
  });
});
