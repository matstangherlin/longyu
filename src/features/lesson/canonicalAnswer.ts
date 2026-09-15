/**
 * RC1.3 · P6/P7/P8 — uma única resposta canônica.
 *
 * O QA real viu o pior tipo de bug pedagógico: a revisão perguntou
 *
 *     "Você quer pedir informação na loja ou na rua. O que abre a pergunta?"
 *
 * e, depois de uma resposta errada, mostrou como RESPOSTA CERTA
 *
 *     我叫马修
 *
 * enquanto a explicação logo abaixo dizia, corretamente,
 *
 *     请问 = com licença; abre a pergunta.
 *
 * Três superfícies — avaliação, feedback e explicação — falando de itens
 * diferentes. A causa está documentada em `lessonAttemptReview.ts`: o índice do
 * passo gravado no erro indexava o PLANO da sessão e era resolvido contra os
 * passos autorais da lição, então `error.step` (prompt + explicação) vinha de um
 * item e `error.correctAnswer` de outro.
 *
 * Aqui mora a defesa estrutural: TODA superfície deriva de uma única
 * `CanonicalResponse`. O avaliador compara `correctOptionId` — nunca índice
 * visual depois do shuffle (P6.2/P6.4). O feedback recebe a resposta canônica
 * pronta (P6.5). A explicação vem do mesmo objeto (P6.6). O áudio toca
 * `audioTarget` da resposta canônica, nunca a opção errada que o aluno tocou
 * (P6.7). E, quando a explicação contradiz a resposta, a correção NÃO é
 * apresentada: falha fechada com `ANSWER_INTEGRITY_MISMATCH` (P8).
 */

const CJK = /[㐀-鿿]/u;
const CJK_RUN = /[㐀-鿿]+/gu;

export interface CanonicalResponse {
  /** Identidade estável da resposta — é ela que o avaliador compara. */
  id: string;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  explanation?: string;
  /** Texto mandarim que o feedback toca automaticamente (P9). */
  audioTarget?: string;
  /** O que a linha "Resposta certa" mostra. */
  display: string;
  /** Valor comparável (normalizado por `normalizeCanonicalValue`). */
  value: string;
}

export interface CanonicalOption {
  /** Id estável, atribuído ANTES do shuffle (P6.3). */
  id: string;
  label: string;
}

export interface CanonicalOptionSet {
  options: CanonicalOption[];
  correctOptionId: string;
}

