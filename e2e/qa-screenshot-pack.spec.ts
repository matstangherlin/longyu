import { test, expect } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilSelector, assertNoStickyBarOverlap } from "./lesson-player-mobile-helpers";

/**
 * V3.9 · QA-027 — Pacote de regressão dos três screenshots reais.
 *
 * Cada caso corresponde a uma captura do QA em Android e checa o INVARIANTE que
 * a captura violava, não a aparência. Snapshot de pixel quebraria a cada ajuste
 * de copy; o que precisa continuar verdadeiro é a geometria e a coerência do
 * conteúdo.
 *
 *   1. Hànzì mobile com CTA  → a barra não pode cobrir as opções
 *   2. Jornada mobile        → o backlog não é uma tarefa monolítica
 *   3. Revisão de 明天见      → nunca exibir pinyin de outro item
 *
 * As imagens ficam em test-results/ para inspeção humana; o teste falha pelos
 * asserts, não por diferença de pixel.
 */

const ANDROID = { width: 393, height: 851 };

test.describe("QA-027 · pacote de regressão dos screenshots", () => {
  test.use({ viewport: ANDROID });

  test("1 · Hànzì no mobile — CTA não cobre as opções", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-hanzi");
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const reached = await advanceUntilSelector(page, "[data-hanzi-builder]");
    test.skip(!reached, "HanziBuilder não apareceu no plano desta execução.");

    await assertNoStickyBarOverlap(page);
    await page.screenshot({ path: "test-results/qa027-1-hanzi-mobile.png" });
  });

  test("2 · Jornada no mobile — backlog em sessão, não em dívida", async ({ page }) => {
    await seedFreshJourneySession(page);
    // Sessão fresca não tem revisão vencida — sem isto o teste passaria em
    // branco, que é justamente o cenário que a captura do QA contradiz.
    // Injetamos uma fila grande, como a conta real que exibia "260 itens".
    await page.addInitScript(() => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
      if (!parsed.state) return;
      const srs: Record<string, unknown> = {};
      const past = Date.now() - 48 * 60 * 60 * 1000;
      for (let index = 0; index < 260; index += 1) {
        const id = `chunk:seed${index}:uso`;
        srs[id] = {
          id,
          type: "chunk",
          itemId: `seed${index}`,
          track: "fala",
          reviewDomain: "uso",
          ease: 2.5,
          intervalDays: 1,
          due: past,
          reps: 1,
          lapses: 0,
        };
      }
      parsed.state.srs = srs;
      localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    // O CTA antigo dizia "Revisar 260 itens". O convite agora tem o tamanho de
    // uma sessão; o total pendente pode aparecer, mas nunca como a tarefa.
    const monolithic = page.getByRole("link", { name: /Revisar \d{3,} itens/ });
    await expect(monolithic).toHaveCount(0);

    const sessionCta = page.getByRole("link", { name: /Revisão de hoje/ });
    await expect(sessionCta.first()).toBeVisible();
    const label = (await sessionCta.first().innerText()).trim();
    const shown = Number(label.replace(/\D+/g, "") || "0");
    expect(shown, `sessão do dia não pode ser enorme: "${label}"`).toBeLessThanOrEqual(20);
    // O total pendente continua visível, mas como informação secundária.
    await expect(page.getByText(/\+\d+ pendentes/)).toBeVisible();

    await page.screenshot({ path: "test-results/qa027-2-jornada-mobile.png" });
  });

  test("3 · Revisão — 明天见 nunca sai com o pinyin de outro item", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    // Varre a fila procurando qualquer card cujo hànzì e pinyin não combinem.
    // A checagem exaustiva de conteúdo vive em validate:review-content-integrity;
    // aqui garantimos que o par chega coerente até a TELA.
    const offenders = await page.evaluate(() => {
      const PAIRS: Record<string, string> = {
        "明天见": "míngtiānjiàn",
        "你好": "nǐhǎo",
        "谢谢": "xièxie",
        "再见": "zàijiàn",
      };
      const normalize = (value: string) =>
        value.toLowerCase().replace(/[,.!?，。！？'’·\s]/g, "");
      const found: string[] = [];
      for (const node of document.querySelectorAll<HTMLElement>("*")) {
        const hanzi = (node.textContent ?? "").trim();
        const expected = PAIRS[hanzi];
        if (!expected || node.children.length > 0) continue;
        const container = node.closest("div");
        const text = normalize(container?.textContent ?? "");
        for (const [otherHanzi, otherPinyin] of Object.entries(PAIRS)) {
          if (otherHanzi === hanzi) continue;
          if (text.includes(otherPinyin) && !text.includes(expected)) {
            found.push(`${hanzi} apareceu com o pinyin de ${otherHanzi} (${otherPinyin})`);
          }
        }
      }
      return found;
    });

    expect(offenders, offenders.join(" | ")).toEqual([]);
    await page.screenshot({ path: "test-results/qa027-3-revisao.png" });
  });
});
