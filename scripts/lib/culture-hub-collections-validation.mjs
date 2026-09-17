/**
 * V4.11A.2 — Hub usa collections como experiência principal + featured registry.
 */

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

export function validateCultureHubCollections(data) {
  const { fail, failures } = failList();
  const hub = data.cultureHubSource ?? "";
  const routes = data.routesSource ?? "";
  const featuredIds = data.featuredIds ?? [];
  const items = data.items ?? [];
  const itemIds = new Set(items.map((item) => item.id));
  const collections = data.collections ?? [];

  if (!/CULTURE_COLLECTIONS|cultureCollectionProgress/.test(hub)) {
    fail("HUB_IGNORES_COLLECTIONS", "CultureHubPage", "Hub precisa usar collections como eixo principal");
  }

  if (/CATEGORY_FILTERS/.test(hub) && !/exploreByTopic|showSecondary|culture-show-categories/.test(hub)) {
    fail(
      "CATEGORY_STILL_PRIMARY",
      "CultureHubPage",
      "filtros de categoria não podem ser a navegação principal"
    );
  }

  if (!/data-testid=\"culture-collections\"/.test(hub)) {
    fail("HUB_NO_COLLECTIONS_UI", "CultureHubPage", "grid de collections ausente");
  }

  if (!/collectionPreparing|Em preparação|In preparation/.test(hub) && !/data-collection-empty/.test(hub)) {
    fail("EMPTY_COLLECTION_UX", "CultureHubPage", "coleção vazia precisa de estado honesto");
  }

  // Empty collection must not render "0 de 0" as normal progress on the hub card.
  if (/collectionProgress[\s\S]{0,200}0 de 0|0 of 0/.test(hub)) {
    fail("EMPTY_ZERO_PROGRESS", "CultureHubPage", "não mostrar 0 de 0 como progresso normal");
  }

  if (!/cultura\/colecao/.test(routes)) {
    fail("NO_COLLECTION_ROUTE", "routes", "rota /cultura/colecao/:id ausente");
  }

  if (!featuredIds.length) {
    fail("NO_FEATURED", "featured", "CULTURE_FEATURED_ITEMS vazio");
  }
  if (featuredIds.length > 3) {
    fail("FEATURED_TOO_MANY", "featured", "máximo 3 destaques");
  }
  for (const id of featuredIds) {
    if (!itemIds.has(id)) fail("FEATURED_MISSING", id, "featured aponta para id inexistente");
  }

  // History empty is OK; must remain in registry.
  if (!collections.some((c) => c.id === "china_history")) {
    fail("HISTORY_COLLECTION_MISSING", "collections", "china_history precisa existir");
  }

  return { failures };
}
