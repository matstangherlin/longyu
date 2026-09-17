/**
 * V4.11A — Culture Collections.
 *
 * A aba Cultura era uma lista única de 20 curiosidades com 10 chips de filtro.
 * Coleção não é um filtro novo: é a resposta a "o que dá para aprender aqui",
 * com progresso visível por trilha.
 *
 * A coleção não é um campo próprio do item. Ela deriva de `kind`, e isso é
 * deliberado: dois campos independentes podem divergir, e um item marcado
 * `legend` que aparecesse na coleção de História seria exatamente o erro que a
 * P2 existe para impedir. Aqui a incoerência não é detectável — é impossível.
 */
import { CULTURE_ITEMS, type CultureItem, type CultureItemKind } from "./culture";

export const CULTURE_COLLECTION_IDS = [
  "festivals_calendar",
  "china_history",
  "legends_literature",
  "symbols_traditions",
  "life_in_china",
] as const;

export type CultureCollectionId = (typeof CULTURE_COLLECTION_IDS)[number];

export type CultureCollection = {
  id: CultureCollectionId;
  /** Chaves i18n — a UI resolve em PT-BR e EN. */
  titleKey: string;
  blurbKey: string;
  /** Tipos de item que moram nesta coleção. */
  kinds: readonly CultureItemKind[];
  /** Ordem de exibição no Hub. */
  order: number;
};

export const CULTURE_COLLECTIONS: readonly CultureCollection[] = [
  {
    id: "festivals_calendar",
    titleKey: "culture.collectionFestivals",
    blurbKey: "culture.collectionFestivalsBlurb",
    kinds: ["festival"],
    order: 1,
  },
  {
    id: "china_history",
    titleKey: "culture.collectionHistory",
    blurbKey: "culture.collectionHistoryBlurb",
    kinds: ["history"],
    order: 2,
  },
  {
    id: "legends_literature",
    titleKey: "culture.collectionLegends",
    blurbKey: "culture.collectionLegendsBlurb",
    // Lenda e obra literária dividem a prateleira, mas continuam tipos
    // distintos no item — a P19 cobra copy diferente para cada um.
    kinds: ["legend", "literature"],
    order: 3,
  },
  {
    id: "symbols_traditions",
    titleKey: "culture.collectionSymbols",
    blurbKey: "culture.collectionSymbolsBlurb",
    kinds: ["symbol"],
    order: 4,
  },
  {
    id: "life_in_china",
    titleKey: "culture.collectionLife",
    blurbKey: "culture.collectionLifeBlurb",
    kinds: ["documented_practice"],
    order: 5,
  },
] as const;

const COLLECTION_BY_KIND: ReadonlyMap<CultureItemKind, CultureCollectionId> = new Map(
  CULTURE_COLLECTIONS.flatMap((collection) =>
    collection.kinds.map((kind) => [kind, collection.id] as const)
  )
);

/** Toda coleção de todo item. Total, por construção: cada kind tem uma casa. */
export function collectionForKind(kind: CultureItemKind): CultureCollectionId {
  const id = COLLECTION_BY_KIND.get(kind);
  if (!id) throw new Error(`CultureItemKind sem coleção: ${kind}`);
  return id;
}

export function collectionForItem(item: Pick<CultureItem, "kind">): CultureCollectionId {
  return collectionForKind(item.kind);
}

export function cultureItemsInCollection(id: CultureCollectionId): CultureItem[] {
  return CULTURE_ITEMS.filter((item) => collectionForItem(item) === id).sort(
    (a, b) => a.order - b.order
  );
}

export type CultureCollectionProgress = {
  id: CultureCollectionId;
  titleKey: string;
  blurbKey: string;
  /** Itens concluídos nesta coleção. */
  done: number;
  /** Total de itens publicados nesta coleção. */
  total: number;
  order: number;
};

/**
 * "X de Y concluídas" por coleção. Lê a mesma lista de concluídos que o Hub já
 * usa — sem mastery novo, como pede a P1.3.
 */
export function cultureCollectionProgress(
  completedItemIds: readonly string[] = []
): CultureCollectionProgress[] {
  const done = new Set(completedItemIds);
  return [...CULTURE_COLLECTIONS]
    .sort((a, b) => a.order - b.order)
    .map((collection) => {
      const items = cultureItemsInCollection(collection.id);
      return {
        id: collection.id,
        titleKey: collection.titleKey,
        blurbKey: collection.blurbKey,
        done: items.filter((item) => done.has(item.id)).length,
        total: items.length,
        order: collection.order,
      };
    });
}
