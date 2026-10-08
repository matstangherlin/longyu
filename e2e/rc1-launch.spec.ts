import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as curriculumFreezeModule from "../src/lib/curriculumFreeze";
import {
  CURRICULUM_FREEZE,
  RC1_EXPECTED_LESSON_COUNT,
  RC1_EXPECTED_TEACHING_TOPIC_COUNT,
  RC_BASE_FINGERPRINT,
} from "../src/lib/curriculumFreeze";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";

const crashTitle = /Algo saiu do prumo|Something went off track|Unexpected Application Error/i;

test.describe("RC1 launch surfaces", () => {
  test("freeze contract still matches the shipped Journey", async () => {
    expect(CURRICULUM_FREEZE).toBe("RC2_CONTENT_FREEZE");
    // RC2.3.4A — o fingerprint só avança por registros tipados
    // (EXPECTED_FINGERPRINT_ADVANCE) em curriculumFreeze.ts. Mesma fonte de
    // verdade de validate:release-candidate: âncora certificada → cadeia
    // linear → fingerprint vivo da Jornada, que tem de ser o declarado.
    const root = process.cwd();
    const chainLib = (await import(pathToFileURL(path.join(root, "scripts/lib/fingerprint-chain.mjs")).href)) as {
      RC_FINGERPRINT_ANCHOR: string;
      fingerprintRecords: (module: unknown) => unknown[];
      verifyFingerprintChain: (input: {
        anchor: string;
        declared: string;
        live: string;
        records: unknown[];
        knownScripts: Set<string>;
      }) => { errors: string[]; path: string[] };
    };
    const reportMeta = (await import(pathToFileURL(path.join(root, "scripts/lib/report-meta.mjs")).href)) as {
      journeyFingerprint: (rootDir: string) => string;
    };
    const live = reportMeta.journeyFingerprint(root);
    const chain = chainLib.verifyFingerprintChain({
      anchor: chainLib.RC_FINGERPRINT_ANCHOR,
      declared: RC_BASE_FINGERPRINT,
      live,
      records: chainLib.fingerprintRecords(curriculumFreezeModule),
      knownScripts: new Set(Object.keys(JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {})),
    });
    expect(chain.errors).toEqual([]);
    expect(chain.path[0]).toBe(chainLib.RC_FINGERPRINT_ANCHOR);
    expect(RC_BASE_FINGERPRINT).toBe(chain.path[chain.path.length - 1]);
    expect(RC_BASE_FINGERPRINT).toBe(live);
    expect(ALL_LESSONS).toHaveLength(RC1_EXPECTED_LESSON_COUNT);
    expect(
      ALL_LESSONS.filter((lesson) => !lesson.isReview && !lesson.reviewMasteryMode)
    ).toHaveLength(RC1_EXPECTED_TEACHING_TOPIC_COUNT);
  });

  test("jornada, conta and pro render without a page crash", async ({ page }) => {
    await seedOnboardedSession(page, ["l1", "l2", "l3"]);

    for (const route of ["/jornada", "/conta", "/pro"] as const) {
      await page.goto(route);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByRole("heading", { name: crashTitle })).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
    }

    await expect(page.getByRole("heading", { name: /Planos|Plans/i }).first()).toBeVisible();
  });

  test("first Journey lesson opens with a first step and a CTA", async ({ page }) => {
    await seedFreshJourneySession(page);
    await seedLessonPlayerReady(page, "l1");
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: crashTitle })).toHaveCount(0);

    const kind = page.locator("[data-current-step-kind]");
    await expect(kind).toHaveAttribute("data-current-step-kind", /^[a-z][a-z0-9_]*$/);

    // First-step CTA may be GuideDialogue, docked sticky, or an inline Continuar/Falar.
    const cta = page
      .locator("[data-testid=guide-continue], [data-lesson-sticky-actions] button:visible, [data-lesson-action-region] button:visible")
      .or(page.getByRole("button", { name: /^(Continuar|Entendi|Falar|Não posso falar agora)/i }))
      .first();
    await expect(cta).toBeVisible();
  });
});
