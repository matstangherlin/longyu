import {
  AXIS_BY_CAUSE,
  ERROR_CAUSE_LABELS,
  ERROR_CAUSE_ORDER,
  PRACTICE_VARIANT_BY_CAUSE,
  REMEDIATION_BY_CAUSE,
  type ErrorAxis,
  type ErrorCause,
  type RemediationModality,
} from "../data/errorDiagnosis";

// ————————————————————————————————————————————————————————————————
// Perfil de fraqueza (onda 4).
//
// diagnoseError() responde "por que ERROU ESTE item". Este módulo responde a
// pergunta seguinte, que é a que muda o currículo do aluno:
//
//   "em que este aluno erra REPETIDAMENTE?"
//
// O perfil é DERIVADO: lê os erros que o app já persiste
// (recentActivityErrors, últimos 60) e agrega por causa. Não há estado novo no
// store, não há migração, e o perfil se corrige sozinho — quando o aluno para
// de errar por tom, o peso de "tom" decai e a rota volta ao normal. Um perfil
// persistido separado congelaria um diagnóstico velho, que é exatamente o que
// não se quer num modelo de aprendizagem.
//
// Duas salvaguardas contra rotear o aluno por ruído:
//
//   1. decaimento por recência — erro de três semanas atrás quase não pesa;
//   2. limiares de dominância — só há rota dirigida quando uma causa tem
//      amostra suficiente E vantagem clara sobre a segunda colocada.
//
// Sem dominância, o app mantém o rodízio A/B/C de sempre. "Não sei o que este
// aluno tem de fraco" é uma resposta legítima, e agir como se soubesse seria
// pior do que o rodízio cego que já existia.
// ————————————————————————————————————————————————————————————————

/** Meia-vida da evidência. Após ~10 dias, um erro pesa metade. */
const HALF_LIFE_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Erro já corrigido ainda é evidência — o aluno tropeçou —, mas evidência
 * fraca: ele se recuperou na mesma sessão. Sem este desconto, uma lição em que
 * tudo foi recuperado deixaria a mesma marca de uma em que nada foi.
 */
const RESOLVED_FACTOR = 0.35;

/** Amostra mínima de erros diagnosticados para haver rota dirigida. */
const MIN_SAMPLE = 4;
/** Fração mínima do peso total para uma causa ser considerada dominante. */
const MIN_SHARE = 0.3;
/** Vantagem mínima sobre a 2ª colocada — evita rotear no cara ou coroa. */
const MIN_MARGIN = 1.25;

/**
 * Causas que descrevem ausência de sinal, não fraqueza. Entram no relatório
 * (são úteis para ver quanto o diagnóstico ainda não explica), mas nunca
 * dirigem a rota: mandar um aluno para o motor de áudio porque ele deixou
 * questões em branco seria inventar um diagnóstico.
 */
const NON_ROUTABLE = new Set<ErrorCause>(["no_answer", "unclassified"]);

/** Erro como o perfil precisa dele. Compatível com ActivityErrorRecord. */
export interface WeaknessErrorInput {
  diagnosis?: ErrorCause;
  timestamp?: number;
  wrongCount?: number;
  correctedAt?: number;
}

export interface WeaknessSignal {
  cause: ErrorCause;
  axis: ErrorAxis;
  label: string;
  /** Peso acumulado com decaimento — não é contagem bruta. */
  weight: number;
  /** Quantos erros distintos alimentaram esta causa. */
  count: number;
  /** Fatia do peso total (0–1). */
  share: number;
  /** Modalidade que ataca a causa. */
  remediation: RemediationModality;
}

export interface WeaknessProfile {
  /** Causas com peso, da mais forte para a mais fraca. */
  signals: WeaknessSignal[];
  /** Causa que dirige a rota — só quando os limiares são atingidos. */
  dominant?: WeaknessSignal;
  /** Eixo dominante (som/forma/estrutura/sentido), quando houver. */
  dominantAxis?: ErrorAxis;
  /** Erros diagnosticados considerados. */
  sampleSize: number;
  totalWeight: number;
}

export const EMPTY_WEAKNESS_PROFILE: WeaknessProfile = {
  signals: [],
  sampleSize: 0,
  totalWeight: 0,
};

/** Peso de um erro: repetições × recência × recuperação. */
function weightOf(error: WeaknessErrorInput, now: number): number {
  const repetitions = Math.max(1, Math.min(5, Math.trunc(error.wrongCount ?? 1)));
  const ageDays = Math.max(0, (now - (error.timestamp ?? now)) / DAY_MS);
  const recency = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
  const resolved = error.correctedAt ? RESOLVED_FACTOR : 1;
  return repetitions * recency * resolved;
}

