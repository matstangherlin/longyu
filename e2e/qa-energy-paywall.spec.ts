import { expect, test, type Page } from "@playwright/test";
import { todayKey } from "../src/lib/storage";
import { IMMERSION_DISCOVERED_STATE, seedMissionsSession, waitForLazyPage } from "./helpers";

/**
 * QA 2026-10 · prompt 20 — R-07 (cobra 1/0/0/1; 0/5 persiste) e R-19 (o
 * paywall de energia só oferece páginas que abrem). Conta local Free, preview
 * local com fixtures: nada toca o Supabase de produção.
 */
const day = todayKey();
const NEW_TOPIC = "p1-o-que-e-mandarim";

function energy(charges: number) {
  return {
    date: day,
    charges,
    maxCharges: 5,
    usedCharges: 5 - charges,
    bonusChargesClaimed: {},
    folegoEarned: 0,
    consumedChargeKeys: [],
  };
}

async function savedCharges(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const saved = raw ? JSON.parse(raw) : null;
    return (saved?.state ?? saved)?.dailyEnergy?.charges;
  });
}

/** O player passou da checagem de Cargas e montou a primeira etapa. */
async function waitForPlayerStep(page: Page) {
  await expect(page.locator("[data-current-step-kind]").first()).toBeVisible({ timeout: 20_000 });
}

test.describe("Cargas Free @qa-r07", () => {
  test("1ª rodada de tema novo cobra 1", async ({ page }) => {
    await seedMissionsSession(page, { completedLessons: [], dailyEnergy: energy(5) });
    await page.goto(`/licao/${NEW_TOPIC}/player`);
    await waitForLazyPage(page);
    await waitForPlayerStep(page);
    await expect.poll(() => savedCharges(page)).toBe(4);
  });

  test("rodada 2 de tema iniciado não cobra", async ({ page }) => {
    await seedMissionsSession(page, {
      completedLessons: [NEW_TOPIC],
      lessonStarsById: { [NEW_TOPIC]: 3 },
      lessonMasteryById: { [NEW_TOPIC]: { level: 1 } },
      dailyEnergy: energy(5),
    });
    await page.goto(`/licao/${NEW_TOPIC}/player`);
    await waitForLazyPage(page);
    await waitForPlayerStep(page);
    expect(await savedCharges(page)).toBe(5);
  });

  test("replay de tema concluído não cobra", async ({ page }) => {
    await seedMissionsSession(page, {
      completedLessons: [NEW_TOPIC],
      lessonStarsById: { [NEW_TOPIC]: 3 },
      lessonMasteryById: { [NEW_TOPIC]: { level: 4 } },
      dailyEnergy: energy(5),
    });
    await page.goto(`/licao/${NEW_TOPIC}/player`);
    await waitForLazyPage(page);
    await waitForPlayerStep(page);
    expect(await savedCharges(page)).toBe(5);
  });

  test("teste de módulo cobra 1", async ({ page }) => {
    await seedMissionsSession(page, { dailyEnergy: energy(5) });
    await page.goto("/teste/u1-1");
    await waitForLazyPage(page);
    await expect.poll(() => savedCharges(page), { timeout: 20_000 }).toBe(4);
  });

  test("0/5 continua 0/5 depois de recarregar e a lição avisa antes de Começar", async ({ page }) => {
    await seedMissionsSession(page, { completedLessons: [], dailyEnergy: energy(0) });
    await page.goto(`/licao/${NEW_TOPIC}`);
    await waitForLazyPage(page);
    await expect(page.locator('[data-lesson-charge-cost="no-charge"]')).toContainText("Novas Cargas às");
    await page.reload();
    await waitForLazyPage(page);
    expect(await savedCharges(page)).toBe(0);
    await page.goto(`/licao/${NEW_TOPIC}/player`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("lesson-energy-refill-time")).toContainText("Novas Cargas às");
    expect(await savedCharges(page)).toBe(0);
  });
});

test.describe("Imersão sem Cargas @qa-r07", () => {
  // LGY-017 — a regra que o código cobra: sessão de escuta nova usa Carga;
  // história interativa não. O banner diz exatamente isso.
  test("banner fala só da sessão de escuta; a história abre e a sessão nova pede Carga", async ({ page }) => {
    await seedMissionsSession(page, { ...IMMERSION_DISCOVERED_STATE, dailyEnergy: energy(0) });
    await page.goto("/imersao");
    await waitForLazyPage(page);
    const banner = page.getByTestId("immersion-no-charges");
    await expect(banner).toContainText("Sessões de escuta novas esperam a próxima Carga");
    await expect(banner).toContainText("Novas Cargas às");
    await expect(page.getByText("Imersão pausada no plano grátis")).toHaveCount(0);

    await page.getByTestId("immersion-start-primeiros-cumprimentos").click();
    await expect(page.getByTestId("pro-paywall-energy")).toBeVisible();
    await page.getByTestId("energy-close").click();

    await page.getByTestId("interactive-story-start-primeiro-encontro").click();
    await expect(page.locator('[data-immersion-focus="story"]')).toBeVisible();
    expect(await savedCharges(page)).toBe(0);
  });
});

test.describe("Paywall de energia @qa-r19", () => {
  /** Aluno da Fase 1 com 4 hànzì: a descoberta diz "Hànzì disponível", a rota não abre. */
  const phaseOne = {
    completedLessons: [],
    learnedChars: ["你", "好", "我", "是"],
    dailyEnergy: energy(0),
  };

  async function openEnergyPaywall(page: Page) {
    await page.goto(`/licao/${NEW_TOPIC}/player`);
    await waitForLazyPage(page);
    const dialog = page.getByTestId("pro-paywall-energy");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    return dialog;
  }

  test("Fase 1 sem Cargas: nenhum CTA leva a tela bloqueada", async ({ page }) => {
    await seedMissionsSession(page, phaseOne);
    const dialog = await openEnergyPaywall(page);
    await expect(dialog.locator('[data-free-lane="hanzi"]')).toHaveCount(0);
    await expect(dialog.getByTestId("energy-refill-time")).toContainText("Novas Cargas às");
    // Sem missão de Carga para resgatar: explica em vez de mandar a Missões.
    await expect(dialog.getByTestId("energy-get-charge")).toHaveCount(0);

    const targets = await dialog.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(targets.length).toBeGreaterThan(0);
    for (const href of targets) {
      await page.goto(href);
      await waitForLazyPage(page);
      await expect(page.locator("[data-engine-gate-locked]"), `${href} abre`).toHaveCount(0);
      await expect(page.locator("[data-feature-unavailable]"), `${href} abre`).toHaveCount(0);
      await expect(page.getByTestId("journey-node-locked"), `${href} abre`).toHaveCount(0);
    }
  });

  test("missão de Carga completa: Conseguir Carga leva a Missões", async ({ page }) => {
    await seedMissionsSession(page, {
      ...phaseOne,
      dailyTasks: {
        date: day,
        audioHeard: 0,
        phrasesSpoken: 0,
        phrasesReviewed: 0,
        reviewsDone: 10,
        hanziDecomposed: 0,
        microtextsRead: 0,
        errorsCorrected: 0,
        threeStarLessons: 0,
        tonesTrained: 0,
        speechAttemptKeys: [],
        practiceRewardKeys: [],
        claimedMissions: {},
      },
    });
    const dialog = await openEnergyPaywall(page);
    await dialog.getByTestId("energy-get-charge").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/missoes$/);
    await expect(page.locator('[data-mission-id="daily-reviews"]')).toHaveAttribute("data-mission-status", "complete");
  });
});
