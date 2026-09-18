/**
 * V4.11A.2 — destaques do Culture Hub.
 *
 * IDs publicados apenas. Gate falha se o id não existir ou não estiver no catálogo.
 */
export const CULTURE_FEATURED_ITEMS = [
  "spring-festival",
  "sun-wukong",
  "china-history-timeline",
] as const;

export type CultureFeaturedItemId = (typeof CULTURE_FEATURED_ITEMS)[number];
