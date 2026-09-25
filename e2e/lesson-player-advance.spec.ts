import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { dismissBlockingOverlays, dismissJourneyCultureBridgeIfOpen, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import { advanceConversationIfOpen, clickFirstVisible } from "./lesson-player-helpers";

/**
 * RC2.2.14 · Q–AC — avanço do CURSOR no LessonPlayer real.
 *
 * O laboratório (`lesson-step-progression.spec.ts`) prova cada StepKind
 * isolado. Aqui o player inteiro: toda ação que conclui um passo move
 * `data-current-step-index` (ou encerra a lição), toque duplo não pula dois
 * passos, "tentar de novo" remonta o MESMO passo, sair para segundo plano não
 * muda o cursor, recarregar não quebra, e o rastro nunca registra `stalled`.
 */

type TraceEntry = { lessonId: string; stepIndex: number; kind: string; attempt: number; event: string };

const CONTINUE_LIKE = /^(Entendi|Got it|Continuar|Continue|Concluir|Finish|Percebi a curva|I noticed the contour|Próximo|Next)(?:\s*>)?$/i;
const SUBMIT = /^(Verificar|Check|Confirmar|Confirm|Conferir|Responder|Reply)(?:\s*>)?$/i;
const RETRY_MODAL = /Quer tentar de novo\?|Want to try again\?/;

async function trace(page: Page): Promise<TraceEntry[]> {
  return page.evaluate(() => (window as unknown as { __longyuLessonTrace?: TraceEntry[] }).__longyuLessonTrace ?? []);
}

async function cursor(page: Page): Promise<number | null> {
  const raw = await page.locator("[data-current-step-index]").first().getAttribute("data-current-step-index", { timeout: 1_000 }).catch(() => null);
  return raw == null ? null : Number(raw);
}

async function finished(page: Page): Promise<boolean> {
  return (await trace(page)).some((entry) => entry.event === "finished") || (await page.locator("[data-current-step-index]").count()) === 0;
}

async function openLesson(page: Page, lessonId: string) {
  await seedLessonPlayerReady(page, lessonId, { isPremium: true, folego: 20 });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-current-step-index]")).toBeVisible({ timeout: 20_000 });
}

/** Painel de erro do player aberto? */
async function retryModalOpen(page: Page): Promise<boolean> {
  return page.getByRole("heading", { name: RETRY_MODAL }).first().isVisible().catch(() => false);
}

/**
 * Uma "batida" genérica: faz a próxima ação razoável do passo atual.
 * Não prova pedagogia; prova que existe sempre uma saída e que ela avança.
 */
async function beat(page: Page, onMistake: "continue" | "retry" = "continue"): Promise<void> {
  if (await retryModalOpen(page)) {
    const dialog = page.getByRole("dialog").last();
    const target =
      onMistake === "retry"
        ? dialog.getByRole("button", { name: /^Tentar de novo|^Try again/ }).first()
        : dialog.getByRole("button", { name: /^Continuar$|^Continue$/ }).first();
    await target.click({ timeout: 2_000 }).catch(() => undefined);
    return;
  }
  if (await dismissJourneyCultureBridgeIfOpen(page)) return;
  if (await advanceConversationIfOpen(page)) return;
  if (await clickFirstVisible(page, [CONTINUE_LIKE, SUBMIT, /Não posso falar agora|I can't speak now/, /Não posso ouvir agora|I can't listen now/])) return;
  const frame = page.locator("[data-lesson-step-frame]");
  // Tom guiado: ouvir primeiro libera "Percebi a curva".
  const listen = frame.locator("[data-tone-first-exposure]:visible, [data-tone-listen]:visible").first();
  if (await listen.isVisible().catch(() => false)) {
    await listen.click({ timeout: 1_500 }).catch(() => undefined);
    if (await frame.locator("[data-tone-first-exposure]").count() === 0 && (await frame.locator("[data-tone-listen]").count()) === 0) return;
  }
  // Pares: esquerda → direita com o mesmo data-pair-id.
  const left = frame.locator('[data-pair-side="left"][data-pair-matched="false"]:visible').first();
  if (await left.isVisible().catch(() => false)) {
    const id = await left.getAttribute("data-pair-id");
    await left.click({ timeout: 1_500 }).catch(() => undefined);
    await page.waitForTimeout(100);
    await frame.locator(`[data-pair-side="right"][data-pair-id="${id}"]`).first().click({ timeout: 1_500 }).catch(() => undefined);
    await page.waitForTimeout(200);
    return;
  }
  const option = frame.locator("[data-option-index]:visible:not([disabled])").first();
  if (await option.isVisible().catch(() => false)) {
    await option.click({ timeout: 1_500 }).catch(() => undefined);
    return;
  }
  await clickFirstVisible(page, [/^Pular|^Skip/]);
}

/** Anda a lição até o fim; falha se o cursor ficar parado por `stuckBeats` batidas. */
async function walkLesson(page: Page, lessonId: string, stuckBeats = 30) {
  let last = await cursor(page);
  let still = 0;
  const visited = new Set<number>();
  for (let i = 0; i < 400; i += 1) {
    if (await finished(page)) return { visited: [...visited], finished: true };
    if (last != null) visited.add(last);
    await beat(page);
    await page.waitForTimeout(140);
    const now = await cursor(page);
    if (now !== last) {
      // O cursor só anda para frente, um passo por vez.
      if (now != null && last != null) expect(now, `${lessonId}: cursor pulou de ${last} para ${now}`).toBe(last + 1);
      last = now;
      still = 0;
      continue;
    }
    still += 1;
    expect(still, `${lessonId}: passo ${last} parado (${await page.locator("[data-current-step-kind]").first().getAttribute("data-current-step-kind").catch(() => "?")})`).toBeLessThan(stuckBeats);
  }
  return { visited: [...visited], finished: await finished(page) };
}

