/** Cloudflare Turnstile — site key via VITE_TURNSTILE_SITE_KEY. */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        options: {
          sitekey: string;
          size?: "normal" | "flexible" | "compact";
          theme?: "auto" | "light" | "dark";
          appearance?: "always" | "execute" | "interaction-only";
          execution?: "render" | "execute";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      execute: (widgetId: string | HTMLElement) => void;
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

/**
 * Obtém token Turnstile (Managed).
 * size só aceita normal|flexible|compact — "invisible" foi removido da API client.
 * appearance interaction-only: humanos limpos quase não veem o widget; bots veem o desafio.
 */
export async function getTurnstileToken(): Promise<string | null> {
  const sitekey = turnstileSiteKey();
  if (!sitekey) return null;

  try {
    await loadTurnstileScript();
  } catch {
    return null;
  }

  const turnstile = window.turnstile;
  if (!turnstile) return null;

  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.setAttribute("data-longyu-turnstile", "1");
    host.style.position = "fixed";
    host.style.right = "12px";
    host.style.bottom = "12px";
    host.style.zIndex = "9999";
    document.body.appendChild(host);

    let settled = false;
    let widgetId = "";

    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        if (widgetId) turnstile.remove(widgetId);
      } catch {
        /* ignore */
      }
      host.remove();
      resolve(token);
    };

    const timer = window.setTimeout(() => finish(null), 90_000);

    try {
      widgetId = turnstile.render(host, {
        sitekey,
        size: "normal",
        theme: "auto",
        appearance: "interaction-only",
        execution: "execute",
        callback: (token) => finish(token || null),
        "error-callback": () => finish(null),
        "expired-callback": () => finish(null),
      });
      turnstile.execute(widgetId);
    } catch {
      finish(null);
    }
  });
}
