import { expect, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedPendingStarRecoverySession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, clickFirstVisible } from "./lesson-player-helpers";

/** Viewports reais do QA mobile (B001). Emulação — não substitui aparelho físico. */
export const MOBILE_VIEWPORTS = [
  { label: "360×640", width: 360, height: 640 },
  { label: "375×667", width: 375, height: 667 },
  { label: "390×844", width: 390, height: 844 },
  { label: "667×360 landscape", width: 667, height: 360 },
] as const;

export type PlayerGeometry = {
  scrollY: number;
  docScroll: number;
  bodyOverflow: string;
  rootOverflow: string;
  bodyPosition: string;
  frameTop: number;
  frameHeight: number;
  vvHeight: number;
  headerTop: number;
  headerBottom: number;
  horizontalOverflow: number;
};

export async function readPlayerGeometry(page: Page): Promise<PlayerGeometry> {
  return page.evaluate(() => {
    const frame = document.querySelector("[data-lesson-player-frame]") as HTMLElement | null;
    const exitBtn = document.querySelector('button[aria-label="Sair"]');
    const header = exitBtn?.closest(".sticky") as HTMLElement | null;
    const frameRect = frame?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      docScroll: document.documentElement.scrollTop,
      bodyOverflow: getComputedStyle(document.body).overflow,
      rootOverflow: getComputedStyle(document.documentElement).overflow,
      bodyPosition: document.body.style.position,
      frameTop: frameRect?.top ?? -1,
      frameHeight: frameRect?.height ?? 0,
      vvHeight: window.visualViewport?.height ?? window.innerHeight,
      headerTop: headerRect?.top ?? -1,
      headerBottom: headerRect?.bottom ?? -1,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

/** Página não deve rolar por fora do frame fixo (#132 / B001). */
export async function assertPageScrollLocked(page: Page) {
  const geo = await readPlayerGeometry(page);
  expect(geo.scrollY, "window.scrollY").toBe(0);
  expect(geo.docScroll, "documentElement.scrollTop").toBe(0);
  expect(geo.bodyOverflow).toBe("hidden");
  expect(geo.rootOverflow).toBe("hidden");
  expect(geo.bodyPosition).toBe("fixed");
  expect(geo.horizontalOverflow).toBeLessThanOrEqual(1);
}

/** Frame ocupa a visualViewport — sem gap acima (#138–#140). */
export async function assertFrameFillsViewport(page: Page, tolerancePx = 8) {
  const geo = await readPlayerGeometry(page);
  expect(geo.frameTop).toBeLessThanOrEqual(2);
  expect(Math.abs(geo.frameHeight - geo.vvHeight)).toBeLessThanOrEqual(tolerancePx);
  if (geo.headerTop >= 0) {
    expect(geo.headerTop).toBeGreaterThanOrEqual(geo.frameTop - 1);
    expect(geo.headerBottom).toBeLessThanOrEqual(geo.frameTop + 120);
  }
}

/** CTA principal visível dentro da viewport ou sticky bar. */
export async function assertPrimaryCtaInViewport(page: Page) {
  const sticky = page.locator("[data-lesson-sticky-actions]");
  const cta = sticky.locator("button:visible").first();
  await expect(cta).toBeVisible();
  await assertElementInViewport(cta);
}

/**
 * MOBILE-007 — nenhuma opção interativa pode ficar sob a barra de ação fixa.
 *
 * QA em Android real flagrou a barra "Limpar | Verificar" cobrindo os cards de
 * caractere: a barra do HanziBuilder não publicava a própria altura, então o
 * scroller não reservava espaço algum. O assert é geométrico de propósito —
 * "o CTA está visível" passava mesmo com as opções escondidas atrás dele.
 *
 * Regra: rolando até o fim, a última opção tem de terminar acima do topo da
 * barra, com folga. Opções fora da viewport não contam (o aluno rola até elas);
 * o que não pode é ficarem PRESAS sob a barra sem scroll possível.
 */
export async function assertNoStickyBarOverlap(page: Page, safeGapPx = 4) {
  const overlap = await page.evaluate((safeGap) => {
    const bar = document.querySelector("[data-lesson-sticky-actions]") as HTMLElement | null;
    if (!bar) return { checked: 0, worst: null as null | Record<string, unknown> };
    const barRect = bar.getBoundingClientRect();
    if (barRect.height === 0) return { checked: 0, worst: null };

    const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;

    const interactive = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-lesson-activity-scroll] button, [data-lesson-activity-scroll] [role='button']"
      ),
    ].filter((el) => !bar.contains(el) && el.getBoundingClientRect().height > 0);

    const fresh = bar.getBoundingClientRect();
    const scrollerRect = scroller?.getBoundingClientRect() ?? null;
    const docked = bar.dataset.lessonActionMode === "docked";
    let worst: null | Record<string, unknown> = null;
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      // A faixa docked é irmã do scroller. Conteúdo que geometricamente
      // continua abaixo do seu limite está recortado por overflow, não coberto.
      const visibleTop = docked && scrollerRect ? Math.max(rect.top, scrollerRect.top) : rect.top;
      const visibleBottom = docked && scrollerRect ? Math.min(rect.bottom, scrollerRect.bottom) : rect.bottom;
      // Só conta sobreposição real: elemento cruzando a faixa da barra.
      const covered = visibleBottom > fresh.top + safeGap && visibleTop < fresh.bottom;
      if (!covered) continue;
      const depth = rect.bottom - fresh.top;
      if (!worst || depth > (worst.depth as number)) {
        worst = {
          depth,
          label: (el.textContent ?? "").trim().slice(0, 40),
          elementBottom: rect.bottom,
          barTop: fresh.top,
        };
      }
    }
    return { checked: interactive.length, worst };
  }, safeGapPx);

  expect(
    overlap.worst,
    `opção coberta pela barra fixa: ${JSON.stringify(overlap.worst)}`
  ).toBeNull();
}

