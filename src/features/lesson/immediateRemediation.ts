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
 *
 * Regras de coerência (B002+):
 * - um único contexto (nunca dump "你好 / 你好吗 / …");
 * - pinyin só da frase/alvo mostrado;
 * - status de pulo nunca vira alternativa;
 * - explicação pedagógica, sem cara de debug.
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
  /** Pinyin exclusivo da resposta correta (feedback) — nunca misturar com o display. */
  answerPinyin?: string;
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

/** Status de pulo/erro genérico — nunca vira alternativa do exercício. */
export function isNonOptionAnswer(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const text = value.trim();
  return (
    /^pulou\b/i.test(text) ||
    /^resposta incorreta$/i.test(text) ||
    /respondeu incorretamente/i.test(text) ||
    /^skip\b/i.test(text) ||
    // Textos de fallback da UI: quando um passo não tem alvo legível, o player
    // grava uma dessas frases como "resposta correta". Elas descrevem o que
    // fazer, não o conteúdo — e chegaram a aparecer como ALTERNATIVA no card.
    /^revise a resposta correta$/i.test(text) ||
    /^revise os pares corretos$/i.test(text) ||
    /^reveja a associação correta$/i.test(text) ||
    /^reveja este ponto/i.test(text) ||
    /^exercício$/i.test(text) ||
    /^atividade$/i.test(text)
  );
}

