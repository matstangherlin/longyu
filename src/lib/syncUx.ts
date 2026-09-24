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

// ── RC2.2.11 — syncNoticePolicy: a política ÚNICA de aviso de sync ──────────
//
// O RC2.2.8 silenciou a rotina, mas uma única falha transitória (timeout,
// rede oscilando) ainda virava `error` na hora e aparecia como faixa global
// "Erro ao sincronizar…" no meio da aula. Agora:
// - rotina (idle/pending/loading/synced) → silencioso;
// - falha transitória → continua "pending" (silencioso) e é re-tentada
//   sozinha; se recuperar, o aluno nunca vê nada;
// - falha persistente (N tentativas seguidas OU janela de tempo) → UM aviso
//   calmo, deduplicado por tipo de erro + recurso + janela;
// - falha que ameaça perder/confirmar uma ação → visível na hora.
// Nenhum componente decide isso sozinho: todos passam por aqui.

export type SyncNoticeSurface = "silent" | "discrete" | "global";

export const SYNC_PERSISTENT_FAILURES = 3;
export const SYNC_PERSISTENT_WINDOW_MS = 2 * 60 * 1000;
export const SYNC_TRANSIENT_RETRY_MS = 5_000;
export const PERSISTENT_SYNC_MESSAGE = "Seu progresso está salvo neste dispositivo. Tentaremos sincronizar novamente.";

export type SyncFailureTrack = { count: number; firstAt: number; notifiedAt: number | null };
export type SyncNoticePolicyState = Readonly<Record<string, SyncFailureTrack>>;

export type SyncNoticeEvent =
  | { kind: "routine"; resource: string; status: Exclude<CloudSyncStatus, "error">; now: number }
  | { kind: "success"; resource: string; now: number }
  | { kind: "failure"; resource: string; errorKind: string; now: number; threatensLoss?: boolean };

export type SyncNoticeDecision = {
  /** Estado que a store deve registrar (transitório fica "pending"). */
  status: CloudSyncStatus;
  surface: SyncNoticeSurface;
  message: string | null;
  /** Falha transitória: agendar nova tentativa silenciosa. */
  retry: boolean;
  state: Record<string, SyncFailureTrack>;
};

/** Chave de dedupe: tipo de erro + recurso + janela. */
export function syncNoticeKey(errorKind: string, resource: string, now: number): string {
  return `${errorKind}:${resource}:${Math.floor(now / SYNC_ERROR_DEDUPE_MS)}`;
}

export function syncNoticePolicy(state: SyncNoticePolicyState, event: SyncNoticeEvent): SyncNoticeDecision {
  const next: Record<string, SyncFailureTrack> = { ...state };
  if (event.kind === "routine") {
    return { status: event.status, surface: "silent", message: null, retry: false, state: next };
  }
  if (event.kind === "success") {
    delete next[event.resource];
    return { status: "synced", surface: "silent", message: null, retry: false, state: next };
  }
  const previous = next[event.resource];
  const track: SyncFailureTrack = previous
    ? { ...previous, count: previous.count + 1 }
    : { count: 1, firstAt: event.now, notifiedAt: null };
  next[event.resource] = track;
  if (event.threatensLoss) {
    track.notifiedAt = event.now;
    return { status: "error", surface: "global", message: PERSISTENT_SYNC_MESSAGE, retry: false, state: next };
  }
  const persistent = track.count >= SYNC_PERSISTENT_FAILURES || event.now - track.firstAt >= SYNC_PERSISTENT_WINDOW_MS;
  if (!persistent) {
    return { status: "pending", surface: "silent", message: null, retry: true, state: next };
  }
  const alreadyNotified = track.notifiedAt != null && event.now - track.notifiedAt < SYNC_ERROR_DEDUPE_MS;
  if (alreadyNotified) {
    return { status: "error", surface: "discrete", message: PERSISTENT_SYNC_MESSAGE, retry: false, state: next };
  }
  track.notifiedAt = event.now;
  return { status: "error", surface: "global", message: PERSISTENT_SYNC_MESSAGE, retry: false, state: next };
}

let policyState: Record<string, SyncFailureTrack> = {};

/** Porteiro stateful usado pelo coordenador de sync (vive por carga da página). */
export function applySyncNoticePolicy(event: SyncNoticeEvent): SyncNoticeDecision {
  const decision = syncNoticePolicy(policyState, event);
  policyState = decision.state;
  return decision;
}

/** Só para testes. */
export function resetSyncNoticePolicy(): void {
  policyState = {};
}