/**
 * No player principal, a ação fica numa faixa irmã do scroller. Isso é mais
 * forte que reservar padding: nenhuma posição de scroll consegue colocar uma
 * resposta atrás do CTA.
 */
export async function assertLessonActionDockedOutsideAnswers(page: Page) {
  const geometry = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>("[data-lesson-activity-scroll]");
    const region = document.querySelector<HTMLElement>("[data-lesson-action-region]");
    const action = region?.querySelector<HTMLElement>("[data-lesson-bottom-action]") ?? null;
    if (!scroller || !region || !action) return { ok: false, reason: "missing action region" };
    const sr = scroller.getBoundingClientRect();
    const rr = region.getBoundingClientRect();
    const ar = action.getBoundingClientRect();
    const visibleControls = [...scroller.querySelectorAll<HTMLElement>("button, [role='button'], input, textarea")]
      .filter((node) => node.getBoundingClientRect().height > 0);
    const overlaps = visibleControls
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, sr.top);
        const visibleBottom = Math.min(rect.bottom, sr.bottom);
        return visibleBottom > rr.top && visibleTop < rr.bottom;
      })
      .map((node) => (node.textContent ?? node.getAttribute("aria-label") ?? node.tagName).trim().slice(0, 48));
    return {
      ok:
        action.dataset.lessonActionMode === "docked" &&
        region.contains(action) &&
        !scroller.contains(action) &&
        sr.bottom <= rr.top + 2 &&
        ar.top >= rr.top - 1 &&
        ar.bottom <= rr.bottom + 1 &&
        overlaps.length === 0,
      mode: action.dataset.lessonActionMode,
      scrollerBottom: sr.bottom,
      regionTop: rr.top,
      regionBottom: rr.bottom,
      actionTop: ar.top,
      actionBottom: ar.bottom,
      overlaps,
    };
  });
  expect(geometry.ok, JSON.stringify(geometry)).toBe(true);
}

