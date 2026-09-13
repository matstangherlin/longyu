import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedTopicMasterySession,
  waitForLazyPage,
} from "./helpers";

/**
 * RC1.2 P1.1/P1.2 — contrato de navegação do browser.
 *
 * A dívida que abriu este arquivo: `page.goForward()` dava timeout no
 * `topic-mastery-hardening`. A causa não era o teste — era um
 * `<link rel="stylesheet">` render-blocking para `fonts.googleapis.com` no
 * `index.html`. Uma folha de estilo externa bloqueante segura a execução dos
 * scripts seguintes e o evento `load`: numa navegação `back_forward` a request
 * pendurava, o módulo do app não rodava e `#root` ficava vazio.
 *
 * Em rede boa ninguém percebe. Atrás de uma rede que bloqueia o CDN de fontes
 * — a China continental, para onde este curso prepara o aluno — o app não abre.
 *
 * O contrato aqui tem duas metades:
 *
 *   1. Back / Forward / Refresh / deep link FUNCIONAM (o app monta de verdade).
 *   2. Nenhuma delas muda estado: mastery, estrelas, XP, energia, Reforço + ou
 *      completion. Navegar muda superfície, não progresso.
 */

const FIRST = ALL_LESSONS[0];

interface ProgressSnapshot {
  mastery: number;
  stars: number;
  xpTotal: number;
  folego: number;
  completed: number;
  plusRounds: number;
  passStars: number;
}

async function snapshot(page: Page, lessonId: string): Promise<ProgressSnapshot> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("longyu-v1");
    const empty = {
      mastery: 0,
      stars: 0,
      xpTotal: 0,
      folego: 0,
      completed: 0,
      plusRounds: 0,
      passStars: 0,
    };
    if (!raw) return empty;
    try {
      const state = (
        JSON.parse(raw) as {
          state?: {
            lessonMasteryById?: Record<string, { level?: number }>;
            lessonStarsById?: Record<string, number>;
            xpTotal?: number;
            folego?: number;
            completedLessons?: string[];
            plusRoundById?: Record<string, unknown>;
            topicPassStarsById?: Record<string, Record<string, number>>;
          };
        }
      ).state;
      if (!state) return empty;
      return {
        mastery: state.lessonMasteryById?.[id]?.level ?? 0,
        stars: state.lessonStarsById?.[id] ?? 0,
        xpTotal: state.xpTotal ?? 0,
        folego: state.folego ?? 0,
        completed: (state.completedLessons ?? []).length,
        plusRounds: Object.keys(state.plusRoundById ?? {}).length,
        passStars: Object.keys(state.topicPassStarsById?.[id] ?? {}).length,
      };
    } catch {
      return empty;
    }
  }, lessonId);
}

/** O app montou de verdade? `#root` vazio é o sintoma do bug de boot. */
async function expectAppMounted(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => Boolean(document.getElementById("root")?.childElementCount)),
      { timeout: 15_000, message: "#root continua vazio: o app não montou" }
    )
    .toBe(true);
}

test.describe("RC1.2 · integridade de history", () => {
  test("P1.1 — back e forward funcionam e não mudam progresso", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectAppMounted(page);

    const before = await snapshot(page, FIRST.id);

    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await expectAppMounted(page);

    await page.goBack();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/jornada/);
    await expectAppMounted(page);

    // O ponto da dívida: o forward precisa MONTAR o app, não só commitar a URL.
    await page.goForward();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(new RegExp(`/licao/${FIRST.id}/player`));
    await expectAppMounted(page);

    // P0.2/P1.1 — navegar não é progredir.
    const after = await snapshot(page, FIRST.id);
    expect(after.mastery, "forward não pode mudar mastery").toBe(before.mastery);
    expect(after.stars, "forward não pode mudar estrelas").toBe(before.stars);
    expect(after.xpTotal, "forward não pode duplicar XP").toBe(before.xpTotal);
    expect(after.completed, "forward não pode marcar completion").toBe(before.completed);
    expect(after.plusRounds, "forward não pode fechar Reforço +").toBe(before.plusRounds);
    expect(after.passStars, "forward não pode gravar estrela de rodada").toBe(before.passStars);
    expect(after.folego, "forward não pode consumir energia").toBeGreaterThanOrEqual(before.folego);
  });

  test("P1.2 — refresh no player preserva progresso e monta o app", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await expectAppMounted(page);
    const before = await snapshot(page, FIRST.id);

    await page.reload();
    await waitForLazyPage(page);
    await expectAppMounted(page);

    const after = await snapshot(page, FIRST.id);
    expect(after.mastery).toBe(before.mastery);
    expect(after.xpTotal).toBe(before.xpTotal);
    expect(after.completed).toBe(before.completed);
    expect(after.plusRounds).toBe(before.plusRounds);
  });

  test("P1.2 — deep link direto monta o app sem depender de CDN externo", async ({ page }) => {
    // PENDURA o CDN de fontes — não aborta.
    //
    // A diferença importa: uma request abortada falha rápido e destrava o
    // parser sozinha, então um `rel="stylesheet"` bloqueante passaria neste
    // teste. Foi o PENDURAR que derrubou o boot na navegação `back_forward`, e
    // é o que uma rede que engole o CDN (firewall, captive portal, China) faz.
    //
    // Nunca resolvendo a rota, a request fica pendente para sempre: se o
    // `index.html` voltar a bloquear no CDN, `#root` nunca preenche e este
    // teste falha.
    await page.route("**://fonts.googleapis.com/**", () => {});
    await page.route("**://fonts.gstatic.com/**", () => {});

    await seedTopicMasterySession(page, 1);
    for (const path of ["/jornada", `/licao/${FIRST.id}`, "/revisao", "/perfil"]) {
      await page.goto(path);
      await waitForLazyPage(page);
      await expectAppMounted(page);
    }
  });

  test("P1.2 — Jornada → lição → back mantém a Jornada utilizável", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const before = await snapshot(page, FIRST.id);

    await page.goto(`/licao/${FIRST.id}`);
    await waitForLazyPage(page);
    await expectAppMounted(page);

    await page.goBack();
    await waitForLazyPage(page);
    await expectAppMounted(page);
    await expect(page).toHaveURL(/\/jornada/);
    // A Jornada continua interativa depois do back, não uma casca renderizada.
    await expect(page.locator('[aria-current="step"]')).toBeVisible({ timeout: 15_000 });

    const after = await snapshot(page, FIRST.id);
    expect(after.mastery).toBe(before.mastery);
    expect(after.xpTotal).toBe(before.xpTotal);
  });
});
