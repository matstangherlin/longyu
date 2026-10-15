import { expect, test, type Browser } from "@playwright/test";
import { dismissBlockingOverlays, seedUnlockedLessonSession } from "./helpers";

/**
 * RC2.3.13R.3.2.5 — premium UX closure, measured in a real engine (Chromium,
 * Firefox and WebKit in CI).
 *
 * The four R.3.2.4 follow-ups, each pinned by a regression:
 * - a Culture direction mark only follows a real in-app navigation
 *   (a modified click opens a new tab and leaves nothing behind);
 * - a mascot blink that loses its ambient slot rests eyes-open, never frozen
 *   mid-blink, and reduced motion is eyes-open too;
 * - a frame's one-time stitch draw lands on the edge's resting opacity and
 *   never overshoots it, in light and dark;
 * - (the Victory burst living outside the mascot's entrance fade is pinned by
 *   the R.3.2.5 gate on the component tree.)
 */

const SEED_LESSON = "l9-tudo-bem";

async function openJourney(browser: Browser, theme: "clay" | "dark", url = "/jornada") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const page = await context.newPage();
  await seedUnlockedLessonSession(page, SEED_LESSON, { theme, followSystemTheme: false });
  await page.goto(url);
  await dismissBlockingOverlays(page);
  return { context, page };
}

test.describe("RC2.3.13R.3.2.5 — R.3.2.4 follow-ups", () => {
  test("Culture direction mark only follows a real in-app navigation", async ({ page, context }) => {
    test.setTimeout(120_000);
    await seedUnlockedLessonSession(page, SEED_LESSON);
    await page.goto("/cultura");
    await dismissBlockingOverlays(page);
    const card = page.locator('[data-testid^="culture-topic-card-"]').first();
    await card.waitFor({ timeout: 20_000 });

    // A modified click is the browser's (new tab), not the app's: no mark.
    const popup = context.waitForEvent("page", { timeout: 5_000 }).catch(() => null);
    await card.click({ modifiers: ["ControlOrMeta"] });
    const opened = await popup;
    if (opened) await opened.close();
    await expect(page).toHaveURL(/\/cultura$/);

    // Leave Culture and come back through the app: whatever Culture page
    // mounts, it must not replay a direction it never navigated.
    await page.getByTestId("progression-tab-journey").click();
    await expect(page.getByTestId("progression-tab-journey")).toHaveAttribute("aria-selected", "true");
    await page.getByTestId("progression-tab-culture").click();
    await expect(page.getByTestId("progression-tab-culture")).toHaveAttribute("aria-selected", "true");
    const mounted = page.locator('[data-testid="culture-journey"], [data-testid="culture-topic-detail"]').first();
    await mounted.waitFor({ timeout: 20_000 });
    await expect(mounted).not.toHaveAttribute("data-topic-enter", /.+/);

    // Positive control: plain taps still carry their direction.
    await page.goto("/cultura");
    await dismissBlockingOverlays(page);
    await page.locator('[data-testid^="culture-topic-card-"]').first().click();
    await expect(page.getByTestId("culture-topic-detail")).toHaveAttribute("data-topic-enter", "forward");
    await page.getByTestId("culture-topic-back").click();
    await expect(page.getByTestId("culture-journey")).toHaveAttribute("data-topic-enter", "back");
  });

  test("mascot blink without an ambient slot rests eyes-open", async ({ page }) => {
    await page.goto("/login");
    const eyes = page.getByTestId("mascot-eyes-closed").first();
    await expect(eyes).toHaveAttribute("data-ambient", /^(run|rest)$/, { timeout: 20_000 });
    const result = await eyes.evaluate((el) => {
      el.setAttribute("data-ambient", "run");
      const blink = el.getAnimations().find((a) => (a as CSSAnimation).animationName === "mascot-eye-blink");
      if (!blink) return { found: false, closed: "", rest: "" };
      const total = Number(blink.effect?.getComputedTiming().duration ?? 5400);
      blink.currentTime = total * 0.94; // inside the eyes-closed window
      const closed = getComputedStyle(el).opacity;
      el.setAttribute("data-ambient", "rest"); // the budget takes the slot away
      return { found: true, closed, rest: getComputedStyle(el).opacity };
    });
    expect(result.found).toBe(true);
    expect(result.closed).toBe("1"); // the probe really caught the blink
    expect(result.rest).toBe("0"); // eyes open, not frozen shut
  });

  test("mascot under reduced motion is eyes-open and still", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", locale: "pt-BR" });
    const page = await context.newPage();
    await page.goto("/login");
    const eyes = page.getByTestId("mascot-eyes-closed").first();
    await eyes.waitFor({ state: "attached", timeout: 20_000 });
    const state = await eyes.evaluate((el) => ({
      opacity: getComputedStyle(el).opacity,
      running: el.getAnimations().filter((a) => a.playState === "running").length,
    }));
    expect(state).toEqual({ opacity: "0", running: 0 });
    await context.close();
  });

  for (const theme of ["clay", "dark"] as const) {
    test(`frame stitch draw lands on the edge's resting opacity — ${theme}`, async ({ browser }) => {
      test.setTimeout(120_000);
      const { context, page } = await openJourney(browser, theme);
      const frame = page.locator('[data-journey-milestone="current"] .lyo-frame').first();
      await frame.waitFor({ state: "attached", timeout: 30_000 });
      const samples = await frame.evaluate((el) => {
        // Replay the one-time draw on demand (it already ran once on mount).
        el.removeAttribute("data-animate");
        const edges = [...el.querySelectorAll<HTMLElement>(".lyo-edge")];
        for (const edge of edges) void getComputedStyle(edge).opacity;
        el.setAttribute("data-animate", "once");
        const out: Array<{ peak: number; rest: number }> = [];
        for (const edge of edges) {
          const draw = edge.getAnimations().find((a) => (a as CSSAnimation).animationName === "lyo-edge-draw");
          if (!draw) continue;
          draw.pause();
          const end = Number(draw.effect?.getComputedTiming().endTime ?? 0);
          let peak = 0;
          for (const f of [0.25, 0.5, 0.75, 0.9, 0.99]) {
            draw.currentTime = end * f;
            peak = Math.max(peak, Number(getComputedStyle(edge).opacity));
          }
          draw.finish();
          out.push({ peak, rest: Number(getComputedStyle(edge).opacity) });
        }
        return out;
      });
      expect(samples.length).toBeGreaterThan(0);
      for (const s of samples) {
        expect(s.rest).toBeCloseTo(0.62, 2);
        expect(s.peak).toBeLessThanOrEqual(s.rest + 0.005);
      }
      await context.close();
    });
  }
});

