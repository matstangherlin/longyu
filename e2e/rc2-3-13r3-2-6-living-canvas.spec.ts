import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, seedUnlockedLessonSession, waitForLazyPage } from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";

/**
 * RC2.3.13R.3.2.6 — Chinese Living Canvas, measured in a real engine
 * (Chromium, Firefox and WebKit in CI).
 *
 * - Living scenes move by their subject (parts), inside the ambient budget:
 *   ≤ 4 owners, ≤ 2 scenes, ≤ 16 raw loops, 0 unbudgeted, 0 offscreen; 0 in a
 *   hidden tab and under reduced motion.
 * - A scene that loses its slot rests on its authored drawing (no tilted
 *   lantern, no half-faded cloud); scenes enter from their own side.
 * - The Culture topic hero carries exactly one living scene inside a
 *   Heritage frame; frames never take taps, focus or announcements.
 *
 * LIVING_CANVAS_EVIDENCE=1 writes docs/release/evidence/rc2-3-13r3-2-6/
 * living-canvas-evidence.json (CODE/EMULATED evidence, never physical).
 */

const SEED_LESSON = "l9-tudo-bem";
const TOPIC = "/cultura/topico/vida_cotidiana";
const MAX_OWNERS = 4;
const MAX_SCENES = 2;
const MAX_LOOPS = 16;
const evidence: Record<string, unknown> = {};

async function open(browser: Browser, opts: { width?: number; height?: number; theme?: "clay" | "dark"; reducedMotion?: boolean; url?: string } = {}) {
  const context = await browser.newContext({
    viewport: { width: opts.width ?? 390, height: opts.height ?? 844 },
    locale: "pt-BR",
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const w = window as unknown as { __sceneShift: number };
    w.__sceneShift = 0;
    try {
      type Src = { node?: Node };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean; sources?: Src[] }>) {
          if (entry.hadRecentInput) continue;
          if ((entry.sources ?? []).some((s) => s.node instanceof Element && s.node.closest(".journey-scene, .lyo"))) w.__sceneShift += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* engines without layout-shift entries report 0 */
    }
  });
  await seedUnlockedLessonSession(page, SEED_LESSON, { theme: opts.theme ?? "clay", followSystemTheme: false });
  await page.goto(opts.url ?? "/jornada");
  await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
  await dismissBlockingOverlays(page);
  return { context, page };
}

async function settleFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let n = 0;
        const tick = () => (++n >= 3 ? setTimeout(resolve, 160) : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
        setTimeout(resolve, 1_000);
      }),
  );
}

/** Looping animations on screen, grouped by the owner the budget granted. */
async function loops(page: Page) {
  return page.evaluate(() => {
    const h = window.innerHeight;
    const owners = new Set<Element>();
    const sceneOwners = new Set<Element>();
    const partNames = new Set<string>();
    let rawLoops = 0;
    let offscreen = 0;
    const unbudgeted: string[] = [];
    const STATUS = ['[data-audio-playing="true"]', ".living-rec-dot", ".living-rec-bars > span"];
    for (const a of document.getAnimations()) {
      const timing = a.effect?.getComputedTiming?.();
      if (a.playState !== "running" || timing?.iterations !== Infinity) continue;
      const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
      const r = target?.getBoundingClientRect();
      if (!target || !r || r.width === 0 || r.height === 0) continue;
      const owner = target.closest('[data-ambient="run"]');
      const name = (a as CSSAnimation).animationName ?? "?";
      // "Far offscreen" is judged on the granted owner (the budget's unit), not on one of its parts.
      const box = (owner ?? target).getBoundingClientRect();
      if (box.bottom < -100 || box.top > h + 100) {
        offscreen += 1;
        continue;
      }
      rawLoops += 1;
      if (owner) {
        owners.add(owner);
        if (owner.getAttribute("data-ambient-kind") === "scene") {
          sceneOwners.add(owner);
          if (name.startsWith("scene-")) partNames.add(name);
        }
      } else if (!STATUS.some((sel) => target.matches(sel))) unbudgeted.push(name);
    }
    return { owners: owners.size, scenes: sceneOwners.size, rawLoops, offscreen, unbudgeted, partNames: [...partNames] };
  });
}

