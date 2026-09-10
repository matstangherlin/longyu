import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedLeagueDemoSession,
  seedMissionsSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import {
  expectCultureLessonPlayer,
  playCultureLessonToVictory,
  readCulturePersist,
} from "./culture-lesson-helpers";

const FLAGSHIP = ["visiting-home", "host-insistence", "shared-dishes", "digital-pay", "metro-qr"] as const;

async function mockSpeech(page: Parameters<typeof test>[0] extends never ? never : import("@playwright/test").Page) {
  await page.addInitScript(() => {
    class FakeUtterance {
      text = "";
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [],
        cancel() {},
        pause() {},
        resume() {},
        speak(u: FakeUtterance) {
          window.setTimeout(() => u.onend?.(), 20);
        },
      },
    });
    (window as Window & { SpeechSynthesisUtterance?: typeof FakeUtterance }).SpeechSynthesisUtterance = FakeUtterance;
  });
}

async function skipIntros(page: import("@playwright/test").Page, max = 12) {
  for (let i = 0; i < max; i += 1) {
    const kind = await page.locator("[data-current-step-kind]").getAttribute("data-current-step-kind");
    if (kind && kind !== "intro") return kind;
    const entendi = page.getByRole("button", { name: /^(Entendi|Got it)$/ }).first();
    if (await entendi.isVisible().catch(() => false) && !(await entendi.isDisabled().catch(() => true))) {
      await entendi.click().catch(() => undefined);
      await page.waitForTimeout(120);
      continue;
    }
    break;
  }
  return page.locator("[data-current-step-kind]").getAttribute("data-current-step-kind");
}

test.describe("V4.9.8A.2 Culture playability", () => {
  test("qingwen-ask uses real sentence_build pieces and disables Verificar", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/qingwen-ask");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "qingwen-ask");
    await expect(page.getByTestId("culture-save")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Salvar para depois|Save for later/ })).toHaveCount(0);

    const orderPrompt = page.getByText(/Ordene o pedido a um desconhecido no corredor/);
    for (let i = 0; i < 14; i += 1) {
      if (await orderPrompt.isVisible().catch(() => false)) break;
      await page.getByRole("button", { name: /^(Entendi|Got it)$/ }).click().catch(() => undefined);
      await page.waitForTimeout(120);
    }
    await expect(orderPrompt).toBeVisible();
    await expect(page.locator("[data-current-step-kind]")).toHaveAttribute("data-current-step-kind", "sentence_build");
    await expect(page.getByRole("button", { name: /请问/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /地铁站怎么走/ }).first()).toBeVisible();
    const check = page.getByRole("button", { name: /^(Verificar|Check)$/ }).first();
    await expect(check).toBeDisabled();
    await page.getByRole("button", { name: /请问/ }).first().click();
    await expect(check).toBeEnabled();
  });

  test("Hub save lives on the card, not inside the player", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l3");
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const show = page.getByTestId("culture-show-categories");
    if (await show.isVisible().catch(() => false)) await show.click().catch(() => undefined);
    const filterAll = page.getByTestId("culture-filter-all");
    if (await filterAll.isVisible().catch(() => false)) await filterAll.click().catch(() => undefined);
    const card = page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]');
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByTestId("culture-save")).toBeVisible();
    await card.locator("a").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "visiting-home");
    await expect(page.getByTestId("culture-save")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Salvar para depois|Save for later/ })).toHaveCount(0);
  });
});

