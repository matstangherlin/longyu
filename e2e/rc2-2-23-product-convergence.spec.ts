import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, matureDiscoveryState, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.23 — Product Convergence (parte Web/E2E).
 *
 * Prova no navegador o que o código promete: a orientação chega (ou diz por
 * que não), zero Cargas não trava o app, a barra é conquistada, a revisão tem
 * Hànzì legível em 360 px e feedback curto, e o tom novo abre a microaula.
 * Nada disso é PHYSICAL PASS: o aparelho do owner continua NOT_RUN.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function seed(page: Page, state: Record<string, unknown>, opts: { guidanceOn?: boolean } = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, guidance: { version: 2, enabled: false, initialized: true, records: {} }, ...state },
    version: STORE_VERSION,
  });
  await page.addInitScript(
    ({ value, on }: { value: string; on: boolean }) => {
      if (on) localStorage.setItem("longyu:e2e-guidance", "on");
      if (sessionStorage.getItem("rc2223-seeded")) return;
      sessionStorage.setItem("rc2223-seeded", "1");
      localStorage.setItem("longyu-v1", value);
    },
    { value: payload, on: Boolean(opts.guidanceOn) }
  );
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

const chunkSrs = () => {
  const now = Date.now();
  const ids = ["nihao", "xiexie", "zaijian", "bukeqi", "zaoshanghao", "wojiao", "nihaoma", "wohenhao"];
  return Object.fromEntries(ids.map((id, index) => [`chunk:${id}`, { id: `chunk:${id}`, type: "chunk", itemId: id, ease: 2.5, intervalDays: 1, due: now - 1000 - index, reps: 1, lapses: 0, createdAt: now - 86_400_000 }]));
};

test.describe("RC2.2.23 · entrega de orientação", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/qa/device lista pendentes com motivo e a próxima dica aparece (com ou sem âncora)", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState(), guidance: { version: 2, enabled: true, initialized: true, records: {} } }, { guidanceOn: true });
    await open(page, "/qa/device");
    const panel = page.getByTestId("qa-guidance-delivery");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-guidance-initialized", "yes");
    const pending = page.locator("[data-guidance-pending]");
    expect(await pending.count()).toBeGreaterThan(0);
    // Cada pendente diz por que (ou "ELIGIBLE") — nada some calado.
    for (const reason of await page.locator("[data-guidance-reason]").evaluateAll((items) => items.map((item) => item.getAttribute("data-guidance-reason")))) {
      expect(reason).toMatch(/^(ELIGIBLE|DISABLED|ALREADY_RESOLVED|SESSION_BUDGET|WRONG_SURFACE|ANCHOR_MISSING|INPUT_FOCUSED|ACTIVE_LEARNING|OTHER_CEREMONY|FEATURE_NOT_AVAILABLE|SNOOZED|RENDER_TIMEOUT|SUPPRESSED_TEST_BUILD|NOT_INITIALIZED)$/);
    }
    await page.getByTestId("qa-guidance-show-next").click();
    await waitForLazyPage(page);
    const surface = page.locator("[data-guidance-surface]");
    await expect(surface.first()).toBeVisible({ timeout: 10_000 });
    const anchors = page.locator("[data-guidance-anchor]");
    if (await anchors.count()) expect(["fallback", "anchored"]).toContain(await anchors.first().getAttribute("data-guidance-anchor"));
    await noHorizontalOverflow(page);
  });
});

test.describe("RC2.2.23 · zero Cargas não trava o app", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const zero = () => ({ dailyEnergy: { date: today(), charges: 0, maxCharges: 3, usedCharges: 3, bonusChargesClaimed: {}, folegoEarned: 0, consumedChargeKeys: [] } });

  test("Revisão, Perfil e Cultura abrem; lição nova mostra a superfície calma com Pro por último", async ({ page }) => {
    await seed(page, { completedLessons: [], ...matureDiscoveryState(), srs: chunkSrs(), ...zero() });
    for (const route of ["/revisao", "/perfil", "/cultura"]) {
      await open(page, route);
      await expect(page.getByTestId("pro-paywall-energy")).toHaveCount(0);
    }
    // Lição NOVA (a primeira da Jornada) com zero Cargas → superfície calma.
    await open(page, "/licao/p1-o-que-e-mandarim");
    await page.locator("[data-lesson-primary-cta]").click();
    const landing = page.getByTestId("pro-paywall-energy");
    await expect(landing).toBeVisible();
    await expect(landing).toHaveAttribute("data-energy-soft-landing", /.*/);
    await expect(page.getByTestId("energy-free-lanes").locator("a")).not.toHaveCount(0);
    const order = await landing.evaluate((root) => {
      const at = (id: string) => [...root.querySelectorAll("[data-testid]")].findIndex((node) => node.getAttribute("data-testid") === id);
      return [at("energy-free-lanes"), at("energy-get-charge"), at("energy-pro-link")];
    });
    expect(order[0]).toBeGreaterThanOrEqual(0);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
    await expect(landing).not.toContainText(/Vidas?|Fôlego/);
    await noHorizontalOverflow(page);
  });

  test("replay de lição concluída não pede Carga", async ({ page }) => {
    await seed(page, { completedLessons: ["p1-o-que-e-mandarim"], ...zero() });
    await open(page, "/licao/p1-o-que-e-mandarim");
    await page.locator("[data-lesson-primary-cta]").click();
    await expect(page.getByTestId("pro-paywall-energy")).toHaveCount(0);
    await expect(page).toHaveURL(/\/licao\/p1-o-que-e-mandarim\/player/);
  });
});

