import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedCourseDirection, seedOnboardedSession, switchCourseInSettings, waitForLazyPage } from "./helpers";

/**
 * RC2.2.15 — Palavra do dia.
 *
 * Settings → Notificações → Vocabulário diário ON → janela → plano (o mesmo
 * que o Android agendaria, exposto em builds de teste) → palavra → áudio →
 * prática → PracticeCompletion → Revisão.
 */

type PlanNotification = { id: number; at: number; title: string; body: string; lexicalId: string; dayKey: string; channelId: string };
type Plan = { notifications: PlanNotification[]; assignments: { dateKey: string; lexicalId: string }[]; skipped: { dateKey: string; reason: string }[] };

async function openApp(page: Page, course: "pt-zh" | "en-zh" = "pt-zh") {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedCourseDirection(page, course);
  await seedOnboardedSession(page, ["l1", "l2", "l3"], { replace: false });
}

async function enableDailyVocabulary(page: Page) {
  await page.goto("/config/notificacoes");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const card = page.getByTestId("daily-vocabulary-settings");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-enabled", "false");
  await card.getByRole("switch").click();
  await expect(card).toHaveAttribute("data-enabled", "true");
}

async function plan(page: Page, now?: number): Promise<Plan> {
  return page.evaluate((at) => (window as unknown as { __longyuDailyVocabularyPlan: (n?: number) => Plan }).__longyuDailyVocabularyPlan(at), now);
}

async function store(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const state = (raw ? JSON.parse(raw).state : {}) as Record<string, unknown>;
    const daily = state.dailyVocabulary as { exposures?: Array<Record<string, unknown>> } | undefined;
    return {
      srsKeys: Object.keys((state.srs as Record<string, unknown>) ?? {}),
      learnedChars: (state.learnedChars as string[]) ?? [],
      learnedChunks: (state.learnedChunks as string[]) ?? [],
      xpTotal: Number(state.xpTotal ?? 0),
      pearls: Number(state.pearls ?? 0),
      badges: ((state.badges as unknown[]) ?? []).length,
      streak: Number(state.streak ?? 0),
      lastStudyDate: state.lastStudyDate ?? null,
      exposures: daily?.exposures ?? [],
    };
  });
}

