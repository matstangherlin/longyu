import { expect, test, type Page, type Route } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
};

async function seedAna(page: Page) {
  await seedOnboardedSession(page, ["l1"], { replace: false });
  await page.addInitScript(() => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: {
        currentAccountId?: string;
        accounts?: Record<string, { id?: string; name?: string; authMode?: string }>;
      };
    };
    const state = parsed.state;
    if (!state || state.currentAccountId === "cloud:uid-ana") return;
    const previousId = state.currentAccountId ?? "local";
    const previous = state.accounts?.[previousId] ?? { name: "Ana Free", authMode: "local" };
    const id = "cloud:uid-ana";
    state.currentAccountId = id;
    state.accounts = {
      ...(state.accounts ?? {}),
      [id]: { ...previous, id, name: "Ana Free", authMode: "cloud" },
    };
    localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    localStorage.setItem(
      "sb-drjcfalvlbbeblmmyhwj-auth-token",
      JSON.stringify({
        access_token: "e30.e30.e2e",
        refresh_token: "e2e-refresh",
        expires_at: 4_000_000_000,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "uid-ana",
          aud: "authenticated",
          role: "authenticated",
          email: "qa.free@longyu.app",
          app_metadata: {},
          user_metadata: {},
        },
      })
    );
  });
}

async function stubProfiles(page: Page, patch: (route: Route) => Promise<void>) {
  await page.route(/supabase\.co\//, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const url = route.request().url();
    if (/\/rest\/v1\/profiles/.test(url) && route.request().method() === "PATCH") {
      await patch(route);
      return;
    }
    if (/\/auth\/v1\/user/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify({
          id: "uid-ana",
          aud: "authenticated",
          role: "authenticated",
          email: "qa.free@longyu.app",
          app_metadata: {},
          user_metadata: {},
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "{}" });
  });
}

test.describe("R-06 perfil @qa-r06", () => {
  test("o nome salvo continua depois de recarregar", async ({ page }) => {
    await seedAna(page);
    await stubProfiles(page, async (route) => {
      await route.fulfill({ status: 204, headers: CORS, body: "" });
    });
    await page.goto("/conta");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("conta-name")).toHaveText("Ana Free");
    await expect(page.getByText("Aluno local")).toHaveCount(0);
    await page.getByTestId("display-name-input").fill("Bruno Pro");
    await page.getByTestId("display-name-form").getByRole("button", { name: /^Salvar$/ }).click();
    await expect(page.getByTestId("display-name-saved")).toHaveText(/Nome salvo/i);
    await expect(page.getByTestId("conta-name")).toHaveText("Bruno Pro");
    await page.screenshot({ path: "test-results/qa-r06-nome-salvo.png", fullPage: true });
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("conta-name")).toHaveText("Bruno Pro");
  });

  test("42703 no perfil mantém o nome anterior e o chip não fica em Salvando", async ({ page }) => {
    await seedAna(page);
    await stubProfiles(page, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify({
          code: "42703",
          message: "column profiles.instruction_locale does not exist",
        }),
      });
    });
    await page.goto("/conta");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByTestId("display-name-input").fill("Bruno Pro");
    await page.getByTestId("display-name-form").getByRole("button", { name: /^Salvar$/ }).click();
    await expect(page.getByTestId("display-name-error")).toContainText(/Não foi possível salvar/i);
    await expect(page.getByTestId("conta-name")).toHaveText("Ana Free");
    const chip = page.getByTestId("sync-status-chip");
    await expect(chip).toHaveAttribute("data-sync-state", "problem");
    await expect(chip).toContainText(/Tentar de novo/i);
    await expect(page.getByText("Salvando…")).toHaveCount(0);
    await page.screenshot({ path: "test-results/qa-r06-schema-erro.png", fullPage: true });
  });

  test("@apelido em uso mostra o erro", async ({ page }) => {
    await seedAna(page);
    await page.route(/supabase\.co\//, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS });
        return;
      }
      const url = route.request().url();
      if (/\/rest\/v1\/profiles/.test(url) && route.request().method() === "PATCH") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          headers: CORS,
          body: JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint" }),
        });
        return;
      }
      if (/\/auth\/v1\/user/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: CORS,
          body: JSON.stringify({
          id: "uid-ana",
          aud: "authenticated",
          role: "authenticated",
          email: "qa.free@longyu.app",
          app_metadata: {},
          user_metadata: {},
        }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS,
        body: JSON.stringify({ username: null, show_in_search: true }),
      });
    });
    await page.goto("/config/conta");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.locator("#social-username").fill("ana_free");
    await page.locator("#social-username").locator("..").getByRole("button", { name: /^Salvar$/ }).click();
    await expect(page.getByTestId("username-save-notice")).toContainText(/já está em uso/i);
  });
});