async function sweep(page: Page) {
  const out = { maxOwners: 0, maxScenes: 0, maxLoops: 0, offscreen: 0, unbudgeted: [] as string[], parts: new Set<string>() };
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(height * f));
    await page.waitForTimeout(300);
    await settleFrames(page);
    let now = await loops(page);
    for (let i = 0; i < 8 && now.offscreen > 0; i += 1) {
      await page.waitForTimeout(250);
      now = await loops(page);
    }
    out.maxOwners = Math.max(out.maxOwners, now.owners);
    out.maxScenes = Math.max(out.maxScenes, now.scenes);
    out.maxLoops = Math.max(out.maxLoops, now.rawLoops);
    out.offscreen = Math.max(out.offscreen, now.offscreen);
    out.unbudgeted.push(...now.unbudgeted);
    for (const p of now.partNames) out.parts.add(p);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  return { ...out, parts: [...out.parts] };
}

/** Scroll until at least one Journey scene owns a slot and runs a part loop. */
async function findRunningScene(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const f of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(height * f));
    await page.waitForTimeout(250);
    await settleFrames(page);
    const index = await page.evaluate(() => {
      const scenes = [...document.querySelectorAll('[data-testid="journey-scene"]')];
      return scenes.findIndex((s) => s.querySelector('.journey-scene-drift[data-ambient="run"]') && s.querySelector('g[class*="scene-"]'));
    });
    if (index >= 0) return index;
  }
  return -1;
}

