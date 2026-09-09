import { appendFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const hookedPages = new WeakSet<object>();

export function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {}
) {
  // #region agent log
  try {
    appendFileSync(
      "/opt/cursor/logs/debug.log",
      JSON.stringify({ hypothesisId, location, message, data, timestamp: Date.now() }) + "\n"
    );
  } catch {
    /* preview/CI without debug mount */
  }
  // #endregion
}

export function hookPageConsole(page: Page) {
  if (hookedPages.has(page)) return;
  hookedPages.add(page);
  page.on("console", (msg) => {
    const text = msg.text();
    if (!text.includes("[agent-dbg]")) return;
    const idx = text.indexOf("{");
    if (idx < 0) return;
    try {
      appendFileSync("/opt/cursor/logs/debug.log", `${text.slice(idx).trim()}\n`);
    } catch {
      /* ignore */
    }
  });
}

export async function snapshotSkipState(page: Page) {
  return page
    .evaluate(() => {
      const buttons = [...document.querySelectorAll("button")].flatMap((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const vis = r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        const name = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
        if (!vis || !/pular|skip|continuar|continue|falar|speak|entendi|got it|ouvir|listen/i.test(name)) return [];
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return [
          {
            name,
            disabled: el.disabled,
            occluded: Boolean(top && top !== el && !el.contains(top)),
            top: top ? (top.textContent || top.tagName).replace(/\s+/g, " ").trim().slice(0, 32) : "",
          },
        ];
      });
      const body = document.body.innerText.slice(0, 500);
      const w = window as Window & {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
        __agentDbg?: unknown[];
      };
      return {
        skipCard: /exerc[ií]cio pulado|skipped exercise/i.test(body),
        listenImitate: /ouça e imite|listen and imitate/i.test(body),
        voiceUnavail: /voz não disponível|voice isn't available/i.test(body),
        kind: document.querySelector("[data-current-step-kind]")?.getAttribute("data-current-step-kind"),
        idx: document.querySelector("[data-current-step-index]")?.getAttribute("data-current-step-index"),
        pass: document.querySelector("[data-lesson-player-frame]")?.getAttribute("data-mastery-pass"),
        brokenErrors: document.querySelector("[data-broken-errors]")?.getAttribute("data-broken-errors"),
        brokenKind: document.querySelector("[data-broken-kind]")?.getAttribute("data-broken-kind"),
        speech: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
        buttons,
        agentDbg: w.__agentDbg?.slice(-4),
      };
    })
    .catch(() => null);
}
