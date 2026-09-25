import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { allowE2ELocalSession, seedTelemetryDeclined, waitForLazyPage } from "./helpers";
import { STEP_ADVANCE_CONTRACT, type StepAdvanceContract } from "../src/lib/lessonStepContract";

/**
 * RC2.2.14 · Q–AB — progressão por StepKind no laboratório `/qa/step-lab`.
 *
 * O laboratório renderiza o StepRenderer REAL (o mesmo do player) e registra
 * `onDone(correct)` / `onMistake`. Para CADA um dos StepKinds reais:
 *
 *   - caminho CERTO → o passo conclui (onDone true; não avaliado: undefined);
 *   - caminho ERRADO → o passo continua com saída (onDone(false) ou erro
 *     registrado) e "tentar de novo" (remontagem, igual ao player) permite
 *     responder de novo;
 *   - duas amostras do MESMO tipo em sequência concluem (latch não vaza).
 *
 * O avanço do cursor do player (idx, stepAttempt, reload, toque duplo) fica em
 * `e2e/lesson-player-advance.spec.ts`.
 */

const KINDS = Object.keys(STEP_ADVANCE_CONTRACT) as (keyof typeof STEP_ADVANCE_CONTRACT)[];
const RESULTS_FILE = path.join("test-results", "step-progression-matrix.json");

const LAB_CONTROL = /tentar de novo \(remontar\)|próxima amostra do mesmo tipo/;
const CONTINUE_LIKE = /^(Entendi|Got it|Continuar|Continue|Concluir|Finish|Percebi a curva|I noticed the contour|Certo! \+Qi|Correct! \+Qi|Próximo|Next)(?:\s*>)?$/i;
const SUBMIT = /^(Verificar|Check|Confirmar|Confirm|Conferir|Responder|Reply|Answer)(?:\s*>)?$/i;
const NON_OPTION = new RegExp(
  [
    LAB_CONTROL.source,
    "^Ouvir",
    "^Listen",
    "Áudio",
    "Toque para ouvir",
    "Tap to listen",
    "Não posso",
    "I can't",
    "^Pular",
    "^Skip",
    "^Limpar",
    "^Clear",
    "^Falar",
    "^Speak",
    "Preciso de uma dica",
    "Usar sugestão",
    "Ver resposta",
    "Ver tradução",
    "Mostrar significado",
    "Show meaning",
    "^Montagem",
    "^Tentar de novo",
    CONTINUE_LIKE.source,
    SUBMIT.source,
  ].join("|"),
  "i"
);

type LabState = { done: number; correct: string; mistakes: number };

async function labState(page: Page): Promise<LabState> {
  const root = page.locator("[data-qa-step-kind]");
  return {
    done: Number((await root.getAttribute("data-qa-step-done")) ?? "0"),
    correct: (await root.getAttribute("data-qa-step-correct")) ?? "none",
    mistakes: Number((await root.getAttribute("data-qa-step-mistakes")) ?? "0"),
  };
}

function lab(page: Page): Locator {
  return page.locator("[data-qa-step-lab]");
}

async function visibleButtons(page: Page): Promise<{ locator: Locator; label: string }[]> {
  const buttons = lab(page).locator("button:visible");
  const count = await buttons.count();
  const out: { locator: Locator; label: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const indexed = buttons.nth(i);
    const aria = ((await indexed.getAttribute("aria-label")) || "").trim();
    const text = ((await indexed.textContent()) || "").trim();
    const label = aria || text;
    if (!(await indexed.isEnabled().catch(() => false))) continue;
    // Locator estável (por texto/nome), não por posição: um botão que some por
    // um instante (animação, rerender) deslocava o índice e o clique caía em
    // outro botão.
    const escaped = (text || aria).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const locator = text
      ? lab(page).locator("button").filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) }).first()
      : aria
        ? lab(page).locator(`button[aria-label="${aria.replace(/"/g, '\\"')}"]`).first()
        : indexed;
    out.push({ locator, label });
  }
  return out;
}

async function clickByLabel(page: Page, pattern: RegExp): Promise<boolean> {
  for (const button of await visibleButtons(page)) {
    if (LAB_CONTROL.test(button.label)) continue;
    if (pattern.test(button.label)) {
      await button.locator.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(160);
      return true;
    }
  }
  return false;
}

