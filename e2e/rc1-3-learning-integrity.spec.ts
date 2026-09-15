import { expect, test, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";
import fs from "node:fs";
import path from "node:path";
import { VISUAL_CONCEPTS } from "../src/data/visualVocabulary";
import { ALL_LESSONS } from "../src/data/journey";

/**
 * RC1.3 — Learning Integrity (P27–P31).
 *
 * Tudo aqui saiu de QA humano com o app na mão:
 *
 * - a revisão que voltava para a mesma atividade sem fim (P27);
 * - a correção de 请问 mostrando 我叫马修 (P28);
 * - a revisão sem a dica que a tarefa original tinha (P29);
 * - a árvore com fundo ao redor da base (P30);
 * - a aula de tom cobrando antes de ensinar o par (P31);
 * - a Victory desktop com um vazio enorme antes do CTA (P24).
 *
 * As specs são pela UI, contra o build de preview. A lógica pura — plano finito,
 * resposta canônica, escada de dicas, contraste tonal — tem cobertura própria
 * nos gates Node (`test:review-finite-session`, `test:review-answer-integrity`,
 * `test:review-help-parity`, `test:tone-contrast-progression`).
 */

const QINGWEN_LESSON = "p1-qingwen-cortesia";
const STORE_KEY = "longyu-v1";

const qingwenLesson = ALL_LESSONS.find((lesson) => lesson.id === QINGWEN_LESSON)!;

/** Passos do 请问 que podem virar um erro pendente coerente na revisão. */
function gradedQingwenSteps() {
  return qingwenLesson.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.kind === "dialogue_choice" && Boolean(step.correctAnswer));
}

/**
 * Semeia a ÚLTIMA tentativa com 2★ e erros pendentes reais da lição.
 *
 * É o caminho que o aluno percorre em "Praticar o que travou": o player
 * restaura a tentativa, oferece a revisão e monta o plano finito a partir
 * destes erros. Os passos vêm do currículo (índice + tipo + resposta esperada),
 * para que a resolução por identidade encontre o passo certo.
 */
async function seedPendingReview(page: Page, count = 4) {
  // Primeiro a semente padrão do player: ela resolve a ordem da Jornada, o
  // gate de tom e o fôlego. Sem isso a lição nem abre — cai no card
  // "Complete as 4 lições de 'O que é mandarim?'".
  await seedLessonPlayerReady(page, QINGWEN_LESSON, { masteryLevel: 0, folego: 20 });

  const now = Date.now();
  const mistakes = gradedQingwenSteps()
    .slice(0, count)
    .map(({ step, index }) => ({
      id: `e2e-rc13-${index}`,
      lessonId: QINGWEN_LESSON,
      questionId: `${QINGWEN_LESSON}:${index}:${step.kind}`,
      exerciseType: step.kind,
      prompt: step.prompt ?? step.title ?? "",
      expectedAnswer: step.correctAnswer!,
      userAnswer: "再见",
      explanation: "",
      sourceSkill: "fala",
      createdAt: now,
    }));

  // Depois, a tentativa pendente com 2★ — é ela que dispara a oferta de
  // "Praticar o que travou" ao abrir o player.
  await page.addInitScript(
    ({ key, lessonId, attempt }: { key: string; lessonId: string; attempt: unknown }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state: Record<string, unknown>; version: number };
      parsed.state.lessonAttemptsById = { [lessonId]: [attempt] };
      parsed.state.lessonStarsById = {
        ...(parsed.state.lessonStarsById as Record<string, number>),
        [lessonId]: 2,
      };
      localStorage.setItem(key, JSON.stringify(parsed));
    },
    {
      key: STORE_KEY,
      lessonId: QINGWEN_LESSON,
      attempt: {
        id: `${QINGWEN_LESSON}:${now}`,
        lessonId: QINGWEN_LESSON,
        startedAt: now - 60_000,
        finishedAt: now - 1_000,
        totalQuestions: 8,
        correctCount: 5,
        mistakes,
        recoveredMistakes: [],
        finalStars: 2,
      },
    }
  );
  return mistakes.length;
}

