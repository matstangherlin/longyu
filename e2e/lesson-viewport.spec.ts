import { test, expect, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedFreshJourneySession } from "./helpers";

// Enquadramento e rolagem do player da lição (regras do Longyu):
//  · avançar nunca pode exigir que o aluno procure a próxima atividade;
//  · a atividade nova não herda a rolagem da anterior;
//  · a rolagem existe por conteúdo, dentro da região da atividade — a página
//    inteira não vira uma página longa;
//  · o enquadramento sai da viewport visível (dvh real), não de 100vh.

const LESSON = "/licao/p1-o-que-e-mandarim/player";

async function openPlayer(page: Page) {
  await seedFreshJourneySession(page);
  await page.goto(LESSON);
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("lesson-activity")).toBeVisible();
}

/**
 * Grava, dentro da página, a posição da região a cada troca de atividade. O
 * teste não pode medir de fora: entre a troca e a medição ele mesmo rolaria a
 * atividade nova, e algumas etapas avançam com atraso (feedback antes do swap).
 */
async function recordTransitions(page: Page) {
  await page.evaluate(() => {
    const region = document.querySelector('[data-testid="lesson-activity"]');
    if (!region) return;
    const w = window as unknown as { __lessonTransitions?: unknown[] };
    w.__lessonTransitions = [];
    let label = region.getAttribute("aria-label");
    new MutationObserver(() => {
      const next = region.getAttribute("aria-label");
      if (next === label) return;
      label = next;
      // Mede logo depois do assentamento e bem antes do próximo clique do
      // teste — medir tarde demais captaria a rolagem do próprio robô.
      window.setTimeout(() => {
        const frame = document.querySelector('[data-testid="lesson-frame"]');
        w.__lessonTransitions?.push({
          label: next,
          top: region.scrollTop,
          pageOverflow:
            document.documentElement.scrollHeight - document.documentElement.clientHeight,
          frameBottom: Math.round(frame?.getBoundingClientRect().bottom ?? -1),
          innerHeight: window.innerHeight,
        });
      }, 300);
    }).observe(region, { attributes: true, attributeFilter: ["aria-label"] });
  });
}

/** Rola a atividade até o fim e clica no botão de avanço mais provável. */
async function finishActivityFromTheBottom(page: Page) {
  await page.evaluate(() => {
    const region = document.querySelector('[data-testid="lesson-activity"]');
    if (region) region.scrollTop = region.scrollHeight;
  });
  const buttons = page.locator('[data-testid="lesson-activity"] button:visible:not([disabled])');
  const total = await buttons.count();
  for (let index = total - 1; index >= 0; index -= 1) {
    const label = ((await buttons.nth(index).textContent()) ?? "").trim();
    if (/Pular|Limpar|Reportar|Sair|Ver modelo|Dica|Não posso ouvir|Voltar ao áudio|Ouvir|Repetir/i.test(label)) {
      continue;
    }
    await buttons.nth(index).click({ timeout: 4_000 }).catch(() => undefined);
    return true;
  }
  return false;
}

test.describe("player da lição — viewport e rolagem", () => {
  test("a atividade cabe na viewport e a página não rola", async ({ page }) => {
    await openPlayer(page);

    const frame = page.getByTestId("lesson-frame");
    const box = await frame.boundingBox();
    const innerHeight = await page.evaluate(() => window.innerHeight);
    expect(box).not.toBeNull();
    // O frame termina dentro da viewport visível — nada de CTA fora da tela.
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(innerHeight + 1);

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - document.documentElement.clientHeight
    );
    expect(pageOverflow).toBe(0);

    // A rolagem mora na região da atividade.
    const regionScrolls = await page.evaluate(() => {
      const region = document.querySelector('[data-testid="lesson-activity"]');
      return region ? getComputedStyle(region).overflowY : null;
    });
    expect(regionScrolls).toBe("auto");
  });

  test("cada nova atividade começa no topo, mesmo terminando a anterior lá embaixo", async ({
    page,
  }) => {
    await openPlayer(page);
    await recordTransitions(page);

    for (let round = 0; round < 6; round += 1) {
      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible().catch(() => false)) {
        await dialog
          .getByRole("button", { name: /Continuar|Seguir|Fechar|Agora não|Depois/i })
          .first()
          .click({ timeout: 3_000 })
          .catch(() => undefined);
        await page.waitForTimeout(400);
      }
      if (!(await finishActivityFromTheBottom(page))) break;
      // Algumas etapas mostram feedback e só então avançam: espera o swap
      // acontecer e ser medido antes de tocar na tela de novo.
      await page.waitForTimeout(1_800);
    }

    const transitions = await page.evaluate(
      () =>
        (window as unknown as { __lessonTransitions?: {
          label: string;
          top: number;
          pageOverflow: number;
          frameBottom: number;
          innerHeight: number;
        }[] }).__lessonTransitions ?? []
    );

    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) {
      expect(transition.top, `${transition.label} nasceu rolada`).toBe(0);
      expect(transition.pageOverflow, `${transition.label} deixou a página rolável`).toBe(0);
      expect(transition.frameBottom).toBeLessThanOrEqual(transition.innerHeight + 1);
    }
  });

  test("sair da lição devolve a rolagem da página", async ({ page }) => {
    await openPlayer(page);
    expect(await page.evaluate(() => document.documentElement.dataset.lessonFrame)).toBe("locked");

    await page.getByRole("button", { name: "Sair" }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/player"));
    // O lock sai na desmontagem do player, não na troca de URL.
    await expect(page.getByTestId("lesson-frame")).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.dataset.lessonFrame)).toBeUndefined();
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflowY);
    expect(overflow).not.toBe("hidden");
  });
});
