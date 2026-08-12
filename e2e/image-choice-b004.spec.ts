import { test, expect, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import { clickFirstVisible } from "./lesson-player-helpers";
import { seedProOnTopOfSession } from "./lesson-player-mobile-helpers";

/**
 * B004 — image_choice: 4 tiles terminam em ready/fallback; nunca eternamente em loading;
 * opções só habilitam quando a grade está pronta. Light + dark; Chromium + WebKit.
 *
 * Abre `p4-char-ren` com pré-requisitos + Pro (fôlego infinito) e avança o plano
 * gerado até a grade de IMAGENS (`listen_and_choose_image` / `choose_image`).
 */

const IMAGE_GRID =
  '[data-image-choice-ready="0"], [data-image-choice-ready="1"]:has([data-visual-status]), [data-image-choice-ready="1"]:has([data-visual-fallback])';

async function answerOrAdvance(page: Page) {
  await dismissBlockingOverlays(page);
  const folegoBack = page.getByRole("button", { name: /Voltar e tentar acertar/i });
  if (await folegoBack.isVisible().catch(() => false)) {
    await folegoBack.click().catch(() => undefined);
    return;
  }
  // Modal de erro / revisão: não sair da lição.
  if (await page.locator("[data-review-offer]").isVisible().catch(() => false)) {
    await clickFirstVisible(page, [/^Continuar com/, /^Depois$/, /^Agora não$/, /^Pular revisão/i]);
    return;
  }
  if (await clickFirstVisible(page, [/^Entendi$/, /^Continuar$/, /^Próximo$/, /Certo!|\+Qi/, /^Continuar e perder/])) {
    return;
  }
  // Choice steps: escolhe primeira opção habilitada e verifica.
  const choice = page
    .locator("button")
    .filter({ hasNotText: /Verificar|Conferir|Pular|Continuar|Entendi|Sair|Voltar|Confirmar/i })
    .filter({ has: page.locator("span, .hanzi") })
    .first();
  if (await choice.isVisible().catch(() => false)) {
    await choice.click().catch(() => undefined);
  }
  if (await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/])) {
    return;
  }
  // Último recurso: pular (Pro = fôlego infinito).
  await clickFirstVisible(page, [/^Pular/]);
}

async function openImageChoiceGrid(page: Page): Promise<boolean> {
  await seedLessonPlayerReady(page, "p4-char-ren");
  await seedProOnTopOfSession(page);
  await page.goto("/licao/p4-char-ren/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);

  if (await page.getByRole("button", { name: /Continuar na jornada/i }).isVisible().catch(() => false)) {
    return false;
  }

  const grid = page.locator(IMAGE_GRID).first();
  const deadline = Date.now() + 120_000;
  let steps = 0;
  while (!(await grid.isVisible().catch(() => false)) && Date.now() < deadline && steps < 50) {
    steps += 1;
    if (
      await page
        .getByRole("button", { name: /Continuar Jornada|Receber recompensas/i })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return false;
    }
    await answerOrAdvance(page);
    await page.waitForTimeout(150);
  }
  return grid.isVisible().catch(() => false);
}

async function assertImageChoiceSettled(page: Page) {
  const grid = page
    .locator("[data-image-choice-ready]")
    .filter({ has: page.locator("[data-visual-status], [data-visual-fallback]") })
    .first();
  await expect(grid).toBeVisible({ timeout: 20_000 });
  await expect(grid).toHaveAttribute("data-image-choice-ready", "1", { timeout: 20_000 });
  await expect(page.getByText("Carregando imagens…")).toHaveCount(0);

  const tiles = grid.locator("button");
  await expect(tiles).toHaveCount(4);

  for (let i = 0; i < 4; i += 1) {
    const tile = tiles.nth(i);
    await expect(tile).toBeEnabled();
    const settled = await tile.evaluate((el) => {
      const ready = el.querySelector('[data-visual-status="ready"]');
      const fallback = el.querySelector("[data-visual-fallback='1']");
      const loading = el.querySelector('[data-visual-status="loading"]');
      return {
        ready: Boolean(ready),
        fallback: Boolean(fallback),
        loading: Boolean(loading),
      };
    });
    expect(settled.loading, `tile ${i} ainda em loading`).toBe(false);
    expect(settled.ready || settled.fallback, `tile ${i} sem ready/fallback`).toBe(true);
  }
}

const themes = [
  { name: "light", theme: "light" as const },
  { name: "dark", theme: "dark" as const },
];

test.describe("B004 — image_choice ready/fallback", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { name, theme } of themes) {
    test(`grade 4 tiles settled (${name})`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.addInitScript((value) => {
        try {
          const raw = localStorage.getItem("longyu-v1");
          if (!raw) return;
          const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
          if (!parsed.state) return;
          parsed.state.theme = value;
          localStorage.setItem("longyu-v1", JSON.stringify(parsed));
        } catch {
          /* ignore */
        }
      }, theme);

      const found = await openImageChoiceGrid(page);
      expect(found).toBe(true);
      await page.evaluate((value) => {
        document.documentElement.setAttribute("data-theme", value);
      }, theme);
      await assertImageChoiceSettled(page);
    });
  }

  test("nunca fica eternamente em loading (timeout do preload)", async ({ page }) => {
    test.setTimeout(180_000);
    const found = await openImageChoiceGrid(page);
    expect(found).toBe(true);
    const grid = page
      .locator("[data-image-choice-ready]")
      .filter({ has: page.locator("[data-visual-status], [data-visual-fallback]") })
      .first();
    await expect
      .poll(async () => grid.getAttribute("data-image-choice-ready"), { timeout: 12_000 })
      .toBe("1");
    await expect(page.locator('[data-visual-status="loading"]')).toHaveCount(0);
  });
});
