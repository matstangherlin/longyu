import { test, expect } from "@playwright/test";
import { seedInterfaceLocale, seedOnboardedSession, switchInterfaceLocaleInSettings, waitForLazyPage } from "./helpers";

test.describe("i18n shell — V4.8.0", () => {
  test("Portuguese shell smoke (default locale)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Começar agora/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Já tenho uma conta/i })).toBeVisible();
    await expect(page.locator("[data-hanzi='你好']")).toBeVisible();
  });

  test("English marketing shell smoke", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-interface-locale", "en");
    await expect(page.getByRole("heading", { name: /Learn Mandarin/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Get started/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /I already have an account/i })).toBeVisible();
    await expect(page.locator("[data-hanzi='你好']")).toBeVisible();
    await expect(page.getByText(/nǐ hǎo/)).toBeVisible();
    await expect(page.getByText(/hello/i).first()).toBeVisible();
  });

  test("language switcher persists without wiping the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: /Get started/i }).first()).toBeVisible();
    await expect(page.locator("[data-hanzi='你好']")).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: /Get started/i }).first()).toBeVisible();
    await expect(page.locator("[data-hanzi='你好']")).toBeVisible();
  });

  test("auth screen EN", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot password/i })).toBeVisible();
    await expect(page.getByText(/Entrar na conta/)).toHaveCount(0);
  });

  test("Journey shell EN keeps Mandarin target", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("navigation", { name: /Main/i }).first()).toBeVisible();
    await expect(page.getByText("Journey", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue|Start the first lesson/i }).first()).toBeVisible();

    await page.goto("/ajustes");
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
    // RC2.2.14B — idioma e curso numa seção só; o alvo aparece no curso.
    await expect(page.getByText(/Language and course/i)).toBeVisible();
    await expect(page.getByText("Theme", { exact: true })).toBeVisible();
    await expect(page.getByText(/How to see Mandarin/i)).toBeVisible();
    await expect(page.getByText(/Privacy and data/i)).toBeVisible();
    await expect(page.getByText(/Como ver o mandarim/)).toHaveCount(0);
    const course = page.locator("[data-course-direction-value]");
    await expect(course).toContainText("→ Mandarin");
    await expect(course).not.toContainText("Mandarim");
  });

  test("Practice hub EN keeps Mandarin target", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/treino");
    await waitForLazyPage(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: /^Practice$/i }).first()).toBeVisible();
    await expect(page.getByText(/Review, sound, speaking/i).first()).toBeVisible();
    await expect(page.getByText(/^Praticar$/)).toHaveCount(0);
  });

  test("About and Privacy chrome EN", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await page.goto("/sobre");
    await waitForLazyPage(page);
    await expect(page).toHaveTitle(/About Longyu/i);
    await expect(page.getByRole("heading", { name: /About Longyu/i }).first()).toBeVisible();
    await expect(page.getByText(/Found a bug or have a suggestion/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Send feedback/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Sobre o Longyu$/ })).toHaveCount(0);

    await page.goto("/privacidade");
    await waitForLazyPage(page);
    await expect(page).toHaveTitle(/Privacy/i);
    await expect(page.getByRole("heading", { name: /Privacy and data/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open settings/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Privacidade e dados/ })).toHaveCount(0);
  });

  test("locale switch does not change canonical hanzi", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    // RC2.2.14B — o alvo aparece no curso ("… → Mandarim"); sem cartão redundante.
    const course = page.locator("[data-course-direction-value]");
    await expect(course).toHaveText("Português → Mandarim");

    await switchInterfaceLocaleInSettings(page, "en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // Trocar a interface não troca o curso; só o rótulo segue a interface.
    await expect(course).toHaveAttribute("data-course-direction-value", "pt-zh");
    await expect(course).toHaveText("Portuguese → Mandarin");

    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.getByText("Journey", { exact: true }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
