import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.21 — Mobile Native Stability (parte Web/E2E).
 *
 * E2E PASS ≠ PHYSICAL PASS: o navegador não prova que o aluno OUVIU a própria
 * voz num Android. Aqui se prova o console de diagnóstico (sanitizado), o
 * buffer técnico, a ausência de scroll horizontal em 360/375/390 e que
 * toques rápidos/VOLTAR durante carregamento não geram erro JS.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];

async function seed(page: Page, state: Record<string, unknown> = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      guidance: { version: 2, enabled: false, initialized: true, records: {} },
      completedLessons: THROUGH_L2,
      ...state,
    },
    version: STORE_VERSION,
  });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc2221-seeded")) return;
    sessionStorage.setItem("rc2221-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  return errors;
}

test.describe("RC2.2.21 · console de diagnóstico mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mostra build, aparelho, estado e áudio; JSON sanitizado e sem PASS físico", async ({ page }) => {
    await seed(page);
    await open(page, "/jornada");
    await open(page, "/qa/device");
    const console_ = page.getByTestId("qa-mobile-console");
    await expect(console_).toBeVisible();
    await expect(console_).toHaveAttribute("data-tech-capture", "on");
    for (const field of ["BUILD SHA", "versionCode", "WebView", "viewport", "DPR", "safe-area", "teclado", "rede", "ciclo de vida", "rota", "dono do áudio", "TTS", "microfone", "zh-CN", "gravação", "reprodução"]) {
      await expect(page.locator(`[data-qa-mobile-field="${field}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-qa-mobile-field="viewport"]')).toHaveText("390×844");
    await expect(page.locator('[data-qa-mobile-field="rede"]')).toHaveText("online");
    await expect(page.locator('[data-qa-mobile-field="rota"]')).toHaveText("/qa/device");
    await expect(page.locator('[data-qa-mobile-field="dono do áudio"]')).toHaveText("IDLE");

    const text = (await page.getByTestId("qa-mobile-json").textContent()) ?? "";
    const json = JSON.parse(text) as Record<string, unknown>;
    expect(json.schema).toBe("longyu-mobile-diagnostic/1");
    expect(json.physicalPass).toBe(false);
    expect(text).not.toMatch(/@|password|senha|"otp"|access_token|refresh_token|transcript/i);
    // A navegação ficou no buffer técnico (só metadados).
    const events = json.events as { event: string; route: string }[];
    expect(events.some((item) => item.event === "route_changed" && item.route === "/qa/device")).toBe(true);
    expect(events.length).toBeLessThanOrEqual(150);
    await expect(page.getByTestId("qa-mobile-copy")).toHaveText("Copiar diagnóstico");
  });

  test("erro JS global entra no buffer só como classe (sem mensagem)", async ({ page }) => {
    await seed(page);
    await open(page, "/qa/device");
    await page.evaluate(() => {
      setTimeout(() => {
        throw new TypeError("mensagem com ana@exemplo.com que não pode vazar");
      }, 0);
    });
    await page.getByTestId("qa-mobile-refresh").click();
    const text = (await page.getByTestId("qa-mobile-json").textContent()) ?? "";
    expect(text).toContain('"js_error"');
    expect(text).toContain("TypeError");
    expect(text).not.toContain("exemplo.com");
  });
});

test.describe("RC2.2.21 · sem scroll horizontal em 360/375/390", () => {
  const ROUTES = ["/jornada", "/revisao", "/praticar", "/hanzi", "/cultura", "/missoes", "/imersao", "/qa/device"];
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ]) {
    test(`rotas principais em ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page);
      const errors = collectPageErrors(page);
      const offenders: string[] = [];
      for (const route of ROUTES) {
        await open(page, route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) offenders.push(`${route} (+${overflow}px)`);
      }
      expect(offenders).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("RC2.2.21 · toques rápidos e VOLTAR no meio do carregamento", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("VOLTAR durante a troca de rota e toques repetidos não geram erro JS", async ({ page }) => {
    await seed(page);
    const errors = collectPageErrors(page);
    await open(page, "/jornada");
    // Navega e volta antes do lazy load terminar, várias vezes.
    for (const route of ["/revisao", "/hanzi", "/cultura"]) {
      await page.evaluate((to) => {
        history.pushState({ idx: (history.state?.idx ?? 0) + 1 }, "", to);
        dispatchEvent(new PopStateEvent("popstate"));
      }, route);
      await page.goBack();
    }
    await open(page, "/jornada");
    // Toque duplo em qualquer botão visível da Jornada não quebra a página.
    const button = page.locator("main button:visible").first();
    if (await button.count()) {
      await button.dblclick({ delay: 10 }).catch(() => undefined);
    }
    await expect(page.locator("body")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
