import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedFreshJourneySession, waitForLazyPage } from "./helpers";
import { ALL_LESSONS } from "../src/data/journey";
import { clickFirstVisible } from "./lesson-player-helpers";

const FIRST = ALL_LESSONS[0];

test.describe("percentual de progresso da lição", () => {
  test("player não fica em Preparando e a barra é determinada", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByText("Preparando atividades")).toHaveCount(0, { timeout: 8_000 });
    await expect(page.getByText("Preparando lição")).toHaveCount(0);

    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toBeVisible({ timeout: 15_000 });

    const bar = page.locator('[role="progressbar"][data-progress-pct]').first();
    await expect(bar).toBeVisible();
    const pctBefore = Number(await bar.getAttribute("data-progress-pct"));
    expect(pctBefore, "percentual determinado no primeiro passo").toBeGreaterThanOrEqual(0);
    expect(pctBefore).toBeLessThanOrEqual(100);

    const label = page.locator("[data-lesson-progress-label]");
    await expect(label).toHaveText(/^\d+\/\d+$/);
    const [valueBefore, maxBefore] = (await label.innerText()).split("/").map(Number);
    expect(maxBefore).toBeGreaterThan(0);
    expect(valueBefore).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: "/opt/cursor/artifacts/lesson_progress_bar_first_step.png" });

    await clickFirstVisible(page, [/^Entendi$/, /^Continuar$/, /^Verificar$/]);
    await page.waitForTimeout(400);

    await expect(page.getByText("Preparando atividades")).toHaveCount(0);
    await expect(bar).toBeVisible();
    const pctAfter = Number(await bar.getAttribute("data-progress-pct"));
    expect(Number.isFinite(pctAfter)).toBeTruthy();
    expect(pctAfter).toBeGreaterThanOrEqual(0);
    expect(pctAfter).toBeLessThanOrEqual(100);

    const afterText = await label.innerText();
    if (/^\d+\/\d+$/.test(afterText)) {
      const [valueAfter] = afterText.split("/").map(Number);
      expect(valueAfter).toBeGreaterThanOrEqual(valueBefore);
    }
    await page.screenshot({ path: "/opt/cursor/artifacts/lesson_progress_bar_after_step.png" });
  });
});
