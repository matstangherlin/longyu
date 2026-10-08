/**
 * RC2.3.4A — automated part of the Hànzì physical acceptance contract.
 *
 * Proves WEB behaviour only (Chromium, touch-sized viewports). It never
 * promotes ANDROID_BUILD_PASS / EMULATOR_PASS / OWNER_PHYSICAL_PASS.
 */
import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";

const DONE = ALL_LESSONS.slice(0, ALL_LESSONS.findIndex((lesson) => lesson.id === "l5-rev") + 1).map((lesson) => lesson.id);
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];
const FORM_EVIDENCE_KEY = "longyu:hanzi-form-evidence-v1";
const VERIFIED = [
  ["ren", "人"], ["kou", "口"], ["mu", "木"], ["ri", "日"], ["yue", "月"], ["shan", "山"],
  ["shui", "水"], ["huo", "火"], ["da", "大"], ["xiao", "小"], ["zhong", "中"],
] as const;

async function seedTracedEvidence(page: Page) {
  await page.addInitScript(
    ({ key, chars }) => {
      const items: Record<string, unknown> = {};
      for (const [charId, character] of chars) {
        items[charId] = {
          character, charId, recognitionCorrect: 1, recognitionAttempts: 1, assemblyCorrect: 1, assemblyAttempts: 1,
          completeCorrect: 0, completeAttempts: 0, strokeOrderOk: 1, strokeOrderAttempts: 1, tracingCorrect: 1,
          tracingAttempts: 1, memoryWriteCorrect: 0, memoryWriteAttempts: 0, contextWriteCorrect: 0,
          contextWriteAttempts: 0, helpUsedCount: 0, undoUsedCount: 0, replayUsedCount: 0, lastStage: "TRACE",
          writingState: "TRACED", updatedAt: Date.now(),
        };
      }
      localStorage.setItem(key, JSON.stringify({ version: 1, items, cloudMergeReady: true }));
    },
    { key: FORM_EVIDENCE_KEY, chars: VERIFIED.map(([id, ch]) => [id, ch]) }
  );
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

/** One multi-event stroke across the canvas; returns page scroll delta. */
async function drawStroke(page: Page) {
  const canvas = page.getByTestId("hanzi-writing-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.45, { steps: 16 });
  await page.mouse.up();
  return (await page.evaluate(() => window.scrollY)) - scrollBefore;
}

test.describe("RC2.3.4A Hànzì writing — eligibility on real surfaces", () => {
  test("fresh learner: trace and memory are locked, no exercise rendered", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]!);
    await seedOnboardedSession(page, []);
    for (const mode of ["trace", "memory"]) {
      await open(page, `/hanzi?mode=${mode}`);
      // Either the whole Hànzì area is still locked by the Journey, or the
      // writing eligibility lock shows — never a writing exercise.
      await expect(
        page.getByTestId("hanzi-writing-locked").or(page.getByRole("heading", { name: /Hànzì bloqueado/i }))
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("hanzi-writing-exercise")).toHaveCount(0);
    }
  });

  test("taught learner without a correct trace: memory stays locked", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[2]!);
    await seedOnboardedSession(page, DONE);
    await open(page, "/hanzi?mode=memory");
    await expect(page.getByTestId("hanzi-writing-locked")).toBeVisible({ timeout: 20_000 });
  });
});

for (const viewport of VIEWPORTS) {
  test.describe(`RC2.3.4A Hànzì writing @ ${viewport.width}×${viewport.height}`, () => {
    test("TRACE: canvas, multi-event stroke, clear, scroll containment", async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedOnboardedSession(page, DONE);
      await open(page, "/hanzi?mode=trace");
      const exercise = page.getByTestId("hanzi-writing-exercise");
      await expect(exercise).toBeVisible({ timeout: 20_000 });
      await expect(exercise).toHaveAttribute("data-stage", "TRACE");
      await expect(page.getByTestId("hanzi-writing-glyph")).toBeVisible();

      const wrap = page.getByTestId("hanzi-writing-canvas-wrap");
      expect(await wrap.evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
      const canvasBox = (await page.getByTestId("hanzi-writing-canvas").boundingBox())!;
      expect(canvasBox.x).toBeGreaterThanOrEqual(0);
      expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(viewport.width + 1);

      const scrolled = await drawStroke(page);
      expect(Math.abs(scrolled)).toBeLessThanOrEqual(1);
      await expect(page.getByTestId("hanzi-writing-feedback")).toBeVisible();

      await page.getByTestId("hanzi-writing-clear").click();
      await expect(page.getByTestId("hanzi-writing-canvas")).toBeVisible();
      // A second stroke after clear still registers (no pointer lock / stale overlay).
      await drawStroke(page);
      await expect(page.getByTestId("hanzi-writing-feedback")).toBeVisible();
    });

    test("MEMORY_WRITE: glyph hidden, prompt visible, canvas responds, clear", async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedOnboardedSession(page, DONE);
      await seedTracedEvidence(page);
      await open(page, "/hanzi?mode=memory");
      const exercise = page.getByTestId("hanzi-writing-exercise");
      await expect(exercise).toBeVisible({ timeout: 20_000 });
      await expect(exercise).toHaveAttribute("data-stage", "MEMORY_WRITE");
      await expect(page.getByTestId("hanzi-writing-glyph")).toHaveCount(0);
      await expect(page.getByTestId("hanzi-memory-prompt")).toBeVisible();

      const scrolled = await drawStroke(page);
      expect(Math.abs(scrolled)).toBeLessThanOrEqual(1);
      await expect(page.getByTestId("hanzi-writing-feedback")).toBeVisible();
      await page.getByTestId("hanzi-writing-clear").click();
      await expect(page.getByTestId("hanzi-writing-canvas")).toBeVisible();
    });
  });
}
