// Catálogo da Loja do Longyu. Módulo puro (sem React/store): só metadados.
// Preços vivem em data/economy.ts — a tabela única da economia.
//
// V2: Qi (dia a dia) e Pérolas (marcos/raras) não competem.
// Moedas nunca compram lição, estrela ou progresso acadêmico.

import {
  FOCUS_PASS_48H_HOURS,
  FOCUS_PASS_HOURS,
  PEARL_PRICES,
  PEARL_PRO_COST,
  PEARL_PRO_PASS_DAYS,
  QI_PACK_AMOUNT,
  SHOP_PRICES,
} from "./economy";

export type ShopCategory = "qi" | "perolas" | "pro";

export type ShopCurrency = "qi" | "pearl";

export type ShopItemKind =
  | "breath"
  | "charge"
  | "shield"
  | "chest_small"
  | "chest_dragon"
  | "cosmetic"
  | "module_retry"
  | "focus_pass"
  | "focus_pass_48h"
  | "qi_pack"
  | "pearl_pro_pass"
  | "pro_link";

export type ShopIconKey =
  | "breath"
  | "charge"
  | "shield"
  | "chest"
  | "chest_dragon"
  | "theme"
  | "avatar"
  | "retry"
  | "focus"
  | "qi"
  | "pearl"
  | "pro";

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  category: ShopCategory;
  currency: ShopCurrency;
  cost: number;
  iconKey: ShopIconKey;
  kind: ShopItemKind;
  cosmetic?: boolean;
  usableInShop?: boolean;
  usageHint?: string;
  pro?: boolean;
  /** Duração exibida no feedback (horas ou dias). */
  durationLabel?: string;
}

export const CATEGORY_META: Record<ShopCategory, { label: string; desc: string }> = {
  qi: {
    label: "Qi — dia a dia",
    desc: "Conforto e conveniência com a moeda comum.",
  },
  perolas: {
    label: "Pérolas de Jade — raras",
    desc: "Recompensas de prestígio. Guarde para o que importa.",
  },
  pro: {
    label: "Longyu Pro",
    desc: "12 Pérolas → 7 dias, ou assinatura.",
  },
};

export const CATEGORY_ORDER: ShopCategory[] = ["qi", "perolas", "pro"];

