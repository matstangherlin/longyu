import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, matureDiscoveryState, seedTelemetryDeclined, waitForLazyPage } from "./helpers";
import { activityDensityAccepted, ctaCarriesReward, screenDensityScore } from "../src/lib/productGoldStandard";

/**
 * RC2.2.25 — Product Experience Closure (parte Web/E2E). Prova o CONTRATO no
 * navegador: Você/Conta/Sair descobríveis sem rolar, logout em ≤ 2 níveis sem
 * "Aluno local", hub ≠ atividade (focus sem TopBar/TabBar) e densidade medida
 * no DOM. WEB PASS ≠ APK PASS ≠ OWNER_ACCEPTED: o aparelho e o SIM/NÃO do
 * owner continuam pendentes.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];
const PHONES = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
];

async function seed(page: Page, state: Record<string, unknown>) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({ state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, guidance: { version: 2, enabled: false, initialized: true, records: {} }, ...state }, version: STORE_VERSION });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc2225-seeded")) return;
    sessionStorage.setItem("rc2225-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

async function inFold(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).not.toBeNull();
  expect(box!.y + box!.height, `${selector} sem rolar`).toBeLessThanOrEqual(page.viewportSize()!.height);
}

/** Métrica de densidade do DOM visível (mesma fórmula do gate). */
async function measureDensity(page: Page) {
  const metrics = await page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const s = getComputedStyle(el as HTMLElement);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && r.top < window.innerHeight && r.bottom > 0;
    };
    const main = document.querySelector("[data-focus-activity-frame]") ?? document.querySelector("[data-app-main]") ?? document.body;
    // Cartão = contêiner, nunca o botão de opção (que também é arredondado).
    const cards = Array.from(main.querySelectorAll(".shadow-card, [class*='rounded-2xl'][class*='border']"))
      .filter((el) => !el.matches("button, a, [role='button'], label") && !el.closest("button, a"))
      .filter(visible);
    const depth = cards.reduce((max, card) => {
      let d = 1;
      let parent = card.parentElement;
      while (parent && parent !== main) {
        if (cards.includes(parent)) d += 1;
        parent = parent.parentElement;
      }
      return Math.max(max, d);
    }, cards.length ? 1 : 0);
    const actions = Array.from(main.querySelectorAll("button, a[href]")).filter(visible).filter((el) => !(el as HTMLButtonElement).disabled);
    const stats = Array.from(main.querySelectorAll("[data-stat], [data-review-summary-tile], .tabular-nums")).filter(visible);
    const scroller = (document.querySelector("[data-focus-activity-frame] .overflow-y-auto") as HTMLElement | null) ?? document.scrollingElement!;
    return {
      blocks: Math.max(1, cards.length),
      actions: actions.length,
      actionLabels: actions.map((el) => (el.textContent ?? "").trim()).filter(Boolean),
      stats: stats.length,
      cardDepth: Math.max(1, depth),
      scrolls: scroller.scrollHeight - scroller.clientHeight > 4,
      shellChrome: Boolean(document.querySelector("[data-app-bottom-nav]")),
    };
  });
  return { ...metrics, density: screenDensityScore(metrics) };
}

