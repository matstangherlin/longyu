import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";
import { ALL_LESSONS } from "../src/data/journey";

const FIRST = ALL_LESSONS[0];
const SECOND = ALL_LESSONS[1];
const ARTIFACT_DIR = "/opt/cursor/artifacts";
const VICTORY = /Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente/i;

const PASS_EXPECT = {
  1: {
    heading: /Lição concluída/,
    lesson: /Lição 1 de 4 concluída/,
    remaining: /Faltam 3 lições/,
    nextDetail: /Lição 2 de 4 · Consolidação/,
    ring: "1/4",
  },
  2: {
    heading: /Lição concluída/,
    lesson: /Lição 2 de 4 concluída/,
    remaining: /Faltam 2 lições/,
    nextDetail: /Lição 3 de 4 · Produção/,
    ring: "2/4",
  },
  3: {
    heading: /Lição concluída/,
    lesson: /Lição 3 de 4 concluída/,
    remaining: /Falta 1 lição/,
    nextDetail: /Lição 4 de 4 · Domínio/,
    ring: "3/4",
  },
  4: {
    heading: /Tema dominado/,
    lesson: /4 de 4 concluídas/,
    remaining: /Tema dominado/,
    nextDetail: /Tema dominado/,
    ring: "4/4",
  },
} as const;

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

async function capture(page: Page, name: string) {
  try {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: `${ARTIFACT_DIR}/${name}.png`, fullPage: true });
  } catch {
    /* CI sem /opt/cursor/artifacts */
  }
}

async function playOpenStep(page: Page): Promise<boolean> {
  const production = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
  if (await production.isVisible().catch(() => false)) {
    await production.fill("你好").catch(() => undefined);
    return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Responder$/, /^Continuar$/]);
  }
  if ((await page.locator("[data-conversation-scene]").count()) > 0) {
    const option = page.getByRole("button", { name: /^Opção \d+:/ });
    if (await option.first().isVisible().catch(() => false)) {
      const preferred = page.getByRole("button", { name: /Opção \d+:.*(你好|Olá|nǐ hǎo)/i }).first();
      if (await preferred.isVisible().catch(() => false)) await clickIfEnabled(preferred);
      else await clickIfEnabled(option.first());
      return clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/, /^Concluir$/]);
    }
    return clickFirstVisible(page, [/^Responder$/, /^Concluir$/, /^Continuar$/]);
  }
  return false;
}

async function playUntilVictory(page: Page, lessonId: string, targetLevel: number) {
  const playerUrl = `/licao/${lessonId}/player`;
  const victoryCopy = page.getByTestId("topic-victory-copy");
  const victoryBtn = page.getByRole("button", { name: VICTORY });
  const frame = page.locator("[data-lesson-player-frame]");
  const deadline = Date.now() + 90_000;
  let waitedForPass = false;
  for (let steps = 0; steps < 80 && Date.now() < deadline; steps += 1) {
    await dismissBlockingOverlays(page);
    if (await victoryCopy.isVisible().catch(() => false)) return;
    if (await victoryBtn.first().isVisible().catch(() => false) && (await masteryLevel(page, lessonId)) >= targetLevel) {
      return;
    }
    if (!page.url().includes("/player")) {
      await page.goto(playerUrl);
      await waitForLazyPage(page);
      waitedForPass = false;
      continue;
    }
    const reviewOffer = page.locator("[data-review-offer]");
    if (await reviewOffer.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar$/]);
      await page.waitForTimeout(250);
      continue;
    }
    if (!waitedForPass && (await frame.isVisible().catch(() => false))) {
      const passAttr = await frame.getAttribute("data-mastery-pass");
      if (passAttr && passAttr !== String(targetLevel)) {
        await expect
          .poll(async () => page.locator("[data-lesson-player-frame]").getAttribute("data-mastery-pass"), {
            timeout: 12_000,
          })
          .toBe(String(targetLevel));
      }
      waitedForPass = true;
    }
    if (await clickFirstVisible(page, [/^Pular/])) {
      await page.waitForTimeout(180);
      continue;
    }
    if (await playOpenStep(page)) {
      await page.waitForTimeout(180);
      continue;
    }
    const advanced = await advanceOneStep(page);
    if (!advanced) await advanceUntilVisible(page, victoryBtn, 2);
  }
  await expect(victoryCopy, `vitória da pass ${targetLevel} deve aparecer`).toBeVisible({ timeout: 5_000 });
}

