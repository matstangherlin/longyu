import {
  DAILY_CHARGES_FREE,
  FREE_REVIEW_SESSION_LIMIT,
  PRO_CHEST_QI_MULTIPLIER,
  PRO_LESSON_QI_BONUS,
} from "./economy";

// ————————————————————————————————————————————————————————————————
// Matriz central Grátis vs Longyu Pro
//
// Fonte única para paywalls, ProPage, Ligas e copy de conta.
// A economia numérica continua em economy.ts; a enforcement em store.ts
// e proAccess.ts.
// ————————————————————————————————————————————————————————————————

export type PlanTier = "free" | "pro";

export type FeatureId =
  | "jornada"
  | "correcao_imediata"
  | "cargas"
  | "revisao_basica"
  | "revisao_ilimitada"
  | "erros_detalhados"
  | "treino_focado"
  | "pinyin_lab"
  | "hanzi_lab"
  | "imersao"
  | "historias_extras"
  | "ligas"
  | "ligas_estatisticas"
  | "missoes_pro"
  | "baus_pro"
  | "qi_bonus"
  | "plano_estudo_inteligente"
  | "estatisticas_avancadas";

/** Paywalls contextuais padronizados na UI pública. */
export type PaywallKind =
  | "energy"
  | "errors"
  | "weak_spots"
  | "story"
  | "review"
  | "pinyin"
  | "hanzi"
  | "reports"
  | "leagues"
  | "training"
  | "immersion"
  | "content"
  | "qi"
  | "speech";

/** Compatibilidade com ProPaywall legado (subset usado nas telas). */
export type ProPaywallKind = PaywallKind;

export const PRO_PAYWALL_CTA = "Ver planos Pro" as const;

export interface PlanFeature {
  id: FeatureId;
  nome: string;
  descricao: string;
  /** Plano que desbloqueia a experiência completa deste recurso. */
  plano: PlanTier;
  /** O que o grátis inclui (quando aplicável). */
  freeTier?: string;
  /** Limite ou fricção do plano grátis. */
  freeLimit?: string;
  /** Benefício adicional no Pro. */
  proBenefit: string;
  /** Paywall contextual ao bater limite ou pedir upgrade. */
  paywallKind?: PaywallKind;
  /** Rota principal do recurso. */
  rota?: string;
  /**
   * Recursos que nunca podem ser paywallados (jornada, correção imediata,
   * revisão essencial mínima, ligas básicas).
   */
  alwaysFree?: boolean;
}

