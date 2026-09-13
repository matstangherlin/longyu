import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC1.2 P17 — migração de quem já usava o app antes da RC1.1.
 *
 * A RC1.1 adicionou dois campos de estado: `topicPassStarsById` e
 * `plusRoundById`. Um aluno que instalou antes disso tem um snapshot sem eles.
 *
 * O risco real não é o campo faltar — é a leitura desse campo derrubar a
 * hidratação e levar junto o progresso inteiro. Este arquivo carrega um
 * snapshot legado de verdade e confere que nada se perde e que os campos novos
 * nascem com default seguro.
 */

const STORE_KEY = "longyu-v1";

/** Snapshot de uma conta anterior à RC1.1: sem os campos novos, de propósito. */
function legacyState() {
  const now = Date.now();
  return {
    accountSetupComplete: true,
    completedLessons: ["l1", "l2", "l3"],
    lessonStarsById: { l1: 3, l2: 2, l3: 3 },
    lessonMasteryById: {
      l1: { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now },
      l2: { level: 2, passCount: 2, lastPass: 2, recoveryPending: false, updatedAt: now },
    },
    learnedChars: ["ni", "hao"],
    learnedChunks: ["nihao", "xiexie"],
    xpTotal: 480,
    points: 120,
    streak: 5,
    folego: 4,
    srs: {
      "chunk:nihao": {
        id: "chunk:nihao",
        type: "chunk",
        itemId: "nihao",
        ease: 2.5,
        intervalDays: 3,
        due: now + 86_400_000,
        reps: 2,
        lapses: 0,
        createdAt: now - 400_000,
      },
    },
    achievementsUnlocked: { "jornada-primeira-licao": now },
    holdAchievementModals: true,
    // Nem topicPassStarsById nem plusRoundById: é esse o ponto.
  };
}

async function seedLegacy(page: Page, version: number) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ key, payload }: { key: string; payload: string }) => {
      localStorage.setItem(key, payload);
    },
    { key: STORE_KEY, payload: JSON.stringify({ state: legacyState(), version }) }
  );
}

async function readState(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const state = parsed.state ?? {};
    return {
      completed: (state.completedLessons as string[] | undefined)?.length ?? 0,
      stars: state.lessonStarsById as Record<string, number> | undefined,
      mastery: state.lessonMasteryById as Record<string, { level?: number }> | undefined,
      xpTotal: state.xpTotal as number | undefined,
      streak: state.streak as number | undefined,
      chars: (state.learnedChars as string[] | undefined)?.length ?? 0,
      chunks: (state.learnedChunks as string[] | undefined)?.length ?? 0,
      srsKeys: Object.keys((state.srs as Record<string, unknown>) ?? {}).length,
      topicPassStarsById: state.topicPassStarsById,
      plusRoundById: state.plusRoundById,
    };
  }, STORE_KEY);
}

// A versão persistida anterior à RC1.1 e a atual. Ambas precisam hidratar.
for (const version of [21, 24]) {
  test(`P17 — snapshot legado (version ${version}) não perde progresso`, async ({ page }) => {
    await seedLegacy(page, version);
    await page.goto("/jornada");
    await waitForLazyPage(page);

    // O app precisa MONTAR: uma migração que quebra derruba a tela inteira.
    await expect
      .poll(
        async () =>
          page.evaluate(() => Boolean(document.getElementById("root")?.childElementCount)),
        { timeout: 15_000, message: "#root vazio: a hidratação do snapshot legado quebrou" }
      )
      .toBe(true);

    const state = await readState(page);
    expect(state, "estado persistido sumiu").not.toBeNull();
    if (!state) return;

    // Nada do que o aluno já tinha pode desaparecer.
    expect(state.completed, "lições concluídas perdidas").toBeGreaterThanOrEqual(3);
    expect(state.stars?.l1, "estrelas perdidas").toBe(3);
    expect(state.mastery?.l1?.level, "mastery perdida").toBe(4);
    expect(state.xpTotal, "XP perdido").toBeGreaterThanOrEqual(480);
    expect(state.streak, "ofensiva perdida").toBeGreaterThanOrEqual(5);
    expect(state.chars, "caracteres aprendidos perdidos").toBeGreaterThanOrEqual(2);
    expect(state.chunks, "chunks aprendidos perdidos").toBeGreaterThanOrEqual(2);
    expect(state.srsKeys, "SRS perdido").toBeGreaterThanOrEqual(1);

    // Os campos da RC1.1 nascem vazios — nunca `undefined` explodindo numa
    // leitura, e nunca inventando uma Plus já concluída.
    for (const field of [state.topicPassStarsById, state.plusRoundById]) {
      expect(
        field === undefined || (typeof field === "object" && field !== null),
        "campo novo precisa ser objeto ou ausente, nunca lixo"
      ).toBe(true);
    }
    expect(
      Object.keys((state.plusRoundById as Record<string, unknown>) ?? {}),
      "migração não pode inventar Reforço + concluído"
    ).toHaveLength(0);
  });
}

test("P17 — a Jornada de um snapshot legado continua navegável", async ({ page }) => {
  await seedLegacy(page, 21);
  await page.goto("/jornada");
  await waitForLazyPage(page);
  // Ponteiro de progresso presente: a Jornada hidratou de verdade, não é casca.
  await expect(page.locator('[aria-current="step"]')).toBeVisible({ timeout: 15_000 });

  await page.goto("/licao/l2");
  await waitForLazyPage(page);
  await expect(page.getByTestId("topic-pass-label")).toBeVisible({ timeout: 15_000 });
});
