import { expect, test, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";
import { ALL_LESSONS } from "../src/data/journey";

/**
 * RC2.2.8 — Learning Experience & Gamification Core (P1–P9).
 *
 * Seeds montam o estado mínimo de cada cenário direto no persist, na mesma
 * versão dos outros specs (v21), para as migrações rodarem de verdade.
 */
const STORE_VERSION = 21;
const DAY = 86_400_000;

function localDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * DAY);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function seed(page: Page, state: Record<string, unknown>, options: { once?: boolean } = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ payload, once }) => {
      if (once && localStorage.getItem("longyu-v1")) return;
      localStorage.setItem("longyu-v1", payload);
    },
    {
      payload: JSON.stringify({
        state: { accountSetupComplete: true, completedLessons: ["l1"], holdAchievementModals: true, ...state },
        version: STORE_VERSION,
      }),
      once: Boolean(options.once),
    }
  );
}

function srsItem(type: "char" | "chunk", itemId: string, domain: string, extra: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    [`${type}:${itemId}:${domain}`]: {
      id: `${type}:${itemId}:${domain}`,
      type,
      itemId,
      reviewDomain: domain,
      ease: 2.5,
      intervalDays: 1,
      due: now - DAY,
      reps: 1,
      lapses: 0,
      createdAt: now - 10 * DAY,
      reviewedAt: now - DAY,
      ...extra,
    },
  };
}

test.describe("RC2.2.8 — P1 Review gloss (aprendizagem assistida)", () => {
  test("hover no Hànzì antes de responder: gloss com pinyin, significado e Atlas; assistida; nunca Easy", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seed(page, {
      learnedChars: ["ni", "hao", "wo"],
      srs: { ...srsItem("char", "ni", "significado"), ...srsItem("char", "hao", "significado"), ...srsItem("char", "wo", "significado") },
      isPremium: true,
      serverIsPro: true,
    });
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const lookup = page.locator('[data-review-lookup="enabled"]');
    await expect(lookup).toBeVisible({ timeout: 20_000 });
    await expect(lookup).toHaveAttribute("data-review-assistance-used", "false");

    // Qualquer Hànzì consultável da tela (alvo principal ou opção).
    const token = lookup.locator('[aria-haspopup="dialog"], [data-gloss-activation="hover-hold"]').first();
    await expect(token).toBeVisible();
    await token.hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible({ timeout: 5_000 });
    await expect(tooltip.locator(".pinyin, [class*='pinyin']").first()).toBeVisible();
    await expect(page.getByTestId("gloss-atlas-link")).toBeVisible();
    await expect(page.getByTestId("gloss-atlas-link")).toHaveAttribute("href", /\/hanzi\/atlas\?char=/);
    await expect(lookup).toHaveAttribute("data-review-assistance-used", "true");

    // Responder e conferir o teto de nota.
    await page.mouse.move(0, 0);
    await page.keyboard.press("Escape");
    const options = page.locator("[data-review-options] [data-review-option]");
    expect(await options.count(), "exercício de escolha semeado").toBeGreaterThan(0);
    await page.locator('[data-review-options] [data-review-option-correct="1"]').first().click();
    await page.getByRole("button", { name: /Verificar|Check/i }).click();
    await expect(page.locator("[data-review-feedback]")).toBeVisible();
    // P1.2 — sugestão nunca Easy; Easy/Good travados pelo teto de Hard.
    await page.getByText(/Ajustar dificuldade|Adjust difficulty/i).click();
    await expect(page.locator('[data-review-grade="easy"]')).toBeDisabled();
    await expect(page.locator('[data-review-grade="good"]')).toBeDisabled();
    await expect(page.locator('[data-review-grade="hard"]')).toBeEnabled();
  });
});

