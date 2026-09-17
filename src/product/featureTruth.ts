/**
 * Registro de verdade das CAPACIDADES do produto (RC1.5).
 *
 * `src/commercial/productTruth.ts` responde "o que dá para comprar hoje".
 * Este arquivo responde outra pergunta, e são eixos diferentes: "o que o app
 * realmente sabe fazer hoje". Assinar o Pro não faz um recurso existir; ter o
 * recurso pronto não faz ninguém conseguir pagar por ele. Misturar os dois foi
 * exatamente o bug que abriu a RC1.5 — a /fala cobrava paywall de uma
 * conversação com IA que nem o assinante podia usar.
 *
 * Os cinco estados, e a diferença é operacional, não de vontade:
 *
 * - `available`: está no ar e qualquer pessoa elegível usa hoje.
 * - `beta`: está no ar, funciona, mas depende de plataforma ou provisionamento
 *   — pode simplesmente não existir no navegador de quem abriu.
 * - `coming_soon`: não existe no produto. Pode ser anunciada como roadmap,
 *   nunca como entitlement, nunca atrás de paywall.
 * - `internal`: existe, mas só para operação/QA. Não aparece para o aluno.
 * - `disabled`: existiu ou foi escrita, e está desligada de propósito.
 *
 * Regras que os gates cobram (validate:feature-truth, validate:ghost-features):
 *
 * 1. Só `available` e `beta` podem abrir ProPaywall.
 * 2. `coming_soon` nunca tem CTA de aquisição nem handler "em breve" atrás de
 *    um botão que se apresenta como utilizável.
 * 3. A UI pergunta ao registro. Nenhuma tela decide sozinha, e nenhuma tela
 *    deriva disponibilidade de `isPro`.
 * 4. Uma capacidade que aponta para uma oferta (`offer`) não inventa estado
 *    comercial: quem manda sobre a oferta continua sendo o PRODUCT_TRUTH.
 */

import type { PaywallKind } from "../data/planFeatures";
import { PRODUCT_TRUTH, type ProductCapabilityId } from "../commercial/productTruth";

export const FEATURE_TRUTH_STATUSES = [
  "available",
  "beta",
  "coming_soon",
  "internal",
  "disabled",
] as const;
export type FeatureTruthStatus = (typeof FEATURE_TRUTH_STATUSES)[number];

/** Capacidades de plataforma que o navegador pode simplesmente não ter. */
export const PLATFORM_CAPABILITIES = ["microphone", "speech_recognition", "audio_output"] as const;
export type PlatformCapability = (typeof PLATFORM_CAPABILITIES)[number];

export interface FeatureCapability {
  readonly id: string;
  readonly status: FeatureTruthStatus;
  /** Por que este é o estado hoje. Vai para relatório, não para a tela. */
  readonly because: string;
  /** Capacidade de plataforma exigida em runtime (mic, áudio). */
  readonly requiresPlatform?: PlatformCapability;
  /** A experiência completa exige assinatura — eixo separado de `status`. */
  readonly requiresPro?: boolean;
  /** Paywall que esta capacidade pode legitimamente abrir. */
  readonly gatedBy?: PaywallKind;
  /** Oferta comercial correspondente. A autoridade continua no PRODUCT_TRUTH. */
  readonly offer?: ProductCapabilityId;
  /** Eventos de aprendizagem que esta capacidade tem direito de emitir. */
  readonly metrics?: readonly string[];
}

