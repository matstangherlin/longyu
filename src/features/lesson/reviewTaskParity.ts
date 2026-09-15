/**
 * RC1.3 · P3 — a revisão pratica a MESMA habilidade que o aluno errou.
 *
 * O QA capturou o efeito no aluno: a revisão estava mais difícil e menos
 * contextualizada que a atividade original. Quem errou uma montagem de frase
 * recebia múltipla escolha; quem errou uma associação visual recebia texto puro.
 * O caminho da menor implementação — transformar tudo em MCQ — inverte a
 * pedagogia: a revisão deixa de treinar a habilidade que falhou.
 *
 * A regra principal (P3): a revisão NUNCA inventa um exercício mais difícil do que
 * o exercício que o aluno errou. Daqui saem duas garantias verificáveis:
 *
 * - `reviewKindsForSourceKind` — o conjunto de motores que a revisão pode usar
 *   para cada tipo de tarefa original (P3.2);
 * - `AUTHORIZED_REMEDIATION_TRANSFORMS` — as únicas conversões permitidas, cada
 *   uma com o motivo pedagógico escrito (P3.3). Qualquer outra conversão é
 *   silenciosa por definição e o gate reprova.
 */

import type { StepKind } from "../../data/journey";
import type { ImmediateRemediationKind } from "./immediateRemediation";

/**
 * Motores de revisão aceitáveis por tipo de tarefa original.
 *
 * A primeira entrada é o motor PREFERIDO — o que mantém a modalidade. As demais
 * existem porque nem todo passo tem dado para o motor preferido (um `listen`
 * sem áudio utilizável, por exemplo) e uma correção quebrada é pior que uma
 * correção equivalente.
 */
export const REVIEW_KINDS_BY_SOURCE_KIND: Partial<Record<StepKind, ImmediateRemediationKind[]>> = {
  // Áudio continua áudio (P3.2, mutação 7).
  listen: ["listen"],
  listen_select: ["listen"],
  audio_discrimination: ["listen"],
  dictation: ["listen", "build"],
  tone: ["tone", "listen"],
  tone_pair: ["pair", "listen", "tone"],
  /*
   * Associação visual continua associação visual — sem porta de saída.
   *
   * `choice` fica de fora de propósito. Os 339 itens visuais do currículo
   * resolvem o conceito canônico e voltam como `image`; deixar um fallback
   * textual declarado seria abrir exatamente a porta que P3.3 fecha, e ela se
   * abriria sozinha no dia em que um asset quebrasse.
   */
  image_choice: ["image"],
  compare_with_image: ["image", "choice"],
  // Montagem continua montagem.
  sentence_build: ["build"],
  translation_build: ["build"],
  hanzi_build: ["build"],
  produce: ["build"],
  spot_error: ["build"],
  sentence_transform: ["build"],
  address_build: ["build"],
  // Produção livre volta COM apoio (peças), nunca cobrando de novo sem andaime.
  free_production: ["build"],
  transfer_task: ["build"],
  conversation_repair: ["build", "choice"],
  reverse_recall: ["build", "choice"],
  // Lacuna continua lacuna.
  fill_blank: ["blank", "build"],
  substitution_drill: ["blank", "choice"],
  // Pares continuam pares.
  match_pairs: ["pair"],
  // Reconhecimento de forma continua forma.
  recognize: ["hanzi", "choice"],
  decompose: ["hanzi", "choice"],
  // Situação continua situação — remediação equivalente, com o contexto.
  dialogue_choice: ["choice"],
  dialogue_completion: ["choice"],
  contextual_choice: ["choice"],
  conversation_scene: ["choice"],
  comprehend: ["choice", "hanzi"],
  audio_to_action: ["listen", "choice"],
  place_label: ["choice", "image"],
  city_context: ["choice"],
  map_direction: ["choice"],
  sign_reading: ["choice"],
  menu_reading: ["choice"],
  price_task: ["choice"],
  route_sequence: ["choice", "build"],
  schedule_reading: ["choice"],
};

export interface AuthorizedTransform {
  from: StepKind;
  to: ImmediateRemediationKind;
  /** Por que esta conversão ensina — e não só simplifica a implementação. */
  reasonPt: string;
}

/**
 * P3.3 — conversões explicitamente autorizadas e testadas.
 *
 * Tudo o que não está aqui e muda a modalidade é conversão silenciosa. A lista é
 * curta de propósito: cada linha é uma decisão pedagógica, não uma conveniência.
 */
