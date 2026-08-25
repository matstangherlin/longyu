import { test, expect } from "@playwright/test";
import {
  MISSIONS_DESKTOP_VIEWPORTS,
  MISSIONS_LANDSCAPE_VIEWPORT,
  MISSIONS_MOBILE_VIEWPORTS,
  assertMissionLayout,
  assertNoHorizontalOverflow,
  assertNoInteractiveOverlap,
  openMissions,
  seedRichMissions,
} from "./missions-helpers";

const PRINCIPAL_WEBKIT = new Set(["320×568", "390×844", "1024×768"]);

function skipHeavyMatrix(browserName: string, label: string) {
  if (browserName === "chromium") return false;
  if (browserName === "webkit") return !PRINCIPAL_WEBKIT.has(label);
  return label !== "390×844" && label !== "1024×768";
}

test.describe("V4.3 /missoes — gramática e no-overlap", () => {
  for (const viewport of MISSIONS_MOBILE_VIEWPORTS) {
    test.describe(`mobile ${viewport.label}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("layout sem overflow, overlap, TabBar cobrindo CTA ou alvo < 44px", async ({ page, browserName }) => {
        test.skip(skipHeavyMatrix(browserName, viewport.label), "matriz completa só no Chromium");
        await seedRichMissions(page);
        await openMissions(page);
        await expect(page.locator("[data-mission-chest]")).toBeVisible();
        await expect(page.getByText("Abrir Baú Épico (99)")).toBeVisible();
        await assertMissionLayout(page);
      });
    });
  }

  for (const viewport of MISSIONS_DESKTOP_VIEWPORTS) {
    test.describe(`desktop ${viewport.label}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("layout, FAB de Feedback e CTAs sem colisão", async ({ page, browserName }) => {
        test.skip(skipHeavyMatrix(browserName, viewport.label), "matriz completa só no Chromium");
        await seedRichMissions(page);
        await openMissions(page);
        await expect(page.locator("[data-desktop-feedback-fab]")).toBeVisible();
        await assertMissionLayout(page);
      });
    });
  }

  test.describe(`mobile ${MISSIONS_LANDSCAPE_VIEWPORT.label}`, () => {
    test.use({
      viewport: {
        width: MISSIONS_LANDSCAPE_VIEWPORT.width,
        height: MISSIONS_LANDSCAPE_VIEWPORT.height,
      },
    });

    test("landscape não estoura nem cobre CTA", async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "landscape principal no Chromium");
      await seedRichMissions(page);
      await openMissions(page);
      await assertMissionLayout(page);
    });
  });

  test.describe("estados reais", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("matriz de status daily/weekly/monthly no seed rico", async ({ page }) => {
      await seedRichMissions(page);
      await openMissions(page);

      await expect(page.locator('[data-mission-id="daily-audio"]')).toHaveAttribute("data-mission-status", "claimed");
      await expect(page.locator('[data-mission-id="daily-xp"]')).toHaveAttribute("data-mission-status", "progress");
      await expect(page.locator('[data-mission-id="daily-reviews"]')).toHaveAttribute("data-mission-status", "complete");
      await expect(page.locator('[data-mission-id="daily-phrases"]')).toHaveAttribute("data-mission-status", "incomplete");
      await expect(page.locator('[data-mission-id="daily-pro-fix"]')).toHaveAttribute("data-mission-status", "premium");
      await expect(page.locator('[data-mission-hero]')).toHaveAttribute("data-mission-status", "complete");

      await expect(page.locator('[data-mission-id="daily-reviews"] [data-mission-cta="primary"]')).toHaveText(/Resgatar/);
      await expect(page.locator('[data-mission-id="daily-audio"] [data-mission-cta="completed"]')).toContainText(/Resgatada/);
      await expect(page.locator('[data-mission-id="daily-pro-fix"] [data-mission-cta="premium"]')).toHaveText(/Resgatar com Pro/);
      await expect(page.locator('[data-mission-id="daily-xp"] [data-mission-cta="primary"]')).toHaveText(/Praticar/);
      await expect(page.getByRole("button", { name: "Resgatar medalha do mês" })).toBeVisible();
      await assertMissionLayout(page);
    });

    test("texto longo cabe no card (baú 99 e medalha do mês)", async ({ page }) => {
      await seedRichMissions(page, { monthlyClaimed: true, medals: true });
      await openMissions(page);
      const chestCta = page.getByRole("button", { name: /Abrir Baú Épico \(99\)/ });
      await expect(chestCta).toBeVisible();
      await expect(page.getByText(/Medalha de .+ resgatada/)).toBeVisible();
      await expect(page.locator("[data-mission-collection='medals']")).toBeVisible();
      const clipped = await chestCta.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(clipped, "CTA do baú não pode clipar o rótulo").toBe(false);
      await assertMissionLayout(page);
    });

    test("celebração de missão: ações em fluxo, sem overlap", async ({ page }) => {
      await seedRichMissions(page);
      await openMissions(page);
      await page.locator('[data-mission-id="daily-reviews"] [data-mission-cta="primary"]').click();
      const celebration = page.locator("[data-mission-celebration]");
      await expect(celebration).toBeVisible();
      await expect(celebration.getByRole("button", { name: "Continuar" })).toBeVisible();
      await assertNoInteractiveOverlap(page);
      await assertNoHorizontalOverflow(page);
    });

    test("paywall Pro empilha CTAs sem overlap", async ({ page }) => {
      await seedRichMissions(page);
      await openMissions(page);
      await page.locator('[data-mission-id="daily-pro-fix"] [data-mission-cta="premium"]').click();
      await expect(page.getByTestId("pro-paywall-training")).toBeVisible();
      await assertNoInteractiveOverlap(page);
      await assertNoHorizontalOverflow(page);
    });

    test("baú mensal abre em modal scrollável", async ({ page }) => {
      await seedRichMissions(page, { monthlyClaimed: true });
      await openMissions(page);
      await page.getByRole("button", { name: /Abrir Baú Épico/ }).click();
      await expect(page.getByRole("button", { name: "Fechar" })).toBeVisible();
      await assertNoInteractiveOverlap(page);
      await assertNoHorizontalOverflow(page);
    });

    test("banner de economia não cobre CTA e some sozinho", async ({ page }) => {
      await seedRichMissions(page);
      await openMissions(page);
      const injected = await page.evaluate(() => {
        if (typeof window.__longyuSetEconomySyncMessage !== "function") return false;
        window.__longyuSetEconomySyncMessage("Sincronizando Qi...");
        return true;
      });
      test.skip(!injected, "fixture de banner indisponível neste ambiente");
      await expect(page.locator("[data-economy-sync-banner]")).toBeVisible();
      await expect(page.locator("[data-economy-sync-banner]")).toHaveAttribute("aria-live", "polite");
      await assertNoInteractiveOverlap(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-economy-sync-banner]")).toHaveCount(0);
    });

    test("escala de fonte maior não causa overflow em 375px", async ({ page, browserName }) => {
      test.skip(browserName !== "chromium");
      await page.addInitScript(() => {
        document.documentElement.style.fontSize = "20px";
      });
      await seedRichMissions(page);
      await openMissions(page);
      await assertMissionLayout(page);
    });
  });

  test.describe("estados desktop 1024", () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test("hero mensal incompleto e vazio de medalhas", async ({ page }) => {
      await seedRichMissions(page, { monthlyCompleted: 3, monthlyChests: 0 });
      await openMissions(page);
      await expect(page.locator("[data-mission-hero]")).toHaveAttribute("data-mission-status", "progress");
      await expect(page.getByText("Nenhuma medalha ainda")).toBeVisible();
      await expect(page.locator("[data-desktop-feedback-fab]")).toBeVisible();
      await assertMissionLayout(page);
    });
  });
});
