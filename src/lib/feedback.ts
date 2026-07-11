/** Canal de feedback beta — formulário interno com fallback mailto. */
import { APP_VERSION, BUILD_SHA } from "./appMeta";

export const BETA_LABEL = "Longyu Beta";

/** Email do beta privado — fallback quando Supabase indisponível. */
export const FEEDBACK_EMAIL = "beta@longyu.app";

export const FEEDBACK_CATEGORIES = [
  { id: "bug", label: "Bug / algo quebrou" },
  { id: "conteúdo incorreto", label: "Conteúdo incorreto" },
  { id: "dificuldade pedagógica", label: "Dificuldade pedagógica" },
  { id: "design", label: "Design / usabilidade" },
  { id: "sugestão", label: "Sugestão" },
  { id: "conta/sync", label: "Conta / sincronização" },
  { id: "pagamento", label: "Pagamento / Pro" },
  { id: "outro", label: "Outro" },
] as const;

export const FEEDBACK_SEVERITIES = [
  { id: "baixa", label: "Baixa" },
  { id: "média", label: "Média" },
  { id: "alta", label: "Alta" },
  { id: "bloqueadora", label: "Bloqueadora" },
] as const;

export const FEEDBACK_STATUSES = [
  { id: "novo", label: "Novo" },
  { id: "analisando", label: "Analisando" },
  { id: "reproduzido", label: "Reproduzido" },
  { id: "corrigido", label: "Corrigido" },
  { id: "não reproduzido", label: "Não reproduzido" },
  { id: "encerrado", label: "Encerrado" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["id"];
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number]["id"];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]["id"];

export interface FeedbackContext {
  /** Rota ou tela onde o usuário estava. */
  screen?: string;
  lessonId?: string;
  stepId?: string;
}

export interface FeedbackTechnicalMeta {
  route: string;
  lessonId?: string;
  stepId?: string;
  appVersion: string;
  buildSha: string;
  browser: string;
  platform: string;
  viewport: string;
}

export interface FeedbackSubmitInput {
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  message: string;
  expectedBehavior?: string;
  includeTechnical: boolean;
  context?: FeedbackContext;
}

function currentRoute(context?: FeedbackContext): string {
  if (context?.screen) return context.screen;
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function collectFeedbackTechnicalMeta(context?: FeedbackContext): FeedbackTechnicalMeta {
  const route = currentRoute(context);
  if (typeof navigator === "undefined") {
    return {
      route,
      lessonId: context?.lessonId,
      stepId: context?.stepId,
      appVersion: APP_VERSION,
      buildSha: BUILD_SHA,
      browser: "",
      platform: "",
      viewport: "",
    };
  }

  const viewport =
    typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}px` : "";

  return {
    route,
    lessonId: context?.lessonId,
    stepId: context?.stepId,
    appVersion: APP_VERSION,
    buildSha: BUILD_SHA,
    browser: navigator.userAgent.slice(0, 512),
    platform: navigator.platform,
    viewport,
  };
}

/** Código curto exibido ao usuário após envio (ex.: Relato #AB12CD). */
export function formatFeedbackReportCode(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function buildFeedbackMailto(context?: FeedbackContext): string {
  const meta = collectFeedbackTechnicalMeta(context);

  const body = [
    "O que aconteceu?",
    "",
    "",
    "Em qual tela?",
    meta.route,
    meta.lessonId ? `Lição: ${meta.lessonId}` : "",
    meta.stepId ? `Passo: ${meta.stepId}` : "",
    "",
    "Versão / build:",
    `${meta.appVersion} · ${meta.buildSha}`,
    "",
    "Seu dispositivo:",
    [meta.platform, meta.viewport].filter(Boolean).join(" · "),
    meta.browser,
    "",
    "O que você esperava?",
    "",
    "",
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
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
