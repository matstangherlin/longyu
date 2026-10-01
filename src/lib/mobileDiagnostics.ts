/**
 * RC2.2.21 — diagnóstico mobile ("Copiar diagnóstico" em /qa/device).
 *
 * Junta, num JSON curto, o que o QA precisa para reproduzir um bug no
 * aparelho: build, Android/WebView, viewport e safe areas, teclado, rede,
 * ciclo de vida, rota, dono do áudio, TTS, microfone, reconhecimento, estado
 * da gravação/reprodução e os últimos eventos técnicos.
 *
 * Nunca entra: e-mail, nome real, senha, OTP, access/refresh token, texto
 * privado, gravação, transcrição. A sanitização é a última etapa e vale para
 * QUALQUER campo (chave proibida some; valor com cara de PII vira "[redigido]").
 * Funções puras: quem coleta do `window` é a página.
 */
import { looksLikePiiOrSecret } from "./deviceQa";
import type { TechEvent } from "./techEvents";

export const MOBILE_DIAGNOSTIC_SCHEMA = "longyu-mobile-diagnostic/1";

/** Chaves que nunca saem do aparelho, em nenhum nível do JSON. */
export const MOBILE_DIAGNOSTIC_FORBIDDEN_KEY = /email|password|senha|otp|token|transcript|transcri|recording(Data|Blob|Base64)|audioData|displayName|fullName|realName|^name$|^nome$|text$/i;

export interface MobileDiagnosticInput {
  build: {
    buildSha: string | null;
    versionName: string | null;
    versionCode: number | null;
    packageName: string | null;
    runtime: "native" | "web";
  };
  device: {
    androidVersion: string | null;
    webViewVersion: string | null;
    viewport: { width: number; height: number } | null;
    visualViewport: { width: number; height: number } | null;
    devicePixelRatio: number | null;
    safeAreaTop: number | null;
    safeAreaBottom: number | null;
  };
  state: {
    keyboard: "open" | "closed" | "unknown";
    network: "online" | "offline" | "unknown";
    lifecycle: "visible" | "hidden" | "unknown";
    route: string;
    lastNavigation: string | null;
  };
  audio: {
    owner: string;
    engine: string;
    ttsAvailable: boolean | null;
    ttsReason: string | null;
    microphone: string;
    speechService: string;
    zhCnSupport: string;
    recognitionCapability: string;
    recognizerKind: string | null;
    recordingState: string | null;
    playbackState: string | null;
    outputRoute: string | null;
    mediaVolume: string | null;
  };
  events: readonly TechEvent[];
}

/** Android WebView: "Chrome/124.0.6367.82 Mobile" + "; wv)" no user agent. */
export function webViewVersionFromUserAgent(userAgent: string | null | undefined): string | null {
  const ua = String(userAgent ?? "");
  const match = /Chrome\/(\d+(?:\.\d+){0,3})/.exec(ua);
  if (!match) return null;
  return /;\s*wv\)/.test(ua) ? `WebView ${match[1]}` : `Chrome ${match[1]}`;
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Sanitiza QUALQUER árvore: chave proibida sai; string com PII é redigida. */
export function sanitizeMobileDiagnostic(value: unknown, depth = 0): Json {
  if (depth > 6) return null;
  if (value == null) return null;
  if (typeof value === "string") return looksLikePiiOrSecret(value) ? "[redigido]" : value.slice(0, 120);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeMobileDiagnostic(item, depth + 1));
  if (typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (MOBILE_DIAGNOSTIC_FORBIDDEN_KEY.test(key)) continue;
      if (item === undefined || typeof item === "function") continue;
      out[key] = sanitizeMobileDiagnostic(item, depth + 1);
    }
    return out;
  }
  return null;
}

export function buildMobileDiagnostic(input: MobileDiagnosticInput, exportedAt = new Date().toISOString()): Json {
  return sanitizeMobileDiagnostic({
    schema: MOBILE_DIAGNOSTIC_SCHEMA,
    exportedAt,
    // Diagnóstico ≠ prova física: nada aqui marca PASS.
    physicalPass: false,
    build: input.build,
    device: input.device,
    state: input.state,
    audio: input.audio,
    // "event" (não "name"): a chave `name` é proibida pelo sanitizador.
    events: input.events.map((event) => ({ at: event.at, event: event.name, route: event.route, detail: event.detail ?? null })),
  });
}

/** Último valor de estado de gravação/reprodução visto no buffer técnico. */
export function lastTechEventState(events: readonly TechEvent[], prefix: "recording_" | "playback_"): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.name.startsWith(prefix)) return event.name.slice(prefix.length);
  }
  return null;
}

/** Rota da última navegação registrada (route_changed). */
export function lastNavigation(events: readonly TechEvent[]): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.name === "route_changed") {
      const from = event.detail?.from;
      return `${typeof from === "string" && from ? from : "?"} → ${event.route}`;
    }
  }
  return null;
}