const WALK_LESSONS = ALL_LESSONS.slice(0, 4).map((lesson) => lesson.id);

test.describe("RC2.2.14 — avanço do cursor no LessonPlayer", () => {
  test.describe.configure({ mode: "parallel" });

  for (const lessonId of WALK_LESSONS) {
    test(`${lessonId}: cada conclusão avança um passo até o fim; nenhum passo trava`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: 390, height: 844 });
      await openLesson(page, lessonId);
      const result = await walkLesson(page, lessonId);
      expect(result.finished, `${lessonId}: lição não terminou`).toBe(true);
      const entries = (await trace(page)).filter((entry) => entry.lessonId === lessonId || entry.lessonId === "unknown");
      expect(entries.filter((entry) => entry.event === "stalled"), "passo travado no rastro").toHaveLength(0);
      // Todo "completed" (não duplicado) vira "advanced" ou "finished".
      const completed = entries.filter((entry) => entry.event === "completed").length;
      const moved = entries.filter((entry) => entry.event === "advanced" || entry.event === "finished").length;
      expect(moved).toBe(completed);
      await expect(page.getByTestId("step-stalled-continue")).toHaveCount(0);
    });
  }

  test("toque duplo no Continuar não pula dois passos", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openLesson(page, WALK_LESSONS[0]!);
    let checked = 0;
    for (let i = 0; i < 120 && checked < 3; i += 1) {
      if (await finished(page)) break;
      const before = await cursor(page);
      const cont = page.getByRole("button", { name: CONTINUE_LIKE }).first();
      if (before != null && !(await retryModalOpen(page)) && (await cont.isVisible().catch(() => false)) && (await cont.isEnabled().catch(() => false))) {
        await cont.dblclick({ timeout: 2_000 }).catch(() => undefined);
        await page.waitForTimeout(350);
        const after = await cursor(page);
        if (after != null && after !== before) {
          expect(after, "toque duplo avançou mais de um passo").toBe(before + 1);
          checked += 1;
        }
        continue;
      }
      await beat(page);
      await page.waitForTimeout(120);
    }
    expect(checked, "nenhum Continuar encontrado para o toque duplo").toBeGreaterThan(0);
    const advancedPerIndex = new Map<number, number>();
    for (const entry of await trace(page)) {
      if (entry.event !== "advanced") continue;
      advancedPerIndex.set(entry.stepIndex, (advancedPerIndex.get(entry.stepIndex) ?? 0) + 1);
    }
    for (const [index, count] of advancedPerIndex) expect(count, `avançou para ${index} mais de uma vez`).toBe(1);
  });

  test("erro → tentar de novo remonta o MESMO passo e depois avança", async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openLesson(page, WALK_LESSONS[0]!);
    let proved = false;
    for (let i = 0; i < 200 && !proved; i += 1) {
      if (await finished(page)) break;
      if (await retryModalOpen(page)) {
        const at = await cursor(page);
        await beat(page, "retry");
        await page.waitForTimeout(250);
        expect(await retryModalOpen(page)).toBe(false);
        expect(await cursor(page), "tentar de novo mudou de passo").toBe(at);
        // Continua do mesmo passo até sair dele.
        for (let j = 0; j < 40; j += 1) {
          if ((await cursor(page)) !== at || (await finished(page))) {
            proved = true;
            break;
          }
          await beat(page, "continue");
          await page.waitForTimeout(140);
        }
        expect(proved, `passo ${at} não avançou depois de tentar de novo`).toBe(true);
        break;
      }
      await beat(page);
      await page.waitForTimeout(120);
    }
    expect(proved, "nenhum erro avaliado apareceu para testar o tentar de novo").toBe(true);
  });

  test("segundo plano e volta não mudam o cursor; recarregar abre um passo válido", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openLesson(page, WALK_LESSONS[0]!);
    for (let i = 0; i < 60 && ((await cursor(page)) ?? 0) < 2; i += 1) {
      await beat(page);
      await page.waitForTimeout(120);
    }
    const at = await cursor(page);
    expect(at).not.toBeNull();
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pageshow"));
    });
    await page.waitForTimeout(400);
    expect(await cursor(page), "voltar do segundo plano mudou o passo").toBe(at);

    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-current-step-index]")).toBeVisible({ timeout: 20_000 });
    const kind = await page.locator("[data-current-step-kind]").first().getAttribute("data-current-step-kind");
    expect(kind).toMatch(/^[a-z][a-z0-9_]*$/);
    // Depois de recarregar, o passo continua tendo saída.
    const start = await cursor(page);
    for (let i = 0; i < 30 && (await cursor(page)) === start; i += 1) {
      await beat(page);
      await page.waitForTimeout(140);
    }
    expect((await cursor(page)) !== start || (await finished(page)), "passo depois do reload sem saída").toBe(true);
  });
});
