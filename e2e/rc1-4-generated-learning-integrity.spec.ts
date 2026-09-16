import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";
import {
  advanceOneStep,
  advanceSkipThroughOverlays,
  advanceUntilVisible,
  clickFirstVisible,
  clickIfEnabled,
} from "./lesson-player-helpers";
import { getLesson } from "../src/data/journey";
import { lessonRoundStepsFor } from "../src/features/lesson/lessonTasks";

/**
 * RC1.4 — Generated Learning Integrity + #261 lab mastery preservation (browser).
 */

const VICTORY = /Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente|Continuar tema|Practice again|Back to the Journey/i;

async function masteryLevel(page: Page, lessonId: string): Promise<number> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw) as {
        state?: { lessonMasteryById?: Record<string, { level?: number }> };
      };
      return parsed.state?.lessonMasteryById?.[id]?.level ?? 0;
    } catch {
      return 0;
    }
  }, lessonId);
}

async function playOpenStep(page: Page): Promise<boolean> {
  const production = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
  if (await production.isVisible().catch(() => false)) {
    await production.fill("你好").catch(() => undefined);
    return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Responder$/, /^Continuar$/]);
  }
  if (await page.locator("[data-conversation-scene]").first().isVisible().catch(() => false)) {
    const option = page.getByRole("button", { name: /^Opção \d+:/ });
    if (await option.first().isVisible().catch(() => false)) {
      await clickIfEnabled(option.first());
      return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/, /^Concluir$/]);
    }
    return clickFirstVisible(page, [/^Responder$/, /^Concluir$/, /^Continuar$/]);
  }
  return false;
}

async function completeCurrentPass(page: Page, lessonId: string, targetLevel: number) {
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const victory = page.getByRole("button", { name: VICTORY });
  const deadline = Date.now() + 120_000;
  for (let steps = 0; steps < 100 && Date.now() < deadline; steps += 1) {
    if ((await masteryLevel(page, lessonId)) >= targetLevel) return;
    await dismissBlockingOverlays(page);
    if (await victory.isVisible().catch(() => false)) {
      // Só sai depois que o anel subir — clicar Victory cedo demais não conta.
      await victory.click().catch(() => undefined);
      await page.waitForTimeout(500);
      if ((await masteryLevel(page, lessonId)) >= targetLevel) return;
      // Se a Victory navegou para /jornada sem subir o anel, volta ao player.
      if (!page.url().includes("/player")) {
        await page.goto(`/licao/${lessonId}/player`);
        await waitForLazyPage(page);
      }
      continue;
    }
    if (await advanceSkipThroughOverlays(page)) continue;
    if (await playOpenStep(page)) {
      await page.waitForTimeout(180);
      continue;
    }
    const advanced = await advanceOneStep(page);
    if (!advanced) await advanceUntilVisible(page, victory, 2);
  }
  const level = await masteryLevel(page, lessonId);
  expect(level, `esperava mastery ≥ ${targetLevel} após Pass ${targetLevel}, ficou ${level}`).toBeGreaterThanOrEqual(
    targetLevel
  );
}

