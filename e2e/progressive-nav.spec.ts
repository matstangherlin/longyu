import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";
import { ACHIEVEMENTS } from "../src/data/achievements";

const STORE_VERSION = 15;

type SeedState = Record<string, unknown>;

// Marca todas as medalhas como já obtidas: sem esse pré-selo, o
// AchievementsWatcher enfileira modais de medalha a cada load do estado
// semeado, cobrindo a UI que os testes precisam tocar.
function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

/** Semeia um estado de conta arbitrário antes do primeiro load. */
async function seedStage(page: Page, state: SeedState) {
  await seedTelemetryDeclined(page);
  await page.addInitScript(
    (payload: string) => localStorage.setItem("longyu-v1", payload),
    JSON.stringify({
      state: { accountSetupComplete: true, achievementsUnlocked: allAchievementsUnlocked(), ...state },
      version: STORE_VERSION,
    })
  );
}

/**
 * Estabelece a origem e escreve o store via localStorage direto — usado nos
 * testes de PROGRESSÃO (múltiplos loads). Evitamos `addInitScript` aqui porque
 * ele re-executaria a cada navegação e sobrescreveria a mudança de estágio.
 */
async function establishOrigin(page: Page) {
  await seedTelemetryDeclined(page);
  await page.goto("/");
}
async function setStore(page: Page, state: SeedState) {
  await page.evaluate(
    (payload: string) => localStorage.setItem("longyu-v1", payload),
    JSON.stringify({
      state: { accountSetupComplete: true, achievementsUnlocked: allAchievementsUnlocked(), ...state },
      version: STORE_VERSION,
    })
  );
}

/** Rótulos dos destinos da barra inferior (mobile). */
async function bottomTabLabels(page: Page): Promise<string[]> {
  const nav = page.locator("nav.fixed").first();
  await expect(nav).toBeVisible();
  return nav.locator("a, button").allInnerTexts();
}

