import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedOnboardedSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";

const SEQUENCE_ORDERS = [
  ["notice", "decide", "act"],
  ["notice", "decide", "thanks"],
  ["off", "in", "move"],
  ["wait-serve", "serve-others", "taste"],
  ["ask", "scan", "confirm"],
  ["shoes", "observe"],
  ["open", "scan", "move"],
];

type PersistSlice = {
  srs: Record<string, unknown>;
  cultureCompletedIds: string[];
  cultureMasteryById: Record<string, { stars?: number; completed?: boolean }>;
  cultureMemoryById: Record<string, unknown>;
  cultureKnowledgeById: Record<string, { state?: string; source?: string }>;
};

async function readPersist(page: Page): Promise<PersistSlice> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const parsed = raw
      ? (JSON.parse(raw) as { state?: PersistSlice } & PersistSlice)
      : ({ state: {} } as { state?: PersistSlice } & PersistSlice);
    const state = parsed.state ?? parsed;
    return {
      srs: state.srs ?? {},
      cultureCompletedIds: state.cultureCompletedIds ?? [],
      cultureMasteryById: state.cultureMasteryById ?? {},
      cultureMemoryById: state.cultureMemoryById ?? {},
      cultureKnowledgeById: state.cultureKnowledgeById ?? {},
    };
  });
}

async function playCurrentStep(page: Page, wrongFirst = false) {
  if (await page.getByTestId("culture-victory").isVisible().catch(() => false)) return;

  const sequence = page.getByTestId("culture-sequence");
  if (await sequence.isVisible().catch(() => false)) {
    const buttons = sequence.locator("button");
    const n = await buttons.count();
    const ids: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const testid = await buttons.nth(i).getAttribute("data-testid");
      ids.push((testid ?? "").replace("culture-seq-", ""));
    }
    const order =
      SEQUENCE_ORDERS.find((row) => row.length === ids.length && row.every((id) => ids.includes(id))) ?? ids;
    for (const id of order) {
      await page.getByTestId(`culture-seq-${id}`).click();
    }
  } else if (await page.getByTestId("culture-match").isVisible().catch(() => false)) {
    const lefts = page.locator('[data-testid^="culture-match-left-"]');
    const n = await lefts.count();
    for (let i = 0; i < n; i += 1) {
      const testid = await lefts.nth(i).getAttribute("data-testid");
      const id = (testid ?? "").replace("culture-match-left-", "");
      await page.getByTestId(`culture-match-left-${id}`).click();
      await page.getByTestId(`culture-match-right-${id}`).click();
    }
  } else {
    const options = page.locator('[data-testid^="culture-option-"]');
    if ((await options.count()) > 0 && !(await page.getByTestId("culture-check-feedback").isVisible().catch(() => false))) {
      if (wrongFirst) {
        const optionA = page.getByTestId("culture-option-a");
        if (await optionA.count()) await optionA.click();
        else await options.first().click();
      } else {
        const optionB = page.getByTestId("culture-option-b");
        if (await optionB.count()) await optionB.click();
        else await options.first().click();
      }
    }
  }
  await page.getByTestId("culture-complete").click();
}

async function playMissionToVictory(page: Page, { wrongFirst = false } = {}) {
  await expect(page.getByTestId("culture-item")).toBeVisible();
  for (let i = 0; i < 40; i += 1) {
    if (await page.getByTestId("culture-victory").isVisible().catch(() => false)) return;
    await playCurrentStep(page, wrongFirst && i === 0);
    wrongFirst = false;
  }
  await expect(page.getByTestId("culture-victory")).toBeVisible();
}

async function openAuthoredLessonPlayer(page: Page, lessonId: string) {
  await seedUnlockedLessonSession(page, lessonId, {
    lessonSessionStepById: { [lessonId]: { pass: 1, stepIndex: 1 } },
  });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
}

