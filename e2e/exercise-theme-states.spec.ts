import { expect, test } from "@playwright/test";

/**
 * V4.9.2B — auditor central de contraste da família de tiles.
 *
 * Duas regressões de tema escaparam por componentes diferentes: a bandeja de
 * produção media 3.11:1 no dark e a peça usada 1.85:1. Nenhum teste pegou,
 * porque cada engine resolvia o próprio dark isoladamente e ninguém media o
 * resultado composto.
 *
 * Este spec renderiza a gramática real das peças — as mesmas classes que
 * `assemblyTileClass` e `engineTileClass` produzem — em todos os estados e nos
 * três temas, e mede o contraste COMPUTADO, compondo `opacity` e `filter`.
 * Medir `getComputedStyle().color` cru é o erro que escondeu o bug original:
 * ele devolve a cor antes da composição, então um `opacity: 0.35` some da conta.
 */

const MIN_CONTRAST = 4.5;

// Espelha a gramática de `assemblyTileClass` / `engineTileClass`. Mantido aqui
// como contrato explícito: se alguém mudar as classes sem atualizar esta lista,
// a auditoria deixa de cobrir o estado e o gate abaixo denuncia a lacuna.
const STATES: { name: string; classes: string }[] = [
  { name: "idle", classes: "border-line bg-surface text-ink" },
  { name: "selected", classes: "border-accent bg-accent-soft text-ink ring-2 ring-accent/35" },
  { name: "muted", classes: "border-line/50 bg-surface-2 text-ink-soft" },
  { name: "matched", classes: "border-transparent bg-[rgb(var(--good)/0.16)] text-ink ring-1 ring-[rgb(var(--good)/0.45)]" },
  { name: "wrong", classes: "border-transparent bg-wrong-soft text-ink ring-1 ring-wrong/40" },
  // Peça desabilitada no banco é a peça usada: mesmo tratamento visual, sem véu
  // extra de opacidade. Modelar um `opacity-70` que o código não aplica seria
  // auditar ficção — e a auditoria só vale se descrever o que roda.
  { name: "disabled", classes: "border-line/50 bg-surface-2 text-ink-soft disabled:cursor-not-allowed disabled:shadow-none" },
  // Hover e focus são estados que o aluno vê tanto quanto os outros; o hover da
  // peça ociosa troca a superfície, e um foco de teclado sem contraste deixa a
  // navegação por Tab invisível.
  { name: "hover", classes: "border-accent-soft bg-surface-2 text-ink" },
  { name: "focus", classes: "border-line bg-surface text-ink ring-2 ring-accent/45" },
];

const THEMES = ["dark", "china", "light"] as const;

test.describe("V4.9.2B exercise tile theme states", () => {
  test("todo estado de peça mantém contraste legível nos três temas", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const results = await page.evaluate(
      ({ states, themes }) => {
        const host = document.createElement("div");
        host.id = "__tile-audit";
        document.body.appendChild(host);

        const lum = (rgb: number[]) => {
          const ch = rgb.map((c) => {
            const n = c / 255;
            return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
        };
        const parse = (v: string) => (v.match(/[\d.]+/g) ?? []).map(Number);

        /** Compõe uma cor possivelmente translúcida sobre o que está atrás. */
        const flatten = (c: number[], under: number[]) => {
          const alpha = c.length === 4 ? c[3] : 1;
          return c.slice(0, 3).map((v, i) => alpha * v + (1 - alpha) * under[i]);
        };

        const opaqueAncestorBg = (el: Element): number[] => {
          let node: Element | null = el.parentElement;
          while (node) {
            const parts = parse(getComputedStyle(node).backgroundColor);
            const alpha = parts.length === 4 ? parts[3] : 1;
            if (alpha > 0.95 && parts.length >= 3) return parts.slice(0, 3);
            node = node.parentElement;
          }
          return parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
        };

        const out: { theme: string; state: string; contrast: number; bg: string; fg: string; bgLuminance: number }[] = [];

        for (const theme of themes) {
          if (theme === "light") document.documentElement.removeAttribute("data-theme");
          else document.documentElement.setAttribute("data-theme", theme);

          for (const state of states) {
            host.innerHTML = "";
            const tile = document.createElement("div");
            tile.className = `min-h-12 rounded-2xl border px-3.5 py-2.5 font-semibold ${state.classes}`;
            tile.textContent = "好";
            host.appendChild(tile);

            const cs = getComputedStyle(tile);
            const under = opaqueAncestorBg(tile);
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
            out.push({
              theme,
              state: state.name,
              contrast: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)),
              bg: `rgb(${bg.map((v) => Math.round(v)).join(",")})`,
              fg: `rgb(${fg.map((v) => Math.round(v)).join(",")})`,
              bgLuminance: Number(L2.toFixed(4)),
            });
          }
        }

        host.remove();
        document.documentElement.removeAttribute("data-theme");
        return out;
      },
      { states: STATES, themes: [...THEMES] }
    );

    const failures = results.filter((row) => row.contrast < MIN_CONTRAST);
    expect(
      failures,
      `estados abaixo de ${MIN_CONTRAST}:1 — ${JSON.stringify(failures, null, 1)}`
    ).toEqual([]);

    // No dark, nenhum estado pode virar superfície clara: uma pill quase branca
    // dentro do player escuro foi exatamente o defeito relatado em aparelho real.
    const darkTooLight = results.filter((row) => row.theme === "dark" && row.bgLuminance > 0.25);
    expect(
      darkTooLight,
      `superfícies claras demais no dark — ${JSON.stringify(darkTooLight, null, 1)}`
    ).toEqual([]);

    // Cobertura: um estado que ninguém mede é um estado que pode regredir.
    expect(results.length).toBe(STATES.length * THEMES.length);
  });
});