test.describe("navegação progressiva — mobile", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("usuário novo vê poucos destinos, com a Jornada em foco", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const labels = (await bottomTabLabels(page)).map((t) => t.trim());
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(labels).toEqual(["Jornada", "Perfil", "Mais"]);

    // Sem overflow horizontal.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("após liberar o Treino, prática e revisão entram na barra", async ({ page }) => {
    await seedStage(page, { completedLessons: ["l1", "l2", "l1-rev"] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const labels = (await bottomTabLabels(page)).map((t) => t.trim());
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(labels).toEqual(["Jornada", "Praticar", "Revisão", "Perfil", "Mais"]);
  });

  test("usuário recorrente ganha Missões na barra principal", async ({ page }) => {
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev"],
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const labels = (await bottomTabLabels(page)).map((t) => t.trim());
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(labels).toEqual(["Jornada", "Praticar", "Missões", "Perfil", "Mais"]);
  });

  test("toque em Praticar/Perfil/Mais abre sheet com atalhos (estilo Duolingo)", async ({ page }) => {
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev"],
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const tabBar = page.locator("nav.fixed").first();

    await tabBar.getByRole("button", { name: /^Praticar$/i }).click();
    const practiceSheet = page.getByRole("dialog", { name: "Praticar" });
    await expect(practiceSheet).toBeVisible();
    await expect(practiceSheet.getByRole("link", { name: "Hànzì" })).toBeVisible();
    await expect(practiceSheet.getByRole("link", { name: "Pinyin Lab" })).toBeVisible();
    await expect(practiceSheet.getByRole("link", { name: "Revisão" })).toBeVisible();
    await expect(practiceSheet.getByRole("link", { name: "Abrir Praticar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(practiceSheet).toHaveCount(0);

    await tabBar.getByRole("button", { name: /^Perfil$/i }).click();
    const profileSheet = page.getByRole("dialog", { name: "Perfil" });
    await expect(profileSheet).toBeVisible();
    await expect(profileSheet.getByRole("link", { name: "Amigos" })).toBeVisible();
    await expect(profileSheet.getByRole("link", { name: "Conta" })).toBeVisible();
    await expect(profileSheet.getByRole("link", { name: "Abrir Perfil" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(profileSheet).toHaveCount(0);

    await tabBar.getByRole("button", { name: /^Mais$/i }).click();
    const moreSheet = page.getByRole("dialog", { name: "Mais opções" });
    await expect(moreSheet).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Loja" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Ajustes" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Ver menu completo" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Hànzì" })).toHaveCount(0);
    await expect(moreSheet.getByRole("link", { name: "Amigos" })).toHaveCount(0);
  });

  test("rota direta funciona mesmo quando não está na barra do estágio", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    // Loja não aparece na barra do usuário novo, mas o deep link precisa abrir.
    await page.goto("/loja");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("menu Mais lista tudo agrupado por objetivo", async ({ page }) => {
    await seedStage(page, { completedLessons: ["l1"] });
    await page.goto("/mais");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 2, name: "Aprender" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Motivação" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Conta" })).toBeVisible();
    // Área bloqueada por progressão aparece com marca "Depois" (explicada, não escondida).
    await expect(page.getByText("Depois").first()).toBeVisible();
  });
});

test.describe("descoberta progressiva de recursos", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("anuncia área recém-liberada uma vez e não repete após dispensar", async ({ page }) => {
    test.slow();
    await establishOrigin(page);

    // 1) Usuário novo: inicializa a memória de dicas, sem enxurrada.
    await setStore(page, { completedLessons: ["l1"] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByText("Você liberou o Treino")).toHaveCount(0);

    // 2) Progride no mesmo aparelho → anuncia o Treino.
    await setStore(page, { completedLessons: ["l1", "l2", "l1-rev"] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const card = page.getByText("Você liberou o Treino");
    await expect(card).toBeVisible();

    // 3) Dispensa ("Depois") → não reaparece após recarregar.
    // A medalha de "3 lições" pode enfileirar modais sobre o card; drena antes.
    for (let i = 0; i < 6; i += 1) {
      await dismissBlockingOverlays(page);
      if ((await page.getByRole("dialog").count()) === 0) break;
      await page.waitForTimeout(200);
    }
    const depois = page.getByRole("button", { name: "Depois" });
    await expect(depois).toBeVisible();
    await depois.click();
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByText("Você liberou o Treino")).toHaveCount(0);
  });

  test("usuário antigo não recebe enxurrada de anúncios após a atualização", async ({ page }) => {
    // Primeiro acesso já em estágio avançado (Hànzì liberado): nada é anunciado.
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev", "l2-rev", "l3", "l4", "l5", "l5-rev"],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/Você liberou/)).toHaveCount(0);
  });
});

test.describe("navegação progressiva — desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("sidebar fica compacta e cresce com o progresso sem explodir opções", async ({ page }) => {
    test.slow();
    await establishOrigin(page);
    await setStore(page, { completedLessons: [] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const sidebar = page.locator("aside nav").first();
    const earlyLabels = (await sidebar.getByRole("link").allInnerTexts()).map((t) => t.trim());
    const earlyButtons = await sidebar.getByRole("button").count();
    const early = earlyLabels.length + earlyButtons;
    expect(early).toBeLessThanOrEqual(4);
    expect(earlyLabels).toContain("Jornada");

    await setStore(page, {
      completedLessons: ["l1", "l2", "l1-rev", "l2-rev", "l3", "l4", "l5", "l5-rev"],
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const advancedLabels = (await sidebar.getByRole("link").allInnerTexts()).map((t) => t.trim());
    const advancedButtons = await sidebar.getByRole("button").count();
    const advanced = advancedLabels.length + advancedButtons;

    expect(advanced).toBeGreaterThan(early);
    expect(advanced).toBeLessThanOrEqual(8);
    // Hànzì e Imersão não poluem a barra principal — ficam no hover de Praticar.
    expect(advancedLabels).not.toContain("Hànzì");
    expect(advancedLabels).not.toContain("Imersão");
    expect(advancedLabels).not.toContain("Amigos");
    // Perfil imediatamente acima de Mais (rodapé da rail).
    const profileTop = await sidebar.getByRole("link", { name: /^Perfil$/i }).evaluate(
      (el) => el.getBoundingClientRect().top
    );
    const moreTop = await sidebar.getByRole("button", { name: /^Mais$/i }).evaluate(
      (el) => el.getBoundingClientRect().top
    );
    expect(profileTop).toBeLessThan(moreTop);
    // Alvos de toque adequados em todos os links/botões da sidebar.
    const heights = await sidebar.locator("a, button").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height)
    );
    expect(heights.every((h) => h >= 44)).toBe(true);
  });

  test("Mais abre popover curto no hover, só com atalhos de sistema", async ({ page }) => {
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev"],
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const moreButton = page.locator("aside").getByRole("button", { name: /^Mais$/i });
    await expect(moreButton).toBeVisible();
    await moreButton.hover();

    const menu = page.getByRole("menu", { name: "Mais opções" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Ajustes" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Ver menu completo" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Hànzì" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Amigos" })).toHaveCount(0);

    await page.locator("main").hover({ position: { x: 40, y: 40 } });
    await expect(menu).toHaveCount(0, { timeout: 3_000 });
  });

  test("hover em Praticar mostra Hànzì e Pinyin Lab; Perfil mostra Amigos; Loja na barra", async ({
    page,
  }) => {
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev"],
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const sidebar = page.locator("aside").first();
    await expect(sidebar.getByRole("link", { name: /^Loja$/i })).toBeVisible();

    await sidebar.getByRole("link", { name: /^Praticar$/i }).hover();
    const practiceMenu = page.getByRole("menu", { name: "Praticar" });
    await expect(practiceMenu).toBeVisible();
    await expect(practiceMenu.getByRole("menuitem", { name: "Hànzì" })).toBeVisible();
    await expect(practiceMenu.getByRole("menuitem", { name: "Pinyin Lab" })).toBeVisible();
    await expect(practiceMenu.getByRole("menuitem", { name: "Imersão" })).toBeVisible();

    await sidebar.getByRole("link", { name: /^Perfil$/i }).hover();
    const profileMenu = page.getByRole("menu", { name: "Perfil" });
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu.getByRole("menuitem", { name: "Amigos" })).toBeVisible();
    await expect(profileMenu.getByRole("menuitem", { name: "Conta" })).toBeVisible();
  });
});
