import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedInterfaceLocale,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible, clickFirstVisible, clickIfEnabled } from "./lesson-player-helpers";
import { ALL_LESSONS } from "../src/data/journey";

const FIRST = ALL_LESSONS[0];
const SHOTS = path.resolve(process.cwd(), "docs/reports/v484-screenshots");
const VICTORY =
  /Continue Journey|Back to the Journey|Practice again|Continue topic|Claim rewards|Continuar Jornada|Voltar à Jornada|Receber recompensas|Praticar novamente|Continuar tema/i;

const CORE_ROUTES = [
  "/",
  "/login",
  "/comecar",
  "/jornada",
  `/licao/${FIRST.id}`,
  `/licao/${FIRST.id}/player`,
  "/revisao",
  "/treino",
  "/missoes",
  "/loja",
  "/perfil",
  "/ajustes",
  "/mais",
  "/conquistas",
  "/conta",
  "/dados-locais",
  "/sobre",
  "/privacidade",
  "/amigos",
  "/convide",
];

const CAPTURED = [
  "precisão",
  "Precisão Serena",
  "Progresso salvo",
  "XP total agora",
  "Rever resultados",
  "Missões atualizadas",
  "Reforço guiado",
  "Prática curta",
  "Deixar feedback",
  "Receber recompensas",
  "Opcional",
  "Revisar",
  "Biblioteca",
  "Treinar",
];

type LeakClass =
  | "REAL_UI_LEAK"
  | "PEDAGOGICAL_TARGET"
  | "PROPER_NOUN"
  | "CHINESE"
  | "TECHNICAL"
  | "LEGAL_LATER"
  | "COMMERCIAL_LATER";

const PROPER = /^(Longyu|Mandarin|Pinyin|Hànzì|Hanzi|Qi|XP|Pro|Mei|Lin|Jade|Dragon|Longyu Pro)$/i;
const CJK = /[\u3400-\u9FFF]/;
const PINYIN = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i;
/** Portuguese-specific letters. Do NOT put `ões` inside `[]` — that also matches ASCII e/o/s. */
const PT_DIACRITICS = /[çãõâêô]/i;
const PT_MARKER =
  /\b(você|voce|não|nao|está|esta|estão|estao|lição|licao|precisão|precisao|recompensas|missões|missoes|revisar|biblioteca|treinar|jornada|começar|comecar|continuar|verificar|próximo|proximo|obrigad|então|entao|salvos?|sincroniz|conta|perfil|progresso|ofensiva|desbloquead|bloquead|conquistas?|histórico|historico|exportar|apagar|entrar|sair|ajustes|configuraç|missão|missao|baú|bau|pérola|perola|sequência|sequencia|módulo|modulo|grátis|gratis|indisponível|indisponivel|incluso|conteúdo|conteudo|pular|perguntas?|anterior|unidade|disponível|disponivel|concluíd|carregando|nenhum|ninguém|ninguem|procurar|seguir|convite|copiar|compartilhar|pendente|aguardando|teste)\b/i;

function classify(
  text: string,
  flags: { legal?: boolean; commercial?: boolean; hanzi?: boolean; pedagogical?: boolean }
): LeakClass | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return null;
  if (flags.hanzi || CJK.test(trimmed)) return "CHINESE";
  if (flags.legal) return "LEGAL_LATER";
  if (flags.commercial) return "COMMERCIAL_LATER";
  if (PROPER.test(trimmed) || /^Português \(Brasil\)$/i.test(trimmed) || /^English$/i.test(trimmed)) return "PROPER_NOUN";
  if (/^v?\d+\.\d+|zh-CN|HTTPS?|JSON|LGPD|SRS|M[1-4]|4\/4$/i.test(trimmed)) return "TECHNICAL";
  const hasPtWord = PT_MARKER.test(trimmed);
  const hasPtDiacritic = PT_DIACRITICS.test(trimmed);
  if (PINYIN.test(trimmed) && !hasPtWord && !hasPtDiacritic) return "CHINESE";
  if (!hasPtWord && !hasPtDiacritic) return null;
  if (/^(Qi|XP|Pro|Hànzì|Pinyin)$/i.test(trimmed)) return "PROPER_NOUN";
  if (flags.pedagogical) return "PEDAGOGICAL_TARGET";
  return "REAL_UI_LEAK";
}

