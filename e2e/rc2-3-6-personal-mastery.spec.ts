/**
 * RC2.3.6 — Personal Mastery (WEB evidence only).
 *
 * A learner through l2 with repeated listening misses on 你 and spaced
 * independent successes on 好: "Seu Domínio" shows human labels (no numbers),
 * explains "Por que estou vendo isto?", and "Praticar o que preciso" opens the
 * EXISTING review player with taught items only. 360/375/390 without
 * horizontal overflow. WEB_PASS ≠ OWNER_MASTERY_ACCEPTANCE.
 */
import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];
const DAY = 86_400_000;

test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
});

function evidence(now: number) {
  const events: Record<string, unknown>[] = [];
  const add = (target: string, skill: string, dimension: string, result: string, day: number, activity: string) =>
    events.push({
      id: `ev_e2e_${events.length}`,
      targetId: target,
      targetType: "HANZI",
      dimension,
      skill,
      result,
      independence: 1,
      supportUsed: [],
      source: { activityId: activity },
      timestamp: now - day * DAY,
    });
  for (let i = 0; i < 4; i += 1) add("hanzi:你", "LISTENING_CHOICE", "listening", "FAILURE", i, `journey:listen_select:${i}`);
  for (let i = 0; i < 6; i += 1) add("hanzi:好", "MEANING_CHOICE", "meaning", "SUCCESS", i * 2, `journey:comprehend:${i % 3}`);
  events.sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
  return { version: 1, deviceId: "dev_e2e", recent: events, aggregates: {}, seen: events.map((e) => e.id) };
}

async function seed(page: Page) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const now = Date.now();
  const srsItem = (type: string, itemId: string, domain: string) => ({
    id: `${type}:${itemId}:${domain}`,
    type,
    itemId,
    reviewDomain: domain,
    ease: 2.5,
    intervalDays: 3,
    due: now + 3 * DAY,
    reps: 2,
    lapses: 0,
    createdAt: now - 10 * DAY,
  });
  const store = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      guidance: { version: 2, enabled: false, initialized: true, records: {} },
      completedLessons: THROUGH_L2,
      learnedChars: ["你", "好"],
      srs: {
        "char:ni:som": srsItem("char", "ni", "som"),
        "char:ni:significado": srsItem("char", "ni", "significado"),
        "char:hao:significado": srsItem("char", "hao", "significado"),
      },
    },
    version: STORE_VERSION,
  });
  const record = JSON.stringify(evidence(now));
  await page.addInitScript(
    ([s, r]: string[]) => {
      if (sessionStorage.getItem("rc236-seeded")) return;
      sessionStorage.setItem("rc236-seeded", "1");
      localStorage.setItem("longyu-v1", s);
      localStorage.setItem("longyu:learner-evidence-v1", r);
      localStorage.setItem("longyu:learner-evidence-legacy-v1", "seeded");
    },
    [store, record]
  );
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const vp of VIEWPORTS) {
  test(`Seu Domínio + Praticar o que preciso @${vp.width}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await seed(page);
    await page.goto("/dominio");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const pageRoot = page.getByTestId("dominio-page");
    await expect(pageRoot).toBeVisible();
    const practice = page.getByTestId("dominio-practice");
    await expect(practice).toContainText("你");
    await expect(practice).toContainText("Ouvir");
    await expect(page.getByTestId("dominio-strong")).toContainText("好");
    // No scores, no percentages, no rankings.
    await expect(pageRoot).not.toContainText("%");
    await expect(pageRoot).not.toContainText(/\b0\.\d+\b/);
    await noHorizontalOverflow(page);

    await practice.getByTestId("mastery-why").first().click();
    const why = practice.getByTestId("mastery-why-text").first();
    await expect(why).toBeVisible();
    await expect(why).not.toContainText(/fraco|ruim|errou muito|fracasso/i);

    await page.getByTestId("practice-what-i-need").click();
    await expect(page).toHaveURL(/\/revisao\?sessao=dominio/);
    await waitForLazyPage(page);
    // The existing review round opens with at least one taught item.
    await expect(page.locator("[data-review-page]")).toBeVisible();
    await expect(page.getByText(/Nada para revisar|Nenhum item/i)).toHaveCount(0);
    await noHorizontalOverflow(page);
  });
}

test("evidence record carries no raw speech or handwriting", async ({ page }) => {
  await seed(page);
  await page.goto("/dominio");
  await waitForLazyPage(page);
  const raw = await page.evaluate(() => localStorage.getItem("longyu:learner-evidence-v1") ?? "");
  expect(raw).not.toMatch(/transcript|audioUrl|blob:|strokes|voiceprint/i);
});
