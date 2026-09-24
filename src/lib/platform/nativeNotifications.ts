/**
 * RC2.2.13 — notificações locais do Android (@capacitor/local-notifications).
 *
 * Sem push, sem Firebase, sem backend: lembretes agendados no próprio
 * aparelho. Sem alarme exato (SCHEDULE_EXACT_ALARM é removido no manifesto;
 * `isExactNotification: false`). Esta camada NÃO decide nada: recebe o plano
 * pronto de src/lib/studyReminderPlan.ts e o aplica de forma idempotente
 * (cancela os IDs conhecidos e agenda o conjunto novo).
 */
import { LocalNotifications, type PermissionStatus } from "@capacitor/local-notifications";
import type { PluginListenerHandle } from "@capacitor/core";
import { ALL_REMINDER_IDS, type PlannedReminder } from "../studyReminderPlan";
import { isAndroid } from "./nativePlatform";

export type NotificationPermission = "granted" | "denied" | "prompt" | "unavailable";

export const REMINDER_CHANNELS = [
  { id: "streak", name: "Ofensiva", description: "Lembretes para manter sua sequência de estudo." },
  { id: "study", name: "Lembretes de estudo", description: "Avisos para voltar a praticar." },
] as const;

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
    return notifications.map((notification) => notification.id).filter((id) => ALL_REMINDER_IDS.includes(id) || id === 7999);
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
export async function onReminderTap(handler: (url: string | null) => void): Promise<() => void> {
  if (!hasNativeNotifications()) return () => {};
  const handle: PluginListenerHandle = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const url = action?.notification?.extra?.url;
    handler(typeof url === "string" ? url : null);
  });
  return () => {
    void handle.remove();
  };
}
