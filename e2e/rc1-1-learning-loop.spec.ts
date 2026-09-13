import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";

/**
 * RC1.1 — Learning Loop Hardening (P25–P32).
 *
 * O que estas specs protegem veio de QA real: a revisão que parava depois de
 * responder, a correção muda, o "Monte a frase" debaixo de um objetivo de tom,
 * o "Tema dominado" com média 2.0 e a Victory virando dashboard.
 *
 * Tudo aqui é pela UI, contra o build de preview. A lógica pura (média, escada
 * de remediação, sanitização de TTS) tem cobertura própria nos gates Node
 * `test:adaptive-plus-round`, `test:adaptive-remediation-diversity` e
 * `test:feedback-audio` — repeti-la via `import()` dinâmico aqui testaria o
 * bundler, não o aplicativo.
 */

const STORE_KEY = "longyu-v1";
/**
 * Versão ATUAL do store, não a 21 que `helpers.ts` usa.
 *
 * Aquelas specs semeiam uma versão antiga de propósito, para exercitar as
 * migrações. Aqui o assunto é outro — `topicPassStarsById` e `plusRoundById`
 * são campos desta remessa —, então a semente entra já na versão corrente e o
 * teste mede o comportamento, não o caminho de migração.
 */
const STORE_VERSION = 24;

type SeedState = Record<string, unknown>;

async function seedStore(page: Page, state: SeedState) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ key, payload }: { key: string; payload: string }) => {
      localStorage.setItem(key, payload);
    },
    { key: STORE_KEY, payload: JSON.stringify({ state, version: STORE_VERSION }) }
  );
}

function mastered(lessonIds: string[]) {
  const now = Date.now();
  return Object.fromEntries(
    lessonIds.map((id) => [id, { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now }])
  );
}

/** Quatro rodadas concluídas com as estrelas dadas, para exercitar a média. */
function fourRounds(stars: [number, number, number, number]) {
  return { 1: stars[0], 2: stars[1], 3: stars[2], 4: stars[3] };
}

/**
 * Fila de revisão com itens realmente devidos.
 *
 * Sem isto as specs de revisão caem em `test.skip` por fila vazia — e o P0
 * ("a revisão trava depois de responder") ficaria sem cobertura, que é
 * justamente o bloqueador desta remessa.
 */
function dueReviewSrs() {
  const now = Date.now();
  const base = { ease: 2.5, intervalDays: 1, due: now - 100_000, reps: 1, lapses: 0, createdAt: now - 200_000 };
  return {
    "chunk:nihao": { id: "chunk:nihao", type: "chunk", itemId: "nihao", ...base },
    "chunk:xiexie": { id: "chunk:xiexie", type: "chunk", itemId: "xiexie", ...base },
    "chunk:zaijian": { id: "chunk:zaijian", type: "chunk", itemId: "zaijian", ...base },
  };
}

// ── P28/P29 — o gatilho do Reforço +, pela tela do tema ────────────────────

