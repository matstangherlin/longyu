import type { ComponentType, SVGProps } from "react";
import {
  IconBook,
  IconChat,
  IconGear,
  IconHanzi,
  IconHeadphones,
  IconHome,
  IconLibrary,
  IconMore,
  IconRefresh,
  IconShield,
  IconSound,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUser,
  IconFlame,
  IconLantern,
} from "../ui/Icon";
import { DOMAIN_META, DOMAIN_ORDER } from "../../data/domains";
import type { FeatureId, LearnerStage } from "../../lib/learnerStage";
import {
  DISCOVERY_FEATURE_ORDER,
  type DiscoveryFeatureId,
  type FeatureVisibilityMap,
} from "../../lib/progressiveDiscovery";
import type { MessageKey } from "../../locales/pt-BR";

export interface NavItem {
  to: string;
  /** Portuguese fallback for tests and non-React callers. UI uses `labelKey` when present. */
  label: string;
  labelKey?: MessageKey;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  matches?: string[];
  /** Área correspondente (para estado progressivo). Opcional. */
  feature?: FeatureId;
}

export interface NavGroup {
  id: string;
  title: string;
  titleKey: MessageKey;
  items: NavItem[];
}

/** Rotas filhas do hub Praticar (aparecem no hover). Revisão fica na barra. */
const PRACTICE_MATCHES = [
  "/treino",
  "/praticar",
  "/som",
  "/fala",
  "/pinyin",
  "/leitura",
  "/ideogramas",
  "/hanzi",
  "/biblioteca",
  "/imersao",
];
const IDEOGRAM_MATCHES = ["/ideogramas", "/hanzi"];
const PROFILE_MATCHES = ["/perfil", "/conta", "/amigos"];
const MORE_MATCHES = [
  "/mais",
  "/sobre",
  "/config",
  "/ajustes",
  "/pro",
  "/plano",
  "/conquistas",
  "/dados-locais",
];

// ─────────────────────────────────────────────────────────────────────────
// Catálogo único de itens de navegação por área.
// ─────────────────────────────────────────────────────────────────────────
export const NAV: Record<string, NavItem> = {
  jornada: { to: "/jornada", label: "Jornada", labelKey: "navigation.journey", icon: IconHome, matches: ["/jornada", "/licao", "/teste"], feature: "jornada" },
  treino: { to: "/treino", label: "Praticar", labelKey: "navigation.practice", icon: IconTarget, matches: PRACTICE_MATCHES, feature: "treino" },
  revisao: { to: "/revisao", label: "Revisão", labelKey: "navigation.review", icon: IconRefresh, feature: "revisao" },
  cultura: { to: "/cultura", label: "Cultura", labelKey: "navigation.culture", icon: IconLantern, matches: ["/cultura"], feature: "cultura" },
  pinyin: { to: "/pinyin", label: "Pinyin Lab", labelKey: "navigation.pinyinLab", icon: IconSound, feature: "pinyin" },
  ideogramas: { to: "/ideogramas", label: "Hànzì", labelKey: "navigation.hanzi", icon: IconHanzi, matches: IDEOGRAM_MATCHES, feature: "hanzi" },
  fala: { to: "/fala", label: "Fala", labelKey: "navigation.speaking", icon: IconChat, feature: "fala" },
  leitura: { to: "/leitura", label: "Leitura", labelKey: "navigation.reading", icon: IconBook, feature: "leitura" },
  biblioteca: { to: "/biblioteca", label: "Biblioteca", labelKey: "navigation.library", icon: IconLibrary, feature: "biblioteca" },
  imersao: { to: "/imersao", label: "Imersão", labelKey: "navigation.immersion", icon: IconHeadphones, feature: "imersao" },
  missoes: { to: "/missoes", label: "Missões", labelKey: "navigation.missions", icon: IconFlame, feature: "missoes" },
  conquistas: { to: "/conquistas", label: "Conquistas", labelKey: "navigation.achievements", icon: IconTrophy, feature: "conquistas" },
  ligas: { to: "/ligas", label: "Ligas", labelKey: "navigation.leagues", icon: IconTrophy, feature: "ligas" },
  loja: { to: "/loja", label: "Loja", labelKey: "navigation.shop", icon: IconStar, feature: "loja" },
  amigos: { to: "/amigos", label: "Amigos", labelKey: "navigation.friends", icon: IconUser },
  convide: { to: "/convide", label: "Convide amigos", labelKey: "navigation.inviteFriends", icon: IconStar },
  perfil: { to: "/perfil", label: "Perfil", labelKey: "navigation.profile", icon: IconUser, matches: PROFILE_MATCHES, feature: "perfil" },
  conta: { to: "/conta", label: "Conta", labelKey: "navigation.account", icon: IconShield, feature: "conta" },
  plano: { to: "/plano", label: "Plano Pro", labelKey: "navigation.proPlan", icon: IconStar, feature: "plano" },
  business: { to: "/business", label: "Para empresas", labelKey: "navigation.business", icon: IconTarget },
  dados: { to: "/dados-locais", label: "Dados locais", labelKey: "navigation.localData", icon: IconBook, feature: "dados" },
  ajustes: { to: "/ajustes", label: "Ajustes", labelKey: "navigation.settings", icon: IconGear, matches: ["/config", "/ajustes"], feature: "ajustes" },
  ajuda: { to: "/sobre#feedback", label: "Ajuda", labelKey: "navigation.help", icon: IconTarget, feature: "ajuda" },
  sobre: { to: "/sobre", label: "Sobre", labelKey: "navigation.about", icon: IconMore, feature: "sobre" },
  mais: { to: "/mais", label: "Mais", labelKey: "navigation.more", icon: IconMore, matches: MORE_MATCHES },
};

