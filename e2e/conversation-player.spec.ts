import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady } from "./helpers";

async function openConversation(
  page: Page,
  lessonId: string,
  options: Parameters<typeof seedLessonPlayerReady>[2] = {}
) {
  await seedLessonPlayerReady(page, lessonId, options);
  await page.goto(`/licao/${lessonId}/player`);
  await dismissBlockingOverlays(page);
  const intro = page.getByRole("button", { name: "Entendi" });
  if (await intro.isVisible().catch(() => false)) await intro.click();
  const player = page.getByTestId("conversation-player");
  await expect(player).toBeVisible({ timeout: 15_000 });
  return player;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBeTruthy();
}

async function expectButtonInsideViewport(page: Page, buttonName: RegExp) {
  const button = page.getByRole("button", { name: buttonName }).last();
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

test.describe("player de conversas longas", () => {
  test("24 falas em 360x640: progressivo, histÃ³rico recolhÃ­vel e ramo de erro", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const player = await openConversation(page, "p7-imersao-estacao", { isPremium: true });

    await expect(player.getByRole("progressbar", { name: /Progresso da conversa/i })).toBeVisible();
    await expect(player.getByText(/Agora:/)).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectButtonInsideViewport(page, /^Continuar$/);

    await page.getByRole("button", { name: /^Continuar$/ }).click();
    await expect(page.getByRole("button", { name: /Rever falas anteriores/i })).toBeVisible();
    await page.getByRole("button", { name: /Rever falas anteriores/i }).click();
    await expect(page.getByRole("list", { name: /HistÃ³rico recente/i })).toBeVisible();

    await page.getByRole("button", { name: /^Responder$/ }).click();
    await expect(page.getByText(/Resposta do aluno Â· sua vez/i)).toBeVisible();
    await page.getByRole("button", { name: /ChÃ¡\./i }).click();
    await page.getByRole("button", { name: /^Verificar$/ }).click();
    await expect(page.locator('[data-conversation-kind="hint"]')).toBeVisible();
    await expect(page.locator('[data-conversation-kind="student"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Altura curta representa a viewport Ãºtil com teclado virtual aberto.
    await page.setViewportSize({ width: 360, height: 420 });
    await expectButtonInsideViewport(page, /^Continuar$/);
  });

  test("reload, offline e troca de orientaÃ§Ã£o preservam a fala atual", async ({ page, context }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const player = await openConversation(page, "p7-imersao-estacao", { isPremium: true });
    await page.getByRole("button", { name: /^Continuar$/ }).click();
    const progress = player.getByRole("progressbar", { name: /Progresso da conversa/i });
    const beforeReload = await progress.getAttribute("aria-valuenow");

    await page.reload();
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("conversation-player")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /Progresso da conversa/i })).toHaveAttribute("aria-valuenow", beforeReload!);

    await context.setOffline(true);
    await page.setViewportSize({ width: 640, height: 360 });
    await expect(page.getByTestId("conversation-player")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await context.setOffline(false);
    await page.setViewportSize({ width: 360, height: 640 });
    await expect(page.getByRole("button", { name: /Responder|Continuar/i }).last()).toBeVisible();
  });

  test("audio_first oferece Ã¡udio e sÃ³ revela texto apÃ³s interaÃ§Ã£o", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const now = Date.now();
    await openConversation(page, "p7-imersao-estacao", {
      isPremium: true,
      conversationHistory: [0, 1, 2].map((offset) => ({
        sceneId: "imersao-estacao",
        intent: "immersion-station",
        completedAt: now - offset * 60_000,
        lessonId: `previous-${offset}`,
        result: "completed",
        attempts: 1,
        assistanceLevel: offset === 0 ? "independent" : "assisted",
        setting: "street",
      })),
    });

    await expect(page.getByRole("button", { name: /Ouvir/i }).first()).toBeVisible();
    const reveal = page.getByRole("button", { name: /Revelar texto da fala/i });
    await expect(reveal).toBeVisible();
    await reveal.click();
    await expect(reveal).toHaveCount(0);
  });

  test("dark mode e reduced motion mantÃªm contraste e removem transiÃ§Ã£o da fala", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await page.setViewportSize({ width: 768, height: 900 });
    const player = await openConversation(page, "p7-imersao-estacao", { isPremium: true, theme: "dark" });
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    const bubble = player.locator('[data-conversation-kind="character"]').last();
    await expect(bubble).toBeVisible();
    await expect.poll(() => bubble.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    await expectNoHorizontalOverflow(page);
  });

  test("tablet e desktop mantÃªm etapa, foco e controles acessÃ­veis", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    const player = await openConversation(page, "l2");
    await expect(player.getByTestId("conversation-stage")).toBeVisible();
    await expect(player.getByRole("progressbar", { name: /Progresso da conversa/i })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(player).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});