test.describe("RC1.1 · Reforço +", () => {
  test("P28 — média 2.75 conclui o tema e não oferece Reforço +", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2"],
      lessonMasteryById: mastered(["l1", "l2"]),
      lessonStarsById: { l1: 3, l2: 3 },
      // 3 + 3 + 3 + 2 = 2.75 → acima do limite.
      topicPassStarsById: { l2: fourRounds([3, 3, 3, 2]) },
    });
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-topic-plus-round]")).toHaveCount(0);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("fazer reforço +");
  });

  test("P29 — média 2.0 oferece Reforço + e o tema não é anunciado como dominado", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2"],
      lessonMasteryById: mastered(["l1", "l2"]),
      lessonStarsById: { l1: 3, l2: 2 },
      // 2 + 2 + 2 + 2 = 2.0 → exatamente no limite, abre a Plus.
      topicPassStarsById: { l2: fourRounds([2, 2, 2, 2]) },
    });
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const marker = page.locator("[data-topic-plus-round]");
    await expect(marker).toBeVisible({ timeout: 15_000 });
    // P9.2 — a média aparece de forma discreta, junto da recomendação.
    await expect(marker).toContainText("2.0");

    // P6.5 — o CARD DESTE TEMA não pode anunciar domínio enquanto o reforço é
    // necessário. O assert é no card, não na página: a Jornada ao redor lista
    // outros temas que estão legitimamente dominados.
    const card = page.locator("[data-topic-plus-round]").locator("xpath=ancestor::*[self::section or self::article or self::div][3]");
    const cardText = (await card.first().innerText()).toLowerCase();
    expect(cardText).not.toContain("tema dominado");
    expect(cardText).toContain("reforço +");
  });

  test("P29.2 — Plus concluída não reaparece", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2"],
      lessonMasteryById: mastered(["l1", "l2"]),
      lessonStarsById: { l1: 3, l2: 2 },
      topicPassStarsById: { l2: fourRounds([2, 2, 2, 2]) },
      // Já feita: o tema fecha e a Plus some.
      plusRoundById: { l2: { completedAt: Date.now(), stars: 3 } },
    });
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-topic-plus-round]")).toHaveCount(0);
  });

  test("P29 — o CTA do Reforço + abre a sessão de reforço", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2"],
      lessonMasteryById: mastered(["l1", "l2"]),
      lessonStarsById: { l1: 3, l2: 2 },
      topicPassStarsById: { l2: fourRounds([2, 2, 2, 2]) },
      folego: 20,
    });
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-topic-plus-round]")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Refor/i }).first().click();
    // A Plus é uma sessão, não um nó novo: mesma lição, com o marcador.
    await expect(page).toHaveURL(/\/licao\/l2\/player\?reforco=1/, { timeout: 15_000 });
  });
});

// ── P27 — coerência entre objetivo e renderer ──────────────────────────────

