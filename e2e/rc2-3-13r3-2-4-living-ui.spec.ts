import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedUnlockedLessonSession } from "./helpers";

/** Gate lib (plain ESM): evidence is bound to the runtime digest the gate recomputes. */
const GATE_LIB = "../scripts/lib/rc2-3-13r3-2-4-living-ui-gates.mjs";

/**
 * RC2.3.13R.3.2.4 — Living UI and the Chinese ornament family, measured in a
 * real engine (Chromium, Firefox and WebKit in CI).
 *
 * - Ambient budget: at every scroll position no more than 4 looping
 *   animations run, none far offscreen, none while the document is hidden,
 *   none under reduced motion — and the current-node halo stays visible.
 * - Ornaments: hidden from assistive tech, never focusable, never under text
 *   or a CTA, never resizing their host; visible in dark mode.
 * - Interaction: rapid Journey ↔ Culture switching never queues motion,
 *   sheets take taps while entering, progress and counters never replay on
 *   mount, and the Victory burst ends within 1.1 s.
 *
 * LIVING_UI_EVIDENCE=1 writes docs/release/evidence/rc2-3-13r3-2-4/
 * living-ui-evidence.json (consumed by validate:rc2-3-13r3-2-4-…).
 * LIVING_UI_SESSION=1 runs the emulated 30-minute session (Journey + Home,
 * Culture, topic, Review on a loop) and writes living-ui-30min-session.json:
 * ambient budget over time, heap growth after GC, errors. Never physical.
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
const TOPIC = "/cultura/topico/vida_cotidiana";
const MAX_AMBIENT = 4;

async function open(browser: Browser, row: Row, url = "/jornada") {
  const context = await browser.newContext({
    viewport: { width: row.width, height: row.height },
    locale: "pt-BR",
    reducedMotion: row.reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript((scale: number) => {
    const w = window as unknown as { __lyoShift: number | null };
    w.__lyoShift = null;
    try {
      type Src = { node?: Node };
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean; sources?: Src[] }>) {
          if (entry.hadRecentInput) continue;
          if ((entry.sources ?? []).some((s) => s.node instanceof Element && s.node.closest(".lyo"))) w.__lyoShift = (w.__lyoShift ?? 0) + entry.value;
        }
      });
      po.observe({ type: "layout-shift", buffered: true });
      w.__lyoShift = 0;
    } catch {
      w.__lyoShift = null;
    }
    if (scale !== 1) {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      });
    }
  }, row.fontScale);
  await seedUnlockedLessonSession(page, SEED_LESSON, { theme: row.theme, followSystemTheme: false });
  await page.goto(url);
  await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
  await dismissBlockingOverlays(page);
  return { context, page };
}

async function expandAll(page: Page) {
  const collapsed = page.locator('button[aria-expanded="false"]', { hasText: /^(Ver tudo|See all)$/ }).first();
  const expanded = page.locator('button[aria-expanded="true"]', { hasText: /^(Focar atual|Focus on current)$/ }).first();
  await expect(async () => {
    if (await collapsed.isVisible()) await collapsed.click({ timeout: 5_000 });
    await expect(expanded).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="journey-scene"]')).toHaveCount(40, { timeout: 10_000 });
  }).toPass({ timeout: 45_000, intervals: [500, 1_000, 2_000] });
}

/** Running looping animations (on screen and far offscreen), with names for diagnostics. */
async function loops(page: Page) {
  return page.evaluate(() => {
    const h = window.innerHeight;
    let running = 0;
    let offscreen = 0;
    const offscreenNames: string[] = [];
    for (const a of document.getAnimations()) {
      const timing = a.effect?.getComputedTiming?.();
      if (a.playState !== "running" || timing?.iterations !== Infinity) continue;
      const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
      const r = target?.getBoundingClientRect();
      if (!r || r.width === 0 || r.height === 0) continue;
      if (r.bottom < -100 || r.top > h + 100) {
        offscreen += 1;
        offscreenNames.push(`${(a as CSSAnimation).animationName ?? "?"}@${target?.getAttribute("data-ambient-kind") ?? target?.tagName}:${target?.getAttribute("data-ambient")}`);
      } else running += 1;
    }
    return { running, offscreen, offscreenNames };
  });
}

/**
 * Let the page render a few frames: the budget follows IntersectionObserver
 * records and applies on the next frame (or its timer backup). A real display
 * renders continuously; a headless engine may only when asked.
 */
