import { LONGYU_WEB_HOSTS, resolveDeepLink } from "./deepLinks";

/**
 * RC2.2.10 — o que fazer com um link tocado dentro do app nativo.
 *
 * - internal: rota do próprio Longyu → navegação interna (router);
 * - external: https de fora → navegador do sistema (Capacitor Browser),
 *   NUNCA dentro da WebView principal como se fosse Longyu;
 * - system: mailto:/tel: → app do sistema (a WebView do Capacitor já delega);
 * - blocked: javascript:, data:, file:, intent:, http:// e afins.
 */
export type LinkDecision =
  | { kind: "internal"; to: string }
  | { kind: "external"; url: string }
  | { kind: "system" }
  | { kind: "blocked" };

export function classifyLink(href: string, appOrigin: string): LinkDecision {
  let url: URL;
  try {
    url = new URL(href, appOrigin);
  } catch {
    return { kind: "blocked" };
  }
  if (url.origin === appOrigin) {
    return { kind: "internal", to: `${url.pathname}${url.search}${url.hash}` };
  }
  if (url.protocol === "mailto:" || url.protocol === "tel:") return { kind: "system" };
  if (url.protocol !== "https:" || url.username || url.password) return { kind: "blocked" };
  if (LONGYU_WEB_HOSTS.includes(url.hostname)) {
    // Link para o site do Longyu: se for rota aprovada, abre DENTRO do app.
    const route = resolveDeepLink(url.href);
    if (route) return { kind: "internal", to: route };
  }
  return { kind: "external", url: url.href };
}
