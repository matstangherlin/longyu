import { expect, type Page } from "@playwright/test";
import { todayKey, weekKey, monthKey } from "../src/lib/storage";
import { MONTHLY_GOAL } from "../src/data/missions";
import { dismissBlockingOverlays, seedMissionsSession, waitForLazyPage } from "./helpers";

export const MISSIONS_MOBILE_VIEWPORTS = [
  { label: "320×568", width: 320, height: 568 },
  { label: "360×640", width: 360, height: 640 },
  { label: "375×667", width: 375, height: 667 },
  { label: "390×844", width: 390, height: 844 },
  { label: "393×851", width: 393, height: 851 },
  { label: "412×915", width: 412, height: 915 },
  { label: "430×932", width: 430, height: 932 },
] as const;

export const MISSIONS_DESKTOP_VIEWPORTS = [
  { label: "1024×768", width: 1024, height: 768 },
  { label: "1180×820", width: 1180, height: 820 },
  { label: "1280×720", width: 1280, height: 720 },
  { label: "1366×768", width: 1366, height: 768 },
  { label: "1440×900", width: 1440, height: 900 },
  { label: "1920×1080", width: 1920, height: 1080 },
] as const;

export const MISSIONS_TABLET_VIEWPORTS = [
  { label: "640×960", width: 640, height: 960 },
  { label: "768×1024", width: 768, height: 1024 },
  { label: "834×1112", width: 834, height: 1112 },
] as const;

export const MISSIONS_LANDSCAPE_VIEWPORT = { label: "667×360 landscape", width: 667, height: 360 } as const;

export async function openMissions(page: Page) {
  await page.goto("/missoes", { waitUntil: "domcontentloaded" });
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.getByRole("heading", { name: "Objetivos e recompensas" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-mission-surface]")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
}

export function richMissionSeed(options: {
  isPremium?: boolean;
  monthlyCompleted?: number;
  monthlyClaimed?: boolean;
  monthlyChests?: number;
  medals?: boolean;
} = {}) {
  const day = todayKey();
  const week = weekKey();
  const month = monthKey();
  return {
    isPremium: options.isPremium ?? false,
    xpToday: 5,
    xpDayKey: day,
    weeklyXp: 400,
    xpWeekKey: week,
    today: { date: day, som: 2, fala: 0, hanzi: 0, leitura: 0 },
    dailyTasks: {
      date: day,
      audioHeard: 8,
      phrasesSpoken: 0,
      reviewsDone: 10,
      hanziDecomposed: 0,
      microtextsRead: 0,
      errorsCorrected: 6,
      threeStarLessons: 0,
      tonesTrained: 0,
      claimedMissions: {},
    },
    dailyMissions: {
      date: day,
      claimed: { "daily-audio": true },
    },
    weeklyMissions: {
      weekKey: week,
      claimed: { "weekly-xp": true },
      lessons: 2,
      immersion: 5,
      microtexts: 0,
      reviewDays: [],
      premiumStories: 0,
    },
    monthlyMission: {
      monthKey: month,
      completed: options.monthlyCompleted ?? MONTHLY_GOAL,
      claimed: options.monthlyClaimed ?? false,
    },
    chests: {
      small: 0,
      dragon: 0,
      monthly: options.monthlyChests ?? 99,
      legendary: 0,
    },
    medals: options.medals
      ? [
          {
            id: "2026-07",
            monthKey: "2026-07",
            label: "Medalha de julho",
            emoji: "☀️",
            earnedAt: Date.now() - 86400000,
          },
        ]
      : [],
  };
}

export async function seedRichMissions(page: Page, options: Parameters<typeof richMissionSeed>[0] = {}) {
  await seedMissionsSession(page, richMissionSeed(options));
}

export async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.scroll, "overflow horizontal em /missoes").toBeLessThanOrEqual(metrics.client + 1);
  expect(metrics.body, "body overflow horizontal em /missoes").toBeLessThanOrEqual(metrics.client + 1);
}

