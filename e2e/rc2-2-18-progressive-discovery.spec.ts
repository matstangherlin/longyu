import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";
import { ACHIEVEMENTS } from "../src/data/achievements";

/**
 * RC2.2.18 — Progressive Discovery, Guided Coachmarks & Feature Unlocks.
 * CT–DC da spec: conta nova mínima, primeira lição, Cultura, pular dicas,
 * dicas desligadas, "Agora não", primeiro uso, deep link, essenciais e TabBar.
 */
const STORE_VERSION = 21;
const FIRST_LESSONS = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1"];
const THROUGH_L2 = [...FIRST_LESSONS, "l2"];

type Guidance = { enabled: boolean; initialized: boolean; records: Record<string, { status: string; at: number; snoozedUntil?: number }> };

function seen(...ids: string[]): Guidance["records"] {
  return Object.fromEntries(ids.map((id) => [id, { status: "SEEN", at: 1 }]));
}

function allAchievementsUnlocked(): Record<string, number> {
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, 1]));
}

/**
 * Semeia UMA vez por aba (sessionStorage): recarregar mantém o que a UI gravou,
 * que é justamente o que os testes de "não repete" precisam.
 */
async function seed(
  page: Page,
  state: Record<string, unknown>,
  options: { guidance?: Guidance | null; optIn?: boolean } = {}
) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      ...(options.guidance === null ? {} : { guidance: options.guidance ?? { enabled: true, initialized: true, records: {} } }),
      ...state,
    },
    version: STORE_VERSION,
  });
  await page.addInitScript(
    ({ payload: value, optIn }: { payload: string; optIn: boolean }) => {
      if (optIn) localStorage.setItem("longyu:e2e-guidance", "on");
      if (sessionStorage.getItem("rc2218-seeded")) return;
      sessionStorage.setItem("rc2218-seeded", "1");
      localStorage.setItem("longyu-v1", value);
    },
    { payload, optIn: options.optIn !== false }
  );
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

const tabBar = (page: Page) => page.locator("[data-app-bottom-nav]");

async function tabLabels(page: Page): Promise<string[]> {
  await expect(tabBar(page)).toBeVisible();
  return (await tabBar(page).locator("a, button").allInnerTexts()).map((label) => label.trim());
}

async function storedGuidance(page: Page): Promise<Guidance | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return null;
    return (JSON.parse(raw).state?.guidance ?? null) as Guidance | null;
  });
}

