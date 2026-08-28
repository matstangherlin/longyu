import { test, expect } from "@playwright/test";
import { seedInterfaceLocale, seedOnboardedSession, waitForLazyPage } from "./helpers";

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
    await expect(page.getByText(/I am learning Mandarin/i)).toBeVisible();
    await expect(page.getByText("Theme", { exact: true })).toBeVisible();
    await expect(page.getByText(/How to see Mandarin/i)).toBeVisible();
    await expect(page.getByText(/Privacy and data/i)).toBeVisible();
    await expect(page.getByText(/Como ver o mandarim/)).toHaveCount(0);
    await expect(page.getByTestId("target-language-card")).toContainText("zh-CN");
    await expect(page.getByTestId("target-language-card")).toContainText("中文");
    await expect(page.getByTestId("target-language-card")).toContainText("Mandarin");
    await expect(page.getByTestId("target-language-card")).not.toContainText("Mandarim");
  });

  test("locale switch does not change canonical hanzi", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/ajustes");
    await waitForLazyPage(page);
    const target = page.getByTestId("target-language-card");
    await expect(target).toContainText("zh-CN");
    await expect(target).toContainText("中文");

    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText(/I am learning Mandarin/i)).toBeVisible();
    await expect(target).toContainText("zh-CN");
    await expect(target).toContainText("中文");
    await expect(target).toContainText("Mandarin");
    await expect(target).not.toContainText("Mandarim");

    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.getByText("Journey", { exact: true }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