export const PLAN_FEATURES: readonly PlanFeature[] = [
  {
    id: "jornada",
    nome: "Jornada",
    descricao: "Trilha pedagógica completa com lições, revisões e progressão guiada.",
    plano: "free",
    freeTier: "Jornada completa com todas as fases essenciais.",
    proBenefit: "Conteúdo premium extra e fases avançadas sem bloquear o caminho gratuito.",
    rota: "/",
    alwaysFree: true,
  },
  {
    id: "correcao_imediata",
    nome: "Correção imediata",
    descricao: "Corrigir o erro da lição atual na hora, sem esperar revisão.",
    plano: "free",
    freeTier: "Sempre disponível em qualquer lição.",
    proBenefit: "Continua grátis no Pro — nunca bloqueamos a correção da tentativa atual.",
    alwaysFree: true,
  },
  {
    id: "cargas",
    nome: "Cargas do Dragão",
    descricao: "Bateria diária para lições extras, labs e imersão.",
    plano: "free",
    freeTier: `${DAILY_CHARGES_FREE} cargas por dia`,
    freeLimit: `${DAILY_CHARGES_FREE} cargas/dia · missões devolvem cargas`,
    proBenefit: "Cargas ilimitadas — estude o quanto quiser.",
    paywallKind: "energy",
    rota: "/treino",
  },
  {
    id: "revisao_basica",
    nome: "Revisão básica",
    descricao: "Fila essencial de revisão espaçada para não esquecer o que aprendeu.",
    plano: "free",
    freeTier: `Até ${FREE_REVIEW_SESSION_LIMIT} itens por sessão`,
    freeLimit: `${FREE_REVIEW_SESSION_LIMIT} itens/sessão na fila básica`,
    proBenefit: "Revisão ilimitada com fila completa e priorização inteligente.",
    rota: "/revisao",
    alwaysFree: true,
  },
  {
    id: "revisao_ilimitada",
    nome: "Revisão ilimitada",
    descricao: "Revisar toda a fila ativa, filtros avançados e sessões longas.",
    plano: "pro",
    freeTier: `Revisão básica até ${FREE_REVIEW_SESSION_LIMIT} itens continua grátis.`,
    proBenefit: "Fila completa, filtros por modo e histórico de erros integrado.",
    paywallKind: "review",
    rota: "/revisao",
  },
  {
    id: "erros_detalhados",
    nome: "Erros detalhados",
    descricao: "Histórico completo, padrões de repetição e análise por competência.",
    plano: "pro",
    freeTier: "Correção imediata da lição atual continua grátis.",
    proBenefit: "Veja onde você mais erra e monte revisões a partir dos padrões.",
    paywallKind: "errors",
    rota: "/revisao",
  },
  {
    id: "treino_focado",
    nome: "Treino focado",
    descricao: "Sessão automática nos pontos fracos detectados pelo app.",
    plano: "pro",
    freeTier: "Treino básico e revisão essencial continuam grátis.",
    proBenefit: "Plano de treino montado a partir dos seus erros reais.",
    paywallKind: "weak_spots",
    rota: "/treino",
  },
  {
    id: "pinyin_lab",
    nome: "Pinyin Lab",
    descricao: "Laboratório de pinyin, tons e pronúncia guiada.",
    plano: "free",
    freeTier: "Modos básicos após desbloqueio na Jornada",
    freeLimit: "Consome Cargas no plano grátis",
    proBenefit: "Pinyin Lab completo, sem limite de Cargas.",
    paywallKind: "pinyin",
    rota: "/pinyin",
  },
  {
    id: "hanzi_lab",
    nome: "Hànzì Lab",
    descricao: "Componentes, famílias fonéticas e construção de caracteres.",
    plano: "free",
    freeTier: "Hànzì básico após desbloqueio na Jornada",
    freeLimit: "Laboratório profundo e atlas completo no Pro",
    proBenefit: "Hànzì Lab completo com famílias, padrões e atlas profundo.",
    paywallKind: "hanzi",
    rota: "/ideogramas",
  },
  {
    id: "imersao",
    nome: "Imersão",
    descricao: "Sessões de escuta, shadowing e histórias curtas.",
    plano: "free",
    freeTier: "Imersão básica com histórias introdutórias",
    freeLimit: "Consome Cargas por sessão",
    proBenefit: "Imersão ampliada e sessões sem limite de Cargas.",
    paywallKind: "immersion",
    rota: "/imersao",
  },
  {
    id: "historias_extras",
    nome: "Histórias extras",
    descricao: "Narrativas interativas com vocabulário e diálogos avançados.",
    plano: "pro",
    freeTier: "Histórias da trilha básica continuam grátis.",
    proBenefit: "Histórias extras com escolhas, diálogos maiores e revisão integrada.",
    paywallKind: "story",
    rota: "/imersao",
  },
  {
    id: "ligas",
    nome: "Ligas semanais",
    descricao: "Ranking semanal por XP com promoção e rebaixamento.",
    plano: "free",
    freeTier: "Participação na liga da sua divisão e recompensas básicas.",
    proBenefit: "Mesmo ranking justo — Pro não compra posição.",
    rota: "/ligas",
    alwaysFree: true,
  },
  {
    id: "ligas_estatisticas",
    nome: "Estatísticas das ligas",
    descricao: "Histórico semanal, comparação entre semanas e bônus de Qi nas recompensas.",
    plano: "pro",
    freeTier: "Ranking da própria liga e recompensa básica continuam grátis.",
    proBenefit: "Histórico completo (12 semanas), comparação e +15 Qi bônus ao resgatar.",
    paywallKind: "leagues",
    rota: "/ligas",
  },
  {
    id: "missoes_pro",
    nome: "Missões Pro",
    descricao: "Missões diárias e semanais com recompensas ampliadas.",
    plano: "pro",
    freeTier: "Missões diárias básicas e baús comuns continuam grátis.",
    proBenefit: "Missões exclusivas Pro com Qi e baús melhores.",
    rota: "/missoes",
  },
  {
    id: "baus_pro",
    nome: "Baús melhores",
    descricao: "Recompensas de baús com mais Qi e itens raros.",
    plano: "pro",
    freeTier: "Baús básicos e missões diárias continuam grátis.",
    proBenefit: `Baús rendem ${PRO_CHEST_QI_MULTIPLIER}× mais Qi no Pro.`,
    rota: "/loja",
  },
  {
    id: "qi_bonus",
    nome: "Bônus de Qi",
    descricao: "Qi extra ao concluir lições e missões.",
    plano: "pro",
    freeTier: "Qi base por lição e missões grátis.",
    proBenefit: `+${PRO_LESSON_QI_BONUS} Qi por lição concluída e retry sem custo de Qi.`,
    paywallKind: "qi",
    rota: "/pro",
  },
  {
    id: "plano_estudo_inteligente",
    nome: "Plano de estudo automático",
    descricao: "Recomendação do que estudar hoje com base nos seus erros.",
    plano: "pro",
    freeTier: "Jornada guiada e revisão básica continuam grátis.",
    proBenefit: "Sugestão automática de foco, treino e revisão por ponto fraco.",
    paywallKind: "weak_spots",
    rota: "/conta",
  },
  {
    id: "estatisticas_avancadas",
    nome: "Estatísticas avançadas",
    descricao: "Relatórios por motor, tom, habilidade e evolução no tempo.",
    plano: "pro",
    freeTier: "Resumo básico na Conta continua grátis.",
    proBenefit: "Relatórios detalhados e comparação entre períodos.",
    paywallKind: "reports",
    rota: "/conta",
  },
] as const;

