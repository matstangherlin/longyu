/** Canal de feedback beta — sem backend; abre o cliente de email do usuário. */
import { buildInfoForReports, formatAppVersionLabel, shortCommitSha } from "./appMeta";

export const BETA_LABEL = "Longyu Beta";

/** Email do beta privado — configure VITE_FEEDBACK_EMAIL no deploy Netlify se mudar. */
export const FEEDBACK_EMAIL = "beta@longyu.app";

export interface FeedbackContext {
  /** Tela ou rota onde o usuário estava ao enviar feedback. */
  screen?: string;
}

function deviceSummary(): string {
  if (typeof navigator === "undefined") return "";
  const viewport =
    typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}px` : "";
  return [navigator.platform, navigator.language, viewport].filter(Boolean).join(" · ");
}

export function buildFeedbackMailto(context?: FeedbackContext): string {
  const screen =
    context?.screen ??
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "");

  const meta = buildInfoForReports();
  const body = [
    "O que aconteceu?",
    "",
    "",
    "Em qual tela?",
    screen,
    "",
    "Versão do app:",
    formatAppVersionLabel(),
    `Build ${shortCommitSha(meta.build_sha)} · ${meta.release_channel}`,
    "",
    "Seu dispositivo:",
    deviceSummary(),
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    "",
    "O que você esperava?",
    "",
    "",
  ].join("\n");

  const params = new URLSearchParams({
    subject: "Feedback Longyu Beta",
    body,
  });

  return `mailto:${FEEDBACK_EMAIL}?${params.toString()}`;
}

export function openFeedbackMailto(context?: FeedbackContext): void {
  window.location.href = buildFeedbackMailto(context);
}
