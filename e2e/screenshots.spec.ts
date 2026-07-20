import { test, type Browser, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedOnboardedSession,
} from "./helpers";

// Gera as evidências de docs/REAL_DEVICE_QA.md (docs/screenshots/*.png).
// Roda por demanda: `npx playwright test --project=screenshots`.
// Cada captura cria seu próprio contexto para controlar viewport e toque.

const OUT = path.resolve(process.cwd(), "docs/screenshots");

const PHONE = { width: 390, height: 844 }; // ~iPhone 13/14
const SMALL_PHONE = { width: 360, height: 640 }; // Android compacto
const TABLET_LANDSCAPE = { width: 1112, height: 834 };
const DESKTOP = { width: 1280, height: 800 };

test.beforeAll(async () => {
  await mkdir(OUT, { recursive: true });
});

async function withContext(
  browser: Browser,
  opts: { viewport: { width: number; height: number }; touch?: boolean },
  fn: (page: Page) => Promise<void>
) {
  const touch = opts.touch ?? true;
  const context = await browser.newContext({
    viewport: opts.viewport,
    hasTouch: touch,
    isMobile: touch && opts.viewport.width < 900,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

/** Espera curta e tolerante: nunca trava a captura por um elemento ausente. */
async function settle(locator: Locator) {
  await locator.first().waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
}

async function open(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await dismissBlockingOverlays(page).catch(() => undefined);
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false, timeout: 15_000 });
}

test("evidências — telas públicas (telefone)", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: PHONE }, async (page) => {
    await open(page, "/");
    await settle(page.getByRole("heading", { name: /Aprenda mandarim/i }));
    await shot(page, "01-landing-phone");

    await open(page, "/conta");
    await settle(page.getByRole("button", { name: /Começar/i }));
    await shot(page, "02-cadastro-phone");

    await open(page, "/login");
    await settle(page.getByRole("heading"));
    await shot(page, "03-login-phone");

    await open(page, "/esqueci-senha");
    await settle(page.getByRole("heading"));
    await shot(page, "04-recuperacao-senha-phone");
  });
});

test("evidências — jornada e hubs (telefone)", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: PHONE }, async (page) => {
    await seedOnboardedSession(page, ["l1"]);

    await open(page, "/jornada");
    await settle(page.getByRole("heading", { level: 1 }));
    await shot(page, "05-jornada-phone");

    await open(page, "/revisao");
    await settle(page.getByRole("heading", { level: 1 }));
    await shot(page, "06-revisao-phone");

    await open(page, "/perfil");
    await settle(page.getByRole("heading").first());
    await shot(page, "07-perfil-phone");

    await open(page, "/pro");
    await settle(page.getByRole("heading", { name: /30 dias grátis/i }));
    await shot(page, "08-paywall-phone");

    await open(page, "/ligas");
    await settle(page.getByRole("heading").first());
    await shot(page, "09-ligas-phone");

    // Feedback: no mobile o FAB some (é desktop-only); a entrada fica no Mais.
    await open(page, "/mais");
    await settle(page.getByRole("heading").first());
    await shot(page, "10-mais-feedback-phone");
  });
});

test("evidências — player de lição (telefone pequeno 360)", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: SMALL_PHONE }, async (page) => {
    await seedFreshJourneySession(page);
    await open(page, "/licao/p1-o-que-e-mandarim/player");
    await settle(page.getByRole("heading").first());
    await shot(page, "11-licao-intro-360");

    const entendi = page.getByRole("button", { name: "Entendi" });
    if (await entendi.isVisible().catch(() => false)) {
      await entendi.click().catch(() => undefined);
      await settle(page.getByRole("button", { name: /你好/ }));
      await shot(page, "12-licao-exercicio-360");
    }
  });
});

test("evidências — exercício com imagem e Hànzì Builder (telefone)", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: PHONE }, async (page) => {
    await seedFoundationThrough(page, "p1-engine-2-lab");
    await open(page, "/licao/p4-char-ren/player");
    const entendi = page.getByRole("button", { name: "Entendi" });
    if (await entendi.isVisible().catch(() => false)) await entendi.click().catch(() => undefined);
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator('img[src*=".webp"], img[src*=".svg"]').first().isVisible().catch(() => false)) break;
      await dismissBlockingOverlays(page).catch(() => undefined);
      const next = page.getByRole("button", { name: /^Continuar$|^Próximo$|^Entendi$/ }).first();
      if (await next.isVisible().catch(() => false)) await next.click().catch(() => undefined);
      await page.waitForTimeout(250);
    }
    await shot(page, "13-exercicio-imagem-phone");
  });

  await withContext(browser, { viewport: PHONE }, async (page) => {
    await seedFoundationThrough(page, "p1-o-que-e-hanzi");
    await open(page, "/licao/p1-primeiros-hanzi/player");
    await settle(page.getByRole("heading", { name: /Monte peça por peça/ }));
    await shot(page, "14-hanzi-builder-phone");
  });
});

test("evidências — tablet (paisagem) e desktop", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: TABLET_LANDSCAPE }, async (page) => {
    await seedOnboardedSession(page, ["l1"]);
    await open(page, "/jornada");
    await settle(page.getByRole("heading", { level: 1 }));
    await shot(page, "15-jornada-tablet-landscape");
  });

  await withContext(browser, { viewport: DESKTOP, touch: false }, async (page) => {
    await open(page, "/");
    await settle(page.getByRole("heading", { name: /Aprenda mandarim/i }));
    await shot(page, "16-landing-desktop");
  });
});