test.describe("RC1.1 · coerência de modalidade", () => {
  test("P27 — a lição de tom nunca mostra 'Monte a frase'", async ({ page }) => {
    // "1º tom com ma" na pass 3 era exatamente a tela do bug: objetivo de tom,
    // renderer de montagem, banco 妈 / 一 / 人 / 木.
    await seedLessonPlayerReady(page, "p2-ma-primeiro-tom", { masteryLevel: 2, folego: 20 });
    await page.goto("/licao/p2-ma-primeiro-tom/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const victory = page.locator("[data-lesson-victory]");
    for (let step = 0; step < 40; step += 1) {
      if (await victory.isVisible().catch(() => false)) break;
      // O assert é sobre o RENDERER, não sobre copy: "monte a frase em pedaços
      // curtos" também é a descrição da etapa Montagem e aparece no cabeçalho
      // de lições que não têm montagem nenhuma. O que não pode existir aqui é
      // o tabuleiro de peças.
      await expect(page.locator("[data-assembly-board]")).toHaveCount(0);
      await expect(page.locator("[data-assembly-bank]")).toHaveCount(0);
      if (!(await advanceUntilVisible(page, victory, 1))) {
        if (await victory.isVisible().catch(() => false)) break;
      }
    }
  });
});

// ── P30 — a Victory ────────────────────────────────────────────────────────

test.describe("RC1.1 · Victory", () => {
  test("P30 — celebração mínima: sem upsell, sync, cards ou segundo CTA", async ({ page }) => {
    await seedLessonPlayerReady(page, "l2", { masteryLevel: 3, folego: 20 });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const victory = page.locator("[data-lesson-victory]");
    await runToVictory(page, victory);
    await expect(victory).toBeVisible({ timeout: 30_000 });

    // Presentes, e uma vez cada.
    await expect(page.locator("[data-victory-primary]")).toHaveCount(1);
    await expect(page.locator("[data-victory-stars]")).toHaveCount(1);
    await expect(page.locator("[data-victory-xp]")).toHaveCount(1);
    await expect(page.locator("[data-victory-accuracy]")).toHaveCount(1);
    await expect(page.locator("[data-victory-highlight]")).toHaveCount(1);
    expect(await page.locator("[data-victory-focus]").count()).toBeLessThanOrEqual(1);

    // Ausentes (P14.2/P14.3 e mutações 16–18).
    await expect(page.locator("[data-victory-review-errors]")).toHaveCount(0);
    await expect(victory.locator("nav")).toHaveCount(0);
    await expect(victory.locator("details")).toHaveCount(0);
    const body = (await victory.innerText()).toLowerCase();
    for (const forbidden of [
      "ver planos",
      "ajuda focada",
      "sincronizando progresso",
      "progresso local seguro",
      "missões atualizadas",
      "reforço guiado",
      "deixar feedback",
    ]) {
      expect(body, `"${forbidden}" não pertence à Victory`).not.toContain(forbidden);
    }

    // P14.4 — o rótulo "Ponto forte" só existe quando o destaque é verdadeiro.
    const strength = await page.locator("[data-victory-highlight]").getAttribute("data-victory-strength");
    const accuracyText = await page.locator("[data-victory-accuracy]").innerText();
    const accuracy = Number((accuracyText.match(/(\d+)%/) ?? [])[1] ?? "0");
    if (accuracy < 70) {
      expect(strength).toBe("neutral");
      expect(body).not.toContain("ponto forte");
    }

    // P0.4 — o CTA existe, é único e está habilitado. A navegação em si não é
    // afirmada aqui: quando a meta diária fecha, a tela de ofensiva entra na
    // frente por design, e transformar isso em falha testaria outra coisa.
    await expect(page.locator("[data-victory-primary]")).toBeEnabled();
  });
});

// ── P31 — payload de áudio com nome próprio ────────────────────────────────

test.describe("RC1.1 · áudio", () => {
  test("P31 — nenhum botão de áudio carrega copy de interface", async ({ page }) => {
    await seedLessonPlayerReady(page, "l2", { masteryLevel: 0, folego: 20 });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const victory = page.locator("[data-lesson-victory]");
    for (let step = 0; step < 30; step += 1) {
      if (await victory.isVisible().catch(() => false)) break;
      // `data-audio-text` é o texto sanitizado que o TTS receberia.
      const payloads = await page.locator("[data-audio-text]").evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-audio-text") ?? "")
      );
      for (const payload of payloads) {
        if (!payload) continue;
        for (const phrase of [
          "O que",
          "Minha resposta",
          "Escolha",
          "Pressione",
          "Verificar",
          "Continuar",
          "responde",
        ]) {
          expect(payload, `TTS não pode receber copy de interface: ${payload}`).not.toContain(phrase);
        }
        // Um payload ou é mandarim, ou é pinyin/nome — nunca uma frase PT.
        expect(payload.split(/\s+/).length).toBeLessThan(12);
      }
      if (!(await advanceUntilVisible(page, victory, 1))) {
        if (await victory.isVisible().catch(() => false)) break;
      }
    }
  });
});

// ── P25 — a revisão não trava ──────────────────────────────────────────────

