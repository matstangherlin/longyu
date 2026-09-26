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
  seedFreshJourneySession,
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
  openListenSelectStep,
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
      test.setTimeout(90_000);
      await openListenSelectStep(page);
      // Prefer known-correct labels from p1 adaptive dialogue cards, then fall back.
      const preferred = page.getByRole("button", {
        name: /Opção \d+: (mostrar a língua de verdade|mandarim falado|Olá|你好)/,
      });
      if (await preferred.first().isVisible().catch(() => false)) {
        await preferred.first().click();
      } else {
        await page.locator("[data-option-index]").first().click();
      }
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      // If preferred guess was wrong, walk remaining options with explicit retry.
      for (let i = 0; i < 6; i += 1) {
        const wrongDialog = page.getByRole("dialog", { name: /Quer tentar de novo|Quase/i });
        const quase = page.getByText(/^Quase$/).first();
        if (
          !(await wrongDialog.isVisible().catch(() => false)) &&
          !(await quase.isVisible().catch(() => false))
        ) {
          break;
        }
        const retry = wrongDialog.getByRole("button", { name: /Tentar de novo/i }).first();
        if (await retry.isVisible().catch(() => false)) {
          await retry.click();
        } else {
          await clickFirstVisible(page, [/^Tentar de novo/]);
        }
        await page.waitForTimeout(120);
        const options = page.locator("[data-option-index]");
        const count = await options.count();
        if (count === 0) break;
        await options.nth((i + 1) % count).click();
        await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      }
      const stickyCta = page.locator("[data-lesson-sticky-actions]").locator("button:visible").first();
      await expect(stickyCta).toBeVisible({ timeout: 10_000 });
      await assertPageScrollLocked(page);
      await assertFrameFillsViewport(page);
      await assertPrimaryCtaInViewport(page);
    });

    test("4 · feedback de erro — modal com ação acessível", async ({ page }) => {
      test.setTimeout(90_000);
      await openListenSelectStep(page);
      // Prefer known distractors for p1 dialogue cards.
      const distractor = page.getByRole("button", {
        name: /Opção \d+: (ensinar só hànzì|ensinar só pinyin|um alfabeto|um desenho|uma tradução|Obrigado|Até logo|De nada|谢谢|再见)/,
      });
      if (await distractor.first().isVisible().catch(() => false)) {
        await distractor.first().click();
      } else {
        const count = await page.locator("[data-option-index]").count();
        await page.locator("[data-option-index]").nth(count > 1 ? count - 1 : 0).click();
      }
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      // If that was somehow correct, try another option via fresh open.
      const wrongDialog = page.getByRole("dialog", { name: /Quer tentar de novo|Quase/i });
      if (!(await wrongDialog.isVisible().catch(() => false))) {
        await openListenSelectStep(page);
        const count = await page.locator("[data-option-index]").count();
        await page.locator("[data-option-index]").nth(count > 1 ? 1 : 0).click();
        await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      }
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
      const victory = page.getByRole("button", { name: /Continuar Jornada|Voltar à Jornada|Receber recompensas|Continuar tema/i }).first();
      const deadline = Date.now() + 165_000;
      let steps = 0;
      while (!(await victory.isVisible().catch(() => false)) && Date.now() < deadline && steps < 50) {
        steps += 1;
        await dismissBlockingOverlays(page);
        if (await page.locator("[data-review-offer]").isVisible().catch(() => false)) {
          await clickFirstVisible(page, [/^Continuar$/, /^Depois$/, /^Agora não$/, /^Pular revisão/i]);
        }
        const skipped = await clickFirstVisible(page, [/^Pular/, /^Não posso ouvir agora$/, /^Não posso falar agora$/]);
        if (!skipped) {
          await clickFirstVisible(page, [/^Entendi$/, /^Continuar$/, /^Verificar$/, /Certo!|\+Qi/, /^Responder$/]);
        }
        await page.waitForTimeout(150);
      }
      await expect(victory).toBeVisible({ timeout: 10_000 });
      await assertVictoryWithoutPageScroll(page);
    });

    test("troca de step — scroll da atividade volta ao topo", async ({ page }) => {
      test.setTimeout(90_000);
      // Same contract as lesson-player-viewport.spec.ts: inject scroll on the
      // first Continuar/Entendi step, then advance — avoids Fôlego/skip side paths.
      await seedFreshJourneySession(page);
      await page.goto("/licao/p1-o-que-e-mandarim/player");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const scroller = page.locator("[data-lesson-activity-scroll]");
      await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
      await expect(scroller).toBeVisible();
      await injectLongActivityScroll(page);

      const guideContinue = page.getByTestId("guide-continue");
      if (await guideContinue.isVisible().catch(() => false)) {
        // RC2.2.17B — a fala do Dragão pode ter micro-páginas (mesmo passo):
        // avança até o passo curricular mudar.
        const startIndex = await page.locator("[data-current-step-index]").first().getAttribute("data-current-step-index");
        for (let i = 0; i < 12; i += 1) {
          const now = await page.locator("[data-current-step-index]").first().getAttribute("data-current-step-index").catch(() => startIndex);
          if (now !== startIndex || !(await guideContinue.isVisible().catch(() => false))) break;
          await guideContinue.click().catch(() => undefined);
          await page.waitForTimeout(120);
        }
      } else {
        const entendi = page.getByRole("button", { name: /^(Entendi|Got it|Continuar)$/ }).first();
        await expect(entendi).toBeVisible({ timeout: 20_000 });
        await entendi.click();
        if (await entendi.isVisible().catch(() => false)) {
          await entendi.click();
        }
      }

      await expect
        .poll(async () => scroller.evaluate((node) => node.scrollTop), { timeout: 8_000 })
        .toBe(0);
      await assertPageScrollLocked(page);
    });
  });
}