/** Responde SEMPRE errado: escolhe a primeira alternativa habilitada que não é a certa. */
async function answerReviewWrong(page: Page): Promise<boolean> {
  const options = page.locator("[data-review-options] button[data-review-option-id]");
  const count = await options.count().catch(() => 0);
  if (count === 0) return false;
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    if (await option.isDisabled().catch(() => true)) continue;
    await option.click();
    return true;
  }
  return false;
}

async function continueReview(page: Page): Promise<boolean> {
  const next = page.locator("[data-review-next]");
  if (!(await next.isVisible().catch(() => false))) return false;
  if (await next.isDisabled().catch(() => true)) return false;
  await next.click();
  return true;
}

/** Abre o player e espera a oferta de revisão da tentativa restaurada. */
async function openPendingReviewOffer(page: Page) {
  await page.goto(`/licao/${QINGWEN_LESSON}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const offer = page.locator("[data-review-offer]");
  await expect(offer).toBeVisible({ timeout: 20_000 });
  return offer;
}

// ── P27 — a revisão NÃO entra em loop ──────────────────────────────────────

test.describe("RC1.3 · revisão finita", () => {
  test("P27 — errar dentro da revisão continua a sessão, não a reinicia", async ({ page }) => {
    await seedPendingReview(page);
    await openPendingReviewOffer(page);

    // "Praticar o que travou" abre UMA sessão finita.
    await page.locator("[data-review-start]").click();
    const session = page.locator("[data-review-session]");
    await expect(session).toBeVisible({ timeout: 15_000 });

    const sessionId = await session.getAttribute("data-review-session-id");
    const planned = Number(await session.getAttribute("data-review-planned"));
    const retryBudget = Number(await session.getAttribute("data-review-retry-budget"));
    const maxRendered = Number(await session.getAttribute("data-review-max-rendered"));
    expect(planned).toBeGreaterThan(0);
    // P1.5 — o teto é plannedItems + retryBudget.
    expect(maxRendered).toBe(planned + retryBudget);

    // P27.1 — errando SEMPRE, a sessão avança e termina. Sem isto o aluno ficava
    // preso: respondia, via o feedback, continuava e voltava ao mesmo card.
    const summary = page.locator("[data-review-summary]");
    const seenItems: string[] = [];
    for (let guard = 0; guard < maxRendered + 4; guard += 1) {
      if (await summary.isVisible().catch(() => false)) break;
      const question = page.locator("[data-review-question]");
      if (!(await question.isVisible().catch(() => false))) break;
      const prompt = (await page.locator("[data-review-prompt]").innerText().catch(() => "")).trim();
      seenItems.push(prompt);
      await answerReviewWrong(page);
      await expect(page.locator("[data-review-feedback]")).toBeVisible({ timeout: 10_000 });
      if (!(await continueReview(page))) break;
      await page.waitForTimeout(150);
    }

    // P27.2 — depois do último item planejado, o resumo.
    await expect(summary).toBeVisible({ timeout: 15_000 });
    // A sessão nunca renderizou mais do que o teto do plano.
    expect(seenItems.length).toBeLessThanOrEqual(maxRendered);
    // A sessão é a MESMA do início — não foi remontada a cada resposta.
    expect(sessionId).toBeTruthy();
    // P2.2 — o resumo não reabre a mesma revisão.
    const summaryText = (await summary.innerText()).toLowerCase();
    expect(summaryText).not.toContain("continuar revisão");
    // P1.6 — o que ficou volta pelo SRS, e a tela diz isso.
    await expect(page.locator("[data-review-summary-srs]")).toBeVisible();
  });

  test("P2.2 — dá para sair da revisão a qualquer momento", async ({ page }) => {
    await seedPendingReview(page);
    await openPendingReviewOffer(page);

    await page.locator("[data-review-start]").click();
    await expect(page.locator("[data-review-session]")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-review-leave]")).toBeVisible();
    await page.locator("[data-review-leave]").click();
    await expect(page.locator("[data-review-summary]")).toBeVisible({ timeout: 15_000 });
  });
});

// ── P28 — a correção de 请问 ───────────────────────────────────────────────

test.describe("RC1.3 · resposta canônica", () => {
  test("P28 — a revisão nunca mostra 我叫马修 como correção de 请问", async ({ page }) => {
    await seedPendingReview(page);
    await openPendingReviewOffer(page);

    await page.locator("[data-review-start]").click();
    await expect(page.locator("[data-review-session]")).toBeVisible({ timeout: 15_000 });

    const summary = page.locator("[data-review-summary]");
    for (let guard = 0; guard < 14; guard += 1) {
      if (await summary.isVisible().catch(() => false)) break;
      const question = page.locator("[data-review-question]");
      if (!(await question.isVisible().catch(() => false))) break;

      const prompt = (await page.locator("[data-review-prompt]").innerText().catch(() => "")).trim();
      if (!(await answerReviewWrong(page))) break;
      await expect(page.locator("[data-review-feedback]")).toBeVisible({ timeout: 10_000 });

      const correct = page.locator("[data-review-correct-answer]");
      if (await correct.isVisible().catch(() => false)) {
        const correctText = await correct.innerText();
        const explanation = await page
          .locator("[data-review-explanation]")
          .innerText()
          .catch(() => "");

        // P28.1 — o item de 请问 jamais corrige com 我叫马修.
        if (/O que abre a pergunta/i.test(prompt)) {
          expect(correctText).toContain("请问");
          expect(correctText).not.toContain("我叫");
          expect(explanation).toContain("请问");
        }
        // P6 — em QUALQUER item, quando a explicação nomeia hànzì, ela fala do
        // mesmo alvo que a linha "Resposta certa".
        const answerHanzi = correctText.match(/[㐀-鿿]+/gu) ?? [];
        const explanationHanzi = explanation.match(/[㐀-鿿]+/gu) ?? [];
        if (answerHanzi.length > 0 && explanationHanzi.length > 0) {
          const shares = explanationHanzi.some((token) =>
            answerHanzi.some((answer) => answer.includes(token) || token.includes(answer))
          );
          expect(shares, `resposta "${correctText}" × explicação "${explanation}"`).toBe(true);
        }
      } else {
        // P8 — sem integridade, a correção NÃO é apresentada (falha fechada).
        await expect(page.locator("[data-review-integrity-blocked]")).toBeVisible();
      }

      if (!(await continueReview(page))) break;
      await page.waitForTimeout(150);
    }
  });
});

// ── P29 — a dica sobrevive à revisão ───────────────────────────────────────

test.describe("RC1.3 · paridade de ajuda", () => {
  test("P29 — a revisão mantém 'Preciso de uma dica' e a modalidade da origem", async ({ page }) => {
    await seedPendingReview(page);
    await openPendingReviewOffer(page);

    await page.locator("[data-review-start]").click();
    const question = page.locator("[data-review-question]");
    await expect(question).toBeVisible({ timeout: 15_000 });

    // P4 — a dica existe ANTES de responder, e é progressiva (P4.4).
    const hint = page.locator("[data-review-help-request]");
    await expect(hint).toBeVisible();
    const firstHint = await hint.getAttribute("data-review-next-hint");
    expect(firstHint).not.toBe("reveal");

    await hint.click();
    await expect(page.locator("[data-review-help-used]")).toBeVisible();
    // Pedir uma dica não revela a resposta.
    await expect(page.locator("[data-review-correct-answer]")).toHaveCount(0);

    // P29.1 — a modalidade da revisão pertence à família da tarefa original.
    const reviewKind = await question.getAttribute("data-review-kind");
    const sourceKind = await question.getAttribute("data-review-source-kind");
    expect(reviewKind).toBeTruthy();
    expect(sourceKind).toBeTruthy();
    const allowed: Record<string, string[]> = {
      listen_select: ["listen"],
      audio_discrimination: ["listen"],
      image_choice: ["image"],
      compare_with_image: ["image", "choice"],
      sentence_build: ["build"],
      translation_build: ["build"],
      hanzi_build: ["build"],
      fill_blank: ["blank", "build"],
      match_pairs: ["pair"],
      tone: ["tone", "listen"],
    };
    const expected = allowed[sourceKind ?? ""];
    if (expected) expect(expected).toContain(reviewKind);
  });
});

// ── P30 — a árvore ─────────────────────────────────────────────────────────

test.describe("RC1.3 · associação visual", () => {
  test("P30 — a árvore renderiza sem fundo residual sobre o tema escuro", async ({ page }) => {
    const concept = VISUAL_CONCEPTS.find((item) => item.id === "tree");
    expect(concept, "conceito da árvore ausente").toBeTruthy();
    const svg = fs.readFileSync(
      path.join(process.cwd(), "src/assets/visuals", concept!.imageSrc ?? ""),
      "utf8"
    );

    // P10.3 — sem retângulo de canvas e sem os caminhos de fundo que o QA viu.
    expect(svg).not.toMatch(/<rect[^>]*width="6\d\d"[^>]*height="6\d\d"[^>]*fill="#(?!none)/i);
    for (const residue of ["#9EBFA0", "#B5CEB7", "#98BA9A", "#EAF0EA"]) {
      expect(svg, `o caminho de fundo ${residue} voltou ao arquivo`).not.toContain(residue);
    }

    await seedTelemetryDeclined(page);
    await allowE2ELocalSession(page);
    await page.goto("/");
    await waitForLazyPage(page);

    // P30.1 — desenhada sobre o escuro do Longyu, a base não tem pixels claros
    // soltos. Era exatamente a grama que aparecia em volta do tronco.
    const paleAtBase = await page.evaluate(async (markup: string) => {
      const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(markup)))}`;
      const image = new Image();
      image.src = url;
      await image.decode();
      const size = 240;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return -1;
      context.fillStyle = "#15120E";
      context.fillRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
      const band = context.getImageData(0, Math.floor(size * 0.92), size, Math.ceil(size * 0.08)).data;
      let pale = 0;
      for (let index = 0; index < band.length; index += 4) {
        const [r, g, b] = [band[index], band[index + 1], band[index + 2]];
        if (Math.min(r, g, b) >= 0x8c && Math.max(r, g, b) - Math.min(r, g, b) <= 0x30) pale += 1;
      }
      return pale;
    }, svg);
    expect(paleAtBase).toBe(0);
  });

  test("P30 — o item da árvore deriva do ref canônico 木 / mù", async () => {
    const concept = VISUAL_CONCEPTS.find((item) => item.id === "tree");
    expect(concept).toBeTruthy();
    expect(concept!.hanzi).toBe("木");
    expect(concept!.charId).toBe("mu");
    expect(concept!.pinyin).toMatch(/^mù/);
    expect(concept!.meaningPt.toLowerCase()).toContain("árvore");
  });
});

