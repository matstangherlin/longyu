/**
 * RC2.3.4 — capture walkthrough screenshots for progressive writing UI.
 * Run: npx playwright test e2e/rc2-3-4-hanzi-writing-screens.spec.ts --project=chromium
 */
import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";
import { ALL_LESSONS } from "../src/data/journey";
import path from "node:path";

const DONE = ALL_LESSONS.slice(0, ALL_LESSONS.findIndex((lesson) => lesson.id === "l5-rev") + 1).map((lesson) => lesson.id);
test("RC2.3.4 writing surfaces screenshots", async ({ page }, testInfo) => {
  // RC2.3.4A: write into the test output dir (CI runners cannot write /opt).
  const OUT = testInfo.outputDir;
  await page.setViewportSize({ width: 390, height: 844 });
  await seedOnboardedSession(page, DONE);
  // RC2.3.4A: memory write only opens after a recorded correct trace.
  await page.addInitScript(() => {
    const items: Record<string, unknown> = {};
    for (const [charId, character] of [["mu", "木"], ["ren", "人"], ["ri", "日"], ["yue", "月"], ["kou", "口"], ["shan", "山"]]) {
      items[charId] = { character, charId, tracingCorrect: 1, tracingAttempts: 1, memoryWriteCorrect: 0, memoryWriteAttempts: 0,
        recognitionCorrect: 1, recognitionAttempts: 1, assemblyCorrect: 1, assemblyAttempts: 1, completeCorrect: 0,
        completeAttempts: 0, strokeOrderOk: 1, strokeOrderAttempts: 1, contextWriteCorrect: 0, contextWriteAttempts: 0,
        helpUsedCount: 0, undoUsedCount: 0, replayUsedCount: 0, lastStage: "TRACE", writingState: "TRACED", updatedAt: Date.now() };
    }
    localStorage.setItem("longyu:hanzi-form-evidence-v1", JSON.stringify({ version: 1, items, cloudMergeReady: true }));
  });

  await page.goto("/ideogramas");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "hanzi-ideogramas-hub.png"), fullPage: true });

  await page.goto("/hanzi?mode=trace");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("hanzi-writing-exercise")).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: path.join(OUT, "hanzi-trace-canvas.png") });

  const canvas = page.getByTestId("hanzi-writing-canvas");
  if (await canvas.count()) {
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.35, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, "hanzi-trace-after-stroke.png") });
    }
  }

  await page.goto("/hanzi?mode=memory");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("hanzi-writing-exercise")).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: path.join(OUT, "hanzi-memory-write.png") });

  await page.goto("/hanzi?lab=1&char=mu");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "hanzi-writing-lab.png"), fullPage: true });
});
