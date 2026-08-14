// ————————————————————————————————————————————————————————————————
// Economia do Longyu — tabela única de custos e ganhos.
//
// Filosofia (free-to-play ético, sem cassino):
// - A economia nunca vende progresso: Qi compra tentativas, conforto e
//   cosméticos — nunca lições concluídas nem XP.
// - Errar custa Vidas do Dragão (sessão) e, em sequência, pode gastar 1 Carga.
//   O Qi só entra quando o aluno ESCOLHE um atalho (refazer na hora, recuperar
//   vidas, retry de teste). Pular custa Fôlego (reserva da conta).
// - O plano grátis sempre tem um caminho sem pagar: missões dão Qi, cargas
//   voltam todo dia, revisão essencial nunca é bloqueada.
// - Pro remove fricção (cargas/fôlego/retry ilimitados), não adiciona poder.
//
// Todos os números de custo/ganho vivem aqui. Telas e store importam daqui
// para o balanceamento ser ajustável em um só lugar.
// ————————————————————————————————————————————————————————————————

// ——— Regras do plano grátis (resumo canônico) ———
// - Cargas diárias limitadas (DAILY_CHARGES_FREE); missões devolvem cargas.
// - Revisão básica limitada a FREE_REVIEW_SESSION_LIMIT itens por sessão.
// - Pinyin Lab, Hànzì Builder e sessões de áudio da Imersão consomem Cargas.
// - Histórias introdutórias grátis não consomem Carga ao abrir; podem conceder +1 Carga (teto STORY_ENERGY_DAILY_CAP/dia).
// - Erros detalhados (histórico + padrões) são Pro.
// - Correção imediata do erro da lição atual é SEMPRE grátis — nunca bloquear.
//
// ——— Regras do Pro (resumo canônico) ———
// - Cargas e revisão sem limite; erros detalhados e treino focado abertos.
// - Retry de questão/teste sem custo de Qi (spendQi não desconta no Pro).
// - Mais Qi por conclusão de lição (PRO_LESSON_QI_BONUS).
// - Baús rendem mais Qi (PRO_CHEST_QI_MULTIPLIER) e missões premium pagam mais.

// ——— Cargas (limite diário do grátis) ———
/** Cargas diárias do plano grátis; voltam para o máximo a cada dia. */
export const DAILY_CHARGES_FREE = 5;
/** Iniciar lição/atividade principal consome 1 Carga (revisão essencial: 0). */
export const CHARGE_COST_ACTIVITY = 1;
/** Histórias introdutórias grátis podem conceder até N cargas extras por dia. */
export const STORY_ENERGY_DAILY_CAP = 2;
/**
 * Erros confirmados seguidos na mesma lição: ao atingir este limiar, perde 1 Carga.
 * (2 = mais rígido; 4 = mais tolerante — usamos 4 como padrão.)
 */
export const CONSECUTIVE_MISTAKE_CHARGE_THRESHOLD = 4;
/** Cargas perdidas ao atingir o limiar de erros seguidos. */
export const CONSECUTIVE_MISTAKE_CHARGE_COST = 1;

/** Revisão básica do grátis: itens por sessão. Pro revisa a fila inteira. */
export const FREE_REVIEW_SESSION_LIMIT = 20;

/**
 * V3.9 · REVIEW-026 — tamanho da "revisão de hoje" apresentada ao aluno.
 *
 * A fila pode ter centenas de entradas devidas e ainda assim o convite tem
 * de ser uma sessão humana. Mostrar "Revisar 260 itens" como tarefa única
 * passa sensação de dívida infinita — mesmo quando a conta está correta.
 */
export const REVIEW_DAILY_SESSION_TARGET = 10;

// ——— Vidas do Dragão (dentro da lição) ———
/** Vidas iniciais por lição. Cada erro confirmado consome 1. */
export const BREATH_LIVES = 5;
/** Recuperar as vidas no meio da tentativa (escolha do aluno). */
export const BREATH_RECOVERY_QI = 50;

