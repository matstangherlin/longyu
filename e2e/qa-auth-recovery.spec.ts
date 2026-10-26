import { expect, test, type Page, type Route } from "@playwright/test";
import { waitForLazyPage } from "./helpers";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
};

function sessionBody() {
  return {
    access_token: "e30.e30.e2e",
    refresh_token: "e2e-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      aud: "authenticated",
      role: "authenticated",
      email: "qa.free@longyu.app",
      email_confirmed_at: "2026-01-01T00:00:00.000Z",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  };
}

async function stubSupabase(page: Page) {
  await page.route(/supabase\.co\//, async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const url = route.request().url();
    if (/\/auth\/v1\/verify/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify(sessionBody()),
      });
      return;
    }
    if (/\/auth\/v1\/user/.test(url) && route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify(sessionBody().user),
      });
      return;
    }
    if (/\/auth\/v1\/logout/.test(url)) {
      await route.fulfill({ status: 204, headers: CORS, body: "" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS,
      body: "{}",
    });
  });
}

test("R-02 link expirado não abre o formulário de senha @qa-r02", async ({ page }) => {
  await stubSupabase(page);
  await page.goto(
    "/redefinir-senha?email=qa.free@longyu.app#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
  );
  await waitForLazyPage(page);
  const expired = page.getByTestId("auth-link-expired");
  await expect(expired).toBeVisible();
  await expect(expired).toContainText("Este link expirou ou já foi usado.");
  await expect(page.locator('input[name="new-password"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/qa-r02-link-expirado.png", fullPage: true });
  await page.getByTestId("auth-link-expired-action").click();
  await expect(page).toHaveURL(/\/esqueci-senha\?email=qa\.free%40longyu\.app/);
  await expect(page.getByTestId("recovery-email")).toHaveValue("qa.free@longyu.app");
});

test("R-02 código simulado chega na nova senha @qa-r02", async ({ page }) => {
  await stubSupabase(page);
  await page.goto("/esqueci-senha");
  await waitForLazyPage(page);
  await page.getByTestId("recovery-email").fill("qa.free@longyu.app");
  await page.getByTestId("recovery-send").click();
  await expect(page.getByTestId("recovery-code-lead")).toContainText("6 dígitos");
  await page.getByTestId("recovery-code").fill("123456");
  await page.getByTestId("recovery-verify").click();
  await expect(page.getByTestId("recovery-new-password")).toBeVisible();
  await page.getByTestId("recovery-new-password").fill("000000");
  await page.getByTestId("recovery-confirm-password").fill("000000");
  await page.getByTestId("recovery-save").click();
  await expect(page.getByTestId("recovery-done")).toBeVisible();
});

test("R-02 confirmação com link expirado mostra o erro @qa-r02", async ({ page }) => {
  await stubSupabase(page);
  await page.goto("/confirmar-email#error=access_denied&error_code=otp_expired");
  await waitForLazyPage(page);
  await expect(page.getByTestId("auth-link-expired")).toContainText("Este link expirou ou já foi usado.");
  await expect(page.getByText("Quase lá")).toHaveCount(0);
  await expect(page.getByTestId("auth-link-expired-action")).toBeVisible();
});
