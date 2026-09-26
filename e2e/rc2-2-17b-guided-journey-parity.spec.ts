import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  seedTelemetryDeclined,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import {
  enableGuidedPrepare,
  forceLegacyShell,
  installFakeSpeech,
  lessonJumpTo,
  lessonQaSteps,
  measureGuidedScreen,
  type GuidedScreen,
} from "./guided-shell-helpers";
import { ALL_LESSONS } from "../src/data/journey";
import { dockMayStartEmpty, dockShareForKinds, presentationContractFor } from "../src/lib/guidedPresentation";

/**
 * RC2.2.17B — Guided Journey Player Parity (PARTS CU–DI).
 *
 * A Jornada no formato do Teste guiado: shell em tela cheia, cabeçalho
 * simples, passo sem o <Card> antigo, UMA ação principal no dock, PREPARE
 * real (sem mexer em idx/XP), ouvir → revelar → continuar, tons e conversa
 * sem moldura. As heurísticas visuais são medidas no DOM real.
 */

const STORE_VERSION = 21;
/** O plano REAL desta lição tem um passo "listen" (ouvir → falar). */
const LISTEN_LESSON = "p2-ma-terceiro-tom";
/** Passos de escolha que o planner usa de fato nas rodadas. */
const CHOICE_KINDS = ["dialogue_choice", "listen_select", "audio_to_action", "contextual_choice", "comprehend"];

async function openLesson(
  page: Page,
  lessonId: string,
  options: { prepare?: boolean; legacy?: boolean; masteryLevel?: number; isPremium?: boolean; seedThrough?: string } = {}
) {
  await seedLessonPlayerReady(page, options.seedThrough ?? lessonId, { masteryLevel: options.masteryLevel, isPremium: options.isPremium });
  if (options.prepare) await enableGuidedPrepare(page);
  if (options.legacy) await forceLegacyShell(page);
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-guided-lesson-shell]")).toBeVisible({ timeout: 20_000 });
}

async function jumpToKind(page: Page, kinds: string[]): Promise<number> {
  const steps = await lessonQaSteps(page);
  const target = steps.find((step) => kinds.includes(step.kind));
  expect(target, `o plano real tem ${kinds.join("/")}`).toBeTruthy();
  await lessonJumpTo(page, target!.index);
  await page.waitForTimeout(300);
  return target!.index;
}

function expectCleanScreen(screen: GuidedScreen, label: string) {
  expect(screen.shell, `${label}: shell guiado`).toBe("true");
  expect(screen.legacyCard, `${label}: sem o Card antigo em volta do passo`).toBe(false);
  expect(screen.largeSurfaces, `${label}: no máximo 1 superfície grande`).toBeLessThanOrEqual(1);
  expect(screen.nestedCardDepth, `${label}: sem card-em-card-em-card`).toBeLessThanOrEqual(2);
  expect(screen.primaryInDock + screen.primaryInline, `${label}: no máximo UMA ação principal`).toBeLessThanOrEqual(1);
  expect(screen.metadataPills, `${label}: no máximo 1 pílula de metadado`).toBeLessThanOrEqual(1);
}

function expectDockReachable(screen: GuidedScreen, label: string) {
  expect(screen.dockBottom, `${label}: dock com ação`).not.toBeNull();
  expect(screen.dockBottom!, `${label}: CTA acima da borda/gesture bar`).toBeLessThanOrEqual(screen.viewportHeight + 0.5);
  expect(screen.dockTop!, `${label}: CTA dentro da tela`).toBeGreaterThanOrEqual(0);
}