async function returnToJourney(page: Page) {
  const primary = page.getByTestId("topic-victory-return");
  await expect(primary).toBeVisible();
  await expect(primary).toHaveText(/Voltar à Jornada|Receber recompensas/i);
  await expect(page.getByRole("button", { name: /^Continuar tema$/i })).toHaveCount(0);
  await primary.click();
  await page.waitForTimeout(350);
  if (await page.getByTestId("topic-victory-copy").isVisible().catch(() => false)) {
    await page.getByTestId("topic-victory-return").click();
    await page.waitForTimeout(350);
  }
  const streak = page.getByRole("button", { name: /Continuar jornada/i });
  if (await streak.isVisible().catch(() => false)) {
    await streak.click();
    await page.waitForTimeout(350);
  }
  await page.waitForURL(/\/jornada/, { timeout: 10_000 });
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

async function openTopicFromJourney(page: Page, lessonId: string) {
  if (!/\/jornada/.test(page.url())) {
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
  }
  await page.locator(`[data-lesson-id="${lessonId}"]`).first().click();
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

async function startPassFromDetail(page: Page) {
  await page.getByRole("button", { name: /Começar|Continuar|Praticar novamente/ }).click();
  await page.locator("[data-lesson-player-frame]").waitFor({ timeout: 15_000 });
}

test.describe("V4.6.1 Journey return after each pass", () => {
  test("0/4 → M1 vitória → Jornada 1/4 → mesmo nó M2 → 4/4 destrava o próximo", async ({ page }) => {
    test.setTimeout(300_000);
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
    await capture(page, "v461-journey-0-of-4");

    await openTopicFromJourney(page, FIRST.id);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4 · Descoberta");
    await startPassFromDetail(page);

    await playUntilVictory(page, FIRST.id, 1);
    await expect(page.getByTestId("topic-victory-copy")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(PASS_EXPECT[1].heading);
    await expect(page.getByTestId("topic-victory-lesson")).toContainText(PASS_EXPECT[1].lesson);
    await expect(page.getByTestId("topic-victory-remaining")).toContainText(PASS_EXPECT[1].remaining);
    await expect(page.getByTestId("topic-victory-return")).toBeVisible();
    await expect(page.url()).toContain("/player");
    await capture(page, "v461-victory-m1-faltam-3");

    await returnToJourney(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    await expect(page).not.toHaveURL(/\/player/);
    await capture(page, "v461-journey-1-of-4-next-locked");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByText(/4 lições|4\/4|bloquead|liberar este tema/i).first()).toBeVisible();

    await openTopicFromJourney(page, FIRST.id);
    await expect(page.getByTestId("topic-pass-label")).toContainText(PASS_EXPECT[1].nextDetail);
    await capture(page, "v461-detail-licao-2-de-4");
    await startPassFromDetail(page);

    await playUntilVictory(page, FIRST.id, 2);
    await expect(page.getByTestId("topic-victory-lesson")).toContainText(PASS_EXPECT[2].lesson);
    await expect(page.getByTestId("topic-victory-remaining")).toContainText(PASS_EXPECT[2].remaining);
    await returnToJourney(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "2/4");

    await openTopicFromJourney(page, FIRST.id);
    await expect(page.getByTestId("topic-pass-label")).toContainText(PASS_EXPECT[2].nextDetail);
    await startPassFromDetail(page);
    await playUntilVictory(page, FIRST.id, 3);
    await expect(page.getByTestId("topic-victory-lesson")).toContainText(PASS_EXPECT[3].lesson);
    await expect(page.getByTestId("topic-victory-remaining")).toContainText(PASS_EXPECT[3].remaining);
    await returnToJourney(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "3/4");

    await openTopicFromJourney(page, FIRST.id);
    await expect(page.getByTestId("topic-pass-label")).toContainText(PASS_EXPECT[3].nextDetail);
    await startPassFromDetail(page);
    await playUntilVictory(page, FIRST.id, 4);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(PASS_EXPECT[4].heading);
    await expect(page.getByTestId("topic-victory-lesson")).toContainText(PASS_EXPECT[4].lesson);
    await capture(page, "v461-victory-m4-tema-dominado");
    await returnToJourney(page);

    const firstNode = page.locator(`[data-lesson-id="${FIRST.id}"]`).first();
    await expect(firstNode).toHaveAttribute("data-topic-progress", "4/4");
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
    await capture(page, "v461-journey-4-of-4-next-unlocked");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4");
    await expect(page.getByRole("button", { name: /Começar/ })).toBeVisible();
  });
});
