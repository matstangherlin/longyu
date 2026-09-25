import { expect, test, type Page } from "@playwright/test";
import { seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14 · J–P — teste guiado: 5 micro-passos com o conteúdo da Lição 1,
 * erro tem saída, fim mostra "O que você acabou de aprender" e leva a criar
 * conta. NADA é persistido (sem aluno, XP, conclusão, ofensiva, SRS).
 */

async function storeSnapshot(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return null;
    const state = (JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {};
    return {
      accounts: Object.keys((state.accounts as Record<string, unknown>) ?? {}).length,
      completedLessons: ((state.completedLessons as unknown[]) ?? []).length,
      xpTotal: Number(state.xpTotal ?? 0),
      points: Number(state.points ?? 0),
      streak: Number(state.streak ?? 0),
      srs: Object.keys((state.srs as Record<string, unknown>) ?? {}).length,
      accountSetupComplete: Boolean(state.accountSetupComplete),
    };
  });
}

test("landing → teste guiado → aprende → criar conta, sem gravar progresso", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedTelemetryDeclined(page);
  await page.goto("/");
  await waitForLazyPage(page);
  const before = await storeSnapshot(page);

  await page.getByTestId("landing-guided-try").click();
  await expect(page).toHaveURL(/\/teste-guiado$/);
  const flow = page.getByTestId("guided-try");
  const action = page.locator("[data-guided-action]");

  // 1. Ouvir 你好 (o Continuar só libera depois de ouvir).
  await expect(flow).toHaveAttribute("data-guided-step", "listen");
  await expect(page.locator("[data-guided-progress]")).toHaveText("1/5");
  await expect(action).toBeDisabled();
  await page.locator("[data-guided-listen]").click();
  await expect(page.getByText("nǐ hǎo")).toBeVisible();
  await action.click();

  // 2. Explicação 你 + 好.
  await expect(flow).toHaveAttribute("data-guided-step", "explain");
  await action.click();

  // 3. Pergunta: errar tem saída, acertar libera.
  await expect(flow).toHaveAttribute("data-guided-step", "meaning");
  await page.locator('[data-guided-option="thanks"]').click();
  await expect(page.locator('[data-guided-option="thanks"]')).toHaveAttribute("data-state", "wrong");
  await expect(action).toBeDisabled();
  await page.locator('[data-guided-option="hello"]').click();
  await expect(action).toBeEnabled();
  await action.click();

  // 4. Pinyin/tons.
  await expect(flow).toHaveAttribute("data-guided-step", "tones");
  await page.locator('[data-guided-option="hao"]').click();
  await action.click();

  // 5. Montar 好 = 女 + 子 (ordem errada dá dica, não trava).
  await expect(flow).toHaveAttribute("data-guided-step", "build");
  await page.locator('[data-guided-piece="子"]').click();
  await expect(page.getByText("Comece pela peça da esquerda")).toBeVisible();
  await page.locator('[data-guided-piece="女"]').click();
  await page.locator('[data-guided-piece="子"]').click();
  await expect(action).toBeEnabled();
  await action.click();

  await expect(page.getByTestId("guided-try-done")).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que você acabou de aprender" })).toBeVisible();
  await expect(page.getByText("你好 (nǐ hǎo) = olá")).toBeVisible();
  await page.screenshot({ path: "test-results/rc2-2-14/guided-try-done-390x844.png" });

  // Nada persistido: sem aluno, sem conclusão, sem XP/Qi/ofensiva/SRS.
  const after = await storeSnapshot(page);
  if (after) {
    expect(after.accounts).toBe(before?.accounts ?? 0);
    expect(after.completedLessons).toBe(0);
    expect(after.xpTotal).toBe(before?.xpTotal ?? 0);
    expect(after.points).toBe(before?.points ?? after.points);
    expect(after.streak).toBe(0);
    expect(after.srs).toBe(before?.srs ?? 0);
    expect(after.accountSetupComplete).toBe(false);
  }

  await page.locator("[data-guided-create-account]").click();
  await expect(page).toHaveURL(/\/comecar/);
});

test("sair do teste volta para o início", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await seedTelemetryDeclined(page);
  await page.goto("/teste-guiado");
  await waitForLazyPage(page);
  await page.getByRole("button", { name: "Sair do teste" }).click();
  await expect(page).toHaveURL(/\/$/);
});