export function normalizeCanonicalValue(value: string | undefined): string {
  return (value ?? "")
    .replace(/[，。！？、,.!?？\s]/g, "")
    .toLowerCase()
    .replace(/[;:()[\]{}"']/g, "")
    .trim();
}

/** Runs contíguos de hànzì no texto — a unidade que comparamos entre superfícies. */
export function hanziTokens(text: string | undefined): string[] {
  if (!text) return [];
  return [...text.matchAll(CJK_RUN)].map((match) => match[0]);
}

export function containsHanzi(text: string | undefined): boolean {
  return Boolean(text && CJK.test(text));
}

/**
 * P6.2/P6.3 — ids estáveis ANTES do embaralhamento.
 *
 * O id não depende da posição: é derivado do próprio rótulo (com sufixo em caso
 * de repetição). Assim, embaralhar a apresentação não pode mover a resposta
 * certa — o avaliador compara id, e o id acompanha o texto.
 */
export function assignOptionIds(labels: readonly string[]): CanonicalOption[] {
  const used = new Map<string, number>();
  return labels.map((label) => {
    const base = normalizeCanonicalValue(label) || "opt";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return { id: seen === 0 ? `opt:${base}` : `opt:${base}#${seen}`, label };
  });
}

/** Embaralhamento determinístico por seed — mesma seed, mesma ordem. */
export function shuffleOptions<T>(items: readonly T[], seed: string): T[] {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const next = () => {
    hash += 0x6d2b79f5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Monta o conjunto de opções a partir da resposta canônica.
 *
 * O fluxo é o do P6.3: opções originais → ids estáveis → shuffle de
 * apresentação → o aluno seleciona um optionId → o avaliador compara com
 * `correctOptionId`. Em nenhum ponto existe um índice.
 */
export function buildCanonicalOptionSet(input: {
  canonical: CanonicalResponse;
  distractors: readonly string[];
  seed: string;
  maxDistractors?: number;
  /**
   * Rótulo da alternativa correta, quando difere do que o feedback mostra.
   *
   * Numa lacuna, o aluno escolhe o pedaço que falta ("不客气") enquanto a linha
   * "Resposta certa" mostra a frase inteira. São papéis diferentes do MESMO
   * item: `value` (o que se compara) e `display` (o que se lê). Misturar os dois
   * era o que fazia a checagem de integridade acusar "不客气 × 不客气".
   */
  correctLabel?: string;
}): CanonicalOptionSet {
  const correctLabel = input.correctLabel ?? input.canonical.display;
  const answerValue = normalizeCanonicalValue(correctLabel);
  const seen = new Set<string>([answerValue]);
  const distractors: string[] = [];
  for (const raw of input.distractors) {
    const label = raw?.trim();
    if (!label) continue;
    const value = normalizeCanonicalValue(label);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    distractors.push(label);
    if (distractors.length >= (input.maxDistractors ?? 3)) break;
  }
  const withIds = assignOptionIds([correctLabel, ...distractors]);
  const correctOptionId = withIds[0].id;
  return { options: shuffleOptions(withIds, input.seed), correctOptionId };
}

/** P6.4 — o avaliador só conhece ids. Posição 2 não significa nada. */
export function evaluateCanonicalChoice(
  optionId: string | null | undefined,
  optionSet: CanonicalOptionSet
): boolean {
  return Boolean(optionId) && optionId === optionSet.correctOptionId;
}

export type AnswerIntegrityCode =
  | "ANSWER_INTEGRITY_MISMATCH"
  | "ANSWER_INTEGRITY_EMPTY"
  | "ANSWER_INTEGRITY_OPTION_MISSING"
  | "ANSWER_INTEGRITY_AUDIO_MISMATCH";

export interface AnswerIntegrityIssue {
  code: AnswerIntegrityCode;
  detail: string;
}

export interface AnswerIntegrityResult {
  ok: boolean;
  issues: AnswerIntegrityIssue[];
}

/**
 * P8 — falha FECHADA.
 *
 * Se a resposta canônica e a explicação não falam do mesmo item, não existe
 * correção honesta a mostrar. Melhor omitir a linha "Resposta certa" e registrar
 * `ANSWER_INTEGRITY_MISMATCH` do que ensinar 我叫马修 como abertura de pergunta.
 *
 * A checagem é conservadora de propósito: só acusa quando a explicação nomeia
 * hànzì E nenhum deles é o alvo canônico. Explicação sem hànzì (a maioria)
 * nunca reprova — não há como ela contradizer nada.
 */
export function checkAnswerIntegrity(input: {
  canonical: CanonicalResponse;
  optionSet?: CanonicalOptionSet;
}): AnswerIntegrityResult {
  const issues: AnswerIntegrityIssue[] = [];
  const { canonical, optionSet } = input;

  if (!canonical.display.trim() || !canonical.value) {
    issues.push({ code: "ANSWER_INTEGRITY_EMPTY", detail: `resposta canônica vazia (${canonical.id})` });
  }

  const answerHanzi = hanziTokens(canonical.display).concat(hanziTokens(canonical.hanzi));
  const explanationHanzi = hanziTokens(canonical.explanation);
  if (answerHanzi.length > 0 && explanationHanzi.length > 0) {
    const answerSet = new Set(answerHanzi.map(normalizeCanonicalValue));
    const mentionsAnswer = explanationHanzi.some((token) => {
      const value = normalizeCanonicalValue(token);
      for (const answer of answerSet) {
        if (answer.includes(value) || value.includes(answer)) return true;
      }
      return false;
    });
    if (!mentionsAnswer) {
      issues.push({
        code: "ANSWER_INTEGRITY_MISMATCH",
        detail: `resposta "${canonical.display}" × explicação "${explanationHanzi.join(" ")}"`,
      });
    }
  }

  if (canonical.audioTarget) {
    const audio = normalizeCanonicalValue(canonical.audioTarget);
    const answer = normalizeCanonicalValue(canonical.hanzi ?? canonical.display);
    if (containsHanzi(canonical.audioTarget) && containsHanzi(canonical.hanzi ?? canonical.display)) {
      if (!audio.includes(answer) && !answer.includes(audio)) {
        issues.push({
          code: "ANSWER_INTEGRITY_AUDIO_MISMATCH",
          detail: `áudio "${canonical.audioTarget}" × resposta "${canonical.hanzi ?? canonical.display}"`,
        });
      }
    }
  }

  if (optionSet) {
    const correct = optionSet.options.find((option) => option.id === optionSet.correctOptionId);
    if (!correct) {
      issues.push({
        code: "ANSWER_INTEGRITY_OPTION_MISSING",
        detail: `correctOptionId ${optionSet.correctOptionId} não está entre as opções`,
      });
    } else if (normalizeCanonicalValue(correct.label) !== canonical.value) {
      issues.push({
        code: "ANSWER_INTEGRITY_MISMATCH",
        detail: `opção correta "${correct.label}" (${normalizeCanonicalValue(correct.label)}) × valor canônico "${canonical.value}"`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Diagnóstico para telemetria/console quando a integridade falha. Fica separado
 * do render porque a UI só precisa saber "não mostre"; quem investiga precisa
 * saber o quê e onde.
 */
export function answerIntegrityDiagnostic(input: {
  canonical: CanonicalResponse;
  result: AnswerIntegrityResult;
  context?: Record<string, unknown>;
}): { code: "ANSWER_INTEGRITY_MISMATCH"; canonicalId: string; issues: AnswerIntegrityIssue[]; context?: Record<string, unknown> } {
  return {
    code: "ANSWER_INTEGRITY_MISMATCH",
    canonicalId: input.canonical.id,
    issues: input.result.issues,
    context: input.context,
  };
}