/**
 * Barra inferior mobile — RC2.2.13: exatamente 5 destinos, Cultura é
 * navegação PRIMÁRIA (não fica escondida em Mais). Perfil sai da barra: o
 * acesso é pelo avatar da TopBar (e pelo catálogo completo em /mais).
 * Nunca 6+ itens.
 */
export const MOBILE_PRIMARY_NAV_ROUTES = ["/jornada", "/treino", "/cultura", "/missoes", "/mais"] as const;

/**
 * RC2.2.18 — rota de navegação → área progressiva. Itens sem entrada aqui
 * (Jornada, Praticar, Perfil, Ajustes, Conta, Ajuda, Sobre…) nunca somem.
 */
export const NAV_DISCOVERY_FEATURE: Readonly<Record<string, DiscoveryFeatureId>> = {
  "/revisao": "review",
  "/cultura": "culture",
  "/ideogramas": "hanzi",
  "/imersao": "immersion",
  "/missoes": "missions",
  "/conquistas": "achievements",
  "/ligas": "league",
  "/loja": "shop",
};

/** Conta madura: tudo disponível (comportamento anterior à RC2.2.18). */
export const FULL_FEATURE_VISIBILITY: FeatureVisibilityMap = Object.fromEntries(
  DISCOVERY_FEATURE_ORDER.map((id) => [id, "AVAILABLE"])
) as FeatureVisibilityMap;

export function isNavItemDiscovered(item: NavItem, visibility: FeatureVisibilityMap): boolean {
  const feature = NAV_DISCOVERY_FEATURE[item.to];
  return !feature || visibility[feature] === "AVAILABLE";
}

/** Itens PERTO do desbloqueio (máx. 2) — aparecem discretos em Mais (PART AN/AO). */
export function previewNavItems(visibility: FeatureVisibilityMap, limit = 2): NavItem[] {
  return Object.entries(NAV_DISCOVERY_FEATURE)
    .filter(([, feature]) => visibility[feature] === "PREVIEW")
    .sort(([, a], [, b]) => DISCOVERY_FEATURE_ORDER.indexOf(a) - DISCOVERY_FEATURE_ORDER.indexOf(b))
    .slice(0, limit)
    .map(([to]) => Object.values(NAV).find((item) => item.to === to))
    .filter((item): item is NavItem => Boolean(item));
}

/**
 * Barra mobile: a ordem final é SEMPRE esta (PART BU); a RC2.2.18 só filtra o
 * que ainda não foi descoberto. Conta nova: Jornada · Praticar · Mais.
 */
export function mobileNavForStage(_stage: LearnerStage, visibility: FeatureVisibilityMap = FULL_FEATURE_VISIBILITY): NavItem[] {
  return [
    NAV.jornada,
    NAV.treino,
    NAV.cultura,
    NAV.missoes,
    NAV.mais,
  ].filter((item) => isNavItemDiscovered(item, visibility));
}

/**
 * Sidebar desktop — abas principais + flyouts (sempre completa).
 * - Praticar → Hànzì, Pinyin Lab, Fala, …
 * - Perfil → Amigos, Conta, …
 */
export function desktopNavForStage(_stage: LearnerStage, visibility: FeatureVisibilityMap = FULL_FEATURE_VISIBILITY): NavItem[] {
  return DESKTOP_NAV.filter((item) => isNavItemDiscovered(item, visibility));
}

/** Hover de Praticar: competências e hubs de estudo. */
export function practiceFlyoutItems(visibility: FeatureVisibilityMap = FULL_FEATURE_VISIBILITY): NavItem[] {
  return [NAV.ideogramas, NAV.pinyin, NAV.fala, NAV.leitura, NAV.biblioteca, NAV.imersao].filter((item) =>
    isNavItemDiscovered(item, visibility)
  );
}

/**
 * Sheet mobile de Praticar (2 colunas, compacta): Revisão, Hànzì, Pinyin,
 * Fala, Leitura, Imersão, Biblioteca. Revisão só sai daqui se estiver na barra.
 */
export function practiceMobileSheetItems(
  primaryNav: NavItem[],
  visibility: FeatureVisibilityMap = FULL_FEATURE_VISIBILITY
): NavItem[] {
  const onBar = new Set(primaryNav.map((item) => item.to));
  const items = [NAV.ideogramas, NAV.pinyin, NAV.fala, NAV.leitura, NAV.imersao, NAV.biblioteca];
  // RC2.2.18 · S/T — nada de modo vazio: Revisão só com itens; Hànzì/Imersão quando fazem sentido.
  return (onBar.has("/revisao") ? items : [NAV.revisao, ...items]).filter((item) => isNavItemDiscovered(item, visibility));
}

