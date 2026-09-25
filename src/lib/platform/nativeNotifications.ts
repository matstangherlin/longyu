/**
 * RC2.2.13 — notificações locais do Android (@capacitor/local-notifications).
 *
 * Sem push, sem Firebase, sem backend: lembretes agendados no próprio
 * aparelho. Sem alarme exato (SCHEDULE_EXACT_ALARM é removido no manifesto;
 * `isExactNotification: false`). Esta camada não decide nada: recebe o plano
 * pronto de src/lib/studyReminderPlan.ts e o aplica de forma idempotente
 * (cancela os IDs conhecidos e agenda o conjunto novo).
 */
import { LocalNotifications, type PermissionStatus } from "@capacitor/local-notifications";
import type { PluginListenerHandle } from "@capacitor/core";
import { ALL_REMINDER_IDS, type PlannedReminder } from "../studyReminderPlan";
import {
  DAILY_VOCABULARY_CHANNEL,
  DAILY_VOCABULARY_DEV_ID,
  DAILY_VOCABULARY_IDS,
  type PlannedVocabularyNotification,
} from "../dailyVocabularyPlan";
import { isAndroid } from "./nativePlatform";

export type NotificationPermission = "granted" | "denied" | "prompt" | "unavailable";

export const REMINDER_CHANNELS = [
  { id: "streak", name: "Ofensiva", description: "Lembretes para manter sua sequência de estudo." },
  { id: "study", name: "Lembretes de estudo", description: "Avisos para voltar a praticar." },
] as const;

/**
 * RC2.2.15 · A/DD — canal próprio da Palavra do dia (não mistura com ofensiva
 * nem estudo). Importância padrão, sem vibração: discreto, nunca alarme.
 */
export const VOCABULARY_CHANNEL_COPY = {
  "pt-BR": { name: "Palavra do dia", description: "Descubra uma palavra curta em mandarim por dia." },
  en: { name: "Daily vocabulary", description: "Discover one short Mandarin word a day." },
} as const;

/** Ícone monocromático da barra de status (res/drawable/ic_stat_longyu.xml). */
export const NOTIFICATION_SMALL_ICON = "ic_stat_longyu";

export function hasNativeNotifications(): boolean {
  return isAndroid();
}

function mapPermission(status: PermissionStatus | null | undefined): NotificationPermission {
  const display = status?.display;
  if (display === "granted") return "granted";
  if (display === "denied") return "denied";
  return "prompt";
}

/** Estado REAL do SO (nunca o que o store acha). */
export async function notificationPermission(): Promise<NotificationPermission> {
  if (!hasNativeNotifications()) return "unavailable";
  try {
    return mapPermission(await LocalNotifications.checkPermissions());
  } catch {
    return "unavailable";
  }
}

/** Android 13+: diálogo do sistema. Android ≤12: já concedida, sem diálogo. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!hasNativeNotifications()) return "unavailable";
  try {
    return mapPermission(await LocalNotifications.requestPermissions());
  } catch {
    return "denied";
  }
}

let channelsReady = false;

export async function ensureReminderChannels(): Promise<void> {
  if (!hasNativeNotifications() || channelsReady) return;
  for (const channel of REMINDER_CHANNELS) {
    // Importância padrão (3): som/vibração do canal, sem heads-up de alarme.
    await LocalNotifications.createChannel({ id: channel.id, name: channel.name, description: channel.description, importance: 3 });
  }
  channelsReady = true;
}

let vocabularyChannelLocale: "pt-BR" | "en" | null = null;

export async function ensureVocabularyChannel(locale: "pt-BR" | "en" = "pt-BR"): Promise<void> {
  if (!hasNativeNotifications() || vocabularyChannelLocale === locale) return;
  const copy = VOCABULARY_CHANNEL_COPY[locale];
  await LocalNotifications.createChannel({ id: DAILY_VOCABULARY_CHANNEL, name: copy.name, description: copy.description, importance: 3, vibration: false });
  vocabularyChannelLocale = locale;
}

/** Cancela SÓ as palavras do dia (toggle off, janela nova). Ofensiva/retorno ficam. */
export async function cancelVocabularyNotifications(): Promise<void> {
  if (!hasNativeNotifications()) return;
  try {
    await LocalNotifications.cancel({ notifications: DAILY_VOCABULARY_IDS.map((id) => ({ id })) });
  } catch {
    /* nada pendente */
  }
}

/**
 * Aplica o plano da Palavra do dia: cancela os 7 IDs de vocabulário e agenda
 * o conjunto recebido. Nunca toca nos IDs de ofensiva/retorno.
 */