async function collectSurfaceText(page: Page) {
  return page.evaluate(() => {
    const rows: { text: string; legal: boolean; commercial: boolean; hanzi: boolean; pedagogical: boolean; source: string }[] = [];
    const push = (text: string, el: Element, source: string) => {
      const value = text.replace(/\s+/g, " ").trim();
      if (!value) return;
      rows.push({
        text: value,
        legal: Boolean(el.closest("[data-legal-later]")),
        commercial: Boolean(el.closest("[data-commercial-later]")),
        hanzi: Boolean(el.closest("[data-hanzi], .hanzi")),
        pedagogical: Boolean(
          el.closest("[data-production-answer], [data-option-index], [data-conversation-scene], [data-canonical-zh]")
        ),
        source,
      });
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const el = node.parentElement;
      if (el && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) {
        push(node.textContent ?? "", el, "text");
      }
      node = walker.nextNode();
    }
    for (const el of document.querySelectorAll("[aria-label], [title], [placeholder]")) {
      for (const attr of ["aria-label", "title", "placeholder"] as const) {
        const value = el.getAttribute(attr);
        if (value) push(value, el, attr);
      }
    }
    for (const el of document.querySelectorAll("button, a, [role='button'], [role='link'], [role='dialog']")) {
      const label = el.getAttribute("aria-label") || el.getAttribute("name");
      if (label) push(label, el, el.getAttribute("role") || el.tagName.toLowerCase());
    }
    return rows;
  });
}

async function masteryLevel(page: Page, lessonId: string): Promise<number> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw) as {
        state?: { lessonMasteryById?: Record<string, { level?: number }> };
      };
      return parsed.state?.lessonMasteryById?.[id]?.level ?? 0;
    } catch {
      return 0;
    }
  }, lessonId);
}

async function playOpenStep(page: Page): Promise<boolean> {
  const production = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
  if (await production.isVisible().catch(() => false)) {
    await production.fill("你好").catch(() => undefined);
    return clickFirstVisible(page, [/^Verificar$|^Check$/, /^Confirmar$|^Confirm$/, /^Responder$|^Answer$/, /^Continuar$|^Continue$/]);
  }
  if ((await page.locator("[data-conversation-scene]").count()) > 0) {
    const option = page.getByRole("button", { name: /^(Opção|Option) \d+:/ });
    if (await option.first().isVisible().catch(() => false)) {
      const preferred = page.getByRole("button", { name: /(Opção|Option) \d+:.*(你好|Olá|Hello|nǐ hǎo)/i }).first();
      if (await preferred.isVisible().catch(() => false)) await clickIfEnabled(preferred);
      else await clickIfEnabled(option.first());
      return clickFirstVisible(page, [/^Verificar$|^Check$/, /^Confirmar$|^Confirm$/, /^Continuar$|^Continue$/, /^Concluir$|^Finish$/]);
    }
    return clickFirstVisible(page, [/^Responder$|^Answer$/, /^Concluir$|^Finish$/, /^Continuar$|^Continue$/]);
  }
  return false;
}

async function reachVictory(page: Page, lessonId: string) {
  const playerUrl = `/licao/${lessonId}/player`;
  await page.goto(playerUrl);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const victory = page.getByRole("button", { name: VICTORY });
  const frame = page.locator("[data-lesson-player-frame]");
  const deadline = Date.now() + 90_000;
  for (let steps = 0; steps < 80 && Date.now() < deadline; steps += 1) {
    await dismissBlockingOverlays(page);
    if (await victory.first().isVisible().catch(() => false)) return;
    const reviewOffer = page.getByRole("heading", { name: /pontos para firmar|Lesson review|points to lock in|Revisão da lição/i });
    if (await reviewOffer.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar$|^Continue$/]);
      await page.waitForTimeout(250);
      continue;
    }
    if (await frame.isVisible().catch(() => false)) {
      const passAttr = await frame.getAttribute("data-mastery-pass");
      if (passAttr && passAttr !== "1") {
        await expect
          .poll(async () => page.locator("[data-lesson-player-frame]").getAttribute("data-mastery-pass"), {
            timeout: 12_000,
          })
          .toBe("1");
      }
    }
    if (await clickFirstVisible(page, [/^Pular|^Skip/, /Não posso falar agora|I can't speak now/])) {
      await page.waitForTimeout(180);
      continue;
    }
    if (await playOpenStep(page)) {
      await page.waitForTimeout(180);
      continue;
    }
    const advanced = await advanceOneStep(page);
    if (!advanced) await advanceUntilVisible(page, victory, 2);
  }
  await expect(victory.first()).toBeVisible({ timeout: 8_000 });
}

