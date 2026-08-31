import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  dismissBlockingOverlays,
  seedInterfaceLocale,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";

const SHOTS = path.join(process.cwd(), "docs/reports/v487-screenshots");
const EVIDENCE_TOPICS = new Set([
  "p5-kou-ma-pergunta",
  "l25",
  "p6-rotina-trabalho",
  "l30",
  "p7-imersao-casa-amigo",
]);

const VICTORY =
  /Continue Journey|Back to the Journey|Practice again|Continue topic|Continuar Jornada|Voltar à Jornada|Receber recompensas|Claim rewards|Praticar novamente|Continuar tema/i;

const REPRESENTATIVE = [
  { id: "p5-kou-ma-pergunta", title: /口 \+ 马 = 吗/, kind: "hanzi-composition" },
  { id: "l19", title: /One to five/i, kind: "numbers" },
  { id: "l25", title: /Useful questions/i, kind: "dialogue" },
  { id: "p6-rotina-trabalho", title: /Routine and work/i, kind: "production" },
  { id: "p6-saude", title: /Health/i, kind: "mid-range" },
  { id: "p6-survival-mandarin", title: /Survival: pay, hotel, help/i, kind: "communication-repair" },
  { id: "l30", title: /Reading aloud/i, kind: "listening" },
  { id: "p7-imersao-casa-amigo", title: /Immersion: visit to a friend's house/i, kind: "topic-113-transfer" },
] as const;

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
      await clickIfEnabled(option.first());
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
  await expect(
    page.getByText(/no Treino de tons com nota mínima|Finish ".+" in Tone Trainer/i),
    "tone-trainer gate should already be satisfied for EN representative walks"
  ).toHaveCount(0);
  await expect(page.locator("[data-lesson-player-frame], [data-lesson-activity-scroll]").first()).toBeVisible({
    timeout: 12_000,
  });
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
    if (await clickFirstVisible(page, [/^Pular|^Skip/, /Não posso falar agora|I can't speak now|I can't listen now|Não posso ouvir agora/])) {
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

async function expectStickyActionsClearOfContent(page: Page) {
  const result = await page.locator("[data-lesson-step-frame]").evaluate((frame) => {
    const sticky = frame.querySelector<HTMLElement>("[data-lesson-sticky-actions]");
    if (!sticky) return { checked: false, overlap: 0 };
    const candidates = Array.from(frame.querySelectorAll<HTMLElement>("button, input, textarea, [role='button']"))
      .filter((element) => !sticky.contains(element) && element.getClientRects().length > 0);
    const last = candidates.at(-1);
    if (!last) return { checked: false, overlap: 0 };
    last.scrollIntoView({ block: "center" });
    const lastRect = last.getBoundingClientRect();
    const stickyRect = sticky.getBoundingClientRect();
    return { checked: true, overlap: Math.max(0, lastRect.bottom - stickyRect.top) };
  });
  if (result.checked) expect(result.overlap, "sticky CTA must not cover the final semantic control").toBe(0);
}

test.describe("V4.8.7 topics 81–113 Journey English", () => {
  test("Journey near topic 81 is English at desktop and 390×844", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedInterfaceLocale(page, "en");
    await seedUnlockedLessonSession(page, "p5-kou-ma-pergunta");
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const topic81 = page.getByText(/口 \+ 马 = 吗/).first();
    await topic81.scrollIntoViewIfNeeded();
    await expect(topic81).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "journey-near-topic-81-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await topic81.scrollIntoViewIfNeeded();
    await expect(page.locator("body")).toHaveCSS("overflow-x", /^(visible|hidden|clip|auto)$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
    await page.screenshot({ path: path.join(SHOTS, "journey-near-topic-81-mobile-390x844.png"), fullPage: true });
  });

  test("Review hub chrome is English", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedInterfaceLocale(page, "en");
    await seedUnlockedLessonSession(page, "p5-kou-ma-pergunta");
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText(/Today's review|Review/i).first()).toBeVisible();
    await expect(page.getByText("Revisão de hoje", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Plano de hoje", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Em dia", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Histórico e padrões de erro", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Confira a resposta", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "review-topics-81-113-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
    await page.screenshot({ path: path.join(SHOTS, "review-topics-81-113-mobile-390x844.png"), fullPage: true });
  });

  for (const topic of REPRESENTATIVE) {
    test(`Topic ${topic.id} (${topic.kind}) opens in English`, async ({ page }) => {
      await mkdir(SHOTS, { recursive: true });
      await seedInterfaceLocale(page, "en");
      await seedUnlockedLessonSession(page, topic.id);
      await page.goto(`/licao/${topic.id}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByText(topic.title).first()).toBeVisible();
      await expect(page.getByText("Começar", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Descoberta", { exact: true })).toHaveCount(0);
      if (EVIDENCE_TOPICS.has(topic.id)) {
        await page.screenshot({ path: path.join(SHOTS, `${topic.id}-detail.png`), fullPage: true });
      }

      await page.goto(`/licao/${topic.id}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const blocked = page.getByRole("heading", { name: /Lesson blocked for today|Lição bloqueada por hoje/i });
      await expect(blocked).toHaveCount(0);
      await expect(page.getByText(/no Treino de tons com nota mínima/)).toHaveCount(0);
      await expect(page.locator("[data-lesson-player-frame], [data-lesson-activity-scroll]").first()).toBeVisible();
      await expect(page.getByText("Cargas do Dragão", { exact: true })).toHaveCount(0);
      await expectStickyActionsClearOfContent(page);
      if (EVIDENCE_TOPICS.has(topic.id)) {
        await page.screenshot({ path: path.join(SHOTS, `${topic.id}-player.png`), fullPage: true });
      }
      if (topic.id === "p5-kou-ma-pergunta" || topic.id === "p7-imersao-casa-amigo") {
        await page.setViewportSize({ width: 390, height: 844 });
        await expectStickyActionsClearOfContent(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
        await page.screenshot({
          path: path.join(SHOTS, `${topic.id}-player-mobile-390x844.png`),
          fullPage: true,
        });
      }
    });
  }

  test("Topic 81 Discovery M1 in English", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "M1 EN walk is Chromium-only; node parity covers all 33 topics.");
    test.setTimeout(180_000);
    await seedInterfaceLocale(page, "en");
    await seedUnlockedLessonSession(page, "p5-kou-ma-pergunta");
    await completeCurrentPass(page, "p5-kou-ma-pergunta", 1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await mkdir(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, "p5-kou-ma-pergunta-m1.png"), fullPage: true });
  });
});
