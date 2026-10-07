import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedFoundationThrough, seedMissionsSession, waitForLazyPage } from "./helpers";
import {
  advanceUntilSelector,
  assertLessonActionDockedOutsideAnswers,
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
      await assertLessonActionDockedOutsideAnswers(page);
      await assertNoStickyBarOverlap(page);
    });

    test("HanziBuilder: opções não ficam sob 'Limpar | Verificar'", async ({ page }) => {
      // p1-primeiros-hanzi abre direto no builder (mesma lição das evidências).
      await seedFoundationThrough(page, "p1-o-que-e-hanzi");
      await page.goto("/licao/p1-primeiros-hanzi/player");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const reached = await advanceUntilSelector(page, "[data-hanzi-builder]");
      // Seed determinístico (fundação até p1-o-que-e-hanzi): p1-primeiros-hanzi
      // tem de chegar ao HanziBuilder; não chegar é regressão do plano/player.
      expect(reached, "p1-primeiros-hanzi deve chegar ao HanziBuilder").toBe(true);

      // A barra agora ocupa uma faixa irmã do scroller. Nenhum padding medido
      // é necessário, porque peças e CTA não compartilham a mesma geometria.
      await assertLessonActionDockedOutsideAnswers(page);
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
    // RC2.3.9 — sem fila semeada o teste caía sempre no skip (vacuo). Semeia
    // itens realmente devidos e exige que a rodada abra num item com Verificar.
    const now = Date.now();
    const base = { ease: 2.5, intervalDays: 1, due: now - 100_000, reps: 1, lapses: 0, createdAt: now - 200_000 };
    await seedMissionsSession(page, {
      completedLessons: ["l1", "l2", "l3"],
      learnedChunks: ["nihao", "xiexie", "zaijian"],
      srs: {
        "chunk:nihao": { id: "chunk:nihao", type: "chunk", itemId: "nihao", ...base },
        "chunk:xiexie": { id: "chunk:xiexie", type: "chunk", itemId: "xiexie", ...base },
        "chunk:zaijian": { id: "chunk:zaijian", type: "chunk", itemId: "zaijian", ...base },
      },
    });
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    // RC2.2.25 — /revisao abre no hub; a rodada começa em [Começar revisão].
    const start = page.getByTestId("review-start");
    await expect(start, "fila semeada deve oferecer [Começar revisão]").toBeVisible({ timeout: 15_000 });
    await start.click();
    await expect(
      page.getByRole("button", { name: /Verificar|Conferir resposta|Ver resposta/i }).first(),
      "a rodada semeada deve abrir um item de revisão"
    ).toBeVisible({ timeout: 15_000 });
    await assertNoStickyBarOverlap(page);
  });
});
