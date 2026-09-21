import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedAtCultureGate,
  seedInstructionLocale,
  waitForLazyPage,
} from "./helpers";
import {
  CULTURE_PROGRESSION_GATES,
  requiredCultureItemIdsForGate,
} from "../src/data/cultureProgressionGates";

const SOCIAL = CULTURE_PROGRESSION_GATES.find((gate) => gate.id === "gate-social-etiquette")!;
const SOCIAL_REQUIRED = requiredCultureItemIdsForGate(SOCIAL);

async function openJourneyAtGate(
  page: Page,
  options: Parameters<typeof seedAtCultureGate>[2] = {}
) {
  await seedAtCultureGate(page, SOCIAL.beforeTopicId, options);
  await page.goto("/jornada");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  // O módulo do tópico guardado pode vir recolhido; expandir todos garante o marco visível.
  const expandAll = page.getByRole("button", { name: /Expandir tudo|Expand all/i });
  if (await expandAll.count()) await expandAll.first().click().catch(() => {});
}

test.describe("RC2.2.6 — marcos culturais na Jornada", () => {
  test("C1 — marco aparece com progresso, dragão e CTA; o tópico fica trancado", async ({ page }) => {
    await openJourneyAtGate(page);

    const gate = page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`);
    await expect(gate).toBeVisible();
    await expect(gate).toHaveAttribute("data-culture-gate-status", "locked");
    await expect(gate).toHaveAttribute(
      "data-culture-gate-progress",
      `0/${SOCIAL_REQUIRED.length}`
    );

    // Progresso legível, não só um cadeado.
    await expect(gate.getByTestId("culture-gate-progress")).toContainText(
      new RegExp(`0 de ${SOCIAL_REQUIRED.length}`)
    );

    // O dragão explica o porquê — GuideDialogue canônico, não um balão novo.
    await expect(gate.locator("[data-journey-guide-explanation]")).toBeVisible();
    await expect(gate.getByTestId("guide-speech-box")).toBeVisible();

    // Todos os requisitos listados, nenhum marcado.
    for (const itemId of SOCIAL_REQUIRED) {
      const row = gate.locator(`[data-culture-gate-item="${itemId}"]`);
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute("data-culture-gate-item-done", "false");
    }

    // CTA abre a PRÓXIMA Culture Lesson necessária, não o Hub genérico.
    const cta = gate.getByTestId("culture-gate-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("data-culture-gate-next", SOCIAL_REQUIRED[0]);
    const href = await cta.getAttribute("href");
    expect(href).toContain(`/licao/culture-${SOCIAL_REQUIRED[0]}/player`);
    expect(href).toContain("src=jornada");
    expect(href).not.toContain("/cultura$");
  });

  test("C1 — progresso parcial aparece como N/N, e o marco segue pendente", async ({ page }) => {
    await openJourneyAtGate(page, { cultureDoneItemIds: [SOCIAL_REQUIRED[0]] });

    const gate = page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`);
    await expect(gate).toBeVisible();
    await expect(gate).toHaveAttribute(
      "data-culture-gate-progress",
      `1/${SOCIAL_REQUIRED.length}`
    );
    await expect(gate.locator(`[data-culture-gate-item="${SOCIAL_REQUIRED[0]}"]`)).toHaveAttribute(
      "data-culture-gate-item-done",
      "true"
    );
    // O CTA avança para o requisito seguinte, não repete o já feito.
    await expect(gate.getByTestId("culture-gate-cta")).toHaveAttribute(
      "data-culture-gate-next",
      SOCIAL_REQUIRED[1]
    );
  });

  test("C1 — selo completo: marco sai da trilha e o tópico abre", async ({ page }) => {
    await openJourneyAtGate(page, { cultureDoneItemIds: [...SOCIAL_REQUIRED] });

    // Marco resolvido não ocupa a trilha.
    await expect(page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`)).toHaveCount(0);

    // E o tópico guardado deixa de estar trancado.
    const node = page.locator(`[data-lesson-id="${SOCIAL.beforeTopicId}"]`);
    if (await node.count()) {
      await expect(node.first()).not.toHaveAttribute("aria-disabled", "true");
    }
  });

  test("C4 — concluir pelo Culture Hub libera a Jornada (sem passar pela trilha)", async ({ page }) => {
    // `cultureCompletedIds` é exatamente o que o Hub escreve ao concluir.
    await openJourneyAtGate(page, { cultureDoneItemIds: [...SOCIAL_REQUIRED] });
    await expect(page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`)).toHaveCount(0);
  });

  test("A16 — deep link respeita o marco: URL direta não pula a Cultura", async ({ page }) => {
    await seedAtCultureGate(page, SOCIAL.beforeTopicId);
    await page.goto(`/licao/${SOCIAL.beforeTopicId}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    // Nenhum passo de exercício deve aparecer: a razão do marco toma a tela.
    await expect(page.locator("[data-current-step-kind]")).toHaveCount(0);
    // A tela de bloqueio explica o marco com a copy do registry (PT-BR aqui).
    const reasonHead = SOCIAL.reasonPt.slice(0, 40);
    await expect(page.getByText(reasonHead, { exact: false }).first()).toBeVisible();
  });

  test("A16 — com o selo, a mesma URL direta abre normalmente", async ({ page }) => {
    await seedAtCultureGate(page, SOCIAL.beforeTopicId, {
      cultureDoneItemIds: [...SOCIAL_REQUIRED],
      cultureSeals: [SOCIAL.requiredSealId],
    });
    await page.goto(`/licao/${SOCIAL.beforeTopicId}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-current-step-kind]").first()).toBeVisible({ timeout: 20_000 });
  });

  test("PT/EN — a razão do marco aparece em inglês no locale EN", async ({ page }) => {
    await seedInstructionLocale(page, "en");
    await seedAtCultureGate(page, SOCIAL.beforeTopicId);
    await page.goto(`/licao/${SOCIAL.beforeTopicId}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByText(SOCIAL.reasonEn.slice(0, 40), { exact: false }).first()).toBeVisible();
    // E nada de português sobrando para o aluno EN.
    await expect(page.getByText(SOCIAL.reasonPt.slice(0, 40), { exact: false })).toHaveCount(0);
  });

  test("A17 — usuário legado não regride: já além do marco, segue aberto", async ({ page }) => {
    const { ALL_LESSONS } = await import("../src/data/journey");
    const gateIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === SOCIAL.beforeTopicId);
    const laterId = ALL_LESSONS[gateIndex + 2]!.id;
    // Semeia ALÉM do marco: é o histórico de quem jogou antes desta feature.
    await seedAtCultureGate(page, laterId);
    await page.goto(`/licao/${SOCIAL.beforeTopicId}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    // Sem cultura nenhuma concluída, mas nada é retirado de quem já passou.
    await expect(page.getByText(SOCIAL.reasonPt.slice(0, 40), { exact: false })).toHaveCount(0);
  });
});

