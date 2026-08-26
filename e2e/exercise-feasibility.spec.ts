import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";

const FOUNDATION = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
] as const;

type StepSnapshot = {
  kind: string;
  graded: boolean;
  reflection: boolean;
  eyebrow: string;
  title: string;
  body: string;
  hasQuestionCount: boolean;
  hasChoice: boolean;
  hasPieces: boolean;
  hasBuilder: boolean;
  hasProduction: boolean;
  hasVerify: boolean;
  hasMatch: boolean;
  hasSpeak: boolean;
  hasSkip: boolean;
  hasAudio: boolean;
  hasContinue: boolean;
  hasScene: boolean;
};

async function drainBlockingModals(page: Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const closed = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')];
      const visible = dialogs.filter((dialog) => dialog.getClientRects().length > 0);
      if (visible.length === 0) return false;
      for (const dialog of visible) {
        const buttons = [...dialog.querySelectorAll<HTMLButtonElement>("button")];
        const dismiss = buttons.find((button) =>
          /^(Continuar|Fechar|Ok|Entendi)$/i.test((button.textContent ?? "").replace(/\s+/g, " ").trim())
        );
        if (dismiss) {
          dismiss.click();
          return true;
        }
      }
      return false;
    });
    if (!closed) {
      await dismissBlockingOverlays(page);
      return;
    }
    await page.waitForTimeout(120);
  }
}