/** Fecha feedback / avança conteúdo até o passo concluir (ou não haver mais ação). */
async function settle(page: Page, rounds = 12): Promise<LabState> {
  for (let i = 0; i < rounds; i += 1) {
    const state = await labState(page);
    if (state.done > 0) return state;
    if (await clickByLabel(page, SUBMIT)) continue;
    if (await clickByLabel(page, CONTINUE_LIKE)) continue;
    break;
  }
  // Alguns passos concluem por timer depois do feedback (ex.: listen_select,
  // 520 ms). Espera a conclusão pendente antes de remontar — remontar cancela o timer.
  for (let waited = 0; waited < 1_500; waited += 150) {
    const state = await labState(page);
    if (state.done > 0) return state;
    await page.waitForTimeout(150);
  }
  return labState(page);
}

async function optionButtons(page: Page): Promise<{ locator: Locator; label: string }[]> {
  return (await visibleButtons(page)).filter((button) => !NON_OPTION.test(button.label) && !/^(Peça|Piece) \d+:/.test(button.label));
}

/** Rótulo de opção sem prefixo "Opção N:" e sem o dígito de atalho (um só). */
function optionText(label: string): string {
  return label.replace(/^(Opção|Option) \d+:\s*/, "").replace(/^\d(?=\D)/, "").trim();
}

function answerCandidates(step: Record<string, unknown>): string[] {
  return [step.correctAnswer, step.answer, ...((step.accepts as string[]) ?? []), step.blankAnswer, step.hanzi, step.text].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

async function stepJson(page: Page): Promise<Record<string, unknown>> {
  return JSON.parse((await page.locator("#qa-step-json").textContent()) || "{}");
}

async function placePieces(page: Page, parts: string[]) {
  for (const part of parts) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const piece = lab(page).getByRole("button", { name: new RegExp(`^(Peça|Piece) \\d+: ${escaped}$`) }).first();
    if (await piece.isVisible().catch(() => false)) {
      await piece.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(90);
    }
  }
}

async function fillAnswer(page: Page, value: string): Promise<boolean> {
  const input = lab(page).locator("input:visible, textarea:visible").first();
  if (!(await input.isVisible().catch(() => false))) return false;
  await input.fill(value);
  await page.waitForTimeout(120);
  return true;
}

const sceneTried = new Map<string, Set<string>>();
const sceneSolved = new Map<string, string>();

