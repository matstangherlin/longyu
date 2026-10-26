import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, waitForLazyPage } from "./helpers";

test("R-17 comparação de áudio conclui sem custo e mostra o contraste @qa-r17", async ({ page }) => {
  await page.goto("/qa/audio-discrimination");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const task = page.locator("[data-audio-discrimination]");
  await expect(task).toBeVisible();
  await expect(task.locator(".hanzi:visible")).toHaveCount(0);

  await task.getByTestId("listen-cannot-now").click();
  const visual = task.getByTestId("listen-visual-contrast");
  await expect(visual).toBeVisible();
  await expect(visual).toContainText("mā");
  await expect(visual).toContainText("má");
  await expect(task.getByRole("heading", { name: "São iguais?" })).toBeVisible();

  await task.getByRole("button", { name: "Iguais" }).click();
  await task.getByRole("button", { name: /^Verificar$|^Confirmar$|^Conferir$/ }).click();
  await expect(task.getByText("Eram diferentes: mā (1º tom) × má (2º tom).")).toBeVisible();
  await page.screenshot({ path: "test-results/qa-r17-contraste.png", fullPage: true });

  await task.getByTestId("listen-unevaluated-continue").click();
  await expect(page.locator("[data-qa-audio-complete]")).toBeVisible();
});
