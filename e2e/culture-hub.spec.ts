import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedOnboardedSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";

test.describe("V4.9.6C Culture Hub", () => {
  test("opens /cultura, filters, completes, saves, and persists", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await expect(page.getByTestId("culture-progress")).toContainText(/0 \/ 18|0 \/ 18 conteúdos|0 \/ 18 items/i);

    await page.getByTestId("culture-filter-home_visits").click();
    const cards = page.getByTestId("culture-card");
    await expect(cards.first()).toBeVisible();
    await expect(cards).toHaveCount(3);

    await page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]').click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-item")).toHaveAttribute("data-culture-id", "visiting-home");
    await expect(page.getByTestId("culture-mini-check")).toBeVisible();

    await page.getByTestId("culture-option-b").click();
    await page.getByRole("button", { name: /Verificar|Check/i }).click();
    await expect(page.getByTestId("culture-check-feedback")).toBeVisible();

    await page.getByTestId("culture-complete").click();
    await expect(page.getByTestId("culture-complete")).toContainText(/Concluído|Completed/i);

    await page.getByTestId("culture-back").click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 18/);

    await page.getByTestId("culture-filter-all").click();
    await page.locator('[data-testid="culture-card"][data-culture-id="digital-pay"]').click();
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
    await expect(page.getByText("Entenda a língua dentro da vida real.")).toBeVisible();

    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en");
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Culture" })).toBeVisible();
    await expect(page.getByText("Understand the language inside real life.")).toBeVisible();
    await page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]').click();
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: "Arriving at someone's home" })).toBeVisible();
    await expect(page.getByText("You are at a classmate's front door.")).toBeVisible();
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

  test("opens a CultureItem from a lesson and returns to that lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l2");
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toBeVisible();
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/cultura\/greetings-nihao/);
    await expect(page.getByTestId("culture-item")).toBeVisible();
    await page.getByTestId("culture-back").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/licao\/l2$/);
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

test.describe("V4.9.6C Culture Hub mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hub cards are tappable at 390×844", async ({ page }) => {
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
    await expect(page.getByTestId("culture-complete")).toBeVisible();
  });
});