async function settleFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let n = 0;
        const tick = () => (++n >= 3 ? setTimeout(resolve, 160) : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
        setTimeout(resolve, 1_000); // never hang if frames are suspended
      }),
  );
}

async function sampleAmbient(page: Page) {
  let maxRunning = 0;
  let offscreen = 0;
  const names = new Set<string>();
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const f of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
    // The app scrolls smoothly; sample at rest, not mid-flight.
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(height * f));
    await page.waitForTimeout(300);
    await settleFrames(page);
    // The budget converges within a few frames; give it a bounded moment, then judge.
    let now = await loops(page);
    for (let i = 0; i < 8 && now.offscreen > 0; i += 1) {
      await page.waitForTimeout(250);
      now = await loops(page);
    }
    maxRunning = Math.max(maxRunning, now.running);
    offscreen = Math.max(offscreen, now.offscreen);
    for (const name of now.offscreenNames) names.add(name);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  return { maxRunning, offscreen, offscreenNames: [...names] };
}

/** The app goes to the background: every loop pauses. */
async function hiddenLoops(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(250);
  let hidden = await loops(page);
  for (let i = 0; i < 6 && hidden.running + hidden.offscreen > 0; i += 1) {
    await page.waitForTimeout(250);
    hidden = await loops(page);
  }
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(250);
  return hidden.running + hidden.offscreen;
}

/** Decoration contract on the current page. */
async function decorations(page: Page) {
  return page.evaluate(() => {
    const hit = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const overlays = [...document.querySelectorAll<HTMLElement>(".lyo")];
    const announced = overlays.filter((el) => !el.closest('[aria-hidden="true"]')).length;
    const focusable = overlays.filter(
      (el) => el.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])') || [...el.querySelectorAll("svg")].some((s) => s.getAttribute("focusable") !== "false"),
    ).length;
    const interactive = overlays.filter((el) => getComputedStyle(el).pointerEvents !== "none").length;
    let textOverlap = 0;
    let ctaOverlap = 0;
    let sizeDelta = 0;
    let minContrast = Infinity;
    const lum = ([r, g, b]: number[]) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const rgba = (v: string) => {
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
    };
    const bgOf = (el: Element | null): number[] => {
      for (let n = el; n; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0.5) return c.rgb;
      }
      return [255, 255, 255];
    };
    const hosts = new Set(overlays.filter((el) => el.matches(".lyo-frame, .lyo-corner-motif")).map((el) => el.parentElement as HTMLElement));
    for (const host of hosts) {
      if (!host) continue;
      const rect = host.getBoundingClientRect();
      if (rect.width === 0) continue;
      // Text and CTAs inside the host (never decoration itself).
      const textRects: DOMRect[] = [];
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim() || n.parentElement?.closest(".lyo")) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        textRects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
      }
      const ctas = [...host.querySelectorAll("a, button")].filter((el) => !el.closest(".lyo")).map((el) => el.getBoundingClientRect());
      // Motif cores: the 40% of each corner tile nearest its corner, plus edge threads.
      const cores: DOMRect[] = [];
      for (const corner of host.querySelectorAll<HTMLElement>(":scope > .lyo .lyo-corner")) {
        const r = corner.getBoundingClientRect();
        const w = r.width * 0.4;
        const h = r.height * 0.4;
        const right = /lyo-at-(?:top|bottom)-right/.test(corner.className);
        const bottom = /lyo-at-bottom/.test(corner.className);
        cores.push(new DOMRect(right ? r.right - w : r.left, bottom ? r.bottom - h : r.top, w, h));
      }
      for (const edge of host.querySelectorAll<HTMLElement>(":scope > .lyo .lyo-edge")) {
        const r = edge.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) cores.push(new DOMRect(r.left, r.top, Math.max(1, r.width), Math.max(1, r.height)));
      }
      for (const c of cores) {
        textOverlap += textRects.filter((t) => hit(c, t)).length;
        ctaOverlap += ctas.filter((t) => hit(c, t)).length;
      }
      // Removing the decoration never changes the host's size.
      const overlay = host.querySelector<HTMLElement>(":scope > .lyo");
      if (overlay) {
        overlay.style.display = "none";
        const without = host.getBoundingClientRect();
        overlay.style.display = "";
        sizeDelta = Math.max(sizeDelta, Math.abs(without.width - rect.width), Math.abs(without.height - rect.height));
      }
      // Effective contrast of milestone motif threads over the host.
      const bg = bgOf(host);
      for (const path of host.querySelectorAll<SVGElement>(':scope > .lyo[data-intensity="milestone"] .lyo-corner .lyo-s-thread')) {
        const stroke = rgba(getComputedStyle(path).stroke);
        if (!stroke) continue;
        let alpha = stroke.a;
        for (let n: Element | null = path; n && n !== host; n = n.parentElement) alpha *= Number(getComputedStyle(n).opacity);
        const color = stroke.rgb.map((c, i) => c * alpha + bg[i] * (1 - alpha));
        const [l1, l2] = [lum(color), lum(bg)].sort((x, y) => y - x);
        minContrast = Math.min(minContrast, (l1 + 0.05) / (l2 + 0.05));
      }
    }
    const doc = document.documentElement;
    return {
      ornamentsMeasured: overlays.length,
      announcedDecorations: announced,
      focusableDecorations: focusable + interactive,
      decorationTextOverlap: textOverlap,
      decorationCtaOverlap: ctaOverlap,
      frameHostSizeDelta: Math.round(sizeDelta * 100) / 100,
      ornamentMinContrast: Number.isFinite(minContrast) ? Math.round(minContrast * 1000) / 1000 : null,
      horizontalOverflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
      decorationLayoutShift: (window as unknown as { __lyoShift: number | null }).__lyoShift,
    };
  });
}