const FEATURE_BY_ID = Object.fromEntries(PLAN_FEATURES.map((f) => [f.id, f])) as Record<
  FeatureId,
  PlanFeature
>;

const PAYWALL_BY_KIND = Object.fromEntries(
  PLAN_FEATURES.filter((f) => f.paywallKind).map((f) => [f.paywallKind!, f])
) as Partial<Record<PaywallKind, PlanFeature>>;

export function getPlanFeature(id: FeatureId): PlanFeature {
  return FEATURE_BY_ID[id];
}

export function getFreePlanFeatures(): PlanFeature[] {
  return PLAN_FEATURES.filter((f) => f.plano === "free" || f.alwaysFree);
}

export function getProOnlyFeatures(): PlanFeature[] {
  return PLAN_FEATURES.filter((f) => f.plano === "pro");
}

export function getFeatureByPaywallKind(kind: PaywallKind): PlanFeature | undefined {
  return PAYWALL_BY_KIND[kind];
}

export function isAlwaysFreeFeature(id: FeatureId): boolean {
  return Boolean(FEATURE_BY_ID[id]?.alwaysFree);
}

/** Highlights curtos para cards Grátis vs Pro na ProPage. */
export function getProPageFreeHighlights(): string[] {
  return [
    getPlanFeature("jornada").freeTier ?? getPlanFeature("jornada").nome,
    getPlanFeature("cargas").freeLimit ?? getPlanFeature("cargas").freeTier!,
    getPlanFeature("revisao_basica").freeLimit ?? getPlanFeature("revisao_basica").freeTier!,
    getPlanFeature("correcao_imediata").freeTier ?? "Correção imediata",
    getPlanFeature("ligas").freeTier ?? "Ligas básicas",
  ];
}

export function getProPageProHighlights(): string[] {
  return [
    getPlanFeature("cargas").proBenefit,
    getPlanFeature("revisao_ilimitada").proBenefit,
    getPlanFeature("erros_detalhados").proBenefit,
    `${getPlanFeature("pinyin_lab").proBenefit.split(".")[0]}. ${getPlanFeature("hanzi_lab").proBenefit.split(".")[0]}.`,
    getPlanFeature("imersao").proBenefit,
    getPlanFeature("qi_bonus").proBenefit,
  ];
}

export type ProBenefitGroup = {
  title: string;
  featureIds: FeatureId[];
};

