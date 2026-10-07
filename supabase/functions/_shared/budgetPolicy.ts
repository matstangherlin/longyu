/**
 * RC2.3.4A — LONGYU MUST FAIL CHEAPLY.
 *
 * Pure, dependency-free cost policy shared by Edge Functions and the node
 * gate scripts. No Deno / browser APIs here so it stays testable everywhere.
 * Security-sensitive switches live server-side (Edge env), never VITE_*.
 *
 * Provider limits are NOT hard-coded here: they live, with `verifiedAt` and
 * source, in docs/launch/platform-budget-registry.json.
 */

export const COST_POLICY_DEFAULTS = {
  FREE_TIER_FIRST: true,
  ALLOW_PAID_OVERAGE: false,
  /** Jev inside the learner's lesson flow. Off for launch. */
  JEV_RUNTIME_ENABLED: false,
  /** Jev for internal/dev semantic audit (admin feedback triage). Kill switch. */
  JEV_DEV_AUDIT_ENABLED: true,
  MARKETING_EMAIL_ENABLED: false,
  HIGH_VOLUME_REPLAY_ENABLED: false,
} as const;

export type CostFlag = keyof typeof COST_POLICY_DEFAULTS;
export type CostPolicy = { readonly [K in CostFlag]: boolean };

/**
 * Env can switch optional spend OFF freely. Switching paid overage ON is
 * refused here: that is a billing decision, not a deploy variable.
 */
export function resolveCostPolicy(read: (key: string) => string | undefined): CostPolicy {
  const out = { ...COST_POLICY_DEFAULTS } as { [K in CostFlag]: boolean };
  for (const key of Object.keys(COST_POLICY_DEFAULTS) as CostFlag[]) {
    const raw = read(key)?.trim().toLowerCase();
    if (raw === undefined || raw === "") continue;
    if (["0", "false", "off", "no"].includes(raw)) out[key] = false;
    else if (["1", "true", "on", "yes"].includes(raw)) out[key] = true;
  }
  out.ALLOW_PAID_OVERAGE = false;
  out.FREE_TIER_FIRST = true;
  return out;
}

export const BUDGET_THRESHOLDS = { warn: 0.7, critical: 0.85, degrade: 0.95 } as const;

export type BudgetLevel = "GREEN" | "WARN" | "CRITICAL" | "DEGRADE_NONESSENTIAL" | "EXHAUSTED" | "UNKNOWN";

export function budgetLevel(used: number | null | undefined, limit: number | null | undefined): BudgetLevel {
  if (typeof used !== "number" || typeof limit !== "number" || !(limit > 0) || used < 0) return "UNKNOWN";
  const ratio = used / limit;
  if (ratio >= 1) return "EXHAUSTED";
  if (ratio >= BUDGET_THRESHOLDS.degrade) return "DEGRADE_NONESSENTIAL";
  if (ratio >= BUDGET_THRESHOLDS.critical) return "CRITICAL";
  if (ratio >= BUDGET_THRESHOLDS.warn) return "WARN";
  return "GREEN";
}

export type CapabilityTier = "ESSENTIAL" | "IMPORTANT" | "OPTIONAL";

export const CAPABILITY_TIER = {
  auth_login: "ESSENTIAL",
  account_recovery_email: "ESSENTIAL",
  payment_email: "ESSENTIAL",
  security_email: "ESSENTIAL",
  entitlement_truth: "ESSENTIAL",
  progress_sync: "ESSENTIAL",
  error_capture: "IMPORTANT",
  onboarding_email: "IMPORTANT",
  progress_reminder_email: "IMPORTANT",
  marketing_email: "OPTIONAL",
  jev_learner_runtime: "OPTIONAL",
  jev_dev_audit: "OPTIONAL",
  session_replay: "OPTIONAL",
  performance_tracing: "OPTIONAL",
  noncritical_analytics: "OPTIONAL",
  background_enrichment: "OPTIONAL",
} as const satisfies Record<string, CapabilityTier>;

export type CapabilityId = keyof typeof CAPABILITY_TIER;

const FLAG_FOR: Partial<Record<CapabilityId, CostFlag>> = {
  marketing_email: "MARKETING_EMAIL_ENABLED",
  jev_learner_runtime: "JEV_RUNTIME_ENABLED",
  jev_dev_audit: "JEV_DEV_AUDIT_ENABLED",
  session_replay: "HIGH_VOLUME_REPLAY_ENABLED",
};

/**
 * ESSENTIAL never degrades (login, entitlement, progress, security).
 * OPTIONAL goes first (≥95%), IMPORTANT only when the quota is exhausted.
 * UNKNOWN usage is treated as fine for ESSENTIAL/IMPORTANT and as fine for
 * OPTIONAL too — unknown is reported, not silently converted into an outage.
 */