test.describe("RC1.1 · avanço", () => {
  test("P25 — responder na revisão leva ao próximo item e encerra no último", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2", "l3"],
      lessonMasteryById: mastered(["l1", "l2", "l3"]),
      lessonStarsById: { l1: 3, l2: 3, l3: 2 },
      learnedChunks: ["nihao", "xiexie", "zaijian"],
      srs: dueReviewSrs(),
    });
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const check = page
      .locator("button:has-text('Verificar'), button:has-text('Ver resposta'), button:has-text('Check')")
      .first();
    if (!(await check.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "conta sem itens devidos — a fila é coberta por validate:review-advance");
      return;
    }

    const counter = page.locator("[data-review-position]");
    const before = (await counter.getAttribute("data-review-position").catch(() => null)) ?? "";

    await answerCurrentReviewItem(page);
    await check.click();

    // 3/4/5 — feedback aparece, com o CTA junto dele (nunca 500px abaixo).
    const feedback = page.locator("[data-review-feedback]");
    await expect(feedback).toBeVisible({ timeout: 10_000 });
    const continueBtn = page.locator("[data-review-continue]");
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeEnabled();

    // 6/7 — clicar sai da questão. Nunca ficar preso na mesma.
    await continueBtn.click();
    await expect(feedback).toBeHidden({ timeout: 10_000 });

    const after = (await counter.getAttribute("data-review-position").catch(() => null)) ?? "";
    const finished = await page
      .locator("text=/Revis(ão|ao) conclu/i")
      .isVisible()
      .catch(() => false);
    // Ou o contador andou, ou a sessão terminou. Ficar parado é o bug.
    expect(finished || after !== before, `índice não avançou (${before} → ${after})`).toBeTruthy();
  });

  test("P0.6 — duplo clique em Continuar não conta duas vezes", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2", "l3"],
      lessonMasteryById: mastered(["l1", "l2", "l3"]),
      lessonStarsById: { l1: 3, l2: 3, l3: 2 },
      learnedChunks: ["nihao", "xiexie", "zaijian"],
      srs: dueReviewSrs(),
    });
    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const check = page
      .locator("button:has-text('Verificar'), button:has-text('Ver resposta'), button:has-text('Check')")
      .first();
    if (!(await check.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "conta sem itens devidos");
      return;
    }

    await answerCurrentReviewItem(page);
    await check.click();
    await expect(page.locator("[data-review-feedback]")).toBeVisible({ timeout: 10_000 });

    const xpBefore = await readXp(page);
    const continueBtn = page.locator("[data-review-continue]");
    await continueBtn.dblclick();
    await page.waitForTimeout(600);
    const xpAfter = await readXp(page);

    // Um clique duplo não pode render dois ganhos.
    expect(xpAfter - xpBefore).toBeLessThanOrEqual(12);
  });
});

// ── P32 — mobile 390×844 ───────────────────────────────────────────────────

test.describe("RC1.1 · mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("P32.1 — o CTA fica alcançável e não há rolagem horizontal", async ({ page }) => {
    await seedLessonPlayerReady(page, "l2", { masteryLevel: 0, folego: 20 });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const action = page.locator("[data-lesson-action-region]").first();
    await expect(action).toBeVisible({ timeout: 20_000 });

    // P0.2 — o CTA não pode exigir que o aluno descubra mais 500px de rolagem.
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.y).toBeLessThan(844);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("P32 — o card de Reforço + cabe em 390px", async ({ page }) => {
    await seedStore(page, {
      accountSetupComplete: true,
      holdAchievementModals: true,
      completedLessons: ["l1", "l2"],
      lessonMasteryById: mastered(["l1", "l2"]),
      lessonStarsById: { l1: 3, l2: 2 },
      topicPassStarsById: { l2: fourRounds([2, 2, 2, 2]) },
    });
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-topic-plus-round]")).toBeVisible({ timeout: 15_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

// ── Utilitários ────────────────────────────────────────────────────────────

async function readXp(page: Page): Promise<number> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORE_KEY);
  if (!raw) return 0;
  const state = (JSON.parse(raw) as { state?: { xpTotal?: number } }).state;
  return state?.xpTotal ?? 0;
}

async function answerCurrentReviewItem(page: Page) {
  const option = page.locator("[data-exercise-option]:visible, [data-review-option]:visible").first();
  if (await option.isVisible().catch(() => false)) {
    await option.click().catch(() => undefined);
    return;
  }
  const piece = page.locator("[data-assembly-piece]:visible").first();
  if (await piece.isVisible().catch(() => false)) await piece.click().catch(() => undefined);
}

async function runToVictory(page: Page, victory: Locator) {
  await advanceUntilVisible(page, victory, 40);
}