/** Display corrompido: várias frases CJK/pinyin coladas (nunca glossário pt curto). */
export function isConcatenatedDump(value: string | undefined): boolean {
  if (!value) return false;
  // Ex.: "你好 / 你好吗 / 我很好"
  if (/[\u3400-\u9fff].*[\/|].*[\u3400-\u9fff]/.test(value)) return true;
  // Ex.: "nǐ hǎo / nǐ hǎo ma / wǒ hěn hǎo"
  const slashParts = value
    .split(/\s*[\/|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (slashParts.length >= 2) {
    const looksPinyin = (part: string) =>
      /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/.test(part) ||
      (/^[a-zü]+(\s+[a-zü]+){1,}$/i.test(part) && part.split(/\s+/).length >= 2);
    if (slashParts.filter(looksPinyin).length >= 2) return true;
  }
  // Vários · em texto com hànzì costuma ser dump de campos colados.
  if ((value.match(/[·•]/g) ?? []).length >= 2 && /[\u3400-\u9fff]/.test(value)) return true;
  return false;
}

/** Explicação com cara de debug / dump — não mostrar ao aluno. */
export function isDebugExplanation(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  if (isConcatenatedDump(value)) return true;
  const text = value.trim();
  if (/^sugestão:/i.test(text)) return true;
  if (/\b(unclassified|diagnosis|debug|stack|TODO|FIXME)\b/i.test(text)) return true;
  if (/^\[.*\]$/.test(text)) return true;
  return false;
}

function cleanDisplay(value: string | undefined): string | undefined {
  if (!value?.trim() || isConcatenatedDump(value)) return undefined;
  return value.trim();
}

function pedagogicalExplanation(
  ...candidates: (string | undefined)[]
): string | undefined {
  for (const candidate of candidates) {
    if (!candidate || isDebugExplanation(candidate)) continue;
    return candidate.trim();
  }
  return undefined;
}

function pinyinForSinglePhrase(hanzi: string | undefined, fallback?: string): string | undefined {
  if (fallback && !isConcatenatedDump(fallback)) return fallback;
  if (!hanzi || isConcatenatedDump(hanzi)) return undefined;
  const chunk = findChunkByText(hanzi);
  if (chunk?.pinyin) return chunk.pinyin;
  const chars = charsInText(hanzi);
  if (chars.length > 0 && chars.length <= 8) return chars.map((char) => char.pinyin).join(" ");
  return undefined;
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

function containsHanzi(text: string): boolean {
  return /[\u3400-\u9fff]/u.test(text);
}

function sameScriptAs(answer: string, option: string): boolean {
  return containsHanzi(answer) === containsHanzi(option);
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
    .filter((option) => !isNonOptionAnswer(option))
    .filter((option) => normalizeRemediationAnswer(option) !== answerNorm)
    .filter((option) => !isConcatenatedDump(option))
    .filter((option) => sameScriptAs(answer, option))
    .slice(0, 3);
  const options = seededOrder(uniqueNonEmpty([answer, ...distractors]), seed).filter(
    (option) => !isNonOptionAnswer(option) && !isConcatenatedDump(option)
  );
  // Estado parcial: se só sobrou a resposta, ainda assim devolve jogável.
  return options.length > 0 ? options : [answer].filter(Boolean);
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
  return Boolean(cleanDisplay(error.hanzi) || error.step?.audioText);
}

/** A correção por hànzì pergunta o SIGNIFICADO — precisa de glifo e de resposta em pt. */
function canAskHanziMeaning(error: ActivityErrorInput): boolean {
  return Boolean(cleanDisplay(error.hanzi)) && !containsHanzi(error.correctAnswer);
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
  // Diálogo/cena: SEMPRE escolha situacional — causa não pode forçar montagem
  // (que misturava dump de falas e opções estranhas).
  if (error.type === "dialogue_choice" || error.type === "conversation_scene") return "choice";

  const byCause = remediationKindForCause(error);
  if (byCause) return byCause;
  if (error.type === "pair-match") return "pair";
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
    .filter((piece) => !isNonOptionAnswer(piece) && !isConcatenatedDump(piece))
    .filter((piece) => !baseSet.has(normalizeHanzi(piece)));
  const combined = [...base, ...extras]
    .filter((piece) => !isNonOptionAnswer(piece) && !isConcatenatedDump(piece))
    .slice(0, Math.max(base.length + 3, 4));
  return seededOrder(combined, error.id);
}

function promptWithoutSceneSuffix(prompt: string | undefined): string | undefined {
  if (!prompt) return undefined;
  const trimmed = prompt.split(" (cena:")[0]?.trim();
  return trimmed || undefined;
}

function originalTaskPrompt(error: ActivityErrorInput): string {
  const step = error.step;
  return (
    cleanDisplay(step?.dialoguePrompt) ??
    cleanDisplay(step?.checkpoint?.prompt) ??
    cleanDisplay(step?.prompt) ??
    cleanDisplay(promptWithoutSceneSuffix(error.prompt)) ??
    "Responda à mesma situação."
  );
}

/** Contexto situacional único para diálogo/cena — nunca o dump multi-frase. */
function situationalDisplay(error: ActivityErrorInput): string | undefined {
  const step = error.step;
  const candidates = [
    step?.dialoguePrompt,
    step?.checkpoint?.prompt,
    step?.prompt,
    promptWithoutSceneSuffix(error.prompt),
  ];
  for (const candidate of candidates) {
    const cleaned = cleanDisplay(candidate);
    if (!cleaned) continue;
    return cleaned;
  }
  return cleanDisplay(error.hanzi);
}

function situationalPrompt(error: ActivityErrorInput): string {
  const context = situationalDisplay(error);
  if (!context) return "Escolha a resposta certa para a situação.";
  if (containsHanzi(context) && context.length <= 24) {
    return `Alguém diz: ${context}. Qual resposta combina?`;
  }
  return context.length > 80 ? "Escolha a resposta certa para a mesma situação." : context;
}

function singleTargetHanzi(error: ActivityErrorInput): string | undefined {
  const fromAnswer = cleanDisplay(error.correctAnswer);
  if (fromAnswer && containsHanzi(fromAnswer)) return fromAnswer;
  const fromStep =
    cleanDisplay(error.step?.correctAnswer) ??
    cleanDisplay(error.step?.checkpoint?.correctAnswer) ??
    cleanDisplay(error.step?.answer) ??
    cleanDisplay(error.step?.blankAnswer) ??
    cleanDisplay(error.step?.hanzi);
  if (fromStep && containsHanzi(fromStep)) return fromStep;
  return cleanDisplay(error.hanzi);
}

function coherentMeaning(error: ActivityErrorInput, answer: string): string | undefined {
  if (error.meaningPt && !isConcatenatedDump(error.meaningPt) && !isNonOptionAnswer(error.meaningPt)) {
    return error.meaningPt;
  }
  const chunk = findChunkByText(containsHanzi(answer) ? answer : singleTargetHanzi(error));
  return chunk?.meaningPt;
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
  const safeAnswer = (error.correctAnswer ?? step?.correctAnswer ?? step?.checkpoint?.correctAnswer ?? "").trim();
  const base = {
    sourceErrorId: error.id,
    canRecoverStar: true as const,
    explanation: pedagogicalExplanation(
      step?.explanation,
      step?.checkpoint?.explanation,
      error.explanation,
      error.mistakeReason
    ),
    meaningPt: coherentMeaning(error, safeAnswer),
    pieceJoin: "",
  };

  if (kind === "pair") {
    // match_pairs / tone_pair: revisar SÓ o par errado, nunca a tabela inteira.
    const answer = safeAnswer || "—";
    const left = cleanDisplay(error.pairLeft) ?? cleanDisplay(error.hanzi);
    const pairMeanings = (step?.pairs ?? []).map((pair) => {
      const parts = pair.right.split("·").map((part) => part.trim()).filter(Boolean);
      return parts.length >= 2 ? parts.slice(1).join(" · ") : pair.right;
    });
    return {
      ...base,
      kind: "pair",
      prompt: left ? `O que significa ${left}?` : "Combine com o significado correto.",
      display: left,
      displayPinyin: pinyinForSinglePhrase(left, error.pinyin),
      answer,
      answerDisplay: answer,
      answerPinyin: pinyinForSinglePhrase(left, error.pinyin),
      options: buildChoiceOptions(
        answer,
        [error.selectedAnswer, ...pairMeanings, ...meaningDistractors(answer)],
        error.id
      ),
    };
  }

  if (kind === "tone") {
    const answer = safeAnswer || "1º tom";
    const hanzi = singleTargetHanzi(error);
    return {
      ...base,
      kind: "tone",
      prompt: hanzi ? `Qual é o tom de ${hanzi}?` : "Escolha o tom correto.",
      display: hanzi,
      // Não mostrar pinyin no estímulo — revelaria o tom.
      displayPinyin: undefined,
      answer,
      answerDisplay: answer,
      answerPinyin: pinyinForSinglePhrase(hanzi, error.pinyin),
      options: buildChoiceOptions(answer, [error.selectedAnswer, ...TONE_OPTIONS], error.id),
    };
  }

  if (kind === "listen") {
    const answer = safeAnswer || "—";
    const stepOptions = step?.options ?? [];
    const audioHanzi = cleanDisplay(error.hanzi) ?? cleanDisplay(step?.audioText) ?? (containsHanzi(answer) ? answer : undefined);
    return {
      ...base,
      kind: "listen",
      prompt: "Ouça de novo e escolha a resposta certa.",
      audioText: audioHanzi ?? answer,
      answer,
      answerDisplay: answer,
      answerPinyin: pinyinForSinglePhrase(containsHanzi(answer) ? answer : audioHanzi, error.pinyin),
      options: buildChoiceOptions(
        answer,
        [
          error.selectedAnswer,
          ...stepOptions,
          // Só mistura significados se a resposta também for significado (pt).
          ...(containsHanzi(answer) ? [] : [error.meaningPt, ...meaningDistractors(answer)]),
        ],
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
      prompt: cleanDisplay(step.prompt) ?? "Complete a lacuna que você errou.",
      blankBefore: step.sentenceBefore,
      blankAfter: step.sentenceAfter,
      display: singleTargetHanzi(error) ?? cleanDisplay(error.correctAnswer),
      answer,
      answerDisplay: error.correctAnswer || answer,
      answerPinyin: pinyinForSinglePhrase(containsHanzi(answer) ? answer : undefined, error.pinyin),
      options: buildChoiceOptions(answer, [error.selectedAnswer, ...bankDistractors], error.id),
    };
  }

  if (kind === "build") {
    if (error.type === "hanzi_build") {
      // As peças são componentes; o alvo é o glifo composto. Verifica a ordem
      // dos componentes, mas mostra o hànzì final no feedback.
      const targetParts = step?.targetParts ?? step?.target ?? [];
      const answer = targetParts.length > 0 ? targetParts.join("") : singleTargetHanzi(error) ?? safeAnswer;
      const targetChar = singleTargetHanzi(error) ?? safeAnswer;
      return {
        ...base,
        kind: "build",
        prompt: "Monte de novo este hànzì com as peças.",
        display: targetChar,
        displayPinyin: pinyinForSinglePhrase(targetChar, error.pinyin),
        answer,
        answerDisplay: targetChar,
        answerPinyin: pinyinForSinglePhrase(targetChar, error.pinyin),
        pieces: buildPieces(error, answer),
        pieceJoin: "",
      };
    }

    const isTranslation = error.type === "translation_build";
    const answer = safeAnswer || "—";
    const display = isTranslation
      ? singleTargetHanzi(error) ?? cleanDisplay(error.prompt)
      : cleanDisplay(promptWithoutSceneSuffix(error.prompt)) ?? cleanDisplay(step?.prompt) ?? originalTaskPrompt(error);
    return {
      ...base,
      kind: "build",
      prompt: isTranslation ? "Monte de novo a tradução com as peças." : "Monte de novo a resposta com as peças.",
      display,
      displayPinyin: isTranslation ? pinyinForSinglePhrase(singleTargetHanzi(error), error.pinyin) : undefined,
      answer,
      answerDisplay: answer,
      answerPinyin: pinyinForSinglePhrase(containsHanzi(answer) ? answer : undefined, error.pinyin),
      pieces: buildPieces(error, answer),
      pieceJoin: isTranslation ? " " : "",
    };
  }

  if (kind === "hanzi") {
    // recognize / decompose: revisar o mesmo caractere pelo significado.
    const answer = safeAnswer || "—";
    const hanzi = singleTargetHanzi(error);
    // "Qual é o significado deste hànzì?" sem hànzì na tela é uma pergunta
    // impossível — foi o que o QA capturou. Sem alvo visível, cai para o
    // formato de significado, que se sustenta sozinho.
    if (!hanzi) {
      return {
        ...base,
        kind: "choice",
        prompt: "Qual é o significado correto?",
        display: cleanDisplay(error.prompt) ?? answer,
        displayPinyin: undefined,
        answer,
        answerDisplay: answer,
        answerPinyin: undefined,
        options: buildChoiceOptions(answer, [error.selectedAnswer, ...meaningDistractors(answer)], error.id),
      };
    }
    const relatedMeanings = charsInText(hanzi).map((char) => char.meaningPt);
    const chunkMeaning = findChunkByText(hanzi)?.meaningPt;
    return {
      ...base,
      kind: "hanzi",
      prompt: "Qual é o significado deste hànzì?",
      display: hanzi,
      displayPinyin: pinyinForSinglePhrase(hanzi, error.pinyin),
      answer,
      answerDisplay: answer,
      answerPinyin: pinyinForSinglePhrase(hanzi, error.pinyin),
      options: buildChoiceOptions(
        answer,
        [error.selectedAnswer, chunkMeaning, ...relatedMeanings, ...meaningDistractors(answer)],
        error.id
      ),
    };
  }

  if (kind === "pinyin") {
    const hanzi = singleTargetHanzi(error);
    const answer = cleanDisplay(error.pinyin) ?? (safeAnswer || "—");
    return {
      ...base,
      kind: "pinyin",
      prompt: "Escolha o pinyin correto.",
      display: hanzi,
      displayPinyin: undefined,
      answer,
      answerDisplay: answer,
      answerPinyin: answer,
      options: buildChoiceOptions(answer, [error.selectedAnswer, ...pinyinDistractors(answer)], error.id),
    };
  }

  // choice (dialogue_choice e afins): manter a mesma intenção comunicativa.
  const answer = safeAnswer || "—";
  const stepOptions = (step?.options ?? step?.checkpoint?.options ?? []).filter(
    (option) => !isNonOptionAnswer(option) && !isConcatenatedDump(option)
  );
  const isDialogue = error.type === "dialogue_choice" || error.type === "conversation_scene";
  const display = isDialogue
    ? situationalDisplay(error)
    : singleTargetHanzi(error) ?? situationalDisplay(error) ?? cleanDisplay(error.prompt);
  const answerPinyin = pinyinForSinglePhrase(containsHanzi(answer) ? answer : undefined, error.pinyin);
  const displayPinyin = isDialogue
    ? undefined
    : pinyinForSinglePhrase(display && containsHanzi(display) ? display : undefined, error.pinyin);

  return {
    ...base,
    kind: "choice",
    prompt: isDialogue ? situationalPrompt(error) : "Escolha a resposta correta.",
    display,
    displayPinyin,
    answer,
    answerDisplay: answer,
    answerPinyin,
    options: buildChoiceOptions(
      answer,
      [
        error.selectedAnswer,
        ...stepOptions,
        ...(containsHanzi(answer) ? [] : meaningDistractors(answer)),
      ],
      error.id
    ),
    explanation: pedagogicalExplanation(
      step?.explanation,
      step?.checkpoint?.explanation,
      error.explanation,
      error.mistakeReason
    ),
  };
}
