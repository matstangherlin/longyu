import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";
import { ALL_LESSONS } from "../src/data/journey";

/**
 * RC2.2.14 · AD–AV — hub de Ideogramas focado em treinar e treino em modo
 * foco (sem TopBar/TabBar), rodada de até 8, carta de montagem 220–280px.
 */
// Hànzì libera depois de l5-rev (TOOL_UNLOCK_LESSONS.hanzi).
const DONE = ALL_LESSONS.slice(0, ALL_LESSONS.findIndex((lesson) => lesson.id === "l5-rev") + 1).map((lesson) => lesson.id);

async function open(page: Page, path: string, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await seedOnboardedSession(page, DONE);
  await page.goto(path);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

test("hub: Treinar agora acima da dobra, modos em 2 colunas, Atlas e Pro depois", async ({ page }) => {
  await open(page, "/ideogramas");
  const trainNow = page.getByTestId("hanzi-train-now");
  await expect(trainNow).toBeVisible();
  const cta = page.getByTestId("hanzi-train-now-cta");
  const ctaBox = await cta.boundingBox();
  expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(844);
  expect(ctaBox!.height).toBeGreaterThanOrEqual(48);

  const modes = page.locator("[data-hanzi-mode]");
  await expect(modes).toHaveCount(6);
  const xs = new Set<number>();
  for (let i = 0; i < 6; i += 1) xs.add(Math.round((await modes.nth(i).boundingBox())!.x));
  expect(xs.size).toBe(2);

  const gridBottom = (await page.getByTestId("hanzi-mode-grid").boundingBox())!;
  const atlas = (await page.getByTestId("hanzi-atlas-link").boundingBox())!;
  const pro = (await page.getByTestId("hanzi-pro-lab").boundingBox())!;
  expect(atlas.y).toBeGreaterThan(gridBottom.y);
  expect(pro.y).toBeGreaterThan(atlas.y);
  await page.screenshot({ path: "test-results/rc2-2-14/hanzi-hub-390x844.png" });
});

for (const [width, height] of [
  [360, 740],
  [390, 844],
  [432, 960],
] as const) {
  test(`treino ${width}×${height}: foco sem chrome global, 1/8, carta 220–280, Verificar visível`, async ({ page }) => {
    await open(page, "/ideogramas", width, height);
    await page.locator('[data-hanzi-mode="fragments"]').click();
    await expect(page).toHaveURL(/\/hanzi\?mode=fragments$/);
    await expect(page.getByTestId("hanzi-training")).toBeVisible();
    await expect(page.locator("[data-app-bottom-nav]")).toHaveCount(0);
    await expect(page.getByTestId("topbar-avatar")).toHaveCount(0);
    await expect(page.locator("[data-hanzi-progress]")).toHaveText(/^1\/[1-8]$/);

    const canvas = await page.locator("[data-builder-canvas-wrap] > div").first().boundingBox();
    expect(canvas!.width).toBeGreaterThanOrEqual(220);
    expect(canvas!.width).toBeLessThanOrEqual(280);

    const verify = page.locator("[data-hanzi-action-region]").getByRole("button", { name: /Verificar/ });
    await expect(verify).toBeVisible();
    const box = await verify.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `test-results/rc2-2-14/hanzi-builder-${width}x${height}.png` });

    await page.getByRole("button", { name: "Sair do treino" }).click();
    await expect(page).toHaveURL(/\/ideogramas$/);
  });
}
