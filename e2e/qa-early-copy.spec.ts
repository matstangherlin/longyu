import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedUnlockedLessonSession, waitForLazyPage } from "./helpers";

test("LGY-022 a apresentação não usa Matheus nem você no lugar do nome @qa-r16", async ({ page }) => {
  await seedUnlockedLessonSession(page, "l9");
  await page.addInitScript(() => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: { currentAccountId?: string; accounts?: Record<string, { name?: string }> };
    };
    const state = parsed.state;
    const id = state?.currentAccountId;
    const account = id ? state?.accounts?.[id] : undefined;
    if (account) account.name = "Aluno local";
    localStorage.setItem("longyu-v1", JSON.stringify(parsed));
  });
  await page.goto("/licao/l9/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);

  const ask = page.getByTestId("lesson-ask-name");
  const lucas = page.getByText("Lucas", { exact: false });
  await expect(ask.or(lucas).first()).toBeVisible({ timeout: 20_000 });
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/Matheus/);
  expect(body).not.toMatch(/meu nome é você/i);
  await page.screenshot({ path: "test-results/qa-r16-nome.png", fullPage: true });
});