async function focusEscapesDecoration(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let inside = 0;
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press("Tab");
    inside += await page.evaluate(() => (document.activeElement?.closest(".lyo") ? 1 : 0));
  }
  return inside;
}

async function measureRow(browser: Browser, row: Row) {
  const { context, page } = await open(browser, row);
  try {
    // Journey: milestone embroidery + budgeted loops.
    const halo = page.getByTestId("progression-current-pulse").first();
    await halo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const haloState = await halo.evaluate((el) => ({
      visible: el.getBoundingClientRect().width > 0 && Number(getComputedStyle(el).opacity) > 0,
      ambient: el.getAttribute("data-ambient"),
      animation: getComputedStyle(el).animationName,
    }));
    const journeyDecor = await decorations(page);
    await expandAll(page);
    const ambient = await sampleAmbient(page);
    const hidden = await hiddenLoops(page);
    const focusInside = await focusEscapesDecoration(page);
    // Culture topic hero.
    await page.goto(TOPIC);
    await page.waitForSelector('[data-testid="culture-topic-header"]');
    await dismissBlockingOverlays(page);
    await page.waitForTimeout(400);
    const topicDecor = await decorations(page);
    const contrasts = [journeyDecor.ornamentMinContrast, topicDecor.ornamentMinContrast].filter((c): c is number => c !== null);
    return {
      ...row,
      maxRunningAmbient: ambient.maxRunning,
      offscreenRunning: ambient.offscreen,
      offscreenNames: ambient.offscreenNames,
      hiddenRunning: hidden,
      haloVisible: haloState.visible,
      haloAnimation: haloState.animation,
      ornamentsMeasured: journeyDecor.ornamentsMeasured + topicDecor.ornamentsMeasured,
      announcedDecorations: journeyDecor.announcedDecorations + topicDecor.announcedDecorations,
      focusableDecorations: journeyDecor.focusableDecorations + topicDecor.focusableDecorations,
      decorationTextOverlap: journeyDecor.decorationTextOverlap + topicDecor.decorationTextOverlap,
      decorationCtaOverlap: journeyDecor.decorationCtaOverlap + topicDecor.decorationCtaOverlap,
      frameHostSizeDelta: Math.max(journeyDecor.frameHostSizeDelta, topicDecor.frameHostSizeDelta),
      ornamentMinContrast: contrasts.length ? Math.min(...contrasts) : null,
      horizontalOverflowPx: Math.max(journeyDecor.horizontalOverflowPx, topicDecor.horizontalOverflowPx),
      decorationLayoutShift:
        journeyDecor.decorationLayoutShift === null ? null : Math.round(((journeyDecor.decorationLayoutShift ?? 0) + (topicDecor.decorationLayoutShift ?? 0)) * 10000) / 10000,
      focusInsideDecoration: focusInside,
    };
  } finally {
    await context.close();
  }
}

