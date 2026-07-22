import { test, expect, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedOnboardedSession,
} from "./helpers";

// QA real de dispositivo: toque, safe-area, prefers-reduced-motion, offline (PWA)
// e rede lenta. Roda na suíte completa (chromium/firefox/webkit) e nos projetos
// mobile/tablet/reduced-motion. Testes que dependem de recurso do motor (toque,
// CDP, service worker) se auto-pulam com mensagem clara quando indisponíveis.

async function hasTouch(page: Page): Promise<boolean> {
  return page.evaluate(
    () => navigator.maxTouchPoints > 0 || "ontouchstart" in window
  );
}

test.describe("dispositivo — toque", () => {
  test("landing responde ao toque (tap nos CTAs)", async ({ page }) => {
    await page.goto("/");
    if (!(await hasTouch(page))) {
      test.skip(true, "Sem toque neste projeto (motor de mesa).");
    }
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible();
    await page.getByRole("link", { name: /Começar agora/i }).tap();
    await page.waitForURL("**/conta");
    await expect(page.getByRole("button", { name: /Começar/i })).toBeVisible();
  });

  test("primeira lição avança por toque (Entendi → opção)", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);
    if (!(await hasTouch(page))) {
      test.skip(true, "Sem toque neste projeto (motor de mesa).");
    }
    const entendi = page.getByRole("button", { name: "Entendi" });
    await expect(entendi).toBeVisible();
    await entendi.tap();
    const option = page.getByRole("button", { name: /你好/ }).first();
    await expect(option).toBeVisible();
    await option.tap();
    // Após o toque, o player mostra verificação/feedback ou avança — sem crash.
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
  });
});

test.describe("dispositivo — teclado físico (desktop)", () => {
  test("número seleciona opção; sem digitar em input", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
    // Atalho numérico seleciona a primeira alternativa (estado "selected").
    await page.keyboard.press("1");
    await expect(page.locator("button.border-accent").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Enter aciona o botão em foco (avançar)", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);
    const entendi = page.getByRole("button", { name: "Entendi" });
    await entendi.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
  });
});

test.describe("dispositivo — safe-area / barra inferior", () => {
  test("viewport-fit=cover e conteúdo não fica sob a barra fixa", async ({ page }) => {
    // 1) A viewport declara viewport-fit=cover (habilita env(safe-area-inset-*)).
    await page.goto("/");
    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(viewportMeta ?? "").toContain("viewport-fit=cover");

    // 2) Num hub, a barra inferior fixa (mobile/tablet) usa
    // env(safe-area-inset-bottom) e o <main> reserva padding para ela, então
    // nenhum CTA fica escondido atrás da barra. No desktop (lg) a barra some
    // (vira sidebar), então só validamos que nada transborda lateralmente.
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const width = page.viewportSize()?.width ?? 1280;
    const isMobileWidth = width < 1024; // Tailwind `lg`

    const bottomNav = page.locator("nav.fixed").first();
    if (isMobileWidth && (await bottomNav.isVisible().catch(() => false))) {
      const style = (await bottomNav.getAttribute("style")) ?? "";
      expect(style).toContain("safe-area-inset-bottom");

      const mainPadBottom = await page.evaluate(() => {
        const main = document.querySelector("main");
        return main ? parseFloat(getComputedStyle(main).paddingBottom || "0") : 0;
      });
      // 5.5rem (~88px) + safe-area. No browser a safe-area é 0; ainda assim o
      // padding da barra precisa estar presente para o conteúdo não ficar sob ela.
      expect(mainPadBottom).toBeGreaterThanOrEqual(64);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});

test.describe("dispositivo — prefers-reduced-motion", () => {
  test("reduzir movimento desliga transições", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/jornada");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const prefersReduce = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    expect(prefersReduce).toBe(true);

    // O CSS global aplica `transition: none !important` sob reduce. O primeiro
    // elemento interativo VISÍVEL (que normalmente anima) deve computar duração
    // de transição 0s. Usa a árvore direto para ignorar elementos ocultos.
    const transitionDuration = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("a, button"));
      const visible = els.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return visible ? getComputedStyle(visible).transitionDuration : null;
    });
    expect(transitionDuration).not.toBeNull();
    // "0s" ou lista de zeros — nada de transição perceptível.
    expect(/^0s(,\s*0s)*$/.test((transitionDuration ?? "").trim())).toBe(true);
  });
});

test.describe("dispositivo — offline (PWA)", () => {
  test("app shell abre offline após precache do service worker", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible();

    const hasSW = await page.evaluate(() => "serviceWorker" in navigator);
    if (!hasSW) test.skip(true, "Sem service worker neste ambiente.");

    // Espera o SW registrar e, após reload, assumir o controle da página.
    await page.evaluate(() => navigator.serviceWorker.ready).catch(() => undefined);
    await page.reload();
    const controlled = await page
      .waitForFunction(() => navigator.serviceWorker.controller != null, null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!controlled) {
      test.skip(true, "Service worker não assumiu controle neste ambiente (verificar em device real).");
    }

    // Corta a rede e recarrega: o shell precacheado deve renderizar mesmo assim.
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await context.setOffline(false);
    }
  });
});

test.describe("dispositivo — rede lenta", () => {
  test("landing fica utilizável em conexão lenta (3G)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Throttling via CDP só no Chromium.");
    const client = await page.context().newCDPSession(page);
    await client.send("Network.enable");
    // ~Slow 3G: ~400kbps, 400ms de latência.
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
      latency: 400,
    });

    await page.goto("/", { waitUntil: "commit" });
    // Mesmo sob rede lenta, a landing precisa ficar visível/utilizável.
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("link", { name: /Começar agora/i })).toBeVisible({
      timeout: 45_000,
    });
    await client.detach().catch(() => undefined);
  });
});