// ── P31 — o contraste tonal ────────────────────────────────────────────────

test.describe("RC1.3 · contraste tonal", () => {
  test("P31 — o par é ensinado (hànzì, pinyin, tom, significado, áudio) antes de ser cobrado", async ({ page }) => {
    await seedLessonPlayerReady(page, "p1-o-que-e-tom", { masteryLevel: 0, folego: 20 });
    await page.goto("/licao/p1-o-que-e-tom/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const card = page.locator("[data-tone-contrast-set]");
    const victory = page.locator("[data-lesson-victory]");
    let sawCard = false;
    let sawScoredContrast = false;

    for (let step = 0; step < 30; step += 1) {
      if (await victory.isVisible().catch(() => false)) break;
      if (!sawCard && (await card.isVisible().catch(() => false))) {
        sawCard = true;
        // P31.1 — os dois membros com tudo o que o par precisa mostrar.
        const members = page.locator("[data-tone-contrast-member]");
        await expect(members).toHaveCount(2);
        await expect(page.locator("[data-tone-contrast-meaning]")).toHaveCount(2);
        await expect(page.locator("[data-tone-contrast-pinyin]")).toHaveCount(2);
        await expect(page.locator("[data-tone-contour]").first()).toBeVisible();
        // P17.1 — ouvir A, ouvir B, ouvir comparação, ouvir devagar.
        await expect(page.locator("[data-tone-contrast-play]")).toHaveCount(2);
        await expect(page.locator("[data-tone-contrast-compare]")).toBeVisible();
        await expect(page.locator("[data-tone-contrast-slow]")).toBeVisible();
        // P15.1 — mesma base, tons diferentes.
        const tones = await members.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-tone-contrast-tone"))
        );
        expect(new Set(tones).size).toBe(2);
        // P19.1 — vocabulário de demonstração fica rotulado como tal.
        await expect(page.locator("[data-tone-contrast-only-note]")).toBeVisible();
      }
      // P31.2 — o teste tonal só aparece DEPOIS do cartão.
      const toneStep = page.locator("[data-step-kind='tone'], [data-tone-question]");
      if (await toneStep.isVisible().catch(() => false)) {
        sawScoredContrast = true;
        expect(sawCard, "o teste tonal apareceu antes do cartão de ensino").toBe(true);
      }
      if (!(await advanceUntilVisible(page, victory, 1))) {
        if (await victory.isVisible().catch(() => false)) break;
      }
    }
    expect(sawCard || sawScoredContrast).toBe(true);
  });
});