function assertRow(r: Awaited<ReturnType<typeof measureRow>>) {
  expect.soft(r.maxRunningAmbient, `${r.name} ambient loops on screen`).toBeLessThanOrEqual(r.reducedMotion ? 0 : MAX_AMBIENT);
  expect.soft(r.offscreenRunning, `${r.name} loops far offscreen: ${r.offscreenNames.join(", ")}`).toBe(0);
  expect.soft(r.hiddenRunning, `${r.name} loops while hidden`).toBe(0);
  expect.soft(r.haloVisible, `${r.name} current-node halo visible`).toBe(true);
  if (r.reducedMotion) expect.soft(r.haloAnimation, `${r.name} halo still under reduced motion`).toBe("none");
  expect.soft(r.ornamentsMeasured, `${r.name} ornaments measured`).toBeGreaterThan(0);
  expect.soft(r.announcedDecorations, `${r.name} announced decorations`).toBe(0);
  expect.soft(r.focusableDecorations, `${r.name} focusable decorations`).toBe(0);
  expect.soft(r.decorationTextOverlap, `${r.name} ornament/text overlap`).toBe(0);
  expect.soft(r.decorationCtaOverlap, `${r.name} ornament/CTA overlap`).toBe(0);
  expect.soft(r.frameHostSizeDelta, `${r.name} frame resizes host`).toBe(0);
  expect.soft(r.horizontalOverflowPx, `${r.name} horizontal overflow`).toBe(0);
  expect.soft(r.focusInsideDecoration, `${r.name} focus inside decoration`).toBe(0);
  expect.soft(r.ornamentMinContrast ?? 0, `${r.name} ornament contrast`).toBeGreaterThanOrEqual(1.3);
  if (r.decorationLayoutShift !== null) expect.soft(r.decorationLayoutShift, `${r.name} decoration layout shift`).toBeLessThanOrEqual(0.001);
}

async function measureBurst(page: Page) {
  await page.goto("/qa/device");
  await page.getByTestId("qa-living-ui-burst-replay").click();
  await page.waitForTimeout(60);
  return page.evaluate(() => {
    const burst = document.querySelector('[data-testid="qa-living-ui-burst"] [data-testid="completion-burst"]');
    const animations = burst ? burst.getAnimations({ subtree: true }) : [];
    let maxEndMs = 0;
    let infinite = 0;
    for (const a of animations) {
      const t = a.effect?.getComputedTiming?.();
      if (!t) continue;
      if (t.iterations === Infinity) infinite += 1;
      else maxEndMs = Math.max(maxEndMs, Number(t.endTime ?? 0));
    }
    return { animations: animations.length, maxEndMs: Math.round(maxEndMs), infinite };
  });
}

async function measureRapidSwitch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/jornada");
  await page.waitForSelector("[data-progression-shell]");
  await dismissBlockingOverlays(page);
  let maxThumbAnimations = 0;
  for (let i = 0; i < 6; i += 1) {
    const tab = i % 2 === 0 ? "progression-tab-culture" : "progression-tab-journey";
    await page.getByTestId(tab).click({ timeout: 10_000 });
    // No waiting for motion: the next tap goes in as soon as the tab is selected.
    await expect(page.getByTestId(tab)).toHaveAttribute("aria-selected", "true", { timeout: 10_000 });
    const n = await page.evaluate(() => document.querySelector('[data-testid="progression-switch-thumb"]')?.getAnimations().length ?? 0);
    maxThumbAnimations = Math.max(maxThumbAnimations, n);
  }
  await page.waitForTimeout(800);
  const thumb = await page.evaluate(() => document.querySelector('[data-testid="progression-switch-thumb"]')?.className ?? "");
  return { finalPath: new URL(page.url()).pathname, errors: errors.length, maxThumbAnimations, thumbAtJourney: /translate-x-0/.test(thumb) };
}