test.describe("V4.8.4 English core surfaces", () => {
  test("i18n version is visible on the document for stale-build diagnosis", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-interface-locale", "en");
    await expect(page.locator("html")).toHaveAttribute("data-i18n-version", "v4.8.7");
    const sw = await page.request.get("/sw.js");
    if (sw.ok()) {
      const body = await sw.text();
      expect(body, "PWA cacheId must include the i18n version").toContain("longyu-i18n-v4.8.7");
    }
  });

  test("route crawler: no REAL_UI_LEAK on core EN surfaces", async ({ page }) => {
    test.setTimeout(120_000);
    await seedInterfaceLocale(page, "en");
    await seedOnboardedSession(page, ["l1"]);
    const leaks: { route: string; text: string; source: string }[] = [];
    for (const route of CORE_ROUTES) {
      await page.goto(route);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      const rows = await collectSurfaceText(page);
      for (const row of rows) {
        const kind = classify(row.text, row);
        if (kind === "REAL_UI_LEAK") {
          leaks.push({ route, text: row.text.slice(0, 160), source: row.source });
        }
      }
    }
    const unique = [...new Map(leaks.map((row) => [`${row.route}::${row.text}`, row])).values()];
    await mkdir(path.resolve(process.cwd(), "docs/reports"), { recursive: true });
    await writeFile(
      path.resolve(process.cwd(), "docs/reports/v484-e2e-leaks.json"),
      `${JSON.stringify({ count: unique.length, leaks: unique }, null, 2)}\n`
    );
    expect(unique, JSON.stringify(unique.slice(0, 40), null, 2)).toEqual([]);
  });

  test("topic 1 M1 victory screen is English", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Victory playthrough is Chromium-only.");
    test.setTimeout(180_000);
    await mkdir(SHOTS, { recursive: true });
    await seedInterfaceLocale(page, "en");
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await reachVictory(page, FIRST.id);
    await expect(page.getByRole("button", { name: /Claim rewards|Back to the Journey|Continue Journey/i }).first()).toBeVisible();
    const body = await page.locator("body").innerText();
    for (const needle of CAPTURED) {
      expect(body, `captured PT chrome still visible: ${needle}`).not.toMatch(
        needle === "Opcional" ? /\bOpcional\b/ : new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      );
    }
    await expect(page.getByText("Review", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Library", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Practice", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Accuracy|Serene Accuracy/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "lesson-victory.png"), fullPage: true });
    expect(await masteryLevel(page, FIRST.id)).toBeGreaterThanOrEqual(1);
  });

  test("critical surface screenshots + locale switch updates chrome", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Screenshot pack is Chromium-only.");
    test.setTimeout(90_000);
    await mkdir(SHOTS, { recursive: true });
    await seedInterfaceLocale(page, "en");
    await seedOnboardedSession(page, ["l1"]);

    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.screenshot({ path: path.join(SHOTS, "journey.png"), fullPage: true });

    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.screenshot({ path: path.join(SHOTS, "lesson-activity.png"), fullPage: true });

    await page.goto("/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.screenshot({ path: path.join(SHOTS, "review-hub.png"), fullPage: true });
    const startReview = page.getByRole("button", { name: /Start|Begin|Review now|Revisar agora|Start review/i }).first();
    if (await startReview.isVisible().catch(() => false)) {
      await startReview.click();
      await waitForLazyPage(page);
    }
    await page.screenshot({ path: path.join(SHOTS, "review-session.png"), fullPage: true });

    await page.goto("/conquistas");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByText("First step").first()).toBeVisible();
    await expect(page.getByText("Primeiro passo")).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "achievements.png"), fullPage: true });

    await page.goto("/ajustes");
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
    await page.getByTestId("interface-locale-select").selectOption("pt-BR");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByText(/Ajustes|Configurações/i).first()).toBeVisible();
    await page.getByTestId("interface-locale-select").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
  });

  test("energy blocked and retry chrome can be opened in EN", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "QA surfaces are Chromium-only.");
    await mkdir(SHOTS, { recursive: true });
    await seedInterfaceLocale(page, "en");
    await seedOnboardedSession(page, []);
    await page.goto("/qa/energy-empty");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.screenshot({ path: path.join(SHOTS, "energy-blocked.png"), fullPage: true });
    await page.screenshot({ path: path.join(SHOTS, "retry-modal.png"), fullPage: true });
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\bLição bloqueada por hoje\b/);
    expect(body).not.toMatch(/\bCargas do Dragão\b/);
  });

  test("unknown public route fails safely in English", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("[data-public-not-found]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This page is not here" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to home/i })).toBeVisible();
    await expect(page.getByText("Esta página não está aqui", { exact: true })).toHaveCount(0);
  });
});
