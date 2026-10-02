/**
 * RC2.2.23 — repetição semântica (o que o aluno percebe), não só ID repetido.
 *
 * Cada passo/item vira: alvo semântico (你好 é o mesmo alvo em qualquer
 * domínio), operação cognitiva (ouvir, reconhecer, recordar, produzir,
 * usar em contexto…), família de interação (escolha, pares, montagem…) e
 * contexto (frase/cena em que aparece).
 *
 *   TRANSFORMED  mesmo alvo, outra operação ou outro contexto → boa repetição
 *   INTERLEAVED  mesmo alvo, mesma operação, mas com outros alvos entre eles
 *   REDUNDANT    mesmo alvo + mesma operação + mesmo contexto, logo em seguida
 *
 * E saturação: numa rodada de 5–8, o mesmo alvo aparece no máximo 2 vezes
 * (3 só com remediação explícita depois de erro). Numa micro-sessão, um alvo
 * não pode dominar a maioria dos passos sem justificativa. "0 repetição ruim"
 * nunca é declarado se há saturação.
 */
export type CognitiveOperation = "TEACH" | "HEAR" | "RECOGNIZE" | "DISCRIMINATE" | "RECALL" | "PRODUCE" | "BUILD" | "USE_IN_CONTEXT";

export interface RepetitionItem {
  semanticTargetKey: string;
  cognitiveOperation: CognitiveOperation;
  interactionFamily: string;
  contextKey: string;
  /** Reaparição proposital depois de erro (remediação explícita). */
  remediation?: boolean;
}

export type RepetitionClass = "FIRST" | "TRANSFORMED" | "INTERLEAVED" | "REDUNDANT";

/** Janela móvel: reaparecer na mesma forma dentro dela é REDUNDANT. */
export const REPETITION_WINDOW = 3;
/** Rodada normal 5–8: no máximo 2 aparições do mesmo alvo. */
export const MAX_TARGET_PER_ROUND = 2;
/** 3 só com remediação explícita depois de erro. */
export const MAX_TARGET_PER_ROUND_REMEDIATION = 3;
/** Um alvo não domina mais que esta fração de uma micro-sessão (≥ 6 passos). */
export const MAX_TARGET_SHARE = 0.5;
export const DOMINANCE_MIN_STEPS = 6;

export function classifyRepetitions(items: readonly RepetitionItem[], window: number = REPETITION_WINDOW): RepetitionClass[] {
  const lastByTarget = new Map<string, number>();
  return items.map((item, index) => {
    if (item.cognitiveOperation === "TEACH") return "FIRST";
    const previous = lastByTarget.get(item.semanticTargetKey);
    lastByTarget.set(item.semanticTargetKey, index);
    if (previous == null) return "FIRST";
    const before = items[previous];
    if (before.cognitiveOperation !== item.cognitiveOperation || before.contextKey !== item.contextKey) return "TRANSFORMED";
    return index - previous > window ? "INTERLEAVED" : "REDUNDANT";
  });
}

export interface SaturationFinding {
  semanticTargetKey: string;
  count: number;
  limit: number;
}

/** Saturação dentro de uma rodada (5–8 itens). */
export function roundSaturation(items: readonly RepetitionItem[]): SaturationFinding[] {
  const counts = new Map<string, { count: number; remediation: boolean }>();
  for (const item of items) {
    if (item.cognitiveOperation === "TEACH") continue;
    const current = counts.get(item.semanticTargetKey) ?? { count: 0, remediation: false };
    counts.set(item.semanticTargetKey, { count: current.count + 1, remediation: current.remediation || Boolean(item.remediation) });
  }
  const out: SaturationFinding[] = [];
  for (const [semanticTargetKey, { count, remediation }] of counts) {
    const limit = remediation ? MAX_TARGET_PER_ROUND_REMEDIATION : MAX_TARGET_PER_ROUND;
    if (count > limit) out.push({ semanticTargetKey, count, limit });
  }
  return out;
}