export const PRO_BENEFIT_GROUPS: readonly ProBenefitGroup[] = [
  {
    title: "Estude sem limites",
    featureIds: ["cargas", "revisao_ilimitada", "imersao", "qi_bonus"],
  },
  {
    title: "Aprenda mais rápido",
    featureIds: ["erros_detalhados", "treino_focado", "plano_estudo_inteligente", "estatisticas_avancadas"],
  },
  {
    title: "Ferramentas completas",
    featureIds: ["pinyin_lab", "hanzi_lab", "historias_extras", "missoes_pro", "baus_pro"],
  },
  {
    title: "Competição e recompensas",
    featureIds: ["ligas_estatisticas"],
  },
] as const;

export function getAccountFreeBenefitLines(cloudEnabled: boolean): string[] {
  const lines = [
    getPlanFeature("jornada").freeTier!,
    getPlanFeature("revisao_basica").freeTier!,
    getPlanFeature("cargas").freeLimit!,
    getPlanFeature("ligas").freeTier!,
  ];
  if (cloudEnabled) {
    lines.push("Conta gratuita com sincronização na nuvem.");
  } else {
    lines.push("Progresso local neste dispositivo.");
  }
  return lines;
}

export function getAccountProBenefitLines(): string[] {
  return [
    getPlanFeature("cargas").proBenefit,
    getPlanFeature("revisao_ilimitada").proBenefit,
    getPlanFeature("erros_detalhados").proBenefit,
    getPlanFeature("pinyin_lab").proBenefit,
    getPlanFeature("ligas_estatisticas").proBenefit,
    "A Jornada continua pedagógica: Pro não conclui lições por você.",
  ];
}

export interface PaywallCopy {
  eyebrow: string;
  title: string;
  description: string;
  benefit: string;
  freeContinues: string;
}

function paywallFromFeature(feature: PlanFeature, overrides?: Partial<PaywallCopy>): PaywallCopy {
  return {
    eyebrow: feature.nome,
    title: overrides?.title ?? `Desbloqueie ${feature.nome.toLowerCase()} com o Longyu Pro`,
    description:
      overrides?.description ??
      `${feature.descricao} ${feature.freeTier ? `${feature.freeTier}.` : ""}`.trim(),
    benefit: overrides?.benefit ?? feature.proBenefit,
    freeContinues:
      overrides?.freeContinues ??
      feature.freeTier ??
      "O plano grátis continua funcionando para o essencial.",
  };
}

