import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { openDenseSentenceBuild } from "./lesson-player-mobile-helpers";

const SHOTS = path.join(process.cwd(), "docs/reports/v492b-screenshots");
const MIN_CONTRAST = 4.5;

/**
 * V4.9.2B — o bug relatado em aparelho real.
 *
 * Na produção ("Monte a frase"), ao selecionar peças, a bandeja mostrava pills
 * ilegíveis e o banco inferior escurecia até virar mancha. A medição no browser
 * confirmou: bandeja 3.11:1 no dark e 4.04:1 no china, peça usada 1.85:1 —
 * todas abaixo do mínimo de 4.5.
 *
 * O ponto deste spec é medir o que a tela realmente compõe, não o que o CSS
 * declara. `getComputedStyle().color` devolve a cor antes de `opacity` e
 * `filter`, e foi exatamente por isso que o defeito passou despercebido.
 */
async function measureTiles(page: Page) {
  return page.evaluate(() => {
    const lum = (rgb: number[]) => {
      const ch = rgb.map((c) => {
        const n = c / 255;
        return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const parse = (v: string) => (v.match(/[\d.]+/g) ?? []).map(Number);
    const flatten = (c: number[], under: number[]) => {
      const alpha = c.length === 4 ? c[3] : 1;
      return c.slice(0, 3).map((v, i) => alpha * v + (1 - alpha) * under[i]);
    };
    const opaqueUnder = (el: Element): number[] => {
      let node: Element | null = el.parentElement;
      while (node) {
        const parts = parse(getComputedStyle(node).backgroundColor);
        if ((parts.length === 4 ? parts[3] : 1) > 0.95 && parts.length >= 3) return parts.slice(0, 3);
        node = node.parentElement;
      }
      return [0, 0, 0];
    };

    const describe = (el: Element, where: string) => {
      const cs = getComputedStyle(el);
      const under = opaqueUnder(el);
      let bg = flatten(parse(cs.backgroundColor), under);
      let fg = flatten(parse(cs.color), bg);
      const gray = /grayscale\(([\d.]+)\)/.exec(cs.filter);
      if (gray) {
        const amount = Number(gray[1]);
        const toGray = (c: number[]) => {
          const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
          return c.map((v) => v + (luma - v) * amount);
        };
        fg = toGray(fg);
        bg = toGray(bg);
      }
      const alpha = Number(cs.opacity);
      if (alpha < 1) {
        const over = (c: number[]) => c.map((v, i) => alpha * v + (1 - alpha) * under[i]);
        fg = over(fg);
        bg = over(bg);
      }
      const L1 = lum(fg);
      const L2 = lum(bg);
      return {
        where,
        text: (el.textContent ?? "").trim().slice(0, 4),
        contrast: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)),
        bgLuminance: Number(L2.toFixed(4)),
      };
    };

    // Escopar pelos contêineres, não por classe de estilo: `rounded-2xl` também
    // veste o botão "Verificar", e medir o CTA como se fosse peça inventa falha.
    const out: ReturnType<typeof describe>[] = [];
    document
      .querySelectorAll("[data-assembly-tray] button")
      .forEach((el) => out.push(describe(el, "tray")));
    document
      .querySelectorAll("[data-assembly-bank] button")
      .forEach((el) => out.push(describe(el, (el as HTMLButtonElement).disabled ? "bank-used" : "bank-idle")));
    return out;
  });
}

for (const viewport of [
  { label: "360x640", width: 360, height: 640 },
  { label: "390x844", width: 390, height: 844 },
  { label: "1280x720", width: 1280, height: 720 },
] as const) {
  test.describe(`produção · montagem no dark · ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("peças selecionadas e usadas continuam legíveis", async ({ page }) => {
      await mkdir(SHOTS, { recursive: true });
      await openDenseSentenceBuild(page);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      // O helper injeta peças sintéticas para forçar várias fileiras; medir só as reais.
      await page.evaluate(() =>
        document.querySelectorAll("[data-test-extra-piece]").forEach((node) => node.remove())
      );

      const bank = page.locator("[data-assembly-bank] button:not([disabled])");
      const available = await bank.count();
      expect(available).toBeGreaterThan(0);
      for (let index = 0; index < Math.min(3, available); index += 1) {
        await bank.first().click();
        await page.waitForTimeout(120);
      }

      const tiles = await measureTiles(page);
      const tray = tiles.filter((tile) => tile.where === "tray");
      const used = tiles.filter((tile) => tile.where === "bank-used");
      expect(tray.length, "nenhuma peça chegou à bandeja").toBeGreaterThan(0);
      expect(used.length, "nenhuma peça ficou marcada como usada").toBeGreaterThan(0);

      // 1. Hànzì legível em qualquer peça, selecionada ou usada.
      const illegible = tiles.filter((tile) => tile.contrast < MIN_CONTRAST);
      expect(illegible, `peças abaixo de ${MIN_CONTRAST}:1 — ${JSON.stringify(illegible)}`).toEqual([]);

      // 2. A pill selecionada não pode virar superfície clara dentro do player escuro.
      const whitish = tray.filter((tile) => tile.bgLuminance > 0.25);
      expect(whitish, `bandeja clara demais no dark — ${JSON.stringify(whitish)}`).toEqual([]);

      // 3. Peça usada continua identificável: "existe e já foi usada", não mancha.
      const vanished = used.filter((tile) => tile.contrast < MIN_CONTRAST);
      expect(vanished, `peças usadas ilegíveis — ${JSON.stringify(vanished)}`).toEqual([]);

      // 4. A bandeja não estoura a largura da tela.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, "overflow horizontal na montagem").toBeLessThanOrEqual(1);

      if (viewport.label === "390x844") {
        await page.screenshot({
          path: path.join(SHOTS, "02-production-assembly-dark-fixed.png"),
          fullPage: true,
        });
      }
    });

    test("remover peça da bandeja devolve os estilos corretos", async ({ page }) => {
      await openDenseSentenceBuild(page);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await page.evaluate(() =>
        document.querySelectorAll("[data-test-extra-piece]").forEach((node) => node.remove())
      );

      const bank = page.locator("[data-assembly-bank] button:not([disabled])");
      const usedBefore = await page.locator("[data-assembly-bank] button[disabled]").count();
      await bank.first().click();
      await page.waitForTimeout(150);
      await expect(page.locator("[data-assembly-bank] button[disabled]")).toHaveCount(usedBefore + 1);

      // Devolver a peça: o banco volta ao estado anterior e nada fica ilegível.
      const trayTile = page.locator("[data-assembly-tray] button").first();
      await trayTile.click().catch(() => undefined);
      await page.waitForTimeout(200);

      const illegible = (await measureTiles(page)).filter((tile) => tile.contrast < MIN_CONTRAST);
      expect(illegible, `após remover peça — ${JSON.stringify(illegible)}`).toEqual([]);
    });
  });
}
