import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedCourseDirection, seedLessonPlayerReady, seedTelemetryDeclined, waitForLazyPage } from "./helpers";
import { advanceSkipThroughOverlays } from "./lesson-player-helpers";
import {
  enableGuidedPrepare,
  forceLegacyShell,
  installFakeSpeech,
  lessonJumpTo,
  lessonQaSteps,
  measureGuidedScreen,
} from "./guided-shell-helpers";
import { ALL_LESSONS } from "../src/data/journey";

/**
 * RC2.2.17B · BA/BB/CJ/CK/CL — pacote visual (só com SHOT_PACK=1):
 *   first-20/      tela representativa de cada uma das 20 primeiras lições
 *   before-after/  quadro legado (rollback DEV/QA) × shell guiado, mesmo passo
 *   step-kinds/    um passo representativo por família de StepKind
 *   golden/        Teste guiado × Jornada lado a lado
 * e docs/release/rc2-2-17b-first-20-audit.json com as medições do DOM.
 */
const SHOT = process.env.SHOT_PACK === "1";
const OUT = "docs/reports/rc2-2-17b-screenshots";
const VIEWPORT = { width: 390, height: 844 };

async function shot(page: Page, rel: string) {
  fs.mkdirSync(`${OUT}/${rel.split("/").slice(0, -1).join("/")}`, { recursive: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${rel}.jpg`, type: "jpeg", quality: 70 });
}

async function openLesson(page: Page, id: string, opts: { legacy?: boolean; prepare?: boolean; seedThrough?: string; isPremium?: boolean } = {}) {
  await seedLessonPlayerReady(page, opts.seedThrough ?? id, { isPremium: opts.isPremium });
  if (opts.prepare) await enableGuidedPrepare(page);
  if (opts.legacy) await forceLegacyShell(page);
  await page.goto(`/licao/${id}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await page.locator("[data-guided-lesson-shell]").first().waitFor({ timeout: 20_000 });
}

async function jumpToKind(page: Page, kinds: string[]): Promise<boolean> {
  const steps = await lessonQaSteps(page);
  const target = steps.find((step) => kinds.includes(step.kind));
  if (!target) return false;
  await lessonJumpTo(page, target.index);
  await page.waitForTimeout(400);
  return true;
}

/** Lado a lado sem dependência de imagem: o próprio navegador compõe. */
async function sideBySide(page: Page, left: string, right: string, labels: [string, string], out: string) {
  const b64 = (file: string) => fs.readFileSync(file).toString("base64");
  await page.setViewportSize({ width: 820, height: 900 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#1f1b18;font:600 15px system-ui;color:#f6efe8">
    <div style="display:flex;gap:20px;padding:12px 10px">
      <figure style="margin:0;text-align:center"><figcaption style="padding:6px">${labels[0]}</figcaption><img style="width:390px;border-radius:14px" src="data:image/jpeg;base64,${b64(left)}"></figure>
      <figure style="margin:0;text-align:center"><figcaption style="padding:6px">${labels[1]}</figcaption><img style="width:390px;border-radius:14px" src="data:image/jpeg;base64,${b64(right)}"></figure>
    </div></body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${out}.jpg`, type: "jpeg", quality: 72, fullPage: true });
}

test.describe("RC2.2.17B · pacote visual", () => {
  test.skip(!SHOT, "SHOT_PACK=1 para gerar o pacote visual");
  test.use({ viewport: VIEWPORT });

  test("BA/BB — primeiras 20 lições: tela representativa + auditoria medida", async ({ page }) => {
    test.setTimeout(15 * 60_000);
    const audit: Array<Record<string, unknown>> = [];
    for (const [position, lesson] of ALL_LESSONS.slice(0, 20).entries()) {
      await openLesson(page, lesson.id, { prepare: true });
      const first = await measureGuidedScreen(page);
      await shot(page, `first-20/${String(position + 1).padStart(2, "0")}-${lesson.id}`);
      // Segunda tela: o passo real depois da abertura (PREPARE ou ensino).
      const start = page.getByTestId("lesson-prepare-start");
      if (await start.isVisible().catch(() => false)) await start.click();
      else await advanceSkipThroughOverlays(page).catch(() => false);
      await page.waitForTimeout(500);
      const second = await measureGuidedScreen(page);
      await shot(page, `first-20/${String(position + 1).padStart(2, "0")}-${lesson.id}-b`);
      audit.push({
        position: position + 1,
        lessonId: lesson.id,
        guidance: await page.locator("[data-guided-lesson-shell]").first().getAttribute("data-guidance-level"),
        screens: [first, second].map((screen) => ({
          stage: screen.stage,
          kind: screen.kind,
          shell: screen.shell,
          noOuterCard: !screen.legacyCard,
          primaryActions: screen.primaryInDock + screen.primaryInline,
          primaryInDock: screen.primaryInDock,
          metadataPills: screen.metadataPills,
          mascots: screen.mascots,
          largeSurfaces: screen.largeSurfaces,
          dockReachable: screen.dockBottom == null || screen.dockBottom <= screen.viewportHeight,
        })),
      });
    }
    fs.writeFileSync("docs/release/rc2-2-17b-first-20-audit.json", `${JSON.stringify({ viewport: VIEWPORT, lessons: audit }, null, 2)}\n`);
    for (const row of audit) {
      for (const screen of row.screens as Array<{ shell: string; noOuterCard: boolean; primaryActions: number }>) {
        expect(screen.shell).toBe("true");
        expect(screen.noOuterCard).toBe(true);
        expect(screen.primaryActions).toBeLessThanOrEqual(1);
      }
    }
  });

  test("CJ/CK — por StepKind: antes (legado) × depois (guiado)", async ({ page, browser }) => {
    test.setTimeout(15 * 60_000);
    const through = ALL_LESSONS[ALL_LESSONS.length - 1].id;
    const cases: Array<{ name: string; lesson: string; kinds: string[]; seedThrough?: string; prepare?: boolean; before?: (page: Page) => Promise<void> }> = [
      { name: "01-prepare", lesson: "l2", kinds: [], prepare: true },
      { name: "02-intro-teach", lesson: "l1", kinds: ["intro"] },
      { name: "03-tone-contrast-teach", lesson: "p2-ma-terceiro-tom", kinds: ["intro"], before: async (p) => { await lessonJumpTo(p, 1); } },
      { name: "04-listen", lesson: "p2-ma-terceiro-tom", kinds: ["listen"] },
      { name: "05-listen-revealed", lesson: "p2-ma-terceiro-tom", kinds: ["listen"], before: async (p) => { await p.locator("[data-guided-listen]").click({ timeout: 3_000 }).catch(() => undefined); await p.waitForTimeout(400); } },
      { name: "06-speech", lesson: "p2-ma-terceiro-tom", kinds: ["listen"], before: async (p) => { await p.getByRole("button", { name: /Não posso ouvir agora/ }).click({ timeout: 3_000 }).catch(() => undefined); } },
      { name: "07-tone", lesson: "p2-ma-terceiro-tom", kinds: ["tone"], before: async (p) => { await p.locator("[data-tone-first-exposure]").click({ timeout: 3_000 }).catch(() => undefined); await p.waitForTimeout(600); } },
      { name: "08-choice", lesson: "l2", kinds: ["listen_select", "audio_to_action", "dialogue_choice", "contextual_choice"] },
      { name: "09-comprehend", lesson: "l2", kinds: ["comprehend"] },
      { name: "10-typing", lesson: "l4", kinds: ["free_production", "transfer_task"], seedThrough: through },
      { name: "11-hanzi", lesson: "p1-primeiros-hanzi", kinds: ["hanzi_build"] },
      { name: "12-conversation", lesson: "p1-primeira-conversa", kinds: ["conversation_scene"] },
      { name: "13-image-choice", lesson: "l2", kinds: ["image_choice"] },
      { name: "14-culture", lesson: "culture-greetings-nihao", kinds: [], seedThrough: "l3" },
    ];
    for (const item of cases) {
      for (const mode of ["legacy", "guided"] as const) {
        // Página nova por captura: o override do rollback não vaza para o "depois".
        const shotPage = await browser.newPage({ viewport: VIEWPORT });
        try {
          await installFakeSpeech(shotPage, "ok");
          await openLesson(shotPage, item.lesson, { legacy: mode === "legacy", prepare: item.prepare, seedThrough: item.seedThrough, isPremium: Boolean(item.seedThrough) });
          if (item.kinds.length && !(await jumpToKind(shotPage, item.kinds))) continue;
          if (item.before) await item.before(shotPage);
          await expect(shotPage.locator("[data-guided-lesson-shell]").first()).toHaveAttribute("data-guided-lesson-shell", mode === "legacy" ? "false" : "true");
          await shot(shotPage, `before-after/${item.name}-${mode === "legacy" ? "before" : "after"}`);
        } finally {
          await shotPage.close();
        }
      }
      const before = `${OUT}/before-after/${item.name}-before.jpg`;
      const after = `${OUT}/before-after/${item.name}-after.jpg`;
      if (fs.existsSync(before) && fs.existsSync(after)) {
        await sideBySide(page, before, after, ["ANTES · Card legado", "DEPOIS · Guided Journey"], `step-kinds/${item.name}`);
      }
    }
  });

  test("CL — golden: Teste guiado × Jornada guiada", async ({ page }) => {
    test.setTimeout(8 * 60_000);
    await installFakeSpeech(page, "ok");
    await seedTelemetryDeclined(page);
    await seedCourseDirection(page);
    await page.goto("/teste-guiado");
    await waitForLazyPage(page);
    await expect(page.getByTestId("guided-try")).toBeVisible();
    await shot(page, "golden/guided-try-intro");
    await page.locator("[data-guided-action]").click({ timeout: 8_000 });
    await page.locator("[data-guided-listen]").click({ timeout: 8_000 });
    await page.waitForTimeout(500);
    await shot(page, "golden/guided-try-listen");
    await page.locator("[data-guided-action]").click({ timeout: 8_000 });
    await page.locator("[data-guided-action]").click({ timeout: 8_000 });
    await page.waitForTimeout(400);
    await shot(page, "golden/guided-try-tone");

    await page.setViewportSize(VIEWPORT);
    await openLesson(page, "l2", { prepare: true });
    await shot(page, "golden/journey-prepare");
    await openLesson(page, "p2-ma-terceiro-tom");
    await jumpToKind(page, ["listen"]);
    await page.locator("[data-guided-listen]").click({ timeout: 8_000 });
    await page.waitForTimeout(500);
    await shot(page, "golden/journey-listen");
    await jumpToKind(page, ["tone"]);
    await page.locator("[data-tone-first-exposure]").click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    await shot(page, "golden/journey-tone");
    for (const [a, b, name] of [
      ["guided-try-intro", "journey-prepare", "golden-01-prepare"],
      ["guided-try-listen", "journey-listen", "golden-02-listen"],
      ["guided-try-tone", "journey-tone", "golden-03-tone"],
    ]) {
      await sideBySide(page, `${OUT}/golden/${a}.jpg`, `${OUT}/golden/${b}.jpg`, ["Teste guiado (referência)", "Jornada (RC2.2.17B)"], `golden/${name}`);
    }
  });

  test("CR — recap pedagógico no fim da lição", async ({ page }) => {
    test.setTimeout(6 * 60_000);
    await openLesson(page, "l1-rev", { isPremium: true });
    for (let beat = 0; beat < 80; beat += 1) {
      if (await page.locator("[data-lesson-victory]").isVisible().catch(() => false)) break;
      await advanceSkipThroughOverlays(page).catch(() => false);
      await page.waitForTimeout(250);
    }
    if (await page.locator("[data-lesson-victory]").isVisible().catch(() => false)) await shot(page, "step-kinds/15-recap");
  });
});