export async function applyVocabularyPlan(plan: readonly PlannedVocabularyNotification[], locale: "pt-BR" | "en" = "pt-BR"): Promise<number> {
  if (!hasNativeNotifications()) return 0;
  await cancelVocabularyNotifications();
  if (!plan.length) return 0;
  await ensureVocabularyChannel(locale);
  await LocalNotifications.schedule({ notifications: plan.map(vocabularyNotification) });
  return plan.length;
}

/** DEV/QA: uma palavra em +60 s (ID próprio, fora dos 7 do plano). */
export async function scheduleDevVocabularyNotification(notification: PlannedVocabularyNotification, locale: "pt-BR" | "en" = "pt-BR"): Promise<void> {
  if (!hasNativeNotifications()) return;
  await ensureVocabularyChannel(locale);
  await LocalNotifications.schedule({ notifications: [vocabularyNotification({ ...notification, id: DAILY_VOCABULARY_DEV_ID })] });
}

function vocabularyNotification(item: PlannedVocabularyNotification) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    channelId: DAILY_VOCABULARY_CHANNEL,
    smallIcon: NOTIFICATION_SMALL_ICON,
    schedule: { at: new Date(item.at), allowWhileIdle: false },
    isExactNotification: false,
    // O toque valida `lexicalId` contra o pool; nenhuma URL do extra é confiada.
    extra: { kind: item.kind, lexicalId: item.lexicalId },
  };
}

/** Cancela TODOS os lembretes do Longyu (toggle off, permissão negada). */
export async function cancelAllReminders(): Promise<void> {
  if (!hasNativeNotifications()) return;
  try {
    await LocalNotifications.cancel({ notifications: ALL_REMINDER_IDS.map((id) => ({ id })) });
  } catch {
    /* nada pendente */
  }
}

/**
 * Aplica o plano: cancela os IDs conhecidos e agenda exatamente o conjunto
 * recebido. Chamar 10 vezes seguidas deixa o mesmo conjunto (IDs fixos).
 */
export async function applyReminderPlan(plan: readonly PlannedReminder[]): Promise<number> {
  if (!hasNativeNotifications()) return 0;
  await cancelAllReminders();
  if (!plan.length) return 0;
  await ensureReminderChannels();
  await LocalNotifications.schedule({
    notifications: plan.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      body: reminder.body,
      channelId: reminder.channelId,
      smallIcon: NOTIFICATION_SMALL_ICON,
      schedule: { at: new Date(reminder.at), allowWhileIdle: false },
      // Lembrete de estudo não é alarme: agendamento inexato.
      isExactNotification: false,
      extra: { url: reminder.url, kind: reminder.kind },
    })),
  });
  return plan.length;
}

export async function pendingReminderIds(): Promise<number[]> {
  if (!hasNativeNotifications()) return [];
  try {
    const { notifications } = await LocalNotifications.getPending();
    return notifications
      .map((notification) => notification.id)
      .filter((id) => ALL_REMINDER_IDS.includes(id) || id === 7999 || DAILY_VOCABULARY_IDS.includes(id) || id === DAILY_VOCABULARY_DEV_ID);
  } catch {
    return [];
  }
}

/** DEV/QA: agenda um único lembrete (ex.: +60 s) sem mexer na regra de produção. */
export async function scheduleSingleReminder(reminder: PlannedReminder): Promise<void> {
  if (!hasNativeNotifications()) return;
  await ensureReminderChannels();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        channelId: reminder.channelId,
        smallIcon: NOTIFICATION_SMALL_ICON,
        schedule: { at: new Date(reminder.at), allowWhileIdle: false },
        isExactNotification: false,
        extra: { url: reminder.url, kind: reminder.kind },
      },
    ],
  });
}

/**
 * Toque na notificação → URL do lembrete (com.longyu.app://…). Quem chama
 * passa a URL pelo resolveDeepLink (allowlist do RC2.2.10); rota fora da
 * lista é ignorada. Registrar UMA vez; devolve o "remover".
 */
export interface ReminderTapExtra {
  kind: string | null;
  lexicalId: string | null;
}

export async function onReminderTap(handler: (url: string | null, extra: ReminderTapExtra) => void): Promise<() => void> {
  if (!hasNativeNotifications()) return () => {};
  const handle: PluginListenerHandle = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const extra = action?.notification?.extra ?? {};
    const url = extra.url;
    handler(typeof url === "string" ? url : null, {
      kind: typeof extra.kind === "string" ? extra.kind : null,
      lexicalId: typeof extra.lexicalId === "string" ? extra.lexicalId : null,
    });
  });
  return () => {
    void handle.remove();
  };
}