test.describe("V4.9.8A.2 Culture stories + audio", () => {
  for (const itemId of FLAGSHIP) {
    test(`${itemId} has Mandarin speech, audio replay, and can finish`, async ({ page }) => {
      test.setTimeout(120_000);
      await mockSpeech(page);
      await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
      await page.goto(`/cultura/${itemId}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expectCultureLessonPlayer(page, itemId);

      let sawAudio = false;
      for (let i = 0; i < 10; i += 1) {
        if (await page.getByTestId("culture-story-audio").isVisible().catch(() => false)) {
          sawAudio = true;
          const listen = page.getByRole("button", { name: /Ouvir|Listen/i }).first();
          await expect(listen).toBeVisible();
          await listen.click();
          break;
        }
        const entendi = page.getByRole("button", { name: /^(Entendi|Got it)$/ }).first();
        if (await entendi.isVisible().catch(() => false)) await entendi.click().catch(() => undefined);
        else break;
        await page.waitForTimeout(120);
      }
      expect(sawAudio).toBe(true);

      await playCultureLessonToVictory(page);
      await expect(page.getByTestId("culture-victory")).toBeVisible();
      await expect(page.getByTestId("culture-xp")).toBeVisible();
      await expect(page.getByTestId("culture-score")).toBeVisible();
    });
  }
});

test.describe("V4.9.8A.2 Live leagues", () => {
  test("fixture cloud ranking shows real names, weekly XP, and not Demonstração", async ({ page }) => {
    await seedLeagueDemoSession(page, 40);
    await page.addInitScript(() => {
      localStorage.setItem(
        "longyu-league-live-fixture",
        JSON.stringify({
          weekKey: "fixture-week",
          users: [
            { id: "user-a", displayName: "Ana", weeklyXp: 100 },
            { id: "user-b", displayName: "Matheus", weeklyXp: 80 },
            { id: "user-c", displayName: "João", weeklyXp: 40, isMe: true },
          ],
        })
      );
    });
    await page.goto("/ligas");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("league-demo-banner")).toHaveCount(0);
    await expect(page.getByText("Demonstração")).toHaveCount(0);
    await expect(page.getByTestId("league-live-banner")).toBeVisible();
    const rows = page.getByTestId("league-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Ana");
    await expect(rows.nth(0).getByTestId("league-xp")).toContainText("100");
    await expect(rows.nth(1)).toContainText("Matheus");
    await expect(rows.nth(1).getByTestId("league-xp")).toContainText("80");
    await expect(page.locator('[data-league-you="true"]')).toContainText(/Você|João/);
    await expect(page.locator('[data-league-you="true"]').getByTestId("league-xp")).toContainText("40");
  });

  test("culture first completion feeds weekly XP once; replay does not", async ({ page }) => {
    test.setTimeout(120_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20, weeklyXp: 40, xpWeekKey: "2026-W37" });
    await page.addInitScript(() => {
      localStorage.setItem(
        "longyu-league-live-fixture",
        JSON.stringify({
          weekKey: "fixture-week",
          users: [
            { id: "user-a", displayName: "Ana", weeklyXp: 100 },
            { id: "user-b", displayName: "Matheus", weeklyXp: 80 },
            { id: "user-c", displayName: "João", weeklyXp: 40, isMe: true },
          ],
        })
      );
    });
    await page.goto("/cultura/thanks-keqi");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await playCultureLessonToVictory(page);
    const afterFirst = await readCulturePersist(page);
    expect(afterFirst.completedLessons).toContain("culture-thanks-keqi");
    expect(afterFirst.points).toBeGreaterThan(0);

    await page.goto("/ligas");
    await waitForLazyPage(page);
    const you = page.locator('[data-league-you="true"]');
    await expect(you).toBeVisible();
    const xpText = await you.getByTestId("league-xp").innerText();
    const firstXp = Number(xpText.replace(/[^\d]/g, ""));
    expect(firstXp).toBeGreaterThanOrEqual(40);

    await page.goto("/licao/culture-thanks-keqi/player?src=cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-xp")).toContainText("+0");
    const afterReplay = await readCulturePersist(page);
    expect(afterReplay.points).toBe(afterFirst.points);
  });
});

const CULTURE_ITEM_IDS = [
  "greetings-nihao",
  "thanks-keqi",
  "qingwen-ask",
  "gift-receiving",
  "teacher-title",
  "four-and-eight",
  "family-terms",
  "mid-autumn",
  "spring-festival",
  "host-insistence",
  "shared-dishes",
  "chopsticks-rest",
  "digital-pay",
  "metro-qr",
  "bargaining-context",
  "office-hours",
  "dragon-boat",
  "qingming",
  "visiting-home",
  "hotel-checkin-register",
] as const;

test.describe("V4.9.8A.2 all culture lessons have a playable scored step", () => {
  test("every canonical culture lesson renders an interactive control", async ({ page }) => {
    test.setTimeout(240_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    for (const itemId of CULTURE_ITEM_IDS) {
      await page.goto(`/cultura/${itemId}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expectCultureLessonPlayer(page, itemId);
      const kind = await skipIntros(page, 16);
      expect(kind, itemId).toBeTruthy();
      expect(kind, itemId).not.toBe("intro");
      const interactive = page.locator(
        "[data-sentence-build] button, [data-match-pairs-board] button, button[aria-label^='Opção'], button[aria-label^='Peça'], button[aria-label^='Option'], button[aria-label^='Piece']"
      );
      await expect(interactive.first(), itemId).toBeVisible();
    }
  });
});

test.describe("V4.9.8A.2 mobile 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("qingwen order pieces stay above sticky Verify", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/qingwen-ask");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const orderPrompt = page.getByText(/Ordene o pedido a um desconhecido no corredor/);
    for (let i = 0; i < 14; i += 1) {
      if (await orderPrompt.isVisible().catch(() => false)) break;
      await page.getByRole("button", { name: /^(Entendi|Got it)$/ }).click().catch(() => undefined);
      await page.waitForTimeout(120);
    }
    const piece = page.getByRole("button", { name: /请问/ }).first();
    await expect(piece).toBeVisible();
    const box = await piece.boundingBox();
    const check = page.getByRole("button", { name: /^(Verificar|Check)$/ }).first();
    const checkBox = await check.boundingBox();
    expect(box).toBeTruthy();
    expect(checkBox).toBeTruthy();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((checkBox?.y ?? 0) + 8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);
  });
});
