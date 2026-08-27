import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedTopicMasterySession,
  waitForLazyPage,
} from "./helpers";
import { seedRichMissions } from "./missions-helpers";
import {
  advanceUntilSelector,
  assertNoStickyBarOverlap,
  seedProOnTopOfSession,
} from "./lesson-player-mobile-helpers";

test.describe("V4.7.4 sentinelas de bugs históricos", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("listen_select: opções únicas e atalho marca data-selected", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const entendi = page.getByRole("button", { name: "Entendi" });
    if (await entendi.isVisible().catch(() => false)) {
      await entendi.click();
    }
    const skipSpeak = page.getByRole("button", { name: /Não posso falar agora/i });
    if (await skipSpeak.isVisible().catch(() => false)) {
      await skipSpeak.click();
    }
    await expect(page.locator("[data-option-index]").first()).toBeVisible({ timeout: 15_000 });
    const labels = await page.locator("[data-option-index]").allTextContents();
    const hanzi = labels.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
    expect(new Set(hanzi).size, "Hànzì repetido nas opções").toBe(hanzi.length);
    await page.keyboard.press("Digit1");
    await expect(page.locator('[data-option-index="0"][data-selected="true"]')).toBeVisible();
  });

  test("sticky não cobre as opções na primeira escolha", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await assertNoStickyBarOverlap(page);
  });

  test("player não fica em Preparando atividades…", async ({ page }) => {
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByText("Preparando atividades")).toHaveCount(0, { timeout: 8_000 });
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
  });

  test("transferência não mostra a resposta completa antes da tentativa", async ({ page }) => {
    test.setTimeout(150_000);
    await seedLessonPlayerReady(page, "l2-rev", { masteryLevel: 0 });
    await seedProOnTopOfSession(page);
    await page.goto("/licao/l2-rev/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const ok = await advanceUntilSelector(page, '[data-production-step="transfer_task"]', 40, 120_000);
    expect(ok, "transfer_task deve aparecer").toBe(true);
    const transfer = page.locator('[data-production-step="transfer_task"]');
    await expect(transfer.locator("[data-production-situation]")).not.toContainText(/请问，你叫什么/);
    const input = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("");
  });

  test("missão: CTA visível sem overlap destrutivo", async ({ page }) => {
    await seedRichMissions(page);
    await page.goto("/missoes");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-mission-surface]")).toBeVisible({ timeout: 15_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("progresso 1/4 não regride após reload", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
  });
});
