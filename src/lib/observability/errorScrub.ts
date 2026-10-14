/**
 * RC2.3.10 — pure privacy rules for production error reports (no imports, no
 * import.meta) so scripts/rc2-3-10-cloud-certification.mjs can prove them.
 * Used by ./errorReporting.ts.
 */
export type ErrorReportingEnv = { VITE_SENTRY_DSN?: string; VITE_APP_ENV?: string };

export interface ErrorReportingConfig {
  enabled: boolean;
  reason: "NO_DSN" | "NON_PRODUCTION_ENV" | "ENABLED";
  dsn: string;
  environment: string;
  release: string;
}

const NON_REPORTING_ENVS = new Set(["preview", "qa_candidate", "development", "dev", "local", "test"]);

export function errorReportingConfig(env: ErrorReportingEnv, release: string): ErrorReportingConfig {
  const dsn = String(env.VITE_SENTRY_DSN ?? "").trim();
  const environment = String(env.VITE_APP_ENV ?? "").trim().toLowerCase() || "development";
  if (!/^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(dsn)) return { enabled: false, reason: "NO_DSN", dsn: "", environment, release };
  if (NON_REPORTING_ENVS.has(environment)) return { enabled: false, reason: "NON_PRODUCTION_ENV", dsn, environment, release };
  return { enabled: true, reason: "ENABLED", dsn, environment, release };
}

const SENSITIVE_KEY = /(pass(word)?|token|secret|authorization|cookie|api_?key|email|answer|transcript|recording|audio|speech|stroke|drawing|coord|points|message_body|note)/i;
const EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{40,}\b/g;

export function scrubText(value: string): string {
  return value.replace(EMAIL, "[email]").replace(JWT, "[jwt]").replace(LONG_TOKEN, "[token]");
}

export function scrubUrl(value: string): string {
  const cut = value.search(/[?#]/);
  return scrubText(cut >= 0 ? value.slice(0, cut) : value);
}

function scrubObject(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value == null ? value : "[depth]";
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrubObject(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) continue;
      out[key] = scrubObject(item, depth + 1);
    }
    return out;
  }
  return value;
}

type ScrubbableEvent = {
  message?: string;
  user?: unknown;
  request?: { url?: string; data?: unknown; cookies?: unknown; headers?: unknown; query_string?: unknown };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: ScrubbableBreadcrumb[];
  exception?: { values?: Array<{ value?: string }> };
};

type ScrubbableBreadcrumb = { category?: string; message?: string; data?: Record<string, unknown> };

export function scrubBreadcrumb<B extends ScrubbableBreadcrumb>(crumb: B): B | null {
  const category = String(crumb.category ?? "");
  if (category === "console" || category.startsWith("ui.input")) return null;
  const data = crumb.data ? (scrubObject(crumb.data) as Record<string, unknown>) : undefined;
  if (data && typeof data.url === "string") data.url = scrubUrl(data.url);
  if (data && typeof data.from === "string") data.from = scrubUrl(data.from);
  if (data && typeof data.to === "string") data.to = scrubUrl(data.to);
  return { ...crumb, message: crumb.message ? scrubText(crumb.message) : crumb.message, data };
}

export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
  const out: E = { ...event };
  delete out.user;
  if (out.request) {
    out.request = { url: out.request.url ? scrubUrl(out.request.url) : undefined };
  }
  if (out.message) out.message = scrubText(out.message);
  if (out.extra) out.extra = scrubObject(out.extra) as Record<string, unknown>;
  if (out.contexts) out.contexts = scrubObject(out.contexts) as Record<string, unknown>;
  if (out.exception?.values) {
    out.exception = { ...out.exception, values: out.exception.values.map((v) => ({ ...v, value: v.value ? scrubText(v.value) : v.value })) };
  }
  if (out.breadcrumbs) out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb).filter((b): b is ScrubbableBreadcrumb => b !== null);
  return out;
}
