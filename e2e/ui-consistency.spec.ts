import { expect, test, type Page } from "@playwright/test";
import { seedOnboardedSession } from "./helpers";

async function dismissAchievementModal(page: Page) {
  const rewardDialog = page.getByRole("dialog", { name: "Nova medalha desbloqueada" });
  for (let index = 0; index < 8; index += 1) {
    const appeared = await rewardDialog
      .waitFor({ state: "visible", timeout: index === 0 ? 1_500 : 500 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) return;
    await rewardDialog.getByRole("button", { name: "Continuar" }).click();
  }
  throw new Error("Fila de medalhas não encerrou durante o setup do teste.");
}

async function expectNoHorizontalOverflow(page: Page, route: string) {
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.root, `${route} excedeu a largura da viewport`).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.body, `${route} excedeu a largura da viewport`).toBeLessThanOrEqual(metrics.viewport);
}

test.describe("consistência visual e responsiva", () => {
  test("rotas principais não criam overflow horizontal em 360 × 640", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seedOnboardedSession(page);

    for (const route of [
      "/jornada",
      "/treino",
      "/revisao",
      "/biblioteca",
      "/pinyin",
      "/missoes",
      "/conquistas",
      "/ligas",
      "/loja",
      "/perfil",
      "/conta",
      "/ajustes",
    ]) {
      await expectNoHorizontalOverflow(page, route);
    }
  });

  test("navegação mobile mantém alvos de toque de pelo menos 44 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seedOnboardedSession(page);
    await page.goto("/jornada");

    const sizes = await page.locator("nav").last().getByRole("link").evaluateAll((links) =>
      links.map((link) => {
        const rect = link.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("navegação desktop é acessível por teclado e tem alvos adequados", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedOnboardedSession(page);
    await page.goto("/jornada");

    const sidebar = page.locator("aside nav").first();
    const links = sidebar.getByRole("link");
    await expect(links.first()).toBeVisible();
    const heights = await links.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().height)
    );
    expect(heights.every((height) => height >= 44)).toBe(true);

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });

  test("tema selecionado em Ajustes persiste após reload", async ({ page }) => {
    await seedOnboardedSession(page);
    await page.goto("/ajustes");
    await dismissAchievementModal(page);

    await page.getByRole("button", { name: /Longyu Dark/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: /Notion Clay/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "clay");
  });

  test("reduced motion desativa animações e transições funcionais", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedOnboardedSession(page);
    await page.goto("/jornada");

    const animation = await page.locator("main").evaluate((main) => {
      const target = main.querySelector<HTMLElement>(".animate-pop, .animate-pulse, .transition");
      if (!target) return null;
      const style = getComputedStyle(target);
      return {
        animationName: style.animationName,
        transitionDuration: style.transitionDuration,
      };
    });
    if (animation) {
      expect(animation.animationName).toBe("none");
      expect(animation.transitionDuration).toBe("0s");
    }
  });

  test("modal prende o foco, fecha com Escape e restaura o acionador", async ({ page }) => {
    await seedOnboardedSession(page);
    await page.goto("/ajustes");
    await dismissAchievementModal(page);

    const opener = page.getByRole("button", { name: "Ver quais dados são coletados" });
    await opener.focus();
    await opener.click();

    const dialog = page.getByRole("dialog", { name: "Dados coletados" });
    await expect(dialog).toBeVisible();
    await expect.poll(() =>
      page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});