test.describe("RC2.2.6 — marco cultural no mobile", () => {
  for (const viewport of [
    { label: "390×844", width: 390, height: 844 },
    { label: "375×667", width: 375, height: 667 },
    { label: "360×640", width: 360, height: 640 },
  ] as const) {
    test(`C6 — ${viewport.label}: marco não toma a tela e o CTA fica acessível`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openJourneyAtGate(page);

      const gate = page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`);
      await expect(gate).toBeVisible();

      const box = await gate.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Marco é um passo na trilha, não um takeover de tela cheia.
        expect(box.height).toBeLessThan(viewport.height * 0.9);
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }

      const cta = gate.getByTestId("culture-gate-cta");
      await cta.scrollIntoViewIfNeeded();
      await expect(cta).toBeVisible();
      const ctaBox = await cta.boundingBox();
      if (ctaBox) {
        // Alvo de toque confortável.
        expect(ctaBox.height).toBeGreaterThanOrEqual(36);
      }
    });
  }
});

test.describe("RC2.2.6 — voz do dragão (contrato, não qualidade sonora)", () => {
  test("C5 — antecipar completa o texto e nenhum blip sobra depois", async ({ page }) => {
    await openJourneyAtGate(page);

    const gate = page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`);
    await expect(gate).toBeVisible();

    const dialogue = gate.locator("[data-testid='journey-guide-dialogue']");
    await expect(dialogue).toBeVisible();

    // Instrumenta o contrato observável: quantas vozes o engine iniciou.
    await page.evaluate(() => {
      const scope = window as unknown as Record<string, unknown> & { __blips?: number };
      const Ctor = (scope.AudioContext ?? scope.webkitAudioContext) as
        | { prototype: Record<string, unknown> }
        | undefined;
      if (!Ctor) return;
      scope.__blips = 0;
      const proto = Ctor.prototype;
      const original = proto.createOscillator as (this: unknown) => unknown;
      proto.createOscillator = function patched(this: unknown) {
        scope.__blips = (scope.__blips ?? 0) + 1;
        return original.call(this);
      };
    });

    const speech = gate.getByTestId("guide-speech-box");
    // Antecipa enquanto ainda digita.
    await speech.click();
    await expect(dialogue).toHaveAttribute("data-guide-phase", /complete|done/);

    const full = await speech.getAttribute("aria-label");
    await expect(gate.getByTestId("guide-visible-text")).toHaveText(String(full ?? ""));

    const afterCut = await page.evaluate(() => (window as unknown as { __blips?: number }).__blips ?? 0);
    await page.waitForTimeout(600);
    const later = await page.evaluate(() => (window as unknown as { __blips?: number }).__blips ?? 0);
    expect(later, "nenhuma voz nova depois do reveal instantâneo").toBe(afterCut);
  });

  test("C5.2 — segundo avanço dispensa o guia e o marco continua utilizável", async ({ page }) => {
    await openJourneyAtGate(page);
    const gate = page.locator(`[data-journey-culture-gate="${SOCIAL.id}"]`);
    const speech = gate.getByTestId("guide-speech-box");
    await expect(speech).toBeVisible();

    await speech.click(); // completa o texto
    // A máquina tem um guard (GUIDE_ADVANCE_GUARD_MS) para que um clique físico
    // nunca complete E avance de uma vez. Dois cliques dentro dessa janela fazem
    // o segundo ser ignorado — respeitar o guard é o contrato, não uma gambiarra.
    const guardMs = Number(
      (await page.locator("[data-guide-guard-ms]").first().getAttribute("data-guide-guard-ms")) ?? 80
    );
    await page.waitForTimeout(guardMs + 60);
    await gate.getByTestId("guide-continue").click(); // dispensa

    // Guia sai, marco permanece: progresso e CTA seguem disponíveis.
    await expect(gate.locator("[data-journey-guide-explanation]")).toHaveCount(0);
    await expect(gate.getByTestId("culture-gate-progress")).toBeVisible();
    await expect(gate.getByTestId("culture-gate-cta")).toBeVisible();
  });
});
