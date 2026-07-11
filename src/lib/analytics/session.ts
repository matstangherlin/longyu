const ANON_KEY = "longyu:analytics-anon-id";
const SESSION_KEY = "longyu:analytics-session-id";

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnonymousId(): string {
  if (typeof localStorage === "undefined") return randomId("anon");
  const existing = localStorage.getItem(ANON_KEY);
  if (existing) return existing;
  const created = randomId("anon");
  localStorage.setItem(ANON_KEY, created);
  return created;
}

export function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return randomId("sess");
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = randomId("sess");
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function resetSessionId(): string {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
  return getSessionId();
}
