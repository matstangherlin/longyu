import type { Page } from "@playwright/test";

/**
 * RC2.2.17B · PART CM/CN — heurísticas visuais medidas no DOM real.
 *
 * "Superfície grande" = caixa com fundo opaco E borda ou sombra, ≥ 85% da
 * largura do passo e ≥ 140px de altura. "CTA principal" = botão de cor
 * saturada (accent/good), opaco, visível. Opções brancas não contam.
 */
export interface GuidedScreen {
  shell: string | null;
  stage: string | null;
  kind: string | null;
  index: number;
  legacyCard: boolean;
  largeSurfaces: number;
  nestedCardDepth: number;
  primaryInDock: number;
  primaryInline: number;
  dockTop: number | null;
  dockBottom: number | null;
  viewportHeight: number;
  headerTop: number | null;
  metadataPills: number;
  mascots: number;
  lessonTitleVisible: boolean;
  scrollOverflow: number;
  stepWidth: number;
}

export async function measureGuidedScreen(page: Page): Promise<GuidedScreen> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
    };
    const rgba = (value: string) => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return { r: 0, g: 0, b: 0, a: 0 };
      const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).filter(Boolean);
      return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
    };
    const opaque = (el: Element) => rgba(getComputedStyle(el).backgroundColor).a >= 0.5;
    const framed = (el: Element) => {
      const cs = getComputedStyle(el);
      return cs.boxShadow !== "none" || Number.parseFloat(cs.borderTopWidth) > 0 || Number.parseFloat(cs.borderLeftWidth) > 0;
    };
    const saturated = (el: Element) => {
      const c = rgba(getComputedStyle(el).backgroundColor);
      return c.a >= 0.85 && Math.max(Math.abs(c.r - c.g), Math.abs(c.g - c.b), Math.abs(c.r - c.b)) > 60;
    };
    const shellEl = document.querySelector("[data-guided-lesson-shell]");
    const body = document.querySelector("[data-lesson-task-body]") as HTMLElement | null;
    const dock = document.querySelector("[data-guided-action-dock]") as HTMLElement | null;
    const header = document.querySelector("[data-guided-header]") as HTMLElement | null;
    const scroller = document.querySelector("[data-lesson-scroll-region]") as HTMLElement | null;
    const scope = body ?? (document.querySelector("[data-guided-prepare]") as HTMLElement | null);
    const bodyRect = scope?.getBoundingClientRect();
    const bodyCs = body ? getComputedStyle(body) : null;
    const legacyCard = Boolean(body && bodyCs && opaque(body) && (bodyCs.boxShadow !== "none" || Number.parseFloat(bodyCs.borderTopWidth) > 0));
    let largeSurfaces = 0;
    let nestedCardDepth = 0;
    if (scope && bodyRect) {
      const cards = [...scope.querySelectorAll("div, section, article")].filter((el) => visible(el) && opaque(el) && framed(el));
      for (const el of cards) {
        const r = el.getBoundingClientRect();
        if (r.width >= bodyRect.width * 0.85 && r.height >= 140) largeSurfaces += 1;
        let depth = 1;
        let parent = el.parentElement;
        while (parent && parent !== scope) {
          if (cards.includes(parent)) depth += 1;
          parent = parent.parentElement;
        }
        nestedCardDepth = Math.max(nestedCardDepth, depth);
      }
    }
    const buttons = [...document.querySelectorAll("button")].filter(visible);
    const primaryInDock = dock ? buttons.filter((b) => dock.contains(b) && saturated(b)).length : 0;
    const primaryInline = scope
      ? buttons.filter((b) => scope.contains(b) && saturated(b) && b.getBoundingClientRect().width >= (bodyRect?.width ?? 1) * 0.8).length
      : 0;
    const dockButtons = dock ? buttons.filter((b) => dock.contains(b)) : [];
    const dockTop = dockButtons.length ? Math.min(...dockButtons.map((b) => b.getBoundingClientRect().top)) : null;
    const dockBottom = dockButtons.length ? Math.max(...dockButtons.map((b) => b.getBoundingClientRect().bottom)) : null;
    const pills = scope
      ? [...scope.querySelectorAll("[data-step-eyebrow], [data-lesson-kind-label], .rounded-full.uppercase")]
          // Conteúdo (ex.: "som"/"sentido" em cada peça do hànzì) não é metadado.
          .filter((el) => visible(el) && !el.closest("[data-content-tag]")).length
      : 0;
    const mascots = [...document.querySelectorAll("[data-testid='mascot-frame']")].filter(visible).length;
    const titleEl = document.querySelector("[data-guided-lesson-title]");
    const indexAttr = document.querySelector("[data-current-step-index]")?.getAttribute("data-current-step-index");
    return {
      shell: shellEl?.getAttribute("data-guided-lesson-shell") ?? null,
      stage: shellEl?.getAttribute("data-presentation-stage") ?? null,
      kind: document.querySelector("[data-current-step-kind]")?.getAttribute("data-current-step-kind") ?? null,
      index: indexAttr == null ? -1 : Number(indexAttr),
      legacyCard,
      largeSurfaces,
      nestedCardDepth,
      primaryInDock,
      primaryInline,
      dockTop,
      dockBottom,
      viewportHeight: window.innerHeight,
      headerTop: header ? header.getBoundingClientRect().top : null,
      metadataPills: pills,
      mascots,
      lessonTitleVisible: Boolean(titleEl && visible(titleEl)),
      scrollOverflow: scroller ? scroller.scrollHeight - scroller.clientHeight : 0,
      stepWidth: bodyRect?.width ?? 0,
    };
  });
}

