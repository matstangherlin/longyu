/**
 * RC2.2.19 — ReviewSessionComposer (P2 REVIEW_TOO_DENSE /
 * REVIEW_MONOTONOUS_REPETITION / HANZI_TOO_SMALL_IN_REVIEW).
 *
 * Compõe a sessão EM CIMA da fila que o SRS já produz (dueItems →
 * buildReviewQueue). Não cria SRS novo, não muda agenda, nota nem prioridade:
 * só a ORDEM de apresentação, o tamanho das rodadas e o formato da repetição.
 *
 * - Rodadas de 5 a 8 itens (respiro entre elas), nunca um bloco de 20.
 * - O mesmo alvo (hànzì/palavra) nunca aparece duas vezes seguidas, mesmo
 *   vindo de domínios diferentes (forma de 好 → som de 好).
 * - Repetição transformada: a 2ª aparição do mesmo alvo na sessão pede outro
 *   formato de exercício (`formatShift`).
 * - Hànzì grandes: principal 64–80 px, opções 48–60 px, pares 44–52 px.
 */

export const REVIEW_ROUND_MIN = 5;
export const REVIEW_ROUND_MAX = 8;
export const REVIEW_ROUND_PREFERRED = 6;

export const REVIEW_HANZI_SIZE_PX = {
  main: { min: 64, max: 80 },
  option: { min: 48, max: 60 },
  pair: { min: 44, max: 52 },
} as const;

/** Classes Tailwind que materializam REVIEW_HANZI_SIZE_PX (mobile → sm). */
export const REVIEW_HANZI_CLASS = {
  main: "text-[64px] leading-tight sm:text-[80px]",
  option: "text-[48px] leading-tight sm:text-[60px]",
  pair: "text-[44px] leading-tight sm:text-[52px]",
} as const;

/**
 * Tamanho da rodada: sessões curtas são uma rodada só; as longas são
 * divididas em rodadas de 5–8 sem deixar uma sobra minúscula no fim.
 */
export function reviewRoundSize(total: number): number {
  const safe = Math.max(0, Math.floor(total));
  if (safe <= REVIEW_ROUND_MAX) return Math.max(1, safe);
  let best = REVIEW_ROUND_PREFERRED;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let size = REVIEW_ROUND_MIN; size <= REVIEW_ROUND_MAX; size += 1) {
    const rest = safe % size;
    // Sobra 0 é perfeita; sobra < mínimo vira rodada anêmica (penaliza).
    const score = (rest === 0 ? 0 : rest < REVIEW_ROUND_MIN ? 10 + (REVIEW_ROUND_MIN - rest) : 1) + Math.abs(size - REVIEW_ROUND_PREFERRED) * 0.1;
    if (score < bestScore) {
      bestScore = score;
      best = size;
    }
  }
  return best;
}

export interface ReviewRoundPosition {
  round: number;
  totalRounds: number;
  indexInRound: number;
  roundSize: number;
  /** Última tarefa da rodada (hora do respiro). */
  roundEnd: boolean;
}

export function reviewRoundPosition(pos: number, total: number): ReviewRoundPosition {
  const size = reviewRoundSize(total);
  const totalRounds = Math.max(1, Math.ceil(Math.max(1, total) / size));
  const round = Math.min(totalRounds, Math.floor(Math.max(0, pos) / size) + 1);
  const indexInRound = (Math.max(0, pos) % size) + 1;
  const thisRoundSize = round === totalRounds ? Math.max(1, total - (totalRounds - 1) * size) : size;
  return { round, totalRounds, indexInRound, roundSize: thisRoundSize, roundEnd: indexInRound >= thisRoundSize };
}

/**
 * RC2.2.20 — o mesmo alvo só volta depois de pelo menos MIN_TARGET_GAP OUTROS
 * alvos (ideal: 你好 … 2 outros … 你好). Com fila pequena, degrada: escolhe o
 * alvo que está há mais tempo sem aparecer (nunca trava nem remove item).
 */
export const MIN_TARGET_GAP = 2;

/**
 * Reordena para espaçar o mesmo alvo. Conservador: mantém a ordem de
 * prioridade do SRS e só adianta outro alvo quando o da vez apareceu há menos
 * de `minGap` itens; nada é removido nem duplicado.
 */
