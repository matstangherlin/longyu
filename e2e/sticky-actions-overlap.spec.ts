import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedFoundationThrough, waitForLazyPage } from "./helpers";
import {
  advanceUntilSelector,
  assertNoStickyBarOverlap,
  openPlayer,
  simulateVirtualKeyboard,
} from "./lesson-player-mobile-helpers";

/**
 * V3.9 · MOBILE-006/007/008 — barra de ação fixa não pode cobrir as opções.
 *
 * Origem: QA em Chrome no Android real, com a barra "Limpar | Verificar" do
 * HanziBuilder sobre os cards de caractere. O bug passava pelos testes antigos
 * porque eles perguntavam "o CTA está visível?" — e estava; quem sumia era o
 * conteúdo atrás dele. Aqui a asserção é geométrica.
 *
 * Cobertura de viewport inclui o formato da captura (Android retrato) e o
 * teclado aberto, que encolhe a visualViewport e reposiciona a barra.
 */

// Viewports equivalentes à captura do Android e aos aparelhos do QA físico.
const VIEWPORTS = [
  { label: "360×640 Android pequeno", width: 360, height: 640 },
  { label: "393×851 Android típico", width: 393, height: 851 },
  { label: "375×667 iPhone SE", width: 375, height: 667 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`barra fixa · ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("passo de escolha não fica sob a barra de ação", async ({ page }) => {
      await openPlayer(page);
      await assertNoStickyBarOverlap(page);
    });

    test("HanziBuilder: opções não ficam sob 'Limpar | Verificar'", async ({ page }) => {
      // p1-primeiros-hanzi abre direto no builder (mesma lição das evidências).
      await seedFoundationThrough(page, "p1-o-que-e-hanzi");
      await page.goto("/licao/p1-primeiros-hanzi/player");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const reached = await advanceUntilSelector(page, "[data-hanzi-builder]");
      test.skip(!reached, "HanziBuilder não apareceu no plano desta execução.");

      // A barra do builder tem de publicar a própria altura; sem isso o
      // scroller reserva 0 e as peças ficam presas atrás dela.
      const reserved = await page.evaluate(() => {
        const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
        return scroller
          ? getComputedStyle(scroller).getPropertyValue("--lesson-bottom-action-height").trim()
          : "";
      });
      expect(reserved, "scroller precisa reservar a altura da barra do builder").toMatch(/^\d+(\.\d+)?px$/);
      expect(Number.parseFloat(reserved)).toBeGreaterThan(0);

      await assertNoStickyBarOverlap(page);
    });

    test("teclado aberto não empurra opções para trás da barra", async ({ page }) => {
      await openPlayer(page);
      await simulateVirtualKeyboard(page, Math.round(viewport.height * 0.55));
      await page.waitForTimeout(200);
      await assertNoStickyBarOverlap(page);
    });
  });
}

test.describe("barra fixa · revisão", () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test("montagem de frase na revisão não fica sob a barra", async ({ page }) => {
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const started = await page
      .locator("[data-review-start], [data-review-question]")
      .first()
      .isVisible()
      .catch(() => false);
    test.skip(!started, "Sem fila de revisão nesta sessão semeada.");
    await assertNoStickyBarOverlap(page);
  });
});