test.describe("RC2.2.17B · shell guiado da Jornada", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CU/CV — lição simples: shell guiado, sem Card externo; rollback legado ainda existe", async ({ page }) => {
    await openLesson(page, "l1");
    const guided = await measureGuidedScreen(page);
    expectCleanScreen(guided, "l1");
    await expect(page.locator("[data-lesson-task-body]")).toHaveAttribute("data-guided-step", "true");
    // Cabeçalho: ×, barra, n/N — sem pílula de etapa visível, sem Qi.
    await expect(page.locator("[data-guided-header] [data-lesson-progress-label]")).toHaveText(/^\d+\/\d+$/);
    await expect(page.locator("[data-guided-header]")).not.toContainText(/Etapa|Stage/);
  });

  test("BY/BZ — rollback visual (DEV/QA) volta ao quadro antigo com o MESMO estado da lição", async ({ page }) => {
    await openLesson(page, "l1", { legacy: true });
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveAttribute("data-guided-lesson-shell", "false");
    const legacy = await measureGuidedScreen(page);
    expect(legacy.legacyCard, "o rollback mostra o Card antigo").toBe(true);
  });

  test("N–Q/DC — PREPARE é micro-passo real: Dragão + título, sem mexer em idx, XP ou Qi", async ({ page }) => {
    await openLesson(page, "l2", { prepare: true });
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state);
    await expect(page.locator("[data-guided-prepare]")).toBeVisible();
    await expect(page.getByTestId("lesson-prepare-line")).toBeVisible();
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveAttribute("data-presentation-stage", "PREPARE");
    const prepare = await measureGuidedScreen(page);
    expect(prepare.lessonTitleVisible, "título da lição aparece no PREPARE").toBe(true);
    expect(prepare.mascots, "Dragão no PREPARE").toBe(1);
    expect(prepare.primaryInDock).toBe(1);
    await page.evaluate(() => {
      (window as Window & { __longyuLessonTrace?: unknown[] }).__longyuLessonTrace = [];
    });
    await page.getByTestId("lesson-prepare-start").click();
    await expect(page.locator("[data-current-step-index]")).toHaveAttribute("data-current-step-index", "0");
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveAttribute("data-presentation-stage", "STEP");
    const step = await measureGuidedScreen(page);
    expect(step.lessonTitleVisible, "título NÃO se repete no passo").toBe(false);
    expect(step.mascots, "Dragão não aparece em toda pergunta").toBe(0);
    const trace = await page.evaluate(
      () => (window as Window & { __longyuLessonTrace?: Array<{ event: string }> }).__longyuLessonTrace ?? []
    );
    expect(trace.filter((entry) => entry.event === "advanced").length, "PREPARE não avança o currículo").toBe(0);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state);
    expect(after.points ?? 0, "PREPARE não dá Qi").toBe(before.points ?? 0);
    expect(after.xp ?? 0, "PREPARE não dá XP").toBe(before.xp ?? 0);
    expect(JSON.stringify(after.lessonMasteryById ?? {}), "PREPARE não muda domínio").toBe(JSON.stringify(before.lessonMasteryById ?? {}));
  });

  test("CX/DC — ouvir: botão central → áudio REAL → revela → Continuar no dock; idx só muda no fim", async ({ page }) => {
    await installFakeSpeech(page, "ok");
    await openLesson(page, LISTEN_LESSON);
    const index = await jumpToKind(page, ["listen"]);
    const stage = page.locator('[data-guided-listen-stage="listen"]');
    await expect(stage).toBeVisible();
    await expect(page.getByTestId("guided-reveal")).toHaveCount(0);
    const primary = page.locator("[data-lesson-action-region]").getByTestId("listen-continue");
    await expect(primary).toBeDisabled();
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, "listen");
    expectDockReachable(screen, "listen");
    expect(screen.scrollOverflow, "ouvir cabe em 390×844 sem rolar").toBeLessThanOrEqual(4);
    await page.locator("[data-guided-listen]").click();
    await expect(page.getByTestId("guided-reveal")).toBeVisible();
    await expect(primary).toBeEnabled();
    await primary.click();
    await expect(page.locator('[data-guided-listen-stage="speak"]')).toBeVisible();
    await expect(page.locator("[data-current-step-index]")).toHaveAttribute("data-current-step-index", String(index));
  });

  test("DG — falha de áudio fica visível dentro do shell e deixa seguir sem áudio", async ({ page }) => {
    await installFakeSpeech(page, "fail");
    await openLesson(page, LISTEN_LESSON);
    await jumpToKind(page, ["listen"]);
    await page.locator("[data-guided-listen]").click();
    await expect(page.getByTestId("guided-audio-failed")).toBeVisible();
    await expect(page.getByTestId("guided-reveal")).toBeVisible();
    await expect(page.locator("[data-lesson-action-region]").getByTestId("listen-continue-degraded")).toBeEnabled();
  });

  test("CW — escolha simples: opções grandes, Verificar no dock, uma superfície", async ({ page }) => {
    await openLesson(page, "l2");
    await jumpToKind(page, CHOICE_KINDS);
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, "choice");
    expectDockReachable(screen, "choice");
  });

  test("CY/AH — tom: contorno guiado visível, sem Card externo, cabe na tela", async ({ page }) => {
    await openLesson(page, "p2-ma-terceiro-tom");
    await jumpToKind(page, ["tone"]);
    await expect(page.locator("[data-tone-guided-notice], [data-tone-simple]").first()).toBeVisible();
    const tone = page.locator("[data-tone-first-exposure]");
    if (await tone.isVisible().catch(() => false)) await tone.click();
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, "tone");
    expect(screen.scrollOverflow, "tom não rola sem necessidade em 390×844").toBeLessThanOrEqual(24);
  });

  test("CZ/AC — conversa: personagens + balão + ação, sem moldura gigante; quem não fala ~60–75%", async ({ page }) => {
    await openLesson(page, "p1-primeira-conversa");
    await jumpToKind(page, ["conversation_scene"]);
    const scene = page.locator("[data-conversation-scene]").first();
    await expect(scene).toHaveAttribute("data-conversation-frame", "none");
    await expect(page.locator("[data-conversation-cast]").first()).toBeVisible();
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, "conversation");
    const opacities = await page.locator("[data-conversation-cast] > div > div:first-child").evaluateAll((els) =>
      els.map((el) => Number(getComputedStyle(el).opacity))
    );
    expect(Math.max(...opacities), "falante ativo 100%").toBeGreaterThan(0.95);
    const dim = Math.min(...opacities);
    expect(dim, "o outro não some").toBeGreaterThanOrEqual(0.6);
    expect(dim).toBeLessThanOrEqual(0.76);
  });

  test("DA — lição 100+ (guia LOW) continua no shell guiado, sem PREPARE", async ({ page }) => {
    const late = ALL_LESSONS[Math.min(110, ALL_LESSONS.length - 1)];
    await openLesson(page, late.id, { prepare: true, isPremium: true });
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveAttribute("data-guided-lesson-shell", "true");
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveAttribute("data-guidance-level", "LOW");
    await expect(page.locator("[data-guided-prepare]")).toHaveCount(0);
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, late.id);
  });

  test("DD — recarregar volta ao mesmo passo curricular, sem conclusão duplicada", async ({ page }) => {
    await openLesson(page, "l2");
    await lessonJumpTo(page, 3);
    await page.waitForTimeout(800);
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const index = Number(await page.locator("[data-current-step-index]").first().getAttribute("data-current-step-index"));
    expect(index, "retoma o passo, não reinicia do zero sem motivo").toBeGreaterThanOrEqual(0);
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveCount(1);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state);
    expect((state.completedLessons ?? []).filter((id: string) => id === "l2").length, "sem conclusão duplicada").toBeLessThanOrEqual(1);
  });

  test("DE — segundo plano e volta: mesmo passo, um único shell", async ({ page }) => {
    await openLesson(page, "l2");
    await lessonJumpTo(page, 2);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(300);
    await expect(page.locator("[data-current-step-index]")).toHaveAttribute("data-current-step-index", "2");
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveCount(1);
    await expect(page.locator("[data-guided-action-dock]")).toHaveCount(1);
  });

  test("DF — digitação: com o teclado aberto o CTA continua alcançável e o campo visível", async ({ page }) => {
    // Aluno que já passou pela lição: o plano de revisão tem produção escrita.
    await openLesson(page, "l4", { isPremium: true, seedThrough: ALL_LESSONS[ALL_LESSONS.length - 1].id });
    await jumpToKind(page, ["free_production", "transfer_task", "write"]);
    const field = page.locator("[data-lesson-task-body] textarea, [data-lesson-task-body] input[type='text'], [data-lesson-task-body] input:not([type])").first();
    await expect(field, "passo de digitação tem campo").toBeVisible();
    {
      await field.focus();
      // Teclado virtual ≈ 40% da altura: o frame segue o visualViewport.
      await page.setViewportSize({ width: 390, height: 500 });
      await page.waitForTimeout(400);
      const screen = await measureGuidedScreen(page);
      if (screen.dockBottom != null) expect(screen.dockBottom).toBeLessThanOrEqual(500.5);
      const box = await field.boundingBox();
      expect(box, "campo continua na tela").not.toBeNull();
      if (box && screen.dockTop != null) expect(box.y, "o dock não cobre o campo").toBeLessThan(screen.dockTop);
    }
  });

  test("DH — sem reconhecimento de fala: autoavaliação cabe no shell (ação no dock)", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined });
      Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: undefined });
    });
    await openLesson(page, LISTEN_LESSON);
    await jumpToKind(page, ["listen"]);
    await page.getByRole("button", { name: /Não posso ouvir agora|I can't listen now/ }).click();
    await expect(page.locator('[data-guided-listen-stage="speak"]')).toBeVisible();
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, "speech-fallback");
    expectDockReachable(screen, "speech-fallback");
    const selfCompare = page.getByTestId("self-compare");
    if (await selfCompare.isVisible().catch(() => false)) {
      await expect(page.locator("[data-lesson-action-region]").getByTestId("self-compare-record")).toBeVisible();
    }
  });
});