async function measureSheet(page: Page) {
  await page.goto("/jornada");
  await page.waitForSelector("[data-progression-shell]");
  await dismissBlockingOverlays(page);
  await page.locator("[data-app-bottom-nav]").getByRole("button", { name: /Mais/ }).click();
  // In-page probe from the first frame the sheet exists: how long until its
  // first option is the hit target, and is the entrance still animating then.
  const probe = await page.evaluate(async () => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const t0 = performance.now();
    let dialog: Element | null = null;
    while (!(dialog = document.querySelector('[role="dialog"]')) && performance.now() - t0 < 3_000) await frame();
    if (!dialog) return { msToTappable: null, enterAnimating: false, takesTap: false };
    const appeared = performance.now();
    const overlay = dialog.closest(".living-overlay") ?? dialog;
    const target = dialog.querySelector<HTMLElement>("a, button");
    let takesTap = false;
    let enterAnimating = false;
    while (target && performance.now() - appeared < 1_000) {
      const r = target.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      takesTap = Boolean(hit && (hit === target || target.contains(hit))) && getComputedStyle(target).pointerEvents !== "none";
      if (takesTap) {
        enterAnimating = overlay.getAnimations({ subtree: true }).some((a) => a.playState === "running");
        break;
      }
      await frame();
    }
    return { msToTappable: takesTap ? Math.round(performance.now() - appeared) : null, enterAnimating, takesTap };
  });
  await page.getByRole("dialog").locator("a, button").first().click();
  return { clickDuringEnterMs: probe.msToTappable, enterAnimating: probe.enterAnimating, takesTap: probe.takesTap };
}

async function measureProgressAndCounters(page: Page) {
  await page.goto(TOPIC);
  await page.waitForSelector('[data-testid="culture-topic-header"] [data-progress-fill]');
  const first = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="culture-topic-header"] [data-progress-fill]');
    return { transition: el?.style.transition ?? "", transform: el?.style.transform ?? "", value: Number(el?.dataset.progressFill) };
  });
  // SPA remount (module state kept): back to the root, open the same topic again.
  await page.getByTestId("culture-topic-back").click();
  await page.getByTestId("culture-topic-card-vida_cotidiana").click();
  await page.waitForSelector('[data-testid="culture-topic-header"] [data-progress-fill]');
  const again = await page.evaluate(() => document.querySelector<HTMLElement>('[data-testid="culture-topic-header"] [data-progress-fill]')?.style.transition ?? "");
  await page.goto("/jornada");
  await page.waitForSelector("[data-progression-shell]");
  await page.waitForTimeout(400);
  const animatedOnMount = await page.evaluate(
    () => [...document.querySelectorAll("[data-living-counter]")].filter((el) => el.getAnimations().length > 0).length,
  );
  const counters = await page.evaluate(() => document.querySelectorAll("[data-living-counter]").length);
  return {
    progress: {
      replayedOnMount: Boolean(first.transition) || Boolean(again) || first.transform !== `translateX(${first.value - 100}%)`,
    },
    counters: { measured: counters, animatedOnMount },
  };
}

