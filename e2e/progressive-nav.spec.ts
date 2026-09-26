import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";
import { ACHIEVEMENTS } from "../src/data/achievements";

const STORE_VERSION = 16;

type SeedState = Record<string, unknown>;

// Marca todas as medalhas como já obtidas: sem esse pré-selo, o
// AchievementsWatcher enfileira modais de medalha a cada load do estado
// semeado, cobrindo a UI que os testes precisam tocar.
function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

/**
 * RC2.2.18 — conta "madura" para os testes de ESTRUTURA da navegação: já
 * descobriu Cultura (l2), Hànzì/Atlas (caracteres), economia (Qi), Revisão
 * (item no SRS) e Imersão (conversa + repertório). A descoberta progressiva
 * em si é coberta abaixo e em rc2-2-18-progressive-discovery.spec.ts.
 */
function matureState(extra: SeedState = {}): SeedState {
  const now = Date.now();
  return {
    completedLessons: ["l1", "l2", "l1-rev"],
    learnedChars: ["你", "好", "我", "是", "中", "国", "人", "大", "小"],
    learnedChunks: ["nihao", "xiexie", "zaijian", "wo", "ni", "hao", "shi", "bu", "ma"],
    recentConversationSceneIds: ["primeiro-cumprimento"],
    points: 40,
    srs: {
      "chunk:nihao": { id: "chunk:nihao", type: "chunk", itemId: "nihao", ease: 2.5, intervalDays: 1, due: now - 1000, reps: 1, lapses: 0, createdAt: now - 86_400_000 },
    },
    ...extra,
  };
}

/** Semeia um estado de conta arbitrário antes do primeiro load. */
async function seedStage(page: Page, state: SeedState) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
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
  await allowE2ELocalSession(page);
  await page.evaluate(
    (payload: string) => {
      localStorage.setItem("longyu:e2e-allow-local", "1");
      localStorage.setItem("longyu-v1", payload);
    },
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

  test("usuário novo vê só Jornada · Praticar · Mais (RC2.2.18)", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const labels = (await bottomTabLabels(page)).map((t) => t.trim());
    expect(labels).toEqual(["Jornada", "Praticar", "Mais"]);

    // Sem overflow horizontal.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("depois do primeiro nó de Cultura, a barra fica completa e na ordem final", async ({ page }) => {
    await seedStage(page, { completedLessons: ["l1", "l2", "l1-rev"] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const labels = (await bottomTabLabels(page)).map((t) => t.trim());
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(labels).toEqual(["Jornada", "Praticar", "Cultura", "Missões", "Mais"]);
  });

  test("usuário recorrente mantém Missões na barra principal", async ({ page }) => {
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev"],
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);

    const labels = (await bottomTabLabels(page)).map((t) => t.trim());
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(labels).toEqual(["Jornada", "Praticar", "Cultura", "Missões", "Mais"]);
  });

  test("toque em Praticar/Mais abre sheet com atalhos; Perfil pelo avatar (RC2.2.13)", async ({ page }) => {
    await seedStage(page, matureState({
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    }));
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

    // RC2.2.13 — Perfil não é aba: a entrada é o avatar da TopBar.
    await expect(tabBar.getByRole("button", { name: /^Perfil$/i })).toHaveCount(0);
    await expect(page.getByTestId("topbar-avatar")).toBeVisible();

    await tabBar.getByRole("button", { name: /^Mais$/i }).click();
    const moreSheet = page.getByRole("dialog", { name: "Mais opções" });
    await expect(moreSheet).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Loja" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Ajustes" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Ver menu completo" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Hànzì" })).toHaveCount(0);
    await expect(moreSheet.getByRole("link", { name: "Amigos" })).toHaveCount(0);
    // Cultura é aba da barra: não se repete no sheet Mais.
    await expect(moreSheet.getByRole("link", { name: "Cultura" })).toHaveCount(0);
  });

  test("RC2.2.18 · S/T — sheet Praticar da conta nova não tem modo vazio", async ({ page }) => {
    await seedStage(page, { completedLessons: ["l1"] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const tabBar = page.locator("nav.fixed").first();
    await tabBar.getByRole("button", { name: /^Praticar$/i }).click();
    const practiceSheet = page.getByRole("dialog", { name: "Praticar" });
    await expect(practiceSheet).toBeVisible();
    await expect(practiceSheet.getByRole("link", { name: "Revisão" })).toHaveCount(0);
    await expect(practiceSheet.getByRole("link", { name: "Hànzì" })).toHaveCount(0);
    await expect(practiceSheet.getByRole("link", { name: "Imersão" })).toHaveCount(0);
  });

  test("rota direta de área SOFT abre a própria página mesmo fora da barra", async ({ page }) => {
    await seedStage(page, { completedLessons: [] });
    // Loja não aparece para o usuário novo, mas o deep link abre (SOFT).
    await page.goto("/loja");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-feature-unavailable]")).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("menu Mais agrupa por objetivo e mostra no máximo 2 próximos (sem parede de cadeados)", async ({ page }) => {
    await seedStage(page, { completedLessons: ["l1"], learnedChars: ["你"] });
    await page.goto("/mais");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 2, name: "Aprender" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Motivação" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Conta" })).toBeVisible();
    // RC2.2.18 · AN/AO — perto do desbloqueio: seção "Depois" discreta, ≤ 2 itens.
    const upcoming = page.getByRole("heading", { level: 2, name: "Depois" });
    await expect(upcoming).toBeVisible();
    await expect(page.getByText("Continue sua Jornada para descobrir.")).toHaveCount(1);
    await expect(page.getByText("🔒")).toHaveCount(1);
  });
});