export const SHOP_ITEMS: ShopItem[] = [
  // ——— Qi ———
  {
    id: "shop-breath",
    name: "Recuperar Vidas",
    desc: "Repõe as Vidas do Dragão na lição atual ou na próxima.",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.breath,
    iconKey: "breath",
    kind: "breath",
    usageHint: "Fica no inventário e é usado dentro da lição, quando o fôlego zera.",
  },
  {
    id: "shop-charge",
    name: "Carga Extra",
    desc: "Adiciona +1 Carga do Dragão para começar mais uma atividade hoje.",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.charge,
    iconKey: "charge",
    kind: "charge",
    usableInShop: true,
  },
  {
    id: "shop-module-retry",
    name: "Retry de teste",
    desc: "Permite refazer o teste de pular módulo sem esperar.",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.moduleRetry,
    iconKey: "retry",
    kind: "module_retry",
    usageHint: "Fica no inventário e é usado ao refazer um teste de módulo.",
  },
  {
    id: "shop-focus-pass",
    name: "Treino Focado (24h)",
    desc: `Por ${FOCUS_PASS_HOURS} horas, treinos extras não consomem Carga. Pro tem isso sempre.`,
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.focusPass,
    iconKey: "focus",
    kind: "focus_pass",
    usableInShop: true,
    durationLabel: `${FOCUS_PASS_HOURS}h`,
  },
  {
    id: "shop-chest-small",
    name: "Baú Comum",
    desc: "Raridade comum: Qi, XP, uma carga ou tentativa extra.",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.chestSmall,
    iconKey: "chest",
    kind: "chest_small",
    usageHint: "Vai para “Seus baús”, no topo da Loja, para você abrir.",
  },
  {
    id: "shop-chest-dragon",
    name: "Baú Raro",
    desc: "Raridade rara: mais Qi, XP, Pérola, Escudo ou tentativa extra.",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.chestDragon,
    iconKey: "chest_dragon",
    kind: "chest_dragon",
    usageHint: "Vai para “Seus baús”, no topo da Loja, para você abrir.",
  },
  {
    id: "shop-shield",
    name: "Escudo de Sequência",
    desc: "Protege 1 dia perdido para a sua ofensiva não zerar.",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.shield,
    iconKey: "shield",
    kind: "shield",
    usableInShop: true,
  },
  {
    id: "shop-theme",
    name: "Tema visual",
    desc: "Um tema cosmético para o Longyu (em breve).",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.cosmetic,
    iconKey: "theme",
    kind: "cosmetic",
    cosmetic: true,
  },
  {
    id: "shop-avatar",
    name: "Avatar do dragão",
    desc: "Um visual alternativo para o seu dragão (em breve).",
    category: "qi",
    currency: "qi",
    cost: SHOP_PRICES.cosmetic,
    iconKey: "avatar",
    kind: "cosmetic",
    cosmetic: true,
  },

  // ——— Pérolas ———
  {
    id: "shop-pearl-charge",
    name: "+1 Carga",
    desc: "Uma Carga extra hoje — uso raro e preciso.",
    category: "perolas",
    currency: "pearl",
    cost: PEARL_PRICES.charge,
    iconKey: "charge",
    kind: "charge",
    usableInShop: true,
  },
  {
    id: "shop-pearl-focus-24",
    name: "Treino sem Carga (24h)",
    desc: `Por ${FOCUS_PASS_HOURS}h, treinos extras não consomem Carga.`,
    category: "perolas",
    currency: "pearl",
    cost: PEARL_PRICES.focusPass24h,
    iconKey: "focus",
    kind: "focus_pass",
    usableInShop: true,
    durationLabel: `${FOCUS_PASS_HOURS}h`,
  },
  {
    id: "shop-pearl-focus-48",
    name: "Treino sem Carga (48h)",
    desc: `Por ${FOCUS_PASS_48H_HOURS}h, treinos extras não consomem Carga.`,
    category: "perolas",
    currency: "pearl",
    cost: PEARL_PRICES.focusPass48h,
    iconKey: "focus",
    kind: "focus_pass_48h",
    usableInShop: true,
    durationLabel: `${FOCUS_PASS_48H_HOURS}h`,
  },
  {
    id: "shop-pearl-shield",
    name: "Escudo de sequência",
    desc: "Protege 1 dia da ofensiva — pago com Pérola.",
    category: "perolas",
    currency: "pearl",
    cost: PEARL_PRICES.streakShield,
    iconKey: "shield",
    kind: "shield",
    usableInShop: true,
  },
  {
    id: "shop-pearl-cosmetic",
    name: "Cosmético especial",
    desc: "Visual raro do dragão (2–6 Pérolas). Em breve.",
    category: "perolas",
    currency: "pearl",
    cost: PEARL_PRICES.cosmeticSpecial,
    iconKey: "avatar",
    kind: "cosmetic",
    cosmetic: true,
  },
  {
    id: "shop-qi-pack",
    name: `Pacote de Qi (${QI_PACK_AMOUNT})`,
    desc: `Uso secundário: ${PEARL_PRICES.qiPack} Pérolas → ${QI_PACK_AMOUNT} Qi. Prefira guardar Pérolas para Pro e benefícios raros.`,
    category: "perolas",
    currency: "pearl",
    cost: PEARL_PRICES.qiPack,
    iconKey: "qi",
    kind: "qi_pack",
    usableInShop: true,
  },

  // ——— Pro ———
  {
    id: "shop-pearl-pro-pass",
    name: `${PEARL_PRO_PASS_DAYS} dias de Longyu Pro`,
    desc: `${PEARL_PRO_COST} Pérolas ativam Pro completo por ${PEARL_PRO_PASS_DAYS} dias (máx. 1 a cada 30 dias).`,
    category: "pro",
    currency: "pearl",
    cost: PEARL_PRO_COST,
    iconKey: "pro",
    kind: "pearl_pro_pass",
    usableInShop: true,
    pro: true,
    durationLabel: `${PEARL_PRO_PASS_DAYS} dias`,
  },
  {
    id: "shop-pro",
    name: "Assinar Longyu Pro",
    desc: "Cargas ilimitadas, revisão inteligente, erros detalhados e ferramentas avançadas.",
    category: "pro",
    currency: "qi",
    cost: 0,
    iconKey: "pro",
    kind: "pro_link",
    pro: true,
  },
];

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function shopItemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.category === category);
}
