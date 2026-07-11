import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import type { AnalyticsEventName, AnalyticsPayload, AnalyticsTrackInput } from "../lib/analytics/events";
import { ANALYTICS_EVENTS } from "../lib/analytics/events";
import { sanitizeMetadata, sanitizeStepMistakeMetadata } from "../lib/analytics/sanitize";
import { getAnonymousId, getSessionId } from "../lib/analytics/session";

const QUEUE_KEY = "longyu:analytics-queue";
const MAX_QUEUE = 50;
const MAX_SESSION_EVENTS = 200;
const BATCH_SIZE = 10;
const FLUSH_MS = 8000;

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.1.0";

let sessionEventCount = 0;
let flushTimer: number | null = null;
let flushing = false;

function currentRoute(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function shouldLogOnly(): boolean {
  if (import.meta.env.VITE_ANALYTICS_PERSIST === "1") return false;
  if (import.meta.env.DEV) return true;
  return !isSupabaseBackendEnabled();
}

function readQueue(): AnalyticsPayload[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsPayload[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: AnalyticsPayload[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* quota */
  }
}

function enqueue(payload: AnalyticsPayload): void {
  const queue = readQueue();
  queue.push(payload);
  writeQueue(queue);
}

function buildPayload(input: AnalyticsTrackInput): AnalyticsPayload | null {
  if (sessionEventCount >= MAX_SESSION_EVENTS) return null;

  const metadata =
    input.event === ANALYTICS_EVENTS.step_mistake
      ? sanitizeStepMistakeMetadata((input.metadata ?? {}) as {
          taskType?: string;
          skill?: string;
          isReview?: boolean;
          attemptNumber?: number;
          stepIndex?: number;
        })
      : sanitizeMetadata(input.metadata);

  sessionEventCount += 1;

  return {
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    event_name: input.event,
    route: input.route ?? currentRoute(),
    lesson_id: input.lessonId ?? null,
    step_type: input.stepType ?? null,
    metadata,
    app_version: APP_VERSION,
  };
}

async function sendBatch(batch: AnalyticsPayload[]): Promise<boolean> {
  if (!isSupabaseBackendEnabled() || batch.length === 0) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  const {
    data: { session },
  } = await client.auth.getSession();

  if (session?.access_token) {
    const { error } = await client.rpc("ingest_analytics_events", {
      p_events: batch,
    });
    return !error;
  }

  const { error } = await client.functions.invoke("submit-analytics", {
    body: { events: batch },
  });
  return !error;
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (flushing || shouldLogOnly()) return;
  flushing = true;
  try {
    const queue = readQueue();
    if (queue.length === 0) return;

    const remaining: AnalyticsPayload[] = [];
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      const ok = await sendBatch(batch);
      if (!ok) {
        remaining.push(...batch, ...queue.slice(i + BATCH_SIZE));
        break;
      }
    }
    writeQueue(remaining);
  } finally {
    flushing = false;
  }
}

function scheduleFlush(): void {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsQueue();
  }, FLUSH_MS);
}

export function trackAnalytics(input: AnalyticsTrackInput): void {
  try {
    if (sessionEventCount >= MAX_SESSION_EVENTS) return;

    const payload = buildPayload(input);
    if (!payload) return;

    if (shouldLogOnly()) {
      console.info("[longyu:analytics]", payload);
      return;
    }

    enqueue(payload);
    scheduleFlush();
  } catch {
    /* analytics nunca bloqueia UX */
  }
}

export function trackStepMistake(input: {
  lessonId?: string;
  stepType?: string;
  taskType?: string;
  skill?: string;
  isReview?: boolean;
  attemptNumber?: number;
  stepIndex?: number;
}): void {
  trackAnalytics({
    event: ANALYTICS_EVENTS.step_mistake,
    lessonId: input.lessonId,
    stepType: input.stepType,
    metadata: sanitizeStepMistakeMetadata(input),
  });
}

export function installAnalyticsLifecycle(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    void flushAnalyticsQueue();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushAnalyticsQueue();
  });
}

export { ANALYTICS_EVENTS };
export type { AnalyticsEventName };
