import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedMissionsSession, waitForLazyPage } from "./helpers";

const crashTitle = /Algo saiu do prumo|Something went off track/i;

test.describe("Jornada — persistência corrompida não derruba a página", () => {
  test("srs nulo, claimed ausente e today ausente ainda renderizam a Jornada", async ({ page }) => {
    await seedMissionsSession(page, {
      completedLessons: ["l1", "l2", "l3"],
      srs: { bad: null, empty: {} },
      learnedChunks: null,
      learnedChars: null,
      today: null,
      dailyMissions: { date: "2099-01-01" },
    });

    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByRole("heading", { name: crashTitle })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });
});
