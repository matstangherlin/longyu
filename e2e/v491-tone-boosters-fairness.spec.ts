import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedTelemetryDeclined,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";

const SHOTS = path.join(process.cwd(), "docs/reports/v491-screenshots");

async function startPlacement(page: Page) {
  await seedTelemetryDeclined(page);
  await page.goto("/comecar");
  await waitForLazyPage(page);
  await page.getByRole("button", { name: /^Começar$/i }).click();
  await page.getByTestId("onboarding-choice-travel").click();
  await page.getByRole("button", { name: /^Continuar$/i }).click();
  await page.getByTestId("onboarding-choice-zero").click();
  await page.getByRole("button", { name: /^Continuar$/i }).click();
  await expect(page.getByTestId("placement-quiz")).toBeVisible();
}

async function canonicalPlacementOrder(page: Page) {
  return page.locator("[data-testid^='placement-option-']").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid")?.replace("placement-option-", ""))
  );
}

async function seedTonePass(page: Page, level: 1 | 2) {
  await seedUnlockedLessonSession(page, "p1-o-que-e-tom", {
    learnedChunks: ["nihao"],
    learnedChars: ["ni", "hao"],
  });
  await page.addInitScript((masteryLevel: number) => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return;
    const payload = JSON.parse(raw);
    payload.state.lessonMasteryById = {
      ...(payload.state.lessonMasteryById ?? {}),
      "p1-o-que-e-tom": {
        level: masteryLevel,
        passCount: masteryLevel,
        lastPass: masteryLevel,
        recoveryPending: false,
        updatedAt: Date.now(),
      },
    };
    localStorage.setItem("longyu-v1", JSON.stringify(payload));
  }, level);
}

