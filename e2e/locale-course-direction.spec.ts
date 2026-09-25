import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedInstructionLocale, seedOnboardedSession, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14B — idioma da interface automático, curso escolhido explicitamente.
 *
 * A interface segue o idioma do sistema (o `locale` do navegador simula o do
 * aparelho). O curso (idioma das explicações) é sempre uma escolha: há
 * recomendação quando o sistema corresponde, nunca seleção silenciosa.
 */

async function freshLanding(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedTelemetryDeclined(page);
  await page.goto("/");
  await waitForLazyPage(page);
}

async function storeState(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const state = raw ? ((JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {}) : {};
    return {
      courseDirection: state.courseDirection ?? null,
      completedLessons: ((state.completedLessons as unknown[]) ?? []).length,
      xpTotal: Number(state.xpTotal ?? 0),
      srs: Object.keys((state.srs as Record<string, unknown>) ?? {}).length,
      pending: localStorage.getItem("longyu:course-direction-pending"),
      instruction: localStorage.getItem("longyu:instruction-locale"),
    };
  });
}

test.describe("PT device", () => {
  test.use({ locale: "pt-BR" });

  test("interface PT → escolher curso → Português → Mandarim → teste guiado", async ({ page }) => {
    await freshLanding(page);
    await expect(page.getByTestId("landing-guided-try")).toHaveText("Fazer teste guiado · 2 min");
    // Sem seletor de idioma na landing do celular.
    await expect(page.locator("select, [data-testid='landing-locale-button']")).toHaveCount(0);
    await page.getByTestId("landing-guided-try").click();
    await expect(page).toHaveURL(/\/curso\?next=/);
    await expect(page.getByRole("heading", { name: "Como você quer aprender mandarim?" })).toBeVisible();
    // Recomendação pelo sistema, sem seleção silenciosa.
    await expect(page.locator('[data-course-choice="pt-zh"]')).toHaveAttribute("data-recommended", "true");
    await expect(page.locator('[data-course-choice="pt-zh"]')).toHaveAttribute("aria-checked", "false");
    await expect(page.getByTestId("course-picker-confirm")).toBeDisabled();
    await expect(page.locator('[data-course-choice="en-zh"]')).toContainText("Inglês → Mandarim");
    // Cabe na tela: título + 2 cartões + ação.
    const confirmBox = await page.getByTestId("course-picker-confirm").boundingBox();
    expect(confirmBox!.y + confirmBox!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: "test-results/rc2-2-14b/course-picker-pt-390x844.png" });
    await page.locator('[data-course-choice="pt-zh"]').click();
    await page.getByTestId("course-picker-confirm").click();
    await expect(page).toHaveURL(/\/teste-guiado$/);
    await expect(page.getByRole("heading", { name: "Ouça sua primeira frase" })).toBeVisible();
    const state = await storeState(page);
    expect(state.pending).toBe("pt-zh");
    expect(state.instruction).toBe("pt-BR");
  });

  test("o picker não reaparece: a segunda vez vai direto ao teste guiado", async ({ page }) => {
    await freshLanding(page);
    await page.getByTestId("landing-guided-try").click();
    await page.locator('[data-course-choice="pt-zh"]').click();
    await page.getByTestId("course-picker-confirm").click();
    await page.goto("/");
    await waitForLazyPage(page);
    await page.getByTestId("landing-guided-try").click();
    await expect(page).toHaveURL(/\/teste-guiado$/);
  });

  test("teste guiado sem curso redireciona para a escolha", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTelemetryDeclined(page);
    await page.goto("/teste-guiado");
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/curso\?next=%2Fteste-guiado/);
  });

  test("interface PT + curso English → Mandarin: menus PT, ensino EN", async ({ page }) => {
    await freshLanding(page);
    await page.getByTestId("landing-guided-try").click();
    await page.locator('[data-course-choice="en-zh"]').click();
    await page.getByTestId("course-picker-confirm").click();
    await expect(page.getByRole("heading", { name: "Hear your first phrase" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair do teste" })).toBeVisible();
    await expect(page.locator("[data-guided-action]")).toHaveText("Continuar");
  });

  test("pt-PT também abre em português", async ({ browser }) => {
    const context = await browser.newContext({ locale: "pt-PT" });
    const page = await context.newPage();
    await freshLanding(page);
    await expect(page.getByTestId("landing-guided-try")).toHaveText("Fazer teste guiado · 2 min");
    await context.close();
  });
});

test.describe("EN device", () => {
  test.use({ locale: "en-US" });

  test("interface EN → curso English → Mandarin recomendado → teste guiado", async ({ page }) => {
    await freshLanding(page);
    await expect(page.getByTestId("landing-guided-try")).toHaveText(/guided try/i);
    await page.getByTestId("landing-guided-try").click();
    await expect(page.getByRole("heading", { name: "How do you want to learn Mandarin?" })).toBeVisible();
    await expect(page.locator('[data-course-choice="en-zh"]')).toHaveAttribute("data-recommended", "true");
    await expect(page.locator('[data-course-choice="pt-zh"]')).toHaveAttribute("data-recommended", "false");
    await page.screenshot({ path: "test-results/rc2-2-14b/course-picker-en-390x844.png" });
    await page.locator('[data-course-choice="en-zh"]').click();
    await page.getByTestId("course-picker-confirm").click();
    await expect(page.getByRole("heading", { name: "Hear your first phrase" })).toBeVisible();
  });

  test("en-GB → interface EN", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-GB" });
    const page = await context.newPage();
    await freshLanding(page);
    await expect(page.getByTestId("landing-guided-try")).toHaveText(/guided try/i);
    await context.close();
  });
});

