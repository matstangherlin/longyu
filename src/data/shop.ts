// Catálogo da Loja do Longyu. Módulo puro (sem React/store): só metadados.
// O saldo, o inventário e as compras vivem na store; os efeitos de uso também.
// Preços vivem em data/economy.ts — a tabela única da economia.
//
// Princípios de economia (não quebrar o aprendizado):
// - A Loja não vende progresso: nada de "lição concluída" nem XP direto de graça.
// - Revisão essencial nunca é bloqueada por falta de item.
// - Itens ajudam retenção (fôlego, cargas, escudo, baús, cosméticos), não substituem estudo.
// - Nada de dinheiro real: Qi vem de estudo/missões; Pérolas são a moeda rara.

import { QI_PACK_AMOUNT, SHOP_PRICES } from "./economy";

export type ShopCategory = "uteis" | "baus" | "sequencia" | "cosmeticos" | "pro";

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
  | "qi_pack"
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
  /** Cosmético: compra única, vai para ownedCosmetics (não empilha no inventário). */
  cosmetic?: boolean;
  /** Item que dá para "Usar" direto na Loja (efeito imediato). */
  usableInShop?: boolean;
  /** Onde/como o item é consumido, quando não é na própria Loja. */
  usageHint?: string;
  /** Mostra o selo Pro. */
  pro?: boolean;
}

export const CATEGORY_META: Record<ShopCategory, { label: string; desc: string }> = {
  uteis: { label: "Úteis", desc: "Recupere fôlego, cargas e tentativas." },
  baus: { label: "Baús", desc: "Recompensas aleatórias para variar o dia." },
  sequencia: { label: "Sequência", desc: "Proteja sua ofensiva." },
  cosmeticos: { label: "Cosméticos", desc: "Personalize o Longyu (em breve)." },
  pro: { label: "Longyu Pro", desc: "Estude sem limites e com revisão inteligente." },
};

export const CATEGORY_ORDER: ShopCategory[] = ["uteis", "baus", "sequencia", "cosmeticos", "pro"];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "shop-breath",
    name: "Recuperar Vidas",
    desc: "Repõe as Vidas do Dragão na lição atual ou na próxima.",
    category: "uteis",
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
    category: "uteis",
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
    category: "uteis",
    currency: "qi",
    cost: SHOP_PRICES.moduleRetry,
    iconKey: "retry",
    kind: "module_retry",
    usageHint: "Fica no inventário e é usado ao refazer um teste de módulo.",
  },
  {
    id: "shop-focus-pass",
    name: "Treino Focado (24h)",
    desc: "Por 24 horas, treinos extras não consomem Carga. Pro tem isso sempre.",
    category: "uteis",
    currency: "qi",
    cost: SHOP_PRICES.focusPass,
    iconKey: "focus",
    kind: "focus_pass",
    usableInShop: true,
  },
  {
    id: "shop-qi-pack",
    name: `Pacote de Qi (${QI_PACK_AMOUNT})`,
    desc: `Troque Pérolas raras por ${QI_PACK_AMOUNT} Qi quando precisar de um empurrão.`,
    category: "uteis",
    currency: "pearl",
    cost: SHOP_PRICES.qiPackPearls,
    iconKey: "qi",
    kind: "qi_pack",
    usableInShop: true,
  },
  {
    id: "shop-chest-small",
    name: "Baú Comum",
    desc: "Raridade comum: Qi, XP, uma carga ou tentativa extra.",
    category: "baus",
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
    category: "baus",
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
    category: "sequencia",
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
    category: "cosmeticos",
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
    category: "cosmeticos",
    currency: "qi",
    cost: SHOP_PRICES.cosmetic,
    iconKey: "avatar",
    kind: "cosmetic",
    cosmetic: true,
  },
  {
    id: "shop-pro",
    name: "Longyu Pro",
    desc: "Cargas ilimitadas, revisão inteligente, erros detalhados e ferramentas avançadas. Veja os planos.",
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
