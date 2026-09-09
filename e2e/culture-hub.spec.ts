import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedOnboardedSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";

const SEQUENCE_ORDERS = [
  ["notice", "decide", "thanks"],
  ["off", "in", "move"],
  ["wait-serve", "serve-others", "taste"],
  ["ask", "scan", "confirm"],
  ["shoes", "observe"],
];

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
    const order = SEQUENCE_ORDERS.find((row) => row.length === ids.length && row.every((id) => ids.includes(id))) ?? ids;
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
  for (let i = 0; i < 24; i += 1) {
    if (await page.getByTestId("culture-victory").isVisible().catch(() => false)) return;
    await playCurrentStep(page, wrongFirst && i === 0);
    wrongFirst = false;
  }
  await expect(page.getByTestId("culture-victory")).toBeVisible();
}

async function seedDueCultureReview(page: Page) {
  await page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state: {
        currentAccountId?: string;
        cultureMemoryById?: Record<string, unknown>;
        accounts?: Record<string, { cultureMemoryById?: Record<string, unknown> }>;
      };
    };
    const due = Date.now() - 60_000;
    const row = {
      targetId: "visiting-home-core",
      cultureItemId: "visiting-home",
      due,
      stage: 0,
      reps: 0,
      lapses: 0,
      updatedAt: Date.now(),
    };
    parsed.state.cultureMemoryById = { ...(parsed.state.cultureMemoryById ?? {}), [row.targetId]: row };
    const accountId = parsed.state.currentAccountId;
    if (accountId && parsed.state.accounts?.[accountId]) {
      parsed.state.accounts[accountId].cultureMemoryById = {
        ...(parsed.state.accounts[accountId].cultureMemoryById ?? {}),
        [row.targetId]: row,
      };
    }
    localStorage.setItem("longyu-v1", JSON.stringify(parsed));
  });
}

test.describe("V4.9.7A.1 Culture Quest Engine", () => {
  test("hub shows next mission, plays a mission with contextual feedback, and persists", async ({ page }) => {
    test.setTimeout(90_000);
    await seedOnboardedSession(page, ["l1"], { replace: false });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await expect(page.getByTestId("culture-progress")).toContainText(/0 \/ 18/);
    await expect(page.getByTestId("culture-next-cta")).toBeVisible();
    await expect(page.getByTestId("culture-seals")).toBeVisible();
    await expect(page.getByTestId("culture-show-categories")).toBeVisible();

    await page.getByTestId("culture-show-categories").click();
    await page.getByTestId("culture-filter-home_visits").click();
    const cards = page.getByTestId("culture-card");
    await expect(cards.first()).toBeVisible();
    await expect(cards).toHaveCount(3);

    await page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]').click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "visiting-home");
    await expect(page.getByTestId("culture-mission-progress")).toBeVisible();

    await playCurrentStep(page);
    if (await page.getByTestId("culture-option-a").count()) {
      await page.getByTestId("culture-option-a").click();
      await page.getByTestId("culture-complete").click();
      await expect(page.getByTestId("culture-check-feedback")).toBeVisible();
      await expect(page.getByTestId("culture-check-feedback")).not.toContainText(/ERRADO|WRONG/i);
    }
    await playMissionToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    await expect(page.getByTestId("culture-xp")).toBeVisible();

    await page.getByTestId("culture-back-journey").click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 18/);

    await page.getByTestId("culture-node-digital-pay").click();
    await waitForLazyPage(page);
    await page.getByTestId("culture-save").click();
    await expect(page.getByTestId("culture-save")).toContainText(/Salvo|Saved/i);

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 18/);
    await expect(page.locator('[data-culture-id="visiting-home"]').first()).toHaveAttribute("data-culture-status", "completed");
    await expect(page.locator('[data-culture-id="digital-pay"]').first()).toHaveAttribute("data-culture-status", "in_progress");
  });

  test("PT-BR and EN catalogs render without crashing", async ({ page }) => {
    await seedInterfaceLocale(page, "pt-BR");
    await seedInstructionLocale(page, "pt-BR");
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Cultura" })).toBeVisible();
    await expect(page.getByText(/Missões culturais para agir na China|Entenda a língua/)).toBeVisible();

    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en", { force: true });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Culture" })).toBeVisible();
    await page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]').click();
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: "Arriving at someone's home" })).toBeVisible();
    await expect(page.getByText("You were invited to dinner at Mei's home.")).toBeVisible();
  });

  test("invalid culture id does not crash the route", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura/this-item-does-not-exist");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-missing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /não existe|does not exist/i })).toBeVisible();
    await page.getByRole("link", { name: /Voltar à Cultura|Back to Culture/i }).click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
  });

  test("opens a Culture Mission from a lesson and returns to that lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l2");
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toBeVisible();
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/cultura\/greetings-nihao/);
    await expect(page.getByTestId("culture-item")).toBeVisible();
    await expect(page.getByTestId("culture-mission-step")).toBeVisible();
    await page.getByTestId("culture-back").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/licao\/l2$/);
  });

  test("l26c restaurant touchpoint opens chopsticks-rest mission", async ({ page }) => {
    test.setTimeout(120_000);
    await seedUnlockedLessonSession(page, "l26c");
    await page.goto("/licao/l26c");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "chopsticks-rest");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/cultura\/chopsticks-rest/);
    await expect(page.getByTestId("culture-item")).toBeVisible();
    await expect(page.getByTestId("culture-visual-chopsticks")).toBeVisible();
    await playMissionToVictory(page);
    await page.getByTestId("culture-back-journey").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/licao\/l26c$/);
  });

  test("culture review session does not use lexical SRS chrome", async ({ page }) => {
    test.setTimeout(90_000);
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await seedDueCultureReview(page);
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-review-card")).toBeVisible();
    await page.getByTestId("culture-review-cta").click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-review")).toBeVisible();
    for (let i = 0; i < 12; i += 1) {
      if (await page.getByTestId("culture-review-done").isVisible().catch(() => false)) break;
      await playCurrentStep(page);
    }
    await expect(page.getByTestId("culture-review-done")).toBeVisible();
    await expect(page.getByTestId("srs-card")).toHaveCount(0);
  });

  test("lesson player does not show a culture card mid-exercise", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l2");
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveCount(0);
    await expect(page.getByTestId("topic-victory-return")).toHaveCount(0);
  });
});

test.describe("V4.9.7A.1 Culture Quest mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hub and mission CTA are tappable at 390×844", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    const card = page.getByTestId("culture-card").first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
    await card.click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-item")).toBeVisible();
    const cta = page.getByTestId("culture-complete");
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    expect((ctaBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
  });
});
