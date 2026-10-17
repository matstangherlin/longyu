import type { EconomyRpcResult } from "./economyTypes";
import { readOnline } from "./platform/networkStatus";

/**
 * RC2.3.13R.3.2.5 — presentation of an economy intent the server did not
 * answer. The bridge queues every transport failure for retry (the queue and
 * the amounts are unchanged here), so offline the learner is not told "not
 * confirmed by the server" — let alone "finish the lesson for real" — about
 * an intent that is simply waiting for the network. A real server answer
 * (`ok: false` with a reason) keeps its specific message.
 */
export const ECONOMY_PENDING_OFFLINE_MESSAGE = "Salvo neste aparelho — confirmamos quando a conexão voltar.";

const NETWORK_ERROR = /fetch|network|load failed|timeout|timed out|offline|cliente indisponível|connection/i;

export function isPendingNetworkFailure(result: EconomyRpcResult & { retry_pending?: boolean }): boolean {
  if (result.ok || result.already_applied) return false;
  if (result.retry_pending) return true;
  if (!readOnline()) return true;
  return NETWORK_ERROR.test(result.error ?? "");
}

export function economyFailureMessage(result: EconomyRpcResult, serverMessage: string): string {
  return isPendingNetworkFailure(result) ? ECONOMY_PENDING_OFFLINE_MESSAGE : serverMessage;
}
