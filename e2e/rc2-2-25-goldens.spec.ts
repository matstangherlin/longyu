import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, matureDiscoveryState, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.25 — goldens para o ACEITE VISUAL do owner (SIM/NÃO por superfície).
 * 15 superfícies × 5 viewports. Sob demanda (RC2225_GOLDENS=1): as capturas
 * vão para docs/reports/rc2-2-25-goldens/ no aparelho de quem roda e NÃO são
 * aceite — só o SIM do owner vira OWNER_ACCEPTED em
 * docs/release/rc2-2-25-owner-product-debt.json.
 */
const OUT = path.join(process.cwd(), "docs/reports/rc2-2-25-goldens");
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 432, height: 960 },
];
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2", "l2-rev"];

const chunkSrs = () => {
  const now = Date.now();
  const ids = ["nihao", "xiexie", "zaijian", "bukeqi", "zaoshanghao", "wojiao", "nihaoma", "wohenhao"];
  return Object.fromEntries(ids.map((id, index) => [`chunk:${id}`, { id: `chunk:${id}`, type: "chunk", itemId: id, ease: 2.5, intervalDays: 1, due: now - 1000 - index, reps: 1, lapses: 0, createdAt: now - 86_400_000 }]));
};

/** Superfície → rota + passo opcional para entrar no modo atividade. */
const SURFACES: { id: string; route: string; enter?: (page: Page) => Promise<void> }[] = [
  { id: "jornada", route: "/jornada" },
  { id: "licao", route: "/licao/l1/player" },
  { id: "praticar", route: "/treino" },
  { id: "revisao-hub", route: "/revisao" },
  { id: "revisao-rodada", route: "/revisao?iniciar=1" },
  { id: "tons-hub", route: "/som" },
  { id: "tons-rodada", route: "/som", enter: async (page) => page.getByTestId("tone-trainer-start").click() },
  { id: "pinyin", route: "/pinyin" },
  { id: "fala", route: "/fala", enter: async (page) => page.getByTestId("fala-phrases-start").click() },
  { id: "hanzi", route: "/hanzi" },
  { id: "cultura", route: "/cultura" },
  { id: "imersao", route: "/imersao" },
  { id: "mais", route: "/mais" },
  { id: "conta", route: "/conta" },
  { id: "perfil", route: "/perfil" },
];

test.skip(!process.env.RC2225_GOLDENS, "goldens sob demanda: RC2225_GOLDENS=1");

for (const viewport of VIEWPORTS) {
  test.describe(`RC2.2.25 goldens ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    for (const surface of SURFACES) {
      test(surface.id, async ({ page }) => {
        await seedTelemetryDeclined(page);
        await allowE2ELocalSession(page);
        const payload = JSON.stringify({ state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, guidance: { version: 2, enabled: false, initialized: true, records: {} }, completedLessons: THROUGH_L2, ...matureDiscoveryState(), srs: chunkSrs(), learnedChunks: Object.keys(chunkSrs()).map((key) => key.slice(6)) }, version: 21 });
        await page.addInitScript((value: string) => {
          if (!sessionStorage.getItem("rc2225-goldens")) {
            sessionStorage.setItem("rc2225-goldens", "1");
            localStorage.setItem("longyu-v1", value);
          }
        }, payload);
        await page.goto(surface.route);
        await waitForLazyPage(page);
        await dismissBlockingOverlays(page);
        if (surface.enter) await surface.enter(page).catch(() => undefined);
        await page.waitForTimeout(400);
        await mkdir(OUT, { recursive: true });
        await page.screenshot({ path: path.join(OUT, `${surface.id}-${viewport.width}x${viewport.height}.png`) });
      });
    }
  });
}
