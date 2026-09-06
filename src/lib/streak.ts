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
  /**
   * Dia (YYYY-MM-DD) em que uma recuperação foi efetivamente consumida.
   *
   * Existe por causa do sync: quando a recuperação some do estado local, "não
   * há janela" e "a janela já foi usada" ficam indistinguíveis, e o merge com a
   * nuvem ressuscita uma janela gasta — o aluno recuperaria a mesma ofensiva
   * duas vezes. Uma marca positiva do consumo resolve isso, porque só cresce e
   * sobrevive ao merge.
   */
  streakRecoveredOn?: string | null;
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
 * Decide a ofensiva ao registrar um dia de estudo.
 * Pressupõe que o dia de hoje ainda não foi contado (lastStudyDate !== today).
 * - gap 1: sequência sobe. gap 2 com escudo: sobe consumindo 1 escudo.
 * - Caso contrário: recomeça em 1 (herda sequência recente na migração suave).
 *
 * A recuperação não mora mais aqui: ela migrou para `applyStreakRecovery`,
 * que só roda em evento de conclusão. O motivo é concreto: a revisão chama o
 * registro de estudo a cada item corrigido, então recuperar aqui significava
 * que responder UMA pergunta já devolvia a ofensiva inteira. A janela agora
 * sobrevive a este cálculo — quem respondeu uma pergunta recomeça em 1 e
 * continua podendo recuperar ao concluir de verdade.
 */
export function computeStudyStreak(s: StreakSlice, today: string): StreakStudyResult {
  let streak = 1;
  let streakShields = s.streakShields;

  if (s.lastStudyDate) {
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

  return {
    streak,
    streakShields,
    streakRecovery: s.streakRecovery,
    pendingStreakRecovery: s.pendingStreakRecovery,
  };
}

export interface StreakRecoveryOutcome {
  /** A recuperação aconteceu AGORA nesta chamada. */
  recovered: boolean;
  streak: number;
  streakRecovery: StreakRecovery | null;
  pendingStreakRecovery: number | null;
  streakRecoveredOn: string | null;
  /** Ofensiva devolvida, para a interface celebrar. `null` quando nada mudou. */
  restored: number | null;
}

/**
 * A recuperação da ofensiva, decidida por um evento de conclusão.
 *
 * A regra da remessa é "estudar normalmente recupera": não existe modo
 * especial, não é preciso tocar em nada antes. O que existe é uma exigência de
 * que o estudo tenha de fato acontecido — abrir a lição, responder uma
 * pergunta e sair não é estudar, concluir é.
 *
 * É idempotente por construção: recuperar fecha a janela e marca o dia do
 * consumo, então uma segunda conclusão no mesmo dia encontra `streakRecovery`
 * nulo e não devolve nada. Chamar de novo é seguro em qualquer ponto.
 */
export function applyStreakRecovery(s: StreakSlice, today: string): StreakRecoveryOutcome {
  const unchanged: StreakRecoveryOutcome = {
    recovered: false,
    streak: s.streak,
    streakRecovery: s.streakRecovery,
    pendingStreakRecovery: s.pendingStreakRecovery,
    streakRecoveredOn: s.streakRecoveredOn ?? null,
    restored: null,
  };

  const open = s.streakRecovery != null && s.streakRecovery.brokenOn === today;
  if (!open) return unchanged;
  // Cinto e suspensório: a janela já consumida hoje nunca paga duas vezes,
  // mesmo que algum caminho a tenha deixado aberta.
  if (s.streakRecoveredOn === today) return unchanged;

  const restored = s.streakRecovery!.streak;
  return {
    recovered: true,
    // A sequência anterior volta, mais o dia de hoje — que acabou de ser
    // estudado, já que só um evento de conclusão chega até aqui.
    streak: restored + 1,
    streakRecovery: null,
    pendingStreakRecovery: null,
    streakRecoveredOn: today,
    restored,
  };
}

/**
 * Reconcilia a recuperação entre o estado local e o da nuvem.
 *
 * Sem isto, entrar e sair da conta reabre uma janela já gasta: o dispositivo
 * que recuperou fica com `streakRecovery` nulo, e "nulo" perdia para o valor
 * antigo que ainda estava na nuvem. A marca de consumo é o desempate — ela só
 * avança, então o lado que recuperou sempre vence.
 */
export function mergeStreakRecovery(
  local: Pick<StreakSlice, "streakRecovery" | "pendingStreakRecovery" | "streakRecoveredOn">,
  remote: Pick<StreakSlice, "streakRecovery" | "pendingStreakRecovery" | "streakRecoveredOn">
): Pick<StreakSlice, "streakRecovery" | "pendingStreakRecovery" | "streakRecoveredOn"> {
  const localOn = local.streakRecoveredOn ?? null;
  const remoteOn = remote.streakRecoveredOn ?? null;
  const streakRecoveredOn =
    localOn && remoteOn ? (localOn >= remoteOn ? localOn : remoteOn) : (localOn ?? remoteOn);

  const l = local.streakRecovery ?? null;
  const r = remote.streakRecovery ?? null;
  const window = !l ? r : !r ? l : l.brokenOn >= r.brokenOn ? l : r;

  // Janela já paga: não volta, e o aviso dela também não.
  if (window && streakRecoveredOn && streakRecoveredOn >= window.brokenOn) {
    return { streakRecovery: null, pendingStreakRecovery: null, streakRecoveredOn };
  }
  return {
    streakRecovery: window,
    pendingStreakRecovery: local.pendingStreakRecovery ?? remote.pendingStreakRecovery ?? null,
    streakRecoveredOn,
  };
}
