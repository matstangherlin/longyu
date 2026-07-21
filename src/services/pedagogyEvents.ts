import { isTelemetryEnabled } from "../lib/featureFlags";
import { getSupabaseClient } from "../lib/supabaseClient";
import { currentRoute, getAppVersion } from "../lib/feedback";
import { DEFAULT_ACCOUNT_ID, useStore } from "../lib/store";
import { getTelemetryConsent, PEDAGOGY_QUEUE_KEY } from "./telemetryConsent";

export {
  getTelemetryConsent,
  setTelemetryConsent,
  hasTelemetryConsentChoice,
  clearPedagogyEventQueue,
  pedagogyEventQueueSize,
} from "./telemetryConsent";

export const PEDAGOGY_EVENT_TYPES = [
  "lesson_started",
  "lesson_completed",
  "exercise_answered",
  "exercise_mistake",
  "exercise_skipped",
  "conversation_shown",
  "conversation_completed",
  "conversation_repeated",
  "conversation_error",
  "post_conversation_shown",
  "post_conversation_completed",
  "image_exercise_answered",
  "lesson_abandoned",
] as const;

export type PedagogyEventType = (typeof PEDAGOGY_EVENT_TYPES)[number];

export interface PedagogyEventInput {
  eventType: PedagogyEventType;
  lessonId?: string;
  exerciseKind?: string;
  exerciseIndex?: number;
  route?: string;
  /** Apenas metadados seguros (sem respostas livres). */
  metadata?: Record<string, string | number | boolean | null>;
}

interface QueuedPedagogyEvent extends PedagogyEventInput {
  dedupeKey: string;
  localProfileId: string;
  appVersion: string;
  createdAt: number;
  attempts: number;
}

const MAX_QUEUE = 80;
const ANON_SESSION_KEY = "longyu:pedagogy-anon-session";

/** Erros permanentes: descarta da fila. Rate limit reenfileira. */
const DISCARD_RPC_ERRORS =
  /consent_required|payload_too_large|invalid_event_type|invalid_anon_session|identity_required/i;

function readQueue(): QueuedPedagogyEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PEDAGOGY_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedPedagogyEvent[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedPedagogyEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PEDAGOGY_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* quota */
  }
}

function localProfileId(): string {
  const state = useStore.getState();
  const account = state.accounts[state.currentAccountId] ?? state.accounts[DEFAULT_ACCOUNT_ID];
  return account?.id ?? DEFAULT_ACCOUNT_ID;
}

/**
 * Resumo curto de UA para rate limit anônimo (sem IP).
 * O servidor combina com o dia UTC — rotação diária.
 */
export function pedagogyClientContext(): string {
  if (typeof navigator === "undefined") return "node";
  const ua = navigator.userAgent || "unknown";
  // Mantém família + plataforma; evita string enorme.
  const short = ua.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
  const lang = typeof navigator.language === "string" ? navigator.language.slice(0, 12) : "";
  return `${short}|${lang}`.slice(0, 120);
}

function readAnonSessionToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(ANON_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeAnonSessionToken(token: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(ANON_SESSION_KEY, token);
  } catch {
    /* ignore */
  }
}

async function ensureAnonSessionToken(): Promise<string | null> {
  const existing = readAnonSessionToken();
  if (existing) return existing;
  const client = getSupabaseClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user) return null;
  const { data, error } = await client.rpc("issue_beta_pedagogy_anon_session", {
    p_client_context: pedagogyClientContext(),
  });
  if (error || typeof data !== "string" || !data) return null;
  writeAnonSessionToken(data);
  return data;
}

/** Remove chaves sensíveis / respostas livres de metadados pedagógicos. */
export function safeMetadata(
  metadata?: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> {
  if (!metadata) return {};
  const blocked = new Set([
    "password",
    "senha",
    "token",
    "access_token",
    "refresh_token",
    "apiKey",
    "api_key",
    "service_role",
    "localStorage",
    "freeTextAnswer",
    "answerText",
    "answer",
    "typedAnswer",
    "freeText",
    "responseText",
    "userInput",
  ]);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.has(key)) continue;
    if (/password|senha|token|answer|freetext|userinput/i.test(key)) continue;
    if (value !== null && typeof value === "object") continue;
    if (typeof value === "string" && value.length > 80) {
      out[key] = value.slice(0, 80);
      continue;
    }
    out[key] = value;
  }
  return out;
}

async function callSubmitPedagogyEvent(
  item: QueuedPedagogyEvent,
  anonToken: string | null
): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "no_client" };
  const { error } = await client.rpc("submit_beta_pedagogy_event", {
    p_event_type: item.eventType,
    p_route: (item.route ?? "").slice(0, 300),
    p_lesson_id: item.lessonId ? item.lessonId.slice(0, 120) : null,
    p_exercise_kind: item.exerciseKind ? item.exerciseKind.slice(0, 80) : null,
    p_exercise_index: item.exerciseIndex ?? null,
    p_metadata: {
      ...safeMetadata(item.metadata),
      appVersion: item.appVersion || getAppVersion(),
    },
    p_local_profile_id: item.localProfileId.slice(0, 80),
    p_client_dedupe_key: item.dedupeKey.slice(0, 200),
    p_client_context: pedagogyClientContext(),
    p_anon_session_token: anonToken,
  });
  if (!error) return { ok: true, message: "" };
  return { ok: false, message: error.message ?? "" };
}

