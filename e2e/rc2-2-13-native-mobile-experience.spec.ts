import { expect, test, type Page } from "@playwright/test";
import { IMMERSION_DISCOVERED_STATE, allowE2ELocalSession, dismissBlockingOverlays, matureDiscoveryState, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.13 — Android Native UX (parte verificável no navegador).
 *
 * A voz nativa, as permissões e os lembretes só existem no Android: aqui se
 * prova o que é do shell comum (safe-area, TabBar, TopBar, sheets, densidade)
 * e que a Web não ganha nada do que é nativo (sem intro, sem seções nativas).
 * Geometria real, não snapshot.
 */
const STORE_VERSION = 24;

async function seed(page: Page, state: Record<string, unknown> = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ payload }) => {
      if (sessionStorage.getItem("rc2213-seeded")) return;
      sessionStorage.setItem("rc2213-seeded", "1");
      localStorage.setItem("longyu-v1", payload);
    },
    {
      payload: JSON.stringify({
        state: { accountSetupComplete: true, completedLessons: ["l1", "l2", "l3"], holdAchievementModals: true, streak: 12, xpTotal: 900, ...state },
        version: STORE_VERSION,
      }),
    }
  );
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

const tabBar = (page: Page) => page.locator("[data-app-bottom-nav]");

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("RC2.2.13 — navegação mobile", () => {
  for (const width of [360, 390, 412]) {
    test(`TabBar ${width}px: Jornada · Praticar · Cultura · Missões · Mais`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await seed(page);
      await open(page, "/jornada");
      const labels = (await tabBar(page).locator("a, button").allInnerTexts()).map((label) => label.trim());
      expect(labels).toEqual(["Jornada", "Praticar", "Cultura", "Missões", "Mais"]);
      for (const box of await tabBar(page).locator("a, button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height)))
        expect(box).toBeGreaterThanOrEqual(48);
      await noHorizontalOverflow(page);
    });
  }

  test("Cultura é aba primária e não se repete no sheet Mais", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await open(page, "/jornada");
    await tabBar(page).getByRole("link", { name: "Cultura" }).click();
    await expect(page).toHaveURL(/\/cultura$/);
    await expect(tabBar(page).getByRole("link", { name: "Cultura" })).toHaveAttribute("aria-current", "page");
    await expect(tabBar(page).getByRole("button", { name: "Mais" })).not.toHaveAttribute("aria-current", "page");
    await tabBar(page).getByRole("button", { name: "Mais" }).click();
    const more = page.getByRole("dialog", { name: "Mais opções" });
    await expect(more).toBeVisible();
    await expect(more.getByRole("link", { name: "Cultura" })).toHaveCount(0);
    await expect(more.getByRole("link", { name: "Perfil" })).toHaveCount(0);
  });

  test("sheet Praticar: 2 colunas, ordem fixa, alvos ≥ 48px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    // RC2.2.18 — sheet completo = conta que já descobriu Revisão, Hànzì e Imersão.
    await seed(page, matureDiscoveryState());
    await open(page, "/jornada");
    await tabBar(page).getByRole("button", { name: "Praticar" }).click();
    const sheet = page.getByRole("dialog", { name: "Praticar" });
    await expect(sheet).toBeVisible();
    await sheet.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
    const items = sheet.locator(".grid a");
    await expect(items).toHaveText(["Revisão", "Hànzì", "Pinyin Lab", "Fala", "Leitura", "Imersão", "Biblioteca"]);
    const boxes = await items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), h: r.height })));
    expect(new Set(boxes.map((box) => box.x)).size).toBe(2);
    for (const box of boxes) expect(box.h).toBeGreaterThanOrEqual(48);
    // Sheet inteiro dentro da tela (nada cortado pela base).
    const panel = await sheet.boundingBox();
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(780 + 1);
  });

  test("Perfil entra pelo avatar da TopBar (sem aba)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await open(page, "/jornada");
    await expect(tabBar(page).getByText("Perfil")).toHaveCount(0);
    await page.getByTestId("topbar-avatar").click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByTestId("topbar-avatar")).toHaveAttribute("aria-current", "page");
    await expect(tabBar(page).locator("[aria-current=page]")).toHaveCount(0);
  });
});

