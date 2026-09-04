import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { dismissBlockingOverlays, seedInstructionLocale, seedUnlockedLessonSession, waitForLazyPage } from "./helpers";

const SHOTS = path.join(process.cwd(), "docs/reports/v490-screenshots");

test.describe("V4.9.0 pedagogical spine", () => {
  test("first Mandarin lesson teaches 你好 before the first grade", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qa/m1");
    await page.waitForURL(/p1-o-que-e-mandarim\/player/, { timeout: 20_000 });
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByRole("heading", { name: "Uma língua falada" })).toBeVisible();
    await page.getByRole("button", { name: /^Entendi$/ }).click();
    await expect(page.locator("[data-testid=pedagogical-notice]")).toBeVisible();
    await expect(page.getByText("你好", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("nǐ hǎo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Olá", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Ver tradução/ })).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "first-mandarin-notice-mobile.png"), fullPage: true });

    const speechFallback = page.getByRole("button", { name: /Não posso falar agora/i });
    if (await speechFallback.isVisible().catch(() => false)) await speechFallback.click();
    else await page.getByRole("button", { name: /Continuar|Concluir/i }).first().click();

    await expect(page.getByRole("button", { name: /Opção \d+: Olá/ })).toBeVisible();
    await expect(page.getByText("Obrigado(a)", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Até logo", { exact: true })).toHaveCount(0);
  });

  test("Pinyin capsule is structurally identical in PT/EN and mobile-safe", async ({ page }) => {
    await mkdir(SHOTS, { recursive: true });
    await seedUnlockedLessonSession(page, "p1-o-que-e-pinyin", { learnedChunks: ["nihao"], learnedChars: ["ni", "hao"] });
    await seedInstructionLocale(page, "pt-BR");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/jornada/capsula/capsule%3Apinyin-foundation%3Av1");
    await waitForLazyPage(page);
    await expect(page.locator("[data-testid=lesson-capsule]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pinyin: o mapa do som" })).toBeVisible();
    for (let index = 0; index < 3; index += 1) await page.locator("[data-testid=capsule-continue]").click();
    await expect(page.getByText("nǐ hǎo", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Iniciar exercícios/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
    await page.screenshot({ path: path.join(SHOTS, "pinyin-capsule-mobile-pt.png"), fullPage: true });

    await page.evaluate(() => {
      localStorage.setItem("longyu:instruction-locale", "en");
      localStorage.setItem("longyu:instruction-locale-user-override", "1");
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Pinyin: a map of sound" })).toBeVisible();
    await expect(page.getByText("A map for your ears", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: path.join(SHOTS, "pinyin-capsule-desktop-en.png"), fullPage: true });
  });

  test("Journey exposes a non-blocking bounded Blitz using learned targets", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-o-que-e-pinyin", { learnedChunks: ["nihao"], learnedChars: ["ni", "hao"] });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    // V4.9.2: os reforços saíram do painel piloto e passaram a viver na própria
    // trilha, ancorados por `afterTopicId`. O contrato do Blitz é o mesmo.
    const capsuleNode = page.locator("[data-journey-inline-node='node:capsule:pinyin-foundation:v1']");
    await expect(capsuleNode).toBeVisible();
    await capsuleNode.click();
    await expect(page).toHaveURL(/jornada\/capsula\/capsule%3Apinyin-foundation%3Av1/i);
    await page.goBack();
    await waitForLazyPage(page);
    const blitzNode = page.locator("[data-journey-inline-node='booster:foundations-blitz:v1']");
    await expect(blitzNode).toBeVisible();
    await expect(blitzNode).toHaveAttribute("data-ready", "true");
    // O Blitz fica ancorado logo depois do tópico que o motiva, não num bloco à parte.
    await expect(
      page.locator("[data-journey-inline-after='p1-o-que-e-mandarim']").locator("[data-journey-inline-node='booster:foundations-blitz:v1']")
    ).toHaveCount(1);
    await mkdir(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, "journey-foundation-orchestration-desktop.png"), fullPage: true });
    await blitzNode.click();
    await waitForLazyPage(page);
    await page.getByRole("button", { name: "Começar Blitz" }).click();

    const beforeMastery = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.lessonMasteryById ?? {});
    await expect(page.locator("[data-testid=bounded-blitz]")).toHaveAttribute("data-time-limit", "45");
    await expect(page.locator("[data-testid=bounded-blitz]")).toHaveAttribute("data-max-questions", "8");
    for (let answered = 0; answered < 8; answered += 1) {
      await page.locator("[data-testid=blitz-option]:not([disabled])").first().click();
      if (answered < 7) await expect(page.locator("[data-testid=blitz-option]:not([disabled])").first()).toBeVisible({ timeout: 5_000 });
    }
    await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("link", { name: "Voltar à Jornada" })).toBeVisible();
    const afterMastery = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}").state?.lessonMasteryById ?? {});
    expect(afterMastery).toEqual(beforeMastery);
  });
});