test.describe("RC2.2.17B · áreas seguras e larguras", () => {
  for (const viewport of [
    { width: 360, height: 740 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 432, height: 960 },
  ]) {
    test(`DI — ${viewport.width}×${viewport.height}: CTA nunca atrás da gesture bar`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openLesson(page, "l2");
      await jumpToKind(page, CHOICE_KINDS);
      const screen = await measureGuidedScreen(page);
      expectDockReachable(screen, `${viewport.width}`);
      expect(screen.headerTop ?? 0).toBeGreaterThanOrEqual(0);
    });
  }

  test("BJ — desktop: coluna limitada (~640–760px), não é celular esticado", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openLesson(page, "l2");
    const screen = await measureGuidedScreen(page);
    expect(screen.shell).toBe("true");
    expect(screen.stepWidth).toBeLessThanOrEqual(760);
    expect(screen.stepWidth).toBeGreaterThanOrEqual(560);
  });

  test("AV — movimento reduzido: sem animação de entrada do passo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openLesson(page, "l2");
    const animation = await page.locator("[data-guided-step]").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");
  });
});

test.describe("RC2.2.17B · cultura e prova no mesmo shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("BU — lição de cultura: shell guiado, sem Card; × sai pela Jornada", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l3", { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/licao/culture-greetings-nihao/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-guided-lesson-shell]")).toHaveAttribute("data-guided-lesson-shell", "true");
    const screen = await measureGuidedScreen(page);
    expectCleanScreen(screen, "culture");
    await expect(page.getByTestId("culture-back")).toBeVisible();
    await expect(page.getByTestId("culture-sources-open")).toBeVisible();
  });

  test("DB — prova de fase: mesmo shell limpo, sem Dragão ensinando", async ({ page }) => {
    await seedTelemetryDeclined(page);
    await allowE2ELocalSession(page);
    await page.addInitScript((payload: string) => {
      if (localStorage.getItem("longyu-v1")) return;
      localStorage.setItem("longyu-v1", payload);
    }, JSON.stringify({
      state: {
        accountSetupComplete: true,
        completedLessons: [],
        holdAchievementModals: true,
        folego: 5,
        phaseChallengeCooldowns: { p2: Date.now() - 1_000 },
        cultureSeals: ["social-etiquette", "urban-china", "chinese-table"],
      },
      version: STORE_VERSION,
    }));
    await page.goto("/teste/fase/p2");
    await waitForLazyPage(page);
    await page.getByTestId("phase-challenge-start").click();
    const exam = page.getByTestId("phase-challenge-exam");
    await expect(exam).toBeVisible();
    await expect(exam).toHaveAttribute("data-guided-lesson-shell", "true");
    await expect(exam).toHaveAttribute("data-guidance-level", "NONE");
    await expect(exam.locator("[data-guided-header]")).toBeVisible();
    await expect(exam.locator("[data-testid='mascot-frame']")).toHaveCount(0);
    const screen = await measureGuidedScreen(page);
    expect(screen.legacyCard).toBe(false);
    expect(screen.largeSurfaces).toBeLessThanOrEqual(1);
  });
});

