import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";

const FOUNDATION = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
] as const;

const VICTORY = /Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente/i;

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

async function assertCoherentAction(page: Page) {
  const root = page.locator("[data-step-kind]").first();
  if (!(await root.isVisible().catch(() => false))) return;
  const kind = (await root.getAttribute("data-step-kind")) ?? "";
  const graded = (await root.getAttribute("data-step-graded")) === "true";
  const reflection = (await root.getAttribute("data-step-reflection")) === "true";
  const eyebrow = (await page.locator("[data-step-eyebrow]").first().textContent().catch(() => "")) ?? "";
  const title = (await page.locator("h2").first().textContent().catch(() => "")) ?? "";
  const body = (await page.locator("[data-lesson-player-frame]").innerText().catch(() => "")) ?? "";

  if (reflection) {
    expect(eyebrow, "reflexão não usa título Diga").not.toMatch(/Diga/i);
    expect(title, "reflexão não se chama Diga").not.toMatch(/^Diga\b/i);
    await expect(page.getByText(/pergunta \d+\/\d+/)).toHaveCount(0);
  }

  const deadCombo =
    /reflexão opcional/i.test(body) &&
    /diga sem apoio extra/i.test(body) &&
    /montar o caractere-alvo/i.test(body) &&
    /sugestão[\s\S]*木/i.test(body);
  expect(deadCombo, "tela QA humana Reflexão + Diga + 木").toBe(false);

  if (!graded) return;

  const hasChoice = (await page.getByRole("button", { name: /^Opção \d+:/ }).count()) > 0;
  const hasPieces = (await page.getByRole("button", { name: /^Peça \d+:/ }).count()) > 0;
  const hasBuilder = (await page.locator("[data-hanzi-builder], [data-production-help-build]").count()) > 0;
  const hasProduction = (await page.locator("[data-production-answer]").count()) > 0;
  const hasVerify = await page.getByRole("button", { name: /^Verificar$|^Confirmar$|^Responder$/ }).first().isVisible().catch(() => false);
  const hasMatch = await page.getByText(/\d+\/\d+ pares/).isVisible().catch(() => false);
  const hasSpeak = await page.getByRole("button", { name: /Falar|Ou falar/i }).first().isVisible().catch(() => false);
  expect(
    hasChoice || hasPieces || hasBuilder || hasProduction || hasVerify || hasMatch || hasSpeak,
    `passo graded ${kind} precisa de mecanismo de resposta`
  ).toBe(true);
}

async function completeWithoutIme(page: Page): Promise<boolean> {
  const pieces = page.getByRole("button", { name: /^Peça \d+:/ });
  if ((await pieces.count()) > 0 && (await pieces.first().isVisible().catch(() => false))) {
    const count = await pieces.count();
    for (let i = 0; i < Math.min(count, 8); i += 1) {
      await clickIfEnabled(pieces.nth(i));
    }
    return clickFirstVisible(page, [/Certo!|\+Qi/, /^Verificar$/, /^Confirmar$/, /^Continuar$/]);
  }
  const buildBank = page.locator("[data-production-help-build] button");
  if ((await buildBank.count()) > 0) {
    const count = await buildBank.count();
    for (let i = 0; i < Math.min(count, 6); i += 1) {
      await clickIfEnabled(buildBank.nth(i));
    }
    return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/]);
  }
  const option = page.getByRole("button", { name: /^Opção \d+:/ }).first();
  if (await option.isVisible().catch(() => false)) {
    await clickIfEnabled(option);
    return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/, /Certo!|\+Qi/]);
  }
  if (await clickFirstVisible(page, [/Não posso falar agora/, /^Pular/])) return true;
  const production = page.locator("[data-production-answer] textarea").first();
  if (await production.isVisible().catch(() => false)) {
    await production.fill("nihao").catch(() => undefined);
    return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/]);
  }
  return false;
}

