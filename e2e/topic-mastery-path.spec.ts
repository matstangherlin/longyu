import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";
import { ALL_LESSONS } from "../src/data/journey";

const FIRST = ALL_LESSONS[0];
const SECOND = ALL_LESSONS[1];
const ARTIFACT_DIR = "/opt/cursor/artifacts";

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

async function noOverlap(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "viewport sem overflow horizontal").toBeLessThanOrEqual(2);
}

async function capture(page: Page, name: string) {
  try {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: `${ARTIFACT_DIR}/${name}.png`, fullPage: true });
  } catch {
    /* CI sem /opt/cursor/artifacts */
  }
}

const VICTORY = /Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente|Continuar tema/i;

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
    if (await clickFirstVisible(page, [/^Pular/])) {
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
  const passNow = await page.locator("[data-lesson-player-frame]").getAttribute("data-mastery-pass").catch(() => null);
  expect(
    await masteryLevel(page, lessonId),
    `pass deve chegar a mastery ${targetLevel} (data-mastery-pass=${passNow ?? "n/a"}; url=${page.url()})`
  ).toBeGreaterThanOrEqual(targetLevel);
}

test.describe("V4.6 Topic Mastery Path", () => {
  test("anel 0/4 → 4/4 destrava o próximo tema (desktop)", async ({ page }) => {
    test.setTimeout(240_000);
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const current = page.locator('[aria-current="step"]');
    await expect(current).toHaveAttribute("data-topic-progress", "0/4");
    await expect(page.getByText("0/4").first()).toBeVisible();
    await capture(page, "v46-journey-0-of-4");

    await page.goto(`/licao/${FIRST.id}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4");
    await expect(page.getByTestId("topic-pass-label")).toContainText("Descoberta");
    await expect(page.getByRole("button", { name: /Começar/ })).toBeVisible();
    await capture(page, "v46-detail-licao-1-de-4");

    await completeCurrentPass(page, FIRST.id, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    await capture(page, "v46-journey-1-of-4-next-locked");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByText(/4 lições|4\/4|bloquead|liberar este tema/i).first()).toBeVisible();

    await completeCurrentPass(page, FIRST.id, 2);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "2/4");

    await completeCurrentPass(page, FIRST.id, 3);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "3/4");

    await completeCurrentPass(page, FIRST.id, 4);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const firstNode = page.locator(`[aria-label*="${FIRST.title}"]`).first();
    await expect(firstNode).toHaveAttribute("data-topic-progress", "4/4");
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
    await capture(page, "v46-journey-4-of-4-next-unlocked");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4");
    await expect(page.getByRole("button", { name: /Começar/ })).toBeVisible();
  });

  test("anel 0/4 visível no mobile e o card cabe o título longo", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 320, height: 568 });
    await seedFreshJourneySession(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
    await noOverlap(page);

    await page.goto(`/licao/${FIRST.id}`);
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { level: 1, name: FIRST.title })).toBeVisible();
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4 · Descoberta");
    await noOverlap(page);
    await capture(page, "v46-detail-320x568");
  });

  test("mobile: M1 → 1/4 e o próximo tema permanece bloqueado", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
    await completeCurrentPass(page, FIRST.id, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByText(/4 lições|4\/4|bloquead|liberar este tema/i).first()).toBeVisible();
    await capture(page, "v46-mobile-1-of-4-locked");
  });
});

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test.describe("V4.6 Topic Mastery viewports", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} sem overlap no detalhe`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedOnboardedSession(page, []);
      await page.goto(`/licao/${FIRST.id}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("topic-pass-label")).toBeVisible();
      await noOverlap(page);
    });
  }
});
