import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import type { LessonStep } from "../../data/journey";
import { REMEDIATION_BY_CAUSE } from "../../data/errorDiagnosis";
import type { ActivityErrorRecord } from "../../lib/store";

/**
 * Revisão imediata pós-lição — geração central da correção.
 *
 * Cada erro da tentativa atual (`ActivityErrorRecord`, opcionalmente com o
 * `step` original anexado) vira UM exercício de correção diretamente ligado ao
 * que o aluno errou. Nada de revisão aleatória, nada de flashcard genérico
 * quando há forma melhor: o tipo do erro decide o formato da correção.
 */
export type ImmediateRemediationKind =
  | "choice"
  | "build"
  | "pair"
  | "listen"
  | "blank"
  | "hanzi"
  | "pinyin"
  | "tone";

/** Erro da tentativa atual; `step` só existe na revisão in-lesson. */
export interface ActivityErrorInput extends ActivityErrorRecord {
  step?: LessonStep;
}

export interface ImmediateRemediationExercise {
  kind: ImmediateRemediationKind;
  /** Instrução curta para o aluno. */
  prompt: string;
  /** Conteúdo do erro re-apresentado (hànzì, frase, contexto do diálogo). */
  display?: string;
  displayPinyin?: string;
  /** Partes da frase ao redor da lacuna (fill_blank). */
  blankBefore?: string;
  blankAfter?: string;
  /** Resposta usada na verificação (normalizável). */
  answer: string;
  /** Resposta mostrada no feedback, quando difere do valor verificado. */
  answerDisplay?: string;
  /** Opções para exercícios de escolha. */
  options?: string[];
  /** Peças para exercícios de montagem. */
  pieces?: string[];
  /** Junção das peças montadas ("" hànzì/frase, " " tradução). */
  pieceJoin: string;
  /** Texto para tocar o áudio (listen). */
  audioText?: string;
  explanation?: string;
  meaningPt?: string;
  /** Erro de origem — permite marcar como corrigido e recuperar a estrela. */
  sourceErrorId: string;
  canRecoverStar: true;
}

const TONE_OPTIONS = ["1º tom", "2º tom", "3º tom", "4º tom"];
const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));

function normalizeHanzi(text: string): string {
  return text.replace(/[，。！？、,.!?？\s]/g, "");
}

