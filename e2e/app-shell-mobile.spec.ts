import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";
import { MOBILE_VIEWPORTS } from "./lesson-player-mobile-helpers";

const SHELL_ROUTES = ["/jornada", "/treino", "/revisao", "/loja", "/perfil", "/mais"] as const;

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`MOB-010 shell mobile — ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("header, conteúdo e navegação não se sobrepõem nas rotas principais", async ({ page }) => {
      test.setTimeout(150_000);
      await seedOnboardedSession(page, ["l1"]);

      for (const route of SHELL_ROUTES) {
        await page.goto(route);
        await waitForLazyPage(page);
        await dismissBlockingOverlays(page);
        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = "auto";
          document.documentElement.style.overflowAnchor = "none";
          document.body.style.overflowAnchor = "none";
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          window.scrollTo(0, 0);
        });
        await expect.poll(async () => page.evaluate(() => {
          // Imagens da jornada podem acionar scroll anchoring alguns frames
          // depois do primeiro reset. Reaplica o topo durante a estabilização.
          const scrolling = document.scrollingElement as HTMLElement | null;
          if (scrolling) scrolling.scrollTop = 0;
          window.scrollTo(0, 0);
          return window.scrollY;
        })).toBe(0);
        await expect(page.locator("[data-app-header]")).toBeVisible();
        await expect(page.locator("[data-app-main]")).toBeVisible();
        await expect(page.locator("[data-app-bottom-nav]")).toBeVisible();

        await expect.poll(async () => page.evaluate(() => {
          const rootStyle = getComputedStyle(document.documentElement);
          const header = document.querySelector("[data-app-header]");
          const nav = document.querySelector("[data-app-bottom-nav]");
          if (!header || !nav) return Number.POSITIVE_INFINITY;
          const headerToken = Number.parseFloat(rootStyle.getPropertyValue("--app-header-height"));
          const navToken = Number.parseFloat(rootStyle.getPropertyValue("--app-bottom-nav-height"));
          return Math.max(
            Math.abs(headerToken - header.getBoundingClientRect().height),
            Math.abs(navToken - nav.getBoundingClientRect().height)
          );
        })).toBeLessThanOrEqual(2);

        const geometry = await page.evaluate(() => {
          const scrolling = document.scrollingElement as HTMLElement | null;
          if (scrolling) scrolling.scrollTop = 0;
          window.scrollTo(0, 0);
          const header = document.querySelector("[data-app-header]") as HTMLElement;
          const main = document.querySelector("[data-app-main]") as HTMLElement;
          const nav = document.querySelector("[data-app-bottom-nav]") as HTMLElement;
          const headerRect = header.getBoundingClientRect();
          const mainRect = main.getBoundingClientRect();
          const navRect = nav.getBoundingClientRect();
          return {
            headerTop: headerRect.top,
            headerBottom: headerRect.bottom,
            mainTop: mainRect.top,
            navHeight: navRect.height,
            navBottom: navRect.bottom,
            viewportHeight: window.visualViewport?.height ?? window.innerHeight,
            mainPaddingBottom: Number.parseFloat(getComputedStyle(main).paddingBottom),
            horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });

        expect(geometry.headerTop).toBeGreaterThanOrEqual(-1);
        expect(geometry.mainTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1);
        expect(geometry.navBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
        expect(geometry.mainPaddingBottom).toBeGreaterThanOrEqual(geometry.navHeight + 12);
        expect(geometry.horizontalOverflow).toBeLessThanOrEqual(2);

        await page.evaluate(() => {
          const root = document.documentElement;
          root.style.scrollBehavior = "auto";
          const bottom = Math.max(root.scrollHeight, document.body.scrollHeight);
          root.scrollTop = bottom;
          document.body.scrollTop = bottom;
          window.scrollTo(0, bottom);
        });
        await expect.poll(async () => page.evaluate(() => {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          return maxScroll - window.scrollY;
        })).toBeLessThanOrEqual(2);
        const bottomGeometry = await page.evaluate(() => {
          const main = document.querySelector("[data-app-main]") as HTMLElement;
          const nav = document.querySelector("[data-app-bottom-nav]") as HTMLElement;
          const content = main.lastElementChild as HTMLElement | null;
          return {
            contentBottom: content?.getBoundingClientRect().bottom ?? 0,
            navTop: nav.getBoundingClientRect().top,
            pageScrollable: document.documentElement.scrollHeight > window.innerHeight + 2,
          };
        });
        if (bottomGeometry.pageScrollable) {
          expect(bottomGeometry.contentBottom).toBeLessThanOrEqual(bottomGeometry.navTop + 2);
        }
      }
    });
  });
}
