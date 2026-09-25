import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { dismissBlockingOverlays, seedCourseDirection, seedOnboardedSession, switchCourseInSettings, waitForLazyPage } from "./helpers";

/**
 * RC2.2.15 — screenshots da Palavra do dia.
 *
 *   SHOT_PACK=1 npx playwright test e2e/rc2-2-15-screenshots.spec.ts
 *
 * Grava em docs/reports/rc2-2-15-screenshots/<tela>-<L>x<A>.jpg. A
 * notificação real do Android só existe em aparelho; aqui vai a prévia
 * ("Ver exemplo") com o mesmo título/corpo que o plano agenda.
 */
const OUT = path.join("docs", "reports", "rc2-2-15-screenshots");
const VIEWPORTS = [
  [360, 740],
  [390, 844],
] as const;

test.skip(!process.env.SHOT_PACK, "pacote de screenshots: rode com SHOT_PACK=1");

async function shot(page: Page, name: string, width: number, height: number, fullPage = false) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}-${width}x${height}.jpg`), type: "jpeg", quality: 60, fullPage });
}

async function open(page: Page, route: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

async function seed(page: Page) {
  await seedCourseDirection(page, "pt-zh");
  await seedOnboardedSession(page, ["l1", "l2", "l3"], { replace: false });
}

async function enable(page: Page, width: number, height: number) {
  await open(page, "/config/notificacoes", width, height);
  const card = page.getByTestId("daily-vocabulary-settings");
  if ((await card.getAttribute("data-enabled")) !== "true") await card.getByRole("switch").click();
}

for (const [width, height] of VIEWPORTS) {
  test(`configurações + prévia da notificação ${width}x${height}`, async ({ page }) => {
    await seed(page);
    await enable(page, width, height);
    await page.getByTestId("daily-vocabulary-preview-toggle").click();
    await page.getByTestId("daily-vocabulary-settings").scrollIntoViewIfNeeded();
    await shot(page, "settings-daily-vocabulary", width, height);
    await page.getByTestId("daily-vocabulary-preview").screenshot({ path: path.join(OUT, `notification-preview-pt-${width}x${height}.jpg`), type: "jpeg", quality: 70 });
  });

  test(`janela no silêncio ${width}x${height}`, async ({ page }) => {
    await seed(page);
    await enable(page, width, height);
    await page.getByTestId("daily-vocabulary-start").fill("23:00");
    await page.getByTestId("daily-vocabulary-end").fill("23:30");
    await page.getByTestId("daily-vocabulary-window-problem").scrollIntoViewIfNeeded();
    await shot(page, "settings-quiet-hours", width, height);
  });

  test(`palavra com origem verificada (水) ${width}x${height}`, async ({ page }) => {
    await seed(page);
    await open(page, "/palavra-do-dia/v_shui", width, height);
    await shot(page, "daily-word-shui", width, height);
    await shot(page, "daily-word-shui-full", width, height, true);
  });

  test(`palavra de dois caracteres (朋友) ${width}x${height}`, async ({ page }) => {
    await seed(page);
    await open(page, "/palavra-do-dia/v_pengyou", width, height);
    await shot(page, "daily-word-pengyou-full", width, height, true);
  });

  test(`micro-prática e conclusão ${width}x${height}`, async ({ page }) => {
    await seed(page);
    await enable(page, width, height);
    await open(page, "/jornada", width, height);
    await page.getByTestId("daily-word-card").waitFor();
    await shot(page, "journey-daily-card", width, height);
    await page.getByTestId("daily-word-card").click();
    await page.getByTestId("daily-word").waitFor();
    const hanzi = (await page.getByTestId("daily-word-hanzi").textContent())!.trim();
    const meaning = (await page.getByTestId("daily-word-meaning").textContent())!.trim();
    await page.getByTestId("daily-word-learn").click();
    const frame = page.getByTestId("daily-word-practice");
    let shotIndex = 0;
    for (let i = 0; i < 40; i += 1) {
      if (await page.getByTestId("daily-word-done").isVisible().catch(() => false)) break;
      const step = await frame.getAttribute("data-step-index").catch(() => null);
      if (step && Number(step) === shotIndex && shotIndex < 4) {
        await shot(page, `practice-step-${shotIndex + 1}`, width, height);
        shotIndex += 1;
      }
      const escaped = [meaning, hanzi].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const pick = frame.locator("button:visible").filter({ hasText: new RegExp(`^\\s*\\d?\\s*(${escaped})\\s*$`) }).first();
      if ((await pick.isVisible().catch(() => false)) && (await pick.isEnabled().catch(() => false))) {
        await pick.click();
        await page.waitForTimeout(120);
      }
      const actions = page.getByRole("button", { name: /^(Verificar|Continuar|Entendi|Não posso falar agora)$/ });
      for (let a = 0; a < (await actions.count()); a += 1) {
        const action = actions.nth(a);
        if ((await action.isVisible().catch(() => false)) && (await action.isEnabled().catch(() => false))) {
          await action.click();
          break;
        }
      }
      await page.waitForTimeout(250);
    }
    await page.getByTestId("daily-word-done").waitFor();
    await shot(page, "practice-completion", width, height);
    await open(page, "/hanzi/atlas", width, height);
    await page.getByTestId("atlas-discoveries").waitFor();
    await shot(page, "atlas-discoveries", width, height);
  });

  test(`curso en-zh (interface PT) ${width}x${height}`, async ({ page }) => {
    await seed(page);
    await enable(page, width, height);
    await switchCourseInSettings(page, "en-zh");
    await open(page, "/config/notificacoes", width, height);
    await page.getByTestId("daily-vocabulary-preview-toggle").click();
    await page.getByTestId("daily-vocabulary-preview").screenshot({ path: path.join(OUT, `notification-preview-en-course-${width}x${height}.jpg`), type: "jpeg", quality: 70 });
    await open(page, "/palavra-do-dia/v_shui", width, height);
    await shot(page, "daily-word-shui-en-course", width, height);
  });
}
