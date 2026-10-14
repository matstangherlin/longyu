import fs from "node:fs";
import path from "node:path";
import { test, type Browser } from "@playwright/test";
import { dismissBlockingOverlays, seedUnlockedLessonSession } from "../helpers";

/**
 * RC2.3.13R.3.2.3 — Journey SVG evidence pack (docs/screenshots/rc2-3-13r3-2-3/).
 * Each shot scrolls a named scene to the middle of the screen with its
 * neighbouring nodes visible; the video scrolls scene → nodes → scene.
 */
const OUT = path.join(process.cwd(), "docs/screenshots/rc2-3-13r3-2-3");

type Shot = {
  file: string;
  width: number;
  height: number;
  lesson: string;
  scene: string;
  theme?: "clay" | "dark";
  fontScale?: number;
  reducedMotion?: boolean;
  selector?: string;
};

const SHOTS: Shot[] = [
  { file: "journey-svg-360-foundation.png", width: 360, height: 640, lesson: "l3", scene: "moon-gate" },
  { file: "journey-svg-390-foundation.png", width: 390, height: 844, lesson: "l3", scene: "buddhist-temple" },
  { file: "journey-svg-375-foundation.png", width: 375, height: 667, lesson: "l3", scene: "moon-gate" },
  { file: "journey-svg-390-everyday.png", width: 390, height: 844, lesson: "l9-tudo-bem", scene: "sun-wukong" },
  { file: "journey-svg-390-travel.png", width: 390, height: 844, lesson: "p5-mu-mu-lin", scene: "great-wall" },
  { file: "journey-svg-390-real-life.png", width: 390, height: 844, lesson: "l26b", scene: "lucky-cat" },
  { file: "journey-svg-390-modern.png", width: 390, height: 844, lesson: "p7-imersao-mercado", scene: "modern-city" },
  { file: "journey-svg-light.png", width: 390, height: 844, lesson: "l9-tudo-bem", scene: "sun-wukong", theme: "clay" },
  { file: "journey-svg-dark.png", width: 390, height: 844, lesson: "l9-tudo-bem", scene: "sun-wukong", theme: "dark" },
  { file: "journey-svg-dark-temple.png", width: 390, height: 844, lesson: "l3", scene: "buddhist-temple", theme: "dark" },
  { file: "journey-svg-large-font.png", width: 360, height: 640, lesson: "l9-tudo-bem", scene: "sun-wukong", fontScale: 1.3 },
  { file: "journey-svg-reduced-motion.png", width: 390, height: 844, lesson: "l9-tudo-bem", scene: "sun-wukong", reducedMotion: true },
  { file: "journey-svg-tablet.png", width: 834, height: 1112, lesson: "l9-tudo-bem", scene: "sun-wukong" },
  { file: "journey-svg-desktop.png", width: 1280, height: 900, lesson: "l9-tudo-bem", scene: "sun-wukong" },
  { file: "journey-svg-review-medallion-light.png", width: 390, height: 844, lesson: "l9-rev", scene: "", selector: '[data-journey-bubble-v2][data-lesson-id="l9-rev"]' },
  { file: "journey-svg-review-medallion-dark.png", width: 390, height: 844, lesson: "l9-rev", scene: "", selector: '[data-journey-bubble-v2][data-lesson-id="l9-rev"]', theme: "dark" },
];

async function open(browser: Browser, shot: Shot, video?: string) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
    locale: "pt-BR",
    reducedMotion: shot.reducedMotion ? "reduce" : "no-preference",
    ...(video ? { recordVideo: { dir: video, size: { width: shot.width, height: shot.height } } } : {}),
  });
  const page = await context.newPage();
  if (shot.fontScale) {
    await page.addInitScript((scale: number) => {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      });
    }, shot.fontScale);
  }
  await seedUnlockedLessonSession(page, shot.lesson, { theme: shot.theme ?? "clay", followSystemTheme: false });
  await page.goto("/jornada");
  await page.waitForSelector("[data-journey-scene-lanes]", { timeout: 45_000 });
  await dismissBlockingOverlays(page);
  return { context, page };
}

test("Journey SVG screenshot pack", async ({ browser }) => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const shot of SHOTS) {
    const { context, page } = await open(browser, shot);
    const toggle = page.locator('button[aria-expanded="false"]', { hasText: /^Ver tudo$/ }).first();
    if (!(await page.locator(shot.selector ?? `[data-journey-scene="${shot.scene}"]`).count())) await toggle.click();
    const target = page.locator(shot.selector ?? `[data-journey-scene="${shot.scene}"]`).first();
    await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(OUT, shot.file) });
    await context.close();
  }
});

test("Journey SVG scroll trace (scene left → nodes → scene right → scene left)", async ({ browser }) => {
  const dir = path.join(OUT, ".video");
  const shot: Shot = { file: "", width: 390, height: 844, lesson: "l3", scene: "moon-gate" };
  const { context, page } = await open(browser, shot, dir);
  const first = page.locator('[data-journey-scene="moon-gate"]').first();
  await first.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(900);
  for (let i = 0; i < 26; i += 1) {
    await page.mouse.wheel(0, 90);
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(600);
  const video = page.video();
  await context.close();
  if (video) {
    fs.renameSync(await video.path(), path.join(OUT, "journey-svg-scroll.webm"));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