test.describe("RC2.3.13R.3.2.4 Living UI and ornaments", () => {
  // One test per matrix row so each has its own budget on slow engines.
  for (const row of process.env.LIVING_UI_EVIDENCE === "1" ? [] : MATRIX) {
    test(`ambient budget and ornament contract — ${row.name}`, async ({ browser }) => {
      test.setTimeout(240_000);
      assertRow(await measureRow(browser, row));
    });
  }

  test("victory burst is one short shot", async ({ page }) => {
    await seedUnlockedLessonSession(page, SEED_LESSON);
    const burst = await measureBurst(page);
    expect(burst.animations).toBeGreaterThan(0);
    expect(burst.infinite).toBe(0);
    expect(burst.maxEndMs).toBeLessThanOrEqual(1100);
  });

  test("rapid Journey ↔ Culture switching never queues motion", async ({ page }) => {
    await seedUnlockedLessonSession(page, SEED_LESSON);
    const rapid = await measureRapidSwitch(page);
    expect(rapid.finalPath).toBe("/jornada");
    expect(rapid.errors).toBe(0);
    expect(rapid.maxThumbAnimations).toBeLessThanOrEqual(1);
    expect(rapid.thumbAtJourney).toBe(true);
  });

  test("sheets take taps while entering; progress and counters never replay", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedUnlockedLessonSession(page, SEED_LESSON);
    const sheet = await measureSheet(page);
    expect(sheet.takesTap).toBe(true);
    expect(sheet.clickDuringEnterMs).not.toBeNull();
    expect(sheet.clickDuringEnterMs as number).toBeLessThanOrEqual(400);
    const pc = await measureProgressAndCounters(page);
    expect(pc.progress.replayedOnMount).toBe(false);
    expect(pc.counters.animatedOnMount).toBe(0);
  });

  if (process.env.LIVING_UI_EVIDENCE === "1") test("evidence: full matrix in one engine session", async ({ browser, page }) => {
    test.setTimeout(1_200_000);
    const rows = [];
    for (const row of MATRIX) {
      const result = await measureRow(browser, row);
      rows.push(result);
      assertRow(result);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await seedUnlockedLessonSession(page, SEED_LESSON);
    const burst = await measureBurst(page);
    const rapidSwitch = await measureRapidSwitch(page);
    const modal = await measureSheet(page);
    expect(modal.takesTap).toBe(true);
    const { progress, counters } = await measureProgressAndCounters(page);
    const lib = await import(/* @vite-ignore */ GATE_LIB);
    expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(lib.REQUIRED_EVIDENCE_ROWS));
    const out = path.join(process.cwd(), "docs/release/evidence/rc2-3-13r3-2-4/living-ui-evidence.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const evidence = {
      schema: "longyu-living-ui-evidence/1",
      wave: "RC2.3.13R.3.2.4",
      runtimeDigest: lib.runtimeDigest(lib.loadLivingUiSources()),
      engine: test.info().project.name,
      seedLesson: SEED_LESSON,
      maxAmbient: MAX_AMBIENT,
      rows,
      burst,
      rapidSwitch,
      modal,
      progress,
      counters,
    };
    fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
  });

  if (process.env.LIVING_UI_SESSION === "1") test("evidence: emulated 30-minute session", async ({ page }) => {
    const minutes = Number(process.env.LIVING_UI_SESSION_MINUTES ?? "30");
    test.setTimeout((minutes + 10) * 60_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await seedUnlockedLessonSession(page, SEED_LESSON);
    // Heap after a forced GC (Chromium DevTools protocol); null where unavailable.
    let cdp: Awaited<ReturnType<ReturnType<Page["context"]>["newCDPSession"]>> | null = null;
    try {
      cdp = await page.context().newCDPSession(page);
    } catch {
      cdp = null;
    }
    const heapMb = async () => {
      if (!cdp) return null;
      await cdp.send("HeapProfiler.collectGarbage");
      const usage = (await cdp.send("Runtime.getHeapUsage")) as { usedSize: number };
      return Math.round((usage.usedSize / 1048576) * 10) / 10;
    };
    const stops = ["/jornada", "/cultura", TOPIC, "/revisao"];
    let maxRunning = 0;
    let maxOffscreen = 0;
    let cycles = 0;
    let heapStart: number | null = null;
    const started = Date.now();
    while (Date.now() - started < minutes * 60_000) {
      for (const stop of stops) {
        await page.goto(stop);
        await dismissBlockingOverlays(page);
        await page.waitForTimeout(1_500);
        const sample = await sampleAmbient(page);
        maxRunning = Math.max(maxRunning, sample.maxRunning);
        maxOffscreen = Math.max(maxOffscreen, sample.offscreen);
      }
      cycles += 1;
      if (cycles === 1) heapStart = await heapMb();
    }
    const heapEnd = await heapMb();
    const durationMinutes = Math.round(((Date.now() - started) / 60_000) * 10) / 10;
    expect(maxRunning).toBeLessThanOrEqual(MAX_AMBIENT);
    expect(maxOffscreen).toBe(0);
    expect(errors).toEqual([]);
    const lib = await import(/* @vite-ignore */ GATE_LIB);
    const out = path.join(process.cwd(), "docs/release/evidence/rc2-3-13r3-2-4/living-ui-30min-session.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const session = {
      schema: "longyu-living-ui-session/1",
      wave: "RC2.3.13R.3.2.4",
      runtimeDigest: lib.runtimeDigest(lib.loadLivingUiSources()),
      engine: test.info().project.name,
      kind: "EMULATED_DESKTOP_ENGINE",
      physical: false,
      viewport: "390x844",
      route: stops,
      durationMinutes,
      cycles,
      maxRunningAmbient: maxRunning,
      maxOffscreenLoops: maxOffscreen,
      heapStartMb: heapStart,
      heapEndMb: heapEnd,
      heapGrowthMb: heapStart !== null && heapEnd !== null ? Math.round((heapEnd - heapStart) * 10) / 10 : null,
      pageErrors: errors.length,
      note: "Engine-emulated session (no battery, heat or audio-device signal). Physical 30-minute judgement stays with the owner on the Device-QA APK.",
    };
    fs.writeFileSync(out, `${JSON.stringify(session, null, 2)}\n`);
  });
});