/** Copy padronizada dos paywalls contextuais. */
export const PAYWALL_COPY: Record<PaywallKind, PaywallCopy> = {
  energy: paywallFromFeature(getPlanFeature("cargas"), {
    eyebrow: "Cargas do Dragão",
    title: "Suas Cargas de hoje acabaram",
    description: `Continue sem limite com o Longyu Pro — ou volte amanhã, ou complete uma missão para recuperar cargas.`,
    benefit: getPlanFeature("cargas").proBenefit,
    freeContinues: `No grátis você tem ${DAILY_CHARGES_FREE} cargas por dia. Missões devolvem cargas.`,
  }),
  errors: paywallFromFeature(getPlanFeature("erros_detalhados"), {
    eyebrow: "Erros detalhados",
    title: "Veja seus padrões de erro e corrija pontos fracos",
    description:
      "A correção imediata do erro da lição atual continua grátis. O Pro adiciona o histórico completo e os padrões de repetição.",
    benefit: getPlanFeature("erros_detalhados").proBenefit,
    freeContinues: getPlanFeature("correcao_imediata").freeTier!,
  }),
  weak_spots: paywallFromFeature(getPlanFeature("treino_focado"), {
    eyebrow: "Treino focado",
    title: "O Pro cria uma revisão focada nos seus pontos fracos",
    description:
      "Você teve dificuldade nesta lição. Corrigir os erros agora continua grátis — o Pro monta um plano automático para os pontos que mais repetem.",
    benefit: getPlanFeature("plano_estudo_inteligente").proBenefit,
    freeContinues: getPlanFeature("revisao_basica").freeTier!,
  }),
  story: paywallFromFeature(getPlanFeature("historias_extras"), {
    eyebrow: "Histórias extras",
    title: "Histórias extras fazem parte do Longyu Pro",
    description: "As histórias da trilha básica continuam grátis. As histórias extras aprofundam vocabulário e diálogos.",
    benefit: getPlanFeature("historias_extras").proBenefit,
  }),
  review: paywallFromFeature(getPlanFeature("revisao_ilimitada"), {
    eyebrow: "Revisão ilimitada",
    title: "Revise além da fila essencial",
    description: `Continue a sessão com tarefas ativas e foco nas fraquezas que mais precisam voltar hoje.`,
    benefit: getPlanFeature("revisao_ilimitada").proBenefit,
    freeContinues: getPlanFeature("revisao_basica").freeTier!,
  }),
  pinyin: paywallFromFeature(getPlanFeature("pinyin_lab"), {
    eyebrow: "Pinyin Lab completo",
    title: "Pinyin Lab completo é Longyu Pro",
    description: "Modos básicos de pinyin continuam grátis com Cargas. O Pro libera o laboratório completo.",
    benefit: getPlanFeature("pinyin_lab").proBenefit,
  }),
  hanzi: paywallFromFeature(getPlanFeature("hanzi_lab"), {
    eyebrow: "Hànzì profundo",
    title: "Entenda o caractere por inteiro",
    description: "Explore famílias de componentes, padrões fonéticos e uso em palavras reais.",
    benefit: getPlanFeature("hanzi_lab").proBenefit,
    freeContinues: getPlanFeature("hanzi_lab").freeTier!,
  }),
  reports: paywallFromFeature(getPlanFeature("estatisticas_avancadas"), {
    eyebrow: "Estatísticas avançadas",
    title: "Veja exatamente onde avançar",
    description: "Acompanhe evolução por motor, tom, habilidade e período de estudo.",
    benefit: getPlanFeature("estatisticas_avancadas").proBenefit,
  }),
  leagues: paywallFromFeature(getPlanFeature("ligas_estatisticas"), {
    eyebrow: "Ligas avançadas",
    title: "Histórico e estatísticas das ligas são Pro",
    description:
      "Participar das ligas e ver o ranking da sua divisão continuam grátis. O Pro adiciona histórico completo e bônus de Qi.",
    benefit: getPlanFeature("ligas_estatisticas").proBenefit,
    freeContinues: getPlanFeature("ligas").freeTier!,
  }),
  training: paywallFromFeature(getPlanFeature("treino_focado"), {
    eyebrow: "Treino livre completo",
    title: "Treino livre completo é Pro",
    description: "O treino básico e a revisão essencial continuam grátis todos os dias.",
    benefit: getPlanFeature("treino_focado").proBenefit,
    freeContinues: getPlanFeature("revisao_basica").freeTier!,
  }),
  immersion: paywallFromFeature(getPlanFeature("imersao"), {
    eyebrow: "Imersão ampliada",
    title: "Mantenha o mandarim no ouvido",
    description: "Sessões de imersão usam Cargas no plano grátis. Com o Pro, a imersão fica ampliada.",
    benefit: getPlanFeature("imersao").proBenefit,
  }),
  content: paywallFromFeature(getPlanFeature("jornada"), {
    eyebrow: "Conteúdo premium",
    title: "Continue sua jornada completa",
    description: "Acesse novas fases, trilhas HSK e situações reais do mandarim com o Longyu Pro.",
    benefit: "A jornada gratuita permanece disponível; o Pro amplia o caminho para você avançar mais.",
    freeContinues: getPlanFeature("jornada").freeTier!,
  }),
  qi: paywallFromFeature(getPlanFeature("qi_bonus"), {
    eyebrow: "Refazer sem gastar Qi",
    title: "Continue praticando sem contar tentativas",
    description: "Com o Longyu Pro, repetir uma questão, lição ou teste não consome Qi.",
    benefit: getPlanFeature("qi_bonus").proBenefit,
  }),
  speech: {
    eyebrow: "Fala com IA",
    title: "Pratique conversas com feedback",
    description: "Em breve você poderá treinar conversas guiadas com feedback mais completo.",
    benefit: "Um recurso do Longyu Pro para praticar a fala com correção clara.",
    freeContinues: "Recursos básicos de fala continuam disponíveis na Jornada.",
  },
};

export function getLeagueProBonusLabel(): string {
  return getPlanFeature("ligas_estatisticas").proBenefit.split(".")[0];
}
