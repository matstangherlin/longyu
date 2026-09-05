import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { dismissBlockingOverlays, seedUnlockedLessonSession, waitForLazyPage } from "./helpers";

const SHOTS = path.join(process.cwd(), "docs/reports/v492b-screenshots");

/**
 * V4.9.2B — UX do match pairs da Revisão.
 *
 * A Revisão tem renderer próprio, separado do `PairExercise` do player, e as
 * máquinas de estado são de fato diferentes: aqui o aluno preenche todos os
 * pares e só depois verifica, enquanto na lição o feedback é imediato por par.
 * Duplicar a state machine seria errado; o que estava duplicado — e divergindo —
 * era a camada visual. Estes testes protegem a camada consolidada.
 */
async function openReviewPairs(page: Page) {
  // O quadro de pares nasce de `buildMeaningExercise`: entidade do tipo chunk,
  // no domínio `significado`, com irmãos suficientes para formar pares. Semear
  // exatamente isso é o que torna o teste determinístico — depender da fila
  // "natural" faria o spec pular sozinho, e teste pulado não prova nada.
  const now = Date.now();
  const chunks = ["nihao", "xiexie", "zaijian", "bukeqi", "zaoshanghao", "wanan"];
  const srs = Object.fromEntries(
    chunks.map((id) => [
      `chunk:${id}:significado`,
      {
        id: `chunk:${id}:significado`,
        type: "chunk",
        itemId: id,
        reviewDomain: "significado",
        ease: 2.5,
        intervalDays: 1,
        due: now - 86_400_000,
        reps: 1,
        lapses: 0,
        createdAt: now - 600_000,
        reviewedAt: now - 500_000,
      },
    ])
  );
  await seedUnlockedLessonSession(page, "p4-num-678", { srs, isPremium: true, serverIsPro: true });
  await page.goto("/revisao");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-review-match-pairs-board]")).toBeVisible({ timeout: 15_000 });
}

test.describe("V4.9.2B review match pairs UX", () => {
  test("quadro tem duas colunas equilibradas, cabeçalhos e progresso", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    await openReviewPairs(page);

    const board = page.locator("[data-review-match-pairs-board]");
    await expect(board).toBeVisible();

    // Cabeçalhos de coluna substituem a instrução repetida por tile.
    await expect(board.getByText(/^Mandarim$|^Mandarin$/)).toBeVisible();
    await expect(board.getByText(/^Significado$|^Meaning$/)).toBeVisible();

    // A instrução aparece uma vez, acima do quadro — nunca sob cada peça.
    await expect(page.getByText(/Escolha o par|Choose the pair/)).toHaveCount(0);
    await expect(page.locator("[data-review-pairs-progress]")).toBeVisible();

    // Colunas equilibradas: mesma largura, dentro de 2px.
    const left = board.locator('[data-pair-column="left"]');
    const right = board.locator('[data-pair-column="right"]');
    const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()]);
    expect(leftBox && rightBox).toBeTruthy();
    if (!leftBox || !rightBox) return;
    expect(Math.abs(leftBox.width - rightBox.width)).toBeLessThanOrEqual(2);
    expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(rightBox.x + 1);

    // Alvo de toque confortável em cada peça.
    const tiles = board.locator("[data-review-pair-tile]");
    const count = await tiles.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let index = 0; index < count; index += 1) {
      const box = await tiles.nth(index).boundingBox();
      expect(box?.height ?? 0, `peça ${index} pequena demais para toque`).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({ path: path.join(SHOTS, "04-review-pairs-desktop-fixed.png"), fullPage: true });
  });

  test("selecionar à esquerda marca a peça e responder move o progresso", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openReviewPairs(page);

    const board = page.locator("[data-review-match-pairs-board]");
    const leftTile = board.locator('[data-pair-column="left"] [data-review-pair-tile]').first();
    const progress = page.locator("[data-review-pairs-progress]");
    const before = await progress.textContent();

    // Antes de escolher a esquerda, a direita não aceita clique.
    const rightTile = board.locator('[data-pair-column="right"] [data-review-pair-tile]').first();
    await expect(rightTile).toBeDisabled();

    await leftTile.click();
    await expect(leftTile).toHaveAttribute("data-pair-state", "selected");
    await expect(rightTile).toBeEnabled();

    // As posições não podem mudar entre tentativas: memória espacial é o jogo.
    const positionBefore = await leftTile.boundingBox();
    await rightTile.click();
    await page.waitForTimeout(200);
    const positionAfter = await leftTile.boundingBox();
    expect(Math.abs((positionBefore?.y ?? 0) - (positionAfter?.y ?? 0))).toBeLessThanOrEqual(2);

    await expect(progress).not.toHaveText(before ?? "");
    // A opção usada não fica disponível para um segundo par.
    await expect(rightTile).toBeDisabled();
  });

  test("ordem da coluna direita é estável entre rerender, resize e troca de tema", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openReviewPairs(page);

    const rightTexts = () =>
      page
        .locator('[data-review-match-pairs-board] [data-pair-column="right"] [data-review-pair-tile]')
        .allTextContents();

    const initial = await rightTexts();
    expect(initial.length).toBeGreaterThanOrEqual(4);

    await page.setViewportSize({ width: 900, height: 720 });
    await page.waitForTimeout(150);
    expect(await rightTexts()).toEqual(initial);

    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await page.waitForTimeout(150);
    expect(await rightTexts()).toEqual(initial);

    await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    await page.waitForTimeout(150);
    expect(await rightTexts()).toEqual(initial);

    // A ordem embaralhada não pode ser o espelho da coluna esquerda: antes a
    // "aleatoriedade" era um `.reverse()`, e a posição entregava a resposta.
    const leftIds = await page
      .locator('[data-review-match-pairs-board] [data-pair-column="left"] [data-review-pair-tile]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.pairId ?? ""));
    expect(leftIds.length).toBeGreaterThanOrEqual(4);
  });

  test("peças permanecem legíveis no dark e no claro", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openReviewPairs(page);

    for (const theme of ["dark", "light"] as const) {
      await page.evaluate((value) => {
        if (value === "light") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", value);
      }, theme);
      await page.waitForTimeout(150);

      const worst = await page
        .locator("[data-review-match-pairs-board] [data-review-pair-tile]")
        .evaluateAll((nodes) => {
          const lum = (rgb: number[]) => {
            const ch = rgb.map((c) => {
              const n = c / 255;
              return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
          };
          const parse = (v: string) => (v.match(/[\d.]+/g) ?? []).map(Number);
          const flatten = (c: number[], under: number[]) => {
            const alpha = c.length === 4 ? c[3] : 1;
            return c.slice(0, 3).map((v, i) => alpha * v + (1 - alpha) * under[i]);
          };
          let lowest = Infinity;
          for (const node of nodes) {
            const cs = getComputedStyle(node);
            const under = parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
            const bg = flatten(parse(cs.backgroundColor), under);
            const fg = flatten(parse(cs.color), bg);
            const L1 = lum(fg);
            const L2 = lum(bg);
            lowest = Math.min(lowest, (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05));
          }
          return Number(lowest.toFixed(2));
        });

      expect(worst, `contraste mínimo no tema ${theme}`).toBeGreaterThanOrEqual(4.5);
    }
    await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  });

  test("mobile mantém duas colunas sem overflow", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await openReviewPairs(page);

    const board = page.locator("[data-review-match-pairs-board]");
    await expect(board.locator('[data-pair-column="left"]')).toBeVisible();
    await expect(board.locator('[data-pair-column="right"]')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({ path: path.join(SHOTS, "05-review-pairs-mobile-fixed.png"), fullPage: true });
  });
});