/** Comparação tolerante usada tanto aqui quanto na verificação da resposta. */
export function normalizeRemediationAnswer(value: string | undefined): string {
  return normalizeHanzi(value ?? "")
    .toLowerCase()
    .replace(/[;:()[\]{}"']/g, "")
    .trim();
}

function uniqueNonEmpty(values: (string | undefined)[]): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function charsInText(text: string | undefined) {
  if (!text) return [];
  return [...normalizeHanzi(text)]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is (typeof CHARACTERS)[number] => Boolean(char));
}

function findChunkByText(text: string | undefined) {
  if (!text) return undefined;
  const normalized = normalizeHanzi(text);
  return CHUNKS.find((chunk) => normalizeHanzi(chunk.hanzi) === normalized);
}

/**
 * Ordem estável e não-óbvia: embaralha de forma determinística pelo id do erro
 * para que a resposta certa não fique sempre na primeira posição, sem reordenar
 * a cada re-render do mesmo exercício.
 */
function seededOrder<T>(items: T[], seed: string): T[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const next = () => {
    hash += 0x6d2b79f5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Monta opções: resposta correta + até 3 distratores plausíveis, embaralhadas. */
function buildChoiceOptions(answer: string, distractorPools: (string | undefined)[], seed: string): string[] {
  const answerNorm = normalizeRemediationAnswer(answer);
  const distractors = uniqueNonEmpty(distractorPools)
    .filter((option) => normalizeRemediationAnswer(option) !== answerNorm)
    .slice(0, 3);
  return seededOrder(uniqueNonEmpty([answer, ...distractors]), seed);
}

function meaningDistractors(answer: string): string[] {
  return [
    ...CHUNKS.map((chunk) => chunk.meaningPt),
    ...CHARACTERS.map((char) => char.meaningPt),
  ].filter((meaning) => normalizeRemediationAnswer(meaning) !== normalizeRemediationAnswer(answer));
}

function pinyinDistractors(answer: string): string[] {
  return CHARACTERS.map((char) => char.pinyin).filter(
    (pinyin) => normalizeRemediationAnswer(pinyin) !== normalizeRemediationAnswer(answer)
  );
}

/** A pergunta já cobrava um tom — só aí "qual é o tom?" é uma correção coerente. */
function isToneQuestion(error: ActivityErrorInput): boolean {
  return error.type === "tone" || /\d\s*º?\s*tom/i.test(error.correctAnswer);
}

/** Há material sonoro para tocar? Sem isto, "ouça de novo" tocaria a resposta escrita. */
function canReplayAudio(error: ActivityErrorInput): boolean {
  return Boolean(error.hanzi || error.step?.audioText);
}

/** A correção por hànzì pergunta o SIGNIFICADO — precisa de glifo e de resposta em pt. */
function canAskHanziMeaning(error: ActivityErrorInput): boolean {
  return Boolean(error.hanzi) && !containsHanzi(error.correctAnswer);
}

/**
 * Formato da correção a partir da CAUSA do erro (onda 4).
 *
 * Antes, o formato saía do tipo do exercício: errar por tom dentro de uma
 * montagem de frase devolvia outra montagem de frase, que é justamente o que
 * não treina tom. A causa sabe qual motor ataca o problema.
 *
 * Devolve `undefined` quando o formato indicado pela causa não tem dado para
 * existir — aí vale o formato pelo tipo do exercício. Redirecionar sem os dados
 * produziria uma correção quebrada (perguntar "qual é o tom?" e aceitar um
 * significado como resposta), e uma correção quebrada é pior que uma genérica.
 */
function remediationKindForCause(error: ActivityErrorInput): ImmediateRemediationKind | undefined {
  const cause = error.diagnosis;
  // Sem sinal de causa não há o que dirigir: quem decide é o tipo do exercício.
  if (!cause || cause === "no_answer" || cause === "unclassified") return undefined;

  switch (REMEDIATION_BY_CAUSE[cause]) {
    case "tone_contrast":
      if (isToneQuestion(error)) return "tone";
      return canReplayAudio(error) ? "listen" : undefined;
    case "audio_discrimination":
    case "dictation":
      return canReplayAudio(error) ? "listen" : undefined;
    case "hanzi_form":
      return canAskHanziMeaning(error) ? "hanzi" : undefined;
    // Ordem e objetivo voltam montando: é o formato que expõe a estrutura.
    case "slot_order":
    case "spot_error":
    case "goal_production":
      return "build";
    // A lacuna só existe se o exercício de origem tinha lacuna; senão, montar.
    case "fill_gap":
      return error.step?.blankAnswer ? "blank" : "build";
    case "meaning_pair":
      if (error.type === "pair-match") return "pair";
      return canAskHanziMeaning(error) ? "hanzi" : "choice";
    default:
      return undefined;
  }
}

function remediationKind(error: ActivityErrorInput): ImmediateRemediationKind {
  const byCause = remediationKindForCause(error);
  if (byCause) return byCause;
  if (error.type === "pair-match") return "pair";
  if (error.type === "dialogue_choice" || error.type === "conversation_scene") return "build";
  if (error.type === "tone") return "tone";
  // Errou o par mínimo ou o ditado: o problema é ouvido, então a remediação
  // imediata volta pelo áudio, nunca por leitura.
  if (error.type === "audio_discrimination") return "listen";
  if (error.type === "dictation") return error.step?.dictationMode === "blocks" ? "build" : "listen";
  if (error.type === "spot_error") return "build";
  // Falhou produzindo sozinho: a remediação imediata devolve o apoio (montar
  // com peças) em vez de cobrar de novo o que acabou de não sair. Cobrar duas
  // vezes a mesma produção livre ensina frustração, não a frase.
  if (
    error.type === "free_production" ||
    error.type === "transfer_task" ||
    error.type === "conversation_repair"
  ) {
    return "build";
  }
  if (error.type === "listen_select" || error.type === "tone_pair" || error.skill === "som") return "listen";
  if (error.type === "hanzi_build") return "build";
  if (
    error.type === "sentence_build" ||
    error.type === "translation_build" ||
    error.type === "produce"
  ) {
    return "build";
  }
  if (error.type === "fill_blank") return "blank";
  if (error.type === "recognize" || error.type === "decompose" || error.skill === "forma" || error.skill === "hanzi") {
    return "hanzi";
  }
  if (error.skill === "pinyin") return "pinyin";
  return "choice";
}

/** Peças de montagem: alvo + distratores do próprio exercício (podem repetir). */
function buildPieces(error: ActivityErrorInput, fallbackAnswer: string): string[] {
  const step = error.step;
  const targetParts = step?.targetParts ?? step?.target ?? [];
  const base =
    targetParts.length > 0
      ? [...targetParts]
      : fallbackAnswer.includes(" ")
        ? fallbackAnswer.split(/\s+/).filter(Boolean)
        : [...normalizeHanzi(fallbackAnswer)];
  // Distratores reais: peças do banco que não repetem o alvo (evita bandeja
  // com cópias redundantes tipo 你/你/好/好 quando o banco já traz o alvo).
  const baseSet = new Set(base.map(normalizeHanzi));
  const extras = [...(step?.bank ?? []), ...(step?.distractors ?? [])]
    .filter(Boolean)
    .filter((piece) => !baseSet.has(normalizeHanzi(piece)));
  const combined = [...base, ...extras].slice(0, Math.max(base.length + 3, 4));
  return seededOrder(combined, error.id);
}

function containsHanzi(text: string): boolean {
  return /[\u3400-\u9fff]/u.test(text);
}

function replyTokens(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return containsHanzi(trimmed)
    ? [...normalizeHanzi(trimmed)]
    : trimmed.split(/\s+/).filter(Boolean);
}

/**
 * Cena/diálogo já testou escolha de resposta. Na recuperação, mantém a mesma
 * intenção e o mesmo alvo, mas troca a abordagem por montagem da fala.
 */
function buildReplyPieces(error: ActivityErrorInput, answer: string): string[] {
  const base = replyTokens(answer);
  const baseSet = new Set(base.map(normalizeRemediationAnswer));
  const distractorTokens = uniqueNonEmpty(
    (error.step?.options ?? []).flatMap((option) => replyTokens(option))
  ).filter((token) => !baseSet.has(normalizeRemediationAnswer(token)));
  const extras = distractorTokens.slice(0, 3);
  return seededOrder([...base, ...extras], error.id);
}

function originalTaskPrompt(error: ActivityErrorInput): string {
  const step = error.step;
  return (
    step?.dialoguePrompt ??
    step?.checkpoint?.prompt ??
    step?.prompt ??
    error.prompt.split(" (cena:")[0]?.trim() ??
    "Responda à mesma situação."
  );
}

/**
 * Constrói a correção imediata para um erro da tentativa atual.
 *
 * Fiel ao erro real: mesmo par, mesma frase, mesmo hànzì, mesmo tom. Retorna
 * sempre `canRecoverStar: true` — corrigir todos os erros da tentativa devolve
 * a 3ª estrela.
 */
export function buildImmediateRemediationExercise(error: ActivityErrorInput): ImmediateRemediationExercise {
  const kind = remediationKind(error);
  const step = error.step;
  const base = {
    sourceErrorId: error.id,
    canRecoverStar: true as const,
    explanation: error.explanation ?? error.mistakeReason,
    meaningPt: error.meaningPt,
    pieceJoin: "",
  };

  if (kind === "pair") {
    // match_pairs / tone_pair: revisar SÓ o par errado, nunca a tabela inteira.
    const answer = error.correctAnswer;
    const left = error.pairLeft ?? error.hanzi;
    const pairMeanings = (step?.pairs ?? []).map((pair) => {
      const parts = pair.right.split("·").map((part) => part.trim()).filter(Boolean);
      return parts.length >= 2 ? parts.slice(1).join(" · ") : pair.right;
    });
    return {
      ...base,
      kind: "pair",
      prompt: left ? `O que significa ${left}?` : "Combine com o significado correto.",
      display: error.hanzi ?? left,
      displayPinyin: error.pinyin,
      answer,
      options: buildChoiceOptions(
        answer,
        [error.selectedAnswer, ...pairMeanings, ...meaningDistractors(answer)],
        error.id
      ),
    };
  }

  if (kind === "tone") {
    const answer = error.correctAnswer;
    return {
      ...base,
      kind: "tone",
      prompt: error.hanzi ? `Qual é o tom de ${error.hanzi}?` : "Escolha o tom correto.",
      display: error.hanzi,
      displayPinyin: error.pinyin,
      answer,
      options: buildChoiceOptions(answer, [error.selectedAnswer, ...TONE_OPTIONS], error.id),
    };
  }

  if (kind === "listen") {
    const answer = error.correctAnswer;
    const stepOptions = step?.options ?? [];
    return {
      ...base,
      kind: "listen",
      prompt: "Ouça de novo e escolha a resposta correta.",
      audioText: error.hanzi ?? step?.audioText ?? answer,
      answer,
      options: buildChoiceOptions(
        answer,
        [error.selectedAnswer, ...stepOptions, error.meaningPt, ...meaningDistractors(answer)],
        error.id
      ),
    };
  }

  if (kind === "blank" && step?.blankAnswer) {
    // Re-apresenta a MESMA lacuna, mesmo alvo, distratores do próprio exercício.
    const answer = step.blankAnswer;
    const bankDistractors = (step.bank ?? step.distractors ?? []).filter(Boolean);
    return {
      ...base,
      kind: "blank",
      prompt: step.prompt ?? "Complete a lacuna que você errou.",
      blankBefore: step.sentenceBefore,
      blankAfter: step.sentenceAfter,
      display: error.hanzi ?? error.correctAnswer,
      answer,
      answerDisplay: error.correctAnswer,
      options: buildChoiceOptions(answer, [error.selectedAnswer, ...bankDistractors], error.id),
    };
  }

  if (kind === "build") {
    if (error.type === "dialogue_choice" || error.type === "conversation_scene") {
      const answer = error.correctAnswer;
      return {
        ...base,
        kind: "build",
        prompt: "Monte a resposta para a mesma situação.",
        display: originalTaskPrompt(error),
        answer,
        pieces: buildReplyPieces(error, answer),
        pieceJoin: containsHanzi(answer) ? "" : " ",
      };
    }

    if (error.type === "hanzi_build") {
      // As peças são componentes; o alvo é o glifo composto. Verifica a ordem
      // dos componentes, mas mostra o hànzì final no feedback.
      const targetParts = step?.targetParts ?? step?.target ?? [];
      const answer = targetParts.length > 0 ? targetParts.join("") : error.hanzi ?? error.correctAnswer;
      const targetChar = error.hanzi ?? error.correctAnswer;
      return {
        ...base,
        kind: "build",
        prompt: "Monte novamente este hànzì com os componentes.",
        display: targetChar,
        displayPinyin: error.pinyin,
        answer,
        answerDisplay: targetChar,
        pieces: buildPieces(error, answer),
        pieceJoin: "",
      };
    }

    const isTranslation = error.type === "translation_build";
    const answer = error.correctAnswer;
    return {
      ...base,
      kind: "build",
      prompt: isTranslation ? "Monte novamente a tradução com as peças." : "Monte novamente a resposta com as peças.",
      // Tradução parte do texto-fonte (chinês); montagem de frase parte da instrução.
      display: isTranslation ? error.hanzi ?? error.prompt : error.prompt,
      displayPinyin: isTranslation ? error.pinyin : undefined,
      answer,
      pieces: buildPieces(error, answer),
      pieceJoin: isTranslation ? " " : "",
    };
  }

  if (kind === "hanzi") {
    // recognize / decompose: revisar o mesmo caractere pelo significado.
    const answer = error.correctAnswer;
    const relatedMeanings = charsInText(error.hanzi).map((char) => char.meaningPt);
    const chunkMeaning = findChunkByText(error.hanzi)?.meaningPt;
    return {
      ...base,
      kind: "hanzi",
      prompt: "Qual é o significado deste hànzì?",
      display: error.hanzi,
      displayPinyin: error.pinyin,
      answer,
      options: buildChoiceOptions(
        answer,
        [error.selectedAnswer, chunkMeaning, ...relatedMeanings, ...meaningDistractors(answer)],
        error.id
      ),
    };
  }

  if (kind === "pinyin") {
    const answer = error.pinyin ?? error.correctAnswer;
    return {
      ...base,
      kind: "pinyin",
      prompt: "Escolha o pinyin correto.",
      display: error.hanzi,
      answer,
      options: buildChoiceOptions(answer, [error.selectedAnswer, ...pinyinDistractors(answer)], error.id),
    };
  }

  // choice (dialogue_choice e afins): manter a mesma intenção comunicativa.
  const answer = error.correctAnswer;
  const stepOptions = step?.options ?? [];
  return {
    ...base,
    kind: "choice",
    prompt: "Escolha a resposta correta.",
    display: error.hanzi ?? error.prompt,
    displayPinyin: error.pinyin,
    answer,
    options: buildChoiceOptions(
      answer,
      [error.selectedAnswer, ...stepOptions, ...meaningDistractors(answer)],
      error.id
    ),
  };
}