for (const viewport of PHONES) {
  test.describe(`RC2.2.25 · Você/Conta/Sair em ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("Mais: VOCÊ no topo, 'Sair da conta' linha inteira e neutra; ordem ESTUDAR → SISTEMA", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
      await open(page, "/mais");
      const signOut = page.getByTestId("more-sign-out");
      await expect(signOut).toBeVisible();
      await expect(signOut).toHaveAttribute("data-sign-out-layout", "full-width");
      await expect(signOut).toHaveAttribute("data-sign-out-tone", "neutral");
      await inFold(page, "[data-testid='more-sign-out']");
      const youWidth = (await page.getByTestId("more-you").boundingBox())!.width;
      expect((await signOut.boundingBox())!.width).toBeGreaterThan(youWidth * 0.9);
      const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
      expect(headings[0]).toMatch(/Você/i);
      expect(headings.indexOf("Estudar")).toBeLessThan(headings.indexOf("Sistema"));
      await expect(page.getByTestId("more-you").getByText(/Excluir/i)).toHaveCount(0);
    });

    test("Conta: primeira dobra com Sair sem rolar; Excluir só na zona de perigo, no fim", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
      await open(page, "/conta");
      await expect(page.getByTestId("conta-first-fold")).toBeVisible();
      await inFold(page, "[data-testid='conta-sign-out']");
      for (const id of ["conta-profile", "conta-appearance", "conta-security"]) await expect(page.getByTestId(id)).toBeVisible();
      const danger = page.getByTestId("conta-danger-zone");
      if (await danger.count()) {
        const signOutBox = (await page.getByTestId("conta-sign-out").boundingBox())!;
        const dangerBox = (await danger.boundingBox())!;
        expect(dangerBox.y, "Excluir abaixo do Sair").toBeGreaterThan(signOutBox.y);
      }
    });

    test("Perfil: Conta visível na primeira dobra", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
      await open(page, "/perfil");
      await inFold(page, "[data-testid='profile-account-link']");
      await expect(page.getByTestId("profile-account-link")).toHaveAttribute("href", "/conta");
    });
  });
}

test.describe("RC2.2.25 · logout e aparência", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("logout em ≤ 2 níveis (Mais → Sair) cai na Landing, nunca em 'Aluno local'", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
    await open(page, "/jornada");
    // Nível 1: aba Mais (sheet) · nível 2: "Sair da conta".
    await page.locator("[data-app-bottom-nav]").getByText("Mais", { exact: true }).click();
    const sheetSignOut = page.getByTestId("more-sheet-sign-out");
    await expect(sheetSignOut).toBeVisible();
    await expect(sheetSignOut).toHaveAttribute("data-sign-out-layout", "full-width");
    await sheetSignOut.click();
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByText(/Aluno local|Perfis neste dispositivo|Usar perfil/)).toHaveCount(0);
  });

  test("Aparência abre Sistema / Claro / Escuro", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
    await open(page, "/config/aparencia");
    const modes = page.getByTestId("appearance-mode");
    await expect(modes).toBeVisible();
    await expect(modes.locator("[data-appearance-mode]")).toHaveCount(3);
  });
});

function chunkSrs() {
  const now = Date.now();
  const ids = ["nihao", "xiexie", "zaijian", "bukeqi", "zaoshanghao", "wojiao", "nihaoma", "wohenhao"];
  return Object.fromEntries(ids.map((id, index) => [`chunk:${id}`, { id: `chunk:${id}`, type: "chunk", itemId: id, ease: 2.5, intervalDays: 1, due: now - 1000 - index, reps: 1, lapses: 0, createdAt: now - 86_400_000 }]));
}

for (const viewport of PHONES) {
  test.describe(`RC2.2.25 · hub ≠ atividade em ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("Revisão: hub [Começar revisão] → rodada em focus, sem painéis, CTA sem recompensa, densidade aceita", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState(), srs: chunkSrs(), learnedChunks: Object.keys(chunkSrs()).map((key) => key.slice(6)) });
      await open(page, "/revisao");
      await expect(page.locator("[data-app-bottom-nav]")).toBeVisible();
      await page.getByTestId("review-start").click();
      await expect(page.locator("[data-review-round-header]")).toBeVisible();
      await expect(page.locator("[data-app-bottom-nav]")).toHaveCount(0);
      await expect(page.locator("[data-review-round-step]")).toHaveText(/ETAPA \d+\/\d+/);
      await expect(page.getByText(/Fila inteligente|Plano de hoje|Itens fracos/)).toHaveCount(0);
      const metrics = await measureDensity(page);
      expect(metrics.shellChrome).toBe(false);
      for (const label of metrics.actionLabels) expect(ctaCarriesReward(label), `CTA "${label}"`).toBe(false);
      expect(activityDensityAccepted(metrics.density), JSON.stringify(metrics)).toBe(true);
      await page.getByTestId("review-exit").click();
      await expect(page.getByTestId("review-start")).toBeVisible();
    });

    test("Pinyin Lab: [Começar] → treino em focus; X volta ao hub", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
      await open(page, "/pinyin");
      const tabs = page.getByRole("button", { name: /^Treino$/ });
      if (await tabs.count()) await tabs.first().click();
      await page.getByTestId("pinyin-accent-start").click();
      await expect(page.locator("[data-focus-activity-frame='pinyin-accent']")).toBeVisible();
      await expect(page.locator("[data-app-bottom-nav]")).toHaveCount(0);
      const metrics = await measureDensity(page);
      expect(metrics.shellChrome).toBe(false);
      for (const label of metrics.actionLabels) expect(ctaCarriesReward(label), `CTA "${label}"`).toBe(false);
      await page.getByTestId("pinyin-accent-exit").click();
      await expect(page.locator("[data-focus-activity-frame]")).toHaveCount(0);
      await expect(page.locator("[data-app-bottom-nav]")).toBeVisible();
    });

    test("Fala: [Começar] → frases em focus, densidade aceita", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
      await open(page, "/fala");
      await page.getByTestId("fala-phrases-start").click();
      await expect(page.locator("[data-fala-activity]")).toBeVisible();
      await expect(page.locator("[data-app-bottom-nav]")).toHaveCount(0);
      const metrics = await measureDensity(page);
      expect(activityDensityAccepted(metrics.density), JSON.stringify(metrics)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-focus-activity-frame]")).toHaveCount(0);
    });
  });
}

