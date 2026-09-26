import { expect, test, type Page } from "@playwright/test";
import { chooseCourseIfAsked, seedCourseDirection, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14 · J–P → RC2.2.17 — teste guiado V2: 7 micro-passos com o conteúdo da Lição 1,
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

test("landing → teste guiado V2 → aprende → meta diária, sem gravar progresso", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  // RC2.2.17 — áudio real exige início confirmado pelo motor: speechSynthesis controlado.
  await page.addInitScript(() => {
    class U {
      text = "";
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [],
        cancel() {},
        pause() {},
        resume() {},
        speak(u: U) {
          window.setTimeout(() => u.onstart?.(), 10);
          window.setTimeout(() => u.onend?.(), 60);
        },
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: typeof U }).SpeechSynthesisUtterance = U;
  });
  await seedTelemetryDeclined(page);
  await page.goto("/");
  await waitForLazyPage(page);
  const before = await storeSnapshot(page);

  await page.getByTestId("landing-guided-try").click();
  await chooseCourseIfAsked(page, "pt-zh");
  await expect(page).toHaveURL(/\/teste-guiado$/);
  const flow = page.getByTestId("guided-try");
  const action = page.locator("[data-guided-action]");

  // 1. Dragão abre. 2. Ouvir 你好 (Continuar só depois do áudio começar de verdade).
  await expect(flow).toHaveAttribute("data-guided-step", "intro");
  await expect(page.locator("[data-guided-progress]")).toHaveText("1/7");
  await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "listen");
  await expect(action).toBeDisabled();
  await page.locator("[data-guided-listen]").click();
  await expect(page.getByText("nǐ hǎo")).toBeVisible();
  await action.click();

  // 3. Explicação 你 + 好.
  await expect(flow).toHaveAttribute("data-guided-step", "explain");
  await action.click();

  // 4. Tom de 好 (contorno guiado).
  await expect(flow).toHaveAttribute("data-guided-step", "tone");
  await page.locator('[data-guided-option="tone-1"]').click();
  await expect(action).toBeDisabled();
  await page.locator('[data-guided-option="tone-3"]').click();
  await action.click();

  // 5. Significado: errar tem saída, acertar libera.
  await expect(flow).toHaveAttribute("data-guided-step", "meaning");
  await page.locator('[data-guided-option="thanks"]').click();
  await expect(page.locator('[data-guided-option="thanks"]')).toHaveAttribute("data-state", "wrong");
  await expect(action).toBeDisabled();
  await page.locator('[data-guided-option="hello"]').click();
  await expect(action).toBeEnabled();
  await action.click();

  // 6. Montar 好 = 女 + 子 (ordem errada dá dica, não trava).
  await expect(flow).toHaveAttribute("data-guided-step", "build");
  await page.locator('[data-guided-piece="子"]').click();
  await expect(page.getByText("Comece pela peça da esquerda")).toBeVisible();
  await page.locator('[data-guided-piece="女"]').click();
  await page.locator('[data-guided-piece="子"]').click();
  await expect(action).toBeEnabled();
  await action.click();

  // 7. Conversa com a Chen Mei.
  await expect(flow).toHaveAttribute("data-guided-step", "conversation");
  await page.locator('[data-guided-option="reply-nihao"]').click();
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

  // RC2.2.17 · AT — o fim leva à meta diária (o rascunho sabe que o teste terminou).
  await page.locator("[data-guided-create-account]").click();
  await expect(page).toHaveURL(/\/comecar/);
  await expect(page.getByTestId("daily-goal-step")).toBeVisible();
});

test("sair do teste volta para o início", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await seedTelemetryDeclined(page);
  await seedCourseDirection(page, "pt-zh");
  await page.goto("/teste-guiado");
  await waitForLazyPage(page);
  await page.getByRole("button", { name: "Sair do teste" }).click();
  await expect(page).toHaveURL(/\/$/);
});