/**
 * Agrega os erros recentes num perfil de fraqueza.
 *
 * Erros sem `diagnosis` são ignorados em vez de virarem "unclassified": são
 * registros anteriores à onda 4, e contá-los como causa desconhecida inflaria
 * o ruído justamente na conta que decide se há dominância.
 */
export function weaknessProfile(
  errors: readonly WeaknessErrorInput[] | undefined,
  now: number = Date.now()
): WeaknessProfile {
  const diagnosed = (errors ?? []).filter(
    (error): error is WeaknessErrorInput & { diagnosis: ErrorCause } => Boolean(error?.diagnosis)
  );
  if (diagnosed.length === 0) return EMPTY_WEAKNESS_PROFILE;

  const weights = new Map<ErrorCause, number>();
  const counts = new Map<ErrorCause, number>();
  for (const error of diagnosed) {
    const cause = error.diagnosis;
    weights.set(cause, (weights.get(cause) ?? 0) + weightOf(error, now));
    counts.set(cause, (counts.get(cause) ?? 0) + 1);
  }

  const totalWeight = [...weights.values()].reduce((sum, value) => sum + value, 0);
  const signals: WeaknessSignal[] = [...weights.entries()]
    .map(([cause, weight]) => ({
      cause,
      axis: AXIS_BY_CAUSE[cause],
      label: ERROR_CAUSE_LABELS[cause],
      weight,
      count: counts.get(cause) ?? 0,
      share: totalWeight > 0 ? weight / totalWeight : 0,
      remediation: REMEDIATION_BY_CAUSE[cause],
    }))
    // Empate desempata pela ordem canônica da taxonomia, para que o perfil seja
    // determinístico: o mesmo histórico tem que dar sempre a mesma rota.
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        ERROR_CAUSE_ORDER.indexOf(a.cause) - ERROR_CAUSE_ORDER.indexOf(b.cause)
    );

  const routable = signals.filter((signal) => !NON_ROUTABLE.has(signal.cause));
  const routableSample = routable.reduce((sum, signal) => sum + signal.count, 0);
  const leader = routable[0];
  const runnerUp = routable[1];

  const hasDominance =
    Boolean(leader) &&
    routableSample >= MIN_SAMPLE &&
    leader.share >= MIN_SHARE &&
    (!runnerUp || leader.weight >= runnerUp.weight * MIN_MARGIN);

  return {
    signals,
    ...(hasDominance ? { dominant: leader, dominantAxis: leader.axis } : {}),
    sampleSize: diagnosed.length,
    totalWeight,
  };
}

/** Rodízio cego original — mantido como base e como caminho sem perfil. */
export function rotationVariantForAttempt(attemptNumber = 0): "A" | "B" | "C" {
  return (["A", "B", "C"] as const)[Math.abs(Math.trunc(attemptNumber)) % 3];
}

/**
 * Escolhe a variante da tentativa.
 *
 * A primeira tentativa é SEMPRE "A": é o percurso autoral, a ordem que alguém
 * pensou para quem está vendo o conteúdo pela primeira vez. Diagnóstico não
 * atropela isso — não há evidência sobre uma lição que o aluno ainda não fez.
 *
 * A partir da segunda, se há causa dominante, a variante passa a ser a que mais
 * exercita aquela causa. Sem dominância, o rodízio de sempre.
 *
 * Ficar em C enquanto os tons estão fracos é o comportamento CORRETO, não um
 * bug de rodízio: o perfil decai sozinho, então a rota volta a girar assim que
 * o aluno para de errar por tom. A novidade entre tentativas é garantida por
 * outro eixo — a semente de geração (ver variantSeedOffsetForAttempt).
 */
export function practiceVariantForAttempt(
  attemptNumber = 0,
  profile?: WeaknessProfile
): "A" | "B" | "C" {
  const rotation = rotationVariantForAttempt(attemptNumber);
  if (rotation === "A") return "A";
  const dominant = profile?.dominant;
  if (!dominant) return rotation;
  return PRACTICE_VARIANT_BY_CAUSE[dominant.cause];
}

/**
 * Deslocamento de semente por tentativa.
 *
 * Antes, as sementes de geração saíam de `practiceVariant.charCodeAt(0)`, o que
 * amarrava NOVIDADE a VARIANTE: refazer a lição na mesma variante repetia a
 * mesma frase de transferência, e uma frase inédita repetida deixa de ser
 * inédita — vira frase decorada. Com a rota dirigida pela fraqueza a variante
 * pode legitimamente repetir, então a novidade precisa de eixo próprio: a
 * contagem de tentativas.
 */
export function variantSeedOffsetForAttempt(attemptNumber = 0): number {
  return Math.abs(Math.trunc(attemptNumber)) % 12;
}
