import { getSupabaseClient } from "../lib/supabaseClient";
import {
  buildTechnicalContext,
  looksLikeSecretLeak,
  sanitizeFeedbackMessage,
  type FeedbackCategoryId,
  type FeedbackContext,
  type FeedbackStatusId,
} from "../lib/feedback";
import { useStore, DEFAULT_ACCOUNT_ID } from "../lib/store";

const QUEUE_KEY = "longyu:beta-feedback-queue";
const MAX_QUEUE = 30;
const CLIENT_COOLDOWN_MS = 30_000;

export interface FeedbackSubmitInput {
  category: FeedbackCategoryId;
  message: string;
  includeTechnicalContext: boolean;
  activityProblem: boolean;
  context?: FeedbackContext;
}

export interface QueuedFeedback {
  dedupeKey: string;
  category: FeedbackCategoryId;
  message: string;
  route: string;
  lessonId?: string;
  exerciseKind?: string;
  exerciseIndex?: number;
  appVersion: string;
  browser: string;
  viewport: string;
  localProfileId: string;
  createdAt: number;
  attempts: number;
}

export type FeedbackSubmitResult =
  | { ok: true; id?: string; queued?: boolean }
  | { ok: false; error: string };

let lastSubmitAt = 0;

function readQueue(): QueuedFeedback[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedFeedback[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedFeedback[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* quota */
  }
}

function localProfileId(): string {
  const state = useStore.getState();
  const account = state.accounts[state.currentAccountId] ?? state.accounts[DEFAULT_ACCOUNT_ID];
  return account?.id ?? DEFAULT_ACCOUNT_ID;
}

function makeDedupeKey(parts: Array<string | number | undefined>): string {
  return parts
    .map((part) => String(part ?? "").trim())
    .join("|")
    .slice(0, 220);
}

export function enqueueFeedback(item: Omit<QueuedFeedback, "attempts">): void {
  const queue = readQueue();
  if (queue.some((entry) => entry.dedupeKey === item.dedupeKey)) return;
  queue.push({ ...item, attempts: 0 });
  writeQueue(queue);
}

export function listQueuedFeedback(): QueuedFeedback[] {
  return readQueue();
}

async function insertRemote(item: QueuedFeedback): Promise<{ id?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { error: "backend_unavailable" };

  const { data, error } = await client.rpc("submit_beta_feedback", {
    p_category: item.category,
    p_message: item.message,
    p_route: item.route,
    p_lesson_id: item.lessonId ?? null,
    p_exercise_kind: item.exerciseKind ?? null,
    p_exercise_index: item.exerciseIndex ?? null,
    p_app_version: item.appVersion,
    p_browser: item.browser,
    p_viewport: item.viewport,
    p_local_profile_id: item.localProfileId,
    p_client_dedupe_key: item.dedupeKey,
  });

  if (error) {
    const message = error.message ?? "submit_failed";
    if (/rate_limited/i.test(message)) return { error: "rate_limited" };
    if (/forbidden_content/i.test(message)) return { error: "forbidden_content" };
    if (/invalid_/i.test(message)) return { error: message };
    return { error: "submit_failed" };
  }

  return { id: typeof data === "string" ? data : undefined };
}

export async function flushFeedbackQueue(): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  const queue = readQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedFeedback[] = [];
  let sent = 0;

  for (const item of queue) {
    const result = await insertRemote(item);
    if (result.error && result.error !== "rate_limited") {
      remaining.push({ ...item, attempts: item.attempts + 1 });
      continue;
    }
    if (result.error === "rate_limited") {
      remaining.push(item);
      remaining.push(...queue.slice(queue.indexOf(item) + 1));
      break;
    }
    sent += 1;
  }

  writeQueue(remaining.filter((item) => item.attempts < 8));
  return sent;
}

