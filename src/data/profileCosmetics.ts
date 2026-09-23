// RC2.2.8 · H — cosméticos de perfil pagos com Pérolas de Jade.
//
// Módulo puro (sem React/store). Cosmético é identidade visual, nunca
// progresso: nenhum item aqui destrava lição, estrela, selo, medalha,
// domínio ou passagem de teste. É conforto de vaidade — útil, não necessário.
//
// Visual reaproveita tokens CSS existentes (gold, accent, good). Nada de arte
// nova pesada: moldura é borda + anel, título é uma linha de texto.

import { PEARL_PRICES } from "./economy";

export type ProfileCosmeticSlot = "frame" | "title";

export interface ProfileCosmeticDef {
  /** Igual ao id do item na Loja — `ownedCosmetics` guarda este id. */
  id: string;
  slot: ProfileCosmeticSlot;
  namePt: string;
  nameEn: string;
  effectPt: string;
  effectEn: string;
  cost: number;
  /** Classes aplicadas ao avatar (frame) ou ao selo de título (title). */
  className: string;
  /** Título exibido abaixo do nome (só slot title). */
  titlePt?: string;
  titleEn?: string;
}

export const PROFILE_COSMETICS: ProfileCosmeticDef[] = [
  {
    // Id histórico: era o placeholder "Cosmético especial — em breve". Quem
    // já comprou o placeholder passa a ter a Moldura de Jade de verdade.
    id: "shop-pearl-cosmetic",
    slot: "frame",
    namePt: "Moldura de Jade",
    nameEn: "Jade Frame",
    effectPt: "Moldura verde-jade ao redor do seu avatar no Perfil.",
    effectEn: "A jade-green frame around your avatar on your Profile.",
    cost: PEARL_PRICES.cosmeticSpecial,
    className: "ring-4 ring-[rgb(var(--good))] ring-offset-2 ring-offset-surface",
  },
  {
    id: "shop-pearl-frame-gold",
    slot: "frame",
    namePt: "Moldura Dourada",
    nameEn: "Gold Frame",
    effectPt: "Moldura dourada ao redor do seu avatar no Perfil.",
    effectEn: "A gold frame around your avatar on your Profile.",
    cost: PEARL_PRICES.cosmeticMax,
    className: "ring-4 ring-gold ring-offset-2 ring-offset-surface",
  },
  {
    id: "shop-pearl-title-scholar",
    slot: "title",
    namePt: "Título: Aprendiz do Dragão",
    nameEn: "Title: Dragon's Apprentice",
    effectPt: "Mostra o título “Aprendiz do Dragão · 龙徒” abaixo do seu nome.",
    effectEn: "Shows the title “Dragon's Apprentice · 龙徒” under your name.",
    cost: PEARL_PRICES.cosmeticMin + 1,
    className: "border border-gold/40 bg-gold/10 text-gold",
    titlePt: "Aprendiz do Dragão · 龙徒",
    titleEn: "Dragon's Apprentice · 龙徒",
  },
];

export const PROFILE_COSMETIC_IDS = PROFILE_COSMETICS.map((cosmetic) => cosmetic.id);

export function getProfileCosmetic(id: string | null | undefined): ProfileCosmeticDef | undefined {
  if (!id) return undefined;
  return PROFILE_COSMETICS.find((cosmetic) => cosmetic.id === id);
}

/**
 * Equipar só vale para cosmético possuído e do slot certo. Qualquer outro id
 * (inclusive um que foi removido do catálogo) volta a `null`.
 */
export function resolveEquippedCosmetic(
  id: string | null | undefined,
  slot: ProfileCosmeticSlot,
  owned: readonly string[] | undefined
): string | null {
  const def = getProfileCosmetic(id);
  if (!def || def.slot !== slot) return null;
  return (owned ?? []).includes(def.id) ? def.id : null;
}

/**
 * H4.2 — comprar ≠ equipar automaticamente quando o aluno já usa outro.
 * Se o slot está vazio, o item comprado é equipado para o efeito ser
 * perceptível na hora (O3); se já há outro equipado, nada muda.
 */
export function equipAfterPurchase(
  currentlyEquipped: string | null | undefined,
  purchasedId: string
): string {
  return currentlyEquipped ? currentlyEquipped : purchasedId;
}