async function practice(page: Page, answers: { meaning: string; hanzi: string }) {
  await page.getByTestId("daily-word-learn").click();
  await expect(page.getByTestId("daily-word-practice")).toBeVisible();
  const frame = page.getByTestId("daily-word-practice");
  for (let i = 0; i < 40; i += 1) {
    if (await page.getByTestId("daily-word-done").isVisible().catch(() => false)) return;
    const pick = frame
      .locator("button:visible")
      .filter({ hasText: new RegExp(`^\\s*\\d?\\s*(${escape(answers.meaning)}|${escape(answers.hanzi)})\\s*$`) })
      .first();
    if (await pick.isVisible().catch(() => false) && (await pick.isEnabled().catch(() => false))) {
      await pick.click();
      await page.waitForTimeout(120);
    }
    const actions = page.getByRole("button", { name: /^(Verificar|Check|Continuar|Continue|Entendi|Got it|Não posso falar agora|I can't speak now)$/ });
    let clicked = false;
    for (let a = 0; a < (await actions.count()); a += 1) {
      const action = actions.nth(a);
      if ((await action.isVisible().catch(() => false)) && (await action.isEnabled().catch(() => false))) {
        await action.click();
        clicked = true;
        break;
      }
    }
    if (clicked) {
      await page.waitForTimeout(250);
      continue;
    }
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId("daily-word-done")).toBeVisible();
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("RC2.2.15 — Palavra do dia", () => {
  test("Settings: opt-in, janela 18:00–21:00, plano de 7 dias dentro da janela e 1 por dia", async ({ page }) => {
    await openApp(page);
    await enableDailyVocabulary(page);
    await expect(page.getByTestId("daily-vocabulary-start")).toHaveValue("18:00");
    await expect(page.getByTestId("daily-vocabulary-end")).toHaveValue("21:00");
    await expect(page.getByTestId("daily-vocabulary-web-note")).toBeVisible();

    // Plano a partir de 09:00 de hoje: 7 dias, horário determinístico dentro da janela.
    const nineAm = await page.evaluate(() => {
      const d = new Date();
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    });
    const first = await plan(page, nineAm);
    expect(first.notifications.length).toBeGreaterThan(0);
    expect(first.notifications.length).toBeLessThanOrEqual(7);
    const days = new Set(first.notifications.map((n) => n.dayKey));
    expect(days.size, "no máximo 1 por dia").toBe(first.notifications.length);
    const ids = new Set(first.notifications.map((n) => n.id));
    expect(ids.size).toBe(first.notifications.length);
    for (const n of first.notifications) {
      expect(n.id).toBeGreaterThanOrEqual(8100);
      expect(n.id).toBeLessThanOrEqual(8106);
      expect(n.channelId).toBe("vocabulary");
      const minutes = await page.evaluate((at) => new Date(at).getHours() * 60 + new Date(at).getMinutes(), n.at);
      expect(minutes).toBeGreaterThanOrEqual(18 * 60);
      expect(minutes).toBeLessThanOrEqual(21 * 60);
      // Hànzì + pinyin no título; significado no corpo.
      expect(n.title).toMatch(/^[一-鿿]+ · \S/);
      expect(n.body.split("\n")[0].length).toBeGreaterThan(0);
    }
    const words = new Set(first.notifications.map((n) => n.lexicalId));
    expect(words.size, "palavras diferentes em dias diferentes").toBe(first.notifications.length);
    // Determinístico: mesma entrada, mesmo plano.
    expect(await plan(page, nineAm)).toEqual(first);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
  });

  test("janela no horário silencioso é explicada e ajustada; exemplo não agenda nada", async ({ page }) => {
    await openApp(page);
    await enableDailyVocabulary(page);
    await page.getByTestId("daily-vocabulary-start").fill("23:00");
    await page.getByTestId("daily-vocabulary-end").fill("23:30");
    const problem = page.getByTestId("daily-vocabulary-window-problem");
    await expect(problem).toBeVisible();
    await expect(problem).toContainText("horário silencioso");
    await page.getByTestId("daily-vocabulary-adjust").click();
    await expect(problem).toHaveCount(0);
    await page.getByTestId("daily-vocabulary-preview-toggle").click();
    const preview = page.getByTestId("daily-vocabulary-preview");
    await expect(preview.locator("[data-preview-title]")).toHaveText(/^[一-鿿]+ · \S/);
    await expect(preview).toContainText("nada foi agendado");
  });

  test("palavra do dia: abrir não ensina; praticar entra na revisão com +2 XP uma vez", async ({ page }) => {
    await openApp(page);
    await enableDailyVocabulary(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const card = page.getByTestId("daily-word-card");
    await expect(card).toBeVisible();
    const lexicalId = (await card.getAttribute("data-lexical-id"))!;
    const before = await store(page);

    await card.click();
    await expect(page.getByTestId("daily-word")).toBeVisible();
    const hanzi = (await page.getByTestId("daily-word-hanzi").textContent())!.trim();
    const meaning = (await page.getByTestId("daily-word-meaning").textContent())!.trim();
    await expect(page.getByRole("button", { name: /Ouvir/ }).first()).toBeVisible();
    // Acima da dobra: hànzì, pinyin, significado e o CTA.
    const cta = await page.getByTestId("daily-word-learn").boundingBox();
    expect(cta!.y + cta!.height).toBeLessThanOrEqual(844);
    await expect(page.getByTestId("daily-word-learn")).toHaveText("Aprender esta palavra");

    // Abrir: só openedAt. Sem SRS, sem aprendido, sem XP.
    const opened = await store(page);
    expect(opened.srsKeys).toEqual(before.srsKeys);
    expect(opened.learnedChars).toEqual(before.learnedChars);
    expect(opened.learnedChunks).toEqual(before.learnedChunks);
    expect(opened.xpTotal).toBe(before.xpTotal);
    expect(opened.exposures.find((e) => e.lexicalId === lexicalId)?.openedAt).toBeTruthy();

    await practice(page, { meaning, hanzi });
    const done = page.getByTestId("daily-word-done");
    await expect(done).toHaveAttribute("data-xp", "2");
    await expect(done).toContainText("Adicionada à sua revisão.");
    await expect(page.getByTestId("practice-completion")).toBeVisible();
    const after = await store(page);
    expect(after.xpTotal).toBe(before.xpTotal + 2);
    expect(after.srsKeys.length).toBeGreaterThan(before.srsKeys.length);
    // Revisão sim; "aprendido" (usado por provas) não.
    expect(after.learnedChars).toEqual(before.learnedChars);
    expect(after.learnedChunks).toEqual(before.learnedChunks);
    expect(after.pearls).toBe(before.pearls);
    expect(after.badges).toBe(before.badges);
    expect(after.lastStudyDate).toBe(before.lastStudyDate);
    expect(after.exposures.find((e) => e.lexicalId === lexicalId)?.practicedAt).toBeTruthy();

    // Praticar de novo: nada de XP.
    await page.goto(`/palavra-do-dia/${lexicalId}`);
    await waitForLazyPage(page);
    await practice(page, { meaning, hanzi });
    await expect(page.getByTestId("daily-word-done")).toHaveAttribute("data-xp", "0");
    expect((await store(page)).xpTotal).toBe(before.xpTotal + 2);

    // Praticada: o card some da Jornada; aparece em Descobertas no Atlas.
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.getByTestId("daily-word-card")).toHaveCount(0);
    await page.goto("/hanzi/atlas");
    await waitForLazyPage(page);
    await expect(page.locator(`[data-discovery="${lexicalId}"]`)).toHaveAttribute("data-discovery-status", "practiced");
  });

  test("curso en-zh: significado em inglês na notificação e na página, interface em português", async ({ page }) => {
    await openApp(page);
    await enableDailyVocabulary(page);
    const pt = await plan(page);
    await switchCourseInSettings(page, "en-zh");
    const en = await plan(page);
    expect(en.notifications.length).toBeGreaterThan(0);
    const first = en.notifications[0];
    // Mesmo dia, mesma palavra (histórico mantido); significado trocado.
    const samePt = pt.notifications.find((n) => n.dayKey === first.dayKey);
    if (samePt && samePt.lexicalId === first.lexicalId) expect(first.body).not.toBe(samePt.body);
    await page.goto(`/palavra-do-dia/${first.lexicalId}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("daily-word-meaning")).toHaveText(first.body.split("\n")[0]);
    await expect(page.getByTestId("daily-word-learn")).toHaveText("Aprender esta palavra");
  });

  test("deep link com id desconhecido não abre nada", async ({ page }) => {
    await openApp(page);
    await page.goto("/palavra-do-dia/v_nao_existe");
    await waitForLazyPage(page);
    await expect(page.getByTestId("daily-word-not-found")).toBeVisible();
    await page.goto("/palavra-do-dia/..%2F..%2Fconfig");
    await waitForLazyPage(page);
    await expect(page.getByTestId("daily-word")).toHaveCount(0);
  });

  test("desligado: sem card e sem plano", async ({ page }) => {
    await openApp(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("daily-word-card")).toHaveCount(0);
    expect((await plan(page)).notifications).toEqual([]);
  });
});
