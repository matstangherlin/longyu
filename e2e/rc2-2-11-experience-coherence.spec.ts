import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.11 — Learning Coherence, Immersion, Identity & Navigation Hardening.
 *
 * Geometria real (bounding boxes), não snapshot de pixel: o contrato é "nada
 * se sobrepõe sem intenção", em desktop, tablet e mobile.
 */
const STORE_VERSION = 21;
const DAY = 86_400_000;

async function seed(page: Page, state: Record<string, unknown>) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ payload }) => {
      if (sessionStorage.getItem("rc2211-seeded")) return;
      sessionStorage.setItem("rc2211-seeded", "1");
      localStorage.setItem("longyu-v1", payload);
    },
    {
      payload: JSON.stringify({
        state: { accountSetupComplete: true, completedLessons: ["l1", "l2", "l3"], holdAchievementModals: true, ...state },
        version: STORE_VERSION,
      }),
    }
  );
}

type Box = { x: number; y: number; width: number; height: number };

function intersects(a: Box, b: Box): boolean {
  const tolerance = 1;
  return (
    a.x + tolerance < b.x + b.width &&
    b.x + tolerance < a.x + a.width &&
    a.y + tolerance < b.y + b.height &&
    b.y + tolerance < a.y + a.height
  );
}

async function boxes(page: Page, testIds: string[]): Promise<Record<string, Box>> {
  const out: Record<string, Box> = {};
  for (const id of testIds) {
    const locator = page.getByTestId(id).first();
    if ((await locator.count()) === 0 || !(await locator.isVisible())) continue;
    const box = await locator.boundingBox();
    if (box) out[id] = box;
  }
  return out;
}

function expectNoOverlap(found: Record<string, Box>, label: string) {
  const ids = Object.keys(found);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      expect(intersects(found[ids[i]], found[ids[j]]), `${label}: ${ids[i]} sobrepõe ${ids[j]}`).toBe(false);
    }
  }
}

const now = Date.now();
const PROFILE_STATE = {
  xpTotal: 1840,
  streak: 31,
  achievementsUnlocked: {
    "sequencia-30": now - 1000,
    "jornada-primeira-fase": now - 2000,
    "missoes-medalha-mensal": now - 3000,
    "jornada-primeira-licao": now - 4000,
    "som-primeiro-audio": now - 5000,
    "atlas-10-fracos-recuperados": now - 6000,
  },
  achievementHistory: [
    { id: "sequencia-30", unlockedAt: now - 1000 },
    { id: "jornada-primeira-fase", unlockedAt: now - 2000 },
    { id: "missoes-medalha-mensal", unlockedAt: now - 3000 },
  ],
  featuredAchievementIds: ["sequencia-30", "jornada-primeira-fase", "missoes-medalha-mensal"],
  rewardHistory: [
    { id: "r1", type: "xp", amount: 40, source: "Lição concluída: Cumprimentos e apresentações do dia a dia", claimedAt: now - DAY / 2 },
    { id: "r2", type: "qi", amount: 50, source: "Medalha: Ponto fraco, ponto forte — recuperação completa", claimedAt: now - DAY },
    { id: "r3", type: "xp", amount: 25, source: "Revisão espaçada com hànzì e tons trocados", claimedAt: now - 2 * DAY },
    { id: "r4", type: "xp", amount: 10, source: "Imersão", claimedAt: now - 3 * DAY },
  ],
};

const PROFILE_SIZES = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];

test.describe("RC2.2.11 — Perfil sem sobreposição", () => {
  for (const size of PROFILE_SIZES) {
    test(`Perfil ${size.width}x${size.height}: medalhas, conquistas recentes e histórico não se sobrepõem`, async ({ page }) => {
      await page.setViewportSize(size);
      await seed(page, PROFILE_STATE);
      await page.goto("/perfil");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByTestId("profile-recent-achievements")).toBeVisible();
      if (size.width < 1024) {
        // Mobile: os blocos recolhíveis abertos também não podem invadir vizinhos.
        for (const id of ["profile-recent-achievements", "profile-recent-history"]) {
          const details = page.getByTestId(id);
          if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
        }
      }
      const found = await boxes(page, [
        "profile-featured-medals",
        "profile-culture-passport",
        "profile-recent-achievements",
        "profile-recent-history",
        "profile-friends-card",
        "profile-username",
      ]);
      expect(Object.keys(found)).toEqual(expect.arrayContaining(["profile-recent-achievements", "profile-recent-history"]));
      expectNoOverlap(found, `${size.width}x${size.height}`);
      // Conteúdo interno não pode estourar a própria caixa (a causa clássica de invasão).
      for (const id of ["profile-recent-achievements", "profile-recent-history"]) {
        const overflow = await page.getByTestId(id).evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow, `${id} estoura horizontalmente`).toBeLessThanOrEqual(1);
      }
      await expect(page.getByTestId("profile-featured-medals")).toHaveAttribute("data-featured-count", "3");
      const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(docOverflow).toBeLessThanOrEqual(0);
    });
  }

  test("Perfil 1366x768 vazio: estado vazio de conquistas não invade o histórico", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await seed(page, { completedLessons: [], rewardHistory: PROFILE_STATE.rewardHistory });
    await page.goto("/perfil");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const found = await boxes(page, ["profile-recent-achievements", "profile-recent-history", "profile-friends-card"]);
    expectNoOverlap(found, "1366x768 vazio");
  });
});