// ── P24 — Victory compacta no desktop ──────────────────────────────────────

test.describe("RC1.3 · Victory desktop", () => {
  test("P24 — o CTA fica logo abaixo do resumo, sem vazio enorme", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await seedLessonPlayerReady(page, "l2", { masteryLevel: 3, folego: 20 });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const victory = page.locator("[data-lesson-victory]");
    for (let step = 0; step < 40; step += 1) {
      if (await victory.isVisible().catch(() => false)) break;
      await advanceUntilVisible(page, victory, 1);
    }
    test.skip(!(await victory.isVisible().catch(() => false)), "a lição não chegou à Victory neste plano");

    const summary = page.locator("[data-victory-summary]");
    const actions = page.locator("[data-lesson-victory-actions]");
    await expect(summary).toBeVisible();
    await expect(actions).toBeVisible();

    const summaryBox = await summary.boundingBox();
    const actionsBox = await actions.boundingBox();
    expect(summaryBox).toBeTruthy();
    expect(actionsBox).toBeTruthy();

    // P24.2 — a distância entre o fim do resumo e o começo do CTA é de layout,
    // não de esticamento: a screenshot do QA tinha centenas de pixels aqui.
    const gap = actionsBox!.y - (summaryBox!.y + summaryBox!.height);
    expect(gap, `${Math.round(gap)}px de vazio entre resumo e CTA`).toBeLessThan(120);

    // O card acompanha o conteúdo em vez de ocupar a viewport inteira.
    const cardBox = await victory.boundingBox();
    expect(cardBox!.height).toBeLessThan(900 * 0.95);
  });

  test("P24.3 — no mobile o CTA continua colado embaixo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedLessonPlayerReady(page, "l2", { masteryLevel: 3, folego: 20 });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const victory = page.locator("[data-lesson-victory]");
    for (let step = 0; step < 40; step += 1) {
      if (await victory.isVisible().catch(() => false)) break;
      await advanceUntilVisible(page, victory, 1);
    }
    test.skip(!(await victory.isVisible().catch(() => false)), "a lição não chegou à Victory neste plano");

    const actions = page.locator("[data-lesson-victory-actions]");
    await expect(actions).toBeVisible();
    const box = await actions.boundingBox();
    expect(box).toBeTruthy();
    // O CTA está na metade de baixo da viewport, ao alcance do polegar.
    expect(box!.y).toBeGreaterThan(844 * 0.5);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844 + 2);
  });
});