export const FEATURE_TRUTH = {
  // ——— Aprendizagem no ar ————————————————————————————————————————————
  journey_learning: {
    id: "journey_learning",
    status: "available",
    because: "134 lições no ar desde a RC1, congeladas por gate de fingerprint.",
    gatedBy: "content",
    metrics: ["lessonsCompleted", "threeStarLessons", "tonesTrained"],
  },
  review_remediation: {
    id: "review_remediation",
    status: "available",
    because: "Revisão finita com resposta canônica e paridade de ajuda desde a RC1.3.",
    gatedBy: "review",
    metrics: ["reviewsDone", "errorsCorrected"],
  },
  tone_contrast_training: {
    id: "tone_contrast_training",
    status: "available",
    because: "Treino de contraste tonal por par mínimo, sem pontuar acústica de ninguém.",
    metrics: ["tonesTrained"],
  },
  tts_playback: {
    id: "tts_playback",
    status: "available",
    requiresPlatform: "audio_output",
    because: "Web Speech API do próprio navegador; o app não sintetiza voz por conta.",
    metrics: ["audioHeard"],
  },
  phrase_chunk_training: {
    id: "phrase_chunk_training",
    status: "available",
    because: "É o que a /fala realmente faz: hànzì, pinyin, TTS, significado e SRS.",
    metrics: ["phrasesReviewed"],
  },
  hanzi_lab: {
    id: "hanzi_lab",
    status: "available",
    requiresPro: true,
    gatedBy: "hanzi",
    because: "Laboratório de decomposição no ar; a profundidade completa é do Pro.",
    metrics: ["hanziDecomposed"],
  },
  pinyin_lab: {
    id: "pinyin_lab",
    status: "available",
    requiresPro: true,
    gatedBy: "pinyin",
    because: "Pinyin Lab no ar; sem limite de Cargas é benefício do Pro.",
    metrics: ["audioHeard"],
  },
  immersion_audio: {
    id: "immersion_audio",
    status: "available",
    gatedBy: "immersion",
    because: "Sessões de áudio e histórias no ar, consumindo Carga no plano grátis.",
    metrics: ["audioHeard", "phrasesReviewed", "microtextsRead"],
  },
  interactive_stories: {
    id: "interactive_stories",
    status: "available",
    requiresPro: true,
    gatedBy: "story",
    because: "Histórias interativas no ar; as extras são do Pro.",
    metrics: ["phrasesReviewed", "microtextsRead"],
  },
  daily_energy: {
    id: "daily_energy",
    status: "available",
    gatedBy: "energy",
    because: "Cargas diárias, Qi e devolução por missão funcionam hoje, sem servidor.",
  },
  qi_economy: {
    id: "qi_economy",
    status: "available",
    gatedBy: "qi",
    because: "Qi por tarefa/acerto/lição é local e determinístico.",
  },
  focused_training: {
    id: "focused_training",
    status: "available",
    requiresPro: true,
    gatedBy: "training",
    because: "Treino montado a partir de erro real já registrado; o plano completo é Pro.",
    metrics: ["errorsCorrected", "reviewsDone"],
  },
  error_insights: {
    id: "error_insights",
    status: "available",
    requiresPro: true,
    gatedBy: "errors",
    because: "Padrões de erro derivam do histórico local que já existe.",
    metrics: ["errorsCorrected"],
  },
  weak_spot_plan: {
    id: "weak_spot_plan",
    status: "available",
    requiresPro: true,
    gatedBy: "weak_spots",
    because: "Prioriza itens fracos do SRS local — heurística declarada, não modelo.",
    metrics: ["reviewsDone"],
  },
  progress_reports: {
    id: "progress_reports",
    status: "available",
    requiresPro: true,
    gatedBy: "reports",
    because: "Relatórios lêem o progresso local que o app já guarda.",
  },
  leagues: {
    id: "leagues",
    status: "available",
    requiresPro: true,
    gatedBy: "leagues",
    because: "Liga semanal no ar; Pro compra histórico e bônus, nunca posição.",
  },

  // ——— Depende de plataforma ————————————————————————————————————————
  speech_recognition: {
    id: "speech_recognition",
    status: "beta",
    requiresPlatform: "speech_recognition",
    because:
      "Web Speech API nativa: existe em Chrome/Edge com HTTPS e microfone autorizado, e simplesmente não existe em vários navegadores. Devolve TEXTO reconhecido — nada de acústica.",
    metrics: ["phrasesSpoken"],
  },

  // ——— Provisionado por contrato ————————————————————————————————————
  family_management: {
    id: "family_management",
    status: "beta",
    offer: "family_plan",
    because:
      "Assentos, convite e entitlement funcionam no servidor; a assinatura que os alimenta ainda não pode ser comprada (PRODUCT_TRUTH manda na oferta).",
  },
  business_dashboard: {
    id: "business_dashboard",
    status: "beta",
    offer: "business_workspace",
    because: "Painel e licença funcionam, mas a organização entra por provisionamento, não por autoatendimento.",
  },

  // ——— Não existe ————————————————————————————————————————————————————
  ai_roleplay: {
    id: "ai_roleplay",
    status: "coming_soon",
    because:
      "Não existe conversação com IA no Longyu: nenhum modelo, nenhum backend de diálogo, nenhuma sessão. Até a RC1.4 a /fala vendia isso atrás de paywall.",
  },
  pronunciation_feedback: {
    id: "pronunciation_feedback",
    status: "coming_soon",
    because:
      "Não existe analisador acústico. Comparar o TEXTO reconhecido com o alvo não é avaliar pronúncia, e a RC1.3 já proibia fingir que era.",
  },
  tone_scoring: {
    id: "tone_scoring",
    status: "coming_soon",
    because:
      "Não existe Tone Analyzer. Nada no app mede f0, contorno ou duração — logo nada pode dizer que o tom de alguém está errado.",
  },
} as const satisfies Record<string, FeatureCapability>;

