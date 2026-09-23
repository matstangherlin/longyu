/**
 * RC2.2.8 · C — sync silencioso.
 *
 * O CloudSyncBootstrap está certo tecnicamente (push por alteração com
 * debounce, flush a cada 30 s e ao esconder a aba). O problema era o ciclo
 * aparecer na tela: "Sincronização pendente", "Sincronizando…", "Progresso
 * sincronizado", repetidos a cada meio minuto no topo de qualquer página.
 *
 * A regra agora:
 * - pending / loading / synced / idle → SILENCIOSO no fluxo normal. Aparecem
 *   só como estado discreto em Conta, Perfil e Ajustes (C4), nunca como toast.
 * - error → uma notificação acionável, deduplicada por mensagem numa janela
 *   (C5): o mesmo erro a cada 30 s não vira 30 avisos.
 * - EconomySyncBanner continua para erro real de economia (Qi/Carga não
 *   confirmados, Pro pendente…), nunca para "sincronizando…" (C6).
 */

import type { CloudSyncStatus } from "./store";

export type SyncSurface = "silent" | "global";

export const ROUTINE_SYNC_STATUSES: readonly CloudSyncStatus[] = ["idle", "pending", "loading", "synced"];

/** C1/C3 — só erro chega a UI global. */
export function cloudSyncSurface(status: CloudSyncStatus): SyncSurface {
  return status === "error" ? "global" : "silent";
}

export type DiscreteSyncState = "synced" | "saving" | "problem" | "idle";

/** C4 — ✓ Sincronizado · • Salvando… · ! Problema de sincronização. */
export function discreteSyncState(status: CloudSyncStatus): DiscreteSyncState {
  if (status === "error") return "problem";
  if (status === "pending" || status === "loading") return "saving";
  if (status === "synced") return "synced";
  return "idle";
}

export const DISCRETE_SYNC_GLYPH: Record<DiscreteSyncState, string> = {
  synced: "✓",
  saving: "•",
  problem: "!",
  idle: "",
};

/**
 * Mensagens de progresso rotineiro da economia ("Sincronizando Qi...",
 * "Ativando Pro com Pérolas...", "Migrando economia..."). Nunca são globais.
 */
const ROUTINE_MESSAGE_RE = /^(sincronizando|ativando|migrando|resgatando|syncing|activating|migrating)\b/i;

export function isRoutineSyncMessage(message: string | null | undefined): boolean {
  return Boolean(message && ROUTINE_MESSAGE_RE.test(message.trim()));
}

/** C5.1 — janela de dedupe do mesmo erro. */
export const SYNC_ERROR_DEDUPE_MS = 10 * 60 * 1000;

function normalizeMessage(message: string): string {
  return message.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

/**
 * Decide se uma mensagem vai para a UI global. Puro: recebe o histórico e
 * devolve o histórico novo, para ser testável sem relógio real.
 */
export function decideSyncNotice(
  message: string | null,
  now: number,
  lastShownAt: Readonly<Record<string, number>>
): { show: boolean; lastShownAt: Record<string, number> } {
  if (!message) return { show: true, lastShownAt: { ...lastShownAt } };
  if (isRoutineSyncMessage(message)) return { show: false, lastShownAt: { ...lastShownAt } };
  const key = normalizeMessage(message);
  const previous = lastShownAt[key];
  if (previous != null && now - previous < SYNC_ERROR_DEDUPE_MS) {
    return { show: false, lastShownAt: { ...lastShownAt } };
  }
  return { show: true, lastShownAt: { ...lastShownAt, [key]: now } };
}

let noticeHistory: Record<string, number> = {};

/** Porteiro stateful usado pela store (histórico vive por carga da página). */
export function admitSyncNotice(message: string | null, now = Date.now()): boolean {
  const decision = decideSyncNotice(message, now, noticeHistory);
  noticeHistory = decision.lastShownAt;
  return decision.show;
}

/** Só para testes. */
export function resetSyncNoticeHistory(): void {
  noticeHistory = {};
}
