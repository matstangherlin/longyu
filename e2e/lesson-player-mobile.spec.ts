/**
 * Lesson Player — guarda E2E mobile (B001 / #132 / #138–#140).
 *
 * Emula viewports pequenos e asserts de scroll/CTA/frame. **Não substitui**
 * QA em Android/iPhone físico — B001 permanece aberto até revalidação humana.
 *
 * Complementa (não substitui):
 * - e2e/lesson-player-viewport.spec.ts
 * - e2e/qa-regression-guard.spec.ts (mobile)
 */
import { test, expect } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedPendingStarRecoverySession,
  waitForLazyPage,
} from "./helpers";
import { clickFirstVisible } from "./lesson-player-helpers";
import {
  MOBILE_VIEWPORTS,
  assertBankAboveSticky,
  assertFrameFillsViewport,
  assertModalActionAccessible,
  assertPageScrollLocked,
  assertPrimaryCtaInViewport,
  assertReviewContainedInFrame,
  assertReviewLayoutStable,
  assertVictoryWithoutPageScroll,
  injectLongActivityScroll,
  openDenseSentenceBuild,
  openPostListenGradedStep,
  openOpenProductionStep,
  openPlayer,
  openPlayerPro,
  openTransferStep,
  simulateVirtualKeyboard,
} from "./lesson-player-mobile-helpers";

