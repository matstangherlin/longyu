import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";

/**
 * RC2.2.17 · K–S / EL–EM — INTEGRATION ADVANCE TEST.
 *
 * O Step Lab prova o renderer; o bug real do aparelho (Etapa 4/6, "Como você
 * se chama?", Continuar não avança) exige o conjunto: plano REAL da lição +
 * LessonPlayer + estado real da cena + toque em viewport de celular.
 *
 * Para cada conversation_scene do plano real, o teste posiciona o cursor do
 * player no passo (gancho de QA só em build de fixtures), responde a cena pelo
 * grafo — com um nome REAL de aluno, para a personalização rodar — e exige
 * que o toque final avance exatamente UM passo (ou conclua a lição).
 */

const LEARNER = "Ana";

/** Lições da Jornada cujo plano autorado tem cena de conversa. */
const SCENE_LESSONS = ALL_LESSONS.filter((lesson) => lesson.steps.some((step) => step.kind === "conversation_scene")).map(
  (lesson) => lesson.id
);

async function seedNamedLearner(page: Page, lessonId: string, masteryLevel?: number) {
  await seedLessonPlayerReady(page, lessonId, { isPremium: true, masteryLevel });
  await page.addInitScript((name: string) => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state: Record<string, unknown>; version: number };
    const now = Date.now();
    parsed.state.currentAccountId = "local";
    parsed.state.accounts = { local: { id: "local", name, authMode: "local", createdAt: now, updatedAt: now } };
    localStorage.setItem("longyu-v1", JSON.stringify(parsed));
  }, LEARNER);
}

async function currentIndex(page: Page): Promise<number> {
  const value = await page.locator("[data-current-step-index]").first().getAttribute("data-current-step-index");
  return Number(value ?? "-1");
}

async function sceneSteps(page: Page): Promise<Array<{ index: number; sceneId: string | null }>> {
  await page.waitForFunction(() => Boolean((window as Window & { __longyuLessonQa?: unknown }).__longyuLessonQa), null, { timeout: 20_000 });
  return page.evaluate(() => {
    const qa = (window as Window & { __longyuLessonQa?: { steps: () => Array<{ index: number; kind: string; sceneId: string | null }> } }).__longyuLessonQa;
    return (qa?.steps() ?? []).filter((step) => step.kind === "conversation_scene").map((step) => ({ index: step.index, sceneId: step.sceneId }));
  });
}

async function jumpTo(page: Page, index: number) {
  await page.evaluate((i) => {
    (window as Window & { __longyuLessonQa?: { jumpTo: (n: number) => void } }).__longyuLessonQa?.jumpTo(i);
  }, index);
  await expect(page.locator("[data-current-step-index]").first()).toHaveAttribute("data-current-step-index", String(index));
}

/** Responde a interação aberta usando a resposta que o grafo espera. */
async function answerInteraction(page: Page): Promise<boolean> {
  const panel = page.locator("[data-conversation-interaction]").first();
  if (!(await panel.isVisible().catch(() => false))) return false;
  const type = await panel.getAttribute("data-conversation-interaction");
  const expected = ((await panel.getAttribute("data-qa-expected")) ?? "").trim();
  const norm = (value: string) => value.replace(/\s+/g, "").replace(/[。！？，.!?,]/g, "");
  if (type === "order_reply") {
    let remaining = norm(expected);
    for (let guard = 0; guard < 12 && remaining.length > 0; guard += 1) {
      const pieces = panel.locator("div.mt-3.flex.flex-wrap.gap-2 > button");
      const count = await pieces.count();
      let placed = false;
      for (let i = 0; i < count; i += 1) {
        const text = norm((await pieces.nth(i).innerText()).trim());
        if (text && remaining.startsWith(text)) {
          await pieces.nth(i).tap();
          remaining = remaining.slice(text.length);
          placed = true;
          break;
        }
      }
      if (!placed) throw new Error(`order_reply: nenhuma peça continua "${remaining}" (esperado "${expected}")`);
    }
  } else if (type === "produce_reply") {
    // Resposta digitada (sem alternativas): escreve o que o grafo espera.
    const typeMode = panel.locator("[data-conversation-mode-type]");
    if (await typeMode.isVisible().catch(() => false)) await typeMode.tap();
    const field = panel.locator("textarea, input[type='text'], input:not([type])").first();
    await field.fill(expected);
  } else {
    const options = panel.getByRole("button", { name: /^(Opção|Option) / });
    const count = await options.count();
    let picked = false;
    for (let i = 0; i < count; i += 1) {
      const label = (await options.nth(i).getAttribute("aria-label")) ?? "";
      const value = label.replace(/^(Opção|Option) [^:]+:\s*/, "");
      if (norm(value) === norm(expected)) {
        await options.nth(i).tap();
        picked = true;
        break;
      }
    }
    if (!picked) throw new Error(`${type}: opção "${expected}" não encontrada`);
  }
  await panel.getByRole("button", { name: /^(Verificar|Check)$/ }).tap();
  await panel.getByRole("button", { name: /^(Continuar|Continue)/ }).tap();
  return true;
}

/** Dirige a cena até o fim e devolve quantos toques de avanço foram feitos. */
async function driveScene(page: Page, startIndex: number): Promise<void> {
  const scene = page.locator("[data-conversation-scene]").first();
  await expect(scene).toBeVisible({ timeout: 10_000 });
  for (let beat = 0; beat < 40; beat += 1) {
    if ((await currentIndex(page)) !== startIndex) return;
    if (await page.getByTestId("lesson-victory").isVisible().catch(() => false)) return;
    if (await answerInteraction(page)) continue;
    const advance = scene.getByTestId("conversation-advance");
    if (await advance.isVisible().catch(() => false)) {
      await advance.tap();
      continue;
    }
    const reveal = scene.getByTestId("conversation-reveal-continue");
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.tap();
      continue;
    }
    await page.waitForTimeout(150);
  }
}

