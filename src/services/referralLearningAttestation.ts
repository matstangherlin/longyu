import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";

interface ReferralLessonSession {
  sessionId: string;
  lessonId: string;
  notBefore: number;
  expiresAt: number;
}

interface StartPayload {
  ok?: boolean;
  error?: string;
  already_completed?: boolean;
  session_id?: string;
  not_before?: string;
  expires_at?: string;
}

interface CompletePayload {
  ok?: boolean;
  error?: string;
  verified?: boolean;
  already_completed?: boolean;
  retry_after_seconds?: number;
}

const activeSessions = new Map<string, Promise<ReferralLessonSession | null>>();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedLessonId(lessonId: string): string {
  return lessonId.trim().slice(0, 80);
}

async function requestSession(lessonId: string): Promise<ReferralLessonSession | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("start_referral_lesson_session", {
    p_lesson_id: lessonId,
  });
  if (error) return null;

  const payload = data as StartPayload | null;
  if (!payload?.ok || payload.already_completed) return null;
  if (!payload.session_id || !UUID_PATTERN.test(payload.session_id)) return null;
  if (!payload.not_before || !payload.expires_at) return null;

  const notBefore = Date.parse(payload.not_before);
  const expiresAt = Date.parse(payload.expires_at);
  if (!Number.isFinite(notBefore) || !Number.isFinite(expiresAt) || expiresAt <= notBefore) {
    return null;
  }

  return {
    sessionId: payload.session_id,
    lessonId,
    notBefore,
    expiresAt,
  };
}

export function beginReferralLessonAttestation(
  lessonId: string
): Promise<ReferralLessonSession | null> {
  const normalized = normalizedLessonId(lessonId);
  if (!normalized) return Promise.resolve(null);

  const existing = activeSessions.get(normalized);
  if (existing) return existing;

  const pending = requestSession(normalized);
  activeSessions.set(normalized, pending);
  void pending.then((session) => {
    if (!session && activeSessions.get(normalized) === pending) {
      activeSessions.delete(normalized);
    }
  });
  return pending;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

export async function completeReferralLessonAttestation(lessonId: string): Promise<boolean> {
  const normalized = normalizedLessonId(lessonId);
  if (!normalized) return false;

  const pending = activeSessions.get(normalized) ?? beginReferralLessonAttestation(normalized);
  const session = await pending;
  if (!session) return false;

  // Client time is only an optimization. The server remains authoritative and
  // returns retry_after_seconds when the local clock is wrong.
  const localDelay = Math.min(Math.max(session.notBefore - Date.now(), 0), 60_000);
  if (localDelay > 0) await wait(localDelay + 250);

  const supabase = getSupabaseClient();
  if (!supabase) return false;
  let { data, error } = await supabase.rpc("complete_referral_lesson_session", {
    p_session_id: session.sessionId,
  });
  let payload = data as CompletePayload | null;
  if (!error && payload?.error === "too_soon") {
    const retrySeconds = Math.min(Math.max(payload.retry_after_seconds ?? 1, 1), 90);
    await wait(retrySeconds * 1000 + 250);
    ({ data, error } = await supabase.rpc("complete_referral_lesson_session", {
      p_session_id: session.sessionId,
    }));
    payload = data as CompletePayload | null;
  }
  if (error) return false;

  if (!payload?.ok || (!payload.verified && !payload.already_completed)) return false;

  activeSessions.delete(normalized);
  await supabase.rpc("process_referral_pipeline");
  return true;
}
