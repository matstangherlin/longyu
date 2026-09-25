/**
 * RC2.2.15 — Palavra do dia: plano de notificações locais. Função PURA.
 *
 * Mesma entrada → mesmo plano (RC2.2.15 · DM–DN). Quem agenda
 * (src/lib/platform/nativeNotifications.ts) só cancela os IDs de vocabulário e
 * agenda este conjunto; lembretes de ofensiva/estudo não são tocados.
 *
 * Regras:
 * - opt-in (`enabled`) + permissão REAL do SO; sem isso, plano vazio;
 * - janela escolhida pelo aluno, no mesmo dia, ≥ 30 min, fora do silêncio
 *   (22:00–08:00); nada é enviado fora da janela;
 * - horário determinístico dentro da janela: hash(semente opaca + dia);
 * - ≤ 1 palavra por dia; horizonte de 7 dias (quem não abre o app por mais de
 *   7 dias para de receber — de propósito);
 * - ≥ 90 min de distância de lembretes de ofensiva/retorno; colisão → move
 *   dentro da janela; sem espaço → pula o dia (a ofensiva tem prioridade);
 * - orçamento: no máximo 2 notificações automáticas do Longyu em 24 h;
 * - IDs derivados do dia (8100 + dia % 7): reagendar substitui, nunca acumula.
 */

export const DAILY_VOCABULARY_CHANNEL = "vocabulary";
export const DAILY_VOCABULARY_HORIZON_DAYS = 7;
export const DAILY_VOCABULARY_MIN_WINDOW_MIN = 30;
export const DAILY_VOCABULARY_SPACING_MS = 90 * 60 * 1000;
export const DAILY_VOCABULARY_BUDGET_PER_24H = 2;
export const DAILY_VOCABULARY_ID_BASE = 8100;
export const DAILY_VOCABULARY_IDS: readonly number[] = Array.from({ length: DAILY_VOCABULARY_HORIZON_DAYS }, (_, i) => DAILY_VOCABULARY_ID_BASE + i);
export const DAILY_VOCABULARY_DEV_ID = 8199;
export const DAILY_VOCABULARY_DEFAULT_WINDOW: VocabularyWindow = { startMin: 18 * 60, endMin: 21 * 60 };
export const DAILY_VOCABULARY_QUIET = { startMin: 22 * 60, endMin: 8 * 60 } as const;
export const DAILY_VOCABULARY_ROUTE = "/palavra-do-dia";
export const DAILY_VOCABULARY_URL_BASE = "com.longyu.app://palavra-do-dia";
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOT_STEP_MIN = 5;

export interface VocabularyWindow {
  /** Minutos desde 00:00 (hora local). */
  startMin: number;
  endMin: number;
}

export type WindowProblem = "INVALID" | "TOO_SHORT" | "CROSSES_MIDNIGHT" | "QUIET_HOURS";

export function validateDailyVocabularyWindow(window: VocabularyWindow): { ok: true } | { ok: false; reason: WindowProblem } {
  const { startMin, endMin } = window;
  if (![startMin, endMin].every((value) => Number.isInteger(value) && value >= 0 && value < 24 * 60)) return { ok: false, reason: "INVALID" };
  // Beta: só janelas no mesmo dia.
  if (endMin <= startMin) return { ok: false, reason: "CROSSES_MIDNIGHT" };
  if (endMin - startMin < DAILY_VOCABULARY_MIN_WINDOW_MIN) return { ok: false, reason: "TOO_SHORT" };
  if (startMin < DAILY_VOCABULARY_QUIET.endMin || endMin > DAILY_VOCABULARY_QUIET.startMin) return { ok: false, reason: "QUIET_HOURS" };
  return { ok: true };
}