export function composeReviewQueue<T>(entries: readonly T[], targetOf: (entry: T) => string, minGap: number = MIN_TARGET_GAP): T[] {
  const remaining = [...entries];
  const out: T[] = [];
  const lastSeen = new Map<string, number>();
  const distance = (target: string) => (lastSeen.has(target) ? out.length - 1 - (lastSeen.get(target) as number) : Number.POSITIVE_INFINITY);
  while (remaining.length > 0) {
    // 1º item (na ordem do SRS) com distância suficiente…
    let pick = remaining.findIndex((entry) => distance(targetOf(entry)) >= minGap);
    // …senão, o que está há mais tempo sem aparecer (fila pequena).
    if (pick < 0) {
      let best = -1;
      let bestDistance = -1;
      remaining.forEach((entry, index) => {
        const d = distance(targetOf(entry));
        if (d > bestDistance) {
          bestDistance = d;
          best = index;
        }
      });
      pick = Math.max(0, best);
    }
    const [chosen] = remaining.splice(pick, 1);
    out.push(chosen);
    lastSeen.set(targetOf(chosen), out.length - 1);
  }
  return out;
}

/**
 * RC2.2.20 — repetição semântica: mesmo alvo + mesma família de exercício a
 * menos de `window` itens, mesmo com IDs diferentes (你好 vocabulário × 你好
 * frase). Devolve as posições que violam, para o gate e o QA.
 */
export function semanticRepetitionViolations<T>(
  entries: readonly T[],
  targetOf: (entry: T, index: number) => string,
  familyOf: (entry: T, index: number) => string,
  window: number = MIN_TARGET_GAP
): number[] {
  const bad: number[] = [];
  for (let index = 1; index < entries.length; index += 1) {
    for (let back = 1; back <= window && index - back >= 0; back += 1) {
      const other = index - back;
      if (targetOf(entries[index], index) === targetOf(entries[other], other) && familyOf(entries[index], index) === familyOf(entries[other], other)) {
        bad.push(index);
        break;
      }
    }
  }
  return bad;
}

/** Alvo pela FORMA (hànzì) quando existe: 你好 é o mesmo alvo em qualquer domínio/tipo. */
export function reviewSurfaceTarget(fallbackKey: string, hanzi: string | null | undefined): string {
  const surface = String(hanzi ?? "").trim();
  return surface ? `surface:${surface}` : fallbackKey;
}

/** Quantas vezes este alvo já apareceu ANTES desta posição na sessão. */
export function reviewOccurrenceAt<T>(entries: readonly T[], pos: number, targetOf: (entry: T) => string): number {
  const target = entries[pos] ? targetOf(entries[pos]) : null;
  if (target == null) return 0;
  let count = 0;
  for (let index = 0; index < pos; index += 1) if (targetOf(entries[index]) === target) count += 1;
  return count;
}

/** Nenhum par vizinho com o mesmo alvo (quando há alternativa). */
export function hasConsecutiveSameTarget<T>(entries: readonly T[], targetOf: (entry: T) => string): boolean {
  for (let index = 1; index < entries.length; index += 1) {
    if (targetOf(entries[index]) === targetOf(entries[index - 1])) return true;
  }
  return false;
}

/**
 * Feedback sem cópia repetida: uma explicação que só repete o hànzì, o pinyin
 * ou o sentido já mostrados não aparece (nunca a mesma informação no título,
 * na resposta, no rótulo e na explicação).
 */
export function feedbackExplanationIsRedundant(
  explanation: string | null | undefined,
  shown: { hanzi?: string | null; pinyin?: string | null; meaning?: string | null }
): boolean {
  const text = String(explanation ?? "").trim();
  if (!text) return true;
  const strip = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let rest = strip(text);
  for (const part of [shown.hanzi, shown.pinyin, shown.meaning]) {
    const clean = strip(String(part ?? "").trim());
    if (clean) rest = rest.split(clean).join(" ");
  }
  rest = rest.replace(/[\s.,;:!?=·()\-–—"'“”«»]+/g, "");
  return rest.length < 4;
}