test.describe("V4.9.8A city mobility", () => {
  test("p6-cidade-lugares opens the metro-qr mission", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p6-cidade-lugares");
    await page.goto("/licao/p6-cidade-lugares");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "metro-qr");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/cultura\/metro-qr/);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "metro-qr");
  });

  test("p7 station lesson page keeps metro-qr without a second card gap", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p7-imersao-estacao");
    await page.goto("/licao/p7-imersao-estacao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: na estação/i })).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "metro-qr");
  });

  test("p6-cidade Journey bridge teaches metro-qr without 3★ or lexical SRS", async ({ page }) => {
    test.setTimeout(120_000);
    await openAuthoredLessonPlayer(page, "p6-cidade-lugares");
    const reached = await advanceUntilSelector(page, '[data-testid="culture-bridge"]', 40, 90_000);
    expect(reached).toBeTruthy();
    const bridge = page.getByTestId("culture-bridge");
    await expect(bridge).toHaveAttribute("data-item-id", "metro-qr");
    await expect(page.getByTestId("culture-bridge-teach")).toBeVisible();
    await expect(page.getByTestId("culture-bridge-options")).toHaveCount(0);

    const before = await readPersist(page);

    await page.getByTestId("culture-bridge-continue").click();
    await expect(page.getByTestId("culture-bridge-options")).toBeVisible();
    const option = page.locator('[data-testid^="culture-bridge-option-"]').first();
    await option.click();
    await page.getByTestId("culture-bridge-continue").click();
    await expect(page.getByTestId("culture-bridge-feedback")).toBeVisible();
    await page.getByTestId("culture-bridge-continue").click();
    await expect(page.getByTestId("culture-plus-one")).toBeVisible();
    await expect(page.getByTestId("culture-stars")).toHaveCount(0);

    await expect
      .poll(async () => (await readPersist(page)).cultureKnowledgeById["metro-qr-core"]?.state, {
        timeout: 8_000,
      })
      .toBe("practiced");
    const after = await readPersist(page);
    expect(after.cultureCompletedIds).not.toContain("metro-qr");
    expect(after.cultureMasteryById["metro-qr"]).toBeUndefined();
    expect(after.cultureMemoryById["metro-qr-core"]).toBeUndefined();
    expect(Object.keys(after.srs)).toEqual(Object.keys(before.srs));
    expect(after.cultureKnowledgeById["metro-qr-core"]?.source).toBe("journey");
  });

  test("p6-direcoes player reaches a map", async ({ page }) => {
    test.setTimeout(120_000);
    await openAuthoredLessonPlayer(page, "p6-direcoes");
    const map = await advanceUntilSelector(page, "text=Mapa", 50, 90_000);
    expect(map).toBeTruthy();
    await expect(page.getByText("Mapa").first()).toBeVisible();
  });

  test("p7 station player reaches a mobility conversation", async ({ page }) => {
    test.setTimeout(120_000);
    await openAuthoredLessonPlayer(page, "p7-imersao-estacao");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
  });

  test("p6-china-ruas player reaches the taxi conversation", async ({ page }) => {
    test.setTimeout(120_000);
    await openAuthoredLessonPlayer(page, "p6-china-ruas");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
  });

  test("metro-qr mission teaches before the task and awards stars", async ({ page }) => {
    test.setTimeout(90_000);
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura/metro-qr");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "metro-qr");
    await playCurrentStep(page);
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await expect(page.getByTestId("culture-options")).toHaveCount(0);
    await playMissionToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("metro-qr");
    expect(persist.cultureMasteryById["metro-qr"]?.stars).toBeGreaterThanOrEqual(1);
  });
});

test.describe("V4.9.8A city mobility 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("station lesson and metro-qr mission fit the phone viewport", async ({ page }) => {
    test.setTimeout(90_000);
    await seedUnlockedLessonSession(page, "p7-imersao-estacao");
    await page.goto("/licao/p7-imersao-estacao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: na estação/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);

    await page.goto("/cultura/metro-qr");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "metro-qr");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);
  });
});