test.describe("V4.9.1 tone learning, boosters, and assessment fairness", () => {
  test("tone foundation exposes contour before asking for a tone number", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedInstructionLocale(page, "pt-BR");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qa/tone");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByRole("heading", { name: "A curva faz parte da palavra" })).toBeVisible();
    await page.getByRole("button", { name: /^Entendi$/ }).click();
    const firstNotice = page.locator("[data-tone-guided-notice='1']");
    await expect(firstNotice).toBeVisible();
    await expect(firstNotice.locator("[data-tone-contour]")).toHaveCount(0);
    await expect(firstNotice.getByText("Primeiro ouça. Ainda não é teste.")).toBeVisible();
    await firstNotice.locator("[data-tone-first-exposure]").click();
    await expect(firstNotice.locator("[data-tone-contour='1'][data-tone-display-mode='EARLY']")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "tone-1-teaching-mobile-pt.png"), fullPage: true });

    await page.getByRole("button", { name: "Percebi a curva" }).click();
    const thirdNotice = page.locator("[data-tone-guided-notice='3']");
    await expect(thirdNotice).toBeVisible();
    await thirdNotice.locator("[data-tone-first-exposure]").click();
    await expect(thirdNotice.locator("[data-tone-contour='3']")).toBeVisible();
    await expect(thirdNotice.locator("p").filter({ hasText: /fala natural.*mais baixo e curto/i })).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "tone-3-teaching-mobile-pt.png"), fullPage: true });
    await page.getByRole("button", { name: "Percebi a curva" }).click();

    await expect(page.getByRole("heading", { name: "Qual ficou reto?" })).toBeVisible();
    await expect(page.getByText("Qual tom você ouviu?")).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "tone-first-grade-after-scaffold-mobile-pt.png"), fullPage: true });
  });

  test("Journey unlocks the 1st/3rd-tone booster with the existing Tone Trainer", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedUnlockedLessonSession(page, "p1-o-que-e-tom", { learnedChunks: ["nihao"], learnedChars: ["ni", "hao"] });
    await page.addInitScript(() => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const payload = JSON.parse(raw);
      payload.state.lessonMasteryById = {
        ...(payload.state.lessonMasteryById ?? {}),
        "p1-o-que-e-tom": { level: 1, passCount: 1, lastPass: 1, recoveryPending: false, updatedAt: Date.now() },
      };
      localStorage.setItem("longyu-v1", JSON.stringify(payload));
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const panel = page.getByTestId("foundation-orchestration");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Tone Trainer · reta × vale")).toBeVisible();
    const earlyLink = panel.locator("a[href*='tone-contour-1-3']");
    await expect(earlyLink).toBeVisible();
    await expect(panel.locator("a[href*='tone-number-1-4']")).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "tone-trainer-journey-node-desktop-pt.png"), fullPage: true });

    const masteryBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.lessonMasteryById);
    await earlyLink.click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/som\?journeyNode=booster%3Atone-contour-1-3%3Av1/);
    await expect(page.getByText("Aqui aparecem somente contornos já ensinados na Jornada.")).toBeVisible();
    const contours = await page.locator("[data-tone-contour]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-tone-contour")));
    expect(new Set(contours)).toEqual(new Set(["1", "3"]));
    const masteryAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.lessonMasteryById);
    expect(masteryAfter).toEqual(masteryBefore);
    await page.screenshot({ path: path.join(SHOTS, "tone-trainer-contour-intro-desktop-pt.png"), fullPage: true });
  });

  test("M2 teaches the 2nd and 4th contours before later assessment", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedTonePass(page, 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/licao/p1-o-que-e-tom/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Duas curvas novas" })).toBeVisible();
    await page.getByRole("button", { name: /^Entendi$/ }).click();

    const secondNotice = page.locator("[data-tone-guided-notice='2']");
    await secondNotice.locator("[data-tone-first-exposure]").click();
    await expect(secondNotice.locator("[data-tone-contour='2'][data-tone-display-mode='EARLY']")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "tone-2-teaching-mobile-pt.png"), fullPage: true });
    await page.getByRole("button", { name: "Percebi a curva" }).click();

    const fourthNotice = page.locator("[data-tone-guided-notice='4']");
    await fourthNotice.locator("[data-tone-first-exposure]").click();
    await expect(fourthNotice.locator("[data-tone-contour='4'][data-tone-display-mode='EARLY']")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "tone-4-teaching-mobile-pt.png"), fullPage: true });
  });

  test("M3 shows four-tone assessment and educational feedback after scaffold", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedTonePass(page, 2);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/licao/p1-o-que-e-tom/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Reconheça os quatro" })).toBeVisible();
    await page.getByRole("button", { name: /^Entendi$/ }).click();
    await expect(page.locator("[data-tone-simple='1'] button[aria-label*='Opção']")).toHaveCount(4);
    await expect(page.locator("[data-tone-simple='1'] [data-tone-contour]")).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "tone-four-contours-assessment-desktop-pt.png"), fullPage: true });

    await page.locator("[data-tone-simple='1'] button", { hasText: "1º tom" }).click();
    await expect(page.locator("[data-tone-answer-feedback='1'] [data-tone-contour='1']")).toBeVisible();
    await expect(page.locator("[data-tone-answer-feedback='1']")).toContainText("alto e reto");
    await page.screenshot({ path: path.join(SHOTS, "tone-educational-feedback-desktop-pt.png"), fullPage: true });
  });

  test("captures Pinyin, Hànzì, and conversation booster evidence from reused engines", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedUnlockedLessonSession(page, "p1-primeiros-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao", "mu", "ren"],
      isPremium: true,
      serverIsPro: true,
      folego: 20,
    });
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto("/pinyin?journeyNode=booster%3Apinyin-practice%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("journey-pinyin-booster")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "pinyin-journey-booster-desktop-pt.png"), fullPage: true });

    await page.goto("/hanzi?char=mu&journeyNode=booster%3Ahanzi-builder-foundations%3Av1");
    await waitForLazyPage(page);
    await expect(page.getByTestId("journey-hanzi-booster")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "hanzi-journey-booster-desktop-pt.png"), fullPage: true });

    await page.goto("/jornada/reforco/booster%3Afirst-conversation%3Av1");
    await waitForLazyPage(page);
    await expect(page.getByTestId("journey-conversation-booster")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "conversation-journey-booster-desktop-pt.png"), fullPage: true });
  });

  test("Placement option order survives rerender, viewport changes, and PT to EN", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await startPlacement(page);
    const initial = await canonicalPlacementOrder(page);
    expect(initial.length).toBeGreaterThanOrEqual(3);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await canonicalPlacementOrder(page)).toEqual(initial);
    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(await canonicalPlacementOrder(page)).toEqual(initial);
    await page.screenshot({ path: path.join(SHOTS, "placement-stable-order-mobile-en.png"), fullPage: true });
  });
});