export function capabilityAllowed(capability: CapabilityId, level: BudgetLevel, policy: CostPolicy): boolean {
  const tier: CapabilityTier = CAPABILITY_TIER[capability];
  if (tier === "ESSENTIAL") return true;
  const flag = FLAG_FOR[capability];
  if (flag && !policy[flag]) return false;
  if (tier === "OPTIONAL") return level !== "DEGRADE_NONESSENTIAL" && level !== "EXHAUSTED";
  return level !== "EXHAUSTED";
}

// ---------------------------------------------------------------------------
// Email: idempotency + per-user rate limit + event dedupe.
// ---------------------------------------------------------------------------

export const EMAIL_CAPABILITY_BY_TEMPLATE = {
  confirm_signup: "auth_login",
  password_recovery: "account_recovery_email",
  payment_receipt: "payment_email",
  payment_failed: "payment_email",
  security_alert: "security_email",
  onboarding_welcome: "onboarding_email",
  progress_reminder: "progress_reminder_email",
  marketing_campaign: "marketing_email",
} as const satisfies Record<string, CapabilityId>;

export type EmailTemplate = keyof typeof EMAIL_CAPABILITY_BY_TEMPLATE;

export const EMAIL_LIMITS = {
  /** Same user + template + event is sent at most once in this window. */
  dedupeWindowMs: 24 * 60 * 60 * 1000,
  /** Hard per-user ceiling across all templates per rolling 24h. */
  perUserPerDay: 5,
} as const;

export interface SentEmail {
  userId: string;
  template: EmailTemplate;
  eventKey: string;
  at: number;
}

export function emailIdempotencyKey(userId: string, template: EmailTemplate, eventKey: string): string {
  return `${template}:${userId}:${eventKey}`;
}

export type EmailDecision =
  | { send: true; idempotencyKey: string }
  | { send: false; reason: "DUPLICATE" | "USER_RATE_LIMIT" | "POLICY_DISABLED" | "BUDGET_DEGRADED" };

export function decideEmail(input: {
  userId: string;
  template: EmailTemplate;
  eventKey: string;
  now: number;
  history: readonly SentEmail[];
  level: BudgetLevel;
  policy: CostPolicy;
}): EmailDecision {
  const capability = EMAIL_CAPABILITY_BY_TEMPLATE[input.template];
  const flag = FLAG_FOR[capability];
  if (flag && !input.policy[flag]) return { send: false, reason: "POLICY_DISABLED" };
  if (!capabilityAllowed(capability, input.level, input.policy)) return { send: false, reason: "BUDGET_DEGRADED" };
  const key = emailIdempotencyKey(input.userId, input.template, input.eventKey);
  const recent = input.history.filter((e) => e.userId === input.userId && input.now - e.at < EMAIL_LIMITS.dedupeWindowMs);
  if (recent.some((e) => emailIdempotencyKey(e.userId, e.template, e.eventKey) === key)) {
    return { send: false, reason: "DUPLICATE" };
  }
  // Critical mail (auth/recovery/payment/security) is deduped but never rate-capped.
  if (CAPABILITY_TIER[capability] !== "ESSENTIAL" && recent.length >= EMAIL_LIMITS.perUserPerDay) {
    return { send: false, reason: "USER_RATE_LIMIT" };
  }
  return { send: true, idempotencyKey: key };
}

// ---------------------------------------------------------------------------
// Jev / optional AI: input hash + circuit breaker.
// ---------------------------------------------------------------------------

/** Stable FNV-1a 32-bit hex over a canonical JSON — dedupe key, not crypto. */
export function stableInputHash(value: unknown): string {
  const canonical = (v: unknown): string => {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    const entries = Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`).join(",")}}`;
  };
  let hash = 0x811c9dc5;
  const text = canonical(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export interface CircuitBreaker {
  canCall(now: number): boolean;
  recordSuccess(): void;
  recordFailure(now: number): void;
  state(now: number): "CLOSED" | "OPEN" | "HALF_OPEN";
}

export function createCircuitBreaker(options: { failureThreshold?: number; cooldownMs?: number } = {}): CircuitBreaker {
  const threshold = options.failureThreshold ?? 3;
  const cooldown = options.cooldownMs ?? 60_000;
  let failures = 0;
  let openedAt: number | null = null;
  const state = (now: number) => {
    if (openedAt === null) return "CLOSED" as const;
    return now - openedAt >= cooldown ? ("HALF_OPEN" as const) : ("OPEN" as const);
  };
  return {
    canCall: (now) => state(now) !== "OPEN",
    recordSuccess() {
      failures = 0;
      openedAt = null;
    },
    recordFailure(now) {
      failures += 1;
      if (failures >= threshold || openedAt !== null) openedAt = now;
    },
    state,
  };
}