const surfaces = (page: Page) => page.locator("[data-guidance-surface]");

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("RC2.2.18 · conta nova", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CT: superfície mínima + UMA orientação de boas-vindas", async ({ page }) => {
    await seed(page, { completedLessons: [], achievementsUnlocked: {} }, { guidance: { enabled: true, initialized: false, records: {} } });
    await open(page, "/jornada");
    expect(await tabLabels(page)).toEqual(["Jornada", "Praticar", "Mais"]);

    const welcome = page.locator('[data-guidance-id="welcome_journey_v1"]');
    await expect(welcome).toBeVisible({ timeout: 8_000 });
    await expect(surfaces(page)).toHaveCount(1);
    await expect(welcome.getByText("Tudo pronto. Vamos começar sua Jornada.")).toBeVisible();
    await expect(welcome.getByRole("button", { name: "Pular dicas" })).toBeVisible();

    // DF — dentro da tela e sem cobrir o alvo.
    const card = (await welcome.boundingBox())!;
    const target = (await page.locator('[data-coachmark-target="journey-continue"]').boundingBox())!;
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.y + card.height).toBeLessThanOrEqual(844);
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(390);
    const overlaps = card.y < target.y + target.height && card.y + card.height > target.y && card.x < target.x + target.width && card.x + card.width > target.x;
    expect(overlaps).toBe(false);
    // DD — botões ≥ 48px.
    for (const button of await welcome.getByRole("button").all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
    }

    // Mais: sem Loja/Liga/Conquistas/Cultura para quem acabou de entrar.
    await tabBar(page).getByRole("button", { name: "Mais" }).click();
    const sheet = page.getByRole("dialog").filter({ hasText: /Ajustes|Sobre/ }).last();
    await expect(sheet).toBeVisible();
    for (const name of ["Loja", "Ligas", "Conquistas", "Cultura"]) {
      await expect(sheet.getByRole("link", { name: new RegExp(`^${name}$`) })).toHaveCount(0);
    }
  });

  test("CW: Pular dicas desliga as não essenciais e não volta após recarregar", async ({ page }) => {
    await seed(page, { completedLessons: [] }, { guidance: { enabled: true, initialized: false, records: {} } });
    await open(page, "/jornada");
    const welcome = page.locator('[data-guidance-id="welcome_journey_v1"]');
    await expect(welcome).toBeVisible({ timeout: 8_000 });
    await welcome.getByRole("button", { name: "Pular dicas" }).click();
    await expect(surfaces(page)).toHaveCount(0);
    await expect.poll(async () => (await storedGuidance(page))?.enabled).toBe(false);
    await page.reload();
    await waitForLazyPage(page);
    await page.waitForTimeout(1_200);
    await expect(surfaces(page)).toHaveCount(0);
    // Continua usável: a lição abre normalmente.
    await page.locator('[data-coachmark-target="journey-continue"]').click();
    await expect(page).toHaveURL(/\/licao\//);
  });

  test("DA: deep link para área trancada mostra página simples, nunca tela branca", async ({ page }) => {
    await seed(page, { completedLessons: [] });
    for (const route of ["/cultura", "/cultura/greetings-nihao", "/imersao"]) {
      await open(page, route);
      const locked = page.locator("[data-feature-unavailable]");
      await expect(locked).toBeVisible();
      await expect(locked.getByRole("link", { name: "Continuar Jornada" })).toBeVisible();
      await expect(page.getByText(/Pague|assine/i)).toHaveCount(0);
    }
    await page.locator("[data-feature-unavailable-cta]").click();
    await expect(page).toHaveURL(/\/jornada/);
  });

  test("CN: Pro não antecipa a Cultura pedagógica", async ({ page }) => {
    await seed(page, { completedLessons: [], isPremium: true });
    await open(page, "/cultura");
    await expect(page.locator('[data-feature-unavailable="culture"]')).toBeVisible();
  });

  test("DB: conta nova alcança Ajustes, Conta, Privacidade, Excluir conta, Aparência e Idioma", async ({ page }) => {
    await seed(page, { completedLessons: [] }, { optIn: false });
    for (const route of ["/config", "/config/conta", "/config/aparencia", "/config/aprendizagem", "/config/privacidade", "/conta", "/mais"]) {
      await open(page, route);
      await expect(page.locator("[data-feature-unavailable]")).toHaveCount(0);
    }
    await open(page, "/config/conta");
    await expect(page.getByTestId("settings-danger-zone")).toBeVisible();
  });

  test("K: nenhuma orientação dentro da lição", async ({ page }) => {
    await seed(page, { completedLessons: [] }, { guidance: { enabled: true, initialized: false, records: {} } });
    await open(page, "/licao/p1-o-que-e-mandarim/player");
    await page.waitForTimeout(1_500);
    await expect(surfaces(page)).toHaveCount(0);
  });

  test("DE: Escape/VOLTAR fecha o coachmark primeiro e ele não volta na sessão", async ({ page }) => {
    await seed(page, { completedLessons: [] }, { guidance: { enabled: true, initialized: false, records: {} } });
    await open(page, "/jornada");
    await expect(page.locator('[data-guidance-id="welcome_journey_v1"]')).toBeVisible({ timeout: 8_000 });
    await page.keyboard.press("Escape");
    await expect(surfaces(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/jornada/);
    await open(page, "/treino");
    await open(page, "/jornada");
    await page.waitForTimeout(1_200);
    await expect(surfaces(page)).toHaveCount(0);
  });
});

