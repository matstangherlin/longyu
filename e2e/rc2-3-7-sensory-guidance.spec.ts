/**
 * RC2.3.7 — Sensory & Guidance polish (WEB evidence only).
 *
 * Seu Domínio shows its first-use sentence ONCE (orchestrator budget), never
 * again after "Entendi" + reload; the learner page has no numbers; the mastery
 * practice returns to Seu Domínio. 360/375/390 without horizontal overflow.
 * WEB_PASS ≠ OWNER_UX_ACCEPTANCE.
 */
import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];
const DAY = 86_400_000;
const MASTERY_SENTENCE = "Seu Domínio mostra o que você já demonstrou e o que ainda está consolidando.";

test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
});

async function seed(page: Page) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const now = Date.now();
  const events = Array.from({ length: 4 }, (_, i) => ({
    id: `ev_e2e7_${i}`,
    targetId: "hanzi:你",
    targetType: "HANZI",
    dimension: "listening",
    skill: "LISTENING_CHOICE",
    result: "FAILURE",
    independence: 1,
    supportUsed: [],
    source: { activityId: `journey:listen_select:${i}` },
    timestamp: now - (4 - i) * DAY,
  }));
  const store = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      // Guidance ON, everything else already resolved: only the new Seu Domínio tips are pending.
      guidance: { version: 2, enabled: true, initialized: true, records: {} },
      completedLessons: THROUGH_L2,
      learnedChars: ["你"],
    },
    version: STORE_VERSION,
  });
  const record = JSON.stringify({ version: 1, deviceId: "dev_e2e7", recent: events, aggregates: {}, seen: events.map((e) => e.id) });
  await page.addInitScript(
    ([s, r]: string[]) => {
      if (sessionStorage.getItem("rc237-seeded")) return;
      sessionStorage.setItem("rc237-seeded", "1");
      localStorage.setItem("longyu-v1", s);
      localStorage.setItem("longyu:learner-evidence-v1", r);
      localStorage.setItem("longyu:learner-evidence-legacy-v1", "seeded");
      // Seeded E2E sessions suppress guidance unless the test opts in.
      localStorage.setItem("longyu:e2e-guidance", "on");
    },
    [store, record]
  );
}

for (const vp of VIEWPORTS) {
  test(`Seu Domínio first-use guidance once @${vp.width}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await seed(page);
    await page.goto("/dominio");
    await waitForLazyPage(page);
    const sentence = page.getByText(MASTERY_SENTENCE);
    await expect(sentence).toBeVisible({ timeout: 10_000 });
    // Never "IA escolheu", never numbers on the learner page.
    await expect(page.getByTestId("dominio-page")).not.toContainText(/IA escolheu|%|\b0\.\d+\b/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Entendi" }).first().click();
    await expect(sentence).toHaveCount(0);
    // Same session: budget spent, the second tip (practice) does not chain in.
    await expect(page.getByText("Esta prática usa dificuldades e revisões recentes para escolher atividades.")).toHaveCount(0);

    await page.reload();
    await waitForLazyPage(page);
    await expect(page.getByTestId("dominio-page")).toBeVisible();
    await expect(page.getByText(MASTERY_SENTENCE)).toHaveCount(0);
  });
}
