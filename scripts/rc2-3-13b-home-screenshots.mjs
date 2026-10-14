/**
 * Capture Home cognitive screenshots at 360/375/390 for new, returning, review-due.
 * Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:4177 node scripts/rc2-3-13b-home-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/opt/cursor/artifacts";
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4177";
const STORE_VERSION = 16;

function storePayload(state) {
  return JSON.stringify({
    state: {
      accountSetupComplete: true,
      achievementsUnlocked: { "seeded-mute": Date.now() },
      ...state,
    },
    version: STORE_VERSION,
  });
}

const VIEWPORTS = [
  { w: 360, h: 640 },
  { w: 375, h: 667 },
  { w: 390, h: 844 },
];

const STATES = [
  { id: "new", state: { completedLessons: [] } },
  { id: "returning", state: { completedLessons: ["l1", "l2"] } },
  {
    id: "review-due",
    state: {
      completedLessons: ["l1", "l2", "l3"],
      srs: {
        "chunk:nihao": {
          id: "chunk:nihao",
          type: "chunk",
          itemId: "nihao",
          ease: 2.5,
          intervalDays: 1,
          due: Date.now() - 1000,
          reps: 1,
          lapses: 0,
          createdAt: Date.now() - 86_400_000,
        },
      },
    },
  },
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const st of STATES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      locale: "pt-BR",
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("longyu:e2e-allow-local", "1");
      localStorage.setItem("longyu:telemetry-consent", "declined");
    });
    await page.addInitScript((payload) => {
      localStorage.setItem("longyu-v1", payload);
    }, storePayload(st.state));
    await page.goto(`${BASE}/jornada`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="home-cognitive"]', { timeout: 20_000 });
    // Dismiss common overlays if present.
    for (const sel of ['[data-testid="telemetry-decline"]', 'button:has-text("Agora não")', 'button:has-text("Fechar")']) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) await el.click().catch(() => {});
    }
    const name = `rc2-3-13b-home-${st.id}-${vp.w}x${vp.h}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: false });
    console.log("wrote", name);
    await context.close();
  }
}
await browser.close();
console.log("done");