async function readStepSnapshot(page: Page): Promise<StepSnapshot | null> {
  return page.evaluate(() => {
    const root = document.querySelector("[data-step-kind]");
    if (!root) return null;
    const visibleEl = (el: Element | null) => Boolean(el && (el as HTMLElement).getClientRects().length > 0);
    const buttons = [...document.querySelectorAll("button")].filter((button) => visibleEl(button));
    const names = buttons.map((button) => {
      const text = (button.textContent ?? "").replace(/\s+/g, " ").trim();
      const aria = (button.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim();
      return `${text} ${aria}`.trim();
    });
    const frame = document.querySelector("[data-lesson-player-frame]");
    const body = (frame?.textContent ?? "").replace(/\s+/g, " ");
    return {
      kind: root.getAttribute("data-step-kind") ?? "",
      graded: root.getAttribute("data-step-graded") === "true",
      reflection: root.getAttribute("data-step-reflection") === "true",
      eyebrow: document.querySelector("[data-step-eyebrow]")?.getAttribute("data-step-eyebrow") ?? "",
      title: document.querySelector("h2")?.textContent ?? "",
      body,
      hasQuestionCount: /pergunta \d+\/\d+/i.test(body),
      hasChoice: names.some((name) => /Opção \d+:/i.test(name)),
      hasPieces: names.some((name) => /Peça /i.test(name)),
      hasBuilder: visibleEl(document.querySelector("[data-hanzi-builder], [data-production-help-build]")),
      hasProduction: visibleEl(document.querySelector("[data-production-answer]")),
      hasVerify: names.some((name) => /\b(Verificar|Confirmar|Responder)\b/i.test(name)),
      hasMatch: /\d+\/\d+ pares/i.test(body),
      hasSpeak: names.some((name) => /Falar|Ou falar/i.test(name)),
      hasSkip: names.some((name) => /Pular/i.test(name)),
      hasAudio: names.some((name) => /Ouvir|Ouça/i.test(name)),
      hasContinue: names.some((name) => /^(Entendi|Continuar|Concluir)\b/i.test(name)),
      hasScene: visibleEl(document.querySelector("[data-conversation-scene]")),
    };
  });
}

function assertCoherentSnapshot(snapshot: StepSnapshot) {
  if (snapshot.reflection) {
    expect(snapshot.eyebrow, "reflexão não usa título Diga").not.toMatch(/Diga/i);
    expect(snapshot.title, "reflexão não se chama Diga").not.toMatch(/^Diga\b/i);
    expect(snapshot.hasQuestionCount, "reflexão não conta como pergunta").toBe(false);
  }

  const deadCombo =
    /reflexão opcional/i.test(snapshot.body) &&
    /diga sem apoio extra/i.test(snapshot.body) &&
    /montar o caractere-alvo/i.test(snapshot.body) &&
    /sugestão[\s\S]*木|sugestão 木/i.test(snapshot.body);
  expect(deadCombo, "tela QA humana Reflexão + Diga + 木").toBe(false);

  if (!snapshot.graded) return;
  const sceneListen = snapshot.kind === "conversation_scene" && (snapshot.hasScene || snapshot.hasContinue || snapshot.hasAudio);
  const action =
    snapshot.hasChoice ||
    snapshot.hasPieces ||
    snapshot.hasBuilder ||
    snapshot.hasProduction ||
    snapshot.hasVerify ||
    snapshot.hasMatch ||
    snapshot.hasSpeak ||
    snapshot.hasSkip ||
    snapshot.hasAudio ||
    sceneListen;
  expect(action, `passo graded ${snapshot.kind} precisa de mecanismo de resposta`).toBe(true);
}

async function nativeAdvance(page: Page): Promise<string> {
  await page.evaluate(() => {
    const input = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      "[data-production-answer] textarea, [data-production-answer] input"
    );
    if (input && input.getClientRects().length > 0) {
      input.value = "nihao";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }).catch(() => undefined);

  return page.evaluate(() => {
    const visible = (el: Element | null) => Boolean(el && (el as HTMLElement).getClientRects().length > 0);
    const enabled = (button: HTMLButtonElement) => visible(button) && !button.disabled;
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")].filter(enabled);
    const labelOf = (button: HTMLButtonElement) => {
      const text = (button.textContent ?? "").replace(/\s+/g, " ").trim();
      const aria = (button.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim();
      return `${text} ${aria}`.trim();
    };

    const piece = buttons.find((button) => /Peça /i.test(labelOf(button)));
    if (piece) {
      piece.click();
      return "piece";
    }

    const builderPiece = [...document.querySelectorAll<HTMLButtonElement>("[data-hanzi-builder] button")].find(
      (button) => enabled(button) && !/^(Verificar|Pular|Continuar|Limpar)/i.test(labelOf(button))
    );
    if (builderPiece) {
      builderPiece.click();
      return "builder";
    }

    const bankPiece = [...document.querySelectorAll<HTMLButtonElement>("[data-production-help-build] button")].find(enabled);
    if (bankPiece) {
      bankPiece.click();
      return "bank";
    }

    const option = buttons.find((button) => /Opção \d+:/i.test(labelOf(button)));
    if (option) {
      option.click();
      return "option";
    }

    const skip = buttons.find((button) => /pular|não posso falar agora/i.test(labelOf(button)));
    if (skip) {
      skip.click();
      return "skip";
    }

    const next = buttons.find((button) => {
      const name = labelOf(button);
      if (/jornada|recompensas|praticar novamente/i.test(name)) return false;
      return /^(Entendi|Continuar|Verificar|Confirmar|Responder|Concluir)\b/i.test(name);
    });
    if (next) {
      next.click();
      return "next";
    }

    return "none";
  }).catch(() => "none");
}

async function isVictory(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const copy = document.querySelector("[data-testid='topic-victory-copy']");
    if (copy && (copy as HTMLElement).getClientRects().length > 0) return true;
    const buttons = [...document.querySelectorAll("button")].filter(
      (button) => (button as HTMLButtonElement).getClientRects().length > 0
    );
    return buttons.some((button) =>
      /Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente/i.test(
        (button.textContent ?? "").replace(/\s+/g, " ")
      )
    );
  }).catch(() => false);
}

