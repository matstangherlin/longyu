import { test, type Browser, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedOnboardedSession,
  PRO_PRICING_HEADLINE,
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
    await settle(page.getByRole("heading", { name: PRO_PRICING_HEADLINE }));
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

// ── V4.9.2B — evidências do runtime de mídia ────────────────────────────────
//
// As capturas "antes" pedidas na remessa (contraste da peça no escuro e o
// match-pairs antigo) NÃO estão aqui: o defeito que elas documentariam já
// está corrigido no código, e produzi-las exigiria reintroduzir o bug. O que
// segue é o estado "agora", incluindo a aula em vídeo publicada em runtime —
// que não existe em nenhum arquivo do repositório e chega pelo catálogo.

const V492B_VIDEO_PATH = "/e2e-media/lesson-probe.webm";
const V492B_CAPSULE_ID = "capsule:demo-video:v1";

function v492bCatalog() {
  const localized = (title: string, mediaAssetId: string) => ({
    title,
    objective: "Aula publicada em runtime, sem reconstruir a aplicação.",
    transcript: "Transcrição da aula publicada.",
    segments: [
      { id: "s1", kind: "ORIENT", title: `${title} — abertura`, body: "Conteúdo de apoio." },
      { id: "s2", kind: "CHECK", title: `${title} — fecho`, body: "Conteúdo de apoio." },
    ],
    mediaAssetId,
  });
  const asset = (id: string, spokenLocale: string) => ({
    id,
    version: 1,
    kind: "VIDEO",
    delivery: "DIRECT_MP4",
    url: V492B_VIDEO_PATH,
    mimeType: "video/webm",
    durationSeconds: 12,
    spokenLocale,
    captions: [
      { startSeconds: 0, endSeconds: 4, text: "Primeira legenda da aula." },
      { startSeconds: 4, endSeconds: 12, text: "Segunda legenda da aula." },
    ],
    transcript: "Transcrição do asset.",
    fallback: "INTERACTIVE_SEGMENTS",
  });
  return {
    version: 1,
    assets: [asset("media:demo:pt:v1", "pt-BR"), asset("media:demo:en:v1", "en")],
    capsules: [
      {
        id: V492B_CAPSULE_ID,
        topicId: "p1-o-que-e-pinyin",
        afterTopicId: "p1-o-que-e-pinyin",
        mediaType: "VIDEO_CAPSULE",
        durationSeconds: 12,
        completionRule: "MEDIA_ENDED",
        knowledgeTargets: ["chunk:nihao"],
        localized: {
          "pt-BR": localized("Aula publicada em runtime", "media:demo:pt:v1"),
          en: localized("Runtime published lesson", "media:demo:en:v1"),
        },
      },
    ],
  };
}

async function routeV492bCatalog(page: Page, options: { video: "ok" | "broken" } = { video: "ok" }) {
  await page.route("**/lessons/catalog.v1.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v492bCatalog()) })
  );
  await page.route(`**${V492B_VIDEO_PATH}`, (route) =>
    options.video === "ok"
      ? route.fulfill({
          status: 200,
          contentType: "video/webm",
          body: readFileSync(path.join(process.cwd(), "e2e/fixtures/lesson-media-probe.webm")),
        })
      : route.fulfill({ status: 500, body: "" })
  );
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    if (value === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", value);
  }, theme);
  await page.waitForTimeout(200);
}

test("evidências V4.9.2B — cápsula animada, clara e escura", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const theme of ["light", "dark"] as const) {
    await withContext(browser, { viewport: PHONE }, async (page) => {
      await seedFoundationThrough(page, "p1-o-que-e-pinyin");
      await open(page, "/jornada/capsula/capsule%3Apinyin-foundation%3Av1");
      await settle(page.getByTestId("capsule-animated"));
      await setTheme(page, theme);
      await shot(page, `v492b-01-capsula-animada-${theme}`);

      // Segundo segmento: é onde o hànzì e o pinyin aparecem juntos.
      await page.getByTestId("capsule-continue").click().catch(() => undefined);
      await settle(page.getByTestId("capsule-language-card"));
      await shot(page, `v492b-02-capsula-cartao-${theme}`);
    });
  }
});

test("evidências V4.9.2B — aula em vídeo publicada em runtime", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: PHONE }, async (page) => {
    await seedFoundationThrough(page, "p1-o-que-e-pinyin");
    await routeV492bCatalog(page);
    await open(page, `/jornada/capsula/${encodeURIComponent(V492B_CAPSULE_ID)}`);
    await settle(page.getByTestId("capsule-video-player"));
    await shot(page, "v492b-03-video-publicado-phone");

    // Com legendas ligadas: a aula precisa servir quem não pode ouvir.
    await page.getByTestId("capsule-media-captions").click().catch(() => undefined);
    await page.waitForTimeout(300);
    await shot(page, "v492b-04-video-legendas-phone");

    await page.getByTestId("capsule-transcript-toggle").click().catch(() => undefined);
    await settle(page.getByTestId("capsule-transcript"));
    await shot(page, "v492b-05-transcricao-phone");
  });

  await withContext(browser, { viewport: DESKTOP, touch: false }, async (page) => {
    await seedFoundationThrough(page, "p1-o-que-e-pinyin");
    await routeV492bCatalog(page);
    await open(page, `/jornada/capsula/${encodeURIComponent(V492B_CAPSULE_ID)}`);
    await settle(page.getByTestId("capsule-video-player"));
    await shot(page, "v492b-06-video-publicado-desktop");
  });
});

test("evidências V4.9.2B — trilha e fallback", async ({ browser }) => {
  test.setTimeout(120_000);
  await withContext(browser, { viewport: PHONE }, async (page) => {
    await seedFoundationThrough(page, "p1-primeiros-hanzi");
    await routeV492bCatalog(page);
    await open(page, "/jornada");
    await settle(page.locator(`[data-journey-inline-node="node:published:${V492B_CAPSULE_ID}"]`));
    await page
      .locator(`[data-journey-inline-node="node:published:${V492B_CAPSULE_ID}"]`)
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await shot(page, "v492b-07-aula-publicada-na-trilha");
  });

  await withContext(browser, { viewport: PHONE }, async (page) => {
    await seedFoundationThrough(page, "p1-o-que-e-pinyin");
    await routeV492bCatalog(page, { video: "broken" });
    await open(page, `/jornada/capsula/${encodeURIComponent(V492B_CAPSULE_ID)}`);
    await settle(page.getByTestId("capsule-media-error"));
    // O vídeo falhou e a aula continua tendo saída: recarregar ou seguir na
    // versão interativa. Nenhum spinner, nenhum beco.
    await shot(page, "v492b-08-video-falhou-com-saida");

    await page.getByTestId("capsule-media-fallback").click().catch(() => undefined);
    await settle(page.getByTestId("capsule-animated"));
    await shot(page, "v492b-09-fallback-interativo");
  });
});
