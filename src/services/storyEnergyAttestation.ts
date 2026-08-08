import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";

interface StoryEnergySession {
  sessionId: string;
  storyId: string;
  notBefore: number;
  expiresAt: number;
}

interface StartPayload {
  ok?: boolean;
  error?: string;
  session_id?: string;
  not_before?: string;
  expires_at?: string;
}

const activeSessions = new Map<string, Promise<StoryEnergySession | null>>();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedStoryId(storyId: string): string {
  return storyId.trim().slice(0, 64);
}

async function requestSession(storyId: string): Promise<StoryEnergySession | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("start_story_energy_session", {
    p_story_id: storyId,
  });
  if (error) return null;

  const payload = data as StartPayload | null;
  if (!payload?.ok) return null;
  if (!payload.session_id || !UUID_PATTERN.test(payload.session_id)) return null;
  if (!payload.not_before || !payload.expires_at) return null;

  const notBefore = Date.parse(payload.not_before);
  const expiresAt = Date.parse(payload.expires_at);
  if (!Number.isFinite(notBefore) || !Number.isFinite(expiresAt) || expiresAt <= notBefore) {
    return null;
  }

  return {
    sessionId: payload.session_id,
    storyId,
    notBefore,
    expiresAt,
  };
}

export function beginStoryEnergyAttestation(storyId: string): Promise<StoryEnergySession | null> {
  const normalized = normalizedStoryId(storyId);
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

/** Espera o not_before local (otimização); o servidor continua autoritativo. */
export async function awaitStoryEnergyAttestation(storyId: string): Promise<boolean> {
  const normalized = normalizedStoryId(storyId);
  if (!normalized) return false;

  const pending = activeSessions.get(normalized) ?? beginStoryEnergyAttestation(normalized);
  const session = await pending;
  if (!session) return false;

  const localDelay = Math.min(Math.max(session.notBefore - Date.now(), 0), 120_000);
  if (localDelay > 0) await wait(localDelay + 250);
  return true;
}

export function clearStoryEnergyAttestation(storyId: string): void {
  activeSessions.delete(normalizedStoryId(storyId));
}
