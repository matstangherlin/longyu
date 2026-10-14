/**
 * RC2.3.10 — production error reporting (Sentry), optional and private.
 *
 * Off unless `VITE_SENTRY_DSN` is set (a DSN is public by design — it only
 * allows sending events). The SDK is a lazy chunk: without a DSN it is never
 * downloaded. Errors only — no tracing, no session replay (stricter than the
 * plan in docs/launch/platform-responsibility-map.md). Preview / QA candidate /
 * development never report.
 *
 * Privacy (`scrubEvent`, `scrubBreadcrumb` are pure and tested): no request
 * body, cookies or headers; URLs lose query and hash; no user identity; no
 * console or input breadcrumbs; keys that could carry answers, recordings,
 * drawing coordinates, tokens or emails are dropped; emails/JWTs in text are
 * masked.
 */
import { getAppEnvironmentLabel, getAppVersion, getCommitSha } from "../feedback";
import { getPlatform } from "../platform/nativePlatform";
import { errorReportingConfig, scrubBreadcrumb, scrubEvent, type ErrorReportingConfig, type ErrorReportingEnv } from "./errorScrub";

export { scrubBreadcrumb, scrubEvent, scrubText, scrubUrl, errorReportingConfig } from "./errorScrub";

type SentryModule = typeof import("@sentry/browser");
let sentry: SentryModule | null = null;
let config: ErrorReportingConfig | null = null;

export function errorReportingStatus(): ErrorReportingConfig {
  return config ?? errorReportingConfig(import.meta.env as ErrorReportingEnv, getCommitSha());
}

export async function initErrorReporting(): Promise<void> {
  config = errorReportingConfig(import.meta.env as ErrorReportingEnv, getCommitSha());
  if (!config.enabled || sentry) return;
  try {
    const mod = await import("@sentry/browser");
    mod.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release || undefined,
      sampleRate: 1.0,
      sendDefaultPii: false,
      maxBreadcrumbs: 30,
      initialScope: { tags: { platform: getPlatform(), app_version: getAppVersion(), app_env: getAppEnvironmentLabel() } },
      beforeSend: (event) => scrubEvent(event),
      beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    });
    sentry = mod;
  } catch {
    // Reporting must never break the app.
    sentry = null;
  }
}

export function captureError(error: unknown, area: string): void {
  if (!sentry) return;
  sentry.withScope((scope) => {
    scope.setTag("area", area);
    sentry?.captureException(error);
  });
}

/** QA only (/qa/device): proves real ingest end-to-end. */
export function sendErrorReportingTestEvent(): boolean {
  if (!sentry) return false;
  sentry.captureMessage("SENTRY_TEST_EVENT", "info");
  return true;
}
