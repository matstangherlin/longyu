// ————————————————————————————————————————————————————————————————
// Economia do Longyu — tabela única de custos e ganhos.
//
// Filosofia (free-to-play ético, sem cassino):
// - A economia nunca vende progresso: Qi compra tentativas, conforto e
//   cosméticos — nunca lições concluídas nem XP.
// - Errar custa Fôlego (recurso da sessão), não Qi. O Qi só entra quando o
//   aluno ESCOLHE um atalho (refazer na hora, recuperar fôlego, retry de teste).
// - O plano grátis sempre tem um caminho sem pagar: missões dão Qi, cargas
//   voltam todo dia, revisão essencial nunca é bloqueada.
// - Pro remove fricção (cargas/fôlego/retry ilimitados), não adiciona poder.
//
// Todos os números de custo/ganho vivem aqui. Telas e store importam daqui
// para o balanceamento ser ajustável em um só lugar.
// ————————————————————————————————————————————————————————————————

// ——— Cargas (limite diário do grátis) ———
/** Cargas diárias do plano grátis; voltam para o máximo a cada dia. */
export const DAILY_CHARGES_FREE = 5;
/** Iniciar lição/atividade principal consome 1 Carga (revisão essencial: 0). */
export const CHARGE_COST_ACTIVITY = 1;

// ——— Fôlego (vidas dentro da lição) ———
/** Fôlego inicial por lição. Cada erro confirmado consome 1. */
export const BREATH_LIVES = 5;
/** Recuperar o Fôlego no meio da tentativa (escolha do aluno). */
export const BREATH_RECOVERY_QI = 50;

// ——— Qi: custos de atalho ———
/** Refazer a questão errada na hora, sem perder a perfeição. */
export const RETRY_QUESTION_QI = 1;
/** Refazer o teste de pular módulo (erro em teste custa mais que erro comum). */
export const MODULE_RETRY_QI = 30;

// ——— Estrelas ———
/** 3 estrelas: precisão mínima em lições com muitas questões. */
export const THREE_STAR_ACCURACY = 0.9;
/** Lições curtas também exigem domínio: 3 estrelas só com alta precisão. */
export const THREE_STAR_SHORT_ACCURACY = 0.9;
/** 2 estrelas: precisão mínima para considerar a lição passada. */
export const PASS_ACCURACY = 0.6;
/** Revisão de módulo: 80% basta para avançar; 90%+ vira excelente. */
export const MODULE_REVIEW_PASS_ACCURACY = 0.8;

// ——— Ganhos por lição (primeira conclusão) ———
export const LESSON_BASE_XP = 10;
export const LESSON_THREE_STAR_XP_BONUS = 5;
export const LESSON_THREE_STAR_QI = 5;
export const LESSON_NO_SKIP_QI = 2;
/** Meta diária batida: Qi do dia. */
export const DAILY_GOAL_QI = 8;

// ——— Teste de pular módulo ———
/** Qi ao passar no teste (pular com segurança é celebrado, não punido). */
export const MODULE_PASS_QI = 30;

// ——— Loja (preços em Qi, salvo indicação) ———
export const SHOP_PRICES = {
  /** Repõe o Fôlego dentro da lição. */
  breath: 50,
  /** +1 Carga para hoje. */
  charge: 80,
  /** Refazer teste de módulo sem esperar. */
  moduleRetry: 120,
  /** Baú comum. */
  chestSmall: 100,
  /** Baú raro. */
  chestDragon: 250,
  /** Escudo de sequência (protege 1 dia). */
  shield: 200,
  /** Treino focado por 24h (treino extra não consome Carga). */
  focusPass: 150,
  /** Cosméticos (tema/avatar). */
  cosmetic: 500,
  /** Pacote de Qi local — custa Pérolas (moeda rara), nunca dinheiro real. */
  qiPackPearls: 2,
} as const;

/** Qi entregue pelo Pacote de Qi (comprado com Pérolas). */
export const QI_PACK_AMOUNT = 120;

/** Duração do Treino Focado comprado na loja. */
export const FOCUS_PASS_HOURS = 24;

// ——— Baús: raridades ———
export type ChestRarity = "comum" | "raro" | "epico" | "lendario";

export const CHEST_RARITY_META: Record<ChestRarity, { label: string; color: string }> = {
  comum: { label: "Comum", color: "rgb(var(--accent))" },
  raro: { label: "Raro", color: "#B7791F" },
  epico: { label: "Épico", color: "#2F855A" },
  lendario: { label: "Lendário", color: "#7C5CBF" },
};