/** "Ajustar horário": traz a janela para dentro do período permitido. */
export function adjustDailyVocabularyWindow(window: VocabularyWindow): VocabularyWindow {
  const clamp = (value: number) => Math.min(DAILY_VOCABULARY_QUIET.startMin, Math.max(DAILY_VOCABULARY_QUIET.endMin, value));
  let startMin = clamp(Number.isFinite(window.startMin) ? window.startMin : DAILY_VOCABULARY_DEFAULT_WINDOW.startMin);
  let endMin = clamp(Number.isFinite(window.endMin) ? window.endMin : DAILY_VOCABULARY_DEFAULT_WINDOW.endMin);
  if (endMin - startMin < DAILY_VOCABULARY_MIN_WINDOW_MIN) {
    endMin = Math.min(DAILY_VOCABULARY_QUIET.startMin, startMin + 60);
    startMin = Math.min(startMin, endMin - 60);
  }
  const fixed = { startMin, endMin };
  return validateDailyVocabularyWindow(fixed).ok ? fixed : { ...DAILY_VOCABULARY_DEFAULT_WINDOW };
}

export function formatWindowTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// ── Tempo local e determinismo ────────────────────────────────────────────

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayStart(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function atMinute(dayKey: string, minute: number): number {
  const base = dayStart(dayKey);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(minute / 60), minute % 60, 0, 0).getTime();
}

/** FNV-1a 32 bits: estável, sem Math.random. */
export function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** ID fixo por dia do calendário (substitui ao reagendar; 7 IDs no total). */
export function vocabularyNotificationId(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
  return DAILY_VOCABULARY_ID_BASE + (((dayNumber % DAILY_VOCABULARY_HORIZON_DAYS) + DAILY_VOCABULARY_HORIZON_DAYS) % DAILY_VOCABULARY_HORIZON_DAYS);
}

/** Minuto preferido do dia dentro da janela (semente opaca + dia). */
export function preferredMinute(seed: string, dayKey: string, window: VocabularyWindow): number {
  const span = window.endMin - window.startMin;
  return window.startMin + (stableHash(`${seed}|${dayKey}`) % (span + 1));
}

// ── Plano ─────────────────────────────────────────────────────────────────

export interface PlanWord {
  id: string;
  hanzi: string;
  pinyin: string;
  /** Significado no idioma do CURSO (nunca decidido pelo idioma da interface). */
  meaning: string;
  /** Micro-pista verificada (opcional, curta). */
  hint?: string | null;
}

export interface PlannedVocabularyNotification {
  id: number;
  kind: "daily_vocabulary";
  channelId: typeof DAILY_VOCABULARY_CHANNEL;
  dayKey: string;
  lexicalId: string;
  at: number;
  title: string;
  body: string;
  url: string;
}

export interface DailyVocabularyAssignment {
  dateKey: string;
  lexicalId: string;
  scheduledAt: number | null;
}

export type DailyVocabularySkip = "NO_CANDIDATE" | "WINDOW_PASSED" | "COLLISION";

export interface DailyVocabularyPlanInput {
  now: number;
  enabled: boolean;
  permissionGranted: boolean;
  window: VocabularyWindow;
  /** Idioma da INTERFACE: só o texto de chamada ("Toque para…"). */
  interfaceLocale: "pt-BR" | "en";
  /** Semente opaca (nunca e-mail, nome ou username). */
  seed: string;
  /** Candidatos seguros já ordenados, com significado no idioma do curso. */
  candidates: readonly PlanWord[];
  /** Palavra já definida para cada dia (estável no dia; não há "trocar palavra"). */
  assignments: readonly { dateKey: string; lexicalId: string }[];
  /** Palavras que já foram "palavra do dia" antes de hoje (não voltam como novas). */
  history: readonly { dateKey: string; lexicalId: string }[];
  /** Lembretes de ofensiva/retorno pendentes (prioridade sobre vocabulário). */
  studyReminders: readonly { at: number }[];
  horizonDays?: number;
}

export interface DailyVocabularyPlan {
  notifications: PlannedVocabularyNotification[];
  assignments: DailyVocabularyAssignment[];
  skipped: { dateKey: string; reason: DailyVocabularySkip }[];
}

const CTA: Record<"pt-BR" | "en", string> = {
  "pt-BR": "Toque para ouvir e descobrir.",
  en: "Tap to hear it and learn more.",
};

/** Hànzì + pinyin no título, significado logo no início do corpo. */
export function vocabularyNotificationCopy(word: PlanWord, interfaceLocale: "pt-BR" | "en"): { title: string; body: string } {
  const title = `${word.hanzi} · ${word.pinyin}`;
  const hint = word.hint?.trim();
  const body = `${word.meaning}\n${hint ? hint : CTA[interfaceLocale]}`;
  return { title, body };
}