export const AUTHORIZED_REMEDIATION_TRANSFORMS: AuthorizedTransform[] = [
  {
    from: "conversation_scene",
    to: "choice",
    reasonPt:
      "Cena inteira não cabe num card de correção. A revisão mantém a MESMA situação e cobra a fala que travou, com o contexto à vista — remediação equivalente (P3.2), não MCQ genérica.",
  },
  {
    from: "conversation_repair",
    to: "choice",
    reasonPt:
      "Quando o reparo não tem peças reaproveitáveis, a revisão apresenta a mesma quebra de conversa e as respostas possíveis, preservando o contexto.",
  },
  {
    from: "free_production",
    to: "build",
    reasonPt:
      "Cobrar a mesma produção livre duas vezes ensina frustração. A revisão devolve o apoio (peças) — mais ajuda, não menos (P4.2).",
  },
  {
    from: "transfer_task",
    to: "build",
    reasonPt: "Mesma razão da produção livre: a transferência volta com andaime.",
  },
  {
    from: "dictation",
    to: "build",
    reasonPt: "Ditado em blocos já era montagem na tarefa original; a revisão mantém as peças.",
  },
  {
    from: "reverse_recall",
    to: "build",
    reasonPt: "Recall reverso volta com as peças à vista antes de voltar a cobrar de cabeça.",
  },
  {
    from: "tone_pair",
    to: "listen",
    reasonPt:
      "Par mínimo errado é problema de ouvido: a revisão volta pelo áudio com o par (P22), nunca por leitura.",
  },
  {
    from: "compare_with_image",
    to: "choice",
    reasonPt:
      "Sem os dois assets disponíveis, a revisão mantém os MESMOS conceitos contrastados em texto — o contraste continua, o suporte visual cai só quando não existe.",
  },
];

const AUTHORIZED = new Set(
  AUTHORIZED_REMEDIATION_TRANSFORMS.map((transform) => `${transform.from}→${transform.to}`)
);

export function reviewKindsForSourceKind(kind: StepKind | string | undefined): ImmediateRemediationKind[] {
  if (!kind) return [];
  return REVIEW_KINDS_BY_SOURCE_KIND[kind as StepKind] ?? [];
}

export function preferredReviewKind(kind: StepKind | string | undefined): ImmediateRemediationKind | undefined {
  return reviewKindsForSourceKind(kind)[0];
}

export interface TaskParityVerdict {
  ok: boolean;
  /** `true` quando a modalidade mudou por uma conversão autorizada. */
  authorizedTransform: boolean;
  reasonPt?: string;
}

/**
 * P3.1/P3.2 — a revisão é fiel à tarefa de origem?
 *
 * Tipos sem mapa (conteúdo novo que ainda não declarou paridade) passam: o gate
 * de cobertura é quem cobra o mapa, e travar o aluno por falta de tabela seria
 * o mesmo erro que estamos corrigindo.
 */
export function checkReviewTaskParity(input: {
  sourceKind: StepKind | string | undefined;
  reviewKind: ImmediateRemediationKind;
}): TaskParityVerdict {
  const allowed = reviewKindsForSourceKind(input.sourceKind);
  if (allowed.length === 0) return { ok: true, authorizedTransform: false };
  if (allowed[0] === input.reviewKind) return { ok: true, authorizedTransform: false };
  if (allowed.includes(input.reviewKind)) {
    const transform = AUTHORIZED_REMEDIATION_TRANSFORMS.find(
      (candidate) => candidate.from === input.sourceKind && candidate.to === input.reviewKind
    );
    if (transform) return { ok: true, authorizedTransform: true, reasonPt: transform.reasonPt };
    // Fallback declarado no mapa (sem dado para o motor preferido) — coerente,
    // porque o motor continua dentro da família da habilidade original.
    return { ok: true, authorizedTransform: false };
  }
  return {
    ok: false,
    authorizedTransform: AUTHORIZED.has(`${input.sourceKind}→${input.reviewKind}`),
    reasonPt: `revisão "${input.reviewKind}" fora da paridade de "${String(input.sourceKind)}" (permitidos: ${allowed.join(", ")})`,
  };
}

/** Mutação 6 — MCQ sem motivo é o modo mais fácil de perder a habilidade. */
export function isSilentMcqConversion(input: {
  sourceKind: StepKind | string | undefined;
  reviewKind: ImmediateRemediationKind;
}): boolean {
  if (input.reviewKind !== "choice") return false;
  const allowed = reviewKindsForSourceKind(input.sourceKind);
  if (allowed.length === 0 || allowed[0] === "choice") return false;
  if (allowed.includes("choice")) {
    return !AUTHORIZED.has(`${input.sourceKind}→choice`);
  }
  return true;
}
