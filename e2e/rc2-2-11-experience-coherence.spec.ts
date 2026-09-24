import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.11 — Learning Coherence, Immersion, Identity & Navigation Hardening.
 *
 * Geometria real (bounding boxes), não snapshot de pixel: o contrato é "nada
 * se sobrepõe sem intenção", em desktop, tablet e mobile.
 */
const STORE_VERSION = 21;
const DAY = 86_400_000;

async function seed(page: Page, state: Record<string, unknown>) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    ({ payload }) => {
      if (sessionStorage.getItem("rc2211-seeded")) return;
      sessionStorage.setItem("rc2211-seeded", "1");
      localStorage.setItem("longyu-v1", payload);
    },
    {
      payload: JSON.stringify({
        state: { accountSetupComplete: true, completedLessons: ["l1", "l2", "l3"], holdAchievementModals: true, ...state },
        version: STORE_VERSION,
      }),
    }
  );
}

type Box = { x: number; y: number; width: number; height: number };

function intersects(a: Box, b: Box): boolean {
  const tolerance = 1;
  return (
    a.x + tolerance < b.x + b.width &&
    b.x + tolerance < a.x + a.width &&
    a.y + tolerance < b.y + b.height &&
    b.y + tolerance < a.y + a.height
  );
}

async function boxes(page: Page, testIds: string[]): Promise<Record<string, Box>> {
  const out: Record<string, Box> = {};
  for (const id of testIds) {
    const locator = page.getByTestId(id).first();
    if ((await locator.count()) === 0 || !(await locator.isVisible())) continue;
    const box = await locator.boundingBox();
    if (box) out[id] = box;
  }
  return out;
}

function expectNoOverlap(found: Record<string, Box>, label: string) {
  const ids = Object.keys(found);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      expect(intersects(found[ids[i]], found[ids[j]]), `${label}: ${ids[i]} sobrepõe ${ids[j]}`).toBe(false);
    }
  }
}

const now = Date.now();
const PROFILE_STATE = {
  xpTotal: 1840,
  streak: 31,
  achievementsUnlocked: {
    "sequencia-30": now - 1000,
    "jornada-primeira-fase": now - 2000,
    "missoes-medalha-mensal": now - 3000,
    "jornada-primeira-licao": now - 4000,
    "som-primeiro-audio": now - 5000,
    "atlas-10-fracos-recuperados": now - 6000,
  },
  achievementHistory: [
    { id: "sequencia-30", unlockedAt: now - 1000 },
    { id: "jornada-primeira-fase", unlockedAt: now - 2000 },
    { id: "missoes-medalha-mensal", unlockedAt: now - 3000 },
  ],
  featuredAchievementIds: ["sequencia-30", "jornada-primeira-fase", "missoes-medalha-mensal"],
  rewardHistory: [
    { id: "r1", type: "xp", amount: 40, source: "Lição concluída: Cumprimentos e apresentações do dia a dia", claimedAt: now - DAY / 2 },
    { id: "r2", type: "qi", amount: 50, source: "Medalha: Ponto fraco, ponto forte — recuperação completa", claimedAt: now - DAY },
    { id: "r3", type: "xp", amount: 25, source: "Revisão espaçada com hànzì e tons trocados", claimedAt: now - 2 * DAY },
    { id: "r4", type: "xp", amount: 10, source: "Imersão", claimedAt: now - 3 * DAY },
  ],
};

const PROFILE_SIZES = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];

test.describe("RC2.2.11 — Perfil sem sobreposição", () => {
  for (const size of PROFILE_SIZES) {
    test(`Perfil ${size.width}x${size.height}: medalhas, conquistas recentes e histórico não se sobrepõem`, async ({ page }) => {
      await page.setViewportSize(size);
      await seed(page, PROFILE_STATE);
      await page.goto("/perfil");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByTestId("profile-recent-achievements")).toBeVisible();
      if (size.width < 1024) {
        // Mobile: os blocos recolhíveis abertos também não podem invadir vizinhos.
        for (const id of ["profile-recent-achievements", "profile-recent-history"]) {
          const details = page.getByTestId(id);
          if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
        }
      }
      const found = await boxes(page, [
        "profile-featured-medals",
        "profile-culture-passport",
        "profile-recent-achievements",
        "profile-recent-history",
        "profile-friends-card",
        "profile-username",
      ]);
      expect(Object.keys(found)).toEqual(expect.arrayContaining(["profile-recent-achievements", "profile-recent-history"]));
      expectNoOverlap(found, `${size.width}x${size.height}`);
      // Conteúdo interno não pode estourar a própria caixa (a causa clássica de invasão).
      for (const id of ["profile-recent-achievements", "profile-recent-history"]) {
        const overflow = await page.getByTestId(id).evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow, `${id} estoura horizontalmente`).toBeLessThanOrEqual(1);
      }
      await expect(page.getByTestId("profile-featured-medals")).toHaveAttribute("data-featured-count", "3");
      const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(docOverflow).toBeLessThanOrEqual(0);
    });
  }

  test("Perfil 1366x768 vazio: estado vazio de conquistas não invade o histórico", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await seed(page, { completedLessons: [], rewardHistory: PROFILE_STATE.rewardHistory });
    await page.goto("/perfil");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const found = await boxes(page, ["profile-recent-achievements", "profile-recent-history", "profile-friends-card"]);
    expectNoOverlap(found, "1366x768 vazio");
  });
});

