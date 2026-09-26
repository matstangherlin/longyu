import { expect, test, type Locator, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedUnlockedLessonSession, waitForLazyPage } from "./helpers";
import { advanceUntilVisible, clickIfEnabled } from "./lesson-player-helpers";
import { ALL_LESSONS } from "../src/data/journey";

/**
 * RC2.2.9 — as 11 capacidades que eram PARTIAL, jogadas no player real.
 *
 * O seed só leva o aluno ao ponto pedagógico: lições anteriores concluídas, a
 * rodada de maestria certa e, para passos no fim da rodada, o cursor de
 * retomada que o próprio player grava — com índice lido do contador real da
 * rodada ([data-lesson-progress-label]), nunca inventado. A atividade testada
 * é sempre a que `lessonRoundStepsFor` entrega — nada aqui injeta passo.
 *
 * A cobertura completa das seis dimensões fica no validator
 * (validate:capability-runtime-evidence); aqui prova-se, por capacidade, uma
 * interação produtiva e uma de conversa ou transferência, mais uma amostra de
 * escuta.
 */

function masteryUpTo(lessonId: string, pass: number) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const now = Date.now();
  const byId: Record<string, { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }> = {};
  for (const lesson of ALL_LESSONS.slice(0, index)) {
    if (lesson.isReview || lesson.reviewMasteryMode) continue;
    byId[lesson.id] = { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now };
  }
  const level = pass - 1;
  byId[lessonId] = { level, passCount: level, lastPass: Math.max(1, level), recoveryPending: false, updatedAt: now };
  return byId;
}

/** Abre a lição na rodada `pass` de maestria (review lessons têm uma rodada só). */
async function openLesson(page: Page, lessonId: string, pass: number) {
  await seedUnlockedLessonSession(page, lessonId, { lessonMasteryById: masteryUpTo(lessonId, pass) });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
}

/**
 * Abre a rodada e tenta saltar para `fromEnd` posições antes do fim, usando o
 * cursor de retomada do player. O total vem do contador da própria rodada.
 */
async function openNearEnd(page: Page, lessonId: string, pass: number, fromEnd = 0) {
  await openLesson(page, lessonId, pass);
  const label = page.locator("[data-lesson-progress-label]").first();
  await expect(label).toHaveText(/^\d+\/\d+$/, { timeout: 20_000 });
  const total = Number(((await label.textContent()) ?? "").split("/")[1]);
  const stepIndex = total - 1 - fromEnd;
  expect(stepIndex, `rodada de ${lessonId}/M${pass} curta demais (${total})`).toBeGreaterThan(0);
  await page.evaluate(
    ({ id, cursor }) => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      const patch = (target: Record<string, unknown> | undefined) => {
        if (!target || typeof target !== "object") return;
        target.lessonSessionStepById = {
          ...((target.lessonSessionStepById as Record<string, unknown>) ?? {}),
          [id]: cursor,
        };
      };
      patch(data.state);
      for (const account of Object.values((data.state?.accounts ?? {}) as Record<string, Record<string, unknown>>)) {
        patch(account);
      }
      localStorage.setItem("longyu-v1", JSON.stringify(data));
    },
    { id: lessonId, cursor: { pass, stepIndex } }
  );
  await page.reload();
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  // O player pode regravar o próprio cursor na recarga; o salto só encurta o
  // caminho — quem garante o passo é o `reach` de cada teste.
  await expect(label).toHaveText(/^\d+\/\d+$/, { timeout: 20_000 });
}

/**
 * Acerto confirmado: o status "+Qi" aparece, ou — no último passo da rodada —
 * a rodada termina (vitória/ofensiva). Erro abre "Quer tentar de novo?".
 */
async function expectAccepted(page: Page) {
  const accepted = page
    .getByRole("status")
    .filter({ hasText: /Boa! \+Qi|Nice! \+Qi|Certo|Correct/ })
    .or(page.getByText(/dia seguidos|day streak|Rodada concluída|Round complete|Vitória|Victory/i))
    .first();
  await expect(accepted).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Quer tentar de novo|Want to try again|^Quase\.$|^Almost\.$/i })).toHaveCount(0);
}

async function reach(page: Page, target: Locator, label: string) {
  const deadline = Date.now() + 140_000;
  let reached = await target.isVisible().catch(() => false);
  while (!reached && Date.now() < deadline) {
    reached = await advanceUntilVisible(page, target, 12);
  }
  expect(reached, `não alcançou: ${label}`).toBe(true);
}