/** Botão visível dentro da visualViewport (tolerância pequena). */
export async function assertElementInViewport(
  locator: import("@playwright/test").Locator,
  tolerancePx = 4
) {
  await expect(locator).toBeVisible();
  const box = await locator.evaluate((el, tolerance) => {
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport?.height ?? window.innerHeight;
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      vv,
      inView: rect.top >= -2 && rect.bottom <= vv + tolerance,
    };
  }, tolerancePx);
  expect(box.height).toBeGreaterThan(20);
  expect(box.inView, JSON.stringify(box)).toBe(true);
}

/** Revisão: sem spill horizontal; topo ancorado; scroll da página bloqueado. */
export async function assertReviewLayoutStable(page: Page) {
  await expect(
    page.locator("[data-review-session], [data-review-offer], [data-review-question]").first()
  ).toBeVisible();
  const layout = await page.evaluate(() => {
    const review = document.querySelector(
      "[data-review-session], [data-review-offer], [data-review-question]"
    ) as HTMLElement | null;
    const rr = review?.getBoundingClientRect();
    return {
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      reviewTop: rr?.top ?? -1,
      reviewBottom: rr?.bottom ?? 0,
      vv: window.visualViewport?.height ?? window.innerHeight,
    };
  });
  expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(layout.reviewTop).toBeGreaterThanOrEqual(-2);
  expect(layout.reviewTop).toBeLessThan(140);
  await assertPageScrollLocked(page);
}

/**
 * Revisão pós-erro não estoura o shell mobile.
 * Oferta/sessão renderiza fora de `[data-lesson-player-frame]` — valida viewport/frame + scroll lock.
 */
export async function assertReviewContainedInFrame(page: Page) {
  const review = page.locator("[data-review-session], [data-review-offer], [data-review-question]").first();
  await expect(review).toBeVisible();
  const contained = await page.evaluate(() => {
    const frame = document.querySelector("[data-lesson-player-frame]") as HTMLElement | null;
    const reviewNode = document.querySelector(
      "[data-review-session], [data-review-offer], [data-review-question]"
    ) as HTMLElement | null;
    const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
    if (!reviewNode) return { ok: false, reason: "no review node" };
    const rr = reviewNode.getBoundingClientRect();
    const vv = window.visualViewport?.height ?? window.innerHeight;
    const boundsTop = frame ? frame.getBoundingClientRect().top : 0;
    const boundsBottom = frame ? frame.getBoundingClientRect().bottom : vv;
    const horizontalOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const topOk = rr.top >= boundsTop - 2 && rr.top < boundsTop + 140;
    const bottomOk =
      rr.bottom <= boundsBottom + 4 ||
      Boolean(scroller && scroller.scrollHeight > scroller.clientHeight + 8);
    return {
      ok: topOk && (bottomOk || horizontalOverflow <= 1),
      mode: frame ? "frame" : "viewport",
      boundsBottom,
      reviewBottom: rr.bottom,
      horizontalOverflow,
      scrollerScrollable: scroller ? scroller.scrollHeight > scroller.clientHeight : false,
    };
  });
  expect(contained.ok, JSON.stringify(contained)).toBe(true);
  await assertPageScrollLocked(page);
}

