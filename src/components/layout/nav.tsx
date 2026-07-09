import type { ComponentType, SVGProps } from "react";
import {
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
  IconBook,
} from "../ui/Icon";
import { DOMAIN_META, DOMAIN_ORDER } from "../../data/domains";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  matches?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const PRACTICE_MATCHES = ["/treino", "/praticar", "/som", "/fala", "/pinyin", "/revisao", "/leitura"];
const IDEOGRAM_MATCHES = ["/ideogramas", "/hanzi"];
const PROFILE_MATCHES = ["/perfil", "/conta"];
const MORE_MATCHES = ["/mais", "/sobre", "/biblioteca", "/config", "/ajustes", "/pro", "/conquistas"];

export const DESKTOP_NAV: NavItem[] = [
  { to: "/jornada", label: "Jornada", icon: IconHome, matches: ["/jornada", "/licao", "/teste"] },
  { to: "/ideogramas", label: "Ideogramas", icon: IconHanzi, matches: IDEOGRAM_MATCHES },
  { to: "/treino", label: "Praticar", icon: IconTarget, matches: PRACTICE_MATCHES },
  { to: "/imersao", label: "Imersão", icon: IconHeadphones },
  { to: "/ligas", label: "Ligas", icon: IconTrophy },
  { to: "/missoes", label: "Missões", icon: IconTarget },
  { to: "/loja", label: "Loja", icon: IconStar },
  { to: "/perfil", label: "Perfil", icon: IconUser, matches: PROFILE_MATCHES },
  { to: "/mais", label: "Mais", icon: IconMore, matches: MORE_MATCHES },
];

export const NAV_MOBILE: NavItem[] = [
  { to: "/jornada", label: "Jornada", icon: IconHome, matches: ["/jornada", "/licao", "/teste"] },
  { to: "/treino", label: "Praticar", icon: IconTarget, matches: PRACTICE_MATCHES },
  { to: "/imersao", label: "Imersão", icon: IconHeadphones },
  { to: "/missoes", label: "Missões", icon: IconTarget },
  {
    to: "/mais",
    label: "Mais",
    icon: IconMore,
    matches: [...MORE_MATCHES, ...PROFILE_MATCHES, ...IDEOGRAM_MATCHES, "/loja", "/ligas"],
  },
];

export const MORE_NAV: NavItem = {
  to: "/mais",
  label: "Mais",
  icon: IconMore,
  matches: MORE_MATCHES,
};

export const MORE_DROPDOWN_GROUPS: NavGroup[] = [
  {
    title: "Conta",
    items: [
      { to: "/perfil", label: "Perfil", icon: IconUser, matches: PROFILE_MATCHES },
      { to: "/conta", label: "Conta", icon: IconShield },
      { to: "/pro", label: "Plano Pro", icon: IconStar },
      { to: "/conquistas", label: "Conquistas", icon: IconTrophy },
    ],
  },
  {
    title: "Estudo",
    items: [
      { to: "/revisao", label: "Revisão", icon: IconRefresh },
      { to: "/biblioteca", label: "Biblioteca", icon: IconLibrary },
      { to: "/pinyin", label: "Pinyin Lab", icon: IconSound },
      { to: "/ideogramas", label: "Ideogramas", icon: IconHanzi, matches: IDEOGRAM_MATCHES },
      { to: "/config#dados", label: "Dados locais", icon: IconBook },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/config", label: "Ajustes", icon: IconGear, matches: ["/config", "/ajustes"] },
      { to: "/config", label: "Ajuda", icon: IconTarget },
      { to: "/sobre", label: "Sobre", icon: IconMore },
    ],
  },
];

export const IMMERSION_NAV: NavItem = {
  to: "/imersao",
  label: "Imersão",
  icon: IconHeadphones,
};

export const ATLAS_NAV: NavItem = {
  to: "/ideogramas",
  label: "Ideogramas",
  icon: IconHanzi,
  matches: IDEOGRAM_MATCHES,
};

export const MISSIONS_NAV: NavItem = {
  to: "/missoes",
  label: "Missões",
  icon: IconTarget,
};

export const PINYIN_LAB_NAV: NavItem = {
  to: "/pinyin",
  label: "Pinyin Lab",
  icon: IconSound,
};

export const SHOP_NAV: NavItem = {
  to: "/loja",
  label: "Loja",
  icon: IconStar,
};

export const LEAGUES_NAV: NavItem = {
  to: "/ligas",
  label: "Ligas",
  icon: IconTrophy,
};

export const SETTINGS_NAV: NavItem = {
  to: "/config",
  label: "Ajustes",
  icon: IconGear,
};

export const LIBRARY_NAV: NavItem = {
  to: "/biblioteca",
  label: "Biblioteca",
  icon: IconLibrary,
};

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
