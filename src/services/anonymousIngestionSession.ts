import { getSupabaseClient } from "../lib/supabaseClient";
import { edgeOpsInit, noteOps } from "../lib/opsCorrelation";

const STORAGE_KEY = "longyu:anonymous-ingestion-session:v2";
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const EXPIRY_SAFETY_MS = 5 * 60_000;

interface StoredAnonymousIngestionSession {
  token: string;
  expiresAt: number;
}

let issuancePromise: Promise<string | null> | null = null;

function readStoredSession(): StoredAnonymousIngestionSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as
      | StoredAnonymousIngestionSession
      | null;
    if (
      !parsed ||
      !TOKEN_PATTERN.test(parsed.token) ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= Date.now() + EXPIRY_SAFETY_MS
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeStoredSession(token: string, expiresIn: number): void {
  if (typeof localStorage === "undefined") return;
  const boundedLifetimeSeconds = Math.max(300, Math.min(expiresIn, 86400));
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token,
        expiresAt: Date.now() + boundedLifetimeSeconds * 1000,
      } satisfies StoredAnonymousIngestionSession)
    );
  } catch {
    /* localStorage may be unavailable in privacy mode */
  }
}

export function invalidateAnonymousIngestionSession(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Short UA summary used only for telemetry grouping, never as a security identity. */
export function anonymousIngestionClientContext(): string {
  if (typeof navigator === "undefined") return "node";
  const ua = navigator.userAgent || "unknown";
  const short = ua.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
  const lang = typeof navigator.language === "string" ? navigator.language.slice(0, 12) : "";
  return `${short}|${lang}`.slice(0, 120);
}

async function issueAnonymousIngestionSession(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (user) {
    invalidateAnonymousIngestionSession();
    return null;
  }

  const ops = edgeOpsInit("anon_ingestion");
  const { data, error } = await client.functions.invoke("issue-anon-ingestion-session", {
    headers: ops.headers,
    body: {},
  });
  const payload = data as { token?: unknown; expiresIn?: unknown } | null;
  const token = typeof payload?.token === "string" ? payload.token : "";
  const expiresIn = Number(payload?.expiresIn ?? 0);
  if (error || !TOKEN_PATTERN.test(token) || !Number.isFinite(expiresIn)) {
    noteOps("anon_ingestion", ops.correlationId, "error", { code: "issue_failed" });
    return null;
  }

  noteOps("anon_ingestion", ops.correlationId, "ok");

  writeStoredSession(token, expiresIn);
  return token;
}

/**
 * Returns a bearer capability for anonymous ingestion. Authenticated users
 * intentionally receive null because their JWT is the trusted identity.
 */
export async function getAnonymousIngestionSessionToken(): Promise<string | null> {
  const stored = readStoredSession();
  if (stored) return stored.token;

  if (!issuancePromise) {
    issuancePromise = issueAnonymousIngestionSession().finally(() => {
      issuancePromise = null;
    });
  }
  return issuancePromise;
}
