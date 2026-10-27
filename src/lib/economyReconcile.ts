/**
 * LGY-009 / LGY-018 — reconciliação de Qi e Cargas.
 *
 * O servidor é a fonte da verdade quando a fila local está vazia, inclusive
 * se o saldo de lá for menor (anti-cheat). Enquanto houver intenção pendente
 * desta conta, um snapshot mais baixo não apaga o crédito local: ele espera
 * a mesma idempotencyKey. Replay de lição já concluída não rende Qi.
 */

export type EconomyBalance = { qi: number; charges: number };

export function isMissingEconomyRpc(error: string | null | undefined): boolean {
  if (!error) return false;
  return /PGRST202|404|could not find the function|schema cache|does not exist/i.test(error);
}

export function reconcileEconomyBalance(
  local: EconomyBalance,
  server: EconomyBalance,
  pendingCount: number
): EconomyBalance & { heldLocalGrant: boolean } {
  const held = pendingCount > 0 && (local.qi > server.qi || local.charges > server.charges);
  if (!held) return { qi: server.qi, charges: server.charges, heldLocalGrant: false };
  return {
    qi: Math.max(local.qi, server.qi),
    charges: Math.max(local.charges, server.charges),
    heldLocalGrant: true,
  };
}

/** Primeira conclusão pode render Qi. Repetir a lição não. */
export function replayGrantsQi(firstCompletion: boolean): boolean {
  return firstCompletion;
}
