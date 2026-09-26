/**
 * RC2.2.14 · AW–BF — rodadas de treino de hànzì.
 *
 * Uma rodada tem no máximo 8 itens. Ao terminar, "Continuar treinando" abre a
 * rodada seguinte. XP usa o `addXp` de sempre, uma vez por rodada (chave
 * `hanzi-practice:<conta>:<modo>:<dia>:<n>`), e só nas primeiras rodadas de
 * cada modo no dia: repetir o modo sem parar não vira fonte de XP.
 * Pérolas continuam vindo só dos marcos PEARL_HANZI_MILESTONES; nada aqui
 * cria moeda, missão ou recompensa nova.
 */

export const HANZI_PRACTICE_ROUND = 8;
/** XP de uma rodada concluída (o mesmo valor que o treino de montagem já pagava). */
export const HANZI_PRACTICE_ROUND_XP = 6;
/** Rodadas por modo, por dia, que ainda pagam XP. */
export const HANZI_PRACTICE_XP_ROUNDS_PER_DAY = 3;

export const HANZI_PRACTICE_MODES = ["fragments", "complete", "components", "sentences", "meaning", "pieces"] as const;
export type HanziPracticeMode = (typeof HANZI_PRACTICE_MODES)[number];

export function isHanziPracticeMode(value: unknown): value is HanziPracticeMode {
  return typeof value === "string" && (HANZI_PRACTICE_MODES as readonly string[]).includes(value);
}

export function hanziPracticeKeyPrefix(accountId: string, mode: HanziPracticeMode, date: string): string {
  return `hanzi-practice:${accountId}:${mode}:${date}:`;
}

export function hanziPracticeRoundKey(accountId: string, mode: HanziPracticeMode, date: string, roundNumber: number): string {
  return `${hanziPracticeKeyPrefix(accountId, mode, date)}${roundNumber}`;
}

/** Quantas rodadas deste modo já pagaram XP hoje. */
export function paidRoundsToday(keys: readonly string[] | undefined, accountId: string, mode: HanziPracticeMode, date: string): number {
  const prefix = hanziPracticeKeyPrefix(accountId, mode, date);
  return (keys ?? []).filter((key) => key.startsWith(prefix)).length;
}

/**
 * XP desta rodada: só se houve ao menos um acerto e ainda há rodada paga
 * disponível hoje. Zero é honesto: a tela diz "treino extra, sem XP".
 */
export function practiceRoundXp(correct: number, paidToday: number): number {
  if (correct <= 0) return 0;
  if (paidToday >= HANZI_PRACTICE_XP_ROUNDS_PER_DAY) return 0;
  return HANZI_PRACTICE_ROUND_XP;
}

/** Fatia da rodada `round` (0, 1, 2…) numa lista de itens, no máximo 8. */
export function practiceRoundSlice<T>(items: readonly T[], round: number): T[] {
  if (items.length === 0) return [];
  const size = Math.min(HANZI_PRACTICE_ROUND, items.length);
  const start = (round * size) % items.length;
  const out: T[] = [];
  for (let i = 0; i < size; i += 1) out.push(items[(start + i) % items.length]!);
  return out;
}

/** Modo recomendado: o primeiro, na ordem pedagógica, ainda não treinado hoje. */
export function recommendedHanziMode(
  keys: readonly string[] | undefined,
  accountId: string,
  date: string,
  learnedCount: number
): HanziPracticeMode {
  if (learnedCount < 3) return "fragments";
  const order: HanziPracticeMode[] = ["fragments", "components", "meaning", "complete", "pieces", "sentences"];
  return order.find((mode) => paidRoundsToday(keys, accountId, mode, date) === 0) ?? "fragments";
}