test.describe("RC2.2.8 — P3 prova sem consulta", () => {
  test("Phase Challenge: nenhum termo abre glossário", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seed(page, { completedLessons: [], folego: 5, cultureSeals: ["social-etiquette", "urban-china", "chinese-table"] });
    await page.goto("/teste/fase/p2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByTestId("phase-challenge-start").click();
    const exam = page.getByTestId("phase-challenge-exam");
    await expect(exam).toBeVisible();
    await expect(exam).toHaveAttribute("data-gloss-lookup", "disabled");
    await expect(exam.locator('[aria-haspopup="dialog"], [data-gloss-activation]')).toHaveCount(0);
    const hanzi = exam.locator(".hanzi").first();
    if (await hanzi.isVisible().catch(() => false)) {
      await hanzi.hover();
      await page.waitForTimeout(600);
      await expect(page.getByRole("tooltip")).toHaveCount(0);
    }
  });
});

test.describe("RC2.2.8 — P4 ofensiva sem spam", () => {
  const brokenState = () => ({
    holdAchievementModals: false,
    streak: 9,
    longestStreak: 9,
    lastStudyDate: localDay(-2),
    lastActive: localDay(-2),
    streakShields: 0,
  });

  test("Agora não + navegar por Journey/Cultura/Loja/Revisão/Perfil: não volta", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, brokenState(), { once: true });
    await page.goto("/jornada");
    const prompt = page.getByTestId("streak-recovery-prompt");
    await expect(prompt).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("streak-recovery-not-now").click();
    await expect(prompt).toHaveCount(0);
    for (const route of ["/jornada", "/cultura", "/loja", "/revisao", "/hanzi/atlas", "/perfil"]) {
      await page.goto(route);
      await waitForLazyPage(page);
      await page.waitForTimeout(400);
      await expect(prompt, `reapareceu em ${route}`).toHaveCount(0);
    }
    // B3.1 — a oportunidade continua: o Perfil ainda oferece recuperar.
    await page.goto("/perfil");
    await expect(page.getByRole("link", { name: /Recuperar|Recover/i }).first()).toBeVisible();
  });

  test("P4.1 — nova sessão do navegador com recuperação válida: aparece uma vez", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seed(page, brokenState(), { once: true });
    await page.goto("/jornada");
    await expect(page.getByTestId("streak-recovery-prompt")).toBeVisible({ timeout: 20_000 });
    await context.close();
  });
});

test.describe("RC2.2.8 — P5 sync silencioso", () => {
  test("rotina não aparece; erro aparece uma vez (dedupe)", async ({ page }) => {
    await seed(page, {});
    await page.goto("/jornada");
    await waitForLazyPage(page);
    const ready = await page.waitForFunction(() => typeof window.__longyuSetEconomySyncMessage === "function", null, { timeout: 10_000 }).then(() => true).catch(() => false);
    test.skip(!ready, "fixture de banner indisponível neste ambiente");
    const banner = page.locator("[data-economy-sync-banner]");
    for (let i = 0; i < 3; i += 1) {
      for (const message of ["Sincronizando carga...", "Sincronizando Qi...", "Migrando economia..."]) {
        await page.evaluate((m) => window.__longyuSetEconomySyncMessage?.(m), message);
      }
    }
    await expect(banner).toHaveCount(0);
    await page.evaluate(() => window.__longyuSetEconomySyncMessage?.("Carga não confirmada pelo servidor."));
    await expect(banner).toBeVisible();
    await page.evaluate(() => window.__longyuSetEconomySyncMessage?.(null));
    await expect(banner).toHaveCount(0);
    await page.evaluate(() => window.__longyuSetEconomySyncMessage?.("Carga não confirmada pelo servidor."));
    await page.waitForTimeout(300);
    await expect(banner).toHaveCount(0);
  });
});

