import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedUnlockedLessonSession } from "./helpers";

/** Gate lib (plain ESM): evidence is bound to the runtime digest the gate recomputes. */
const GATE_LIB = "../scripts/lib/rc2-3-13r3-2-3-journey-svg-gates.mjs";

/**
 * RC2.3.13R.3.2.3 — Journey SVG scene lanes, measured in a real engine.
 *
 * With every module expanded (≈40 scenes), no scene may touch a node, a
 * label, the CTA pill, an inline card or an ornament; the node axis must sit
 * on the axis line; nothing may scroll sideways; scenes are decorative and
 * still under reduced motion. Runs on Chromium, Firefox and WebKit in CI.
 *
 * JOURNEY_SCENE_EVIDENCE=1 also writes docs/release/evidence/rc2-3-13r3-2-3/
 * journey-scene-layout.json (consumed by validate:journey-scene-layout).
 */

type Row = {
  name: string;
  width: number;
  height: number;
  theme: "clay" | "dark";
  fontScale: number;
  reducedMotion: boolean;
};

const MATRIX: Row[] = [
  { name: "360x640-light", width: 360, height: 640, theme: "clay", fontScale: 1, reducedMotion: false },
  { name: "375x667-light", width: 375, height: 667, theme: "clay", fontScale: 1, reducedMotion: false },
  { name: "390x844-light", width: 390, height: 844, theme: "clay", fontScale: 1, reducedMotion: false },
  { name: "390x844-dark", width: 390, height: 844, theme: "dark", fontScale: 1, reducedMotion: false },
  { name: "tablet-834x1112-light", width: 834, height: 1112, theme: "clay", fontScale: 1, reducedMotion: false },
  { name: "desktop-1280x900-light", width: 1280, height: 900, theme: "clay", fontScale: 1, reducedMotion: false },
  { name: "360x640-large-font", width: 360, height: 640, theme: "clay", fontScale: 1.3, reducedMotion: false },
  { name: "390x844-reduced-motion", width: 390, height: 844, theme: "clay", fontScale: 1, reducedMotion: true },
];

const SEED_LESSON = "l9-tudo-bem";

async function openJourney(browser: Browser, row: Row) {
  const context = await browser.newContext({
    viewport: { width: row.width, height: row.height },
    locale: "pt-BR",
    reducedMotion: row.reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript((scale: number) => {
    // Layout shifts attributed to scene lanes (Chromium exposes layout-shift).
    const w = window as unknown as { __sceneShift: number | null };
    w.__sceneShift = null;
    try {
      // Only shifts where a scene box itself changed size count against scenes;
      // a scene merely carried along by content above is not a scene shift.
      type Src = { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly };
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean; sources?: Src[] }>) {
          if (entry.hadRecentInput) continue;
          const own = (entry.sources ?? []).some(
            (s) =>
              s.node instanceof Element &&
              s.node.closest(".journey-scene") &&
              (Math.abs(s.previousRect.width - s.currentRect.width) > 0.5 || Math.abs(s.previousRect.height - s.currentRect.height) > 0.5),
          );
          if (own) w.__sceneShift = (w.__sceneShift ?? 0) + entry.value;
        }
      });
      po.observe({ type: "layout-shift", buffered: true });
      w.__sceneShift = 0;
    } catch {
      w.__sceneShift = null;
    }
    if (scale !== 1) {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      });
    }
  }, row.fontScale);
  await seedUnlockedLessonSession(page, SEED_LESSON, { theme: row.theme, followSystemTheme: false });
  await page.goto("/jornada");
  await page.waitForSelector("[data-journey-scene-lanes]", { timeout: 45_000 });
  await dismissBlockingOverlays(page);
  return { context, page };
}

