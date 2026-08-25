/**
 * V4.6 — Integridade cognitiva da transferência L15.
 *
 * Antes de responder / erro / ajuda nível ≥ 3:
 * - âncora 你叫什么 visível
 * - componente 请问 pode estar visível
 * - alvo completo 请问，你叫什么 NÃO visível
 * - input utilizável; CTA não cobre
 *
 * Após resposta correta: alvo pode aparecer no feedback.
 * Após ajuda explícita até nível 3: alvo pode aparecer na transformação.
 */
import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import { advanceUntilSelector, seedProOnTopOfSession } from "./lesson-player-mobile-helpers";

const TARGET = "请问，你叫什么？";
const ANCHOR = "你叫什么";
const COMPONENT = "请问";

const VIEWPORTS = [
  { label: "360×640", width: 360, height: 640 },
  { label: "375×667", width: 375, height: 667 },
  { label: "390×844", width: 390, height: 844 },
  { label: "667×360 landscape", width: 667, height: 360 },
] as const;

async function openL15Transfer(page: import("@playwright/test").Page) {
  await seedLessonPlayerReady(page, "l2-rev", { masteryLevel: 0 });
  await seedProOnTopOfSession(page);
  await page.goto("/licao/l2-rev/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const ok = await advanceUntilSelector(page, '[data-production-step="transfer_task"]', 40, 120_000);
  expect(ok, "transfer_task deve aparecer em l2-rev (L15)").toBe(true);
}

for (const viewport of VIEWPORTS) {
  test.describe(`V4.6 transfer target integrity · ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.setTimeout(150_000);

    test("antes da tentativa o alvo completo não aparece", async ({ page }) => {
      await openL15Transfer(page);

      const transfer = page.locator('[data-production-step="transfer_task"]');
      await expect(transfer).toBeVisible();
      await expect(transfer).toHaveAttribute("data-transfer-target-revealed", "false");

      await expect(page.locator("[data-transfer-anchor]")).toContainText(new RegExp(ANCHOR));
      await expect(page.locator("[data-transfer-component]")).toContainText(new RegExp(COMPONENT));

      const bodyText = await transfer.innerText();
      expect(bodyText.replace(/\s/g, "")).not.toContain(TARGET.replace(/\s/g, ""));

      // Transform hint com .to não deve estar montado antes da revelação
      const hint = page.locator("[data-production-transform-hint]");
      if (await hint.count()) {
        await expect(hint).not.toContainText(TARGET);
      }

      const goal = page.locator("[data-production-goal]");
      if (await goal.count()) {
        await expect(goal).not.toContainText(TARGET);
      }

      await expect(page.locator("[data-production-situation]")).not.toContainText(TARGET);

      const input = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
      await expect(input).toBeVisible();
      await expect(input).toBeEditable();

      const sticky = page.locator("[data-lesson-sticky-actions]");
      if (await sticky.isVisible().catch(() => false)) {
        const inputBox = await input.boundingBox();
        const stickyBox = await sticky.boundingBox();
        if (inputBox && stickyBox) {
          const overlap =
            inputBox.y < stickyBox.y + stickyBox.height &&
            inputBox.y + inputBox.height > stickyBox.y;
          expect(overlap, "CTA sticky não deve cobrir o input").toBe(false);
        }
      }
    });

    test("após resposta correta o alvo pode aparecer no feedback", async ({ page }) => {
      await openL15Transfer(page);

      const input = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
      await input.fill(TARGET);
      await page.getByRole("button", { name: /^Verificar$/ }).click();

      await expect(page.getByText(/Certo|\+Qi|Continue|Próximo|Boa/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator('[data-production-step="transfer_task"]')).toHaveAttribute(
        "data-transfer-target-revealed",
        "true"
      );
      await expect(page.locator("body")).toContainText(TARGET);
    });
  });
}

test.describe("V4.6 transfer help reveal", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(150_000);

  test("alvo completo só após ajuda até nível de revelação", async ({ page }) => {
    await openL15Transfer(page);

    const transfer = page.locator('[data-production-step="transfer_task"]');
    await expect(transfer).toHaveAttribute("data-transfer-target-revealed", "false");

    // Pedir dicas até nível 3 (revelação)
    for (let i = 0; i < 3; i += 1) {
      const help = page.locator("[data-production-help-request]");
      if (!(await help.isVisible().catch(() => false))) break;
      await help.click();
      await page.waitForTimeout(150);
    }

    await expect(transfer).toHaveAttribute("data-transfer-target-revealed", "true");
    await expect(transfer).toContainText(TARGET);
  });
});