/** speechSynthesis controlado: "ok" dispara onstart/onend; "fail" dispara onerror. */
export async function installFakeSpeech(page: Page, mode: "ok" | "fail") {
  await page.addInitScript((behavior: string) => {
    class FakeUtterance {
      text = "";
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [{ lang: "zh-CN", name: "Fake zh", voiceURI: "fake-zh", localService: true, default: true }],
        cancel() {},
        pause() {},
        resume() {},
        addEventListener() {},
        removeEventListener() {},
        speak(u: FakeUtterance) {
          if (behavior === "fail") {
            window.setTimeout(() => u.onerror?.({ error: "synthesis-failed" }), 20);
            return;
          }
          window.setTimeout(() => u.onstart?.(), 10);
          window.setTimeout(() => u.onend?.(), 60);
        },
      },
    });
    (window as Window & { SpeechSynthesisUtterance?: typeof FakeUtterance }).SpeechSynthesisUtterance = FakeUtterance;
  }, mode);
}

export async function lessonQaSteps(page: Page): Promise<Array<{ index: number; kind: string; sceneId: string | null }>> {
  await page.waitForFunction(() => Boolean((window as Window & { __longyuLessonQa?: unknown }).__longyuLessonQa), null, { timeout: 20_000 });
  return page.evaluate(() => {
    const qa = (window as Window & { __longyuLessonQa?: { steps: () => Array<{ index: number; kind: string; sceneId: string | null }> } }).__longyuLessonQa;
    return qa?.steps() ?? [];
  });
}

export async function lessonJumpTo(page: Page, index: number) {
  await page.evaluate((i) => {
    (window as Window & { __longyuLessonQa?: { jumpTo: (n: number) => void } }).__longyuLessonQa?.jumpTo(i);
  }, index);
  await page.locator(`[data-current-step-index="${index}"]`).first().waitFor({ timeout: 10_000 });
}

export async function enableGuidedPrepare(page: Page) {
  await page.addInitScript(() => localStorage.setItem("longyu:e2e-prepare", "on"));
}

export async function forceLegacyShell(page: Page) {
  await page.addInitScript(() => localStorage.setItem("longyu:guided-shell", "legacy"));
}