async function playPass(page: Page, lessonId: string, pass: number) {
  const playerUrl = `/licao/${lessonId}/player`;
  const deadline = Date.now() + 75_000;
  let sawImeFree = false;
  let walked = 0;

  for (let steps = 0; steps < 36 && Date.now() < deadline; steps += 1) {
    if (await isVictory(page)) return { walked, sawImeFree, victory: true };
    if (!page.url().includes("/player")) {
      await page.goto(playerUrl);
      await waitForLazyPage(page);
      continue;
    }

    const snapshot = await readStepSnapshot(page);
    if (snapshot) {
      assertCoherentSnapshot(snapshot);
      walked += 1;
      if (snapshot.hasPieces || snapshot.hasBuilder) sawImeFree = true;
      if (["hanzi_build", "sentence_build", "produce", "translation_build"].includes(snapshot.kind)) {
        sawImeFree = true;
      }
      if (/[\u3400-\u9fff]/.test(snapshot.body) && snapshot.hasProduction && (snapshot.hasPieces || snapshot.hasBuilder || snapshot.hasSkip)) {
        sawImeFree = true;
      }
    }

    const moved = await nativeAdvance(page);
    if (moved === "none") {
      await drainBlockingModals(page);
      const retry = await nativeAdvance(page);
      if (retry === "none") await page.waitForTimeout(240);
    }
    await page.waitForTimeout(140);
    await drainBlockingModals(page);
  }

  expect(walked, `${lessonId} M${pass} precisa percorrer passos com ação coerente`).toBeGreaterThan(0);
  return { walked, sawImeFree, victory: await isVictory(page) };
}

test.describe("V4.6.2 exercise feasibility", () => {
  test("sentinel: p1-primeiros-hanzi M3 nunca reabre Reflexão + Diga + 木", async ({ page }) => {
    test.setTimeout(60_000);
    await seedLessonPlayerReady(page, "p1-primeiros-hanzi", { masteryLevel: 2, isPremium: true, folego: 20 });
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.querySelector("[data-lesson-player-frame]")?.getAttribute("data-mastery-pass") ?? null
          ),
        { timeout: 12_000 }
      )
      .toBe("3");
    await page.screenshot({ path: "/opt/cursor/artifacts/v462-primeiros-hanzi-m3.png", fullPage: true }).catch(() => undefined);

    for (let i = 0; i < 12; i += 1) {
      if (await isVictory(page)) break;
      const snapshot = await readStepSnapshot(page);
      if (snapshot) {
        expect(snapshot.body, "eyebrow Reflexão opcional + Diga + 木").not.toMatch(
          /Reflexão opcional[\s\S]*Diga sem apoio extra[\s\S]*木/i
        );
        expect(snapshot.body, "Diga + montar o caractere-alvo na mesma tela").not.toMatch(
          /Diga sem apoio extra[\s\S]*montar o caractere-alvo/i
        );
        expect(snapshot.body, "M3 não reabre reflexão opcional").not.toMatch(/Reflexão opcional/i);
        expect(snapshot.kind, "M3 não volta a write/free_reflection").not.toBe("write");
      }
      await nativeAdvance(page);
      await page.waitForTimeout(160);
      await drainBlockingModals(page);
    }
  });

  for (const lessonId of FOUNDATION) {
    test(`${lessonId}: quatro passes com ação coerente (Hànzì sem IME)`, async ({ page }) => {
      test.setTimeout(240_000);
      let sawImeFreeAcrossPasses = false;

      for (const pass of [1, 2, 3, 4] as const) {
        await seedLessonPlayerReady(page, lessonId, {
          masteryLevel: pass - 1,
          isPremium: true,
          folego: 20,
        });
        await page.goto(`/licao/${lessonId}/player`);
        await waitForLazyPage(page);
        await dismissBlockingOverlays(page);
        await drainBlockingModals(page);

        const frame = page.locator("[data-lesson-player-frame]");
        await expect(frame).toBeVisible({ timeout: 15_000 });
        await expect
          .poll(
            async () =>
              page.evaluate(
                () => document.querySelector("[data-lesson-player-frame]")?.getAttribute("data-mastery-pass") ?? null
              ),
            { timeout: 12_000 }
          )
          .toBe(String(pass));

        const result = await playPass(page, lessonId, pass);
        if (result.sawImeFree) sawImeFreeAcrossPasses = true;
        expect(result.walked, `${lessonId} M${pass} percorreu a UI`).toBeGreaterThan(0);
      }

      if (lessonId === "p1-o-que-e-hanzi") {
        expect(sawImeFreeAcrossPasses, "Hànzì deve oferecer peças/montagem, não só teclado chinês").toBe(true);
      }
    });
  }
});
