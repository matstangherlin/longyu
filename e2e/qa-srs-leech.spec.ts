import { expect, test } from "@playwright/test";
import { seedMissionsSession, waitForLazyPage } from "./helpers";

/**
 * QA 2026-10 · prompt 21 — R3: item sanguessuga (8 lapsos) sai da fila normal
 * e volta por "Palavras difíceis", com a dica antes do teste. Conta local.
 */
const now = Date.now();
const leech = {
  id: "chunk:nihao:significado",
  type: "chunk",
  itemId: "nihao",
  reviewDomain: "significado",
  track: "fala",
  ease: 1.25,
  intervalDays: 0,
  due: now - 60_000,
  reps: 0,
  lapses: 8,
  leech: true,
  createdAt: now - 10 * 86_400_000,
  reviewedAt: now - 60_000,
};

test("palavra difícil sai da fila e volta com dica @qa-r18", async ({ page }) => {
  await seedMissionsSession(page, { srs: { [leech.id]: leech } });
  await page.goto("/revisao");
  await waitForLazyPage(page);
  const card = page.getByTestId("review-leech-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Palavras difíceis");
  await expect(card).toContainText("你好");

  await card.getByTestId("review-leech-start").click();
  await waitForLazyPage(page);
  const hint = page.getByTestId("review-leech-hint");
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("你好");
  await expect(hint).toContainText("nǐ hǎo");
  await hint.getByTestId("review-leech-test").click();
  await expect(page.getByTestId("review-leech-hint")).toHaveCount(0);
  await expect(page.locator("[data-review-position]")).toHaveAttribute("data-review-position", "1/1");
});