test.describe("Unsupported device language", () => {
  test.use({ locale: "es-ES" });

  test("es-ES → interface EN, nenhum curso recomendado", async ({ page }) => {
    await freshLanding(page);
    await expect(page.getByTestId("landing-guided-try")).toHaveText(/guided try/i);
    await page.getByTestId("landing-guided-try").click();
    await expect(page.locator('[data-recommended="true"]')).toHaveCount(0);
    await expect(page.getByTestId("course-picker-confirm")).toBeDisabled();
  });
});

test.describe("Override and system mode", () => {
  test("escolha manual sobrevive ao reinício; 'Usar idioma do sistema' volta a acompanhar", async ({ browser }) => {
    const ptContext = await browser.newContext({ locale: "pt-BR", viewport: { width: 390, height: 844 } });
    const page = await ptContext.newPage();
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByTestId("settings-interface-locale-row").click();
    await expect(page.locator("[data-locale-detected]")).toHaveText("Detectado: Português (Brasil)");
    await page.locator('[data-locale-choice="en"]').click();
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.getByTestId("settings-interface-locale-row")).toContainText("App language");
    const storage = await ptContext.storageState();
    await ptContext.close();

    // Mesmo aparelho, sistema agora em inglês: override manual (EN) mantido.
    // Voltar para "sistema" num aparelho em PT faz a interface acompanhar.
    const again = await browser.newContext({ locale: "pt-BR", viewport: { width: 390, height: 844 }, storageState: storage });
    const page2 = await again.newPage();
    await page2.goto("/config/aprendizagem");
    await waitForLazyPage(page2);
    await dismissBlockingOverlays(page2);
    await expect(page2.getByTestId("settings-interface-locale-row")).toContainText("App language");
    await page2.getByTestId("settings-interface-locale-row").click();
    await page2.locator('[data-locale-choice="system"]').click();
    await expect(page2.getByTestId("settings-interface-locale-row")).toContainText("Idioma do aplicativo");
    const systemStorage = await again.storageState();
    await again.close();

    const enDevice = await browser.newContext({ locale: "en-US", viewport: { width: 390, height: 844 }, storageState: systemStorage });
    const page3 = await enDevice.newPage();
    await page3.goto("/config/aprendizagem");
    await waitForLazyPage(page3);
    await dismissBlockingOverlays(page3);
    await expect(page3.getByTestId("settings-interface-locale-row")).toContainText("App language");
    await enDevice.close();
  });

  test("idioma do aparelho muda com o app aberto: modo sistema acompanha, escolha manual não", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const row = page.getByTestId("settings-interface-locale-row");
    await expect(row).toContainText("Idioma do aplicativo");
    const deviceSwitchesTo = (tags: string[]) =>
      page.evaluate((next) => {
        Object.defineProperty(navigator, "languages", { configurable: true, get: () => next });
        Object.defineProperty(navigator, "language", { configurable: true, get: () => next[0] });
        window.dispatchEvent(new Event("languagechange"));
      }, tags);
    await deviceSwitchesTo(["en-US"]);
    await expect(row).toContainText("App language");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Escolha manual PT: a próxima troca do aparelho não mexe.
    await row.click();
    await page.locator('[data-locale-choice="pt-BR"]').click();
    await expect(row).toContainText("Idioma do aplicativo");
    await deviceSwitchesTo(["en-GB"]);
    await page.waitForTimeout(300);
    await expect(row).toContainText("Idioma do aplicativo");
  });
});

test.describe("Existing accounts", () => {
  test("conta antiga pt → pt-zh sem picker; trocar para en-zh mantém progresso", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedOnboardedSession(page, ["l1", "l2", "l3"]);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page).toHaveURL(/\/jornada$/);
    const before = await storeState(page);
    expect(before.courseDirection).toBe("pt-zh");

    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-course-direction-value]")).toHaveText("Português → Mandarim");
    await page.getByTestId("settings-course-row").click();
    await page.locator('[data-course-choice="en-zh"]').click();
    await expect(page.getByTestId("course-change-warning")).toContainText("Seu progresso em mandarim será mantido");
    await page.screenshot({ path: "test-results/rc2-2-14b/settings-course-sheet-390x844.png" });
    await page.getByTestId("course-change-confirm").click();
    await expect(page.locator("[data-course-direction-value]")).toHaveText("Inglês → Mandarim");

    const after = await storeState(page);
    expect(after.courseDirection).toBe("en-zh");
    expect(after.completedLessons).toBe(before.completedLessons);
    expect(after.xpTotal).toBe(before.xpTotal);
    expect(after.srs).toBe(before.srs);
    expect(after.instruction).toBe("en");
  });

  test("conta antiga en → en-zh sem picker", async ({ page }) => {
    await seedInstructionLocale(page, "en");
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    expect((await storeState(page)).courseDirection).toBe("en-zh");
  });

  test("conta com curso salvo: Android em EN não troca o curso", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await seedOnboardedSession(page, ["l1"]);
    await page.addInitScript(() => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state: Record<string, unknown> };
      parsed.state.courseDirection = "pt-zh";
      localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const state = await storeState(page);
    expect(state.courseDirection).toBe("pt-zh");
    expect(state.instruction).toBe("pt-BR");
    await context.close();
  });

  test("onboarding não pergunta o curso de novo: mostra e permite alterar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTelemetryDeclined(page);
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/curso\?next=%2Fcomecar/);
    await page.locator('[data-course-choice="pt-zh"]').click();
    await page.getByTestId("course-picker-confirm").click();
    await expect(page).toHaveURL(/\/comecar$/);
    await expect(page.getByTestId("course-direction-chip")).toContainText("Português → Mandarim");
    await expect(page.locator("select")).toHaveCount(0);
  });
});
