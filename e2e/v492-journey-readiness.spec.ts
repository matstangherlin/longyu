import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedCompletedJourneyNodes,
  seedFreshJourneySession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";

/**
 * V4.9.2 — o portão da Jornada vale em qualquer porta.
 *
 * Até a V4.9.1 bastava conhecer a URL para entrar num reforço sem ter o
 * pré-requisito: o painel checava, o deep link não. Estes testes cobrem os dois
 * lados da mesma autoridade — bloquear quem chegou cedo e deixar passar quem
 * cumpriu o requisito —, porque um portão que só sabe bloquear seria igualmente
 * quebrado.
 */
test.describe("V4.9.2 Journey readiness authority", () => {
  test("deep link para reforço sem pré-requisito é bloqueado, não liberado", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/som?journeyNode=booster%3Atone-number-1-4%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const locked = page.getByTestId("journey-node-locked");
    await expect(locked).toBeVisible();
    // A razão é parte do contrato: o bloqueio precisa dizer o que falta.
    await expect(locked).toHaveAttribute("data-reason", /MISSING_TARGET|TARGET_STAGE_TOO_LOW/);
    // E o Tone Trainer não pode ter renderizado por trás do aviso.
    await expect(page.locator("[data-tone-contour]")).toHaveCount(0);
  });

  test("mesmo reforço abre quando o requisito está cumprido", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-o-que-e-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao"],
    });
    await page.goto("/som?journeyNode=booster%3Atone-number-1-4%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByTestId("journey-node-locked")).toHaveCount(0);
  });

  test("pré-requisito de cápsula vale para quem entra pela URL", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-primeiros-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao", "mu"],
    });
    // Sem a cápsula concluída, a prática de Pinyin permanece fechada.
    await page.goto("/pinyin?journeyNode=booster%3Apinyin-practice%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("journey-node-locked")).toHaveAttribute(
      "data-reason",
      "CAPSULE_PREREQUISITE"
    );
  });

  test("a mesma URL abre depois da cápsula concluída", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-primeiros-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao", "mu"],
    });
    await seedCompletedJourneyNodes(page, ["node:capsule:pinyin-foundation:v1"]);
    await page.goto("/pinyin?journeyNode=booster%3Apinyin-practice%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("journey-node-locked")).toHaveCount(0);
    await expect(page.getByTestId("journey-pinyin-booster")).toBeVisible();
  });

  test("rota sem node na URL segue livre", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/som");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("journey-node-locked")).toHaveCount(0);
  });
});