test.describe("RC2.2.8 — P6 medalhas no Perfil", () => {
  test("medalha desbloqueada é destacável; bloqueada não aparece; passaporte separado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const now = Date.now();
    await seed(page, {
      cultureSeals: ["social-etiquette"],
      cultureCompletedIds: ["greetings-nihao", "thanks-keqi", "qingwen-ask"],
      achievementsUnlocked: { "cultura-primeiro-selo": now - 1000, "jornada-primeira-licao": now - 2000 },
      achievementHistory: [
        { id: "cultura-primeiro-selo", unlockedAt: now - 1000 },
        { id: "jornada-primeira-licao", unlockedAt: now - 2000 },
      ],
    }, { once: true });
    await page.goto("/perfil");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const featured = page.getByTestId("profile-featured-medals");
    await expect(featured).toHaveAttribute("data-featured-count", "0");
    await page.getByTestId("profile-choose-medals").click();
    await expect(page.getByTestId("profile-medal-toggle-cultura-todos-selos")).toHaveCount(0);
    await page.getByTestId("profile-medal-toggle-cultura-primeiro-selo").click();
    await expect(featured).toHaveAttribute("data-featured-count", "1");
    await expect(page.getByTestId("profile-featured-cultura-primeiro-selo")).toBeVisible();
    await expect(page.getByTestId("profile-culture-passport")).toHaveAttribute("data-seal-count", "1");
    await expect(page.getByTestId("profile-see-all-medals")).toHaveAttribute("href", "/conquistas");
    await page.reload();
    await expect(page.getByTestId("profile-featured-medals")).toHaveAttribute("data-featured-count", "1");
  });
});

test.describe("RC2.2.8 — P7 cosmético de Jade", () => {
  test("comprar Moldura de Jade: Pérolas caem uma vez, equipa, persiste no reload", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, { dragonPearls: 10 }, { once: true });
    await page.goto("/loja");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const card = page.getByTestId("shop-item-shop-pearl-cosmetic");
    await expect(card).toContainText(/Moldura de Jade/);
    await expect(card).not.toContainText(/em breve/i);
    await expect(page.getByTestId("shop-lifetime-shop-pearl-cosmetic")).toHaveAttribute("data-lifetime", "permanent");
    await page.getByTestId("shop-buy-shop-pearl-cosmetic").click();
    await expect(page.getByRole("dialog")).toContainText(/10/);
    await page.getByRole("dialog").getByRole("button").last().click();
    await expect(page.getByTestId("shop-owned-shop-pearl-cosmetic")).toBeVisible();
    const pearls = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state.dragonPearls);
    expect(pearls).toBe(6);

    await page.goto("/perfil");
    await waitForLazyPage(page);
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-profile-frame", "equipped");
    await page.getByTestId("profile-equip-shop-pearl-cosmetic").click();
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-profile-frame", "none");
    await page.getByTestId("profile-equip-shop-pearl-cosmetic").click();
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-profile-frame", "equipped");
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-profile-frame", "equipped");
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state.dragonPearls);
    expect(after, "Pérolas debitadas uma única vez").toBe(6);
  });
});

test.describe("RC2.2.8 — P8 Atlas → Revisão", () => {
  test("filtro Fracos → Treinar este conjunto → sessão só com os Hànzì elegíveis", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seed(page, {
      learnedChars: ["ni", "hao", "wo"],
      srs: {
        ...srsItem("char", "ni", "significado", { lapses: 2, reps: 0, due: Date.now() + DAY }),
        ...srsItem("char", "hao", "significado", { lapses: 0, reps: 5, due: Date.now() + 10 * DAY }),
      },
      isPremium: true,
      serverIsPro: true,
    });
    await page.goto("/hanzi/atlas");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByTestId("atlas-smart-set-weak").click();
    await expect(page.getByTestId("atlas-study-set-count")).toHaveAttribute("data-study-set-size", "1");
    await page.getByTestId("atlas-train-set").click();
    await expect(page).toHaveURL(/\/revisao\?conjunto=atlas&chars=ni/);
    await expect(page.locator('[data-review-study-set="atlas"]')).toHaveAttribute("data-review-study-set-size", "1");
  });
});

