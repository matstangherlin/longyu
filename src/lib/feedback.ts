/** Canal de feedback beta — modal + Supabase (mailto só como fallback extremo). */

export const BETA_LABEL = "Longyu Beta";

/** Email de contingência (mailto) se o backend estiver indisponível e o usuário pedir. */
export const FEEDBACK_EMAIL = "beta@longyu.app";

export const FEEDBACK_CATEGORIES = [
  { id: "erro_conteudo", label: "Erro de conteúdo" },
  { id: "traducao", label: "Tradução" },
  { id: "pinyin", label: "Pinyin" },
  { id: "audio", label: "Áudio" },
  { id: "imagem", label: "Imagem" },
  { id: "exercicio_confuso", label: "Exercício confuso" },
  { id: "erro_tecnico", label: "Erro técnico" },
  { id: "sugestao", label: "Sugestão" },
  { id: "outro", label: "Outro" },
] as const;

export type FeedbackCategoryId = (typeof FEEDBACK_CATEGORIES)[number]["id"];

export const FEEDBACK_STATUSES = [
  { id: "new", label: "Novo" },
  { id: "investigating", label: "Investigando" },
  { id: "resolved", label: "Resolvido" },
  { id: "wontfix", label: "Não faremos" },
  { id: "duplicate", label: "Duplicado" },
] as const;

export type FeedbackStatusId = (typeof FEEDBACK_STATUSES)[number]["id"];

export interface FeedbackContext {
  /** Rota / tela onde o usuário estava. */
  screen?: string;
  route?: string;
  lessonId?: string;
  exerciseKind?: string;
  exerciseIndex?: number;
  /** Pré-marca “esta atividade está com problema”. */
  activityProblem?: boolean;
}

export interface FeedbackTechnicalContext {
  appVersion: string;
  appEnv: string;
  browser: string;
  viewport: string;
  route: string;
  displayMode: string;
}

export function getAppVersion(): string {
  return String(import.meta.env.VITE_APP_VERSION ?? "0.2.0-beta.1");
}

export function currentRoute(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

function sanitizeUserAgent(ua: string): string {
  // Mantém família do browser/OS sem query strings longas.
  return ua
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function currentDisplayMode(): string {
  if (typeof window === "undefined") return "";
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";
    // iOS Safari instalado
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return "ios-standalone";
  } catch {
    /* ignore */
  }
  return "browser";
}

export function buildTechnicalContext(context?: FeedbackContext): FeedbackTechnicalContext {
  const route = context?.route ?? context?.screen ?? currentRoute();
  const viewport =
    typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "";
  const browser =
    typeof navigator !== "undefined"
      ? [
          navigator.language,
          navigator.platform,
          typeof navigator.userAgent === "string" ? sanitizeUserAgent(navigator.userAgent) : "",
        ]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 320)
      : "";
  return {
    appVersion: getAppVersion(),
    appEnv: String(import.meta.env.VITE_APP_ENV ?? (import.meta.env.DEV ? "development" : "production_beta")),
    browser,
    viewport,
    route: route.slice(0, 300),
    displayMode: currentDisplayMode(),
  };
}

/** Remove padrões sensíveis da mensagem antes do envio. */
export function sanitizeFeedbackMessage(raw: string): string {
  return String(raw ?? "")
    .replace(/(password|senha|token|apikey|api[_-]?key|service_role|bearer\s+\S+)/gi, "[redacted]")
    .trim()
    .slice(0, 4000);
}

export function looksLikeSecretLeak(message: string): boolean {
  return /(password|senha|token|apikey|api[_-]?key|service_role|localStorage|supabase)/i.test(
    message
  );
}

export function buildFeedbackMailto(context?: FeedbackContext): string {
  const tech = buildTechnicalContext(context);
  const body = [
    "O que aconteceu?",
    "",
    "",
    "Em qual tela?",
    tech.route,
    context?.lessonId ? `Lição: ${context.lessonId}` : "",
    context?.exerciseKind ? `Exercício: ${context.exerciseKind}` : "",
    "",
    "Dispositivo:",
    tech.browser,
    tech.viewport,
    `Modo: ${tech.displayMode}`,
    `Ambiente: ${tech.appEnv}`,
    `Versão: ${tech.appVersion}`,
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const params = new URLSearchParams({
    subject: "Feedback Longyu Beta",
    body,
  });

  return `mailto:${FEEDBACK_EMAIL}?${params.toString()}`;
}

export function openFeedbackMailto(context?: FeedbackContext): void {
  window.location.href = buildFeedbackMailto(context);
}

/**
 * Dica de UX para mostrar atalho do painel. A autorização real é
 * `is_beta_admin()` / `beta_admins(user_id)` no servidor.
 * Configure `VITE_ADMIN_EMAILS` no deploy se quiser o atalho na UI.
 */
export function adminEmailAllowlist(): string[] {
  return [
    ...new Set(
      String(import.meta.env.VITE_ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailAllowlist().includes(email.trim().toLowerCase());
}