export async function assertNoInteractiveOverlap(page: Page) {
  const collisions = await page.evaluate(() => {
    const surface = document.querySelector("[data-mission-surface]") ?? document.body;
    const fab = document.querySelector("[data-desktop-feedback-fab]");
    const banner = document.querySelector("[data-economy-sync-banner]");
    const modal = document.querySelector<HTMLElement>("[role='dialog'][aria-modal='true']");
    const candidates = [
      ...surface.querySelectorAll<HTMLElement>("button, a[href], [role='button']"),
      ...(fab instanceof HTMLElement ? [fab] : []),
    ];
    const visible = candidates.filter((el) => {
      if (el.closest("[data-app-bottom-nav]")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.closest("[aria-hidden='true']")) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
      if (Number.parseFloat(style.opacity || "1") === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2;
    });
    const unique = visible.filter(
      (el, index) => !visible.some((other, otherIndex) => otherIndex !== index && other.contains(el))
    );
    const inPlay = unique.filter((el) => {
      if (!modal) return true;
      return modal.contains(el);
    });
    const name = (el: Element) =>
      (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 48);
    const hits: string[] = [];
    for (let i = 0; i < inPlay.length; i += 1) {
      for (let j = i + 1; j < inPlay.length; j += 1) {
        const a = inPlay[i].getBoundingClientRect();
        const b = inPlay[j].getBoundingClientRect();
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (x * y > 2) {
          hits.push(`${name(inPlay[i])} ∩ ${name(inPlay[j])} (${Math.round(x * y)}px²)`);
        }
      }
    }
    if (banner instanceof HTMLElement) {
      const style = getComputedStyle(banner);
      if (style.display !== "none" && style.visibility !== "hidden") {
        const br = banner.getBoundingClientRect();
        for (const el of inPlay) {
          const r = el.getBoundingClientRect();
          const x = Math.max(0, Math.min(br.right, r.right) - Math.max(br.left, r.left));
          const y = Math.max(0, Math.min(br.bottom, r.bottom) - Math.max(br.top, r.top));
          if (x * y > 2) hits.push(`banner ∩ ${name(el)} (${Math.round(x * y)}px²)`);
        }
      }
    }
    return hits;
  });
  expect(collisions, collisions.join(" · ")).toEqual([]);
}

export async function assertAboveBottomNavigation(page: Page) {
  const nav = page.locator("[data-app-bottom-nav]");
  if (!(await nav.isVisible().catch(() => false))) return;

  const pair = await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const scrolling = document.scrollingElement as HTMLElement | null;
    const navEl = document.querySelector("[data-app-bottom-nav]") as HTMLElement | null;
    const ctas = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-mission-surface] button, [data-mission-surface] a[href], [data-mission-cta]"
      ),
    ].filter((el) => {
      if (el.closest("[data-app-bottom-nav]")) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2;
    });
    const el = ctas[ctas.length - 1];
    if (!navEl || !el) return { ok: true, bottom: 0, navTop: 0 };
    const max = Math.max(
      0,
      (scrolling?.scrollHeight ?? document.documentElement.scrollHeight) - window.innerHeight
    );
    if (scrolling) scrolling.scrollTop = max;
    window.scrollTo({ top: max, behavior: "auto" });
    const rect = el.getBoundingClientRect();
    const navTop = navEl.getBoundingClientRect().top;
    return { ok: rect.bottom <= navTop + 2, bottom: Math.round(rect.bottom), navTop: Math.round(navTop) };
  });
  expect(pair.ok, `CTA (bottom ${pair.bottom}) atrás da TabBar (top ${pair.navTop})`).toBe(true);
}

export async function assertTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>("[data-mission-surface] button, [data-mission-surface] a[href]"),
    ];
    return nodes
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= 1 && r.height >= 1;
      })
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width < 44 - 0.5 || r.height < 44 - 0.5;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40)} ${Math.round(r.width)}×${Math.round(r.height)}`;
      });
  });
  expect(small, small.join(" · ")).toEqual([]);
}

export async function assertFeedbackFabClear(page: Page) {
  const fab = page.locator("[data-desktop-feedback-fab]");
  if (!(await fab.isVisible().catch(() => false))) return;

  for (const where of ["top", "middle", "bottom"] as const) {
    await page.evaluate((slot) => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = slot === "top" ? 0 : slot === "bottom" ? max : Math.round(max / 2);
      window.scrollTo(0, y);
    }, where);
    await page.waitForTimeout(50);
    const hits = await page.evaluate(() => {
      const fabEl = document.querySelector("[data-desktop-feedback-fab]") as HTMLElement | null;
      if (!fabEl) return [];
      const style = getComputedStyle(fabEl);
      if (style.display === "none" || style.visibility === "hidden") return [];
      const fr = fabEl.getBoundingClientRect();
      const ctas = [
        ...document.querySelectorAll<HTMLElement>("[data-mission-surface] button, [data-mission-surface] a[href]"),
      ];
      return ctas
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const x = Math.max(0, Math.min(fr.right, r.right) - Math.max(fr.left, r.left));
          const y = Math.max(0, Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top));
          return x * y > 2;
        })
        .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40));
    });
    expect(hits, `FAB sobre ${hits.join(" · ")} (${where})`).toEqual([]);
  }
}

export async function assertMissionCardActionsAligned(page: Page) {
  const width = page.viewportSize()?.width ?? 0;
  if (width < 640) return;
  const drift = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>("[data-mission-card]")];
    const rows: HTMLElement[][] = [];
    for (const card of cards) {
      const top = card.getBoundingClientRect().top;
      const row = rows.find((group) => Math.abs(group[0].getBoundingClientRect().top - top) < 8);
      if (row) row.push(card);
      else rows.push([card]);
    }
    const hits: string[] = [];
    for (const row of rows) {
      if (row.length < 2) continue;
      const bottoms = row.map((card) => {
        const cta = card.querySelector<HTMLElement>("[data-mission-cta]");
        return cta ? cta.getBoundingClientRect().bottom : card.getBoundingClientRect().bottom;
      });
      const delta = Math.max(...bottoms) - Math.min(...bottoms);
      if (delta > 2) hits.push(`fileira Δ${Math.round(delta)}px`);
    }
    return hits;
  });
  expect(drift, drift.join(" · ")).toEqual([]);
}

export async function assertMissionLayout(page: Page) {
  await assertNoHorizontalOverflow(page);
  await assertNoInteractiveOverlap(page);
  await assertAboveBottomNavigation(page);
  await assertTouchTargets(page);
  await assertFeedbackFabClear(page);
  await assertMissionCardActionsAligned(page);
}