/** Uma tentativa. `attempt` escolhe a opção (tenta-cada) nos tipos de escolha. */
async function attemptStep(page: Page, _kind: string, contract: StepAdvanceContract, attempt: number, tried: Set<string>) {
  const step = await stepJson(page);
  /** Escolhe UMA opção ainda não tentada (as opções são reembaralhadas a cada remontagem). */
  const pickUntried = async () => {
    const options = await optionButtons(page);
    const wanted = answerCandidates(step);
    const pick =
      options.find((o) => wanted.includes(optionText(o.label)) && !tried.has(optionText(o.label))) ??
      options.find((o) => !tried.has(optionText(o.label))) ??
      options[attempt % Math.max(1, options.length)];
    if (!pick) return;
    tried.add(optionText(pick.label));
    await pick.locator.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(160);
    // Segunda etapa com campo (ex.: reparo de conversa): escreve a resposta.
    if (await lab(page).locator("input:visible, textarea:visible").first().isVisible().catch(() => false)) {
      await fillAnswer(page, answerCandidates(step)[0] ?? "");
    }
  };
  switch (contract.interaction) {
    case "read": {
      for (let i = 0; i < 14; i += 1) {
        if ((await labState(page)).done > 0) return;
        if (await clickByLabel(page, /Mostrar significado|Show meaning/)) continue;
        if (await clickByLabel(page, CONTINUE_LIKE)) continue;
        // Diálogo do guia: tocar no balão avança o texto.
        const bubble = (await optionButtons(page))[0];
        if (bubble) {
          await bubble.locator.click({ timeout: 1_500 }).catch(() => undefined);
          await page.waitForTimeout(200);
          continue;
        }
        break;
      }
      return;
    }
    case "listen_speak":
      await clickByLabel(page, /Não posso falar agora|I can't speak now/);
      return;
    case "tone_choice": {
      if (step.assist !== "quiz") {
        await clickByLabel(page, /^Ouvir$|^Listen$/);
        return;
      }
      await clickByLabel(page, /^Ouvir$|^Listen$/);
      await pickUntried();
      return;
    }
    case "pairs": {
      // O par certo compartilha `data-pair-id` entre as colunas (a direita é embaralhada).
      const lefts = lab(page).locator('[data-pair-side="left"]');
      const count = await lefts.count();
      for (let i = 0; i < count; i += 1) {
        const id = await lefts.nth(i).getAttribute("data-pair-id");
        if (!id || (await lefts.nth(i).getAttribute("data-pair-matched")) === "true") continue;
        await lefts.nth(i).click({ timeout: 2_000 }).catch(() => undefined);
        await page.waitForTimeout(120);
        await lab(page).locator(`[data-pair-side="right"][data-pair-id="${id}"]`).first().click({ timeout: 2_000 }).catch(() => undefined);
        await page.waitForTimeout(260);
      }
      await page.waitForTimeout(700);
      return;
    }
    case "token_build": {
      if (await fillAnswer(page, String(step.correctAnswer ?? step.answer ?? (step.accepts as string[] | undefined)?.[0] ?? ""))) return;
      const parts = (step.target as string[]) ?? (step.targetParts as string[]) ?? (step.routeParts as string[]) ?? [];
      await placePieces(page, attempt === 0 ? parts : [...parts].reverse());
      return;
    }
    case "hanzi_build": {
      const solution = JSON.parse(
        (await page.locator("[data-qa-step-kind]").getAttribute("data-qa-builder-solution")) ?? "[]"
      ) as { type: "stroke" | "glyph"; value: string }[];
      for (const piece of solution) {
        const available = lab(page).locator('[data-builder-piece="available"]');
        const count = await available.count();
        for (let i = 0; i < count; i += 1) {
          const label = (await available.nth(i).getAttribute("aria-label")) ?? "";
          const match = piece.type === "stroke" ? label.includes(piece.value) : label.includes(`${piece.value} (`);
          if (match) {
            await available.nth(i).click().catch(() => undefined);
            await page.waitForTimeout(90);
            break;
          }
        }
      }
      return;
    }
    case "typing":
    case "speech_or_typing": {
      const candidates = [step.answer, ...((step.accepts as string[]) ?? []), step.correctAnswer, step.hanzi, step.text].filter(
        (value): value is string => typeof value === "string" && value.length > 0
      );
      await fillAnswer(page, candidates[attempt % Math.max(1, candidates.length)] ?? "");
      return;
    }
    case "conversation": {
      // Cena: cada fala com lacuna pede escolher → Verificar; erro → "Tentar de novo" no próprio passo.
      // Memória entre remontagens: a opção que o passo aceitou em cada fala.
      const triedByTurn = sceneTried;
      const solvedByTurn = sceneSolved;
      for (let i = 0; i < 60; i += 1) {
        if ((await labState(page)).done > 0) return;
        if (await clickByLabel(page, CONTINUE_LIKE)) continue;
        if (await clickByLabel(page, /^(Tentar de novo|Try again)$/)) continue;
        const options = (await optionButtons(page)).filter((b) => /^(Opção|Option) \d+:/.test(b.label));
        if (options.length > 0) {
          const turnKey = options.map((o) => optionText(o.label)).sort().join("|");
          const turnTried = triedByTurn.get(turnKey) ?? new Set<string>();
          triedByTurn.set(turnKey, turnTried);
          const known = solvedByTurn.get(turnKey);
          const pick =
            (known ? options.find((o) => optionText(o.label) === known) : undefined) ??
            options.find((o) => !turnTried.has(optionText(o.label))) ??
            options[i % options.length];
          turnTried.add(optionText(pick.label));
          await pick.locator.click({ timeout: 1_500 }).catch(() => undefined);
          await page.waitForTimeout(150);
          await clickByLabel(page, SUBMIT);
          await page.waitForTimeout(220);
          // Acerto = painel de sucesso da fala (erro pode virar ramo de reparo, sem "Tentar de novo").
          const right = await lab(page).locator('[role="status"].longyu-success-bloom').first().isVisible().catch(() => false);
          if (right) solvedByTurn.set(turnKey, optionText(pick.label));
          continue;
        }
        if (await clickByLabel(page, SUBMIT)) continue;
        if (await clickByLabel(page, /Toque para ouvir|Tap to listen/)) continue;
        break;
      }
      return;
    }
    default: {
      // choice / audio_choice / image_choice / map: tenta cada opção (por rótulo).
      await pickUntried();
    }
  }
}

type KindResult = {
  kind: string;
  interaction: string;
  graded: boolean;
  correctPath: boolean;
  wrongPathSeen: boolean;
  retryAfterWrong: boolean;
  secondSample: "pass" | "single-sample" | "fail";
  wrongProbe?: "seen" | "n/a" | "missing";
  attempts: number;
};

async function solve(page: Page, kind: string, contract: StepAdvanceContract): Promise<Omit<KindResult, "secondSample">> {
  let wrongPathSeen = false;
  let retryAfterWrong = false;
  const tried = new Set<string>();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await attemptStep(page, kind, contract, attempt, tried);
    const state = await settle(page);
    if (process.env.DEBUG_STEPS) console.log(kind, "attempt", attempt, JSON.stringify(state), (await visibleButtons(page)).map((b) => b.label.slice(0, 24)).join(" | "));
    if (state.mistakes > 0) wrongPathSeen = true;
    // Avaliado ou não vem do próprio passo (ex.: tom guiado não é teste).
    const graded = (await lab(page).locator("[data-step-graded]").first().getAttribute("data-step-graded").catch(() => null)) !== "false";
    // `onDone()` sem valor = variante não avaliada (ex.: tom guiado, "ainda não é teste").
    if (state.done > 0 && (state.correct === "true" || ((!graded || !contract.graded || state.correct === "undefined") && state.correct !== "false"))) {
      return { kind, interaction: contract.interaction, graded: contract.graded, correctPath: true, wrongPathSeen, retryAfterWrong, attempts: attempt + 1 };
    }
    if (state.done > 0 && state.correct === "false") wrongPathSeen = true;
    // Errou (ou ficou sem ação): remonta como o "Tentar de novo" do player.
    await page.locator("[data-qa-step-retry]").click();
    await page.waitForTimeout(200);
    if (wrongPathSeen) retryAfterWrong = true;
  }
  return { kind, interaction: contract.interaction, graded: contract.graded, correctPath: false, wrongPathSeen, retryAfterWrong, attempts: 10 };
}