/** B001 — sentence_build denso: StickyActionBar não cobre a última fileira. */
for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`B001 StickyActionBar × sentence_build — ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("banco denso não fica sob o sticky (teclado fechado)", async ({ page }) => {
      test.setTimeout(150_000);
      await openDenseSentenceBuild(page);
      await assertPageScrollLocked(page);
      await assertBankAboveSticky(page);
    });

    test("banco denso + teclado simulado — sticky e última peça alcançáveis", async ({ page }) => {
      test.setTimeout(150_000);
      await openDenseSentenceBuild(page);
      const shrunk = Math.max(280, Math.floor(viewport.height * 0.52));
      await simulateVirtualKeyboard(page, shrunk);
      await assertPageScrollLocked(page);
      await assertBankAboveSticky(page);
    });
  });
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Lesson Player mobile — ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("1 · atividade curta — scroll lock, frame e CTA", async ({ page }) => {
      await openPlayer(page);
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
      await assertPrimaryCtaInViewport(page);
    });

    test("2 · atividade longa — scroll interno, página parada", async ({ page }) => {
      await openPlayer(page);
      const scroller = await injectLongActivityScroll(page);
      await assertPageScrollLocked(page);
      await expect.poll(async () => scroller.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
      // Volta ao topo: CTA deve ficar acessível de novo.
      await scroller.evaluate((node) => {
        node.scrollTop = 0;
      });
      await assertPrimaryCtaInViewport(page);
    });

    test("3 · feedback de acerto — CTA acessível", async ({ page }) => {
      await openPostListenGradedStep(page);
      const correct = page
        .getByRole("button", { name: /Opção \d+: nǐ hǎo$/ })
        .or(page.getByRole("button", { name: /^Olá$/ }));
      await correct.first().click();
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      await expect(page.getByText(/Boa! \+Qi|Estrutura certa|Boa, foi esse som/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
      await assertPrimaryCtaInViewport(page);
    });

    test("4 · feedback de erro — modal com ação acessível", async ({ page }) => {
      await openPostListenGradedStep(page);
      const wrong = page
        .getByRole("button", { name: /Opção \d+: wǒ hěn hǎo|Opção \d+: jīntiān hěn hǎo/ })
        .or(page.getByRole("button", { name: /Obrigado|Até logo|De nada/i }));
      await wrong.first().click();
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      await assertModalActionAccessible(page);
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
    });

    test("5 · revisão pós-erro — contida no frame", async ({ page }) => {
      test.setTimeout(90_000);
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
      await assertReviewContainedInFrame(page);
    });

    test("6 · sentence build em revisão — peças + frame", async ({ page }) => {
      test.setTimeout(90_000);
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
      await page.locator("[data-review-start]").click();
      await expect(page.locator('[data-review-kind="build"]')).toBeVisible({ timeout: 10_000 });
      await assertReviewLayoutStable(page);
      for (const piece of ["你", "好", "吗"]) {
        await expect(
          page.locator("[data-review-options]").getByRole("button", { name: piece, exact: true }).first()
        ).toBeVisible();
      }
    });

    test("7 · produção aberta — situação + input no viewport", async ({ page }) => {
      test.setTimeout(150_000);
      await openOpenProductionStep(page);
      await expect(page.locator("[data-production-situation]")).toBeVisible();
      await expect(
        page.locator("[data-production-answer] textarea, [data-production-answer] input").first()
      ).toBeVisible();
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
      const input = page.locator("[data-production-answer] textarea").first();
      if (await input.isVisible().catch(() => false)) {
        await input.focus();
        await assertPrimaryCtaInViewport(page);
      }
    });

    test("8 · transferência — estrutura + CTA", async ({ page }) => {
      test.setTimeout(150_000);
      await openTransferStep(page);
      await expect(page.locator("[data-production-learned]")).toBeVisible();
      await expect(page.locator("[data-production-situation]")).toBeVisible();
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
      await assertPrimaryCtaInViewport(page);
    });

    test("9 · teclado virtual simulado — input e CTA permanecem acessíveis", async ({ page }) => {
      test.setTimeout(150_000);
      await openTransferStep(page);
      const input = page.locator("[data-production-answer] textarea").first();
      await expect(input).toBeVisible();
      await input.focus();
      const shrunk = Math.max(280, Math.floor(viewport.height * 0.52));
      await simulateVirtualKeyboard(page, shrunk);
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
      // Com viewport encolhida, o CTA sticky deve permanecer alcançável (scroll interno ok).
      const verify = page.getByRole("button", { name: /^Verificar$/ });
      await expect(verify).toBeVisible();
      const verifyReachable = await verify.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const vv = window.visualViewport?.height ?? window.innerHeight;
        if (rect.top >= 0 && rect.bottom <= vv + 12) return true;
        const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
        if (!scroller) return false;
        const sr = scroller.getBoundingClientRect();
        const ctaTopInScroller = rect.top - sr.top + scroller.scrollTop;
        const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        return ctaTopInScroller + rect.height <= maxScroll + scroller.clientHeight + 12;
      });
      expect(verifyReachable).toBe(true);
    });

    test("10 · tela de vitória — sem scroll da página", async ({ page }) => {
      test.setTimeout(180_000);
      await openPlayerPro(page);
      const victory = page.getByRole("button", { name: /Continuar Jornada|Receber recompensas/i });
      const deadline = Date.now() + 165_000;
      let steps = 0;
      while (!(await victory.isVisible().catch(() => false)) && Date.now() < deadline && steps < 50) {
        steps += 1;
        await dismissBlockingOverlays(page);
        if (await page.locator("[data-review-offer]").isVisible().catch(() => false)) {
          await clickFirstVisible(page, [/^Continuar$/, /^Depois$/, /^Agora não$/, /^Pular revisão/i]);
        }
        const skipped = await clickFirstVisible(page, [/^Pular/]);
        if (!skipped) {
          await clickFirstVisible(page, [/^Entendi$/, /^Continuar$/, /^Verificar$/, /Certo!|\+Qi/, /^Responder$/]);
        }
        await page.waitForTimeout(150);
      }
      await expect(victory).toBeVisible({ timeout: 10_000 });
      await assertVictoryWithoutPageScroll(page);
    });

    test("troca de step — scroll da atividade volta ao topo", async ({ page }) => {
      await openPlayer(page);
      const scroller = page.locator("[data-lesson-activity-scroll]");
      await injectLongActivityScroll(page);
      await page.getByRole("button", { name: "Entendi" }).click();
      await expect(page.getByRole("button", { name: /你好|谢谢|我很好/ }).first()).toBeVisible({ timeout: 10_000 });
      await expect.poll(async () => scroller.evaluate((node) => node.scrollTop), { timeout: 5_000 }).toBe(0);
      await assertPageScrollLocked(page);
    });
  });
}