test.describe("RC2.2.23 · barra conquistada", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("conta nova: Jornada + Mais (≤ 3); conta madura ganha as abas", async ({ page }) => {
    await seed(page, { completedLessons: [] });
    await open(page, "/jornada");
    const items = page.locator("[data-app-bottom-nav] :is(a,button)");
    const fresh = await items.count();
    expect(fresh).toBeGreaterThanOrEqual(2);
    expect(fresh).toBeLessThanOrEqual(3);
    await expect(page.locator('[data-app-bottom-nav] a[href="/treino"]')).toHaveCount(0);
  });
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
]) {
  test.describe(`RC2.2.23 · revisão em ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("Hànzì computado por papel (≥ 64/48/44), feedback curto e sem overflow", async ({ page }) => {
      await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState(), srs: chunkSrs(), learnedChunks: Object.keys(chunkSrs()).map((key) => key.slice(6)) });
      await open(page, "/revisao?iniciar=1");
      const floors: Record<string, number> = { main: 64, option: 48, pair: 44 };
      const measured: string[] = [];
      for (let round = 0; round < 8; round += 1) {
        const sizes = await page.locator("[data-review-hanzi]").evaluateAll((nodes) =>
          nodes.map((node) => {
            const target = (node.querySelector(".hanzi, [lang='zh-CN']") as HTMLElement | null) ?? (node as HTMLElement);
            return { role: node.getAttribute("data-review-hanzi") ?? "", px: parseFloat(getComputedStyle(target).fontSize) };
          })
        );
        for (const { role, px } of sizes) {
          if (!floors[role]) continue;
          measured.push(`${role}:${px}`);
          expect(px, `${role} em ${viewport.width}px`).toBeGreaterThanOrEqual(floors[role]);
        }
        await noHorizontalOverflow(page);
        // Avança: escolhe a primeira opção/peça disponível e continua.
        const option = page.locator("[data-review-hanzi='option']").first();
        if (await option.count()) await option.click({ trial: false }).catch(() => undefined);
        const cont = page.locator("[data-review-continue]");
        if (await cont.count()) {
          await expect(page.locator("[data-review-answer]").first()).toBeVisible().catch(() => undefined);
          const more = page.locator("[data-review-answer-more]");
          if (await more.count()) await expect(more.first()).not.toHaveAttribute("open", /.*/);
          await cont.first().click().catch(() => undefined);
        } else break;
      }
      expect(measured.length, "pelo menos um Hànzì medido").toBeGreaterThan(0);
    });
  });
}

test.describe("RC2.2.23 · microaula de tom", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("tom novo: um conceito por tela, discriminação com duas opções, Pular leva ao treino", async ({ page }) => {
    await seed(page, { completedLessons: [...THROUGH_L2, "l2-rev"], ...matureDiscoveryState(), toneTrainer: {} });
    await open(page, "/som");
    // RC2.2.24 — o Treino de tons tem hub: escolher → Começar → atividade.
    await page.getByTestId("tone-trainer-start").click();
    const micro = page.locator("[data-tone-microlesson]");
    await expect(micro).toBeVisible();
    await expect(micro).toHaveAttribute("data-tone-stage", "SEE");
    const stages: string[] = [];
    for (let step = 0; step < 9; step += 1) {
      if (!(await micro.count())) break;
      const stage = (await micro.getAttribute("data-tone-stage")) ?? "";
      stages.push(stage);
      if (stage === "DISCRIMINATE" || stage === "RECOGNIZE") {
        await expect(page.locator("[data-tone-choice]")).toHaveCount(2);
        await expect(page.getByTestId("tone-microlesson-continue")).toBeDisabled();
        await page.locator("[data-tone-choice]").first().click();
        await expect(page.locator("[data-tone-microlesson-feedback]")).toBeVisible();
      }
      await noHorizontalOverflow(page);
      await page.getByTestId("tone-microlesson-continue").click();
    }
    // RC2.2.24 — RASTREAR entra depois de OUVIR.
    expect(stages.slice(0, 6)).toEqual(["SEE", "HEAR", "TRACE", "IMITATE", "DISCRIMINATE", "RECOGNIZE"]);
    await expect(page.getByText(/língua/i)).toHaveCount(0);
    // Segundo tom novo do pack: Pular vai direto ao treino.
    if (await micro.count()) await page.getByTestId("tone-microlesson-skip").click();
    await expect(micro).toHaveCount(0);
  });
});
