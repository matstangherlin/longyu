import { test, expect, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  waitForLazyPage,
} from "./helpers";
import { clickFirstVisible } from "./lesson-player-helpers";

const EVIDENCE = "docs/reports/v488-screenshots";

async function openAudioDiscrimination(page: Page, locale: "pt-BR" | "en") {
  await seedInterfaceLocale(page, locale);
  await seedInstructionLocale(page, locale);
  await allowE2ELocalSession(page);
  await page.goto("/qa/audio-discrimination");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const task = page.locator("[data-audio-discrimination]");
  await expect(task).toBeVisible({ timeout: 15_000 });
}

for (const locale of ["pt-BR", "en"] as const) {
  test(`audio discrimination is listening-only with accessible replay (${locale})`, async ({ page }) => {
    test.setTimeout(180_000);
    await openAudioDiscrimination(page, locale);
    const task = page.locator("[data-audio-discrimination]");
    const title = locale === "en" ? "Are the sounds the same or different?" : "Os sons são iguais ou diferentes?";
    const prompt = locale === "en"
      ? "Listen to both sounds. Compare only what you hear."
      : "Ouça os dois sons. Compare apenas o que você ouve.";
    await expect(task.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(task.getByText(prompt, { exact: true })).toBeVisible();
    await expect(task.getByRole("button", { name: locale === "en" ? "Listen to both again" : "Ouvir os dois novamente" })).toBeVisible();
    await expect(task.locator(".hanzi:visible")).toHaveCount(0);
    await expect(task.getByRole("button", { name: locale === "en" ? "Same" : "Iguais" })).toBeVisible();
    await expect(task.getByRole("button", { name: locale === "en" ? "Different" : "Diferentes" })).toBeVisible();

    await page.screenshot({ path: `${EVIDENCE}/audio-discrimination-${locale === "en" ? "en" : "pt"}.png` });

    const [audioA, audioB] = await task.locator("button .sr-only").evaluateAll((labels) =>
      labels.map((label) => label.textContent?.trim() ?? "")
    );
    const answer = audioA === audioB
      ? (locale === "en" ? /^Same$/ : /^Iguais$/)
      : (locale === "en" ? /^Different$/ : /^Diferentes$/);
    await task.getByRole("button", { name: answer }).click();
    await clickFirstVisible(page, locale === "en" ? [/^Check$/, /^Confirm$/] : [/^Verificar$/, /^Confirmar$/, /^Conferir$/]);
    await expect(task.locator(".hanzi:visible").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("[data-lesson-feedback]").last()).toBeVisible();
  });
}