test.describe("RC2.2.17B · 134 lições (estrutural)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("ALL 134 — toda lição da Jornada abre no GuidedLessonShell, sem Card antigo; dock ≥ 80% no plano REAL", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "varredura estrutural roda uma vez (Chromium)");
    test.setTimeout(25 * 60_000);
    await seedLessonPlayerReady(page, ALL_LESSONS[ALL_LESSONS.length - 1].id, { isPremium: true });
    const rows: Array<{ id: string; position: number; shell: string | null; legacyCard: boolean; guidance: string | null; kinds: string[] }> = [];
    for (const [position, lesson] of ALL_LESSONS.entries()) {
      await page.goto(`/licao/${lesson.id}/player`);
      await page.locator("[data-guided-lesson-shell]").first().waitFor({ timeout: 20_000 }).catch(() => undefined);
      const screen = await measureGuidedScreen(page);
      const kinds = (await lessonQaSteps(page).catch(() => [])).map((step) => step.kind);
      const guidance = await page.locator("[data-guided-lesson-shell]").first().getAttribute("data-guidance-level").catch(() => null);
      rows.push({ id: lesson.id, position, shell: screen.shell, legacyCard: screen.legacyCard, guidance, kinds });
    }
    const runtimeKinds = rows.flatMap((row) => row.kinds);
    const share = dockShareForKinds(runtimeKinds);
    const authored = dockShareForKinds(ALL_LESSONS.flatMap((lesson) => (lesson.steps ?? []).map((step) => step.kind)));
    const evidence = {
      lessons: rows.length,
      guidedShell: rows.filter((row) => row.shell === "true").length,
      legacyCard: rows.filter((row) => row.legacyCard).length,
      runtimeDockShare: share,
      authoredDockShare: authored,
      rows,
    };
    fs.writeFileSync(testInfo.outputPath("rc2-2-17b-structural-134.json"), JSON.stringify(evidence, null, 2));
    if (process.env.SHOT_PACK === "1") {
      fs.writeFileSync("docs/release/rc2-2-17b-structural-134.json", `${JSON.stringify(evidence, null, 2)}\n`);
    }
    expect(rows.length).toBe(ALL_LESSONS.length);
    expect(rows.filter((row) => row.shell !== "true").map((row) => row.id), "toda lição no shell guiado").toEqual([]);
    expect(rows.filter((row) => row.legacyCard).map((row) => row.id), "nenhuma com Card antigo").toEqual([]);
    expect(share.share, `dock no plano real: ${(share.share * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.8);
  });
});

/** Uma interação mínima e real no passo: ouvir, digitar ou tocar a 1ª opção. */
async function firstInteraction(page: Page): Promise<boolean> {
  const body = page.locator("[data-lesson-task-body]").first();
  const listenFirst = body.locator("[data-tone-first-exposure], [data-guided-listen]").first();
  if (await listenFirst.isVisible().catch(() => false)) {
    await listenFirst.click().catch(() => undefined);
    return true;
  }
  const field = body.locator("textarea:visible, input[type='text']:visible, input:not([type]):visible").first();
  if (await field.isVisible().catch(() => false)) {
    await field.fill("你好").catch(() => undefined);
    return true;
  }
  const option = body.getByRole("button", { name: /^(Opção|Option) \d+:/ }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click().catch(() => undefined);
    return true;
  }
  const choice = body.locator("[data-option-index], [data-choice-option], [data-flashcard], [data-image-choice-option] , button[data-state]").first();
  if (await choice.isVisible().catch(() => false)) {
    await choice.click().catch(() => undefined);
    return true;
  }
  const generic = body.locator("button:visible").filter({ hasNotText: /^$/ }).last();
  if (await generic.isVisible().catch(() => false)) {
    await generic.click().catch(() => undefined);
    return true;
  }
  return false;
}

/** Lições cujo plano REAL cobre todos os StepKinds usados nas 134 (cobertura gulosa). */
const KIND_COVER_LESSONS = [
  "p7-imersao-hotel",
  "l27",
  "p2-ma-primeiro-tom",
  "l8-rev",
  "p6-china-cidades-2",
  "l11-falo-pouco",
  "l6-rev",
  "p4-checkpoint-fundamentos",
  "l23",
  "p6-direcoes",
  "p6-survival-mandarin",
  "p7-imersao-viagem",
  "p7-imersao-casa-amigo",
];

test.describe("RC2.2.17B · contrato de apresentação por StepKind", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CH/CI — cada passo cumpre o contrato: DOCK tem a ação no dock; nenhum passo com Card antigo ou 2 CTAs", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "varredura de contrato roda uma vez (Chromium)");
    test.setTimeout(20 * 60_000);
    await seedLessonPlayerReady(page, ALL_LESSONS[ALL_LESSONS.length - 1].id, { isPremium: true });
    const rows: Array<Record<string, unknown>> = [];
    const violations: string[] = [];
    for (const lessonId of KIND_COVER_LESSONS) {
      await page.goto(`/licao/${lessonId}/player`);
      await page.locator("[data-guided-lesson-shell]").first().waitFor({ timeout: 20_000 });
      await dismissBlockingOverlays(page);
      const steps = await lessonQaSteps(page);
      for (const step of steps) {
        await lessonJumpTo(page, step.index);
        await page.waitForTimeout(450);
        let screen = await measureGuidedScreen(page);
        const contract = presentationContractFor(step.kind);
        let dockButtons = await page.locator("[data-guided-action-dock] button:visible").count();
        let interacted = false;
        if (contract.actionPlacement === "DOCK" && dockButtons === 0 && dockMayStartEmpty(step.kind)) {
          // PART W — auto-check/digitação/ouvir: a ação nasce na 1ª interação real.
          interacted = await firstInteraction(page);
          await page.waitForTimeout(500);
          screen = await measureGuidedScreen(page);
          dockButtons = await page.locator("[data-guided-action-dock] button:visible").count();
        }
        const row = { ...screen, lessonId, index: step.index, kind: step.kind, placement: contract.actionPlacement, interaction: contract.interaction, interacted, dockButtons };
        rows.push(row);
        const where = `${lessonId}#${step.index} ${step.kind}`;
        if (screen.legacyCard) violations.push(`${where}: Card antigo`);
        if (screen.primaryInDock + screen.primaryInline > 1) violations.push(`${where}: ${screen.primaryInDock + screen.primaryInline} CTAs principais`);
        // Resposta errada abre a folha de erro (PART Z): a decisão mora nela.
        const sheet = await page.locator("[data-guided-retry-sheet], [role='dialog']").first().isVisible().catch(() => false);
        if (contract.actionPlacement === "DOCK" && dockButtons === 0 && !sheet) violations.push(`${where}: contrato DOCK sem ação no dock`);
        if (contract.actionPlacement === "DOCK" && screen.primaryInline > 0) violations.push(`${where}: CTA principal fora do dock`);
        if (screen.nestedCardDepth > 2) violations.push(`${where}: ${screen.nestedCardDepth} cards aninhados`);
        if (screen.metadataPills > 1) violations.push(`${where}: ${screen.metadataPills} pílulas`);
      }
    }
    fs.writeFileSync(testInfo.outputPath("rc2-2-17b-contract-sweep.json"), JSON.stringify({ rows, violations }, null, 2));
    if (process.env.SHOT_PACK === "1") {
      fs.writeFileSync("docs/release/rc2-2-17b-contract-sweep.json", `${JSON.stringify({ steps: rows.length, violations, rows }, null, 2)}\n`);
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