/** Um alvo dominando a micro-sessão (6, 8, 10, 14 passos do mesmo alvo). */
export function targetDominance(items: readonly RepetitionItem[]): SaturationFinding[] {
  const practice = items.filter((item) => item.cognitiveOperation !== "TEACH");
  if (practice.length < DOMINANCE_MIN_STEPS) return [];
  const counts = new Map<string, number>();
  for (const item of practice) counts.set(item.semanticTargetKey, (counts.get(item.semanticTargetKey) ?? 0) + 1);
  const limit = Math.floor(practice.length * MAX_TARGET_SHARE);
  return [...counts.entries()].filter(([, count]) => count > limit).map(([semanticTargetKey, count]) => ({ semanticTargetKey, count, limit }));
}

export interface RepetitionReport {
  redundant: number;
  transformed: number;
  interleaved: number;
  saturated: SaturationFinding[];
  dominated: SaturationFinding[];
  /** Nunca "limpo" se houver saturação ou domínio, mesmo com 0 REDUNDANT. */
  clean: boolean;
}

export function repetitionReport(items: readonly RepetitionItem[], opts: { round?: boolean } = {}): RepetitionReport {
  const classes = classifyRepetitions(items);
  const saturated = opts.round ? roundSaturation(items) : [];
  const dominated = targetDominance(items);
  const redundant = classes.filter((c) => c === "REDUNDANT").length;
  return {
    redundant,
    transformed: classes.filter((c) => c === "TRANSFORMED").length,
    interleaved: classes.filter((c) => c === "INTERLEAVED").length,
    saturated,
    dominated,
    clean: redundant === 0 && saturated.length === 0 && dominated.length === 0,
  };
}

/** Operação cognitiva de um tipo de passo/exercício (o componente não importa). */
export function cognitiveOperationFor(kind: string): CognitiveOperation {
  if (/^(intro|teach|explain|culture_note)/.test(kind)) return "TEACH";
  if (/^listen$|audio_only|listen_repeat/.test(kind)) return "HEAR";
  if (/tone|discriminat|minimal_pair|listen_select/.test(kind)) return "DISCRIMINATE";
  if (/reverse|recall|flashcard_back/.test(kind)) return "RECALL";
  if (/produc|speak|free_production|pronunciation/.test(kind)) return "PRODUCE";
  if (/build|sentence|assembly/.test(kind)) return "BUILD";
  if (/conversation|dialogue|contextual|scene/.test(kind)) return "USE_IN_CONTEXT";
  return "RECOGNIZE";
}

/**
 * Reordena para que nenhuma rodada tenha o mesmo alvo mais que o limite:
 * o excedente vai para a rodada seguinte (nada é descartado; o SRS decide o
 * que é devido, aqui só a apresentação muda).
 */
export function capTargetPerRound<T>(
  entries: readonly T[],
  targetOf: (entry: T) => string,
  roundSize: number,
  isRemediation: (entry: T) => boolean = () => false
): T[] {
  const pending = [...entries];
  const out: T[] = [];
  while (pending.length > 0) {
    const round: T[] = [];
    const counts = new Map<string, number>();
    const deferred: T[] = [];
    while (pending.length > 0 && round.length < roundSize) {
      const entry = pending.shift()!;
      const target = targetOf(entry);
      const limit = isRemediation(entry) ? MAX_TARGET_PER_ROUND_REMEDIATION : MAX_TARGET_PER_ROUND;
      if ((counts.get(target) ?? 0) >= limit) {
        deferred.push(entry);
        continue;
      }
      counts.set(target, (counts.get(target) ?? 0) + 1);
      round.push(entry);
    }
    // Rodada ainda curta e só sobrou excedente: completa com ele (fila pequena).
    while (round.length < roundSize && deferred.length > 0 && pending.length === 0) round.push(deferred.shift()!);
    out.push(...round);
    pending.unshift(...deferred);
    if (round.length === 0) break;
  }
  return out;
}
