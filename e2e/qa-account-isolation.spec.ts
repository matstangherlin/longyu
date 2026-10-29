import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, chooseCourseIfAsked, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

const ANA_LESSONS = ["l1", "l2", "l3", "l4", "l5", "l6", "l7"];

interface ProgressView {
  currentAccountId: string;
  name: string;
  username: string;
  xpTotal: number;
  streak: number;
  points: number;
  charges: number | null;
  completedLessons: number;
  accountIds: string[];
  accountSetupComplete: boolean;
}

async function seedAna(page: Page) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript((lessons: string[]) => {
    if (localStorage.getItem("longyu-v1")) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dailyEnergy = {
      date,
      charges: 1,
      maxCharges: 5,
      usedCharges: 4,
      bonusChargesClaimed: {},
      folegoEarned: 0,
      consumedChargeKeys: [],
    };
    const ana = {
      id: "cloud:uid-ana",
      name: "Ana Free",
      username: "anafree",
      email: "qa.free@longyu.app",
      authMode: "cloud",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      xpTotal: 474,
      streak: 2,
      longestStreak: 2,
      points: 88,
      completedLessons: lessons,
      dailyEnergy,
    };
    const state = {
      accountSetupComplete: true,
      holdAchievementModals: true,
      currentAccountId: ana.id,
      accounts: { [ana.id]: ana },
      xpTotal: 474,
      streak: 2,
      longestStreak: 2,
      points: 88,
      completedLessons: lessons,
      dailyEnergy,
    };
    localStorage.setItem("longyu-v1", JSON.stringify({ state, version: 21 }));
  }, ANA_LESSONS);
}

async function readProgress(page: Page): Promise<ProgressView> {
  return page.evaluate(() => {
    const probe = (window as unknown as { __longyuQa?: { readProgress: () => ProgressView } }).__longyuQa;
    if (!probe) throw new Error("probe ausente");
    return probe.readProgress();
  });
}

async function activate(page: Page, userId: string, name?: string) {
  await page.evaluate(
    ({ userId, name }) => {
      const probe = (window as unknown as {
        __longyuQa?: { activateCloudAccount: (identity: { userId: string; name?: string }) => string };
      }).__longyuQa;
      if (!probe) throw new Error("probe ausente");
      probe.activateCloudAccount({ userId, name });
    },
    { userId, name }
  );
}

async function openProfile(page: Page) {
  await page.goto("/perfil");
  await waitForLazyPage(page);
  await chooseCourseIfAsked(page);
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("profile-header")).toBeVisible();
}

test.describe("R-05 isolamento de contas @qa-r05", () => {
  test("entrar como B sem sair não herda XP, lições, sequência, Qi, nome, usuário nem Cargas de A", async ({ page }) => {
    await seedAna(page);
    await openProfile(page);
    await expect(page.getByRole("heading", { name: "Ana Free" })).toBeVisible();
    await expect(page.getByText("474", { exact: true })).toBeVisible();

    const before = await readProgress(page);
    expect(before.xpTotal).toBe(474);
    expect(before.completedLessons).toBe(7);
    expect(before.streak).toBe(2);
    expect(before.username).toBe("anafree");
    expect(before.points).toBeGreaterThan(0);
    expect(before.charges).not.toBe(5);

    await activate(page, "uid-bruno", "Bruno Pro");

    const after = await readProgress(page);
    expect(after.currentAccountId, "sessão ativa").toBe("cloud:uid-bruno");
    expect(after.name, "nome de B").toBe("Bruno Pro");
    expect(after.username, "usuário de A").toBe("");
    expect(after.xpTotal, "XP de A").toBe(0);
    expect(after.completedLessons, "lições de A").toBe(0);
    expect(after.streak, "sequência de A").toBe(0);
    expect(after.points, "Qi de A").toBe(0);
    expect(after.charges, "Cargas de A").toBe(5);
    await expect(page.getByRole("heading", { name: "Bruno Pro" })).toBeVisible();
    await expect(page.getByText("474", { exact: true })).toHaveCount(0);
    expect(after.accountIds).toContain("cloud:uid-ana");
  });

  test("A → logout → B → A devolve o progresso de A e B começa limpo", async ({ page }) => {
    await seedAna(page);
    await openProfile(page);
    const before = await readProgress(page);
    expect(before.xpTotal).toBe(474);
    expect(before.completedLessons).toBe(7);
    expect(before.streak).toBe(2);
    expect(before.points).toBeGreaterThan(0);

    await page.evaluate(() => {
      const probe = (window as unknown as { __longyuQa?: { logout: () => void } }).__longyuQa;
      if (!probe) throw new Error("probe ausente");
      probe.logout();
    });

    const guest = await readProgress(page);
    expect(guest.currentAccountId).toBe("local");
    expect(guest.xpTotal).toBe(0);
    expect(guest.accountSetupComplete).toBe(false);
    expect(guest.accountIds, "o slot de A precisa sobreviver ao logout").toContain("cloud:uid-ana");

    await activate(page, "uid-bruno", "Bruno Pro");
    const bruno = await readProgress(page);
    expect(bruno.name).toBe("Bruno Pro");
    expect(bruno.xpTotal).toBe(0);
    expect(bruno.completedLessons).toBe(0);
    expect(bruno.streak).toBe(0);
    expect(bruno.points).toBe(0);
    expect(bruno.charges).toBe(5);
    expect(bruno.username).toBe("");

    await activate(page, "uid-ana", "Ana Free");
    const ana = await readProgress(page);
    expect(ana.currentAccountId).toBe("cloud:uid-ana");
    expect(ana.name).toBe("Ana Free");
    expect(ana.username).toBe("anafree");
    expect(ana.xpTotal).toBe(before.xpTotal);
    expect(ana.completedLessons).toBe(before.completedLessons);
    expect(ana.streak).toBe(before.streak);
    expect(ana.points).toBe(before.points);
    expect(ana.charges).toBe(before.charges);
  });
});
