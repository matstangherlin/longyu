/** Cloudflare Turnstile — site key via VITE_TURNSTILE_SITE_KEY. */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        options: {
          sitekey: string;
          size?: "normal" | "flexible" | "compact" | "invisible";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      execute: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function turnstileSiteKey(): string | null {
  const key = String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();
  return key || null;
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile load failed")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(script);
  });
}

function renderToken(
  turnstile: NonNullable<Window["turnstile"]>,
  sitekey: string,
  size: "invisible" | "normal"
): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    if (size === "invisible") {
      host.style.position = "fixed";
      host.style.left = "-9999px";
      host.setAttribute("aria-hidden", "true");
    } else {
      // Fallback visível: canto inferior, sem atrapalhar o formulário.
      host.style.position = "fixed";
      host.style.right = "12px";
      host.style.bottom = "12px";
      host.style.zIndex = "9999";
    }
    document.body.appendChild(host);

    let settled = false;
    let widgetId = "";
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      try {
        if (widgetId) turnstile.remove(widgetId);
      } catch {
        // ignore
      }
      host.remove();
      resolve(token);
    };

    // Invisible: falha rápido e cai no widget normal. Visível: dá tempo ao humano.
    const timer = window.setTimeout(() => finish(null), size === "invisible" ? 3_000 : 90_000);

    widgetId = turnstile.render(host, {
      sitekey,
      size,
      callback: (token) => {
        window.clearTimeout(timer);
        finish(token || null);
      },
      "error-callback": () => {
        window.clearTimeout(timer);
        finish(null);
      },
      "expired-callback": () => {
        window.clearTimeout(timer);
        finish(null);
      },
    });

    if (size === "invisible") {
      try {
        turnstile.execute(widgetId);
      } catch {
        window.clearTimeout(timer);
        finish(null);
      }
    }
  });
}

/**
 * Obtém token Turnstile.
 * 1) Invisible (padrão)
 * 2) Se falhar, widget normal visível (usuário pode completar o desafio)
 * Sem site key → null (backend pode pular verificação).
 */
export async function getTurnstileToken(): Promise<string | null> {
  const sitekey = turnstileSiteKey();
  if (!sitekey) return null;

  await loadTurnstileScript();
  const turnstile = window.turnstile;
  if (!turnstile) return null;

  const invisible = await renderToken(turnstile, sitekey, "invisible");
  if (invisible) return invisible;

  return renderToken(turnstile, sitekey, "normal");
}
