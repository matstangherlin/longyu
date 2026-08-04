import { test, expect } from "@playwright/test";

test.describe("seo público", () => {
  test("landing expõe meta base e JSON-LD no HTML inicial", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    const html = await page.content();
    expect(html).toMatch(/rel="canonical"/i);
    expect(html).toMatch(/property="og:title"/i);
    expect(html).toMatch(/property="og:image"/i);
    expect(html).toMatch(/name="twitter:card"/i);
    expect(html).toMatch(/EducationalApplication/);
  });

  test("página pública de conteúdo tem título próprio", async ({ page }) => {
    await page.goto("/aprender-mandarim");
    await expect(page.getByRole("heading", { name: /Aprender mandarim online/i })).toBeVisible();
    await expect(page).toHaveTitle(/Aprender mandarim online/i);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /mandarim online/i);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /index/i);
  });

  test("rota privada recebe noindex", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
  });

  test("robots.txt e sitemap.xml estão publicados", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toMatch(/Sitemap:/i);
    expect(robotsText).toMatch(/Disallow:\s*\/jornada/);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain("aprender-mandarim");
  });

  test("og-image responde", async ({ request }) => {
    const res = await request.get("/og-image.png");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"] || "").toMatch(/image\/png/);
  });
});
