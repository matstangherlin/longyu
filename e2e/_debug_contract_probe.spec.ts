/**
 * Temporary debug probe for Chromium E2E contract drift (topic hub + journey bubbles).
 * Not a product gate — gathers runtime evidence into /opt/cursor/logs/debug.log.
 */
import { expect, test } from "@playwright/test";
import {
  CULTURE_DISCOVERED_LESSONS,
  dismissBlockingOverlays,
  flushAgentDebugLogs,
  seedAtCultureGate,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedMissionsSession,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";
import { CULTURE_PROGRESSION_GATES } from "../src/data/cultureProgressionGates";

const SOCIAL = CULTURE_PROGRESSION_GATES.find((g) => g.id === "gate-social-etiquette")!;

test.describe("_debug contract probe", () => {
  test("A/B/C/D — culture hub + journey progress + crash seed + gate locale", async ({ page }) => {
    test.setTimeout(120_000);

    // A — Culture root topic hub vs stale catalog expectations
    await seedInterfaceLocale(page, "pt-BR");
    await seedInstructionLocale(page, "pt-BR");
    await seedOnboardedSession(page, CULTURE_DISCOVERED_LESSONS);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const cultureProbe = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent?.trim() ?? null;
      const hub = document.querySelector('[data-testid="culture-hub"]');
      const journey = document.querySelector('[data-testid="culture-journey"]');
      return {
        h1,
        hasExploreTagline: Boolean(document.body.textContent?.includes("Explore a China além das palavras")),
        hasCultureHeaderCultura: Boolean([...document.querySelectorAll("h1,h2")].some((el) => el.textContent?.trim() === "Cultura")),
        topicHubAttr: journey?.getAttribute("data-culture-topic-hub"),
        topicGrid: Boolean(document.querySelector('[data-testid="culture-topic-grid"]')),
        collectionsOnRoot: Boolean(document.querySelector('[data-testid="culture-collections"]')),
        springFestivalCard: Boolean(document.querySelector('[data-testid="culture-card"][data-culture-id="spring-festival"]')),
        hubPresent: Boolean(hub),
      };
    });
    await flushAgentDebugLogs(page, {
      hypothesisId: "A",
      location: "_debug_contract_probe:cultura",
      message: "DOM vs culture-hub.spec stale selectors",
      data: cultureProbe,
    });

    // B — data-topic-progress placement
    await page.evaluate(() => localStorage.removeItem("longyu-v1"));
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20, completedLessons: [] });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const progressProbe = await page.evaluate(() => {
      const current = document.querySelector('[aria-current="step"]');
      const wrapper = document.querySelector("[data-journey-bubble-v2]");
      return {
        currentTag: current?.tagName ?? null,
        currentDataTopicProgress: current?.getAttribute("data-topic-progress"),
        wrapperDataTopicProgress: wrapper?.getAttribute("data-topic-progress"),
        pulseClassOnCurrent: document.querySelector('[data-testid="progression-current-pulse"]')?.className ?? null,
        animatePulseSelectorCount: document.querySelectorAll("main .animate-pulse").length,
        motionSafePulseCount: document.querySelectorAll('[class*="motion-safe:animate-pulse"]').length,
        startCtaTexts: [...document.querySelectorAll('[data-testid="home-continue-cta"]')].map((el) => el.textContent?.trim()),
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      };
    });
    await flushAgentDebugLogs(page, {
      hypothesisId: "B",
      location: "_debug_contract_probe:jornada-progress",
      message: "topic progress + CTA + pulse selectors",
      data: progressProbe,
    });

    // C — corrupted persistence crash (write payload directly — init scripts accumulate)
    await page.goto("/jornada");
    await page.evaluate(() => {
      localStorage.setItem("longyu:e2e-allow-local", "1");
      localStorage.setItem("longyu:telemetry-consent", "0");
      localStorage.setItem(
        "longyu-v1",
        JSON.stringify({
          state: {
            accountSetupComplete: true,
            holdAchievementModals: true,
            completedLessons: ["l1", "l2", "l3"],
            srs: { bad: null, empty: {} },
            learnedChunks: null,
            learnedChars: null,
            today: null,
            dailyMissions: { date: "2099-01-01" },
          },
          version: 21,
        })
      );
    });
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const crashProbe = await page.evaluate(() => {
      const crash = [...document.querySelectorAll("h1,h2")].some((el) =>
        /Algo saiu do prumo|Something went off track/i.test(el.textContent ?? "")
      );
      return {
        crashHeadingVisible: crash,
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        bodySnippet: (document.body.innerText ?? "").slice(0, 240),
      };
    });
    await flushAgentDebugLogs(page, {
      hypothesisId: "C",
      location: "_debug_contract_probe:corrupted-persist",
      message: "jornada-prod-crash crash boundary visibility",
      data: crashProbe,
    });

    // D — culture gate locale source
    await page.evaluate(() => localStorage.removeItem("longyu-v1"));
    await seedInstructionLocale(page, "en", { force: true });
    await seedAtCultureGate(page, SOCIAL.beforeTopicId);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const expandAll = page.getByRole("button", { name: /Expandir tudo|Expand all|Ver tudo/i });
    if (await expandAll.count()) await expandAll.first().click().catch(() => {});
    const gate = page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`);
    await expect(gate).toBeVisible({ timeout: 15_000 });
    const gateLead = await gate.getByTestId("culture-gate-lead").textContent();
    await flushAgentDebugLogs(page, {
      hypothesisId: "D",
      location: "_debug_contract_probe:culture-gate-locale",
      message: "gate lead after instructionLocale=en only",
      data: { gateLead, expectedEn: "Before you continue, understand this context." },
    });
  });
});