test.describe("RC1.4 · lab mastery #261", () => {
  test("P24.2 — p2-ma-primeiro-tom em 3/4 pede Continuar; em 4/4 vira Praticar novamente", async ({
    browser,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "anel 4/4 ponta a ponta no Chromium");
    test.setTimeout(90_000);
    const lessonId = "p2-ma-primeiro-tom";

    // ── Estado 3/4 (Pass 4 disponível) ────────────────────────────────────
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await seedLessonPlayerReady(page, lessonId, { masteryLevel: 3, folego: 20 });
      await page.goto(`/licao/${lessonId}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      expect(await masteryLevel(page, lessonId)).toBe(3);
      await expect(page.locator("[data-topic-progress]")).toHaveAttribute("data-topic-progress", "3/4");
      await expect(page.getByTestId("topic-pass-label")).toContainText(/Lição 4 de 4|Domínio/i);
      await expect(page.getByRole("button", { name: /Continuar/i }).first()).toBeVisible();
      await context.close();
    }

    // ── Estado 4/4 (tema dominado) — transição Pass 4 nos gates Node ───────
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await seedLessonPlayerReady(page, lessonId, { masteryLevel: 4, folego: 20 });
      await page.goto(`/licao/${lessonId}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      expect(await masteryLevel(page, lessonId)).toBe(4);
      await expect(page.locator("[data-topic-progress]")).toHaveAttribute("data-topic-progress", "4/4");
      await expect(page.getByRole("button", { name: /Praticar novamente|Practice again/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /^Continuar(\s|\+)/i })).toHaveCount(0);

      await page.goto("/jornada");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const node = page.locator(`[data-lesson-id="${lessonId}"]`).first();
      await expect(node).toHaveAttribute("data-topic-progress", "4/4");

      await page.goto(`/licao/${lessonId}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await page.reload();
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      expect(await masteryLevel(page, lessonId)).toBe(4);
      await expect(page.locator("[data-topic-progress]")).toHaveAttribute("data-topic-progress", "4/4");
      await expect(page.getByRole("button", { name: /Praticar novamente|Practice again/i }).first()).toBeVisible();
      await context.close();
    }
  });
});

test.describe("RC1.4 · generated fixtures", () => {
  for (const fix of [
    { id: "p2-comparar-tom-2-3", pass: 4 as const, answer: "麻", prompt: /2º tom|2o tom/i },
    { id: "p4-num-910", pass: 4 as const, answer: "十", prompt: /十/ },
    { id: "p4-char-zhong", pass: 2 as const, answer: "中", prompt: /中/ },
    { id: "l19-logica-ma", pass: 2 as const, answer: "妈", prompt: /pista sonora|马/ },
  ]) {
    test(`surfaces ${fix.id}#${fix.pass} → ${fix.answer}`, async ({ page }) => {
      const lesson = getLesson(fix.id);
      expect(lesson).toBeTruthy();
      const steps = lessonRoundStepsFor(lesson!, { masteryPass: fix.pass });
      const generated = steps.find(
        (step) => step.correctAnswer === fix.answer && step.generatedTaskTrace
      );
      expect(generated).toBeTruthy();
      const prompt =
        generated!.dialoguePrompt || generated!.situationPt || generated!.prompt || "";
      expect(prompt).toMatch(fix.prompt);
      expect(generated!.explanation ?? "").toContain(fix.answer);

      await seedLessonPlayerReady(page, fix.id, { masteryLevel: fix.pass - 1, folego: 20 });
      await page.goto(`/licao/${fix.id}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("[data-review-integrity]")).toHaveCount(0);
    });
  }
});

test.describe("RC1.4 · review keeps target", () => {
  test("P24.1 — feedback canônico alinhado em zhong e ma", async ({ page }) => {
    for (const lessonId of ["p4-char-zhong", "l19-logica-ma"]) {
      const lesson = getLesson(lessonId);
      expect(lesson).toBeTruthy();
      const steps = lessonRoundStepsFor(lesson!, { masteryPass: 2 });
      const target = steps[0]?.correctAnswer as string;
      expect(target).toBeTruthy();

      await seedLessonPlayerReady(page, lessonId, { masteryLevel: 1, folego: 20 });
      await page.goto(`/licao/${lessonId}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);

      for (let i = 0; i < 10; i += 1) {
        const options = page.locator("[data-exercise-option]:visible");
        if ((await options.count()) >= 2) {
          const labels = await options.allInnerTexts();
          const wrong = labels.find((label) => label.trim() && !label.includes(target));
          if (wrong) {
            await page.locator("[data-exercise-option]:visible", { hasText: wrong }).first().click();
            await page.waitForTimeout(300);
            const body = await page.locator("body").innerText();
            if (/Resposta certa|Correct answer|ANSWER_INTEGRITY/i.test(body)) {
              if (/ANSWER_INTEGRITY_MISMATCH/i.test(body)) {
                throw new Error(`${lessonId}: fail-closed disparou — generator ainda incoerente`);
              }
              expect(body).toContain(target);
            }
            break;
          }
        }
        await advanceOneStep(page);
      }
    }
  });
});