/* ------------------------------------------------------------------ */
/* R.3.2.5 — reward ritual, resilient states, surfaces                 */
/* ------------------------------------------------------------------ */

const CHESTS_TWO_SMALL = { chests: { small: 2, dragon: 0, monthly: 0, legendary: 0 } };

async function openShopChest(browser: Browser, reducedMotion: "reduce" | "no-preference") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR", reducedMotion });
  const page = await context.newPage();
  await seedUnlockedLessonSession(page, SEED_LESSON, CHESTS_TWO_SMALL);
  await page.goto("/loja");
  await dismissBlockingOverlays(page);
  await page.getByTestId("chest-open-small").click();
  await expect(page.locator("[data-chest-ritual]")).toHaveAttribute("data-chest-ritual", "closed");
  return { context, page };
}

const storedSmallChests = (page: import("@playwright/test").Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.chests?.small ?? null);

test.describe("RC2.3.13R.3.2.5 — reward ritual", () => {
  test("a double tap opens ONE chest; the ritual is short and ends on the rewards", async ({ browser }) => {
    test.setTimeout(90_000);
    const { context, page } = await openShopChest(browser, "no-preference");
    // Two taps in the same task — faster than any re-render.
    await page.getByTestId("chest-ritual-chest").evaluate((el) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });
    await expect(page.locator("[data-chest-ritual]")).toHaveAttribute("data-chest-ritual", "opening");
    const started = Date.now();
    await expect(page.locator("[data-chest-ritual]")).toHaveAttribute("data-chest-ritual", "revealed", { timeout: 3_000 });
    expect(Date.now() - started).toBeLessThan(1_500);
    await expect.poll(() => storedSmallChests(page)).toBe(1);
    await expect(page.getByTestId("chest-ritual-status")).toContainText(/Você recebeu: \+\d+/);
    await expect(page.getByTestId("chest-ritual-continue")).toHaveText("Continuar");
    // The full-screen sheet covers the screen from the very top (it used to
    // inherit the Loja stack's margin and show the TopBar above it).
    const top = await page.locator("[data-chest-ritual]").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBe(0);
    // Nothing loops after the ritual: every chest/ritual animation is finite.
    const infinite = await page.evaluate(() =>
      document
        .querySelector("[data-chest-ritual]")!
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length,
    );
    expect(infinite).toBe(0);
    await page.getByTestId("chest-ritual-continue").click();
    await expect(page.locator("[data-chest-ritual]")).toHaveCount(0);
    await context.close();
  });

  test("reduced motion reveals at once and still claims once", async ({ browser }) => {
    test.setTimeout(90_000);
    const { context, page } = await openShopChest(browser, "reduce");
    await page.getByTestId("chest-ritual-open").click();
    await expect(page.locator("[data-chest-ritual]")).toHaveAttribute("data-chest-ritual", "revealed", { timeout: 500 });
    await expect.poll(() => storedSmallChests(page)).toBe(1);
    // Reduced motion keeps only the overlay's short opacity fade (Living UI);
    // nothing of the ritual itself runs: no press, lid, aura, sparks or rise.
    const ritual = await page.evaluate(() =>
      document
        .querySelector("[data-chest-ritual]")!
        .getAnimations({ subtree: true })
        .map((a) => (a as CSSAnimation).animationName ?? "")
        .filter((name) => /chest|reward-rise|spark/.test(name)),
    );
    expect(ritual).toEqual([]);
    await context.close();
  });
});

