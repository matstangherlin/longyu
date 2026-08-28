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
} from "../ui/Icon";
import { DOMAIN_META, DOMAIN_ORDER } from "../../data/domains";
import type { FeatureId, LearnerStage } from "../../lib/learnerStage";
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

/** Barra inferior mobile: no máximo 5 destinos (navegação completa). */
export function mobileNavForStage(_stage: LearnerStage): NavItem[] {
  return [NAV.jornada, NAV.treino, NAV.missoes, NAV.perfil, NAV.mais];
}

/**
 * Sidebar desktop — abas principais + flyouts (sempre completa).
 * - Praticar → Hànzì, Pinyin Lab, Fala, …
 * - Perfil → Amigos, Conta, …
 */
export function desktopNavForStage(_stage: LearnerStage): NavItem[] {
  return DESKTOP_NAV;
}

/** Hover de Praticar: competências e hubs de estudo. */
export function practiceFlyoutItems(): NavItem[] {
  return [NAV.ideogramas, NAV.pinyin, NAV.fala, NAV.leitura, NAV.biblioteca, NAV.imersao];
}

/**
 * Sheet mobile de Praticar: mesmos hubs do desktop + Revisão quando ela
 * não está na barra inferior (estágio recorrente).
 */
export function practiceMobileSheetItems(primaryNav: NavItem[]): NavItem[] {
  const onBar = new Set(primaryNav.map((item) => item.to));
  const items = practiceFlyoutItems();
  return onBar.has("/revisao") ? items : [NAV.revisao, ...items];
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
    items: [NAV.treino, NAV.revisao, NAV.pinyin, NAV.ideogramas, NAV.fala, NAV.leitura, NAV.biblioteca, NAV.imersao],
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
export function moreFlyoutGroups(primaryNav: NavItem[]): NavGroup[] {
  const primaryTos = new Set(
    primaryNav.filter((item) => item.to !== "/mais").map((item) => item.to)
  );
  const keep = (item: NavItem) => !primaryTos.has(item.to);

  const account = [NAV.conquistas, NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre].filter(keep);
  return account.length
    ? [{ id: "more", title: "Mais", titleKey: "navigation.groupMore", items: account }]
    : [];
}

/**
 * Sheet mobile de Mais: atalhos que não cabem na barra (Loja, Ligas, …)
 * + sistema. O catálogo completo continua em `/mais`.
 */
export function moreMobileSheetGroups(primaryNav: NavItem[]): NavGroup[] {
  const primaryTos = new Set(
    primaryNav.filter((item) => item.to !== "/mais").map((item) => item.to)
  );
  const keep = (item: NavItem) => !primaryTos.has(item.to);

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
  NAV.missoes,
  NAV.ligas,
  NAV.loja,
  NAV.perfil,
  NAV.mais,
];

export const NAV_MOBILE: NavItem[] = [
  NAV.jornada,
  NAV.treino,
  NAV.imersao,
  NAV.missoes,
  { ...NAV.mais, matches: [...MORE_MATCHES, ...PROFILE_MATCHES, ...IDEOGRAM_MATCHES, "/loja", "/ligas"] },
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
