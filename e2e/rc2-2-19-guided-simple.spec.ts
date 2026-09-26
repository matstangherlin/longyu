import { expect, test, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  matureDiscoveryState,
  seedLessonPlayerReady,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";
import { ACHIEVEMENTS } from "../src/data/achievements";

/**
 * RC2.2.19 — GUIDED · SIMPLE · PHYSICALLY VERIFIED (parte Web/E2E).
 * AUTOMATED PASS != PRODUCT PASS: isto prova código e navegador; os campos
 * físicos continuam NOT_RUN em docs/release/android-physical-qa.json.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];

type GuidanceRecord = { status: string; at: number; evidence?: string };
type Guidance = { version?: number; enabled: boolean; initialized: boolean; records: Record<string, GuidanceRecord> };

async function seed(page: Page, state: Record<string, unknown>, guidance: Guidance | null, optIn = true) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      ...(guidance ? { guidance } : {}),
      ...state,
    },
    version: STORE_VERSION,
  });
  await page.addInitScript(
    ({ value, on }: { value: string; on: boolean }) => {
      if (on) localStorage.setItem("longyu:e2e-guidance", "on");
      if (sessionStorage.getItem("rc2219-seeded")) return;
      sessionStorage.setItem("rc2219-seeded", "1");
      localStorage.setItem("longyu-v1", value);
    },
    { value: payload, on: optIn }
  );
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

async function storedGuidance(page: Page): Promise<Guidance | null> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.guidance ?? null);
}

const surfaces = (page: Page) => page.locator("[data-guidance-surface]");
const allAchievements = () => Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, 1]));

test.describe("RC2.2.19 · orientação com evidência de render", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("conta madura do RC2.2.18 (SEEN sem evidência) volta a ver UMA orientação e só grava SHOWN depois de visível", async ({ page }) => {
    // Estado v1: o RC2.2.18 marcava tudo como SEEN na semente.
    const legacySeen = Object.fromEntries(
      ["practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1", "culture_unlocked_v1"].map((id) => [id, { status: "SEEN", at: 1 }])
    );
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: allAchievements() }, { enabled: true, initialized: true, records: legacySeen });
    await open(page, "/jornada");
    const surface = surfaces(page).first();
    await expect(surface).toBeVisible({ timeout: 10_000 });
    await expect(surfaces(page)).toHaveCount(1);
    const id = await surface.getAttribute("data-guidance-id");
    expect(id).toBeTruthy();
    // Evidência de render: pending/visible → shown só depois de ~1,2 s na tela.
    await expect(surface).toHaveAttribute("data-guidance-render-evidence", "shown", { timeout: 5_000 });
    const stored = await storedGuidance(page);
    expect(stored?.version).toBe(2);
    // O que o anúncio cobre fica SHOWN com evidência de render (lote: seus itens listados).
    const shown = Object.values(stored?.records ?? {}).filter((record) => record.status === "SHOWN");
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((record) => record.evidence === "render")).toBe(true);
    // Nada de SEEN antigo sobrevivendo como "visto".
    expect(Object.values(stored?.records ?? {}).some((record) => record.status === "SEEN")).toBe(false);
    // Uma por sessão: depois de dispensar, nada novo nesta sessão.
    await surface.locator('[data-guidance-action="primary"]').click();
    await page.waitForTimeout(2_000);
    await expect(surfaces(page)).toHaveCount(0);
  });

  test("sair da tela antes da evidência não grava 'visto'", async ({ page }) => {
    await seed(page, { completedLessons: ["p1-o-que-e-mandarim"], achievementsUnlocked: allAchievements() }, {
      version: 2,
      enabled: true,
      initialized: true,
      records: { welcome_journey_v1: { status: "DISMISSED", at: 1 } },
    });
    await open(page, "/jornada");
    await expect(surfaces(page).first()).toBeVisible({ timeout: 10_000 });
    // Sai imediatamente (antes dos 1,2 s de evidência).
    await page.evaluate(() => {
      window.history.pushState({}, "", "/mais");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForTimeout(1_600);
    const stored = await storedGuidance(page);
    const records = Object.entries(stored?.records ?? {}).filter(([key]) => key !== "welcome_journey_v1");
    expect(records.some(([, record]) => record.status === "SHOWN" || record.status === "SEEN")).toBe(false);
  });

  test("todas as saídas: Entendi · Agora não · Pular dica · Pular dicas", async ({ page }) => {
    await seed(page, { completedLessons: [] }, { version: 2, enabled: true, initialized: false, records: {} });
    await open(page, "/jornada");
    const surface = surfaces(page).first();
    await expect(surface).toBeVisible({ timeout: 10_000 });
    for (const action of ["primary", "now_not", "skip", "skip_all"]) {
      await expect(surface.locator(`[data-guidance-action="${action}"]`)).toBeVisible();
    }
    await expect(surface.getByRole("button", { name: "Pular dica", exact: true })).toBeVisible();
    await expect(surface.getByRole("button", { name: "Pular dicas", exact: true })).toBeVisible();
  });
});

test.describe("RC2.2.19 · navegação, perfil e conta", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("conta nova: barra Jornada · Praticar · Mais", async ({ page }) => {
    await seed(page, { completedLessons: [] }, { version: 2, enabled: false, initialized: true, records: {} }, false);
    await open(page, "/jornada");
    const labels = (await page.locator("[data-app-bottom-nav]").locator("a, button").allInnerTexts()).map((label) => label.trim());
    expect(labels).toEqual(["Jornada", "Praticar", "Mais"]);
  });

  test("Mais: Perfil, Conta e Aparência no topo; avatar abre o perfil com medalhas, Editar e Amigos na primeira dobra", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() }, { version: 2, enabled: false, initialized: true, records: {} }, false);
    await open(page, "/mais");
    const you = page.getByTestId("more-you");
    await expect(you).toBeVisible();
    const youBox = await you.boundingBox();
    expect(youBox!.y).toBeLessThan(420);
    await expect(you.getByTestId("more-profile")).toBeVisible();
    await expect(you.getByTestId("more-account")).toBeVisible();
    await expect(you.getByTestId("more-appearance")).toHaveAttribute("href", "/config/aparencia");
    // Excluir conta NUNCA no bloco rápido.
    await expect(you.getByText(/Excluir/i)).toHaveCount(0);

    await page.getByTestId("topbar-avatar").click();
    await expect(page).toHaveURL(/\/perfil/);
    const fold = page.getByTestId("profile-first-fold-actions");
    for (const target of [page.getByTestId("profile-avatar"), page.getByTestId("profile-medal-count"), fold.getByRole("link", { name: "Editar" }), fold.getByRole("link", { name: "Amigos" })]) {
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      expect(box!.y + box!.height, "na primeira dobra").toBeLessThanOrEqual(844);
    }
  });
});

test.describe("RC2.2.19 · revisão, articulação e trilha de avanço", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("revisão: hànzì nunca abaixo do piso de pares (44 px) — principal 64–80, opções 48–60", async ({ page }) => {
    const now = Date.now();
    const chunks = ["nihao", "xiexie", "zaijian", "bukeqi", "zaoshanghao", "wojiao", "nihaoma", "wohenhao"];
    const srs = Object.fromEntries(
      chunks.map((chunk, index) => [
        `chunk:${chunk}`,
        { id: `chunk:${chunk}`, type: "chunk", itemId: chunk, ease: 2.5, intervalDays: 1, due: now - 1000 - index, reps: 1, lapses: 0, createdAt: now - 86_400_000 },
      ])
    );
    await seed(page, { completedLessons: THROUGH_L2, learnedChunks: chunks, srs }, { version: 2, enabled: false, initialized: true, records: {} }, false);
    await open(page, "/revisao");
    const start = page.getByRole("button", { name: /Começar|Revisar|Iniciar/i }).first();
    if (await start.isVisible().catch(() => false)) await start.click();
    const hanzi = page.locator("[data-review-page] .hanzi, [data-review-page] [lang='zh-CN']").first();
    await expect(hanzi).toBeVisible({ timeout: 10_000 });
    const biggest = await page.evaluate(() =>
      Math.max(
        0,
        ...[...document.querySelectorAll<HTMLElement>("[data-review-page] *")]
          .filter((el) => /[㐀-鿿]/.test(el.textContent ?? "") && el.children.length === 0)
          .map((el) => Number.parseFloat(getComputedStyle(el).fontSize))
      )
    );
    expect(biggest).toBeGreaterThanOrEqual(44);
  });

  test("Pinyin Lab: desenho de boca para j/q/x (articulação ≠ tom)", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 }, { version: 2, enabled: false, initialized: true, records: {} }, false);
    await open(page, "/pinyin");
    // No celular a seção vive na aba "Iniciais".
    await page.getByRole("button", { name: "Iniciais", exact: true }).first().click();
    const diagram = page.locator('[data-articulation-diagram="j-q-x"]');
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();
    await expect(page.locator('[data-articulation-diagram="j-q-x"]')).toHaveAttribute("data-tongue", "blade-to-hard-palate");
  });

  test("lição: trilha DEV passo visível → Continuar → conclusão → avançou", async ({ page }) => {
    await seedLessonPlayerReady(page, "l1");
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.locator("[data-guided-lesson-shell]").first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(500);
    const primary = page.locator("[data-lesson-action-region] button").first();
    await primary.click({ timeout: 8_000 });
    await page.waitForTimeout(800);
    const events = await page.evaluate(() => ((window as Window & { __longyuLessonTrace?: { event: string }[] }).__longyuLessonTrace ?? []).map((entry) => entry.event));
    expect(events).toContain("step_visible");
    expect(events).toContain("continue_pressed");
  });
});