/** Modal de erro / overlay: botão de ação acessível na viewport ou no scroller do modal. */
export async function assertModalActionAccessible(page: Page) {
  const heading = page.getByRole("heading", { name: /Quer tentar de novo|Quase/i });
  const feedbackWrong = page.getByText(/^Quase$/).first();
  await expect(heading.or(feedbackWrong)).toBeVisible({ timeout: 8_000 });
  const action = page.getByRole("button", {
    name: /^Continuar$|^Tentar de novo|^Verificar$|^Continuar e perder perfeição|^Tentar de novo por|^Tentar de novo sem Qi/i,
  }).first();
  await expect(action).toBeVisible();
  await action.scrollIntoViewIfNeeded();
  const reachable = await action.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport?.height ?? window.innerHeight;
    if (rect.top >= 0 && rect.bottom <= vv + 8) return true;
    const modal = el.closest("[class*='overflow-y-auto']") as HTMLElement | null;
    if (!modal) return false;
    const mr = modal.getBoundingClientRect();
    return rect.top >= mr.top - 4 && rect.bottom <= mr.bottom + 8;
  });
  expect(reachable).toBe(true);
}

/** Vitória: CTA principal sem exigir scroll da página (scroll interno da atividade é ok). */
export async function assertVictoryWithoutPageScroll(page: Page) {
  const victoryCta = page.getByRole("button", { name: /Continuar Jornada|Voltar à Jornada|Receber recompensas|Continuar tema/i }).first();
  await expect(victoryCta).toBeVisible();
  await assertPageScrollLocked(page);
  const reachable = await victoryCta.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport?.height ?? window.innerHeight;
    if (rect.top >= 0 && rect.bottom <= vv + 4) {
      return { ok: true, mode: "visible" as const };
    }
    const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
    if (scroller) {
      const sr = scroller.getBoundingClientRect();
      const ctaTopInScroller = rect.top - sr.top + scroller.scrollTop;
      const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const canScrollToCta = ctaTopInScroller + rect.height <= maxScroll + scroller.clientHeight + 4;
      if (canScrollToCta) return { ok: true, mode: "internal-scroll" as const };
    }
    return { ok: false, mode: "unreachable" as const, bottom: rect.bottom, vv };
  });
  expect(reachable.ok, JSON.stringify(reachable)).toBe(true);

  const geometry = await page.evaluate(() => {
    const victory = document.querySelector<HTMLElement>("[data-lesson-victory]");
    const scroll = document.querySelector<HTMLElement>("[data-lesson-victory-scroll]");
    const actions = document.querySelector<HTMLElement>("[data-lesson-victory-actions]");
    const cta = document.querySelector<HTMLElement>("[data-testid='topic-victory-return']");
    if (!victory || !scroll || !actions || !cta) return { ok: false, reason: "missing victory layout" };
    const vr = victory.getBoundingClientRect();
    const sr = scroll.getBoundingClientRect();
    const ar = actions.getBoundingClientRect();
    const cr = cta.getBoundingClientRect();
    const vv = window.visualViewport?.height ?? window.innerHeight;
    return {
      ok:
        actions.contains(cta) &&
        !scroll.contains(cta) &&
        sr.bottom <= ar.top + 2 &&
        cr.top >= ar.top - 1 &&
        cr.bottom <= ar.bottom + 1 &&
        vr.bottom <= vv + 2,
      scrollBottom: sr.bottom,
      actionsTop: ar.top,
      actionsBottom: ar.bottom,
      ctaTop: cr.top,
      ctaBottom: cr.bottom,
      victoryBottom: vr.bottom,
      vv,
    };
  });
  expect(geometry.ok, JSON.stringify(geometry)).toBe(true);
}

/** Avança até a primeira prática avaliada, depois do scaffold multimodal de 你好. */
export async function openListenSelectStep(page: Page) {
  await openPlayer(page);
  const hasChoices = async () => {
    const correct = page.getByRole("button", { name: /Opção \d+: Olá|^Olá$/ }).first();
    const controlledDistractor = page.getByRole("button", { name: /Opção \d+: um número|^um número$/ }).first();
    return (await correct.isVisible().catch(() => false)) && (await controlledDistractor.isVisible().catch(() => false));
  };
  for (let i = 0; i < 12; i += 1) {
    if (await hasChoices()) return;
    await clickFirstVisible(page, [
      /^Entendi$/,
      /^Não posso falar agora$/,
      /^Ouvir$/,
      /^Continuar$/,
      /^Próximo$/,
    ]);
    await page.waitForTimeout(180);
  }
  await expect(page.getByRole("button", { name: /Opção \d+: Olá|^Olá$/ }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Opção \d+: um número|^um número$/ }).first()).toBeVisible();
}

