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

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  matches?: string[];
  /** Área correspondente (para estado progressivo). Opcional. */
  feature?: FeatureId;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const PRACTICE_MATCHES = ["/treino", "/praticar", "/som", "/fala", "/pinyin", "/revisao", "/leitura"];
const IDEOGRAM_MATCHES = ["/ideogramas", "/hanzi"];
const PROFILE_MATCHES = ["/perfil", "/conta"];
const MORE_MATCHES = ["/mais", "/sobre", "/biblioteca", "/config", "/ajustes", "/pro", "/plano", "/conquistas", "/amigos", "/loja", "/ligas", "/dados-locais", "/imersao", ...IDEOGRAM_MATCHES];

// ─────────────────────────────────────────────────────────────────────────
// Catálogo único de itens de navegação por área. Tudo o que a navegação
// principal, o menu "Mais" e a sidebar mostram sai daqui — uma só definição
// por área evita rótulos/ícones divergentes entre superfícies.
// ─────────────────────────────────────────────────────────────────────────
export const NAV: Record<string, NavItem> = {
  jornada: { to: "/jornada", label: "Jornada", icon: IconHome, matches: ["/jornada", "/licao", "/teste"], feature: "jornada" },
  treino: { to: "/treino", label: "Praticar", icon: IconTarget, matches: PRACTICE_MATCHES, feature: "treino" },
  revisao: { to: "/revisao", label: "Revisão", icon: IconRefresh, feature: "revisao" },
  pinyin: { to: "/pinyin", label: "Pinyin Lab", icon: IconSound, feature: "pinyin" },
  ideogramas: { to: "/ideogramas", label: "Hànzì", icon: IconHanzi, matches: IDEOGRAM_MATCHES, feature: "hanzi" },
  fala: { to: "/fala", label: "Fala", icon: IconChat, feature: "fala" },
  leitura: { to: "/leitura", label: "Leitura", icon: IconBook, feature: "leitura" },
  biblioteca: { to: "/biblioteca", label: "Biblioteca", icon: IconLibrary, feature: "biblioteca" },
  imersao: { to: "/imersao", label: "Imersão", icon: IconHeadphones, feature: "imersao" },
  missoes: { to: "/missoes", label: "Missões", icon: IconFlame, feature: "missoes" },
  conquistas: { to: "/conquistas", label: "Conquistas", icon: IconTrophy, feature: "conquistas" },
  ligas: { to: "/ligas", label: "Ligas", icon: IconTrophy, feature: "ligas" },
  loja: { to: "/loja", label: "Loja", icon: IconStar, feature: "loja" },
  amigos: { to: "/amigos", label: "Amigos", icon: IconUser },
  perfil: { to: "/perfil", label: "Perfil", icon: IconUser, matches: PROFILE_MATCHES, feature: "perfil" },
  conta: { to: "/conta", label: "Conta", icon: IconShield, feature: "conta" },
  plano: { to: "/plano", label: "Plano Pro", icon: IconStar, feature: "plano" },
  dados: { to: "/dados-locais", label: "Dados locais", icon: IconBook, feature: "dados" },
  ajustes: { to: "/ajustes", label: "Ajustes", icon: IconGear, matches: ["/config", "/ajustes"], feature: "ajustes" },
  ajuda: { to: "/sobre#feedback", label: "Ajuda", icon: IconTarget, feature: "ajuda" },
  sobre: { to: "/sobre", label: "Sobre", icon: IconMore, feature: "sobre" },
  mais: { to: "/mais", label: "Mais", icon: IconMore, matches: MORE_MATCHES },
};

// ── Navegação principal adaptativa ──────────────────────────────────────
// Poucas ações de alta frequência. Novas áreas ganham presença conforme o
// estágio; tudo continua acessível pelo "Mais" e por URL direta.

/** Barra inferior mobile: no máximo 5 destinos, adaptados ao estágio. */
export function mobileNavForStage(stage: LearnerStage): NavItem[] {
  if (stage <= 1) {
    return [NAV.jornada, NAV.perfil, NAV.mais];
  }
  if (stage >= 5) {
    return [NAV.jornada, NAV.treino, NAV.revisao, NAV.missoes, NAV.mais];
  }
  // Estágios 2–4: prática e revisão entram; novas áreas aparecem no "Mais".
  return [NAV.jornada, NAV.treino, NAV.revisao, NAV.perfil, NAV.mais];
}

/**
 * Sidebar desktop — inspirada no Duolingo: poucas abas de alta frequência.
 * Hànzì, Imersão, Biblioteca e o resto ficam no popover/página "Mais".
 * Teto duro: 7 destinos (incluindo Mais).
 */
export function desktopNavForStage(stage: LearnerStage): NavItem[] {
  const items: NavItem[] = [NAV.jornada];
  if (stage >= 2) items.push(NAV.treino, NAV.revisao);
  if (stage >= 5) items.push(NAV.missoes, NAV.ligas);
  items.push(NAV.perfil, NAV.mais);
  return items;
}

// ── Menu "Mais": catálogo completo agrupado ─────────────────────────────
// Sempre exaustivo — nenhuma rota deixa de ser alcançável só porque não está
// na navegação principal do estágio atual. Usado pela página `/mais`.
export const MORE_CATALOG: NavGroup[] = [
  {
    title: "Aprender",
    items: [NAV.treino, NAV.revisao, NAV.pinyin, NAV.ideogramas, NAV.fala, NAV.leitura, NAV.biblioteca, NAV.imersao],
  },
  {
    title: "Motivação",
    items: [NAV.missoes, NAV.conquistas, NAV.ligas, NAV.loja, NAV.amigos],
  },
  {
    title: "Conta",
    items: [NAV.perfil, NAV.conta, NAV.plano, NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre],
  },
];

/**
 * Popover compacto do "Mais" na sidebar (estilo Duolingo).
 * Só atalhos que NÃO estão na barra principal — o catálogo completo vive em `/mais`.
 */
export function moreFlyoutGroups(primaryNav: NavItem[]): NavGroup[] {
  const primaryTos = new Set(
    primaryNav.filter((item) => item.to !== "/mais").map((item) => item.to)
  );
  const keep = (item: NavItem) => !primaryTos.has(item.to);

  const explore = [NAV.ideogramas, NAV.imersao, NAV.biblioteca, NAV.pinyin, NAV.loja, NAV.conquistas, NAV.amigos].filter(
    keep
  );
  const account = [NAV.conta, NAV.plano, NAV.ajustes, NAV.ajuda, NAV.sobre].filter(keep);

  const groups: NavGroup[] = [];
  if (explore.length) groups.push({ title: "Explorar", items: explore });
  if (account.length) groups.push({ title: "Conta", items: account });
  return groups;
}

// ── Exports estáveis mantidos para consumidores existentes ──────────────
export const DESKTOP_NAV: NavItem[] = [
  NAV.jornada,
  NAV.treino,
  NAV.revisao,
  NAV.missoes,
  NAV.ligas,
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

// Compatibilidade: consumidores antigos do dropdown recebem o catálogo completo;
// a sidebar usa `moreFlyoutGroups()` (popover compacto).
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

// As 4 competências centrais vivem dentro do hub Praticar.
export const ENGINES: (NavItem & { color: string; tagline: string })[] = [
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