const CHOICE_LIKE = new Set(["choice", "audio_choice", "image_choice", "tone_choice", "map"]);

/**
 * Erro DELIBERADO: escolhe uma opção errada (ou digita algo errado, ou forma um
 * par trocado) e prova que o passo registra o erro — `onMistake` ou
 * `onDone(false)` — sem travar. Retorna "n/a" quando a amostra não é avaliada
 * (ex.: tom guiado) ou o tipo corrige dentro do próprio componente.
 */
async function probeWrong(page: Page, contract: StepAdvanceContract): Promise<"seen" | "n/a" | "missing"> {
  const step = await stepJson(page);
  if (contract.interaction === "tone_choice" && step.assist !== "quiz") return "n/a";
  const wanted = answerCandidates(step);
  const registered = async () => {
    const state = await settle(page, 3);
    return state.mistakes > 0 || (state.done > 0 && state.correct === "false");
  };
  const remount = async () => {
    await page.locator("[data-qa-step-retry]").click();
    await page.waitForTimeout(200);
  };
  // Resposta errada que passa pela validação de formato (hànzì).
  const WRONG_TEXT = "猫狗猫狗";
  if (step.kind === "conversation_repair") {
    // Estratégia errada só dá dica no próprio passo; a frase errada é o erro avaliado.
    const strategies = await optionButtons(page);
    for (const strategy of strategies) {
      await strategy.locator.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(140);
      if (await lab(page).locator("input:visible, textarea:visible").first().isVisible().catch(() => false)) break;
    }
    if (!(await fillAnswer(page, WRONG_TEXT))) return "missing";
    const seen = await registered();
    await remount();
    return seen ? "seen" : "missing";
  }
  if (CHOICE_LIKE.has(contract.interaction)) {
    for (let i = 0; i < 6; i += 1) {
      if (contract.interaction === "tone_choice") await clickByLabel(page, /^Ouvir$|^Listen$/);
      const options = (await optionButtons(page)).filter((o) => !wanted.includes(optionText(o.label)));
      const option = options[i % Math.max(1, options.length)];
      if (!option) return "missing";
      await option.locator.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(160);
      if (await registered()) {
        await remount();
        return "seen";
      }
      await remount();
    }
    return "missing";
  }
  if (contract.interaction === "typing" || contract.interaction === "speech_or_typing") {
    // Forma irreconhecível "não conta como erro" (de propósito); o erro avaliado
    // precisa ser mandarim válido e errado — com a peça obrigatória, quando houver.
    const requiredTerms = (step.requiredTerms as string[] | undefined) ?? [];
    const required = requiredTerms[0] ?? "";
    // Escrita guiada: só as peças obrigatórias, sem completar a frase, é a resposta errada avaliada.
    const wrongs = [requiredTerms.join(" "), "再见", "谢谢", `${required}再见`, `${required}谢谢你`, "我是老师"].filter((w) => w && !wanted.includes(w));
    for (const wrong of wrongs) {
      if (!(await fillAnswer(page, wrong))) return "n/a";
      const seen = await registered();
      if (seen) {
        await remount();
        return "seen";
      }
      await remount();
    }
    return "missing";
  }
  if (contract.interaction === "token_build") {
    const parts = (step.target as string[]) ?? (step.targetParts as string[]) ?? (step.routeParts as string[]) ?? [];
    const reversed = [...parts].reverse();
    if (parts.length < 2 || reversed.join("") === parts.join("")) return "n/a";
    if (await fillAnswer(page, reversed.join(""))) {
      // Campo de digitação (ditado): ordem trocada é uma resposta errada.
    } else {
      await placePieces(page, reversed);
    }
    const seen = await registered();
    await remount();
    return seen ? "seen" : "missing";
  }
  if (contract.interaction === "pairs") {
    const lefts = lab(page).locator('[data-pair-side="left"]');
    const id = await lefts.first().getAttribute("data-pair-id");
    await lefts.first().click().catch(() => undefined);
    await page.waitForTimeout(120);
    await lab(page).locator(`[data-pair-side="right"]:not([data-pair-id="${id}"])`).first().click().catch(() => undefined);
    await page.waitForTimeout(260);
    const seen = (await labState(page)).mistakes > 0 || (await lab(page).locator('[data-pair-wrong="true"]').count()) > 0;
    await remount();
    return seen ? "seen" : "missing";
  }
  return "n/a";
}

