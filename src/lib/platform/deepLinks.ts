/**
 * RC2.2.10 — deep link foundation: URL nativa → rota interna do Longyu.
 *
 * Ponto canônico e ÚNICO. Só aceita:
 * - o esquema do app `longyu.noba.com://<rota>` (intent-filter no AndroidManifest;
 *   igual ao package do Play desde o RC2.2.16);
 * - https em hosts Longyu aprovados (base para App Links futuros).
 * E só devolve rotas da allowlist abaixo. Qualquer outra coisa → null (o app
 * fica onde está). Nunca navega para URI arbitrária, nunca carrega origem
 * externa dentro da WebView.
 */

export const LONGYU_APP_SCHEME = "longyu.noba.com";

/** Hosts web do Longyu (produção atual + domínio planejado em seo.ts). */
export const LONGYU_WEB_HOSTS: readonly string[] = [
  "singular-meringue-7838cd.netlify.app",
  "longyu.com.br",
  "www.longyu.com.br",
];

/** Prefixos de rota que um link externo pode abrir. Sem admin/qa/dev/auth. */
export const DEEP_LINK_ROUTE_PREFIXES: readonly string[] = [
  "/jornada",
  "/revisao",
  "/cultura",
  "/hanzi/atlas",
  "/hanzi",
  "/licao",
  "/treino",
  "/praticar",
  "/missoes",
  "/conquistas",
  "/perfil",
  "/ligas",
  "/config",
  "/sobre",
];

const QUERY_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,23}$/;
const MAX_QUERY_VALUE = 64;
const SAFE_SEGMENT = /^[\p{L}\p{N}_.~-]+$/u;

function isApprovedPath(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.includes("//") || pathname.includes("..")) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) return false;
  return DEEP_LINK_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function safeQuery(params: URLSearchParams): string {
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (QUERY_KEY.test(key) && value.length <= MAX_QUERY_VALUE && !/[<>"'`\\]/.test(value)) kept.append(key, value);
  });
  const text = kept.toString();
  return text ? `?${text}` : "";
}

/**
 * @returns rota interna (`/revisao`, `/hanzi/atlas?char=你`) ou null.
 */
export function resolveDeepLink(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  let pathname: string;
  if (url.protocol === `${LONGYU_APP_SCHEME}:`) {
    // longyu.noba.com://hanzi/atlas?char=你 → host "hanzi" + path "/atlas"
    pathname = `/${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } else if (url.protocol === "https:" && LONGYU_WEB_HOSTS.includes(url.hostname) && !url.port) {
    pathname = url.pathname;
  } else {
    return null;
  }
  if (url.username || url.password) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname).replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
  if (!isApprovedPath(decoded)) return null;
  return `${decoded}${safeQuery(url.searchParams)}`;
}