/** Completa a primeira prática guiada e abre o próximo passo avaliado. */
export async function openPostListenGradedStep(page: Page) {
  await openListenSelectStep(page);
  await page.getByRole("button", { name: /Opção \d+: Olá|^Olá$/ }).first().click();
  await page.keyboard.press("Escape").catch(() => undefined);
  const verify = page.getByRole("button", { name: /^Verificar$|^Confirmar$|^Conferir$/ }).first();
  await expect(verify).toBeEnabled({ timeout: 5_000 });
  await verify.scrollIntoViewIfNeeded();
  await verify.click();
  const nextChoice = page
    .getByRole("button", { name: /Opção \d+/ })
    .or(page.getByRole("button", { name: /^Olá$|^Obrigado|^Até logo|^De nada$/i }))
    .or(page.getByRole("button", { name: /^(你好|谢谢|再见)$/ }))
    .first();
  for (let i = 0; i < 8; i += 1) {
    if (await nextChoice.isVisible().catch(() => false)) return;
    await clickFirstVisible(page, [/^Entendi$/, /^Continuar$/, /^Próximo$/, /^Certo/, /\+Qi/]);
    await page.waitForTimeout(150);
  }
  await expect(nextChoice).toBeVisible({ timeout: 12_000 });
}

export async function openPlayerPro(page: Page, lessonId = "p1-o-que-e-mandarim") {
  await seedFreshJourneySession(page, { isPremium: true });
  await seedProOnTopOfSession(page);
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
}

export async function openPlayer(page: Page, lessonId = "p1-o-que-e-mandarim") {
  await seedFreshJourneySession(page);
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
}

export async function seedProOnTopOfSession(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
      if (!parsed.state) return;
      parsed.state.isPremium = true;
      parsed.state.folego = 20;
      parsed.state.holdAchievementModals = true;
      localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
  });
}

/** Simula teclado virtual encolhendo a viewport (Chromium headless). */
export async function simulateVirtualKeyboard(page: Page, targetHeight: number) {
  const size = page.viewportSize();
  if (!size) return;
  await page.setViewportSize({ width: size.width, height: Math.max(280, targetHeight) });
  await page.waitForTimeout(120);
}

export async function injectLongActivityScroll(page: Page, scrollTop = 900) {
  const scroller = page.locator("[data-lesson-activity-scroll]");
  await scroller.evaluate((node, top) => {
    const spacer = document.createElement("div");
    spacer.dataset.testSpacer = "1";
    spacer.style.height = "1600px";
    node.appendChild(spacer);
    node.scrollTop = top;
  }, scrollTop);
  await expect.poll(async () => scroller.evaluate((node) => node.scrollTop), { timeout: 3_000 }).toBeGreaterThan(100);
  return scroller;
}

export async function advanceUntilSelector(
  page: Page,
  selector: string,
  maxSteps = 45,
  timeoutMs = 120_000,
  options: { allowSkip?: boolean } = {}
): Promise<boolean> {
  const allowSkip = options.allowSkip ?? true;
  const target = page.locator(selector);
  const deadline = Date.now() + timeoutMs;
  let steps = 0;
  while (!(await target.isVisible().catch(() => false)) && Date.now() < deadline && steps < maxSteps) {
    steps += 1;
    await dismissBlockingOverlays(page);
    if (
      await page.getByRole("button", { name: /Continuar Jornada|Voltar à Jornada|Receber recompensas|Continuar tema/i }).first().isVisible().catch(() => false)
    ) {
      return false;
    }
    // Speak/listen imitation: sem Pular em alguns steps — sai pela rota sem microfone.
    const skippedSpeak = await clickFirstVisible(page, [
      /^Não posso falar agora$/,
      /^Agora não$/,
      /^Continuar sem falar$/,
    ]);
    if (skippedSpeak) {
      await page.waitForTimeout(120);
      continue;
    }
    const skipped = allowSkip ? await clickFirstVisible(page, [/^Pular/]) : false;
    if (!skipped) {
      const advanced = await advanceOneStep(page);
      if (!advanced) await page.waitForTimeout(180);
    } else {
      await page.waitForTimeout(120);
    }
  }
  return target.isVisible().catch(() => false);
}