test.describe("RC2.2.25 · Tone Trace e Cultura", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Tone Trace: linha → parcial → pontos → nada → escolha de memória", async ({ page }) => {
    await seed(page, { completedLessons: [...THROUGH_L2, "l2-rev"], ...matureDiscoveryState(), toneTrainer: {} });
    await open(page, "/som");
    await page.getByTestId("tone-trainer-start").click();
    const micro = page.locator("[data-tone-microlesson]");
    await expect(micro).toBeVisible();
    for (let i = 0; i < 3 && (await micro.getAttribute("data-tone-stage")) !== "TRACE"; i += 1) await page.getByTestId("tone-microlesson-continue").click();
    await expect(page.locator("[data-tone-trace]")).toContainText("Passe o dedo pelo caminho do tom.");
    for (const expected of ["PARTIAL_LINE", "GUIDE_DOTS", "NO_LINE", "MEMORY_CHOICE"]) {
      const surface = page.getByTestId("tone-trace-surface");
      const box = (await surface.boundingBox())!;
      const point = (fraction: number) => ({ clientX: box.x + box.width * fraction, clientY: box.y + box.height / 2, pointerId: 9, pointerType: "touch", isPrimary: true, bubbles: true });
      await surface.dispatchEvent("pointerdown", point(0.1));
      for (const fraction of [0.3, 0.5, 0.7, 0.92]) await surface.dispatchEvent("pointermove", point(fraction));
      await surface.dispatchEvent("pointerup", point(0.92));
      await expect(page.locator("[data-tone-trace]")).toHaveAttribute("data-trace-level", expected);
    }
    await expect(page.getByTestId("tone-trace-memory-options").locator("[data-memory-option]")).toHaveCount(4);
    await expect(page.getByTestId("tone-trace-message")).not.toContainText(/correto|pitch/i);
  });

  test("marco cultural: 'Antes de continuar, entenda este costume.' + [Ir para Cultura]", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 });
    await open(page, "/jornada");
    const gate = page.locator("[data-journey-culture-gate]").first();
    if (!(await gate.count())) test.skip(true, "nenhum marco cultural pendente nesta semente");
    await gate.scrollIntoViewIfNeeded();
    await expect(gate.getByTestId("culture-gate-lead")).toHaveText("Antes de continuar, entenda este costume.");
    await expect(gate.getByTestId("culture-gate-cta")).toHaveText("Ir para Cultura");
  });
});
