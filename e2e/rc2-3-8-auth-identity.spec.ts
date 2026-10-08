/**
 * RC2.3.8 — Account access (WEB evidence only; no real provider is contacted).
 *
 * - Social buttons appear only for providers switched on (QA override here),
 *   icon + text, one per line; e-mail always stays.
 * - Nothing switched on → e-mail only (honest: no dead buttons).
 * - /auth/callback cancelled or malformed → clear copy + "Tentar novamente" /
 *   "Usar outro método"; never stuck on "Entrando…"; no engine words.
 * 360/375/390 without horizontal overflow.
 */
import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];

test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
});

async function seed(page: Page, providers: string) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript((value: string) => localStorage.setItem("longyu:qa-auth-providers", value), providers);
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const vp of VIEWPORTS) {
  test(`login offers Google / Apple / Microsoft + e-mail @${vp.width}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await seed(page, "google,apple,azure");
    await page.goto("/login");
    await waitForLazyPage(page);
    const social = page.getByTestId("social-auth");
    await expect(social).toBeVisible();
    await expect(page.getByTestId("auth-provider-google")).toContainText("Continuar com Google");
    await expect(page.getByTestId("auth-provider-apple")).toContainText("Continuar com Apple");
    await expect(page.getByTestId("auth-provider-microsoft")).toContainText("Continuar com Microsoft");
    await expect(page.getByTestId("auth-provider-microsoft")).toContainText("Outlook · Hotmail · Live");
    await expect(social).not.toContainText(/iCloud/i);
    // Icon + text, never icon-only.
    for (const id of ["google", "apple", "microsoft"]) {
      await expect(page.getByTestId(`auth-provider-${id}`).locator("svg")).toHaveCount(1);
    }
    // E-mail stays first-class.
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await noOverflow(page);
  });
}

test("no provider switched on → e-mail only, no dead buttons", async ({ page }) => {
  await seed(page, "");
  await page.goto("/login");
  await waitForLazyPage(page);
  await expect(page.getByTestId("social-auth")).toHaveCount(0);
  await expect(page.locator('input[name="identifier"]')).toBeVisible();
});

for (const vp of VIEWPORTS) {
  test(`cancelled OAuth returns a usable screen @${vp.width}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await seed(page, "google");
    await page.goto("/auth/callback?error=access_denied&error_code=user_cancelled");
    await waitForLazyPage(page);
    const card = page.getByTestId("oauth-error");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText("Acesso cancelado.");
    await expect(card.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Usar outro método" })).toBeVisible();
    await expect(card).not.toContainText(/OAuth|PKCE|HTTP|Supabase|exception/i);
    await noOverflow(page);
    await card.getByRole("button", { name: "Usar outro método" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
}

test("malformed callback never stays on 'Entrando…'", async ({ page }) => {
  await seed(page, "google");
  await page.goto("/auth/callback");
  await waitForLazyPage(page);
  await expect(page.getByTestId("oauth-error")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("oauth-working")).toHaveCount(0);
});

test("callback from a crafted URL never navigates off-app", async ({ page }) => {
  await seed(page, "google");
  await page.goto("/auth/callback?code=abcdefghijk&next=https://evil.example&redirectTo=https://evil.example");
  await waitForLazyPage(page);
  // The code is not a real one: the exchange fails → error card, still on our origin.
  await expect(page.getByTestId("oauth-error")).toBeVisible({ timeout: 30_000 });
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");
});