test.describe("RC2.2.8 — P9 Phase Challenge economia", () => {
  const sealed = { cultureSeals: ["social-etiquette", "urban-china", "chinese-table"] };

  test("próxima fase custa 3; avançada custa 4; prévia mostra saldo", async ({ page }) => {
    await seed(page, { completedLessons: [], folego: 5, ...sealed });
    await page.goto("/teste/fase/p2");
    await waitForLazyPage(page);
    await expect(page.getByTestId("phase-challenge-preview")).toHaveAttribute("data-challenge-cost", "3");
    await expect(page.getByTestId("phase-challenge-cost")).toContainText(/3/);
    await expect(page.getByTestId("phase-challenge-balance")).toContainText(/5/);
    await page.goto("/teste/fase/p3");
    await waitForLazyPage(page);
    await expect(page.getByTestId("phase-challenge-preview")).toHaveAttribute("data-challenge-cost", "4");
  });

  test("47h59 depois de reprovar: BLOQUEADO, mesmo com Pro e Pérolas", async ({ page }) => {
    const retryAt = Date.now() + 60_000; // falta 1 min para 48h
    await seed(page, {
      completedLessons: [],
      folego: 5,
      isPremium: true,
      serverIsPro: true,
      dragonPearls: 99,
      points: 9999,
      phaseChallengeCooldowns: { p2: retryAt },
      ...sealed,
    });
    await page.goto("/teste/fase/p2");
    await waitForLazyPage(page);
    await expect(page.getByTestId("phase-challenge-cooldown")).toBeVisible();
    await expect(page.getByTestId("phase-challenge-start")).toBeDisabled();
  });

  test("48h depois: LIBERADO; começar debita 3 Fôlegos uma vez", async ({ page }) => {
    await seed(page, { completedLessons: [], folego: 5, phaseChallengeCooldowns: { p2: Date.now() - 1_000 }, ...sealed }, { once: true });
    await page.goto("/teste/fase/p2");
    await waitForLazyPage(page);
    await expect(page.getByTestId("phase-challenge-cooldown")).toHaveCount(0);
    const start = page.getByTestId("phase-challenge-start");
    await expect(start).toBeEnabled();
    await start.dblclick();
    await expect(page.getByTestId("phase-challenge-exam")).toBeVisible();
    const folego = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state.folego);
    expect(folego).toBe(2);
  });

  test("Journey mostra 'Testar esta fase' só na próxima e na seguinte", async ({ page }) => {
    await seed(page, { completedLessons: ALL_LESSONS.slice(0, 3).map((l) => l.id), ...sealed });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("phase-challenge-cta-p2")).toHaveAttribute("data-challenge-kind", "next");
    await expect(page.getByTestId("phase-challenge-cta-p3")).toHaveAttribute("data-challenge-kind", "advanced");
    await expect(page.getByTestId("phase-challenge-cta-p4")).toHaveCount(0);
  });
});

test.describe("RC2.2.8 — A Cultura com o dragão", () => {
  test("selo novo: reveal uma vez, não reaparece no reload", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(
      page,
      { holdAchievementModals: false, cultureSeals: ["social-etiquette"], cultureSealsRevealed: [] },
      { once: true }
    );
    await page.goto("/cultura");
    await waitForLazyPage(page);
    const reveal = page.getByTestId("culture-seal-reveal");
    await expect(reveal).toBeVisible({ timeout: 15_000 });
    await expect(reveal).toHaveAttribute("data-seal-id", "social-etiquette");
    for (let i = 0; i < 6 && (await reveal.isVisible().catch(() => false)); i += 1) {
      await reveal.getByTestId("guide-continue").click();
      await page.waitForTimeout(150);
    }
    await expect(reveal).toHaveCount(0);
    await page.reload();
    await waitForLazyPage(page);
    await page.waitForTimeout(600);
    await expect(page.getByTestId("culture-seal-reveal")).toHaveCount(0);
  });

  test("Hub: o dragão fala na primeira visita e fica quieto ao trocar filtro", async ({ page }) => {
    await seed(page, {}, { once: true });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    const guide = page.getByTestId("culture-hub-guide");
    await expect(guide).toHaveAttribute("data-guide-message", "intro");
    const speech = guide.getByTestId("guide-speech-box");
    await speech.click(); // antecipa: texto completo (a voz corta junto)
    await expect(guide.getByTestId("culture-hub-guide-dialogue")).toHaveAttribute("data-guide-phase", /complete|typing/);
    await page.getByTestId("culture-toggle-secondary").click();
    await page.getByTestId("culture-show-categories").click();
    await page.getByTestId("culture-filter-festivals").click();
    await page.getByTestId("culture-filter-all").click();
    await expect(page.getByTestId("culture-hub-guide")).toHaveCount(1);
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-hub-guide")).not.toHaveAttribute("data-guide-message", "intro");
  });
});