test.describe("RC2.3.13R.3.2.6 Chinese Living Canvas", () => {
  test.describe.configure({ timeout: 180_000 });

  test("Journey scenes move by their subject inside the ambient budget", async ({ browser }) => {
    const { context, page } = await open(browser);
    try {
      const result = await sweep(page);
      evidence.journey = result;
      expect.soft(result.maxOwners, "ambient owners on screen").toBeLessThanOrEqual(MAX_OWNERS);
      expect.soft(result.maxScenes, "living scenes running at once").toBeLessThanOrEqual(MAX_SCENES);
      expect.soft(result.maxLoops, "raw loops on screen").toBeLessThanOrEqual(MAX_LOOPS);
      expect.soft(result.unbudgeted, "loops outside a granted owner").toEqual([]);
      expect.soft(result.offscreen, "loops far offscreen").toBe(0);
      // Subjects move: at least one part loop ran (lanterns, clouds, steam…), never the whole drawing.
      expect(result.parts.length, `scene part loops seen: ${result.parts.join(", ")}`).toBeGreaterThan(0);
      const wholeFloat = await page.evaluate(
        () => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "journey-scene-drift").length,
      );
      expect(wholeFloat, "whole-scene float").toBe(0);
    } finally {
      await context.close();
    }
  });

  test("hidden tab and reduced motion run no loops", async ({ browser }) => {
    const live = await open(browser);
    try {
      expect(await findRunningScene(live.page)).toBeGreaterThanOrEqual(0);
      await live.page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect.poll(async () => (await loops(live.page)).rawLoops, { timeout: 5_000 }).toBe(0);
      evidence.hiddenTabLoops = 0;
    } finally {
      await live.context.close();
    }
    const reduced = await open(browser, { reducedMotion: true });
    try {
      const result = await sweep(reduced.page);
      evidence.reducedMotion = result;
      expect(result.maxLoops, "loops under reduced motion").toBe(0);
      // The art stays: scenes are still drawn.
      await expect(reduced.page.locator('[data-testid="journey-scene"] svg').first()).toBeAttached();
    } finally {
      await reduced.context.close();
    }
  });

  test("a scene that loses its slot rests on its authored frame", async ({ browser }) => {
    const { context, page } = await open(browser);
    try {
      const index = await findRunningScene(page);
      expect(index).toBeGreaterThanOrEqual(0);
      const scene = page.locator('[data-testid="journey-scene"]').nth(index);
      const host = scene.locator(".journey-scene-drift");
      await expect(host).toHaveAttribute("data-ambient", "run");
      // Let the loops move away from their neutral pose, then take the slot away.
      await page.waitForTimeout(1_500);
      // Scroll to whichever end of the page is farther from the scene.
      const far = await scene.evaluate((el) => {
        const docTop = el.getBoundingClientRect().top + window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return docTop > max / 2 ? 0 : max;
      });
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), far);
      await expect.poll(() => host.getAttribute("data-ambient"), { timeout: 5_000 }).toBe("rest");
      const poses = await scene.evaluate((el) =>
        [...el.querySelectorAll<SVGGElement>('g[class*="scene-"]')].map((g) => {
          const cs = getComputedStyle(g);
          return { cls: g.getAttribute("class"), transform: cs.transform, opacity: cs.opacity, animations: g.getAnimations().filter((a) => a.playState === "running").length };
        }),
      );
      evidence.neutralAfterSlotLoss = poses;
      for (const pose of poses) {
        if (/scene-ink/.test(pose.cls ?? "")) continue; // one-shot, ends drawn
        expect.soft(pose.animations, `${pose.cls} still animating`).toBe(0);
        expect.soft(["none", "matrix(1, 0, 0, 1, 0, 0)"], `${pose.cls} transform`).toContain(pose.transform);
        expect.soft(pose.opacity, `${pose.cls} opacity`).toBe("1");
      }
    } finally {
      await context.close();
    }
  });

  test("scenes enter from their own side, once", async ({ browser }) => {
    const { context, page } = await open(browser);
    try {
      const sides = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-testid="journey-scene"][data-reveal="pending"]')].slice(0, 6).map((el) => {
          const inner = el.querySelector<HTMLElement>(".journey-scene-reveal");
          const m = inner ? new DOMMatrix(getComputedStyle(inner).transform) : null;
          return { side: el.getAttribute("data-scene-side"), tx: m ? m.m41 : null };
        }),
      );
      evidence.entrance = sides;
      expect(sides.length).toBeGreaterThan(0);
      for (const { side, tx } of sides) {
        if (side === "left") expect.soft(tx, "left scene enters from the left").toBeLessThan(0);
        if (side === "right") expect.soft(tx, "right scene enters from the right").toBeGreaterThan(0);
      }
      const shift = await page.evaluate(() => (window as unknown as { __sceneShift: number }).__sceneShift);
      expect.soft(shift, "layout shift caused by scenes/frames").toBeLessThan(0.02);
    } finally {
      await context.close();
    }
  });

  test("Culture topic hero carries one living scene inside a Heritage frame", async ({ browser }) => {
    const { context, page } = await open(browser, { url: TOPIC });
    try {
      const header = page.getByTestId("culture-topic-header");
      await expect(header).toBeVisible();
      const heroes = page.getByTestId("culture-hero-scene");
      await expect(heroes).toHaveCount(1);
      await expect(header.getByTestId("culture-hero-scene")).toHaveCount(1);
      await expect(heroes).toHaveAttribute("aria-hidden", "true");
      await expect(header.locator('.lyo-frame[data-frame-level="heritage"]')).toHaveCount(1);
      await settleFrames(page);
      const now = await loops(page);
      evidence.cultureTopic = now;
      expect.soft(now.owners).toBeLessThanOrEqual(MAX_OWNERS);
      expect.soft(now.scenes).toBeLessThanOrEqual(1);
      expect.soft(now.unbudgeted).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test("frames never take taps, focus or announcements", async ({ browser }) => {
    for (const theme of ["clay", "dark"] as const) {
      const { context, page } = await open(browser, { theme });
      try {
        const frame = page.locator('.lyo-frame[data-frame-level="heritage"]').first();
        await frame.scrollIntoViewIfNeeded();
        const report = await frame.evaluate((el) => {
          const host = el.parentElement as HTMLElement;
          const after = getComputedStyle(el, "::after");
          const edge = el.querySelector<HTMLElement>(".lyo-edge-top");
          const rect = host.getBoundingClientRect();
          // Every point at the frame's corners resolves to the host's content, never the frame.
          const probes = [
            [rect.left + 10, rect.top + 10],
            [rect.right - 10, rect.top + 10],
            [rect.left + 10, rect.bottom - 10],
            [rect.right - 10, rect.bottom - 10],
          ].map(([x, y]) => document.elementFromPoint(x, y)?.closest(".lyo") === null);
          return {
            ariaHidden: el.closest('[aria-hidden="true"]') !== null,
            pointerEvents: getComputedStyle(el).pointerEvents,
            afterPointerEvents: after.pointerEvents,
            // WebKit may report the unprefixed property as "none" and carry the prefixed one.
            afterMask: [after.getPropertyValue("mask-image"), after.getPropertyValue("-webkit-mask-image")].find((v) => v.includes("url(")) ?? "",
            ruleColor: edge ? getComputedStyle(edge).borderTopColor : null,
            probesHitContent: probes,
            focusable: el.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])').length,
          };
        });
        evidence[`frame-${theme}`] = report;
        expect(report.ariaHidden).toBe(true);
        expect(report.pointerEvents).toBe("none");
        expect(report.afterPointerEvents).toBe("none");
        expect(report.focusable).toBe(0);
        expect(report.afterMask).toContain("url(");
        expect(report.probesHitContent.every(Boolean), "frame corners never intercept taps").toBe(true);
      } finally {
        await context.close();
      }
    }
  });

  test("a node completed this session plays its moment once, ≤ 1.1 s, then never again", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
    const page = await context.newPage();
    try {
      await seedLessonPlayerReady(page, "l2", { masteryLevel: 3, folego: 20 });
      await page.goto("/jornada");
      await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
      await dismissBlockingOverlays(page);
      const node = page.locator('[data-progression-node="l2"]').first();
      await expect(node).toHaveAttribute("data-progression-state", /CURRENT|AVAILABLE/, { timeout: 20_000 });
      await expect(page.locator('[data-completion-moment="play"]')).toHaveCount(0);
      // In-app navigation (no reload): the session saw l2 incomplete.
      const go = (path: string) =>
        page.evaluate((to) => {
          window.history.pushState({}, "", to);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, path);
      await go("/licao/l2/player");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const victory = page.locator("[data-lesson-victory]");
      for (let step = 0; step < 40; step += 1) {
        if (await victory.isVisible().catch(() => false)) break;
        await advanceUntilVisible(page, victory, 1);
      }
      await expect(victory, "l2 (mastery 3) reaches Victory within 40 advances").toBeVisible();
      // Record the moment's own animations the instant it starts playing, and
      // whether any modal was open at that instant (it must wait for them).
      await page.evaluate(() => {
        const w = window as unknown as {
          __moment?: { count: number; infinite: number; maxEndMs: number; modalOpen: boolean } | null;
          __axis?: { grew: number; grewUnderModal: number };
        };
        w.__moment = null;
        // The Journey axis is the moment's line: its grow waits for the same calm screen.
        w.__axis = { grew: 0, grewUnderModal: 0 };
        // A grow is the fill rising with its transition on (the old fill painted first is not one).
        const scaleOf = (style: string | null) => Number(/scaleY\(([\d.]+)\)/.exec(style ?? "")?.[1] ?? NaN);
        new MutationObserver((records) => {
          for (const r of records) {
            const el = r.target as Element;
            if (!el.classList?.contains("journey-axis-done") || el.getAttribute("data-axis-grows") !== "true") continue;
            if (!(scaleOf(el.getAttribute("style")) > scaleOf(r.oldValue) + 0.001)) continue;
            w.__axis!.grew += 1;
            const modal = document.querySelector('[aria-modal="true"]');
            if (modal !== null) w.__axis!.grewUnderModal += 1;
            ((w.__axis as unknown as { log?: unknown[] }).log ??= []).push({
              t: Math.round(performance.now()),
              from: r.oldValue,
              to: el.getAttribute("style"),
              modal: modal ? modal.getAttribute("data-testid") ?? modal.getAttribute("aria-labelledby") ?? modal.tagName : null,
            });
          }
        }).observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["style"] });
        let modalWas = false;
        new MutationObserver(() => {
          const modalNow = document.querySelector('[aria-modal="true"]') !== null;
          if (modalNow === modalWas) return;
          modalWas = modalNow;
          ((w.__axis as unknown as { log?: unknown[] }).log ??= []).push({ t: Math.round(performance.now()), modal: modalNow ? "open" : "closed" });
        }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-modal"] });
        const read = (el: Element) => {
          const modalOpen = document.querySelector('[aria-modal="true"]') !== null;
          requestAnimationFrame(() => {
            const all = el.getAnimations({ subtree: true });
            w.__moment = {
              count: all.length,
              infinite: all.filter((a) => a.effect?.getComputedTiming?.().iterations === Infinity).length,
              maxEndMs: Math.max(0, ...all.map((a) => Number(a.effect?.getComputedTiming?.().endTime ?? 0))),
              modalOpen,
            };
          });
        };
        new MutationObserver((records) => {
          for (const r of records) {
            const target = r.target as Element;
            if (r.type === "attributes" && target.getAttribute?.("data-completion-moment") === "play") read(target);
            for (const n of r.addedNodes) {
              if (!(n instanceof Element)) continue;
              const el = n.matches('[data-completion-moment="play"]') ? n : n.querySelector('[data-completion-moment="play"]');
              if (el) read(el);
            }
          }
        }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-completion-moment"] });
      });
      await go("/jornada");
      await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
      // The moment waits for every ceremony (milestone, then streak) to close.
      for (let i = 0; i < 4; i += 1) {
        await dismissBlockingOverlays(page);
        await page.waitForTimeout(300);
      }
      await expect(node).toHaveAttribute("data-progression-state", "COMPLETED", { timeout: 20_000 });
      // The moment played for this node, measured the instant it started.
      const moment = page.locator("[data-completion-moment]");
      await expect(moment).toHaveCount(1, { timeout: 10_000 });
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { __moment?: unknown }).__moment ?? null), { timeout: 25_000 })
        .not.toBeNull();
      const timing = (await page.evaluate(() => (window as unknown as { __moment: { count: number; infinite: number; maxEndMs: number; modalOpen: boolean } }).__moment))!;
      evidence.completionMoment = timing;
      expect(timing.count, "the moment animates something").toBeGreaterThan(0);
      expect(timing.infinite, "the moment never loops").toBe(0);
      expect(timing.maxEndMs, "the moment ends within 1.1 s").toBeLessThanOrEqual(1100);
      expect(timing.modalOpen, "the moment never plays under a modal").toBe(false);
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { __axis: { grew: number } }).__axis.grew), { timeout: 10_000 })
        .toBeGreaterThan(0);
      const axisGrow = await page.evaluate(() => (window as unknown as { __axis: { grew: number; grewUnderModal: number } }).__axis);
      evidence.axisGrow = axisGrow;
      if (axisGrow.grewUnderModal) console.log("axis grow log", JSON.stringify(axisGrow));
      expect(axisGrow.grewUnderModal, "the axis never grows under a milestone or streak screen").toBe(0);
      // Then still: the moment's styles leave.
      await expect(moment).toHaveAttribute("data-completion-moment", "done", { timeout: 3_000 });
      await expect(page.locator('[data-testid="progression-complete-spark"]')).toHaveCount(0);
      // Away and back: still completed, never replayed.
      await go("/cultura");
      await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
      await go("/jornada");
      await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
      await expect(node).toHaveAttribute("data-progression-state", "COMPLETED");
      await expect(page.locator('[data-completion-moment="play"]')).toHaveCount(0);
      const replaying = await page.evaluate(
        () => document.getAnimations().filter((a) => /^progression-(?:node-settle|check-in|spark|connector-fill)$/.test((a as CSSAnimation).animationName ?? "") && a.playState === "running").length,
      );
      expect(replaying, "the moment never replays").toBe(0);
    } finally {
      await context.close();
    }
  });

  test("connectors carry calm states and the Journey axis fills to the current node", async ({ browser }) => {
    const { context, page } = await open(browser, { url: TOPIC });
    try {
      const states = await page.locator('[data-testid="progression-connector"]').evaluateAll((els) =>
        els.map((el) => ({ state: el.getAttribute("data-connector-state"), from: el.getAttribute("data-from"), to: el.getAttribute("data-to") })),
      );
      for (const s of states) {
        if (s.from === "COMPLETED" && s.to === "COMPLETED") expect.soft(s.state).toBe("complete");
        else if (s.to === "LOCKED") expect.soft(s.state).toBe("locked");
        else expect.soft(["lead", "open"]).toContain(s.state);
      }
      // No connector loops.
      const loops = await page.evaluate(
        () => document.getAnimations().filter((a) => ((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-testid="progression-connector"]')).length,
      );
      expect(loops).toBe(0);
      await page.goto("/jornada");
      await page.waitForSelector("[data-progression-shell]", { timeout: 45_000 });
      await dismissBlockingOverlays(page);
      const axis = await page.evaluate(() => {
        const current = document.querySelector('[data-progression-state="CURRENT"]');
        const frame = current?.closest('[data-progression-axis="stable"]');
        const line = frame?.querySelector('[data-progression-axis-line="true"]');
        const done = line?.querySelector<HTMLElement>(".journey-axis-done");
        if (!current || !line || !done) return null;
        const c = current.getBoundingClientRect();
        const d = done.getBoundingClientRect();
        return { fill: done.getAttribute("data-journey-axis-fill"), doneBottom: d.bottom, nodeCenter: c.top + c.height / 2 };
      });
      evidence.axisFill = axis;
      expect(axis, "current module axis").not.toBeNull();
      expect(axis!.fill).toBe("partial");
      expect(Math.abs(axis!.doneBottom - axis!.nodeCenter), "the done line ends at the current node").toBeLessThanOrEqual(4);
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    if (process.env.LIVING_CANVAS_EVIDENCE !== "1") return;
    const out = path.join(process.cwd(), "docs/release/evidence/rc2-3-13r3-2-6/living-canvas-evidence.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify({ wave: "RC2.3.13R.3.2.6", kind: "EMULATED", physical: "NOT_RUN", evidence }, null, 2)}\n`);
  });
});