test.describe("RC2.2.17 · cenas de conversa avançam no LessonPlayer real", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /**
   * O caminho da captura: "Etapa 4/6", fala "Como você se chama?". No plano
   * REAL, `conversationScene("como-se-chama")` de p1/l9 é rotacionado para
   * `me-apresentando` (p1, a partir da 3ª passada = Etapa 4/6) e para a troca
   * gerada `packet-exchange-*` (l9). Os três casos são dirigidos aqui.
   */
  const DEVICE_PATHS = [
    { lessonId: "p1-primeira-conversa", masteryLevel: 2, stage: "Etapa 4/6" },
    { lessonId: "l9-qual-nome", masteryLevel: 0, stage: null },
    { lessonId: "l9-qual-nome", masteryLevel: 2, stage: null },
  ];
  for (const path of DEVICE_PATHS) {
    test(`caminho do aparelho: ${path.lessonId} (domínio ${path.masteryLevel}) — Continuar avança exatamente um passo`, async ({ page }) => {
      test.setTimeout(90_000);
      await seedNamedLearner(page, path.lessonId, path.masteryLevel);
      await page.goto(`/licao/${path.lessonId}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      if (path.stage) await expect(page.getByText(path.stage).first()).toBeVisible();
      const scenes = await sceneSteps(page);
      expect(scenes.length, "o plano real tem cena de conversa").toBeGreaterThan(0);
      const target = scenes[0];
      await jumpTo(page, target.index);
      await page.evaluate(() => {
        (window as Window & { __longyuLessonTrace?: unknown[] }).__longyuLessonTrace = [];
      });
      await driveScene(page, target.index);
      const after = await currentIndex(page);
      const finished = await page.getByTestId("lesson-victory").isVisible().catch(() => false);
      expect(finished || after === target.index + 1, `${target.sceneId}: idx ${target.index} → ${after}`).toBe(true);
      const trace = await page.evaluate(
        () => (window as Window & { __longyuLessonTrace?: Array<{ event: string; kind: string }> }).__longyuLessonTrace ?? []
      );
      const events = trace.map((entry) => entry.event);
      for (const event of ["scene_continue_pressed", "scene_onDone", "renderer_onDone", "player_handleDone", "completion_key", "advanced"]) {
        expect(events, `trace contém ${event}`).toContain(event);
      }
      expect(events.filter((event) => event === "advanced").length, "um toque = +1 passo").toBe(1);
      expect(events.filter((event) => event === "duplicate_completion").length, "sem conclusão engolida").toBe(0);
      const failed = trace.filter((entry) => entry.event === "side_effect_failed" || entry.event === "handle_done_failed").map((entry) => entry.kind);
      expect(failed, "nenhum efeito colateral falhou no fim da cena").toEqual([]);
    });
  }

  test("erro duas vezes na mesma fala: a cena mostra a resposta e avança (sem laço 5→6→5)", async ({ page }) => {
    test.setTimeout(90_000);
    await seedNamedLearner(page, "p1-primeira-conversa", 2);
    await page.goto("/licao/p1-primeira-conversa/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const [target] = await sceneSteps(page);
    await jumpTo(page, target.index);
    const scene = page.locator("[data-conversation-scene]").first();
    let wrongs = 0;
    for (let beat = 0; beat < 40 && wrongs < 2; beat += 1) {
      const panel = page.locator("[data-conversation-interaction]").first();
      if (await panel.isVisible().catch(() => false)) {
        // Resposta errada de propósito: a primeira peça/opção que não é a esperada.
        const type = await panel.getAttribute("data-conversation-interaction");
        if (type === "order_reply") {
          await panel.locator("div.mt-3.flex.flex-wrap.gap-2 > button", { hasText: "你好" }).first().tap();
        } else {
          const expected = (await panel.getAttribute("data-qa-expected")) ?? "";
          const options = panel.getByRole("button", { name: /^(Opção|Option) / });
          for (let i = 0; i < (await options.count()); i += 1) {
            const label = (await options.nth(i).getAttribute("aria-label")) ?? "";
            if (!label.includes(expected)) {
              await options.nth(i).tap();
              break;
            }
          }
        }
        await panel.getByRole("button", { name: /^(Verificar|Check)$/ }).tap();
        wrongs += 1;
        continue;
      }
      const advance = scene.getByTestId("conversation-advance");
      if (await advance.isVisible().catch(() => false)) await advance.tap();
      else await page.waitForTimeout(150);
    }
    await expect(scene.getByTestId("conversation-reveal")).toBeVisible();
    await scene.getByTestId("conversation-reveal-continue").tap();
    await driveScene(page, target.index);
    const after = await currentIndex(page);
    const finished = await page.getByTestId("lesson-victory").isVisible().catch(() => false);
    expect(finished || after === target.index + 1).toBe(true);
  });

  for (const lessonId of SCENE_LESSONS) {
    test(`todas as cenas de ${lessonId} avançam`, async ({ page }) => {
      test.setTimeout(120_000);
      await seedNamedLearner(page, lessonId);
      await page.goto(`/licao/${lessonId}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const scenes = await sceneSteps(page);
      for (const scene of scenes) {
        await jumpTo(page, scene.index);
        await driveScene(page, scene.index);
        const after = await currentIndex(page);
        const finished = await page.getByTestId("lesson-victory").isVisible().catch(() => false);
        expect(finished || after === scene.index + 1, `${lessonId} · ${scene.sceneId}: idx ${scene.index} → ${after}`).toBe(true);
        if (finished) break;
      }
    });
  }
});
