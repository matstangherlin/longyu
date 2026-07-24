// Lógica pura da ofensiva (streak). Isolada aqui para poder ser testada sem o
// resto do store: zera após 24h (um dia inteiro) sem estudo e abre uma janela
// de recuperação de 24h — recuperável fazendo um exercício no dia da quebra.

import { daysBetween } from "./storage";

/**
 * Janela de recuperação da ofensiva: quando o aluno passa 24h (um dia inteiro)
 * sem estudar, a ofensiva zera — mas ele ainda tem o dia da quebra para
 * recuperá-la fazendo um exercício. Só existe enquanto a janela está aberta.
 */
export interface StreakRecovery {
  /** Ofensiva que estava ativa antes de quebrar (é ela que volta ao recuperar). */
  streak: number;
  /** Dia (local, YYYY-MM-DD) em que a ofensiva quebrou; recuperável só nesse dia. */
  brokenOn: string;
}

/** Fatia da ofensiva que as funções puras precisam ler. */
export interface StreakSlice {
  streak: number;
  lastStudyDate: string | null;
  lastActive: string | null;
  streakShields: number;
  streakRecovery: StreakRecovery | null;
  pendingStreakRecovery: number | null;
}

export interface StreakReconcileResult {
  streak: number;
  streakRecovery: StreakRecovery | null;
  pendingStreakRecovery: number | null;
  /** true quando algum campo mudou (para o store decidir se persiste). */
  changed: boolean;
}

/**
 * Reconcilia a ofensiva com o tempo real (chamado ao abrir o app).
 * - gap 0/1 (estudou hoje/ontem): ofensiva intacta.
 * - gap === 2 com escudo: escudo protege a folga de 1 dia (consumido ao estudar).
 * - gap >= 2 sem proteção: a ofensiva ZERA; se perdeu exatamente 1 dia, abre a
 *   janela de recuperação (aviso + recuperar estudando) só no dia da quebra.
 */
export function reconcileStreak(s: StreakSlice, today: string): StreakReconcileResult {
  const noChange: StreakReconcileResult = {
    streak: s.streak,
    streakRecovery: s.streakRecovery,
    pendingStreakRecovery: s.pendingStreakRecovery,
    changed: false,
  };
  const cleared = (): StreakReconcileResult => {
    if (s.streakRecovery == null && s.pendingStreakRecovery == null) return noChange;
    return { streak: s.streak, streakRecovery: null, pendingStreakRecovery: null, changed: true };
  };

  // Sem estudo registrado ainda: nada de ofensiva para reconciliar.
  if (!s.lastStudyDate) return cleared();

  const gap = daysBetween(s.lastStudyDate, today);
  // gap 0 = estudou hoje; gap 1 = estudou ontem → ofensiva intacta.
  if (gap <= 1) return cleared();

  // gap >= 2: passou um dia inteiro sem estudar. Escudo protege uma folga de
  // exatamente 1 dia — deixa o recordStudyDay consumi-lo ao estudar.
  if (gap === 2 && s.streakShields > 0) return noChange;

  if (s.streak > 0) {
    // Primeira vez que detectamos a quebra: a ofensiva zera agora.
    const brokenStreak = s.streak;
    const recoverable = gap === 2; // só recupera se perdeu exatamente 1 dia
    const streakRecovery: StreakRecovery | null = recoverable
      ? { streak: brokenStreak, brokenOn: today }
      : null;
    const pendingStreakRecovery = recoverable ? brokenStreak : null;
    return { streak: 0, streakRecovery, pendingStreakRecovery, changed: true };
  }

  // Ofensiva já está zerada. Se havia recuperação e o dia da quebra passou,
  // a janela de 24h expirou de vez.
  if (s.streakRecovery && s.streakRecovery.brokenOn !== today) return cleared();

  // Recuperação ainda válida hoje: reexibe o aviso ao abrir a tela.
  if (s.streakRecovery && s.streakRecovery.brokenOn === today && s.pendingStreakRecovery == null) {
    return {
      streak: 0,
      streakRecovery: s.streakRecovery,
      pendingStreakRecovery: s.streakRecovery.streak,
      changed: true,
    };
  }

  return noChange;
}

export interface StreakStudyResult {
  streak: number;
  streakShields: number;
  streakRecovery: StreakRecovery | null;
  pendingStreakRecovery: number | null;
}

/**
 * Decide a ofensiva ao registrar um dia de estudo (lição/revisão concluída).
 * Pressupõe que o dia de hoje ainda não foi contado (lastStudyDate !== today).
 * - Recuperação aberta hoje: restaura a sequência anterior + o dia de hoje.
 * - gap 1: sequência sobe. gap 2 com escudo: sobe consumindo 1 escudo.
 * - Caso contrário: recomeça em 1 (herda sequência recente na migração suave).
 */
export function computeStudyStreak(s: StreakSlice, today: string): StreakStudyResult {
  let streak = 1;
  let streakShields = s.streakShields;
  let streakRecovery = s.streakRecovery;

  const recovering = s.streakRecovery != null && s.streakRecovery.brokenOn === today;
  if (recovering) {
    streak = s.streakRecovery!.streak + 1;
    streakRecovery = null;
  } else if (s.lastStudyDate) {
    const gap = daysBetween(s.lastStudyDate, today);
    if (gap === 1) {
      streak = s.streak + 1;
    } else if (gap === 2 && streakShields > 0) {
      streak = s.streak + 1;
      streakShields -= 1;
    }
  } else if (s.lastActive && daysBetween(s.lastActive, today) <= 1 && s.streak > 0) {
    // Migração suave: primeira contagem por estudo herda sequência recente.
    streak = s.streak;
  }

  // Estudar em qualquer situação encerra o aviso de recuperação pendente.
  return { streak, streakShields, streakRecovery, pendingStreakRecovery: null };
}