const results: KindResult[] = [];

test.describe("RC2.2.14 — contrato de avanço por StepKind (laboratório)", () => {
  test.describe.configure({ mode: "parallel" });

  for (const kind of KINDS) {
    const contract = STEP_ADVANCE_CONTRACT[kind];
    test(`${kind}: resposta certa conclui; erro tem saída; mesmo tipo em sequência conclui`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width: 390, height: 844 });
      await seedTelemetryDeclined(page);
      await allowE2ELocalSession(page);
      await page.goto(`/qa/step-lab?kind=${kind}`);
      await waitForLazyPage(page);
      await expect(page.locator("[data-qa-step-lab]")).toBeVisible({ timeout: 90_000 });
      await expect(page.locator("[data-qa-step-missing]")).toHaveCount(0);

      // Erro deliberado primeiro: registra o erro e não trava; depois a remontagem responde certo.
      const wrongProbe = await probeWrong(page, contract);
      expect(wrongProbe, `${kind}: resposta errada não registrou erro`).not.toBe("missing");
      const first = await solve(page, kind, contract);
      expect(first.correctPath, `${kind}: caminho certo não concluiu o passo`).toBe(true);

      // Segunda amostra do MESMO tipo: o latch da anterior não pode vazar.
      await page.locator("[data-qa-step-next]").click();
      await page.waitForTimeout(250);
      const sampleA = first;
      const second = await solve(page, kind, contract);
      const result: KindResult = {
        ...sampleA,
        wrongProbe,
        secondSample: second.correctPath ? "pass" : "fail",
      };
      results.push(result);
      expect(second.correctPath, `${kind}: segunda amostra do mesmo tipo não concluiu`).toBe(true);
      fs.mkdirSync("test-results", { recursive: true });
      const existing = fs.existsSync(RESULTS_FILE) ? (JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8")) as KindResult[]) : [];
      fs.writeFileSync(RESULTS_FILE, JSON.stringify([...existing.filter((row) => row.kind !== kind), result], null, 1));
    });
  }
});