async function playPass(page: Page, lessonId: string, targetLevel: number) {
  const playerUrl = `/licao/${lessonId}/player`;
  const victoryCopy = page.getByTestId("topic-victory-copy");
  const victoryBtn = page.getByRole("button", { name: VICTORY });
  const deadline = Date.now() + 90_000;
  for (let steps = 0; steps < 70 && Date.now() < deadline; steps += 1) {
    await dismissBlockingOverlays(page);
    if (await victoryCopy.isVisible().catch(() => false)) return;
    if ((await victoryBtn.first().isVisible().catch(() => false)) && (await masteryLevel(page, lessonId)) >= targetLevel) {
      return;
    }
    if (!page.url().includes("/player")) {
      await page.goto(playerUrl);
      await waitForLazyPage(page);
      continue;
    }
    await assertCoherentAction(page);
    if (await clickFirstVisible(page, [/Não posso falar agora/, /^Pular/])) {
      await page.waitForTimeout(140);
      continue;
    }
    if (await completeWithoutIme(page)) {
      await page.waitForTimeout(140);
      continue;
    }
    await advanceOneStep(page);
  }
  await expect(victoryCopy, `vitória M${targetLevel} de ${lessonId}`).toBeVisible({ timeout: 4_000 });
}

test.describe("V4.6.2 exercise feasibility", () => {
  test("sentinel: p1-primeiros-hanzi M3 nunca reabre Reflexão + Diga + 木", async ({ page }) => {
    test.setTimeout(120_000);
    await seedLessonPlayerReady(page, "p1-primeiros-hanzi", { masteryLevel: 2, isPremium: true });
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => frame.getAttribute("data-mastery-pass"), { timeout: 12_000 }).toBe("3");

    for (let i = 0; i < 24; i += 1) {
      if (await page.getByTestId("topic-victory-copy").isVisible().catch(() => false)) break;
      const body = (await frame.innerText().catch(() => "")) ?? "";
      expect(body, "eyebrow Reflexão opcional + Diga + 木").not.toMatch(/Reflexão opcional[\s\S]*Diga sem apoio extra[\s\S]*木/i);
      expect(body).not.toMatch(/Diga sem apoio extra/i);
      await assertCoherentAction(page);
      if (!(await completeWithoutIme(page))) await advanceOneStep(page);
      await page.waitForTimeout(120);
    }
  });

  for (const lessonId of FOUNDATION) {
    test(`${lessonId}: quatro passes com ação coerente (Hànzì sem IME)`, async ({ page }) => {
      test.setTimeout(360_000);
      const index = FOUNDATION.indexOf(lessonId);
      if (index <= 0) {
        await seedFreshJourneySession(page, { isPremium: true, points: 40, holdAchievementModals: true });
      } else {
        await seedFoundationThrough(page, FOUNDATION[index - 1]);
        await page.addInitScript(() => {
          const raw = localStorage.getItem("longyu-v1");
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
            parsed.state = {
              ...(parsed.state ?? {}),
              isPremium: true,
              serverIsPro: true,
              points: 40,
              folego: 20,
              holdAchievementModals: true,
            };
            localStorage.setItem("longyu-v1", JSON.stringify(parsed));
          } catch {
            /* seed ainda aplica na primeira navegação */
          }
        });
      }

      for (const pass of [1, 2, 3, 4] as const) {
        await page.goto(`/licao/${lessonId}/player`);
        await waitForLazyPage(page);
        await dismissBlockingOverlays(page);
        await drainBlockingModals(page);
        await playPass(page, lessonId, pass);
        await drainBlockingModals(page);
        const returnBtn = page.getByTestId("topic-victory-return");
        if (await returnBtn.isVisible().catch(() => false)) {
          await returnBtn.click({ timeout: 4_000 }).catch(() => undefined);
        }
        await waitForLazyPage(page);
      }
      expect(await masteryLevel(page, lessonId)).toBeGreaterThanOrEqual(4);
    });
  }
});
