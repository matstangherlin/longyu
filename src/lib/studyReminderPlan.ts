/**
 * RC2.2.13 — lembretes locais de estudo (Android). Função PURA: recebe o
 * estado da ofensiva que o Longyu já tem e devolve o conjunto COMPLETO de
 * lembretes que devem estar pendentes. Quem agenda (src/lib/platform/
 * nativeNotifications.ts) só cancela os antigos e agenda este conjunto.
 *
 * Fonte de verdade: a ofensiva existente (`streak`, `lastStudyDate` e a regra
 * de src/lib/streak.ts). Estudou no dia D → a ofensiva vale até o fim de D+1
 * e quebra na virada para D+2. Nada de motor de ofensiva paralelo.
 *
 * Regras (RC2.2.13 · AX–BO):
 * - risco: UM lembrete, D+1 às 21:00 (~3 h antes de perder), cópia por tamanho
 *   da ofensiva (1, 2, 3, 4, 5–6, marcos 7/14/30/50/100, risco genérico);
 * - retorno: D+2, D+3 e D+4 às 21:00 (cópias diferentes) e PARA no dia 4;
 * - no máximo 1 lembrete automático a cada 24 h (horários espaçados em dias);
 * - silêncio 22:00–08:00 no fuso do aparelho: horário que cairia ali vai para
 *   08:00; lembrete de risco que só caberia depois da quebra é descartado;
 * - estudar de novo muda `lastStudyDate` → o plano inteiro é refeito (IDs
 *   fixos: nunca acumula).
 */

export type ReminderLocale = "pt-BR" | "en";
export type ReminderKind = "risk" | "comeback";
export type ReminderChannel = "streak" | "study";

export interface ReminderPrefs {
  enabled: boolean;
  streak: boolean;
  comeback: boolean;
}

export interface PlannedReminder {
  id: number;
  kind: ReminderKind;
  channelId: ReminderChannel;
  /** Epoch ms (hora local já resolvida). */
  at: number;
  title: string;
  body: string;
  /** Destino aprovado; o toque passa pelo resolveDeepLink do RC2.2.10. */
  url: string;
}

/** IDs fixos: reagendar substitui, nunca empilha. */
export const REMINDER_IDS = { risk: 7001, comeback2: 7102, comeback3: 7103, comeback4: 7104 } as const;
export const ALL_REMINDER_IDS: readonly number[] = Object.values(REMINDER_IDS);
export const REMINDER_HOUR = 21;
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;
export const COMEBACK_DAYS = [2, 3, 4] as const;
export const MIN_REMINDER_GAP_MS = 23 * 60 * 60 * 1000; // 24 h, com folga de 1 h para horário de verão
export const LATE_RISK_DELAY_MS = 10 * 60 * 1000;
export const REMINDER_URL_RISK = "com.longyu.app://jornada";
export const REMINDER_URL_COMEBACK = "com.longyu.app://revisao";
export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: true, streak: true, comeback: true };

// ── Cópias ────────────────────────────────────────────────────────────────

type Copy = { title: string; body: string };

const MILESTONES_PT: Record<number, Copy> = {
  7: { title: "🔥 Uma semana de ofensiva", body: "Sete dias seguidos. Uma prática curta hoje mantém a semana completa." },
  14: { title: "🔥 Duas semanas seguidas", body: "14 dias de mandarim. Não deixe a chama apagar hoje." },
  30: { title: "🔥 Um mês de ofensiva", body: "30 dias seguidos. Uma revisão rápida protege esse mês inteiro." },
  50: { title: "🔥 50 dias de ofensiva", body: "Cinquenta dias de estudo. Mantenha a chama com uma prática curta." },
  100: { title: "🔥 100 dias de ofensiva", body: "Cem dias seguidos. Cinco minutos hoje mantêm essa marca." },
};
const MILESTONES_EN: Record<number, Copy> = {
  7: { title: "🔥 One week of streak", body: "Seven days in a row. A short practice today keeps the full week." },
  14: { title: "🔥 Two weeks in a row", body: "14 days of Mandarin. Don't let the flame go out today." },
  30: { title: "🔥 One month of streak", body: "30 days in a row. A quick review protects the whole month." },
  50: { title: "🔥 50-day streak", body: "Fifty days of study. Keep the flame with a short practice." },
  100: { title: "🔥 100-day streak", body: "One hundred days in a row. Five minutes today keeps that mark." },
};

/** Cópia do lembrete de risco pelo tamanho da ofensiva que está em jogo. */
export function streakRiskCopy(streak: number, locale: ReminderLocale = "pt-BR"): Copy {
  const n = Math.max(1, Math.floor(streak));
  const en = locale === "en";
  const milestone = (en ? MILESTONES_EN : MILESTONES_PT)[n];
  if (milestone) return milestone;
  if (n === 1) {
    return en
      ? { title: "🔥 Your flame has started", body: "Do a short practice to keep your streak going." }
      : { title: "🔥 Sua chama começou", body: "Faça uma prática curta para manter sua ofensiva amanhã." };
  }
  if (n === 2) {
    return en
      ? { title: "🔥 2 days in a row", body: "You're building a rhythm. Practice a bit to keep the flame alive." }
      : { title: "🔥 2 dias seguidos", body: "Você já está criando ritmo. Faça uma prática para manter a chama acesa." };
  }
  if (n === 3) {
    return en
      ? { title: "🔥 3-day streak", body: "Three days in a row. Don't let your streak stop now." }
      : { title: "🔥 3 dias de ofensiva", body: "Três dias seguidos. Não deixe sua sequência parar agora." };
  }
  if (n === 4) {
    return en
      ? { title: "🔥 4 days in a row", body: "Your streak is getting strong. A quick review keeps the cycle going." }
      : { title: "🔥 4 dias seguidos", body: "Sua ofensiva está ficando forte. Uma revisão rápida mantém o ciclo." };
  }
  if (n <= 6) {
    return en
      ? { title: `🔥 ${n} days in a row`, body: "Take a few minutes to keep your streak." }
      : { title: `🔥 ${n} dias seguidos`, body: "Reserve alguns minutos para manter sua ofensiva." };
  }
  return en
    ? { title: `🔥 Your ${n}-day streak is at risk`, body: "Do a lesson or review before the flame goes out." }
    : { title: `🔥 Sua ofensiva de ${n} dias está em risco`, body: "Faça uma lição ou revisão antes que a chama apague." };
}

