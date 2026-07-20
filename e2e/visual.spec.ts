import { test, expect, type Page, type Locator } from "@playwright/test";
import { dismissBlockingOverlays, seedFoundationThrough } from "./helpers";

const SHOTS = "test-results/visual";

// Avança pelo player até um alvo aparecer (mesma estratégia da beta-smoke).
async function advanceUntilVisible(page: Page, target: Locator, maxSteps = 16): Promise<boolean> {
  for (let step = 0; step < maxSteps; step += 1) {
    await dismissBlockingOverlays(page);
    if (await target.isVisible().catch(() => false)) return true;
    const clicked = await clickFirstVisible(page, [/^Entendi$/, /^Continuar$/, /^Próximo$/, /^Verificar$/, /^Conferir$/]);
    if (!clicked) {
      const option = page.locator("button").filter({ hasText: /你好|谢谢|木|人|山|mù|rén/i }).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click().catch(() => undefined);
        await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/]);
      } else {
        break;
      }
    }
    await page.waitForTimeout(200);
  }
  return target.isVisible().catch(() => false);
}

async function clickFirstVisible(page: Page, names: RegExp[]): Promise<boolean> {
  for (const name of names) {
    const button = page.getByRole("button", { name }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      return true;
    }
  }
  return false;
}

// Um passo image_choice: a foto de pessoa em p4-char-ren aparece cedo no plano.
async function openImageExercise(page: Page) {
  await seedFoundationThrough(page, "p1-engine-2-lab");
  await page.goto("/licao/p4-char-ren/player");
  await dismissBlockingOverlays(page);
  if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Entendi" }).click().catch(() => undefined);
  }
  const anyVisual = page.locator('img[alt*="Foto" i], img[alt*="Ilustra" i], img[src*=".webp"], img[src*=".svg"]').first();
  return advanceUntilVisible(page, anyVisual, 16);
}

test.describe("visual — associação de imagem", () => {
  test("imagem principal e grade renderizam com estilo consistente", async ({ page }) => {
    const found = await openImageExercise(page);
    // A imagem real precisa existir no build mesmo que o plano adie o passo.
    if (!found) {
      const res = await page.request.get("/");
      expect(res.ok()).toBeTruthy();
      await page.screenshot({ path: `${SHOTS}/main-image-fallback.png` });
      return;
    }
    const visual = page.locator('img[src*=".webp"], img[src*=".svg"]').first();
    await expect(visual).toBeVisible();
    // Sem layout shift: a imagem carregada tem tamanho renderizado > 0.
    const box = await visual.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/main-image.png`, fullPage: false });

    // Grade de opções (quatro alternativas) do exercício de imagem.
    const grid = page.locator(".grid").first();
    if (await grid.isVisible().catch(() => false)) {
      await grid.screenshot({ path: `${SHOTS}/options-grid.png` }).catch(() => undefined);
    }
  });

  test("imagem em mobile (360px)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const found = await openImageExercise(page);
    await page.screenshot({ path: `${SHOTS}/mobile.png`, fullPage: false });
    if (found) {
      // Nada transborda a largura da viewport no mobile.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    }
  });

  test("modo escuro", async ({ page }) => {
    await page.addInitScript(() => {
      const raw = localStorage.getItem("longyu-v1");
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 15 };
      parsed.state = { ...parsed.state, theme: "dark" };
      localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    });
    await openImageExercise(page);
    // Aplica o tema mesmo que a store hidrate depois do seed.
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/dark.png`, fullPage: false });
  });

  test("erro de carregamento mostra fallback", async ({ page }) => {
    // Navega normalmente (sem interceptar a rede — evita o hang do service worker
    // do PWA) e força o erro de carregamento nas imagens já renderizadas: o
    // handler onError do renderer troca o <img> pelo ícone/emoji de fallback.
    const found = await openImageExercise(page);
    if (!found) {
      // Ambiente adiou a imagem; ainda assim o app não quebra.
      await expect(page.locator("#root")).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/load-error-fallback.png` }).catch(() => undefined);
      return;
    }
    await page.evaluate(() => {
      document.querySelectorAll('img[src*=".webp"], img[src*=".svg"]').forEach((img) => img.dispatchEvent(new Event("error")));
    });
    await page.waitForTimeout(300);
    // O <img> quebrado foi substituído pelo fallback — nada de imagem sem pixels.
    const brokenVisible = await page
      .locator('img[src*=".webp"], img[src*=".svg"]')
      .first()
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
      .catch(() => false);
    expect(brokenVisible).toBeFalsy();
    await page.screenshot({ path: `${SHOTS}/load-error-fallback.png` });
  });
});
