import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedInterfaceLocale,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";
import { ALL_LESSONS } from "../src/data/journey";

const FIRST = ALL_LESSONS[0];
const VICTORY =
  /Continue Journey|Back to the Journey|Practice again|Continue topic|Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente|Continuar tema/i;

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
    return clickFirstVisible(page, [/^Verificar$|^Check$/, /^Confirmar$|^Confirm$/, /^Responder$|^Answer$/, /^Continuar$|^Continue$/]);
  }
  if ((await page.locator("[data-conversation-scene]").count()) > 0) {
    const option = page.getByRole("button", { name: /^(Opção|Option) \d+:/ });
    if (await option.first().isVisible().catch(() => false)) {
      const preferred = page.getByRole("button", { name: /(Opção|Option) \d+:.*(你好|Olá|Hello|nǐ hǎo)/i }).first();
      if (await preferred.isVisible().catch(() => false)) await clickIfEnabled(preferred);
      else await clickIfEnabled(option.first());
      return clickFirstVisible(page, [/^Verificar$|^Check$/, /^Confirmar$|^Confirm$/, /^Continuar$|^Continue$/, /^Concluir$|^Finish$/]);
    }
    return clickFirstVisible(page, [/^Responder$|^Answer$/, /^Concluir$|^Finish$/, /^Continuar$|^Continue$/]);
  }
  return false;
}

async function completeCurrentPass(page: Page, lessonId: string, targetLevel: number) {
  const playerUrl = `/licao/${lessonId}/player`;
  await page.goto(playerUrl);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const victory = page.getByRole("button", { name: VICTORY });
  const frame = page.locator("[data-lesson-player-frame]");
  const deadline = Date.now() + 90_000;
  let waitedForPass = false;
  for (let steps = 0; steps < 80 && Date.now() < deadline; steps += 1) {
    const level = await masteryLevel(page, lessonId);
    if (level >= targetLevel) return;
    await dismissBlockingOverlays(page);
    const reviewOffer = page.getByRole("heading", { name: /pontos para firmar|Lesson review|points to lock in|Revisão da lição/i });
    if (await reviewOffer.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar$|^Continue$/]);
      await page.waitForTimeout(250);
      continue;
    }
    if (await victory.first().isVisible().catch(() => false)) {
      await victory.first().click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(400);
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
    if (await clickFirstVisible(page, [/^Pular|^Skip/, /Não posso falar agora|I can't speak now/])) {
      await page.waitForTimeout(180);
      continue;
    }
    if (await playOpenStep(page)) {
      await page.waitForTimeout(180);
      continue;
    }
    const advanced = await advanceOneStep(page);
    if (!advanced) await advanceUntilVisible(page, victory, 2);
  }
  expect(
    await masteryLevel(page, lessonId),
    `EN pass should reach mastery ${targetLevel} (url=${page.url()})`
  ).toBeGreaterThanOrEqual(targetLevel);
}

test.describe("V4.8.2 first 20 Journey English", () => {
  test("Journey + topic 1 chrome EN keeps Mandarin", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("What is Mandarin?").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Start/ }).first()).toBeVisible();
    await expect(page.getByText("Começar", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-hanzi='你好'], [data-hanzi='龙语']").first()).toBeVisible({ timeout: 8_000 }).catch(() => undefined);

    await page.goto(`/licao/${FIRST.id}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lesson 1 of 4");
    await expect(page.getByTestId("topic-pass-label")).toContainText("Discovery");
    await expect(page.getByRole("button", { name: /Start/ })).toBeVisible();
    await expect(page.getByText("Lição 1 de 4")).toHaveCount(0);
    await expect(page.getByText("Descoberta")).toHaveCount(0);
  });

  test("Topic 1 M1→M4 in English", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "4/4 EN walk is Chromium-only; node parity covers all 20 topics.");
    test.setTimeout(240_000);
    await seedInterfaceLocale(page, "en");
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });

    await completeCurrentPass(page, FIRST.id, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");

    await completeCurrentPass(page, FIRST.id, 2);
    await completeCurrentPass(page, FIRST.id, 3);
    await completeCurrentPass(page, FIRST.id, 4);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator(`[data-lesson-id="${FIRST.id}"]`)).toHaveAttribute("data-topic-progress", "4/4");
    await expect(page.getByText("What is Mandarin?").first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