/** Cópias de retorno: dias 2, 3 e 4 longe. Depois disso, silêncio. */
export function comebackCopy(daysAway: number, locale: ReminderLocale = "pt-BR"): Copy | null {
  const en = locale === "en";
  if (daysAway === 2) {
    return en
      ? { title: "🐉 Two days away from Mandarin", body: "Come back with a short practice. You don't need to catch up all at once." }
      : { title: "🐉 Dois dias longe do mandarim", body: "Volte com uma prática curta. Não precisa recuperar tudo de uma vez." };
  }
  if (daysAway === 3) {
    return en
      ? { title: "🐉 It's been 3 days", body: "Five minutes of review puts you back on track." }
      : { title: "🐉 Faz 3 dias", body: "Cinco minutos de revisão já colocam você de volta no caminho." };
  }
  if (daysAway === 4) {
    return en
      ? { title: "🐉 Longyu is waiting for you", body: "Pick a short review and pick up at your own pace." }
      : { title: "🐉 O Longyu está te esperando", body: "Escolha uma revisão curta e retome no seu ritmo." };
  }
  return null;
}

// ── Tempo local ───────────────────────────────────────────────────────────

function parseDayKey(dayKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function atLocal(day: Date, addDays: number, hour: number, minute = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + addDays, hour, minute, 0, 0);
}

export function isQuietHour(date: Date): boolean {
  const hour = date.getHours();
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** Fora do silêncio: 22:00–07:59 → 08:00 (do mesmo dia se madrugada, do seguinte se noite). */
export function applyQuietHours(date: Date): Date {
  if (!isQuietHour(date)) return date;
  const base = date.getHours() >= QUIET_START_HOUR ? atLocal(date, 1, QUIET_END_HOUR) : atLocal(date, 0, QUIET_END_HOUR);
  return base;
}

// ── Plano ─────────────────────────────────────────────────────────────────

export interface ReminderPlanInput {
  now: number;
  streak: number;
  lastStudyDate: string | null;
  prefs: ReminderPrefs;
  /** Permissão do SO (POST_NOTIFICATIONS). Sem ela, nada é agendado. */
  permissionGranted: boolean;
  locale?: ReminderLocale;
}

export function planStudyReminders(input: ReminderPlanInput): PlannedReminder[] {
  const { now, prefs } = input;
  if (!input.permissionGranted || !prefs.enabled || !input.lastStudyDate) return [];
  const lastDay = parseDayKey(input.lastStudyDate);
  if (!lastDay) return [];
  const locale = input.locale ?? "pt-BR";
  const plan: PlannedReminder[] = [];

  // Risco: a ofensiva quebra na virada para D+2.
  if (prefs.streak && input.streak >= 1) {
    const breaksAt = atLocal(lastDay, 2, 0).getTime();
    let at = atLocal(lastDay, 1, REMINDER_HOUR).getTime();
    if (at <= now) {
      // Já passou das 21:00 do último dia: um aviso logo, se ainda der tempo e não for madrugada/noite tardia.
      const soon = new Date(now + LATE_RISK_DELAY_MS);
      at = !isQuietHour(soon) && soon.getTime() < breaksAt ? soon.getTime() : Number.NaN;
    }
    if (Number.isFinite(at)) {
      const quiet = applyQuietHours(new Date(at)).getTime();
      if (quiet < breaksAt) {
        const copy = streakRiskCopy(input.streak, locale);
        plan.push({ id: REMINDER_IDS.risk, kind: "risk", channelId: "streak", at: quiet, ...copy, url: REMINDER_URL_RISK });
      }
    }
  }

  // Retorno: D+2, D+3, D+4 (e só). Depois do dia 4, nada até o aluno voltar.
  if (prefs.comeback) {
    const ids = [REMINDER_IDS.comeback2, REMINDER_IDS.comeback3, REMINDER_IDS.comeback4];
    COMEBACK_DAYS.forEach((days, index) => {
      const at = applyQuietHours(atLocal(lastDay, days, REMINDER_HOUR)).getTime();
      if (at <= now) return;
      const copy = comebackCopy(days, locale);
      if (copy) plan.push({ id: ids[index], kind: "comeback", channelId: "study", at, ...copy, url: REMINDER_URL_COMEBACK });
    });
  }

  // No máximo 1 lembrete automático por 24 h.
  plan.sort((a, b) => a.at - b.at);
  const spaced: PlannedReminder[] = [];
  for (const reminder of plan) {
    const previous = spaced[spaced.length - 1];
    if (!previous || reminder.at - previous.at >= MIN_REMINDER_GAP_MS) spaced.push(reminder);
  }
  return spaced;
}

/** DEV/QA: o MESMO lembrete de risco, disparando em +60 s. Nunca para aluno. */
export function devTestReminder(now: number, streak: number, locale: ReminderLocale = "pt-BR"): PlannedReminder {
  const copy = streakRiskCopy(Math.max(1, streak), locale);
  return { id: 7999, kind: "risk", channelId: "streak", at: now + 60_000, ...copy, url: REMINDER_URL_RISK };
}
