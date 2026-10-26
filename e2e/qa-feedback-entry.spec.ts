import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, seedOnboardedSession, waitForLazyPage } from "./helpers";

async function stubSupabase(page: Page) {
  await page.route(/supabase\.co\//, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ message: "offline" }),
    });
  });
}

async function openFromShell(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole("button", { name: "Mais" }).click();
    await page.getByTestId("report-problem").click();
    return;
  }
  await page.locator("[data-desktop-feedback-fab]").click();
}

test("Reportar problema abre em até dois toques @qa-feedback", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile-chrome";
  await stubSupabase(page);
  await seedOnboardedSession(page, ["l1", "l2"]);

  for (const route of ["/jornada", "/revisao", "/conta"]) {
    await page.goto(route);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await openFromShell(page, mobile);
    await expect(page.getByTestId("feedback-technical")).toBeVisible();
    await expect(page.getByTestId("feedback-technical")).toContainText(route);
    if (route === "/jornada") {
      await page.screenshot({ path: "test-results/qa-feedback-jornada.png", fullPage: true });
    }
    await page.getByRole("button", { name: "Fechar" }).click();
  }

  await seedLessonPlayerReady(page, "l2");
  await page.goto("/licao/l2/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await page.getByTestId("lesson-report-problem").click();
  await expect(page.getByTestId("feedback-technical")).toContainText("/licao/l2/player");
  await page.getByRole("button", { name: "Fechar" }).click();

  await page.goto("/rota-que-nao-existe");
  await waitForLazyPage(page);
  await page.getByTestId("report-problem").click();
  await expect(page.getByTestId("feedback-technical")).toBeVisible();
});
