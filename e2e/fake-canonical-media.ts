import type { Page } from "@playwright/test";

/**
 * RC2.2.28+ — conteúdo fixo toca pelo asset canônico (HTMLAudioElement no Web)
 * e o TTS só entra como fallback quando o asset falha. Os fakes de
 * speechSynthesis sozinhos não controlam mais o "Ouça": este fake controla o
 * player Web do asset do mesmo jeito.
 *
 * - "start":    o asset anuncia início e termina (playing → ended);
 * - "end-only": termina sem anunciar início (sem prova de reprodução);
 * - "silent":   play() resolve e nada mais acontece (ouvido, sem ACK);
 * - "fail":     play() rejeita (asset indisponível → fallback TTS).
 *
 * Cada play() registra o src em window.__mediaPlays.
 */
export type FakeMediaMode = "start" | "end-only" | "silent" | "fail";

export async function fakeCanonicalMedia(page: Page, mode: FakeMediaMode) {
  await page.addInitScript((m: string) => {
    const plays: string[] = [];
    (window as unknown as { __mediaPlays: string[] }).__mediaPlays = plays;
    const fire = (el: HTMLMediaElement, type: string, ms: number) => window.setTimeout(() => el.dispatchEvent(new Event(type)), ms);
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      plays.push(this.currentSrc || this.src);
      if (m === "fail") return Promise.reject(new DOMException("asset blocked", "NotAllowedError"));
      if (m === "start") {
        fire(this, "playing", 10);
        fire(this, "ended", 60);
      } else if (m === "end-only") {
        fire(this, "ended", 60);
      }
      return Promise.resolve();
    };
  }, mode);
}
