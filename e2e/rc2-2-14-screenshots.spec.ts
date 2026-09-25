import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { ALL_LESSONS } from "../src/data/journey";
import { dismissBlockingOverlays, seedOnboardedSession, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14 — pacote de screenshots antes/depois (5 viewports do spec).
 *
 *   SHOT_TARGET=after  (padrão; servidor do build atual)
 *   SHOT_TARGET=before SHOT_BASE=http://127.0.0.1:4174  (build de 0c5ad5ae)
 *
 * Grava em docs/reports/rc2-2-14-screenshots/<alvo>/<tela>-<L>x<A>.jpg.
 */
const TARGET = process.env.SHOT_TARGET === "before" ? "before" : "after";
const BASE = process.env.SHOT_BASE ?? "";
const OUT = path.join("docs", "reports", "rc2-2-14-screenshots", TARGET);
const VIEWPORTS = [
  [360, 740],
  [360, 800],
  [390, 844],
  [412, 915],
  [432, 960],
] as const;
const HANZI_READY = ALL_LESSONS.slice(0, ALL_LESSONS.findIndex((lesson) => lesson.id === "l5-rev") + 1).map((lesson) => lesson.id);

test.skip(!process.env.SHOT_PACK, "pacote de screenshots: rode com SHOT_PACK=1");

async function shot(page: Page, name: string, width: number, height: number) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}-${width}x${height}.jpg`), type: "jpeg", quality: 60 });
}

async function open(page: Page, route: string, width: number, height: number, seed: "none" | "journey" | "hanzi") {
  await page.setViewportSize({ width, height });
  if (seed === "none") await seedTelemetryDeclined(page);
  else await seedOnboardedSession(page, seed === "hanzi" ? HANZI_READY : ["l1", "l2", "l3"]);
  await page.goto(`${BASE}${route}`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

for (const [width, height] of VIEWPORTS) {
  test(`landing ${width}x${height}`, async ({ page }) => {
    await open(page, "/", width, height, "none");
    await shot(page, "landing", width, height);
  });
  test(`ideogramas ${width}x${height}`, async ({ page }) => {
    await open(page, "/ideogramas", width, height, "hanzi");
    await shot(page, "hanzi-hub", width, height);
  });
  test(`config ${width}x${height}`, async ({ page }) => {
    await open(page, "/config", width, height, "journey");
    await shot(page, "settings", width, height);
  });
  test(`hanzi builder ${width}x${height}`, async ({ page }) => {
    await open(page, TARGET === "after" ? "/hanzi?mode=fragments" : "/hanzi", width, height, "hanzi");
    await shot(page, "hanzi-builder", width, height);
  });
}

test("lição: linha de etapa 390x844", async ({ page }) => {
  await open(page, "/licao/l1/player", 390, 844, "journey");
  await shot(page, "lesson-stage", 390, 844);
});

test("teste guiado 390x844", async ({ page }) => {
  test.skip(TARGET === "before", "não existia antes");
  await open(page, "/teste-guiado", 390, 844, "none");
  await page.locator("[data-guided-listen]").click();
  await shot(page, "guided-try", 390, 844);
});
