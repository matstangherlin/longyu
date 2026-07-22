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
  return nav.locator("a").allInnerTexts();
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
    expect(labels).toContain("Missões");
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

  test("sidebar mostra mais destinos conforme o progresso", async ({ page }) => {
    test.slow();
    await establishOrigin(page);
    await setStore(page, { completedLessons: [] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const sidebar = page.locator("aside nav").first();
    const early = await sidebar.getByRole("link").count();

    await setStore(page, {
      completedLessons: ["l1", "l2", "l1-rev", "l2-rev", "l3", "l4", "l5", "l5-rev"],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const advanced = await sidebar.getByRole("link").count();

    expect(advanced).toBeGreaterThan(early);
    // Alvos de toque adequados em todos os links da sidebar.
    const heights = await sidebar.getByRole("link").evaluateAll((links) =>
      links.map((l) => l.getBoundingClientRect().height)
    );
    expect(heights.every((h) => h >= 44)).toBe(true);
  });
});