async function expandAll(page: Page) {
  const toggle = page.locator('button[aria-expanded="false"]', { hasText: /^(Ver tudo|See all)$/ }).first();
  await toggle.click();
  await expect(page.locator('[data-testid="journey-scene"]')).toHaveCount(40, { timeout: 15_000 });
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const rects = (sel: string) => [...document.querySelectorAll(sel)].map(vis).filter((r): r is DOMRect => Boolean(r));
    const hit = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const scenes = [...document.querySelectorAll<HTMLElement>('[data-testid="journey-scene"]')];
    const sceneRects = scenes.map(vis).filter((r): r is DOMRect => Boolean(r));
    const count = (others: DOMRect[]) => sceneRects.reduce((n, s) => n + others.filter((o) => hit(s, o)).length, 0);
    const nodes = rects("[data-progression-node]");
    const labels = rects('[data-testid="progression-node-label"]');
    const ctas = rects('[data-testid="progression-current-cta"]');
    const cards = rects(
      "[data-journey-instruction-before] > *, [data-journey-inline-after] > *, [data-journey-culture-moments-after] > *, [data-journey-culture-gate-before] > *, [data-journey-culture-recall-after] > *",
    );
    const ornaments = rects("[data-journey-lane-ornament], [data-symbolic-ornament]");

    // Axis: every lesson node (decorated or not) sits on its frame's axis line.
    let axisDeltaPx = 0;
    let axisLineDeltaPx = 0;
    for (const frame of document.querySelectorAll<HTMLElement>("[data-journey-scene-lanes]")) {
      const line = frame.querySelector('[data-progression-axis-line="true"]');
      if (!line) continue;
      const lr = line.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const axis = lr.left + lr.width / 2;
      axisLineDeltaPx = Math.max(axisLineDeltaPx, Math.abs(axis - (fr.left + fr.width / 2)));
      for (const bubble of frame.querySelectorAll("[data-journey-bubble-v2] [data-progression-node]")) {
        const r = bubble.getBoundingClientRect();
        axisDeltaPx = Math.max(axisDeltaPx, Math.abs(r.left + r.width / 2 - axis));
      }
    }

    let alternationBreaks = 0;
    for (const el of scenes) {
      const ordinal = Number(el.dataset.sceneOrdinal);
      const side = el.dataset.sceneSide;
      if (side !== (ordinal % 2 === 0 ? "left" : "right")) alternationBreaks += 1;
      const frame = el.closest("[data-journey-scene-lanes]");
      const line = frame?.querySelector('[data-progression-axis-line="true"]')?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (line && r.width > 0) {
        const axis = line.left + line.width / 2;
        if (side === "left" ? r.right > axis : r.left < axis) alternationBreaks += 1;
      }
    }

    const focusable = scenes.filter(
      (el) =>
        el.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])') ||
        el.querySelector("svg")?.getAttribute("focusable") !== "false",
    ).length;
    const exposed = scenes.filter((el) => !el.closest('[aria-hidden="true"]')).length;
    const broken = scenes.filter((el) => {
      const svg = el.querySelector("svg.journey-scene-svg");
      return !svg || svg.querySelectorAll("path, rect, circle, ellipse").length < 8;
    }).length;
    const animating = scenes.filter((el) => {
      const drift = el.querySelector(".journey-scene-drift");
      const reveal = el.querySelector(".journey-scene-reveal");
      return (drift && getComputedStyle(drift).animationName !== "none") || (reveal && Number(getComputedStyle(reveal).opacity) < 1);
    }).length;
    const widths = sceneRects.map((r) => r.width);
    const heights = sceneRects.map((r) => r.height);
    const doc = document.documentElement;
    return {
      scenesMeasured: sceneRects.length,
      sceneNodeOverlap: count(nodes),
      sceneLabelOverlap: count(labels),
      sceneCtaOverlap: count(ctas),
      sceneCardOverlap: count(cards),
      sceneOrnamentOverlap: count(ornaments),
      horizontalOverflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
      axisDeltaPx: Math.round(axisDeltaPx * 100) / 100,
      axisLineDeltaPx: Math.round(axisLineDeltaPx * 100) / 100,
      maxSceneHeightPx: Math.round(Math.max(0, ...heights) * 10) / 10,
      maxSceneWidthPx: Math.round(Math.max(0, ...widths) * 10) / 10,
      minSceneWidthPx: Math.round(Math.min(...widths) * 10) / 10,
      alternationBreaks,
      focusableScenes: focusable,
      exposedScenes: exposed,
      brokenScenes: broken,
      animatingScenes: animating,
      sceneLayoutShift: (window as unknown as { __sceneShift: number | null }).__sceneShift,
    };
  });
}

/**
 * A scene can only ever affect its own lane row. Per decorated row: row height
 * and the node's offset inside the row (async inline content elsewhere on the
 * path — published capsules, recall cards — is not attributed to scenes).
 */
async function nodePositions(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".journey-lane-row")].map((row) => {
      const rr = row.getBoundingClientRect();
      const n = row.querySelector("[data-progression-node]")!.getBoundingClientRect();
      return [Math.round(rr.height), Math.round(n.left - rr.left), Math.round(n.top - rr.top)];
    }),
  );
}

async function measureRow(browser: Browser, row: Row) {
  const { context, page } = await openJourney(browser, row);
  try {
    await expandAll(page);
    const before = await nodePositions(page);
    // Reveal transitions + drift run; nodes must not move at all.
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const after = await nodePositions(page);
    const nodeJumpPx = before.reduce(
      (max, cells, i) => Math.max(max, ...cells.map((v, k) => Math.abs(v - (after[i]?.[k] ?? v)))),
      0,
    );
    // Reduced motion: drift off; reveal already complete. Wait for reveals elsewhere.
    if (!row.reducedMotion) {
      for (const scene of await page.locator('[data-testid="journey-scene"]').all()) {
        await scene.scrollIntoViewIfNeeded();
      }
    }
    return { ...row, nodeJumpPx, ...(await measure(page)) };
  } finally {
    await context.close();
  }
}