/** Hover de Perfil: social e conta. */
export function profileFlyoutItems(): NavItem[] {
  return [NAV.amigos, NAV.convide, NAV.conta, NAV.plano];
}

export const MORE_CATALOG: NavGroup[] = [
  {
    id: "learn",
    title: "Aprender",
    titleKey: "navigation.groupLearn",
    items: [NAV.treino, NAV.revisao, NAV.cultura, NAV.pinyin, NAV.ideogramas, NAV.fala, NAV.leitura, NAV.biblioteca, NAV.imersao],
  },
  {
    id: "motivation",
    title: "Motivação",
    titleKey: "navigation.groupMotivation",
    items: [NAV.missoes, NAV.conquistas, NAV.ligas, NAV.loja, NAV.amigos, NAV.convide],
  },
  {
    id: "account",
    title: "Conta",
    titleKey: "navigation.groupAccount",
    items: [NAV.perfil, NAV.conta, NAV.plano, NAV.business, NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre],
  },
];

/** Popover Mais: só sistema — estudo/social já estão nos flyouts Praticar/Perfil. */
export function moreFlyoutGroups(
  primaryNav: NavItem[],
  visibility: FeatureVisibilityMap = FULL_FEATURE_VISIBILITY
): NavGroup[] {
  const primaryTos = new Set(
    primaryNav.filter((item) => item.to !== "/mais").map((item) => item.to)
  );
  const keep = (item: NavItem) => !primaryTos.has(item.to) && isNavItemDiscovered(item, visibility);

  const account = [NAV.conquistas, NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre].filter(keep);
  return account.length
    ? [{ id: "more", title: "Mais", titleKey: "navigation.groupMore", items: account }]
    : [];
}

/**
 * Sheet mobile de Mais: atalhos que não cabem na barra (Loja, Ligas, …)
 * + sistema. O catálogo completo continua em `/mais`.
 */
export function moreMobileSheetGroups(
  primaryNav: NavItem[],
  visibility: FeatureVisibilityMap = FULL_FEATURE_VISIBILITY
): NavGroup[] {
  const primaryTos = new Set(
    primaryNav.filter((item) => item.to !== "/mais").map((item) => item.to)
  );
  const keep = (item: NavItem) => !primaryTos.has(item.to) && isNavItemDiscovered(item, visibility);

  // Cultura é aba da barra (RC2.2.13): não se repete aqui.
  const explore = [NAV.loja, NAV.ligas, NAV.conquistas].filter(keep);
  const system = [NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre].filter(keep);
  const groups: NavGroup[] = [];
  if (explore.length) groups.push({ id: "explore", title: "Explorar", titleKey: "navigation.groupExplore", items: explore });
  if (system.length) groups.push({ id: "system", title: "Sistema", titleKey: "navigation.groupSystem", items: system });
  return groups;
}

export const DESKTOP_NAV: NavItem[] = [
  NAV.jornada,
  NAV.treino,
  NAV.revisao,
  NAV.cultura,
  NAV.missoes,
  NAV.ligas,
  NAV.loja,
  NAV.perfil,
  NAV.mais,
];

export const NAV_MOBILE: NavItem[] = [
  NAV.jornada,
  NAV.treino,
  NAV.cultura,
  NAV.missoes,
  { ...NAV.mais, matches: [...MORE_MATCHES, "/loja", "/ligas"] },
];

export const MORE_NAV: NavItem = NAV.mais;
export const MORE_DROPDOWN_GROUPS: NavGroup[] = MORE_CATALOG;

export const IMMERSION_NAV: NavItem = NAV.imersao;
export const ATLAS_NAV: NavItem = NAV.ideogramas;
export const MISSIONS_NAV: NavItem = NAV.missoes;
export const PINYIN_LAB_NAV: NavItem = NAV.pinyin;
export const SHOP_NAV: NavItem = NAV.loja;
export const LEAGUES_NAV: NavItem = NAV.ligas;
export const SETTINGS_NAV: NavItem = NAV.ajustes;
export const LIBRARY_NAV: NavItem = NAV.biblioteca;

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === "/" && pathname === "/") return true;
  if (item.to !== "/" && (pathname === item.to || pathname.startsWith(`${item.to}/`))) return true;
  return Boolean(item.matches?.some((match) => pathname === match || pathname.startsWith(`${match}/`)));
}

export function navLabel(
  item: Pick<NavItem, "label" | "labelKey">,
  translate: (key: MessageKey) => string
): string {
  return item.labelKey ? translate(item.labelKey) : item.label;
}

export const ENGINES: (Omit<NavItem, "labelKey"> & { color: string; tagline: string })[] = [
  ...DOMAIN_ORDER.map((track) => {
    const meta = DOMAIN_META[track];
    return {
      to: `/${track}`,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      tagline: meta.tagline,
    };
  }),
];