export function vocabularyDeepLink(lexicalId: string): string {
  return `${DAILY_VOCABULARY_URL_BASE}/${lexicalId}`;
}

function withinBudget(times: readonly number[]): boolean {
  const sorted = [...times].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += 1) {
    let count = 0;
    for (let j = i; j < sorted.length && sorted[j] - sorted[i] < DAY_MS; j += 1) count += 1;
    if (count > DAILY_VOCABULARY_BUDGET_PER_24H) return false;
  }
  return true;
}

export function planDailyVocabularyNotifications(input: DailyVocabularyPlanInput): DailyVocabularyPlan {
  const empty: DailyVocabularyPlan = { notifications: [], assignments: [], skipped: [] };
  if (!input.enabled || !input.permissionGranted) return empty;
  if (!validateDailyVocabularyWindow(input.window).ok) return empty;
  const horizon = Math.max(1, Math.min(DAILY_VOCABULARY_HORIZON_DAYS, input.horizonDays ?? DAILY_VOCABULARY_HORIZON_DAYS));
  const today = dayKeyOf(new Date(input.now));
  const byId = new Map(input.candidates.map((word) => [word.id, word]));
  const pastIds = new Set(input.history.filter((entry) => entry.dateKey < today).map((entry) => entry.lexicalId));
  const taken = new Set<string>();
  const placedTimes: number[] = [];
  const reminders = input.studyReminders.map((reminder) => reminder.at).filter((at) => Number.isFinite(at));
  const plan: DailyVocabularyPlan = { notifications: [], assignments: [], skipped: [] };

  for (let offset = 0; offset < horizon; offset += 1) {
    const base = dayStart(today);
    const dateKey = dayKeyOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset));
    // Palavra do dia: a já definida (se ainda é segura) ou a próxima da fila.
    const existing = input.assignments.find((entry) => entry.dateKey === dateKey);
    let word = existing && byId.has(existing.lexicalId) && !taken.has(existing.lexicalId) ? byId.get(existing.lexicalId)! : undefined;
    if (!word) word = input.candidates.find((candidate) => !taken.has(candidate.id) && !pastIds.has(candidate.id));
    if (!word) {
      plan.skipped.push({ dateKey, reason: "NO_CANDIDATE" });
      continue;
    }
    // Horário: preferido, depois vizinhos (±5 min) dentro da janela.
    const preferred = preferredMinute(input.seed, dateKey, input.window);
    const minutes: number[] = [preferred];
    for (let step = SLOT_STEP_MIN; step <= input.window.endMin - input.window.startMin; step += SLOT_STEP_MIN) {
      if (preferred + step <= input.window.endMin) minutes.push(preferred + step);
      if (preferred - step >= input.window.startMin) minutes.push(preferred - step);
    }
    let at: number | null = null;
    let sawFuture = false;
    for (const minute of minutes) {
      const candidateAt = atMinute(dateKey, minute);
      if (candidateAt <= input.now + 60_000) continue;
      sawFuture = true;
      if (reminders.some((reminder) => Math.abs(reminder - candidateAt) < DAILY_VOCABULARY_SPACING_MS)) continue;
      if (!withinBudget([...reminders, ...placedTimes, candidateAt])) continue;
      at = candidateAt;
      break;
    }
    if (at == null) {
      plan.skipped.push({ dateKey, reason: sawFuture ? "COLLISION" : "WINDOW_PASSED" });
      // Hoje já passou da janela: a palavra do dia continua sendo a mesma.
      if (existing && byId.has(existing.lexicalId)) {
        taken.add(existing.lexicalId);
        plan.assignments.push({ dateKey, lexicalId: existing.lexicalId, scheduledAt: null });
      }
      continue;
    }
    taken.add(word.id);
    placedTimes.push(at);
    const copy = vocabularyNotificationCopy(word, input.interfaceLocale);
    plan.assignments.push({ dateKey, lexicalId: word.id, scheduledAt: at });
    plan.notifications.push({
      id: vocabularyNotificationId(dateKey),
      kind: "daily_vocabulary",
      channelId: DAILY_VOCABULARY_CHANNEL,
      dayKey: dateKey,
      lexicalId: word.id,
      at,
      ...copy,
      url: vocabularyDeepLink(word.id),
    });
  }
  return plan;
}