/** Produção digitada (reverse_recall / free_production): responde e exige o acerto. */
async function answerProduction(page: Page, situation: string, answer: string) {
  const step = page.locator("[data-production-step]").filter({ hasText: situation }).first();
  await reach(page, step, situation);
  // A situação não entrega a frase: produção, não cópia.
  await expect(step.locator("[data-production-situation]")).not.toContainText(answer);
  const field = step.locator("textarea, input[type='text']").first();
  await field.fill(answer);
  await field.press("Enter");
  await expectAccepted(page);
}

/** Montagem (sentence_build): clica as peças na ordem e exige o acerto. */
async function assemble(page: Page, title: string, pieces: string[]) {
  const board = page.locator("[data-sentence-build]").filter({ hasText: title }).first();
  await reach(page, board, title);
  for (const piece of pieces) {
    const escaped = piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await board
      .locator("[data-assembly-bank]")
      .getByRole("button", { name: new RegExp(`(^|: )${escaped}$`) })
      .first()
      .click();
  }
  await clickIfEnabled(page.getByRole("button", { name: /^Verificar$|^Check$/ }).first());
  await expect(board.getByText("+Qi").first().or(page.getByText(/dia seguidos|day streak|Rodada concluída|Vitória/i).first())).toBeVisible({ timeout: 15_000 });
}

/** Escuta: a resposta não está escrita antes; o aluno escolhe o sentido do áudio. */
async function hearAndChoose(page: Page, title: string, heard: string, meaning: string) {
  const step = page.locator('[data-step-kind="audio_to_action"]').filter({ hasText: title }).first();
  await reach(page, step, title);
  await expect(step).not.toContainText(heard);
  await step.getByRole("button", { name: meaning }).first().click();
  await clickIfEnabled(page.getByRole("button", { name: /^Verificar$|^Check$|^Confirmar$|^Confirm$/ }).first());
  await expectAccepted(page);
}

/**
 * Na cena aberta, avança as falas até a intervenção desta pergunta e escolhe a
 * resposta. As opções das intervenções anteriores continuam no histórico
 * (desabilitadas), então espera-se o enunciado novo e clica-se só botão ativo.
 */
async function replyInScene(scene: Locator, prompt: string, reply: string) {
  const promptText = scene.getByText(prompt).first();
  const deadline = Date.now() + 30_000;
  while (!(await promptText.isVisible().catch(() => false)) && Date.now() < deadline) {
    const cta = scene.or(scene.page().locator("[data-lesson-action-region]")).getByRole("button", { name: /^(Responder|Reply|Continuar|Continue)(?:\s*>)?$/i }).first();
    if (!(await clickIfEnabled(cta, 1_000))) await scene.page().waitForTimeout(200);
  }
  await expect(promptText).toBeVisible();
  const option = scene
    .getByRole("button", { name: new RegExp(`^(Opção|Option) \\d+: ${reply.replace(/[.*+?^${}()|[\]\\！]/g, "\\$&")}$`) })
    .and(scene.locator("button:enabled"));
  await option.first().click();
  await clickIfEnabled(scene.getByRole("button", { name: /^Verificar$|^Check$|^Confirmar$|^Confirm$|^Conferir$/ }).first());
}