async function insertRemote(item: QueuedPedagogyEvent): Promise<boolean> {
  // Defesa em profundidade: nunca envia sem consentimento explícito.
  if (!getTelemetryConsent()) return false;
  if (!getSupabaseClient()) return false;

  let anonToken = await ensureAnonSessionToken();
  let result = await callSubmitPedagogyEvent(item, anonToken);

  // Sessão anônima expirada: renova uma vez e tenta de novo.
  if (!result.ok && /invalid_anon_session/i.test(result.message)) {
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.removeItem(ANON_SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
    anonToken = await ensureAnonSessionToken();
    result = await callSubmitPedagogyEvent(item, anonToken);
  }

  if (result.ok) return true;
  // Opt-in / payload inválido: descarta. Rate limit: reenfileira (return false).
  if (DISCARD_RPC_ERRORS.test(result.message)) return true;
  return false;
}

export async function flushPedagogyQueue(): Promise<number> {
  if (!isTelemetryEnabled() || !getTelemetryConsent()) return 0;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  const queue = readQueue();
  if (queue.length === 0) return 0;
  const remaining: QueuedPedagogyEvent[] = [];
  let sent = 0;
  for (const item of queue) {
    const ok = await insertRemote(item);
    if (!ok) remaining.push({ ...item, attempts: item.attempts + 1 });
    else sent += 1;
  }
  writeQueue(remaining.filter((item) => item.attempts < 6));
  return sent;
}

export async function trackPedagogyEvent(input: PedagogyEventInput): Promise<void> {
  // Sem escolha / recusa / flag off → não enfileira nem envia.
  if (!isTelemetryEnabled() || !getTelemetryConsent()) return;

  const event: QueuedPedagogyEvent = {
    ...input,
    route: input.route ?? currentRoute(),
    metadata: safeMetadata(input.metadata),
    localProfileId: localProfileId(),
    appVersion: getAppVersion(),
    createdAt: Date.now(),
    attempts: 0,
    dedupeKey: [
      localProfileId(),
      input.eventType,
      input.lessonId ?? "",
      input.exerciseKind ?? "",
      input.exerciseIndex ?? "",
      Math.floor(Date.now() / 15_000),
    ].join("|"),
  };

  const queue = readQueue();
  if (queue.some((item) => item.dedupeKey === event.dedupeKey)) return;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    writeQueue([...queue, event].slice(-MAX_QUEUE));
    return;
  }

  const ok = await insertRemote(event);
  if (!ok) writeQueue([...queue, event].slice(-MAX_QUEUE));
}

export interface PedagogyEventRow {
  id: string;
  event_type: PedagogyEventType;
  lesson_id: string | null;
  exercise_kind: string | null;
  exercise_index: number | null;
  route: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchAdminPedagogyEvents(limit = 1000): Promise<PedagogyEventRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("beta_pedagogy_events")
    .select("id,event_type,lesson_id,exercise_kind,exercise_index,route,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PedagogyEventRow[];
}

export interface PedagogyDailyMetricRow {
  day: string;
  event_type: string;
  lesson_id: string;
  event_count: number;
}

/** Agregados diários (RLS: só admin). Sobrevivem à retenção de 90 dias. */
export async function fetchAdminPedagogyDailyMetrics(limit = 500): Promise<PedagogyDailyMetricRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("beta_pedagogy_daily_metrics")
    .select("day,event_type,lesson_id,event_count")
    .order("day", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PedagogyDailyMetricRow[];
}

export interface PedagogyInsightBucket {
  key: string;
  count: number;
}

export function buildPedagogyInsights(events: PedagogyEventRow[]) {
  const countBy = (predicate: (event: PedagogyEventRow) => boolean, keyFn: (event: PedagogyEventRow) => string) => {
    const map = new Map<string, number>();
    for (const event of events) {
      if (!predicate(event)) continue;
      const key = keyFn(event);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  };

  return {
    mostErrors: countBy(
      (event) => event.event_type === "exercise_mistake",
      (event) => `${event.lesson_id ?? "?"} · ${event.exercise_kind ?? "?"} #${event.exercise_index ?? "?"}`
    ),
    mostSkipped: countBy(
      (event) => event.event_type === "exercise_skipped",
      (event) => `${event.lesson_id ?? "?"} · ${event.exercise_kind ?? "?"} #${event.exercise_index ?? "?"}`
    ),
    mostAbandoned: countBy(
      (event) => event.event_type === "lesson_abandoned",
      (event) => event.lesson_id ?? "?"
    ),
    imageErrors: countBy(
      (event) => event.event_type === "image_exercise_answered" && event.metadata?.correct === false,
      (event) => `${event.lesson_id ?? "?"} · ${String(event.metadata?.imageId ?? event.exercise_kind ?? "?")}`
    ),
    repeatedScenes: countBy(
      (event) => event.event_type === "conversation_completed",
      (event) => String(event.metadata?.sceneId ?? event.lesson_id ?? "?")
    ),
  };
}

export function installPedagogyOnlineFlush(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onOnline = () => {
    void flushPedagogyQueue();
  };
  window.addEventListener("online", onOnline);
  void flushPedagogyQueue();
  return () => window.removeEventListener("online", onOnline);
}