test.describe("RC2.2.18 · desbloqueios", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CU: primeira lição → Praticar e Missões num único anúncio, sem pilha", async ({ page }) => {
    await seed(page, { completedLessons: ["p1-o-que-e-mandarim"], achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1") },
    });
    await open(page, "/jornada");
    expect(await tabLabels(page)).toEqual(["Jornada", "Praticar", "Missões", "Mais"]);
    const batch = page.locator('[data-guidance-id="new_features_v1"]');
    await expect(batch).toBeVisible({ timeout: 8_000 });
    await expect(surfaces(page)).toHaveCount(1);
    await expect(batch.locator("[data-guidance-feature]")).toHaveCount(2);
    await batch.getByRole("button", { name: "Entendi" }).click();
    await expect(surfaces(page)).toHaveCount(0);
    await page.reload();
    await waitForLazyPage(page);
    await page.waitForTimeout(1_200);
    await expect(surfaces(page)).toHaveCount(0);
    // Nada de XP por abrir/ler (PART CG).
    const xp = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.xpTotal ?? 0);
    expect(xp).toBe(0);
  });

  test("CV: Cultura — antes ausente; no marco UM anúncio; aba aparece; não repete", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1") },
    });
    await open(page, "/jornada");
    expect(await tabLabels(page)).toEqual(["Jornada", "Praticar", "Cultura", "Missões", "Mais"]);
    const reveal = page.locator('[data-guidance-id="culture_unlocked_v1"]');
    await expect(reveal).toBeVisible({ timeout: 8_000 });
    await expect(surfaces(page)).toHaveCount(1);
    await expect(reveal.getByText(/cultura por trás do idioma/)).toBeVisible();
    await expect(reveal.getByText(/ganhou/i)).toHaveCount(0);
    await reveal.getByRole("button", { name: "Entendi" }).or(reveal.getByRole("button", { name: "Explorar" })).first().click();
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await page.waitForTimeout(1_200);
    await expect(page.locator('[data-guidance-id="culture_unlocked_v1"]')).toHaveCount(0);
  });

  test("BD: Cultura e Liga liberadas juntas viram UM anúncio listando as duas", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1") },
    });
    await open(page, "/jornada");
    const batch = page.locator('[data-guidance-id="new_features_v1"]');
    await expect(batch).toBeVisible({ timeout: 8_000 });
    await expect(surfaces(page)).toHaveCount(1);
    await expect(batch.locator('[data-guidance-feature="culture"]')).toBeVisible();
    await expect(batch.locator('[data-guidance-feature="league"]')).toBeVisible();
  });

  test("CY: Agora não — não volta na mesma sessão nem ao recarregar (cooldown)", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1") },
    });
    await open(page, "/jornada");
    const reveal = page.locator('[data-guidance-id="culture_unlocked_v1"]');
    await expect(reveal).toBeVisible({ timeout: 8_000 });
    await reveal.getByRole("button", { name: "Agora não" }).click();
    await open(page, "/mais");
    await open(page, "/jornada");
    await page.waitForTimeout(1_200);
    await expect(surfaces(page)).toHaveCount(0);
    const record = (await storedGuidance(page))?.records?.culture_unlocked_v1;
    expect(record?.status).toBe("SNOOZED");
    expect((record?.snoozedUntil ?? 0) - Date.now()).toBeGreaterThan(23 * 3600 * 1000);
    // A área continua disponível na navegação (PART DT).
    expect(await tabLabels(page)).toContain("Cultura");
  });

  test("CX: Dicas desligadas — Cultura libera, nenhum popup", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: { enabled: false, initialized: true, records: {} },
    });
    await open(page, "/jornada");
    expect(await tabLabels(page)).toContain("Cultura");
    await page.waitForTimeout(1_500);
    await expect(surfaces(page)).toHaveCount(0);
    await open(page, "/cultura");
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await page.waitForTimeout(1_200);
    await expect(surfaces(page)).toHaveCount(0);
  });

  test("CZ: primeiro acesso à Cultura — no máximo um coachmark, apontando a recomendação", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: {
        enabled: true,
        initialized: true,
        records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1", "culture_unlocked_v1"),
      },
    });
    await open(page, "/cultura");
    const coachmark = page.locator('[data-guidance-id="culture_first_use_v1"]');
    await expect(coachmark).toBeVisible({ timeout: 8_000 });
    await expect(surfaces(page)).toHaveCount(1);
    await expect(coachmark.getByText("Comece por esta recomendação.")).toBeVisible();
    await coachmark.getByRole("button", { name: "Entendi" }).click();
    await page.reload();
    await waitForLazyPage(page);
    await page.waitForTimeout(1_200);
    await expect(surfaces(page)).toHaveCount(0);
  });

  test("Revisão só aparece com itens; Ajustes › Dicas guiadas liga, desliga e revê sem mexer no progresso", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievementsUnlocked() }, {
      guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1", "culture_unlocked_v1") },
      optIn: false,
    });
    await open(page, "/treino");
    await expect(page.locator('[data-coachmark-target="practice-review"]')).toHaveCount(0);
    await open(page, "/config/aprendizagem");
    const toggle = page.getByTestId("guidance-toggle");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => (await storedGuidance(page))?.enabled).toBe(false);
    await page.getByTestId("guidance-reset").click();
    await expect(page.getByTestId("guidance-reset-done")).toBeVisible();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state);
    expect(after.guidance.enabled).toBe(true);
    expect(Object.keys(after.guidance.records)).toHaveLength(0);
    expect(after.completedLessons).toEqual(expect.arrayContaining(["l2"]));
  });
});

test.describe("RC2.2.18 · TabBar estável (DC)", () => {
  const mature = {
    completedLessons: THROUGH_L2,
    achievementsUnlocked: allAchievementsUnlocked(),
    points: 60,
    learnedChars: ["你", "好", "我", "是", "中", "国", "人", "大", "小"],
  };
  for (const viewport of [
    { width: 360, height: 740 },
    { width: 390, height: 844 },
    { width: 432, height: 960 },
  ]) {
    test(`${viewport.width}×${viewport.height}: nova mínima, madura na ordem final, sem overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page, { completedLessons: [] }, { optIn: false });
      await open(page, "/jornada");
      expect(await tabLabels(page)).toEqual(["Jornada", "Praticar", "Mais"]);
      await noHorizontalOverflow(page);
    });

    test(`${viewport.width}×${viewport.height}: conta madura mantém o app completo`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page, mature, { optIn: false });
      await open(page, "/jornada");
      expect(await tabLabels(page)).toEqual(["Jornada", "Praticar", "Cultura", "Missões", "Mais"]);
      await noHorizontalOverflow(page);
      await open(page, "/cultura");
      await expect(page.getByTestId("culture-hub")).toBeVisible();
      await open(page, "/loja");
      await expect(page.locator("[data-feature-unavailable]")).toHaveCount(0);
    });
  }
});