test.describe("RC2.2.8 — D3/E5 mobile", () => {
  test("D3 — toque no Hànzì abre o gloss no mobile e registra a consulta", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await seed(page, {
      learnedChars: ["ni", "hao", "wo"],
      srs: { ...srsItem("char", "ni", "significado"), ...srsItem("char", "hao", "significado"), ...srsItem("char", "wo", "significado") },
      isPremium: true,
      serverIsPro: true,
    });
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const lookup = page.locator('[data-review-lookup="enabled"]');
    await expect(lookup).toBeVisible({ timeout: 20_000 });
    const token = lookup.locator('[aria-haspopup="dialog"]').first();
    await expect(token).toBeVisible();
    await token.tap();
    await expect(page.getByRole("dialog", { name: /Ajuda de leitura/i })).toBeVisible();
    await expect(page.getByTestId("gloss-atlas-link")).toBeVisible();
    await expect(lookup).toHaveAttribute("data-review-assistance-used", "true");
    // E1 — Hànzì principal grande no mobile (>= text-5xl = 48px).
    const size = await token.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(48);
    await context.close();
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 360, height: 640 },
  ]) {
    test(`E5.1 — sem scroll horizontal em ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page, {
        learnedChars: ["ni", "hao", "wo"],
        srs: { ...srsItem("char", "ni", "significado"), ...srsItem("char", "hao", "significado"), ...srsItem("char", "wo", "significado") },
        isPremium: true,
        serverIsPro: true,
        dragonPearls: 10,
        cultureSeals: ["social-etiquette"],
        folego: 5,
        completedLessons: [],
      });
      for (const route of ["/revisao", "/perfil", "/loja", "/hanzi/atlas", "/cultura", "/teste/fase/p2"]) {
        await page.goto(route);
        await waitForLazyPage(page);
        await dismissBlockingOverlays(page);
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `scroll horizontal em ${route}`).toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe("RC2.2.8 — EN", () => {
  test("Phase Challenge, Perfil e Loja falam inglês", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en");
    await seed(page, { completedLessons: [], folego: 5, cultureSeals: ["social-etiquette", "urban-china", "chinese-table"], dragonPearls: 10 });
    await page.goto("/teste/fase/p2");
    await waitForLazyPage(page);
    await expect(page.getByTestId("phase-challenge-cost")).toHaveText("This test costs 3 Breaths");
    await expect(page.getByTestId("phase-challenge-balance")).toHaveText("Your balance: 5 Breaths");
    await page.goto("/perfil");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("profile-featured-medals")).toContainText("Featured medals");
    await expect(page.getByTestId("profile-culture-passport")).toContainText("Culture Passport");
    await expect(page.getByTestId("profile-customize")).toContainText("Customize profile");
    await page.goto("/loja");
    await waitForLazyPage(page);
    await expect(page.getByTestId("shop-lifetime-shop-pearl-cosmetic")).toHaveText(/Permanent/);
  });
});