function assertRow(r: Awaited<ReturnType<typeof measureRow>>) {
  expect.soft(r.scenesMeasured, `${r.name} scenes measured`).toBeGreaterThan(0);
  expect.soft(r.sceneNodeOverlap, `${r.name} scene/node overlap`).toBe(0);
  expect.soft(r.sceneLabelOverlap, `${r.name} scene/label overlap`).toBe(0);
  expect.soft(r.sceneCtaOverlap, `${r.name} scene/CTA overlap`).toBe(0);
  expect.soft(r.sceneCardOverlap, `${r.name} scene/card overlap`).toBe(0);
  expect.soft(r.sceneOrnamentOverlap, `${r.name} scene/ornament overlap`).toBe(0);
  expect.soft(r.horizontalOverflowPx, `${r.name} horizontal overflow`).toBe(0);
  // ≤ 1 px: engines round sub-pixels differently; rounding is not movement.
  expect.soft(r.axisDeltaPx, `${r.name} node axis`).toBeLessThanOrEqual(1);
  expect.soft(r.axisLineDeltaPx, `${r.name} axis line`).toBeLessThanOrEqual(1);
  expect.soft(r.maxSceneHeightPx, `${r.name} scene height`).toBeLessThanOrEqual(140);
  expect.soft(r.alternationBreaks, `${r.name} alternation`).toBe(0);
  expect.soft(r.nodeJumpPx, `${r.name} node jump`).toBe(0);
  expect.soft(r.focusableScenes, `${r.name} focusable scenes`).toBe(0);
  expect.soft(r.exposedScenes, `${r.name} exposed scenes`).toBe(0);
  expect.soft(r.brokenScenes, `${r.name} broken scenes`).toBe(0);
  if (r.reducedMotion) expect.soft(r.animatingScenes, `${r.name} animating under reduced motion`).toBe(0);
  if (r.sceneLayoutShift !== null) expect.soft(r.sceneLayoutShift, `${r.name} scene layout shift`).toBeLessThanOrEqual(0.01);
}

test.describe("RC2.3.13R.3.2.3 Journey SVG scene lanes", () => {
  test("scenes stay in side lanes across the responsive/theme/a11y matrix", async ({ browser }) => {
    test.setTimeout(300_000);
    const rows = [];
    for (const row of MATRIX) {
      const result = await measureRow(browser, row);
      rows.push(result);
      assertRow(result);
    }
    if (process.env.JOURNEY_SCENE_EVIDENCE === "1") {
      const lib = await import(/* @vite-ignore */ GATE_LIB);
      expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(lib.REQUIRED_LAYOUT_ROWS));
      const out = path.join(process.cwd(), "docs/release/evidence/rc2-3-13r3-2-3/journey-scene-layout.json");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const evidence = {
        schema: "longyu-journey-scene-layout/1",
        wave: "RC2.3.13R.3.2.3",
        runtimeDigest: lib.runtimeDigest(lib.loadJourneySvgSources()),
        engine: test.info().project.name,
        seedLesson: SEED_LESSON,
        expanded: "all modules",
        rows,
      };
      fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
    }
  });

  test("arrangement is deterministic across reloads and progress", async ({ page }) => {
    const arrangement = () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-testid="journey-scene"]')].map(
          (el) => `${el.closest("[data-journey-lane-row]")?.getAttribute("data-journey-lane-row")}:${el.dataset.journeyScene}:${el.dataset.sceneSide}`,
        ),
      );
    await seedUnlockedLessonSession(page, SEED_LESSON);
    await page.goto("/jornada");
    await page.waitForSelector("[data-journey-scene-lanes]");
    await dismissBlockingOverlays(page);
    await expandAll(page);
    const first = await arrangement();
    await page.reload();
    await page.waitForSelector("[data-journey-scene-lanes]");
    await dismissBlockingOverlays(page);
    await expandAll(page);
    expect(await arrangement()).toEqual(first);
    expect(new Set(first.map((a) => a.split(":")[1])).size).toBe(16);
  });

  test("scenes never take taps and never fetch anything", async ({ page }) => {
    const svgRequests: string[] = [];
    page.on("request", (req) => {
      // Dev servers load `?raw` modules as scripts; production inlines them. Only
      // image/fetch traffic would mean a runtime asset dependency.
      if (req.resourceType() !== "script" && /\.svg(\?|$)/.test(req.url())) svgRequests.push(req.url());
    });
    await seedUnlockedLessonSession(page, SEED_LESSON);
    await page.goto("/jornada");
    await page.waitForSelector("[data-journey-scene-lanes]");
    await dismissBlockingOverlays(page);
    const scene = page.locator('[data-testid="journey-scene"]').first();
    await scene.scrollIntoViewIfNeeded();
    const url = page.url();
    const box = await scene.boundingBox();
    expect(box).not.toBeNull();
    const target = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest("a,button,[role=button]")?.tagName ?? null,
      [box!.x + box!.width / 2, box!.y + box!.height / 2],
    );
    expect(target).toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    expect(page.url()).toBe(url);
    // Offline: scenes are bundled markup, so a dropped network changes nothing.
    await page.context().setOffline(true);
    await expandAll(page);
    await page.context().setOffline(false);
    expect(svgRequests).toEqual([]);
  });
});
