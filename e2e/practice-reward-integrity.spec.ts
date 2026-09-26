import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";
import { ALL_LESSONS } from "../src/data/journey";

/**
 * RC2.2.14 · AW–BF — recompensa de treino real e sem farm: XP só via addXp,
 * uma vez por rodada (chave idempotente), no máximo 3 rodadas pagas por modo
 * no dia; a 4ª diz "treino extra" e não paga. Tela só mostra o que ocorreu.
 */
// Hànzì libera depois de l5-rev (TOOL_UNLOCK_LESSONS.hanzi).
const DONE = ALL_LESSONS.slice(0, ALL_LESSONS.findIndex((lesson) => lesson.id === "l5-rev") + 1).map((lesson) => lesson.id);

async function xpState(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const state = raw ? ((JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {}) : {};
    const tasks = (state.dailyTasks as { practiceRewardKeys?: string[] } | undefined) ?? {};
    return { xpTotal: Number(state.xpTotal ?? 0), keys: tasks.practiceRewardKeys ?? [] };
  });
}

async function playMeaningRound(page: Page) {
  for (let i = 0; i < 8; i += 1) {
    await expect(page.locator("[data-hanzi-progress]")).toHaveText(`${i + 1}/8`);
    // Guarda de toque que atravessa: cliques nos primeiros 350ms do item são ignorados.
    await page.waitForTimeout(400);
    await page.locator('[data-hanzi-option][data-qa-correct="true"]').first().click();
    if (i < 7) await expect(page.locator("[data-hanzi-progress]")).toHaveText(`${i + 2}/8`, { timeout: 5_000 });
  }
  await expect(page.getByTestId("practice-completion")).toBeVisible({ timeout: 5_000 });
}

test("rodadas pagam XP uma vez cada, até 3 por modo no dia; a 4ª não paga", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedOnboardedSession(page, DONE);
  await page.goto("/hanzi?mode=meaning");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const start = await xpState(page);

  for (let round = 1; round <= 3; round += 1) {
    await playMeaningRound(page);
    const completion = page.getByTestId("practice-completion");
    await expect(completion).toHaveAttribute("data-practice-xp", "6");
    await expect(page.locator("[data-practice-score]")).toHaveText("8/8");
    const now = await xpState(page);
    expect(now.xpTotal - start.xpTotal).toBe(6 * round);
    expect(now.keys.filter((key) => key.includes(":meaning:")).length).toBe(round);
    if (round === 1) await page.screenshot({ path: "test-results/rc2-2-14/practice-completion-390x844.png" });
    // Toque duplo em "Continuar treinando" abre UMA rodada nova (não paga nada).
    await page.locator("[data-practice-continue]").dblclick();
    await expect(page.locator("[data-hanzi-progress]")).toHaveText("1/8");
    await expect(page.locator('[data-hanzi-option][data-state="idle"]')).toHaveCount(4);
  }

  await playMeaningRound(page);
  await expect(page.getByTestId("practice-completion")).toHaveAttribute("data-practice-xp", "0");
  await expect(page.locator("[data-practice-xp-capped]")).toBeVisible();
  const end = await xpState(page);
  expect(end.xpTotal - start.xpTotal).toBe(18);
  expect(end.keys.filter((key) => key.includes(":meaning:")).length).toBe(3);
  // Nenhuma Pérola inventada: significado não muda hànzì aprendidos.
  await expect(page.getByTestId("practice-completion")).toHaveAttribute("data-practice-pearls", "0");
});
