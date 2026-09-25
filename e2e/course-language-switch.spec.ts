import { test, expect, type Page } from "@playwright/test";
import {
  seedInstructionLocale,
  seedInterfaceLocale,
  seedLessonPlayerReady,
  switchCourseInSettings,
  switchInterfaceLocaleInSettings,
  waitForLazyPage,
} from "./helpers";
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

async function courseValue(page: Page) {
  return page.locator("[data-course-direction-value]").getAttribute("data-course-direction-value");
}

test.describe("V4.8.8 / RC2.2.14B course language", () => {
  test("course switch changes instruction, never canonical progress/SRS identity", async ({ page }) => {
    await seedInterfaceLocale(page, "pt-BR");
    await seedInstructionLocale(page, "pt-BR");
    // M1 already completed: this is the persisted state whose identity must survive the switch.
    await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });

    await page.goto("/licao/p1-o-que-e-mandarim");
    await waitForLazyPage(page);
    await expect(page.getByText("O que é mandarim?", { exact: true }).first()).toBeVisible();
    const before = await pedagogySnapshot(page);

    await switchCourseInSettings(page, "en-zh");
    await expect(page.locator("html")).toHaveAttribute("data-instruction-locale", "en");
    await expect(page.locator("[data-course-direction-value]")).toHaveText("Inglês → Mandarim");

    await page.goto("/licao/p1-o-que-e-mandarim");
    await waitForLazyPage(page);
    await expect(page.getByText("What is Mandarin?", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "What is Mandarin?", exact: true })).toBeVisible();
    expect(await pedagogySnapshot(page)).toEqual(before);

    await switchCourseInSettings(page, "pt-zh");
    await page.goto("/licao/p1-o-que-e-mandarim");
    await waitForLazyPage(page);
    await expect(page.getByText("O que é mandarim?", { exact: true }).first()).toBeVisible();
    expect(await pedagogySnapshot(page)).toEqual(before);
  });

  test("app and course languages are separate choices (interface never moves the course)", async ({ page }) => {
    await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });
    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    expect(await courseValue(page)).toBe("pt-zh");

    // Interface EN: menus in English, course stays Portuguese → Mandarin.
    await switchInterfaceLocaleInSettings(page, "en");
    await expect(page.getByTestId("settings-interface-locale-row")).toContainText("App language");
    expect(await courseValue(page)).toBe("pt-zh");
    await expect(page.locator("[data-course-direction-value]")).toHaveText("Portuguese → Mandarin");

    // Course EN with interface EN, then interface back to PT: course stays EN.
    await switchCourseInSettings(page, "en-zh");
    await switchInterfaceLocaleInSettings(page, "pt-BR");
    expect(await courseValue(page)).toBe("en-zh");
    await expect(page.locator("[data-course-direction-value]")).toHaveText("Inglês → Mandarim");
  });
});