test.describe("descoberta progressiva de recursos", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("anuncia a área recém-liberada uma vez e não repete após dispensar", async ({ page }) => {
    test.slow();
    await establishOrigin(page);
    await page.evaluate(() => localStorage.setItem("longyu:e2e-guidance", "on"));

    // 1) Conta com boas-vindas já vistas, primeira lição concluída.
    await setStore(page, {
      completedLessons: ["p1-o-que-e-mandarim"],
      guidance: { version: 2, enabled: true, initialized: true, records: { welcome_journey_v1: { status: "DISMISSED", at: 1 } } },
    });
    await page.goto("/jornada");
    const reveal = page.locator('[data-guidance-id="new_features_v1"]');
    await expect(reveal).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("[data-guidance-surface]")).toHaveCount(1);

    // 2) Entendi → não reaparece após recarregar.
    await reveal.getByRole("button", { name: "Entendi" }).click();
    await page.reload();
    await dismissBlockingOverlays(page);
    await page.waitForTimeout(1_200);
    // RC2.2.19 — o anúncio dispensado não volta; outra orientação nunca
    // vista pode ocupar o único espaço da sessão nova.
    await expect(reveal).toHaveCount(0);
    expect(await page.locator("[data-guidance-surface]").count()).toBeLessThanOrEqual(1);
  });

  test("usuário antigo não recebe enxurrada de anúncios após a atualização", async ({ page }) => {
    // Primeiro acesso já em estágio avançado, sem estado de dicas: a semente
    // marca como visto tudo o que ele já usa.
    await seedStage(page, {
      completedLessons: ["l1", "l2", "l1-rev", "l2-rev", "l3", "l4", "l5", "l5-rev"],
      learnedChars: ["你", "好", "我", "是"],
    });
    await page.addInitScript(() => localStorage.setItem("longyu:e2e-guidance", "on"));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await page.waitForTimeout(1_500);
    await expect(page.locator('[data-guidance-surface="reveal"]')).toHaveCount(0);
  });
});

test.describe("navegação progressiva — desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("sidebar mínima no início, completa depois — sempre na mesma ordem", async ({ page }) => {
    test.slow();
    await establishOrigin(page);
    await setStore(page, { completedLessons: [] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const sidebar = page.locator("aside nav").first();
    const earlyLabels = (await sidebar.getByRole("link").allInnerTexts()).map((t) => t.trim());
    expect(earlyLabels).toContain("Jornada");
    expect(earlyLabels).toContain("Praticar");
    expect(earlyLabels).toContain("Perfil");
    // RC2.2.18 — conta nova: nada de Cultura, Missões, Liga, Loja ou Revisão vazia.
    for (const label of ["Revisão", "Cultura", "Missões", "Ligas", "Loja"]) expect(earlyLabels).not.toContain(label);
    // Hànzì e Imersão não poluem a barra principal — ficam no hover de Praticar.
    expect(earlyLabels).not.toContain("Hànzì");
    expect(earlyLabels).not.toContain("Imersão");
    expect(earlyLabels).not.toContain("Amigos");
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

    // Conta madura: a sidebar completa, na ordem canônica.
    await setStore(page, matureState({ leagueJoinedAt: Date.now() }));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const matureLabels = (await sidebar.getByRole("link").allInnerTexts()).map((t) => t.trim());
    const order = ["Jornada", "Praticar", "Revisão", "Cultura", "Missões", "Ligas", "Loja", "Perfil"];
    expect(matureLabels.filter((label) => order.includes(label))).toEqual(order);
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
    await seedStage(page, matureState({
      streak: 5,
      medals: [{ id: "2026-07", label: "Julho", emoji: "🏅", earnedAt: Date.now() }],
    }));
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
