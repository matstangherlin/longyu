import { test, expect } from "@playwright/test";
import { clickFirstVisible } from "./lesson-player-helpers";
import { allowE2ELocalSession, dismissBlockingOverlays, waitForLazyPage } from "./helpers";
import {
  assertBankAboveSticky,
  openDenseSentenceBuild,
  simulateVirtualKeyboard,
} from "./lesson-player-mobile-helpers";

const VIEWPORTS = [
  { label: "android-360x800", width: 360, height: 800 },
  { label: "mobile-390x844", width: 390, height: 844 },
  { label: "iphone-like-412x915", width: 412, height: 915 },
  { label: "desktop-1280x720", width: 1280, height: 720 },
] as const;
const EVIDENCE = "docs/reports/v488-screenshots";

for (const viewport of VIEWPORTS) {
  test.describe(`LESSON_BOTTOM_ACTION_REGION ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("feedback and controls finish above the measured bottom action", async ({ page }) => {
      test.setTimeout(150_000);
      await allowE2ELocalSession(page);
      await page.goto("/qa/audio-discrimination");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const audioTask = page.locator("[data-audio-discrimination]");
      await expect(audioTask).toBeVisible({ timeout: 15_000 });
      const scroll = page.locator("[data-lesson-scroll-region]").first();
      const task = page.locator("[data-lesson-task-body]");
      await expect(scroll).toBeVisible();
      await expect(task).toBeVisible();

      if (viewport.width === 390) {
        await page.screenshot({ path: `${EVIDENCE}/lesson-mobile-before.png` });
      }

      const [audioA, audioB] = await audioTask.locator("button .sr-only").evaluateAll((labels) =>
        labels.map((label) => label.textContent?.trim() ?? "")
      );
      await audioTask.getByRole("button", { name: audioA === audioB ? /^Iguais$/ : /^Diferentes$/ }).click();
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
      const feedback = page.locator("[data-lesson-feedback]").last();
      const bottomAction = page.locator("[data-lesson-bottom-action]:visible").last();
      await expect(feedback).toBeVisible({ timeout: 10_000 });
      await expect(bottomAction).toBeVisible();

      if (viewport.width === 390) {
        await page.screenshot({ path: `${EVIDENCE}/lesson-mobile-feedback-continue.png` });
      }

      await scroll.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });

      const geometry = await page.evaluate(() => {
        const scroller = document.querySelector("[data-lesson-scroll-region]") as HTMLElement | null;
        const feedback = [...document.querySelectorAll<HTMLElement>("[data-lesson-feedback]")]
          .filter((node) => node.getBoundingClientRect().height > 0)
          .at(-1) ?? null;
        const action = [...document.querySelectorAll<HTMLElement>("[data-lesson-bottom-action]")]
          .filter((node) => node.getBoundingClientRect().height > 0)
          .at(-1) ?? null;
        const task = document.querySelector("[data-lesson-task-body]") as HTMLElement | null;
        if (!scroller || !feedback || !action || !task) return { ok: false, reason: "missing sentinel" };
        const fr = feedback.getBoundingClientRect();
        const ar = action.getBoundingClientRect();
        const reserve = Number.parseFloat(getComputedStyle(scroller).getPropertyValue("--lesson-bottom-action-height"));
        const overlappingControls = [...task.querySelectorAll<HTMLElement>("button, input, textarea, [role='button']")]
          .filter((node) => !action.contains(node) && node.getBoundingClientRect().height > 0)
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.bottom > ar.top - 4 && rect.top < ar.bottom;
          })
          .map((node) => (node.textContent ?? node.getAttribute("aria-label") ?? node.tagName).trim().slice(0, 40));
        return {
          ok: fr.bottom <= ar.top - 4 && feedback.offsetTop + feedback.offsetHeight <= scroller.scrollHeight,
          feedbackBottom: fr.bottom,
          actionTop: ar.top,
          actionHeight: ar.height,
          reserve,
          reserveDelta: Math.abs(reserve - ar.height),
          overlappingControls,
        };
      });
      expect(geometry.ok, JSON.stringify(geometry)).toBe(true);
      expect(geometry.reserveDelta, JSON.stringify(geometry)).toBeLessThanOrEqual(2);
      expect(geometry.overlappingControls, JSON.stringify(geometry)).toEqual([]);

      if (viewport.width === 390) {
        await page.screenshot({ path: `${EVIDENCE}/lesson-mobile-feedback-end.png` });
      }
    });
  });
}

test.describe("bottom action with virtual keyboard and dense Hanzi bank", () => {
  test.use({ viewport: { width: 360, height: 800 } });
  test("bank/input region remains reachable after visual viewport shrinks", async ({ page }) => {
    test.setTimeout(180_000);
    await openDenseSentenceBuild(page);
    await simulateVirtualKeyboard(page, 420);
    await assertBankAboveSticky(page);
  });
});