export async function submitFeedback(input: FeedbackSubmitInput): Promise<FeedbackSubmitResult> {
  const now = Date.now();
  if (now - lastSubmitAt < CLIENT_COOLDOWN_MS) {
    return { ok: false, error: "Aguarde alguns segundos antes de enviar outro feedback." };
  }

  const message = sanitizeFeedbackMessage(input.message);
  if (message.length < 3) {
    return { ok: false, error: "Descreva o problema com pelo menos algumas palavras." };
  }
  if (looksLikeSecretLeak(message)) {
    return {
      ok: false,
      error: "Remova senhas, tokens ou dados sensíveis da mensagem antes de enviar.",
    };
  }

  const tech = buildTechnicalContext(input.context);
  const lessonId = input.context?.lessonId;
  const exerciseKind = input.context?.exerciseKind;
  const exerciseIndex = input.context?.exerciseIndex;
  const composedMessage = input.activityProblem
    ? `[Atividade com problema]\n${message}`
    : message;

  const payload: QueuedFeedback = {
    dedupeKey: makeDedupeKey([
      localProfileId(),
      input.category,
      composedMessage.slice(0, 80),
      tech.route,
      lessonId,
      exerciseKind,
      exerciseIndex,
      Math.floor(now / 60_000),
    ]),
    category: input.category,
    message: composedMessage,
    route: tech.route,
    lessonId,
    exerciseKind,
    exerciseIndex,
    appVersion: input.includeTechnicalContext ? tech.appVersion : "",
    browser: input.includeTechnicalContext ? tech.browser : "",
    viewport: input.includeTechnicalContext ? tech.viewport : "",
    localProfileId: localProfileId(),
    createdAt: now,
    attempts: 0,
  };

  // Sempre anexa lesson/exercise no payload estruturado; contexto técnico é opcional.
  if (!input.includeTechnicalContext) {
    payload.appVersion = tech.appVersion;
  }

  lastSubmitAt = now;

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline || !getSupabaseClient()) {
    enqueueFeedback(payload);
    return { ok: true, queued: true };
  }

  const result = await insertRemote(payload);
  if (result.error === "rate_limited") {
    return { ok: false, error: "Muitos envios seguidos. Tente novamente em um minuto." };
  }
  if (result.error === "forbidden_content") {
    return { ok: false, error: "Remova dados sensíveis da mensagem." };
  }
  if (result.error) {
    enqueueFeedback(payload);
    return { ok: true, queued: true };
  }

  return { ok: true, id: result.id };
}

export interface BetaFeedbackRow {
  id: string;
  user_id: string | null;
  local_profile_id: string | null;
  category: FeedbackCategoryId;
  message: string;
  route: string;
  lesson_id: string | null;
  exercise_kind: string | null;
  exercise_index: number | null;
  app_version: string;
  browser: string;
  viewport: string;
  created_at: string;
  status: FeedbackStatusId;
  admin_note: string | null;
}

export async function fetchAdminFeedback(): Promise<BetaFeedbackRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("beta_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as BetaFeedbackRow[];
}

/** Feedback do usuário logado (RLS: só o próprio). */
export async function fetchMyFeedback(): Promise<BetaFeedbackRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data: sessionData } = await client.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return [];
  const { data, error } = await client
    .from("beta_feedback")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as BetaFeedbackRow[];
}

export async function updateAdminFeedback(
  id: string,
  status: FeedbackStatusId,
  adminNote?: string | null
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("backend_unavailable");
  const { error } = await client.rpc("update_beta_feedback_admin", {
    p_id: id,
    p_status: status,
    p_admin_note: adminNote ?? null,
  });
  if (error) throw error;
}

export async function checkIsBetaAdmin(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { data, error } = await client.rpc("is_beta_admin");
  if (error) return false;
  return Boolean(data);
}

export function feedbackToCsv(rows: BetaFeedbackRow[]): string {
  const header = [
    "id",
    "created_at",
    "status",
    "category",
    "lesson_id",
    "exercise_kind",
    "exercise_index",
    "route",
    "message",
    "app_version",
    "browser",
    "viewport",
    "user_id",
    "local_profile_id",
    "admin_note",
  ];
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = rows.map((row) =>
    [
      row.id,
      row.created_at,
      row.status,
      row.category,
      row.lesson_id,
      row.exercise_kind,
      row.exercise_index,
      row.route,
      row.message,
      row.app_version,
      row.browser,
      row.viewport,
      row.user_id,
      row.local_profile_id,
      row.admin_note,
    ]
      .map(escape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function installFeedbackOnlineFlush(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onOnline = () => {
    void flushFeedbackQueue();
  };
  window.addEventListener("online", onOnline);
  void flushFeedbackQueue();
  return () => window.removeEventListener("online", onOnline);
}
