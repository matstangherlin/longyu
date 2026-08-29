import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedInterfaceLocale,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";

const VICTORY =
  /Continue Journey|Back to the Journey|Practice again|Continue topic|Continuar Jornada|Voltar à Jornada|Receber recompensas|Claim rewards|Praticar novamente|Continuar tema/i;

const REPRESENTATIVE = [
  { id: "p2-comparar-tom-2-3", title: /Compare the 2nd and 3rd tones/i, kind: "tone" },
  { id: "p2-sons-brasileiros", title: /Sounds English speakers mix up/i, kind: "pronunciation" },
  { id: "l9", title: /Introducing myself/i, kind: "conversation" },
  { id: "p3-ordem-das-palavras", title: /Word Order Matters/i, kind: "grammar" },
  { id: "l14", title: /Basic radicals/i, kind: "vocabulary" },
  { id: "p4-char-mu", title: /木/, kind: "transfer" },
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

test.describe("V4.8.3 topics 21–50 Journey English", () => {
  test("Review hub chrome is English", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedUnlockedLessonSession(page, "p2-comparar-tom-2-3");
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
  });

  for (const topic of REPRESENTATIVE) {
    test(`Topic ${topic.id} (${topic.kind}) opens in English`, async ({ page }) => {
      await seedInterfaceLocale(page, "en");
      await seedUnlockedLessonSession(page, topic.id);
      await page.goto(`/licao/${topic.id}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByText(topic.title).first()).toBeVisible();
      await expect(page.getByText("Começar", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Descoberta", { exact: true })).toHaveCount(0);

      await page.goto(`/licao/${topic.id}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const blocked = page.getByRole("heading", { name: /Lesson blocked for today|Lição bloqueada por hoje/i });
      await expect(blocked).toHaveCount(0);
      await expect(page.getByText(/no Treino de tons com nota mínima/)).toHaveCount(0);
      await expect(page.locator("[data-lesson-player-frame], [data-lesson-activity-scroll]").first()).toBeVisible();
      await expect(page.getByText("Cargas do Dragão", { exact: true })).toHaveCount(0);
    });
  }

  test("Topic 21 Discovery M1 in English", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "M1 EN walk is Chromium-only; node parity covers all 30 topics.");
    test.setTimeout(180_000);
    await seedInterfaceLocale(page, "en");
    await seedUnlockedLessonSession(page, "p2-comparar-tom-2-3");
    await completeCurrentPass(page, "p2-comparar-tom-2-3", 1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
