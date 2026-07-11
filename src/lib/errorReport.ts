import { APP_VERSION, BUILD_SHA } from "./appMeta";

export type ErrorReportSource =
  | "boundary"
  | "route"
  | "window"
  | "unhandledrejection"
  | "sync"
  | "checkout"
  | "reward"
  | "manual";

export interface ErrorReportInput {
  errorName: string;
  message: string;
  stack?: string;
  route?: string;
  source?: ErrorReportSource;
  occurrenceDelta?: number;
}

const SENSITIVE_PATTERNS = [
  /bearer\s+[a-z0-9._-]+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /(password|senha|token|secret|api[_-]?key)\s*[:=]\s*\S+/gi,
  /longyu-v1["\s:=]+\{[^}]{0,200}/gi,
  /localStorage\.[a-zA-Z]+\([^)]*\)/g,
];

let lastSafeAction = "app_start";

export function trackSafeAction(action: string): void {
  lastSafeAction = action.slice(0, 256);
}

export function getLastSafeAction(): string {
  return lastSafeAction;
}

export function currentRoute(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function deviceMeta() {
  if (typeof navigator === "undefined") {
    return { browser: "", viewport: "" };
  }
  const viewport =
    typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}px` : "";
  return {
    browser: navigator.userAgent.slice(0, 512),
    viewport,
  };
}

export function sanitizeErrorText(value: string, max = 2000): string {
  let text = value.slice(0, max * 2);
  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, "[redacted]");
  }
  return text.slice(0, max);
}

function firstStackFrame(stack?: string): string {
  if (!stack) return "";
  const lines = stack.split("\n").map((line) => line.trim()).filter(Boolean);
  const frame = lines.find((line) => line.startsWith("at "));
  return frame ? sanitizeErrorText(frame, 240) : "";
}

function normalizeMessage(message: string): string {
  return sanitizeErrorText(message, 400)
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildErrorFingerprint(input: {
  errorName: string;
  message: string;
  stack?: string;
  route?: string;
}): string {
  const route = (input.route ?? currentRoute()).split("?")[0];
  const parts = [
    input.errorName || "Error",
    normalizeMessage(input.message),
    firstStackFrame(input.stack),
    route,
  ].join("|");

  let hash = 0;
  for (let i = 0; i < parts.length; i += 1) {
    hash = (hash * 31 + parts.charCodeAt(i)) >>> 0;
  }
  return `fp_${hash.toString(16)}`;
}

export function buildErrorPayload(input: ErrorReportInput) {
  const meta = deviceMeta();
  const route = input.route ?? currentRoute();
  const message = sanitizeErrorText(input.message);
  const stack = input.stack ? sanitizeErrorText(input.stack, 8000) : undefined;

  return {
    error_name: sanitizeErrorText(input.errorName || "Error", 200),
    message,
    stack: stack ?? null,
    route,
    app_version: APP_VERSION,
    build_sha: BUILD_SHA,
    browser: meta.browser,
    viewport: meta.viewport,
    last_safe_action: getLastSafeAction(),
    fingerprint: buildErrorFingerprint({
      errorName: input.errorName,
      message,
      stack,
      route,
    }),
    occurrence_delta: Math.max(1, input.occurrenceDelta ?? 1),
    source: input.source ?? "manual",
  };
}