test.describe("RC2.3.13R.3.2.5 — resilient states", () => {
  test("offline in a lesson is one compact line, not a block on every step", async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ viewport: { width: 360, height: 640 }, locale: "pt-BR" });
    const page = await context.newPage();
    await seedUnlockedLessonSession(page, SEED_LESSON);
    await page.goto(`/licao/${SEED_LESSON}/player`);
    await dismissBlockingOverlays(page);
    await page.locator("[data-current-step-index]").first().waitFor({ timeout: 20_000 });
    await context.setOffline(true);
    const pill = page.locator("[data-lesson-offline]");
    await expect(pill).toBeVisible();
    const box = await pill.boundingBox();
    expect(box?.height ?? 99).toBeLessThanOrEqual(32);
    await expect(pill.getByRole("status")).toContainText("Sem conexão");
    await context.setOffline(false);
    await expect(pill).toHaveCount(0);
    await context.close();
  });

  test("an empty Review sends the learner back to the Journey", async ({ page }) => {
    test.setTimeout(60_000);
    // First lesson only: nothing has been learned yet, so the queue is empty.
    await seedUnlockedLessonSession(page, "p1-o-que-e-hanzi");
    await page.goto("/revisao");
    await dismissBlockingOverlays(page);
    const cta = page.getByTestId("review-empty-journey");
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await expect(cta).toHaveAttribute("href", "/jornada");
  });
});

test.describe("RC2.3.13R.3.2.5 — surfaces", () => {
  for (const theme of ["clay", "dark"] as const) {
    test(`on-colour labels stay readable (${theme})`, async ({ browser }) => {
      const { context, page } = await openJourney(browser, theme);
      const ratios = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const rgb = (name: string) => css.getPropertyValue(name).trim().split(/\s+/).map(Number);
        const lum = ([r, g, b]: number[]) => {
          const c = [r, g, b].map((v) => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        };
        const ratio = (a: string, b: string) => {
          const [la, lb] = [lum(rgb(a)), lum(rgb(b))];
          return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        };
        return { good: ratio("--on-good", "--good"), gold: ratio("--on-gold", "--gold"), scrimDarker: lum(rgb("--scrim")) < lum(rgb("--surface")) };
      });
      expect(ratios.good).toBeGreaterThanOrEqual(4.5);
      expect(ratios.gold).toBeGreaterThanOrEqual(4.5);
      expect(ratios.scrimDarker).toBe(true);
      await context.close();
    });
  }
});