// ——— Fôlego do Dragão (reserva PERSISTENTE de skip, da conta) ———
// O Fôlego é gasto para PULAR uma tarefa difícil: a tarefa é concluída na hora
// (a lição destrava a próxima) e mandada para a revisão adaptativa, com a 3ª
// estrela "pendente" até o item ser dominado. É recarregado jogando bem e, no
// grátis, é limitado — quando zera, o Pro entra como skips ilimitados.
/** Fôlego inicial da conta (grátis). */
export const FOLEGO_START = 3;
/** Teto de Fôlego acumulável no plano grátis. */
export const FOLEGO_MAX_FREE = 5;
/** Custo em Fôlego para pular uma tarefa. */
export const FOLEGO_SKIP_COST = 1;
/** Fôlego ganho ao concluir uma rodada/lição sem erros e sem pular. */
export const FOLEGO_PERFECT_ROUND_REWARD = 1;
/**
 * Chance (0–1) de ganhar Fôlego numa rodada perfeita. Nem sempre recarrega —
 * mantém o skip como recurso escasso.
 */
export const FOLEGO_PERFECT_EARN_CHANCE = 0.4;
/** No máximo N ganhos de Fôlego por dia (grátis), além do teto da conta. */
export const FOLEGO_DAILY_EARN_CAP = 2;
/** Acertos seguidos na revisão para "dominar" um item pulado e recuperar a estrela. */
export const FOLEGO_PENDING_MASTERY_REPS = 2;

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
/** Pro: bônus de Qi por conclusão de lição (remove fricção, não compra XP). */
export const PRO_LESSON_QI_BONUS = 3;
/** Pro: baús pagam mais Qi (multiplicador aplicado só à parcela de Qi). */
export const PRO_CHEST_QI_MULTIPLIER = 1.5;
/** Pro: missões premium pagam este multiplicador extra de Qi no resgate. */
export const PRO_MISSION_QI_MULTIPLIER = 1.25;
/** Pro: chance extra de prêmio raro em baús pequeno (escudo / pérola). */
export const PRO_CHEST_RARE_BONUS = 0.12;
/** Pro: chance de pass de revisão profunda no Baú do Dragão. */
export const PRO_CHEST_FOCUS_PASS_CHANCE = 0.1;
/** Meta diária batida: Qi do dia. */
export const DAILY_GOAL_QI = 8;

/** Atividades que NUNCA consomem Carga (correção imediata, revisão essencial). */
export const CHARGE_FREE_ACTIVITIES = ["essential_review", "mistake_correction"] as const;

export const ECONOMY_SUMMARY = {
  free: {
    chargesPerDay: DAILY_CHARGES_FREE,
    reviewItemsPerSession: FREE_REVIEW_SESSION_LIMIT,
    chestSmall: "Qi, carga, escudo ou tentativa extra",
    missions: "Missões diárias de hábito, revisão, tons e lições",
    qiUses: "Retry extra, teste de módulo e recuperar Vidas",
  },
  pro: {
    charges: "Ilimitadas",
    review: "Fila completa",
    qiBonusPerLesson: PRO_LESSON_QI_BONUS,
    chestQiMultiplier: PRO_CHEST_QI_MULTIPLIER,
    chestDeepReview: "Chance de pass de revisão profunda nos baús raros",
    retryCost: "Grátis (sem gastar Qi)",
    missions: "Missões inteligentes + recompensas ampliadas",
    leagues: "Histórico e bônus de Qi — sem vantagem no ranking",
  },
} as const;

// ——— Teste de pular módulo ———
/** Qi ao passar no teste (recompensa leve — bem menor que lições completas). */
export const MODULE_PASS_QI = 30;
/** Qi concedido na validação por teste (uso real no app). */
export const MODULE_SKIP_VALIDATION_QI = 5;

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
  /**
   * Pacote de Qi local — custa Pérolas (moeda rara).
   * Preferência V2: 3 Pérolas → 120 Qi (guarda Pérola para benefícios maiores).
   */
  qiPackPearls: 3,
} as const;

/** Qi entregue pelo Pacote de Qi (comprado com Pérolas). */
export const QI_PACK_AMOUNT = 120;

/** Duração do Treino Focado comprado na loja (Qi). */
export const FOCUS_PASS_HOURS = 24;