export async function openReviewFlow(page: Page) {
  await seedPendingStarRecoverySession(page, {
    lessonId: "l3",
    stepIndex: 5,
    exerciseType: "dialogue_choice",
    expectedAnswer: "我很好",
  });
  await page.goto("/licao/l3/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-review-offer]")).toBeVisible({ timeout: 15_000 });
  await page.locator("[data-review-start]").click();
  await dismissBlockingOverlays(page);
}

export async function openTransferStep(page: Page) {
  // V4.5: primeira transferência combinacional determinística em L15 (l2-rev).
  // l24 deixou de carregar transfer_task (cooldown/domínio/planner) — fixture
  // antiga era obsoleta, não regressão pedagógica de "l24 deveria ter transfer".
  await seedLessonPlayerReady(page, "l2-rev", { masteryLevel: 0 });
  await seedProOnTopOfSession(page);
  await page.goto("/licao/l2-rev/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const ok = await advanceUntilSelector(page, '[data-production-step="transfer_task"]', 40, 120_000);
  expect(ok).toBe(true);
  await expect(page.locator('[data-production-step="transfer_task"]')).toBeVisible();
}

/**
 * Abre um sentence_build com várias peças (água: 这/是/水/火/山) e injeta
 * peças extras no banco para forçar várias fileiras — regressão B001.
 */
export async function openDenseSentenceBuild(page: Page) {
  // M1 prioriza reconhecimento; montagem/produção entra em M2–M3.
  // Pro evita o modal de Fôlego enquanto o teste pula até o banco.
  await seedLessonPlayerReady(page, "p4-char-shui", { masteryLevel: 2, isPremium: true, folego: 20 });
  await page.goto("/licao/p4-char-shui/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const ok = await advanceUntilSelector(page, "[data-assembly-bank]", 40, 120_000);
  expect(ok).toBe(true);
  const before = await page.locator("[data-assembly-bank] button").count();
  await page.locator("[data-assembly-bank]").evaluate((bank) => {
    for (let i = 0; i < 14; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `片${i}`;
      btn.dataset.testExtraPiece = "1";
      btn.className = "min-h-11 rounded-xl border border-line bg-surface px-4 py-2 text-xl";
      bank.appendChild(btn);
    }
  });
  await expect(page.locator("[data-assembly-bank] button")).toHaveCount(before + 14);
}

/** Última fileira do banco não fica coberta pela ação inferior (B001). */
export async function assertBankAboveSticky(page: Page) {
  const sticky = page.locator("[data-lesson-sticky-actions]");
  const bank = page.locator("[data-assembly-bank]");
  await expect(sticky).toBeVisible();
  await expect(bank).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const stickyEl = document.querySelector("[data-lesson-sticky-actions]") as HTMLElement | null;
    const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
    if (!stickyEl || !scroller) return Number.POSITIVE_INFINITY;

    if (stickyEl.dataset.lessonActionMode === "docked") {
      const region = document.querySelector("[data-lesson-action-region]") as HTMLElement | null;
      if (!region || !region.contains(stickyEl)) return Number.POSITIVE_INFINITY;
      // No layout novo o scroller termina antes da faixa de ação; não existe
      // reserva CSS para comparar porque as duas regiões não se sobrepõem.
      return Math.max(0, scroller.getBoundingClientRect().bottom - region.getBoundingClientRect().top);
    }

    const reserved = Number.parseFloat(
      getComputedStyle(scroller).getPropertyValue("--lesson-bottom-action-height")
    );
    return Math.abs(reserved - stickyEl.getBoundingClientRect().height);
  })).toBeLessThanOrEqual(2);
  // Garante que a última peça realmente chega acima do sticky, não apenas que
  // ainda existe scroll teórico disponível.
  const lastPiece = bank.locator("button").last();
  await lastPiece.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const stickyEl = document.querySelector("[data-lesson-sticky-actions]") as HTMLElement | null;
    const scroller = document.querySelector("[data-lesson-activity-scroll]") as HTMLElement | null;
    const last = document.querySelector("[data-assembly-bank] button:last-of-type") as HTMLElement | null;
    if (!stickyEl || !scroller || !last) return;
    const overlap = last.getBoundingClientRect().bottom - stickyEl.getBoundingClientRect().top;
    if (overlap > -8) scroller.scrollBy({ top: overlap + 12, behavior: "auto" });
  });

  await expect.poll(async () => page.evaluate(() => {
    const stickyEl = document.querySelector("[data-lesson-sticky-actions]") as HTMLElement | null;
    const last = document.querySelector("[data-assembly-bank] button:last-of-type") as HTMLElement | null;
    if (!stickyEl || !last) return Number.NEGATIVE_INFINITY;
    return stickyEl.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
  })).toBeGreaterThanOrEqual(0);

  const geometry = await page.evaluate(() => {
    const stickyEl = document.querySelector("[data-lesson-sticky-actions]") as HTMLElement | null;
    const bankEl = document.querySelector("[data-assembly-bank]") as HTMLElement | null;
    const last = bankEl?.querySelector("button:last-of-type") as HTMLElement | null;
    if (!stickyEl || !last) return { ok: false, reason: "missing nodes" };
    const sr = stickyEl.getBoundingClientRect();
    const lr = last.getBoundingClientRect();
    const vv = window.visualViewport?.height ?? window.innerHeight;
    // Peça acima do topo do sticky, ou scroller consegue trazê-la acima.
    const aboveSticky = lr.bottom <= sr.top + 2;
    const stickyInView = sr.top < vv && sr.bottom > 0;
    return {
      ok: aboveSticky && stickyInView,
      aboveSticky,
      stickyInView,
      lastBottom: lr.bottom,
      stickyTop: sr.top,
      vv,
    };
  });
  expect(geometry.ok, JSON.stringify(geometry)).toBe(true);
  const cta = sticky.locator("button:visible").first();
  await cta.scrollIntoViewIfNeeded();
  await cta.evaluate((element) => {
    const scroller = element.closest("[data-lesson-activity-scroll]") as HTMLElement | null;
    if (!scroller) return;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    if (rect.top < 4) scroller.scrollBy({ top: rect.top - 4, behavior: "auto" });
    else if (rect.bottom > viewportHeight - 4) {
      scroller.scrollBy({ top: rect.bottom - viewportHeight + 4, behavior: "auto" });
    }
  });
  await assertElementInViewport(cta);
}

export async function openOpenProductionStep(page: Page) {
  // Produção aberta no Mastery Loop de l26b entra de forma estável a partir de M3
  // (seed level 2 → próximo pass = 3), cedo no plano — Pular avança até o degrau.
  await seedLessonPlayerReady(page, "l26b", { masteryLevel: 2 });
  await seedProOnTopOfSession(page);
  await page.goto("/licao/l26b/player");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const ok = await advanceUntilSelector(page, '[data-production-assist="open"]', 80, 150_000);
  expect(ok).toBe(true);
  await expect(page.getByText(/Diga do seu jeito|Você escolhe/i).first()).toBeVisible();
  await expect(page.locator('[data-production-step="free_production"]')).toBeVisible();
}