export type FeatureCapabilityId = keyof typeof FEATURE_TRUTH;

/**
 * Qual paywall pertence a qual capacidade.
 *
 * Todo `PaywallKind` precisa estar aqui, e o gate recusa um paywall que aponte
 * para capacidade que não está no ar. Foi esta tabela que matou o `speech`:
 * ele apontava para uma conversação com IA que não existe.
 */
export const PAYWALL_CAPABILITY: Record<PaywallKind, FeatureCapabilityId> = {
  qi: "qi_economy",
  energy: "daily_energy",
  immersion: "immersion_audio",
  hanzi: "hanzi_lab",
  pinyin: "pinyin_lab",
  reports: "progress_reports",
  content: "journey_learning",
  review: "review_remediation",
  errors: "error_insights",
  weak_spots: "weak_spot_plan",
  story: "interactive_stories",
  training: "focused_training",
  leagues: "leagues",
};

/** Leitura uniforme do registro: a tela vê `FeatureCapability`, não o literal. */
const REGISTRY: Record<FeatureCapabilityId, FeatureCapability> = FEATURE_TRUTH;

export function featureStatus(id: FeatureCapabilityId): FeatureTruthStatus {
  return REGISTRY[id].status;
}

export function featureCapability(id: FeatureCapabilityId): FeatureCapability {
  return REGISTRY[id];
}

/**
 * A capacidade existe no produto hoje?
 *
 * Note o que esta função não recebe: o estado Pro do usuário. Assinatura é
 * outro eixo (`requiresPro`), e confundir os dois é o bug da RC1.5.
 */
export function isFeatureLive(id: FeatureCapabilityId): boolean {
  const status = featureStatus(id);
  return status === "available" || status === "beta";
}

/** Só uma capacidade que existe pode cobrar por si mesma. */
export function canOpenPaywall(id: FeatureCapabilityId): boolean {
  return isFeatureLive(id);
}

/** O paywall deste tipo pode abrir? (usado pelo ProPaywall e pelos gates) */
export function canOpenPaywallKind(kind: PaywallKind): boolean {
  const capability = PAYWALL_CAPABILITY[kind];
  return Boolean(capability) && canOpenPaywall(capability);
}

/**
 * Capacidades que a tela pode anunciar como roadmap — e só como roadmap.
 * Nunca com CTA de compra, nunca com ar de entitlement disponível.
 */
export function isRoadmapOnly(id: FeatureCapabilityId): boolean {
  return featureStatus(id) === "coming_soon";
}

/** Oferta comercial ligada à capacidade, se houver. A autoridade é do PRODUCT_TRUTH. */
export function featureOfferAvailability(id: FeatureCapabilityId): string | null {
  const offer = REGISTRY[id].offer;
  return offer ? PRODUCT_TRUTH[offer].availability : null;
}
