import { expect, test } from "@playwright/test";

test("a home de staging abre sem fixture local @qa-staging", async ({ page }, testInfo) => {
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    testInfo.skip(true, "só roda com PLAYWRIGHT_BASE_URL apontando para o site de staging");
    return;
  }
  await page.goto("/");
  await expect(page).toHaveTitle(/Longyu/i);
});
