import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedOnboardedSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";

const SEQUENCE_ORDERS = [
  ["notice", "decide", "act"],
  ["notice", "decide", "thanks"],
  ["off", "in", "move"],
  ["wait-serve", "serve-others", "taste"],
  ["ask", "scan", "confirm"],
  ["shoes", "observe"],
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
    const parsed = raw ? (JSON.parse(raw) as { state?: PersistSlice } & PersistSlice) : {};
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

function midStepIndex(lessonId: string): number {
  const lesson = ALL_LESSONS.find((row) => row.id === lessonId);
  const total = lesson?.steps.length ?? 10;
  return Math.max(1, Math.floor(total * 0.35) - 1);
}

async function openLessonPlayer(page: Page, lessonId: string, extra: Record<string, unknown> = {}) {
  await seedUnlockedLessonSession(page, lessonId, extra);
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
}

test.describe("V4.9.7B shopping survival", () => {
  test("l27 lesson page opens the digital-pay mission", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l27");
    await page.goto("/licao/l27");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "digital-pay");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/cultura\/digital-pay/);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "digital-pay");
  });

  test("p6-compras lesson page opens the bargaining-context mission", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p6-compras");
    await page.goto("/licao/p6-compras");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "bargaining-context");
  });

  test("p7-imersao-mercado has no culture card", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p7-imersao-mercado");
    await page.goto("/licao/p7-imersao-mercado");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: no mercado/i })).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveCount(0);
  });

  test("l27 listen_select asks for the spoken price without leaking 28 in the title", async ({ page }) => {
    test.setTimeout(120_000);
    await openLessonPlayer(page, "l27");
    const reached = await advanceUntilVisible(
      page,
      page.getByRole("heading", { name: "Quanto o vendedor cobrou?" }),
      40
    );
    expect(reached).toBeTruthy();
    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toHaveAttribute("data-current-step-kind", "listen_select");
    const title = page.getByRole("heading", { name: "Quanto o vendedor cobrou?" });
    await expect(title).toBeVisible();
    await expect(title).not.toContainText(/二十八|28/);
    await expect(page.getByRole("button", { name: /^28$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^18$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^10$/ })).toBeVisible();
  });

  test("p6-compras Journey bridge teaches bargaining without 3★ or lexical SRS", async ({ page }) => {
    test.setTimeout(120_000);
    await openLessonPlayer(page, "p6-compras", {
      lessonSessionStepById: { "p6-compras": { pass: 1, stepIndex: midStepIndex("p6-compras") } },
    });
    const reached = await advanceUntilSelector(page, '[data-testid="culture-bridge"]', 40, 120_000);
    expect(reached).toBeTruthy();
    const bridge = page.getByTestId("culture-bridge");
    await expect(bridge).toHaveAttribute("data-item-id", "bargaining-context");
    await expect(page.getByTestId("culture-bridge-teach")).toBeVisible();
    await expect(page.getByTestId("culture-bridge-options")).toHaveCount(0);

    const before = await readPersist(page);

    await page.getByTestId("culture-bridge-continue").click();
    await expect(page.getByTestId("culture-bridge-options")).toBeVisible();
    await page.getByTestId("culture-bridge-option-b").click();
    await page.getByTestId("culture-bridge-continue").click();
    await expect(page.getByTestId("culture-bridge-feedback")).toBeVisible();
    await page.getByTestId("culture-bridge-continue").click();
    await expect(page.getByTestId("culture-plus-one")).toBeVisible();
    await expect(page.getByTestId("culture-stars")).toHaveCount(0);

    await expect
      .poll(async () => (await readPersist(page)).cultureKnowledgeById["bargaining-context-core"]?.state, {
        timeout: 8_000,
      })
      .toBe("practiced");
    const after = await readPersist(page);
    expect(after.cultureCompletedIds).not.toContain("bargaining-context");
    expect(after.cultureMasteryById["bargaining-context"]).toBeUndefined();
    expect(after.cultureMemoryById["bargaining-context-core"]).toBeUndefined();
    expect(Object.keys(after.srs)).toEqual(Object.keys(before.srs));
    expect(after.cultureKnowledgeById["bargaining-context-core"]?.source).toBe("journey");

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/0 \/ 19/);
    await expect(page.getByTestId("culture-node-bargaining-context")).toHaveAttribute("data-knowledge", "practiced");
    await expect(page.getByTestId("culture-node-journey-bargaining-context")).toBeVisible();
    await expect(page.locator('[data-testid="culture-card"][data-culture-id="bargaining-context"]')).toHaveAttribute(
      "data-culture-status",
      "new"
    );
  });

  test("p7 mercado hears 二十八, WeChat pay, then a market conversation", async ({ page }) => {
    test.setTimeout(150_000);
    await openLessonPlayer(page, "p7-imersao-mercado");
    const price = await advanceUntilVisible(
      page,
      page.getByRole("heading", { name: "Quanto o vendedor cobrou?" }),
      30
    );
    expect(price).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Quanto o vendedor cobrou?" })).not.toContainText(/二十八|28/);
    await expect(page.getByRole("button", { name: /^28$/ })).toBeVisible();

    const payment = await advanceUntilVisible(
      page,
      page.getByRole("heading", { name: "O que o caixa quer saber?" }),
      20
    );
    expect(payment).toBeTruthy();
    await expect(page.getByRole("button", { name: /Pagamento pelo WeChat/i })).toBeVisible();
    await expect(page.locator("[data-lesson-player-frame]")).not.toContainText("微信还是支付宝");

    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 30, 90_000);
    expect(scene).toBeTruthy();
  });

  test("digital-pay mission completes with stars", async ({ page }) => {
    test.setTimeout(90_000);
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura/digital-pay");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "digital-pay");
    await playCurrentStep(page);
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await playMissionToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("digital-pay");
    expect(persist.cultureMasteryById["digital-pay"]?.stars).toBeGreaterThanOrEqual(1);
    expect(persist.cultureMemoryById["digital-pay-core"]).toBeTruthy();
  });

  test("bargaining mission teaches, sequences notice-decide-act, and awards stars", async ({ page }) => {
    test.setTimeout(90_000);
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura/bargaining-context");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "bargaining-context");
    await playCurrentStep(page);
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await expect(page.getByTestId("culture-options")).toHaveCount(0);
    await playCurrentStep(page);
    await expect(page.getByTestId("culture-teach")).toBeVisible();

    let sawSequence = false;
    for (let i = 0; i < 40; i += 1) {
      if (await page.getByTestId("culture-victory").isVisible().catch(() => false)) break;
      if (await page.getByTestId("culture-seq-notice").isVisible().catch(() => false)) {
        sawSequence = true;
        await expect(page.getByTestId("culture-seq-decide")).toBeVisible();
        await expect(page.getByTestId("culture-seq-act")).toBeVisible();
      }
      await playCurrentStep(page);
    }
    await expect(page.getByTestId("culture-victory")).toBeVisible();
    expect(sawSequence).toBeTruthy();
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("bargaining-context");
    expect(persist.cultureMasteryById["bargaining-context"]?.stars).toBeGreaterThanOrEqual(1);
  });
});
