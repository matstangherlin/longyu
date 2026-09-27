import fs from "node:fs";
import { test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, matureDiscoveryState, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.19 — evidência antes/depois (golden-negative). Só com SHOT_PACK=1.
 * O MESMO arquivo roda na base (main 231adff6, SHOT_LABEL=before) e nesta
 * branch (SHOT_LABEL=after): mesmas rotas, mesmas sementes, só rotas e
 * cliques que existem nas duas versões.
 */
const SHOT = process.env.SHOT_PACK === "1";
const LABEL = process.env.SHOT_LABEL === "before" ? "before" : "after";
const OUT = process.env.SHOT_OUT ?? "docs/reports/rc2-2-19-screenshots";
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];

async function seed(page: Page, state: Record<string, unknown>, guidanceOn: boolean) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({ state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, ...state }, version: 21 });
  await page.addInitScript(
    ({ value, on }: { value: string; on: boolean }) => {
      if (on) localStorage.setItem("longyu:e2e-guidance", "on");
      if (sessionStorage.getItem("rc2219-shot")) return;
      sessionStorage.setItem("rc2219-shot", "1");
      localStorage.setItem("longyu-v1", value);
    },
    { value: payload, on: guidanceOn }
  );
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(`${OUT}/${LABEL}`, { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${LABEL}/${name}.jpg`, type: "jpeg", quality: 70 });
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

const chunkSrs = () => {
  const now = Date.now();
  const ids = ["nihao", "xiexie", "zaijian", "bukeqi", "zaoshanghao", "wojiao", "nihaoma", "wohenhao"];
  return Object.fromEntries(ids.map((id, index) => [`chunk:${id}`, { id: `chunk:${id}`, type: "chunk", itemId: id, ease: 2.5, intervalDays: 1, due: now - 1000 - index, reps: 1, lapses: 0, createdAt: now - 86_400_000 }]));
};

test.describe("RC2.2.19 · antes/depois", () => {
  test.skip(!SHOT, "SHOT_PACK=1 para gerar o pacote visual");
  test.use({ viewport: { width: 390, height: 844 } });

  test("01 conta madura do RC2.2.18: orientação nunca vista", async ({ page }) => {
    const legacySeen = Object.fromEntries(["welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1", "culture_unlocked_v1", "hanzi_unlocked_v1", "atlas_unlocked_v1", "shop_introduction_v1", "immersion_unlocked_v1"].map((id) => [id, { status: "SEEN", at: 1 }]));
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState(), guidance: { enabled: true, initialized: true, records: legacySeen } }, true);
    await open(page, "/jornada");
    await page.waitForTimeout(2_500);
    await shot(page, "01-mature-guidance");
  });

  test("02 revisão", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, learnedChunks: Object.keys(chunkSrs()).map((k) => k.slice(6)), srs: chunkSrs() }, false);
    await open(page, "/revisao");
    await page.waitForTimeout(800);
    await shot(page, "02-review");
  });

  test("03 perfil (360×740)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() }, false);
    await open(page, "/perfil");
    await shot(page, "03-profile-first-fold");
  });

  test("04 Mais", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() }, false);
    await open(page, "/mais");
    await shot(page, "04-more");
  });

  test("05 Imersão: antes da cena", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() }, false);
    await open(page, "/imersao");
    await page.getByTestId("recommended-story-start").click({ timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    await shot(page, "05-story-prescreen");
  });

  test("06 Pinyin Lab: iniciais", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 }, false);
    await open(page, "/pinyin");
    await page.getByRole("button", { name: "Iniciais", exact: true }).first().click().catch(() => undefined);
    const diagram = page.locator('[data-articulation-diagram="j-q-x"]');
    if (await diagram.count()) await diagram.scrollIntoViewIfNeeded();
    await shot(page, "06-pinyin-initials");
  });
});