/** DEV/QA: a MESMA notificação, em +60 s. Nunca para aluno. */
export function devTestVocabularyNotification(now: number, word: PlanWord, interfaceLocale: "pt-BR" | "en"): PlannedVocabularyNotification {
  const dayKey = dayKeyOf(new Date(now));
  return {
    id: DAILY_VOCABULARY_DEV_ID,
    kind: "daily_vocabulary",
    channelId: DAILY_VOCABULARY_CHANNEL,
    dayKey,
    lexicalId: word.id,
    at: now + 60_000,
    ...vocabularyNotificationCopy(word, interfaceLocale),
    url: vocabularyDeepLink(word.id),
  };
}

// ── Estado de descoberta (por conta; sem PII) ─────────────────────────────

/**
 * RC2.2.15 · AB–AC — uma linha por dia. `scheduledAt` diz que o Longyu
 * AGENDOU; ninguém sabe com certeza se o aluno viu a notificação, então não
 * existe "delivered/visto". Abrir ≠ aprender; praticar ≠ dominar.
 */
export interface DailyVocabularyExposure {
  dateKey: string;
  lexicalId: string;
  courseDirection: string | null;
  scheduledAt: number | null;
  openedAt?: number;
  practicedAt?: number;
  reviewAddedAt?: number;
}

export interface DailyVocabularyState {
  /** Semente opaca local (aleatória), só para variar o minuto dentro da janela. */
  seed: string;
  exposures: DailyVocabularyExposure[];
}

export interface DailyVocabularyPrefs {
  enabled: boolean;
  startMin: number;
  endMin: number;
}

export const DAILY_VOCABULARY_DEFAULT_PREFS: DailyVocabularyPrefs = {
  enabled: false,
  startMin: DAILY_VOCABULARY_DEFAULT_WINDOW.startMin,
  endMin: DAILY_VOCABULARY_DEFAULT_WINDOW.endMin,
};

export const DAILY_VOCABULARY_HISTORY_LIMIT = 400;
export const DAILY_VOCABULARY_XP = 2;

/** Chave idempotente do XP da prática diária. */
export function dailyVocabularyRewardKey(accountId: string, dateKey: string, lexicalId: string): string {
  return `daily-vocab:${accountId}:${dateKey}:${lexicalId}`;
}

/**
 * Junta o plano ao histórico: mantém dias passados e tudo que o aluno abriu ou
 * praticou; dias futuros seguem o plano (o candidato pode melhorar).
 */
export function mergeDailyVocabularyAssignments(
  exposures: readonly DailyVocabularyExposure[],
  assignments: readonly DailyVocabularyAssignment[],
  today: string,
  courseDirection: string | null
): DailyVocabularyExposure[] {
  const touched = (entry: DailyVocabularyExposure) => entry.openedAt != null || entry.practicedAt != null;
  const planned = new Map(assignments.map((entry) => [entry.dateKey, entry]));
  const kept = exposures.filter((entry) => {
    if (entry.dateKey < today || touched(entry)) return true;
    const next = planned.get(entry.dateKey);
    return next != null && next.lexicalId === entry.lexicalId;
  });
  const byDay = new Map(kept.map((entry) => [entry.dateKey, entry]));
  for (const assignment of assignments) {
    const current = byDay.get(assignment.dateKey);
    if (current && (current.lexicalId !== assignment.lexicalId || touched(current))) {
      if (current.lexicalId === assignment.lexicalId) byDay.set(assignment.dateKey, { ...current, scheduledAt: assignment.scheduledAt ?? current.scheduledAt });
      continue;
    }
    byDay.set(assignment.dateKey, {
      ...(current ?? {}),
      dateKey: assignment.dateKey,
      lexicalId: assignment.lexicalId,
      courseDirection,
      scheduledAt: assignment.scheduledAt ?? current?.scheduledAt ?? null,
    });
  }
  return [...byDay.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-DAILY_VOCABULARY_HISTORY_LIMIT);
}
