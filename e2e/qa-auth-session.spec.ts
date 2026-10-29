import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function fakeSession() {
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

async function stubSupabase(page: Page, token: (route: import("@playwright/test").Route) => Promise<void>) {
  await page.route(/supabase\.co\//, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const url = route.request().url();
    if (/\/auth\/v1\/token/.test(url)) {
      await token(route);
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

async function openLogin(page: Page) {
  await page.goto("/login");
  await waitForLazyPage(page);
  await expect(page.getByTestId("login-identifier")).toBeVisible();
}

async function markCloudAccount(page: Page) {
  await page.addInitScript(() => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: { currentAccountId?: string; accounts?: Record<string, { authMode?: string }> } };
    const state = parsed.state;
    const id = state?.currentAccountId;
    if (id && state?.accounts?.[id]) state.accounts[id].authMode = "cloud";
    localStorage.setItem("longyu-v1", JSON.stringify(parsed));
  });
}

test.describe("R-03 login @qa-r03", () => {
  test("senha errada mostra mensagem em pt-BR em menos de 3 s", async ({ page }) => {
    await stubSupabase(page, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        }),
      });
    });
    await openLogin(page);
    await page.getByTestId("login-identifier").fill("qa.free@longyu.app");
    await page.locator('input[name="password"]').fill("000000");
    const started = Date.now();
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    const alert = page.getByTestId("login-error");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/senha incorretos/i);
    expect(Date.now() - started).toBeLessThan(3_000);
    await expect(page.getByRole("button", { name: /Entrando/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Entrar$/ })).toBeEnabled();
    await page.screenshot({ path: "test-results/qa-r03-senha-errada.png", fullPage: true });
  });

  test("token lento devolve o botão e a mensagem de timeout", async ({ page }) => {
    test.setTimeout(40_000);
    await stubSupabase(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      if (route.request().isNavigationRequest()) return;
      await route.fulfill({ status: 504, contentType: "application/json", body: "{}" }).catch(() => undefined);
    });
    await openLogin(page);
    await page.getByTestId("login-identifier").fill("qa.free@longyu.app");
    await page.locator('input[name="password"]').fill("000000");
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    await expect(page.getByTestId("login-error")).toContainText(/demorou para responder/i, { timeout: 18_000 });
    await expect(page.getByTestId("login-try-again")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Entrar$/ })).toBeEnabled();
    await expect(page.getByRole("button", { name: /Entrando/i })).toHaveCount(0);
    await page.screenshot({ path: "test-results/qa-r03-timeout.png", fullPage: true });
  });

  test("depois do 200 do token a tela de login sai em menos de 2 s", async ({ page }) => {
    let tokenAt = 0;
    await stubSupabase(page, async (route) => {
      tokenAt = Date.now();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify(fakeSession()),
      });
    });
    await page.route(/supabase\.co\/rest\//, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" }).catch(() => undefined);
    });
    await openLogin(page);
    await page.getByTestId("login-identifier").fill("qa.free@longyu.app");
    await page.locator('input[name="password"]').fill("000000");
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 4_000 });
    expect(tokenAt).toBeGreaterThan(0);
    expect(Date.now() - tokenAt).toBeLessThan(2_000);
  });
});

test.describe("R-04 sessão @qa-r04", () => {
  test("/login com sessão vai para /jornada sem mostrar o formulário", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/login");
    await expect(page.getByTestId("login-identifier")).toHaveCount(0);
    await page.waitForURL(/\/jornada/, { timeout: 15_000 });
  });

  test("/comecar com sessão vai para /jornada", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/comecar");
    await expect(page.getByTestId("onboarding-path-beginner")).toHaveCount(0);
    await page.waitForURL(/\/jornada/, { timeout: 15_000 });
  });

  test("sair no primeiro clique mesmo com a nuvem travada", async ({ page }) => {
    test.setTimeout(30_000);
    await seedOnboardedSession(page, ["l1"]);
    await markCloudAccount(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.route(/supabase\.co\//, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      await route.abort().catch(() => undefined);
    });
    const started = Date.now();
    await page.getByTestId("topbar-sign-out").click();
    await expect(page.getByTestId("topbar-sign-out-confirm")).toBeVisible();
    await page.getByTestId("topbar-sign-out-confirm-yes").click();
    await page.waitForURL(/\/$/, { timeout: 12_000 });
    expect(Date.now() - started).toBeLessThan(12_000);
    await expect(page.getByTestId("topbar-sign-out")).toHaveCount(0);
  });

  test("sair pelo Mais no celular no primeiro clique @qa-r04", async ({ page }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedOnboardedSession(page, ["l1"]);
    await markCloudAccount(page);
    await page.goto("/mais");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.route(/supabase\.co\//, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      await route.abort().catch(() => undefined);
    });
    await expect(page.getByTestId("topbar-sign-out")).toBeHidden();
    await page.screenshot({ path: "test-results/qa-r04-mais-sair.png", fullPage: true });
    const started = Date.now();
    await page.getByTestId("more-sign-out").click();
    await page.getByTestId("more-sign-out-confirm-yes").click();
    await page.waitForURL(/\/$/, { timeout: 12_000 });
    expect(Date.now() - started).toBeLessThan(12_000);
  });
});
