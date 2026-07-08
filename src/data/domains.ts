import type { ComponentType, SVGProps } from "react";
import { IconBook, IconChat, IconHanzi, IconSound } from "../components/ui/Icon";

export type DomainTrack = "som" | "fala" | "hanzi" | "leitura";

export const DOMAIN_ORDER: DomainTrack[] = ["som", "fala", "hanzi", "leitura"];

export const DOMAIN_META: Record<
  DomainTrack,
  {
    label: string;
    shortLabel: string;
    color: string;
    tagline: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
  }
> = {
  som: {
    label: "Som",
    shortLabel: "Som",
    color: "#2F6FB0",
    tagline: "Pinyin e tons",
    icon: IconSound,
  },
  fala: {
    label: "Fala",
    shortLabel: "Fala",
    color: "#2F855A",
    tagline: "Frases úteis",
    icon: IconChat,
  },
  hanzi: {
    label: "Hànzì",
    shortLabel: "Hànzì",
    color: "#B42318",
    tagline: "Sentido, som e forma",
    icon: IconHanzi,
  },
  leitura: {
    label: "Leitura",
    shortLabel: "Leitura",
    color: "#B7791F",
    tagline: "Microtextos",
    icon: IconBook,
  },
};