// ——— Pérolas de Jade (moeda rara de prestígio) ———
// Qi = dia a dia. Pérolas = marcos. Nunca compram lição/estrela/progresso acadêmico.
export const PEARL_PRICES = {
  /** +1 Carga. */
  charge: 1,
  /** Treino sem consumir Carga por 24h. */
  focusPass24h: 2,
  /** Treino sem consumir Carga por 48h. */
  focusPass48h: 3,
  /** Escudo de sequência. */
  streakShield: 3,
  /** Cosmético especial (faixa 2–6; preço canônico do item especial). */
  cosmeticSpecial: 4,
  cosmeticMin: 2,
  cosmeticMax: 6,
  /** 7 dias de Longyu Pro/Plus. */
  proPass7d: 12,
  /** Conversão Pérola → Qi (uso secundário). */
  qiPack: 3,
} as const;

export const PEARL_PRO_PASS_DAYS = 7;
export const PEARL_PRO_COOLDOWN_DAYS = 30;
export const PEARL_PRO_COST = PEARL_PRICES.proPass7d;
export const FOCUS_PASS_48H_HOURS = 48;

/** Marcos únicos de ofensiva → Pérolas (não recorrentes / não farmáveis). */
export const PEARL_STREAK_MILESTONES = [
  { id: "streak:7", days: 7, pearls: 1 },
  { id: "streak:30", days: 30, pearls: 2 },
  { id: "streak:60", days: 60, pearls: 2 },
  { id: "streak:90", days: 90, pearls: 3 },
  { id: "streak:180", days: 180, pearls: 4 },
  { id: "streak:365", days: 365, pearls: 6 },
] as const;

export interface PearlMilestoneDef {
  id: string;
  threshold: number;
  pearls: number;
}

export const PEARL_ERROR_MILESTONES: readonly PearlMilestoneDef[] = [
  { id: "errors:25", threshold: 25, pearls: 1 },
  { id: "errors:100", threshold: 100, pearls: 2 },
  { id: "errors:250", threshold: 250, pearls: 3 },
];

export const PEARL_HANZI_MILESTONES: readonly PearlMilestoneDef[] = [
  { id: "hanzi:50", threshold: 50, pearls: 1 },
  { id: "hanzi:100", threshold: 100, pearls: 2 },
  { id: "hanzi:250", threshold: 250, pearls: 3 },
];

export const PEARL_AUDIO_MILESTONES: readonly PearlMilestoneDef[] = [
  { id: "audio:100", threshold: 100, pearls: 1 },
  { id: "audio:500", threshold: 500, pearls: 2 },
];

export const PEARL_PRODUCTION_MILESTONES: readonly PearlMilestoneDef[] = [
  { id: "production:100", threshold: 100, pearls: 1 },
  { id: "production:500", threshold: 500, pearls: 2 },
];

/** Completar uma fase inteira com 3★. */
export const PEARL_JOURNEY_PHASE_MASTER_PEARLS = 1;
/** Marcos maiores de fases/módulos (ex.: checkpoint). */
export const PEARL_JOURNEY_MAJOR_PEARLS = 2;
/** Desafio mensal concluído. */
export const PEARL_MONTHLY_CHALLENGE_PEARLS = 1;

export const PEARL_ECONOMY_SUMMARY = {
  qi: "Moeda comum — ganha estudando; compra conforto e conveniência. Nunca compra lição, estrela ou progresso.",
  pearls:
    "Pérolas de Jade — moeda rara de prestígio. Marcos importantes. Guarde para Cargas, escudo, cosméticos especiais ou 7 dias de Pro.",
  conversion: `${PEARL_PRICES.qiPack} Pérolas → ${QI_PACK_AMOUNT} Qi (uso secundário).`,
  proPass: `${PEARL_PRO_COST} Pérolas → ${PEARL_PRO_PASS_DAYS} dias de Longyu Pro (máx. 1 a cada ${PEARL_PRO_COOLDOWN_DAYS} dias).`,
} as const;

// ——— Baús: raridades ———
export type ChestRarity = "comum" | "raro" | "epico" | "lendario";

export const CHEST_RARITY_META: Record<ChestRarity, { label: string; color: string }> = {
  comum: { label: "Comum", color: "rgb(var(--accent))" },
  raro: { label: "Raro", color: "#B7791F" },
  epico: { label: "Épico", color: "#2F855A" },
  lendario: { label: "Lendário", color: "#7C5CBF" },
};
