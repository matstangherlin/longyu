/** Cloudflare Turnstile — opcional até VITE_TURNSTILE_SITE_KEY estar definido. */

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

/** Obtém token invisible. Sem site key → null (backend pode pular verificação). */
export async function getTurnstileToken(): Promise<string | null> {
  const sitekey = turnstileSiteKey();
  if (!sitekey) return null;

  await loadTurnstileScript();
    const turnstile = window.turnstile;
    if (!turnstile) return null;

    return new Promise((resolve) => {
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-9999px";
      host.setAttribute("aria-hidden", "true");
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

      const timer = window.setTimeout(() => finish(null), 12_000);

      widgetId = turnstile.render(host, {
        sitekey,
        size: "invisible",
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

      try {
        turnstile.execute(widgetId);
      } catch {
        window.clearTimeout(timer);
        finish(null);
      }
    });
  }