// Um openLesson por teste: o seed só grava o store quando ele ainda não existe.
test.describe("RC2.2.9 — capacidades conversacionais fechadas em runtime", () => {
  test.setTimeout(180_000);

  test("talk_family — produção + transferência na visita à casa (visit-home)", async ({ page }) => {
    await openNearEnd(page, "p7-imersao-casa-amigo", 3);
    await answerProduction(page, "a mãe dele pergunta se você tem irmãos", "我有一个哥哥，我没有姐姐");
  });

  test("order_food — escuta: entende a restrição 不要辣 pelo áudio", async ({ page }) => {
    await openNearEnd(page, "l26b", 2);
    await hearAndChoose(page, "O que o cliente pediu?", "不要辣", "Sem pimenta");
  });

  test("order_food — produz 不要辣 numa situação, sem alternativas", async ({ page }) => {
    await openNearEnd(page, "l26b", 4);
    await answerProduction(page, "O garçom pergunta se pode colocar pimenta", "不要辣");
  });

  test("order_drink — pedido livre de bebida no restaurante", async ({ page }) => {
    await openLesson(page, "l26b", 4);
    await answerProduction(page, "peca agua de forma natural", "我想喝水");
  });

  test("negotiate_basic — escuta: entende o pedido de desconto", async ({ page }) => {
    await openNearEnd(page, "l27", 2);
    await hearAndChoose(page, "O que o cliente pediu?", "便宜一点", "Mais barato, por favor");
  });

  test("negotiate_basic — pechincha numa situação nova", async ({ page }) => {
    await openNearEnd(page, "l27", 4);
    await answerProduction(page, "Reclame do preço e peça um desconto", "太贵了，便宜一点");
  });

  test("pay — 可以刷卡吗 é ensinado antes de ser cobrado", async ({ page }) => {
    await openNearEnd(page, "l27", 1, 1);
    const card = page.locator('[data-step-kind="flashcard"]').filter({ hasText: "可以刷卡吗" }).first();
    await reach(page, card, "flashcard 可以刷卡吗");
  });

  test("pay — pergunta no caixa se aceitam dinheiro vivo", async ({ page }) => {
    await openLesson(page, "p7-imersao-mercado", 3);
    await answerProduction(page, "pergunte se aceitam dinheiro vivo", "现金可以吗？");
  });

  test("use_metro — monta 我坐地铁 (antes só reconhecido na conversa)", async ({ page }) => {
    await openNearEnd(page, "p6-china-cidades", 3);
    await assemble(page, "De metrô", ["我", "坐", "地铁"]);
  });

  test("use_train — escuta: entende a pergunta pela estação de trem", async ({ page }) => {
    await openNearEnd(page, "p7-imersao-estacao", 2);
    await hearAndChoose(page, "O que a pessoa procura?", "火车站在哪里", "A estação de trem");
  });

  test("use_train — pede o bilhete no guichê do trem", async ({ page }) => {
    await openNearEnd(page, "p7-imersao-estacao", 3);
    await answerProduction(page, "guichê da estação de trem", "我要票");
  });

  test("ask_for_help — escuta: entende o pedido de ajuda", async ({ page }) => {
    await openNearEnd(page, "l11", 2);
    await hearAndChoose(page, "O que a pessoa precisa?", "我需要帮助", "Preciso de ajuda");
  });

  test("ask_for_help — produz o pedido de ajuda sozinho", async ({ page }) => {
    await openLesson(page, "p6-survival-mandarin", 4);
    await answerProduction(page, "Diga que precisa de ajuda", "我需要帮助");
  });

  test("ask_repeat — pede repetição quando não entende, sem alternativas", async ({ page }) => {
    await openLesson(page, "p7-imersao-aeroporto", 1);
    await answerProduction(page, "Peça para repetir", "请再说一遍");
  });

  test("express_preference — conversa: gosta, não gosta e aceita a proposta", async ({ page }) => {
    await openNearEnd(page, "l28", 4, 2);
    const scene = page.locator("[data-conversation-scene]").filter({ hasText: /Do que você gosta\?|What do you like\?/ }).first();
    await reach(page, scene, "cena gostos-na-casa");
    await replyInScene(scene, "Mei quer saber se você gosta de chá", "我喜欢茶");
    await replyInScene(scene, "Você não gosta de carne", "我不喜欢肉");
    await replyInScene(scene, "Mei muda a proposta", "好！谢谢！");
  });

  test("express_preference — recusa um prato numa situação nova", async ({ page }) => {
    await openNearEnd(page, "l28", 4);
    const choice = page.locator('[data-step-kind="contextual_choice"]').filter({ hasText: "Mei oferece carne de novo" }).first();
    await reach(page, choice, "pós-conversa de gostos-na-casa");
    await choice.getByRole("button", { name: /我不喜欢肉/ }).first().click();
    await clickIfEnabled(page.getByRole("button", { name: /^Verificar$|^Check$|^Confirmar$|^Confirm$/ }).first());
    await expectAccepted(page);
  });

  test("make_simple_plan — quando + destino numa conversa cotidiana", async ({ page }) => {
    await openNearEnd(page, "p7-conversa-cotidiana", 1);
    await answerProduction(page, "Diga que amanhã você vai a Pequim", "明天我要去北京");
  });
});
