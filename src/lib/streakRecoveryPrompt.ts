/**
 * RC2.2.8 · B — o aviso de ofensiva perdida aparece NO MÁXIMO uma vez por
 * sessão de entrada no site, para o mesmo evento de perda.
 *
 * O spam vinha de o aviso depender só de `pendingStreakRecovery`: "Agora não"
 * limpava o pendente, mas `reconcileStreak` o reconstrói enquanto a janela de
 * recuperação estiver aberta — e qualquer remontagem ou pull da nuvem trazia o
 * modal de volta. A decisão de mostrar passa a ter memória própria, em
 * `sessionStorage` (não localStorage): trocar de aba do app não reapresenta;
 * uma sessão nova do navegador pode lembrar de novo se a recuperação ainda
 * valer; e uma perda nova tem chave nova.
 *
 * Nada aqui toca a oportunidade de recuperação: "Agora não" fecha o aviso, e
 * a janela `streakRecovery` continua aberta até o fim do dia da quebra.
 */

import type { StreakRecovery } from "./streak";

const SESSION_KEY = "longyu:streak-recovery-prompt-shown";

/** B2 — identidade do evento: conta + dia da quebra + ofensiva recuperável. */
export function streakRecoveryEventKey(accountId: string, recovery: StreakRecovery): string {
  return `${accountId}:${recovery.brokenOn}:${recovery.streak}`;
}

export function isStreakRecoveryPromptEligible(input: {
  pending: number | null;
  recovery: StreakRecovery | null;
  today: string;
}): boolean {
  if (input.pending == null || !input.recovery) return false;
  // Janela vencida não merece aviso, mesmo que um pendente antigo sobreviva.
  return input.recovery.brokenOn === input.today;
}

function readShown(storage: Pick<Storage, "getItem"> | undefined): string[] {
  try {
    const raw = storage?.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function sessionStore(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function wasStreakRecoveryPromptShown(
  eventKey: string,
  storage: Pick<Storage, "getItem"> | undefined = sessionStore()
): boolean {
  return readShown(storage).includes(eventKey);
}

/**
 * Marca ANTES de mostrar. Se o storage estiver bloqueado, o pior caso é o
 * aviso aparecer uma vez por carregamento — nunca a cada troca de rota, porque
 * o watcher também guarda a chave aberta em memória.
 */
export function markStreakRecoveryPromptShown(
  eventKey: string,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined = sessionStore()
): void {
  try {
    const shown = readShown(storage);
    if (shown.includes(eventKey)) return;
    storage?.setItem(SESSION_KEY, JSON.stringify([...shown, eventKey].slice(-20)));
  } catch {
    /* storage bloqueado */
  }
}