test.describe("RC2.2.13 — TopBar compacta", () => {
  test("< 390px: logo + Fôlego + Ofensiva + Avatar (Qi escondido)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seed(page);
    await open(page, "/jornada");
    await expect(page.getByTestId("topbar-qi")).toBeHidden();
    for (const id of ["topbar-energy", "topbar-streak", "topbar-avatar"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.height, id).toBeGreaterThanOrEqual(48);
      expect(box!.x + box!.width, id).toBeLessThanOrEqual(360);
    }
    await noHorizontalOverflow(page);
  });

  test("≥ 390px: contadores compactos com Qi", async ({ page }) => {
    // WebKit/desktop Playwright reserva barra de rolagem; em 390px exatos o
    // `min-[390px]` pode ver < 390 e esconder o Qi. 414px (iPhone Plus típico)
    // fica claramente acima do breakpoint sem mudar o contrato do produto.
    await page.setViewportSize({ width: 414, height: 896 });
    // RC2.2.18 · AI — o Qi aparece depois que a economia foi apresentada.
    await seed(page, { points: 40 });
    await open(page, "/jornada");
    await expect(page.getByTestId("topbar-qi")).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe("RC2.2.13 — harness de safe-area", () => {
  const TOPS = [0, 24, 32, 48];
  const BOTTOMS = [0, 24, 34, 48];
  for (let i = 0; i < TOPS.length; i += 1) {
    const top = TOPS[i];
    const bottom = BOTTOMS[i];
    test(`insets top ${top}px / bottom ${bottom}px: TopBar e TabBar fora das barras do sistema`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await seed(page);
      // Mesma variável que o Capacitor injeta no Android edge-to-edge.
      await page.addInitScript(
        ({ t, b }) => {
          const apply = () => {
            document.documentElement.style.setProperty("--safe-area-inset-top", `${t}px`);
            document.documentElement.style.setProperty("--safe-area-inset-bottom", `${b}px`);
          };
          if (document.documentElement) apply();
          document.addEventListener("DOMContentLoaded", apply);
        },
        { t: top, b: bottom }
      );
      await open(page, "/jornada");
      const tokens = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.cssText = "position:fixed;top:var(--app-safe-top);height:var(--app-safe-bottom)";
        document.body.appendChild(probe);
        const r = probe.getBoundingClientRect();
        probe.remove();
        return { top: r.top, bottom: r.height };
      });
      expect(tokens.top).toBe(top);
      expect(tokens.bottom).toBe(bottom);
      for (const id of ["topbar-energy", "topbar-streak", "topbar-avatar"]) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box!.y, `${id} sob a status bar`).toBeGreaterThanOrEqual(top);
      }
      const items = await tabBar(page).locator("a, button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom));
      for (const itemBottom of items) expect(itemBottom, "item da TabBar sob a barra de gestos").toBeLessThanOrEqual(844 - bottom + 0.5);
      const nav = await tabBar(page).boundingBox();
      expect(Math.round(nav!.y + nav!.height)).toBe(844);
      // Sheet também respeita a base.
      await tabBar(page).getByRole("button", { name: "Praticar" }).click();
      const footer = page.getByRole("dialog", { name: "Praticar" }).getByRole("link", { name: "Abrir Praticar" });
      await expect(footer).toBeVisible();
      // Mede depois do pop-in (translateY) terminar.
      await page.getByRole("dialog", { name: "Praticar" }).evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
      const footerBox = await footer.boundingBox();
      expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(844 - bottom + 0.5);
    });
  }
});

test.describe("RC2.2.13 — densidade mobile", () => {
  test("Cultura: conteúdo na primeira dobra (390×844)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await open(page, "/cultura");
    await expect(page.getByTestId("culture-hub")).toHaveAttribute("data-hub-density", "compact");
    const first = page.getByTestId("culture-featured").locator("> *").first();
    const box = await first.boundingBox();
    expect(box!.y).toBeLessThan(844 - 72);
  });

  test("Perfil 360px: cabeçalho horizontal e rótulos sem corte", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seed(page);
    await open(page, "/perfil");
    const header = await page.getByTestId("profile-header").boundingBox();
    expect(header!.height).toBeLessThan(200);
    const avatar = await page.getByTestId("profile-avatar").boundingBox();
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(title!.x).toBeGreaterThan(avatar!.x + avatar!.width - 1);
    await noHorizontalOverflow(page);
  });

  test("Imersão compacta", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seed(page, IMMERSION_DISCOVERED_STATE);
    await open(page, "/imersao");
    await expect(page.getByTestId("immersion-hub")).toHaveAttribute("data-hub-density", "compact");
    await noHorizontalOverflow(page);
  });
});

test.describe("RC2.2.13 — Web não ganha o que é nativo", () => {
  test("sem intro de permissões e sem seções nativas em Configurações", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await open(page, "/config");
    await expect(page.getByTestId("native-permission-intro")).toHaveCount(0);
    await expect(page.getByTestId("native-permissions-card")).toHaveCount(0);
    await expect(page.getByTestId("native-notifications-card")).toHaveCount(0);
  });

  test("política de privacidade: fala pelo serviço do aparelho e lembretes locais", async ({ page }) => {
    await seed(page);
    await open(page, "/privacidade");
    await expect(page.getByText("Longyu não armazena a gravação. O reconhecimento pode ser processado pelo serviço de fala configurado no dispositivo", { exact: false })).toBeVisible();
    await expect(page.getByText("lembretes locais da ofensiva", { exact: false })).toBeVisible();
  });
});
