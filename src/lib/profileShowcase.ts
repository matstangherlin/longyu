/**
 * RC2.2.8 · G5 / A4 — vitrine do Perfil e revelação de selo. Helpers puros.
 *
 * Medalha (achievement) e Selo Cultural são objetos DIFERENTES (G7.1):
 * - Medalha: reconhecimento, vive em `achievementsUnlocked`, pode ser destacada.
 * - Selo: progresso cultural funcional, vive em `cultureSeals`, abre marcos da
 *   Jornada. Selo nunca entra em `featuredAchievementIds`.
 */

/** G5.1 — até 3 medalhas em destaque. */
export const FEATURED_ACHIEVEMENTS_MAX = 3;

/**
 * G5.4 — só medalha desbloqueada pode ser destacada. Ids bloqueados,
 * desconhecidos ou duplicados caem fora; a ordem escolhida é preservada.
 */
export function normalizeFeaturedAchievementIds(
  ids: readonly string[] | undefined,
  unlocked: Readonly<Record<string, number>> | undefined,
  knownIds?: ReadonlySet<string>
): string[] {
  const result: string[] = [];
  for (const id of ids ?? []) {
    if (!id || result.includes(id)) continue;
    if (!unlocked?.[id]) continue;
    if (knownIds && !knownIds.has(id)) continue;
    result.push(id);
    if (result.length >= FEATURED_ACHIEVEMENTS_MAX) break;
  }
  return result;
}

/** Alterna uma medalha na vitrine, respeitando bloqueio e limite. */
export function toggleFeaturedAchievement(
  current: readonly string[] | undefined,
  id: string,
  unlocked: Readonly<Record<string, number>> | undefined
): { ids: string[]; changed: boolean; reason?: "locked" | "full" } {
  const list = normalizeFeaturedAchievementIds(current, unlocked);
  if (list.includes(id)) return { ids: list.filter((item) => item !== id), changed: true };
  if (!unlocked?.[id]) return { ids: list, changed: false, reason: "locked" };
  if (list.length >= FEATURED_ACHIEVEMENTS_MAX) return { ids: list, changed: false, reason: "full" };
  return { ids: [...list, id], changed: true };
}

/**
 * A4.2 / A4.3 — selos a revelar: ganhos e ainda não mostrados. Um reveal por
 * selo; como `cultureSealsRevealed` persiste, o reload não repete.
 *
 * `revealed === undefined` significa conta anterior a este campo: tudo que ela
 * já tem conta como visto. Sem isso, a primeira abertura depois da atualização
 * despejaria um reveal para cada selo antigo.
 */
export function pendingCultureSealReveals(
  seals: readonly string[] | undefined,
  revealed: readonly string[] | undefined
): string[] {
  if (revealed === undefined) return [];
  const seen = new Set(revealed);
  return (seals ?? []).filter((sealId, index, all) => !seen.has(sealId) && all.indexOf(sealId) === index);
}

export function markCultureSealRevealed(
  revealed: readonly string[] | undefined,
  seals: readonly string[] | undefined,
  sealId: string
): string[] {
  const base = revealed ?? [...(seals ?? [])];
  return base.includes(sealId) ? [...base] : [...base, sealId];
}
