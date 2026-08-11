import { test, expect } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedPendingStarRecoverySession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep } from "./lesson-player-helpers";

/**
 * Guarda E2E dos fluxos QA que regressaram:
 * transferência, revisão pós-erro / estrela, CTA e enquadramento mobile.
 * Complementa `npm run test:qa-regression-guard` (lógica + contratos de source).
 */
test.describe("QA regression guard — player mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CTA sticky permanece acessível e no viewport", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);

    const sticky = page.locator("[data-lesson-sticky-actions]");
    await expect(sticky).toBeVisible();
    const cta = sticky.locator("button:visible").first();
    await expect(cta).toBeVisible();

    const geometry = await cta.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const vv = window.visualViewport?.height ?? window.innerHeight;
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        vv,
        inView: rect.top >= 0 && rect.bottom <= vv + 2,
      };
    });
    expect(geometry.height).toBeGreaterThan(24);
    expect(geometry.inView).toBe(true);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.vv + 2);
  });

  test("ao avançar steps, o player continua enquadrado", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);

    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toBeVisible();

    const before = await page.evaluate(() => {
      const el = document.querySelector("[data-lesson-player-frame]") as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      return {
        top: rect?.top ?? -1,
        height: rect?.height ?? 0,
        vv: window.visualViewport?.height ?? window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    expect(before.top).toBeLessThanOrEqual(2);
    expect(Math.abs(before.height - before.vv)).toBeLessThan(8);

    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();

    const after = await page.evaluate(() => {
      const el = document.querySelector("[data-lesson-player-frame]") as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
      return {
        top: rect?.top ?? -1,
        height: rect?.height ?? 0,
        vv: window.visualViewport?.height ?? window.innerHeight,
        scrollY: window.scrollY,
        activityScroll: scroller?.scrollTop ?? -1,
        htmlAttr: document.documentElement.getAttribute("data-lesson-player"),
      };
    });
    expect(after.htmlAttr).toBe("1");
    expect(after.scrollY).toBe(0);
    expect(after.activityScroll).toBe(0);
    expect(after.top).toBeLessThanOrEqual(2);
    expect(Math.abs(after.height - after.vv)).toBeLessThan(8);
  });
});

test.describe("QA regression guard — revisão / estrela", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("recuperação de estrela: item único, sem dump e sem status nas opções", async ({ page }) => {
    await seedPendingStarRecoverySession(page, {
      lessonId: "l3",
      stepIndex: 5,
      exerciseType: "dialogue_choice",
      expectedAnswer: "我很好",
    });
    await page.goto("/licao/l3/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-review-offer]")).toBeVisible({ timeout: 15_000 });
    await dismissBlockingOverlays(page);
    await expect(page.locator('[data-review-can-recover="true"]')).toBeVisible();
    await dismissBlockingOverlays(page);
    await page.locator("[data-review-start]").click();
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-review-question]")).toBeVisible();
    await expect(page.locator("[data-review-prompt]")).toBeVisible();

    const body = page.locator("body");
    await expect(body).not.toContainText(/你好\s*\/\s*你好吗/);
    await expect(body).not.toContainText(/nǐ hǎo\s*\/\s*nǐ hǎo ma/i);
    await expect(page.getByRole("button", { name: /Pulou ou respondeu incorretamente/i })).toHaveCount(0);

    const options = page.locator("[data-review-options] button");
    await expect(options.first()).toBeVisible();
    const optionTexts = await options.allTextContents();
    expect(optionTexts.some((t) => t.includes("我很好"))).toBe(true);
    expect(optionTexts.every((t) => !/pulou|incorretamente|timeout/i.test(t))).toBe(true);
    expect(optionTexts.every((t) => !/[\u3400-\u9fff].*\/.*[\u3400-\u9fff]/.test(t))).toBe(true);

    await page.getByRole("button", { name: /^我很好$/ }).click();
    await expect(page.locator('[data-review-feedback-status="correct"]')).toBeVisible({ timeout: 8_000 });
    await page.locator("[data-review-next]").click();

    await expect(
      page.locator("[data-review-summary], [data-review-recovered], [data-review-offer]")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sentence build em revisão: peças corretas (sem dump)", async ({ page }) => {
    await seedPendingStarRecoverySession(page, {
      lessonId: "l3",
      stepIndex: 4,
      exerciseType: "sentence_build",
      expectedAnswer: "你好吗",
    });
    await page.goto("/licao/l3/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-review-offer]")).toBeVisible({ timeout: 15_000 });
    await dismissBlockingOverlays(page);
    await page.locator("[data-review-start]").click();
    await dismissBlockingOverlays(page);

    await expect(page.locator('[data-review-kind="build"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText(/你好\s*\/\s*你好吗\s*\/\s*我很好/);
    await expect(page.getByRole("button", { name: /Pulou ou respondeu incorretamente/i })).toHaveCount(0);

    // Peças do alvo devem estar disponíveis (rótulo Peça N: …).
    for (const piece of ["你", "好", "吗"]) {
      await expect(page.getByRole("button", { name: new RegExp(`Peça \\d+: ${piece}`) }).first()).toBeVisible();
    }
  });
});

test.describe("QA regression guard — transferência", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(120_000);

  test("atividade de transferência renderiza estrutura, situação e input", async ({ page }) => {
    // Pro: Pular não gasta Fôlego — necessário para chegar ao transfer (~passo 12).
    await seedLessonPlayerReady(page, "l5");
    await page.addInitScript(() => {
      try {
        const raw = localStorage.getItem("longyu-v1");
        if (!raw) return;
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number };
        if (!parsed.state) return;
        parsed.state.isPremium = true;
        parsed.state.serverIsPro = true;
        parsed.state.folego = 20;
        localStorage.setItem("longyu-v1", JSON.stringify(parsed));
      } catch {
        /* ignore */
      }
    });
    await page.goto("/licao/l5/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const transfer = page.locator('[data-production-step="transfer_task"]');
    const deadline = Date.now() + 90_000;
    let steps = 0;
    while (!(await transfer.isVisible().catch(() => false)) && Date.now() < deadline && steps < 30) {
      steps += 1;
      await dismissBlockingOverlays(page);
      // Fecha modal de Fôlego se aparecer (resposta: tentar acertar / pular com Pro).
      const folegoBack = page.getByRole("button", { name: /Voltar e tentar acertar/i });
      if (await folegoBack.isVisible().catch(() => false)) {
        await folegoBack.click().catch(() => undefined);
      }
      const advanced = await advanceOneStep(page);
      if (!advanced) await page.waitForTimeout(200);
    }

    await expect(transfer).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("[data-production-learned]")).toBeVisible();
    await expect(page.locator("[data-production-situation]")).toBeVisible();
    await expect(page.locator("[data-production-goal]")).toBeVisible();
    await expect(page.locator("[data-production-answer] input, [data-production-answer] textarea").first()).toBeVisible();

    await expect(page.locator("body")).not.toContainText(/Nenhuma alternativa e nenhuma peça/);
    const sticky = page.locator("[data-lesson-sticky-actions] button:visible").first();
    if (await sticky.isVisible().catch(() => false)) {
      const inView = await sticky.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const vv = window.visualViewport?.height ?? window.innerHeight;
        return rect.bottom <= vv + 2 && rect.top >= 0;
      });
      expect(inView).toBe(true);
    }
  });
});
