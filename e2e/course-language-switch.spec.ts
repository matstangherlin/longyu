import { test, expect, type Page } from "@playwright/test";
import {
  seedInstructionLocale,
  seedInterfaceLocale,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";

const EVIDENCE = "docs/reports/v488-screenshots";
const PEDAGOGY_KEYS = [
  "completedLessons",
  "lessonMasteryById",
  "lessonStarsById",
  "srs",
  "srsById",
  "mistakes",
  "mistakeItems",
  "points",
  "qi",
  "folego",
] as const;

async function pedagogySnapshot(page: Page) {
  return page.evaluate((keys) => {
    const raw = localStorage.getItem("longyu-v1");
    const state = raw ? JSON.parse(raw).state ?? {} : {};
    return Object.fromEntries(keys.map((key) => [key, state[key] ?? null]));
  }, PEDAGOGY_KEYS);
}

async function openSettings(page: Page) {
  await page.goto("/ajustes");
  await waitForLazyPage(page);
  await expect(page.getByTestId("instruction-locale-select")).toBeVisible();
}

test.describe("V4.8.8 course language", () => {
  test("course switch changes instruction, never canonical progress/SRS identity", async ({ page }) => {
    await seedInterfaceLocale(page, "pt-BR");
    await seedInstructionLocale(page, "pt-BR");
    // M1 already completed: this is the persisted state whose identity must survive the switch.
    await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });

    await page.goto("/licao/p1-o-que-e-mandarim");
    await waitForLazyPage(page);
    await expect(page.getByText("O que é mandarim?", { exact: true }).first()).toBeVisible();
    const before = await pedagogySnapshot(page);

    await openSettings(page);
    await page.getByTestId("instruction-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
    await expect(page.getByTestId("current-course-focus")).toContainText("English → Mandarim");

    await page.goto("/licao/p1-o-que-e-mandarim");
    await waitForLazyPage(page);
    await expect(page.getByText("What is Mandarin?", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "What is Mandarin?", exact: true })).toBeVisible();
    expect(await pedagogySnapshot(page)).toEqual(before);

    await openSettings(page);
    await page.getByTestId("instruction-locale-select").selectOption("pt-BR");
    await page.goto("/licao/p1-o-que-e-mandarim");
    await waitForLazyPage(page);
    await expect(page.getByText("O que é mandarim?", { exact: true }).first()).toBeVisible();
    expect(await pedagogySnapshot(page)).toEqual(before);
  });

  test("app and course languages remain independently understandable", async ({ page }) => {
    await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });
    await openSettings(page);

    await expect(page.getByTestId("current-course-focus")).toContainText("Português (Brasil) → Mandarim");
    await page.screenshot({ path: `${EVIDENCE}/settings-pt-course-pt.png`, fullPage: true });

    // First app-language choice follows the course while no manual override exists.
    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.getByTestId("instruction-locale-select")).toHaveValue("en");
    await expect(page.getByTestId("current-course-focus")).toContainText("English → Mandarin");
    await page.screenshot({ path: `${EVIDENCE}/settings-en-course-en.png`, fullPage: true });

    // A manual course choice becomes authoritative and is not overwritten later.
    await page.getByTestId("instruction-locale-select").selectOption("pt-BR");
    await expect(page.getByTestId("current-course-focus")).toContainText("Português (Brasil) → Mandarin");
    await page.screenshot({ path: `${EVIDENCE}/settings-en-course-pt.png`, fullPage: true });

    await page.getByTestId("interface-locale-select").selectOption("pt-BR");
    await page.getByTestId("instruction-locale-select").selectOption("en");
    await expect(page.getByTestId("current-course-focus")).toContainText("English → Mandarim");
    await page.screenshot({ path: `${EVIDENCE}/settings-pt-course-en.png`, fullPage: true });

    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.getByTestId("instruction-locale-select")).toHaveValue("en");
  });
});