// ── Imersão em bolhas ────────────────────────────────────────────────────────

const IMMERSION_WIDTHS = [360, 390, 412, 768, 1366];

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${label}: scroll horizontal`).toBeLessThanOrEqual(0);
}

test.describe("RC2.2.11 — Imersão: cena em bolhas", () => {
  for (const width of IMMERSION_WIDTHS) {
    test(`Imersão ${width}px: contexto, lados fixos, histórico oculto na pergunta, recap`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await seed(page, {});
      await page.goto("/imersao");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await page.getByTestId("interactive-story-start-primeiro-encontro").click();

      // Cartão de contexto antes da cena: onde, com quem, objetivo.
      const context = page.getByTestId("story-context-card");
      await expect(context).toBeVisible();
      await expect(page.getByTestId("story-context-cast")).toContainText("Lin");
      await expectNoHorizontalOverflow(page, `${width} contexto`);
      await page.getByTestId("story-context-start").click();

      // 1ª fala: Lin (林), à esquerda.
      const turn = page.getByTestId("story-current-turn");
      await expect(turn).toHaveAttribute("data-side", "left");
      await expect(turn).toHaveAttribute("data-speaker", "lin");
      await expect(turn.getByTestId("story-speaker-name")).toContainText("Lin");
      await expect(turn.getByTestId("story-speaker-name")).toContainText("林");
      await expectNoHorizontalOverflow(page, `${width} fala`);
      await page.getByRole("button", { name: /^Continuar/ }).click();

      // 2ª: vez do aluno (direita). Pergunta aberta → histórico oculto.
      await expect(turn).toHaveAttribute("data-side", "right");
      await expect(page.getByTestId("story-transcript")).toHaveCount(0);
      await turn.locator('button[aria-label^="Opção"]', { hasText: "你好！" }).first().click();
      // Respondida → histórico volta, com a fala de Lin à esquerda.
      const bubble = page.getByTestId("story-transcript").getByTestId("story-bubble").first();
      await expect(bubble).toHaveAttribute("data-side", "left");
      const box = await bubble.boundingBox();
      expect(box && box.x + box.width).toBeLessThanOrEqual(width);
      await expectNoHorizontalOverflow(page, `${width} histórico`);
    });
  }

  test("Imersão: recap no fim lista as falas e leva à revisão", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, {});
    await page.goto("/imersao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByTestId("interactive-story-start-primeiro-encontro").click();
    await page.getByTestId("story-context-start").click();
    for (let guard = 0; guard < 20; guard += 1) {
      if (await page.getByTestId("story-recap").isVisible().catch(() => false)) break;
      const option = page.locator('button[aria-label^="Opção "]:not([disabled])').first();
      if (await option.isVisible().catch(() => false)) await option.click();
      const input = page.locator('input[id^="story-answer-"]:not([disabled])');
      if (await input.isVisible().catch(() => false)) {
        await input.fill("xie xie");
        await page.getByRole("button", { name: "Conferir" }).click();
      }
      await page.getByRole("button", { name: /^(Continuar|Concluir)/ }).last().click();
    }
    await expect(page.getByTestId("story-recap")).toBeVisible();
    await expect(page.getByTestId("story-recap")).toContainText("你好");
    await page.getByTestId("story-recap-review").click();
    await expect(page).toHaveURL(/\/revisao/);
  });
});

// ── SmartBack ────────────────────────────────────────────────────────────────

test.describe("RC2.2.11 — SmartBack", () => {
  test("rota aberta direto (sem histórico) volta para o pai lógico, não sai do app", async ({ page }) => {
    await seed(page, PROFILE_STATE);
    await page.goto("/conquistas");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const back = page.getByTestId("smart-back");
    await expect(back).toHaveAttribute("data-smart-back-fallback", "/perfil");
    await back.click();
    await expect(page).toHaveURL(/\/perfil$/);
  });

  test("com histórico in-app confirmado, volta para a tela anterior", async ({ page }) => {
    await seed(page, PROFILE_STATE);
    await page.goto("/mais");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.evaluate(() => {
      window.history.pushState({ idx: 1, usr: null, key: "t" }, "", "/ajustes");
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    });
    await waitForLazyPage(page);
    await expect(page.getByTestId("smart-back")).toBeVisible();
    await page.getByTestId("smart-back").click();
    await expect(page).toHaveURL(/\/mais$/);
  });

  test("raiz não tem botão de voltar; desktop e mobile iguais", async ({ page }) => {
    await seed(page, PROFILE_STATE);
    for (const size of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.goto("/jornada");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByTestId("smart-back")).toHaveCount(0);
      await page.goto("/amigos");
      await waitForLazyPage(page);
      await expect(page.getByTestId("smart-back")).toHaveAttribute("data-smart-back-fallback", "/perfil");
    }
  });

  test("Pro: o voltar da página não usa histórico cego", async ({ page }) => {
    await seed(page, PROFILE_STATE);
    await page.goto("/pro");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByTestId("smart-back").click();
    await expect(page).toHaveURL(/\/jornada$/);
  });
});

// ── Login por identificador ──────────────────────────────────────────────────

test.describe("RC2.2.11 — Login por email ou nome de usuário", () => {
  test("um campo só; username sem backend aplicado não chama a nuvem nem revela email", async ({ page }) => {
    const cloudCalls: string[] = [];
    await page.route(/supabase\.co\/(auth|functions|rest)\//, async (route) => {
      cloudCalls.push(route.request().url());
      await route.abort();
    });
    await seedTelemetryDeclined(page);
    await page.goto("/login");
    await waitForLazyPage(page);
    const identifier = page.getByTestId("login-identifier");
    await expect(page.getByText("Email ou nome de usuário")).toBeVisible();
    await expect(identifier).toHaveAttribute("autocomplete", "username");
    const before = cloudCalls.filter((url) => /sign-in-identifier|token\?grant_type=password/.test(url)).length;
    await identifier.fill("ana_teste");
    await page.locator('input[name="password"]').fill("senha123");
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    await expect(page.getByText(/nome de usuário ainda não está disponível/i)).toBeVisible();
    const after = cloudCalls.filter((url) => /sign-in-identifier|token\?grant_type=password/.test(url)).length;
    expect(after).toBe(before);
    await expect(page.locator("body")).not.toContainText("@example.com");
  });

  test("identificador inválido: mensagem estrutural, sem chamada de login", async ({ page }) => {
    const loginCalls: string[] = [];
    await page.route(/supabase\.co\/(auth\/v1\/token|functions\/v1\/sign-in-identifier)/, async (route) => {
      loginCalls.push(route.request().url());
      await route.abort();
    });
    await seedTelemetryDeclined(page);
    await page.goto("/login");
    await waitForLazyPage(page);
    await page.getByTestId("login-identifier").fill("a");
    await page.locator('input[name="password"]').fill("senha123");
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    await expect(page.getByText(/email ou nome de usuário/i).last()).toBeVisible();
    expect(loginCalls).toEqual([]);
  });
});

// ── Liga: conteúdo primeiro ──────────────────────────────────────────────────

test.describe("RC2.2.11 — Liga rápida", () => {
  test("mostra conteúdo sem esperar o flush de XP e sem faixa 'Sincronizando XP'", async ({ page }) => {
    await seed(page, { weeklyXp: 120, xpTotal: 900 });
    const started = Date.now();
    await page.goto("/ligas");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const root = page.getByTestId("league-page");
    await expect(root).toHaveAttribute("data-league-first-content", /cache|live|demo|error/, { timeout: 8_000 });
    const ms = Number(await root.getAttribute("data-league-first-content-ms"));
    expect(Number.isFinite(ms)).toBe(true);
    expect(Date.now() - started).toBeLessThan(15_000);
    await expect(page.getByText(/Sincronizando XP/i)).toHaveCount(0);
  });
});
