/**
 * RC2.2.21 — buffer técnico em MEMÓRIA para o diagnóstico mobile.
 *
 * Guarda no máximo TECH_EVENT_LIMIT eventos (os mais antigos saem), só em
 * builds de QA (`deviceQaEnabled`), e nunca é persistido: fechar o app zera.
 * Cada evento tem nome, horário e detalhes técnicos curtos. Qualquer valor com
 * cara de e-mail, código de 6 dígitos ou token é redigido; transcrição, texto
 * do aluno, gravação e senha nunca entram.
 */
import { deviceQaEnabled, looksLikePiiOrSecret } from "./deviceQa";

export const TECH_EVENT_LIMIT = 150;

export const TECH_EVENT_NAMES = [
  "route_changed",
  // RC2.3.8 — auth (safe metadata only: provider, stage, safe code — never tokens/codes/e-mail)
  "auth_provider_started",
  "auth_provider_cancelled",
  "auth_callback_failed",
  "auth_callback_duplicate",
  "auth_success",
  "progress_claim_started",
  "progress_claim_completed",
  "app_paused",
  "app_resumed",
  "keyboard_opened",
  "keyboard_closed",
  "network_online",
  "network_offline",
  "audio_requested",
  "audio_started",
  "audio_ended",
  "audio_failed",
  // RC2.2.28 — pré-native forensics (Part 23).
  "audio_request_created",
  "audio_record_enter",
  "audio_gesture_recorded",
  "audio_owner_claimed",
  "audio_engine_selected",
  "audio_native_call_enter",
  "audio_native_call_return",
  "user_confirmed_audio_without_native_ack",
  "guided_try_audio_deadline",
  "guided_try_audio_superseded",
  "audio_owner",
  "recording_started",
  "recording_stopped",
  "recording_file_ready",
  "recording_failed",
  "playback_requested",
  "playback_prepared",
  "playback_started",
  "playback_completed",
  "playback_failed",
  "speech_requested",
  "speech_started",
  "speech_result",
  "speech_failed",
  "recognition_create",
  "recognition_ready",
  "recognition_beginning_of_speech",
  "recognition_rms",
  "recognition_end_of_speech",
  "recognition_result",
  "recognition_error",
  "recognition_destroy",
  "step_continue",
  "step_advanced",
  "step_stalled",
  "modal_open",
  "modal_close",
  "back_pressed",
  "js_error",
  "unhandled_rejection",
  // RC2.2.22 — carga da sessão (orçamento de popups) e marcações do QA humano.
  "coachmark_shown",
  "guidance_delivery",
  "unlock_reveal_shown",
  "ceremony_shown",
  "permission_prompted",
  "perceived_speed",
  "issue_reported",
  // RC2.3.13E — Journey ↔ Culture progression shell (safe metadata only).
  "progression_switch_journey",
  "progression_switch_culture",
  // RC2.3.13G — beta learner-health (safe metadata only).
  "progression_mode_changed",
  "culture_first_switch",
  "session_started",
  "first_lesson_started",
  "first_lesson_completed",
  "first_mandarin_action",
  "practice_first_open",
  "mastery_first_open",
  "culture_node_started",
  "culture_node_completed",
  "micro_feedback_shown",
  "micro_feedback_answered",
  "micro_feedback_dismissed",
  "problem_report_opened",
  "problem_report_submitted",
  "culture_node_open",
  "culture_node_complete",
  "culture_bridge_open",
  "culture_path_open",
  "culture_atlas_open",
  "culture_depth_expand",
  "culture_decision_submit",
  // RC2.3.13H — dynamic AULA presentation (safe metadata only; no per-char reveals).
  "dynamic_aula_started",
  "dynamic_aula_completed",
  "visual_example_viewed",
] as const;
export type TechEventName = (typeof TECH_EVENT_NAMES)[number];

export type TechEventDetail = Record<string, string | number | boolean | null | undefined>;

export interface TechEvent {
  at: number;
  name: TechEventName;
  route: string;
  detail?: Record<string, string | number | boolean | null>;
}

const buffer: TechEvent[] = [];

function currentRoute(): string {
  try {
    return typeof location !== "undefined" ? location.pathname : "";
  } catch {
    return "";
  }
}

/** Só metadados curtos; PII/segredo vira "[redigido]". */
export function sanitizeTechDetail(detail: TechEventDetail | undefined): Record<string, string | number | boolean | null> | undefined {
  if (!detail) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail).slice(0, 12)) {
    if (value === undefined) continue;
    if (/transcript|text|email|password|senha|otp|token|name|nome/i.test(key)) continue;
    if (typeof value === "string") out[key] = looksLikePiiOrSecret(value) ? "[redigido]" : value.slice(0, 80);
    else out[key] = value;
  }
  return out;
}

export function recordTechEvent(name: TechEventName, detail?: TechEventDetail): void {
  if (!deviceQaEnabled()) return;
  buffer.push({ at: Date.now(), name, route: currentRoute(), detail: sanitizeTechDetail(detail) });
  if (buffer.length > TECH_EVENT_LIMIT) buffer.splice(0, buffer.length - TECH_EVENT_LIMIT);
}

export function techEventsSnapshot(): readonly TechEvent[] {
  return buffer.slice();
}

export function clearTechEventsForTests(): void {
  buffer.length = 0;
}

/** Classe do erro (nunca a mensagem inteira: pode carregar dado do usuário). */
export function errorClassOf(value: unknown): string {
  if (value instanceof Error) return value.name || "Error";
  if (value && typeof value === "object" && "name" in value && typeof (value as { name?: unknown }).name === "string") return String((value as { name: string }).name).slice(0, 40);
  return typeof value;
}

/**
 * Captura global (QA): erros JS, promessas rejeitadas, rede, visibilidade e
 * teclado (pela visualViewport). Devolve o "desinstalar"; chamar de novo
 * sem desinstalar não duplica ouvintes.
 */
let installed: (() => void) | null = null;

export function installTechCapture(): () => void {
  if (installed) return installed;
  if (typeof window === "undefined" || !deviceQaEnabled()) return () => undefined;
  const onError = (event: ErrorEvent) => recordTechEvent("js_error", { errorClass: errorClassOf(event.error ?? event), source: String(event.filename ?? "").split("/").pop() ?? "" });
  const onRejection = (event: PromiseRejectionEvent) => recordTechEvent("unhandled_rejection", { errorClass: errorClassOf(event.reason) });
  const onOnline = () => recordTechEvent("network_online");
  const onOffline = () => recordTechEvent("network_offline");
  const onVisibility = () => recordTechEvent(document.visibilityState === "hidden" ? "app_paused" : "app_resumed", { via: "visibility" });
  const viewport = window.visualViewport;
  let keyboardOpen = false;
  const onViewport = () => {
    if (!viewport) return;
    const covered = window.innerHeight - viewport.height;
    const open = covered > 150;
    if (open !== keyboardOpen) {
      keyboardOpen = open;
      recordTechEvent(open ? "keyboard_opened" : "keyboard_closed", { coveredPx: Math.round(covered) });
    }
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisibility);
  viewport?.addEventListener("resize", onViewport);
  installed = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisibility);
    viewport?.removeEventListener("resize", onViewport);
    installed = null;
  };
  return installed;
}

export function techCaptureInstalled(): boolean {
  return installed != null;
}
