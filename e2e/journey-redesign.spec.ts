import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";
import { ALL_LESSONS } from "../src/data/journey";
import { ACHIEVEMENTS } from "../src/data/achievements";

const STORE_VERSION = 15;

type SeedState = Record<string, unknown>;

function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

/** Conclui as primeiras `n` lições na ordem real da Jornada. */
function firstLessons(n: number): { completedLessons: string[]; lessonStarsById: Record<string, number> } {
  const completedLessons = ALL_LESSONS.slice(0, n).map((l) => l.id);
  const lessonStarsById = Object.fromEntries(
    completedLessons.map((id) => [id, ALL_LESSONS.find((l) => l.id === id)?.isReview ? 2 : 3])
  );
  return { completedLessons, lessonStarsById };
}

function dueReviewSrs() {
  const base = { ease: 2.5, intervalDays: 1, due: Date.now() - 100000, reps: 1, lapses: 0, createdAt: Date.now() - 200000 };
  return {
    "chunk:nihao": { id: "chunk:nihao", type: "chunk", itemId: "nihao", ...base },
    "chunk:xiexie": { id: "chunk:xiexie", type: "chunk", itemId: "xiexie", ...base },
  };
}

async function seed(page: Page, state: SeedState) {
  await seedTelemetryDeclined(page);
  await page.addInitScript(
    (payload: string) => localStorage.setItem("longyu-v1", payload),
    JSON.stringify({
      state: { accountSetupComplete: true, achievementsUnlocked: allAchievementsUnlocked(), ...state },
      version: STORE_VERSION,
    })
  );
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(2);
}

test.describe("Jornada — cabeçalho e continuidade (mobile)", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("usuário novo: ação principal é começar a primeira lição", async ({ page }) => {
    await seed(page, { completedLessons: [] });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Começar primeira lição/i })).toBeVisible();
    // A lição atual é reconhecível semanticamente.
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
    await noOverflow(page);
  });

  test("com progresso: a ação principal vira Continuar", async ({ page }) => {
    await seed(page, firstLessons(3));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const continueBtn = page.getByRole("button", { name: /^Continuar$/ });
    await expect(continueBtn).toBeVisible();
    // Chevron ao lado do texto — não empilhado (botão baixo, não "torre").
    const box = await continueBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThan(64);
    await noOverflow(page);
  });

  test("Rever lição mantém chevron ao lado do rótulo", async ({ page }) => {
    await seed(page, firstLessons(3));
    const lessonId = ALL_LESSONS[0]?.id;
    expect(lessonId).toBeTruthy();
    await page.goto(`/licao/${lessonId}`);
    await dismissBlockingOverlays(page);
    const reviewBtn = page.getByRole("button", { name: /^Rever lição$/ });
    await expect(reviewBtn).toBeVisible();
    const box = await reviewBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThan(64);
  });

  test("revisão pendente aparece como ação recomendada secundária", async ({ page }) => {
    await seed(page, { ...firstLessons(3), srs: dueReviewSrs() });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    // Continuar continua como ação principal.
    await expect(page.getByRole("button", { name: /^Continuar$/ })).toBeVisible();
    // Revisão como link secundário positivo.
    const review = page.getByRole("link", { name: /Revisar \d+ ite/i });
    await expect(review).toBeVisible();
    await expect(review).toHaveAttribute("href", "/revisao");
    await expect(page.getByText(/Reforça o que você já aprendeu — leva/i)).toBeVisible();
    await noOverflow(page);
  });

  test("Jornada concluída mostra estado próprio, sem Continuar", async ({ page }) => {
    const completedLessons = ALL_LESSONS.map((l) => l.id);
    const lessonStarsById = Object.fromEntries(completedLessons.map((id) => [id, 3]));
    await seed(page, { completedLessons, lessonStarsById });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1, name: /Jornada concluída/i })).toBeVisible();
    await expect(page.getByText(/Você concluiu a Jornada disponível/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar|Começar/i })).toHaveCount(0);
    await noOverflow(page);
  });
});

test.describe("Jornada — densidade e unidades compactas", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("unidades concluídas ficam compactas: poucos nós renderizados", async ({ page }) => {
    // 24 lições concluídas, mas só a unidade atual expande.
    await seed(page, firstLessons(24));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const rendered = await page.locator("main [aria-disabled]").count();
    // Muito menor que o total de lições — as unidades concluídas não renderizam nós.
    expect(rendered).toBeLessThan(ALL_LESSONS.length / 2);
    // Unidades não-atuais expõem um controle de expandir dedicado.
    const collapsed = await page.getByRole("button", { name: /Expandir/i }).count();
    expect(collapsed).toBeGreaterThan(0);
    await noOverflow(page);
  });

  test("expandir uma unidade concluída revela suas lições", async ({ page }) => {
    test.slow();
    await seed(page, firstLessons(24));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const before = await page.locator("main [aria-disabled]").count();
    // Foco + Enter aciona o botão real sem depender de estabilidade de scroll
    // (a imagem do mascote pode deslocar o layout durante o carregamento).
    const firstCollapsed = page.getByRole("button", { name: /Expandir/i }).first();
    await firstCollapsed.focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => page.locator("main [aria-disabled]").count()).toBeGreaterThan(before);
  });
});

test.describe("Jornada — offline, reduced motion e desktop", () => {
  test("indicador offline aparece discretamente", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seed(page, firstLessons(3));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText(/Offline/i).first()).toBeVisible();
    // Conteúdo local continua acessível: a ação principal segue visível.
    await expect(page.getByRole("button", { name: /^Continuar$/ })).toBeVisible();
    await page.context().setOffline(false);
  });

  test("reduced motion desliga o pulso da lição atual", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 360, height: 640 });
    await seed(page, firstLessons(3));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const animationName = await page
      .locator("main .animate-pulse")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName)
      .catch(() => "none");
    expect(animationName).toBe("none");
  });

  test("desktop: painel lateral mostra revisão pendente e progresso geral", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, { ...firstLessons(6), srs: dueReviewSrs() });
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    const rail = page.getByRole("complementary", { name: /Resumo da jornada/i });
    await expect(rail.getByText(/itens? pronto/i)).toBeVisible();
    await expect(rail.getByText(/Progresso geral/i)).toBeVisible();
    await noOverflow(page);
  });

  test("navegação por teclado alcança o controle de expandir unidade", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, firstLessons(24));
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    // O controle de expandir é um <button> real e recebe foco.
    const toggle = page.getByRole("button", { name: /Expandir/i }).first();
    await toggle.focus();
    await expect(toggle).toBeFocused();
  });
});
