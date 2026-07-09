import { test, expect } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedFoundationThrough,
  seedLessonRecoverySession,
  seedOnboardedSession,
} from "./helpers";

test.describe("jornada", () => {
  test("jornada carrega com perfil onboarded", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Jornada|mandarim/i).first()).toBeVisible();
  });
});

test.describe("lição", () => {
  test("primeira lição abre o passo introdutório", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
    await expect(page.getByText(/Ouça e imite|Entenda o tema/i).first()).toBeVisible();
  });

  test("intro de hànzì é conceitual, sem composição 林/明", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-hanzi/player");
    await expect(page.getByText(/O que é Hànzì/i).first()).toBeVisible();
    await expect(page.getByText(/Monte 林|Monte 明|hb-lin|hb-ming/i)).toHaveCount(0);
  });

  test("prompt misto não abre glossário em português", async ({ page }) => {
    await seedFoundationThrough(page, "p1-engine-2-lab");
    await page.goto("/licao/l1/player");
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /combina/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /qual/i })).toHaveCount(0);
  });

  test("primeiros hànzì começa com fragmentos simples", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-hanzi");
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/Entenda o tema|Observe a forma e conecte/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /木/ }).first()).toBeVisible();
    await expect(page.getByText(/Monte 林|Monte 明|Monte 好/i)).toHaveCount(0);
  });
});

test.describe("revisão", () => {
  test("revisão básica responde sem erro", async ({ page }) => {
    await seedOnboardedSession(page, ["l1", "l1-rev"]);
    await page.goto("/revisao");
    await expect(page.getByText(/revisão|prioridade/i).first()).toBeVisible();
  });

  test("erro com 2★ aparece na revisão Pro", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/1 pendente\(s\)/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Corrigir agora/i })).toBeEnabled();
    await page.getByRole("button", { name: /Corrigir agora/i }).click();
    await expect(page.getByText(/你好|Toque no que ouviu/i).first()).toBeVisible();
  });

  test("plano grátis não expõe histórico detalhado de erros", async ({ page }) => {
    await seedLessonRecoverySession(page, { isPremium: false });
    await page.goto("/revisao");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1, name: "Revisão básica" })).toBeVisible();
    await expect(page.getByText(/pendente\(s\)/)).not.toBeVisible();
  });
});
