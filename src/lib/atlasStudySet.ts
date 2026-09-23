/**
 * RC2.2.8 · F — o Atlas alimenta a Revisão.
 *
 * "Treinar este conjunto" transforma o filtro atual do Atlas num treino na
 * aba Revisão. Não existe segundo SRS (F1.2): o conjunto é só uma LISTA de
 * ids de caractere na URL, e cada item da sessão é um `SRSItem` do mesmo
 * `srs` de sempre, avaliado pelo mesmo `gradeSrs`.
 *
 * Elegibilidade é a regra que o Atlas já usava para "Adicionar à revisão"
 * (`canPromoteAtlasItemToReview` = aprendido). Caractere futuro ou ainda não
 * aprendido nunca entra num treino (mutação 21).
 */

import {
  atlasContentAvailability,
  canPromoteAtlasItemToReview,
  contentRefForAtlasItem,
} from "../data/contentArchitecture";
import type { HanziAtlasEntry } from "../data/hanziAtlas";
import { REVIEW_DOMAIN_ORDER } from "../data/reviewDomains";
import { makeKey, newItem, type SRSItem } from "./srs";

export const ATLAS_STUDY_SET_MAX = 20;
export const ATLAS_STUDY_SET_PARAM = "atlas";
const DAY_MS = 24 * 60 * 60 * 1000;
/** "Aprendidos recentemente": primeiro contato no SRS nos últimos 14 dias. */
export const ATLAS_RECENT_WINDOW_MS = 14 * DAY_MS;

export type AtlasSmartSet = "weak" | "favorites" | "recent" | "unreviewed" | "top50";
export const ATLAS_SMART_SETS: readonly AtlasSmartSet[] = ["weak", "favorites", "recent", "unreviewed", "top50"];

export interface AtlasStudyContext {
  completedLessons: string[];
  learnedSet: ReadonlySet<string>;
  favoriteSet: ReadonlySet<string>;
  srs: Record<string, SRSItem>;
  now: number;
}

/** Id do caractere no SRS — mesma resolução do "Adicionar à revisão". */
export function reviewCharIdForAtlasItem(item: HanziAtlasEntry): string {
  const ref = contentRefForAtlasItem(item);
  return ref?.split(":")[1] ?? item.sourceCharacter?.id ?? item.id;
}

export function charSrsEntries(charId: string, srs: Record<string, SRSItem>): SRSItem[] {
  return REVIEW_DOMAIN_ORDER.map((domain) => srs[makeKey("char", charId, domain)]).filter(
    (entry): entry is SRSItem => Boolean(entry)
  );
}

export function isWeakAtlasChar(charId: string, srs: Record<string, SRSItem>, now: number): boolean {
  return charSrsEntries(charId, srs).some((entry) => entry.lapses > 0 || (entry.reps === 0 && entry.due <= now));
}

/** Dominado: tem revisão e todos os domínios praticados com 3+ acertos seguidos e sem lapso recente. */
export function isMasteredAtlasChar(charId: string, srs: Record<string, SRSItem>): boolean {
  const entries = charSrsEntries(charId, srs);
  return entries.length > 0 && entries.every((entry) => entry.reps >= 3);
}

export function isAtlasItemEligibleForTraining(item: HanziAtlasEntry, context: Pick<AtlasStudyContext, "completedLessons" | "learnedSet">): boolean {
  return canPromoteAtlasItemToReview(item, context.completedLessons, context.learnedSet as Set<string>);
}

/** F1 — do filtro atual para os ids treináveis, sem repetir e com teto. */
export function buildAtlasStudySet(
  items: readonly HanziAtlasEntry[],
  context: Pick<AtlasStudyContext, "completedLessons" | "learnedSet">
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (!isAtlasItemEligibleForTraining(item, context)) continue;
    const id = reviewCharIdForAtlasItem(item);
    if (!ids.includes(id)) ids.push(id);
    if (ids.length >= ATLAS_STUDY_SET_MAX) break;
  }
  return ids;
}

/** F2 — atalhos. Todos partem só de progresso que já existe. */
export function atlasSmartSetItems(
  kind: AtlasSmartSet,
  atlas: readonly HanziAtlasEntry[],
  context: AtlasStudyContext
): HanziAtlasEntry[] {
  const visible = atlas.filter(
    (item) => atlasContentAvailability(item, context.completedLessons, context.learnedSet as Set<string>) !== "hidden"
  );
  switch (kind) {
    case "weak":
      return visible.filter((item) => isWeakAtlasChar(reviewCharIdForAtlasItem(item), context.srs, context.now));
    case "favorites":
      return visible.filter((item) => context.favoriteSet.has(`char:${item.id}`));
    case "recent":
      return visible
        .filter((item) =>
          charSrsEntries(reviewCharIdForAtlasItem(item), context.srs).some(
            (entry) => context.now - entry.createdAt <= ATLAS_RECENT_WINDOW_MS
          )
        )
        .sort(
          (a, b) =>
            Math.max(...charSrsEntries(reviewCharIdForAtlasItem(b), context.srs).map((entry) => entry.createdAt)) -
            Math.max(...charSrsEntries(reviewCharIdForAtlasItem(a), context.srs).map((entry) => entry.createdAt))
        );
    case "unreviewed":
      return visible.filter(
        (item) =>
          isAtlasItemEligibleForTraining(item, context) &&
          charSrsEntries(reviewCharIdForAtlasItem(item), context.srs).every((entry) => entry.reps + entry.lapses === 0)
      );
    case "top50":
      return visible
        .filter((item) => isAtlasItemEligibleForTraining(item, context))
        .sort((a, b) => a.freqRank - b.freqRank)
        .slice(0, 50);
    default:
      return [];
  }
}

export function atlasStudySetHref(charIds: readonly string[], label?: string): string {
  const params = new URLSearchParams();
  params.set("conjunto", ATLAS_STUDY_SET_PARAM);
  params.set("chars", charIds.slice(0, ATLAS_STUDY_SET_MAX).join(","));
  if (label) params.set("rotulo", label);
  return `/revisao?${params.toString()}`;
}

export function parseAtlasStudySet(search: URLSearchParams): string[] | null {
  if (search.get("conjunto") !== ATLAS_STUDY_SET_PARAM) return null;
  const ids = (search.get("chars") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, ATLAS_STUDY_SET_MAX);
}

/**
 * Itens da sessão de treino: por caractere, o domínio já existente que está
 * mais vencido; sem nenhum ainda, nasce o domínio de significado — pelo mesmo
 * `newItem` do SRS (o `gradeSrs` o persiste ao responder).
 *
 * `allowedCharIds` é a segunda trava: a URL pode ser editada, então só entra
 * quem ainda é elegível agora.
 */
export function atlasStudySetSrsItems(
  charIds: readonly string[],
  srs: Record<string, SRSItem>,
  allowedCharIds: ReadonlySet<string>,
  now: number
): SRSItem[] {
  const items: SRSItem[] = [];
  for (const charId of charIds) {
    if (!allowedCharIds.has(charId)) continue;
    const entries = charSrsEntries(charId, srs).sort((a, b) => a.due - b.due);
    items.push(entries[0] ?? newItem("char", charId, { track: "hanzi", reviewDomain: "significado", now }));
  }
  return items;
}
