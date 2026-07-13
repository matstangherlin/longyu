import { CHARACTERS, charById } from "../../data/characters";
import { CHUNKS, chunkById } from "../../data/chunks";
import type { Lesson, LessonStep, Skill, Unit } from "../../data/journey";
import type { Character, Chunk, ItemType } from "../../data/types";
import type { ReviewDomain } from "../../lib/srs";
import type { Track } from "../../lib/store";

// Gerador e validador do teste de pular módulo.
//
// Princípios de segurança pedagógica:
// - nenhuma pergunta é exibida sem passar por validateExamQuestion;
// - a resposta correta SEMPRE entra nas alternativas (buildSafeOptions);
// - nada do que aparece antes da resposta pode entregar a resposta
//   (validateNoAnswerLeak) — o aprendizado acontece no feedback depois;
// - se o módulo não render 10 perguntas válidas, o teste fica indisponível.

export const EXAM_MIN_QUESTIONS = 10;
export const EXAM_IDEAL_QUESTIONS = 15;
export const EXAM_MAX_QUESTIONS = 15;
export const EXAM_PASS_RATIO = 0.9;

// QA manual do teste de pular módulo:
// - buildSafeOptions sempre deve devolver alternativas contendo answer.
// - variações que diferem só por pontuação final ("Obrigado(a)" vs
//   "Obrigado(a).") contam como a mesma alternativa — nunca aparecem juntas.
// - com menos de 10 perguntas válidas, buildModuleSkipTest retorna "insufficient".
// - quando houver banco suficiente, a seleção mira 15-20 perguntas válidas.
// - a nota mínima segue 90% (examPassScore usa EXAM_PASS_RATIO).
// - errar qualquer pergunta essencial mantém gradeModuleSkipTest.passed = false.

export type ExamKind = "significado" | "som" | "forma" | "uso" | "leitura";
export type ExamFormat = "choice" | "match" | "cloze" | "order";
export type ExamDifficulty = "core" | "phase" | "stretch";

/** O que aparece na tela ANTES da resposta. Só pode conter estímulo neutro. */
export interface ExamDisplay {
  hanzi?: string;
  pinyin?: string;
  pt?: string;
  audioText?: string;
}

/** Feedback pedagógico exibido DEPOIS da resposta. */
export interface ExamFeedback {
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  example?: string;
  note?: string;
}

export interface ExamPair {
  left: string;
  right: string;
}

interface ExamQuestionCommon {
  id: string;
  lessonId: string;
  lessonTitle: string;
  kind: ExamKind;
  difficulty: ExamDifficulty;
  diagnosticOnly: boolean;
  prompt: string;
  isEssential: boolean;
  display: ExamDisplay;
  feedback: ExamFeedback;
  reviewRef?: { type: ItemType; itemId: string; domain: ReviewDomain; track: Track };
}

export interface ChoiceExamQuestion extends ExamQuestionCommon {
  format: "choice";
  answer: string;
  options: string[];
}

export interface MatchExamQuestion extends ExamQuestionCommon {
  format: "match";
  pairs: ExamPair[];
}

export interface ClozeExamQuestion extends ExamQuestionCommon {
  format: "cloze";
  sentenceBefore: string;
  sentenceAfter: string;
  answer: string;
  options: string[];
}

export interface OrderExamQuestion extends ExamQuestionCommon {
  format: "order";
  /** Peças na ordem correta; a tela embaralha para exibir. */
  pieces: string[];
  answer: string;
}

export type ExamQuestion =
  | ChoiceExamQuestion
  | MatchExamQuestion
  | ClozeExamQuestion
  | OrderExamQuestion;

export interface ExamValidation {
  valid: boolean;
  reason?: string;
}

export type ModuleExam =
  | { status: "ok"; questions: ExamQuestion[] }
  | { status: "insufficient"; validCount: number };

export interface ExamGradeResult {
  total: number;
  correctCount: number;
  scoredTotal: number;
  scoredCorrectCount: number;
  diagnosticTotal: number;
  diagnosticCorrectCount: number;
  requiredCorrect: number;
  percent: number;
  essentialMissed: ExamQuestion[];
  passed: boolean;
}

const SKILL_TRACK: Record<Skill, Track> = {
  som: "som",
  fala: "fala",
  hanzi: "hanzi",
  leitura: "leitura",
  sistema: "hanzi",
};

const KIND_LABELS: Record<ExamKind, string> = {
  significado: "Significado",
  som: "Som",
  forma: "Forma",
  uso: "Uso",
  leitura: "Leitura",
};

const FORMAT_LABELS: Record<ExamFormat, string | null> = {
  choice: null,
  match: "Pares",
  cloze: "Lacuna",
  order: "Ordem",
};

const DIFFICULTY_LABELS: Record<ExamDifficulty, string> = {
  core: "Base",
  phase: "Fase",
  stretch: "Sondagem",
};

export function examKindLabel(kind: ExamKind): string {
  return KIND_LABELS[kind];
}

export function examFormatLabel(format: ExamFormat): string | null {
  return FORMAT_LABELS[format];
}

export function examDifficultyLabel(difficulty: ExamDifficulty): string {
  return DIFFICULTY_LABELS[difficulty];
}

export function examPassScore(total: number): number {
  return Math.ceil(total * EXAM_PASS_RATIO);
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
const KNOWN_CHUNK_HANZI = new Set(CHUNKS.map((chunk) => normalizeHanzi(chunk.hanzi)));

function isCjk(text: string): boolean {
  return /[㐀-鿿]/.test(text);
}

function normalizeHanzi(text: string): string {
  return text.replace(/[，。！？、,.!?？\s]/g, "");
}

function normalizeOption(value: string): string {
  // Pontuação final não diferencia alternativa: "Obrigado(a)" e "Obrigado(a)."
  // são a MESMA opção — sem isso, o aluno via duas alternativas idênticas e
  // só uma delas era aceita como correta.
  const normalized = value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/[，。！？、,.!?…;:；：\s]+$/g, "");
  const plain = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
  if (
    plain === "obrigado / obrigada" ||
    plain.startsWith("obrigado(a)") ||
    plain.startsWith("obrigado") ||
    plain.startsWith("obrigada")
  ) {
    return "obrigado";
  }
  return normalized;
}

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function findChunkByText(text: string | undefined): Chunk | undefined {
  if (!text) return undefined;
  const normalized = normalizeHanzi(text);
  return CHUNKS.find((chunk) => normalizeHanzi(chunk.hanzi) === normalized);
}

function meaningAnswerForHanzi(hanzi: string | undefined, fallback: string): string {
  if (normalizeHanzi(hanzi ?? "") === "谢谢") return "Obrigado(a).";
  return fallback.trim();
}

function meaningOptionsForHanzi(hanzi: string | undefined, pool: string[]): string[] {
  if (normalizeHanzi(hanzi ?? "") !== "谢谢") return pool;
  return ["Como você se chama?", "Onde fica?", "O que é isto?"];
}

function charsInText(text: string | undefined): Character[] {
  if (!text) return [];
  return [...normalizeHanzi(text)]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is Character => Boolean(char));
}

// ---------------------------------------------------------------------------
// buildSafeOptions: a resposta correta SEMPRE entra nas alternativas.
// ---------------------------------------------------------------------------

export function buildSafeOptions(answer: string, pool: string[], count = 3): string[] {
  const cleanAnswer = answer.trim();
  if (!cleanAnswer) return [];

  const seen = new Set<string>([normalizeOption(cleanAnswer)]);
  const distractors: string[] = [];
  for (const option of shuffle(pool)) {
    const clean = option?.trim();
    if (!clean) continue;
    const key = normalizeOption(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(clean);
    if (distractors.length >= count) break;
  }

  const result = shuffle([cleanAnswer, ...distractors]);
  // Reforço final: nunca retornar alternativas sem a resposta correta.
  if (!result.some((option) => normalizeOption(option) === normalizeOption(cleanAnswer))) {
    return [cleanAnswer, ...distractors];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validações
// ---------------------------------------------------------------------------

function invalid(reason: string): ExamValidation {
  return { valid: false, reason };
}

const VALID: ExamValidation = { valid: true };

/** A resposta não pode aparecer em nada visível antes de o aluno responder. */
export function validateNoAnswerLeak(question: ExamQuestion): ExamValidation {
  if (question.display.pinyin) return invalid("teste sem ajuda não pode exibir pinyin antes da resposta");
  if (question.display.pt) return invalid("teste sem ajuda não pode exibir tradução antes da resposta");

  const answers: string[] = [];
  if (question.format === "choice" || question.format === "cloze") answers.push(question.answer);
  if (question.format === "order") answers.push(question.answer);
  if (question.format === "match") {
    // Nos pares, o vazamento seria um lado repetir o outro; validado à parte.
    return VALID;
  }

  const visible: string[] = [
    question.prompt,
    question.display.hanzi ?? "",
    question.display.pinyin ?? "",
    question.display.pt ?? "",
  ];
  if (question.format === "cloze") {
    visible.push(question.sentenceBefore, question.sentenceAfter);
  }

  for (const answer of answers) {
    const target = isCjk(answer) ? normalizeHanzi(answer) : normalizeOption(answer);
    if (!target) continue;
    for (const field of visible) {
      if (!field) continue;
      const haystack = isCjk(answer) ? normalizeHanzi(field) : normalizeOption(field);
      // Para "ordem", o hànzì completo não pode estar montado em lugar nenhum.
      if (haystack.includes(target)) {
        return invalid(`a resposta "${answer}" aparece no enunciado/estímulo`);
      }
    }
  }

  // Perguntas de som sobre pinyin: nem pinyin nem áudio podem aparecer,
  // porque ambos entregam a pronúncia que está sendo avaliada.
  if (question.kind === "som" && question.format === "choice") {
    const answerIsPinyin = !isCjk(question.answer) && !question.answer.includes("tom");
    if (answerIsPinyin && (question.display.audioText || question.display.pinyin)) {
      return invalid("pergunta de pinyin não pode mostrar áudio nem pinyin antes da resposta");
    }
  }

  // Perguntas de significado nunca mostram tradução antes da resposta.
  if (question.kind === "significado" && question.display.pt) {
    return invalid("pergunta de significado não pode exibir tradução antes da resposta");
  }

  return VALID;
}

export function validateMatchingPairs(pairs: ExamPair[]): ExamValidation {
  if (!Array.isArray(pairs) || pairs.length < 2) {
    return invalid("pares insuficientes (mínimo 2)");
  }
  const lefts = new Set<string>();
  const rights = new Set<string>();
  for (const pair of pairs) {
    const left = pair.left?.trim();
    const right = pair.right?.trim();
    if (!left || !right) return invalid("par com lado vazio");
    if (normalizeOption(left) === normalizeOption(right)) {
      return invalid("par com os dois lados iguais");
    }
    const leftKey = normalizeOption(left);
    const rightKey = normalizeOption(right);
    // Lados repetidos tornam o par ambíguo (duas respostas possíveis).
    if (lefts.has(leftKey)) return invalid(`lado esquerdo repetido: ${left}`);
    if (rights.has(rightKey)) return invalid(`lado direito repetido: ${right}`);
    lefts.add(leftKey);
    rights.add(rightKey);
  }
  return VALID;
}

export function validateClozeQuestion(question: ClozeExamQuestion): ExamValidation {
  const answer = question.answer?.trim();
  if (!answer) return invalid("lacuna sem resposta");
  if (!question.sentenceBefore && !question.sentenceAfter) {
    return invalid("lacuna sem contexto de frase");
  }
  if (!question.options.some((option) => normalizeOption(option) === normalizeOption(answer))) {
    return invalid("as sugestões não contêm a resposta da lacuna");
  }
  const sentence = normalizeHanzi(`${question.sentenceBefore}${question.sentenceAfter}`);
  if (isCjk(answer) && sentence.includes(normalizeHanzi(answer))) {
    return invalid("a resposta da lacuna já aparece na frase");
  }
  // Heurística de resposta única: um distrator não pode reconstruir outra
  // frase conhecida do curso (senão haveria duas respostas plausíveis).
  for (const option of question.options) {
    if (normalizeOption(option) === normalizeOption(answer)) continue;
    const rebuilt = normalizeHanzi(
      `${question.sentenceBefore}${option}${question.sentenceAfter}`
    );
    if (KNOWN_CHUNK_HANZI.has(rebuilt)) {
      return invalid(`o distrator "${option}" também forma uma frase válida`);
    }
  }
  return VALID;
}

function validateChoice(question: ChoiceExamQuestion): ExamValidation {
  const answer = question.answer?.trim();
  if (!answer) return invalid("pergunta sem resposta");
  if (!Array.isArray(question.options) || question.options.length < 4) {
    return invalid("menos de 4 alternativas");
  }
  const keys = new Set<string>();
  for (const option of question.options) {
    const clean = option?.trim();
    if (!clean) return invalid("alternativa vazia");
    const key = normalizeOption(clean);
    if (keys.has(key)) return invalid(`alternativa duplicada: ${clean}`);
    keys.add(key);
  }
  if (!question.options.some((option) => option.trim() === answer)) {
    return invalid("a resposta exata não está nas alternativas");
  }
  if (!keys.has(normalizeOption(answer))) {
    return invalid("a resposta correta não está nas alternativas");
  }
  // Coerência: alternativas devem estar no mesmo "registro" da resposta
  // (não misturar hànzì com português só para preencher quantidade).
  const answerCjk = isCjk(answer);
  if (question.options.some((option) => isCjk(option) !== answerCjk)) {
    return invalid("alternativas misturam hànzì e português de forma incoerente");
  }
  return VALID;
}

function acceptableThanksAnswer(value: string): boolean {
  const normalized = normalizeOption(value);
  return normalized === normalizeOption("Obrigado(a).") || normalized === normalizeOption("Obrigado / Obrigada");
}

function validateKnownAnswerConsistency(question: ExamQuestion): ExamValidation {
  if (question.format === "match") {
    for (const pair of question.pairs) {
      if (normalizeHanzi(pair.left) === "谢谢" && !isCjk(pair.right) && !acceptableThanksAnswer(pair.right)) {
        return invalid("谢谢 em pares precisa ter Obrigado(a). como significado");
      }
    }
    return VALID;
  }

  if (question.format !== "choice") return VALID;

  const hanzi = question.display.hanzi ?? question.feedback.hanzi;
  const normalizedHanzi = normalizeHanzi(hanzi ?? "");
  const knownChunk = findChunkByText(hanzi);
  const knownChar = normalizedHanzi.length === 1 ? charByGlyph.get(normalizedHanzi) : undefined;

  if (normalizedHanzi === "谢谢" && question.kind === "significado") {
    if (!acceptableThanksAnswer(question.answer)) {
      return invalid("谢谢 precisa responder Obrigado(a).");
    }
    if (!question.options.some((option) => normalizeOption(option) === normalizeOption("Obrigado(a)."))) {
      return invalid("谢谢 apareceu sem Obrigado(a). nas alternativas");
    }
  }

  if (question.kind === "significado") {
    const expected = knownChunk
      ? meaningAnswerForHanzi(knownChunk.hanzi, knownChunk.meaningPt)
      : knownChar?.meaningPt;
    if (expected && normalizeOption(question.answer) !== normalizeOption(expected)) {
      return invalid("tradução não combina com o item avaliado");
    }
  }

  if (question.kind === "som") {
    if (question.display.hanzi && !question.display.audioText) {
      const expectedPinyin = knownChunk?.pinyin ?? knownChar?.pinyin;
      if (expectedPinyin && normalizeOption(question.answer) !== normalizeOption(expectedPinyin)) {
        return invalid("pinyin não combina com o item avaliado");
      }
    }
    if (question.display.audioText && isCjk(question.answer) && normalizeHanzi(question.answer) !== normalizeHanzi(question.display.audioText)) {
      return invalid("resposta de áudio não combina com o áudio tocado");
    }
  }

  if (question.kind === "leitura" && question.feedback.meaning && normalizeOption(question.answer) !== normalizeOption(question.feedback.meaning)) {
    return invalid("tradução de leitura não combina com o feedback");
  }

  return VALID;
}

function validateOrder(question: OrderExamQuestion): ExamValidation {
  if (!Array.isArray(question.pieces) || question.pieces.length < 2) {
    return invalid("ordenação precisa de pelo menos 2 peças");
  }
  if (question.pieces.length > 8) return invalid("ordenação com peças demais");
  const seen = new Set<string>();
  for (const piece of question.pieces) {
    const clean = piece?.trim();
    if (!clean) return invalid("peça vazia na ordenação");
    const key = normalizeOption(clean);
    // Peças repetidas geram mais de uma ordem correta (ambíguo).
    if (seen.has(key)) return invalid(`peça repetida na ordenação: ${clean}`);
    seen.add(key);
  }
  if (question.pieces.join("") !== question.answer) {
    return invalid("as peças não formam a resposta da ordenação");
  }
  if (!question.display.pt && !question.prompt) {
    return invalid("ordenação sem enunciado do que montar");
  }
  return VALID;
}

/** Validação central: nenhuma pergunta chega à tela sem passar aqui. */
export function validateExamQuestion(question: ExamQuestion | undefined | null): ExamValidation {
  if (!question) return invalid("pergunta inexistente");
  if (!question.id) return invalid("pergunta sem id");
  if (!question.prompt?.trim()) return invalid("pergunta sem enunciado");
  if (!question.lessonId || !question.lessonTitle) return invalid("pergunta sem lição de origem");

  let structural: ExamValidation;
  switch (question.format) {
    case "choice":
      structural = validateChoice(question);
      break;
    case "match":
      structural = validateMatchingPairs(question.pairs);
      break;
    case "cloze":
      structural = validateClozeQuestion(question);
      break;
    case "order":
      structural = validateOrder(question);
      break;
  }
  if (!structural.valid) return structural;

  const semantic = validateKnownAnswerConsistency(question);
  if (!semantic.valid) return semantic;

  return validateNoAnswerLeak(question);
}

// ---------------------------------------------------------------------------
// Coleta de candidatos a partir do conteúdo do módulo
// ---------------------------------------------------------------------------

interface EssentialItems {
  chunkIds: string[];
  charIds: string[];
  sentences: string[];
}

/** Itens centrais do módulo: primeira frase, primeiro hànzì, primeira produção. */
export const MODULE_ESSENTIAL_ITEM_REFS: Record<string, readonly string[]> = {
  "u1-1": ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "char:ni", "char:hao", "char:wo"],
  "u1-2": ["chunk:xiexie", "chunk:bukeqi", "chunk:zaijian", "char:xie", "char:ni"],
  "u2-1": ["char:ma2", "char:ma_horse", "char:ma_hemp", "char:ma_scold"],
  "u2-2": ["chunk:nihao", "chunk:xiexie", "char:ni", "char:hao", "char:xie"],
};

function pushUniqueLimited(target: string[], value: string | undefined, limit: number): void {
  const clean = value?.trim();
  if (!clean || target.includes(clean) || target.length >= limit) return;
  target.push(clean);
}

function addEssentialRef(essentials: EssentialItems, ref: string, limit = 5): void {
  const [type, itemId] = ref.split(":");
  if (!itemId) return;
  if (type === "chunk" && chunkById[itemId]) pushUniqueLimited(essentials.chunkIds, itemId, limit);
  if (type === "char" && charById[itemId]) pushUniqueLimited(essentials.charIds, itemId, limit);
}

function essentialItemsForUnit(unit: Unit): EssentialItems {
  const essentials: EssentialItems = { chunkIds: [], charIds: [], sentences: [] };
  for (const ref of MODULE_ESSENTIAL_ITEM_REFS[unit.id] ?? []) addEssentialRef(essentials, ref);

  for (const lesson of unit.lessons) {
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      addEssentialRef(essentials, ref, 4);
    }
    for (const step of lesson.steps) {
      if (step.kind === "flashcard") pushUniqueLimited(essentials.chunkIds, step.chunkId, 5);
      if (step.kind === "recognize" || step.kind === "decompose") pushUniqueLimited(essentials.charIds, step.charId, 5);
      if (step.kind === "produce" && step.target?.length) pushUniqueLimited(essentials.sentences, step.target.join(""), 4);
      if (step.kind === "sentence_build" && step.targetParts?.length) {
        pushUniqueLimited(essentials.sentences, step.targetParts.join(""), 4);
      }
    }
  }
  return essentials;
}

interface ModuleVocab {
  chars: Character[];
  chunks: Chunk[];
}

function vocabForUnit(unit: Unit): ModuleVocab {
  const charIds = new Set<string>();
  const chunkIds = new Set<string>();
  for (const lesson of unit.lessons) {
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      const [type, itemId] = ref.split(":");
      if (type === "char" && itemId) charIds.add(itemId);
      if (type === "chunk" && itemId) chunkIds.add(itemId);
    }
    for (const step of lesson.steps) {
      if (step.charId) charIds.add(step.charId);
      if (step.chunkId) chunkIds.add(step.chunkId);
      const chunk = findChunkByText(step.text ?? step.hanzi ?? step.target?.join(""));
      if (chunk) chunkIds.add(chunk.id);
      for (const char of charsInText(step.hanzi ?? step.text)) charIds.add(char.id);
    }
  }
  return {
    chars: [...charIds].map((id) => charById[id]).filter((char): char is Character => Boolean(char)),
    chunks: [...chunkIds].map((id) => chunkById[id]).filter((chunk): chunk is Chunk => Boolean(chunk)),
  };
}

interface BuildContext {
  unit: Unit;
  vocab: ModuleVocab;
  essentials: EssentialItems;
  seq: number;
}

function nextId(ctx: BuildContext, lesson: Lesson): string {
  ctx.seq += 1;
  return `${lesson.id}-q${ctx.seq}`;
}

function examDifficultyMeta(lesson: Lesson, isEssential: boolean): { difficulty: ExamDifficulty; diagnosticOnly: boolean } {
  if (isEssential) return { difficulty: "core", diagnosticOnly: false };
  if (lesson.premium) return { difficulty: "stretch", diagnosticOnly: true };
  return { difficulty: "phase", diagnosticOnly: false };
}

function chunkFeedback(chunk: Chunk): ExamFeedback {
  return {
    hanzi: chunk.hanzi,
    pinyin: chunk.pinyin,
    meaning: chunk.meaningPt,
    note: chunk.literalPt ? `Literal: ${chunk.literalPt}` : undefined,
  };
}

function charFeedback(char: Character): ExamFeedback {
  const example = char.exampleWords?.[0];
  return {
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    meaning: char.meaningPt,
    example: example ? `${example.hanzi} · ${example.pinyin} · ${example.pt}` : undefined,
    note: char.mnemonicPt,
  };
}

function questionsFromStep(ctx: BuildContext, lesson: Lesson, step: LessonStep): ExamQuestion[] {
  const track = SKILL_TRACK[lesson.skill];
  const base = (common: Omit<ExamQuestionCommon, "id" | "lessonId" | "lessonTitle" | "difficulty" | "diagnosticOnly">) => ({
    id: nextId(ctx, lesson),
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    ...examDifficultyMeta(lesson, common.isEssential),
    ...common,
  });
  const questions: ExamQuestion[] = [];
  const moduleChunkMeanings = ctx.vocab.chunks.map((chunk) => chunk.meaningPt);
  const moduleCharMeanings = ctx.vocab.chars.map((char) => char.meaningPt);

  if (step.kind === "flashcard" && step.chunkId) {
    const chunk = chunkById[step.chunkId];
    if (chunk) {
      const meaningAnswer = meaningAnswerForHanzi(chunk.hanzi, chunk.meaningPt);
      questions.push({
        ...base({
          kind: "significado",
          prompt: "O que significa esta frase?",
          isEssential: ctx.essentials.chunkIds.includes(chunk.id),
          display: { hanzi: chunk.hanzi, audioText: chunk.hanzi },
          feedback: chunkFeedback(chunk),
          reviewRef: { type: "chunk", itemId: chunk.id, domain: "significado", track },
        }),
        format: "choice",
        answer: meaningAnswer,
        options: buildSafeOptions(meaningAnswer, meaningOptionsForHanzi(chunk.hanzi, [
          chunk.meaningPt,
          ...moduleChunkMeanings,
          ...CHUNKS.map((candidate) => candidate.meaningPt),
        ])),
      });
      // Som: frase → pinyin. Sem áudio e sem pinyin visível (seria a resposta).
      questions.push({
        ...base({
          kind: "som",
          prompt: "Qual é o pinyin desta frase?",
          isEssential: false,
          display: { hanzi: chunk.hanzi },
          feedback: chunkFeedback(chunk),
          reviewRef: { type: "chunk", itemId: chunk.id, domain: "som", track: "som" },
        }),
        format: "choice",
        answer: chunk.pinyin,
        options: buildSafeOptions(chunk.pinyin, [
          ...ctx.vocab.chunks.map((candidate) => candidate.pinyin),
          ...CHUNKS.map((candidate) => candidate.pinyin),
        ]),
      });
    }
  }

  if (step.kind === "recognize" && step.charId) {
    const char = charById[step.charId];
    if (char) {
      questions.push({
        ...base({
          kind: "significado",
          prompt: "O que significa este caractere?",
          isEssential: ctx.essentials.charIds.includes(char.id),
          display: { hanzi: char.hanzi, audioText: char.hanzi },
          feedback: charFeedback(char),
          reviewRef: { type: "char", itemId: char.id, domain: "significado", track },
        }),
        format: "choice",
        answer: char.meaningPt,
        options: buildSafeOptions(char.meaningPt, [
          ...moduleCharMeanings,
          ...CHARACTERS.map((candidate) => candidate.meaningPt),
        ]),
      });
      // Som: hànzì → pinyin. Sem áudio e sem pinyin visível (seria a resposta).
      questions.push({
        ...base({
          kind: "som",
          prompt: "Qual é o pinyin deste caractere?",
          isEssential: false,
          display: { hanzi: char.hanzi },
          feedback: charFeedback(char),
          reviewRef: { type: "char", itemId: char.id, domain: "som", track: "som" },
        }),
        format: "choice",
        answer: char.pinyin,
        options: buildSafeOptions(char.pinyin, [
          ...ctx.vocab.chars.map((candidate) => candidate.pinyin),
          ...CHARACTERS.map((candidate) => candidate.pinyin),
        ]),
      });
    }
  }

  if (step.kind === "decompose" && step.charId) {
    const char = charById[step.charId];
    if (char) {
      // Forma: significado → hànzì (reconhecer a forma correta).
      questions.push({
        ...base({
          kind: "forma",
          prompt: `Qual caractere significa “${char.meaningPt}”?`,
          isEssential: false,
          display: {},
          feedback: charFeedback(char),
          reviewRef: { type: "char", itemId: char.id, domain: "forma", track: "hanzi" },
        }),
        format: "choice",
        answer: char.hanzi,
        options: buildSafeOptions(char.hanzi, [
          ...ctx.vocab.chars.map((candidate) => candidate.hanzi),
          ...CHARACTERS.map((candidate) => candidate.hanzi),
        ]),
      });
    }
  }

  if (step.kind === "tone" && step.hanzi && step.tone) {
    const char = charsInText(step.hanzi)[0];
    questions.push({
      ...base({
        kind: "som",
        prompt: "Qual é o tom que você ouviu?",
        isEssential: false,
        display: { audioText: step.hanzi },
        feedback: {
          hanzi: step.hanzi,
          pinyin: step.pinyin,
          meaning: char?.meaningPt,
        },
        reviewRef: char
          ? { type: "char", itemId: char.id, domain: "som", track: "som" }
          : undefined,
      }),
      format: "choice",
      answer: `${step.tone}º tom`,
      options: ["1º tom", "2º tom", "3º tom", "4º tom"],
    });
  }

  if (step.kind === "comprehend" && step.hanzi && step.answer && step.options) {
    const chunk = findChunkByText(step.hanzi);
    const meaningAnswer = meaningAnswerForHanzi(step.hanzi, step.answer);
    questions.push({
      ...base({
        kind: "significado",
        prompt: "Escolha o significado correto.",
        isEssential: Boolean(chunk && ctx.essentials.chunkIds.includes(chunk.id)),
        display: { hanzi: step.hanzi, audioText: step.hanzi },
        feedback: chunk
          ? chunkFeedback(chunk)
          : { hanzi: step.hanzi, pinyin: step.pinyin, meaning: step.answer },
        reviewRef: chunk
          ? { type: "chunk", itemId: chunk.id, domain: "significado", track }
          : undefined,
      }),
      format: "choice",
      answer: meaningAnswer,
      options: buildSafeOptions(meaningAnswer, meaningOptionsForHanzi(step.hanzi, [...step.options, ...moduleChunkMeanings])),
    });
  }

  if (step.kind === "listen_select" && step.audioText && step.correctAnswer && step.options) {
    questions.push({
      ...base({
        kind: "som",
        prompt: step.prompt ?? "Toque no que você ouviu.",
        isEssential: false,
        display: { audioText: step.audioText },
        feedback: {
          hanzi: step.correctAnswer,
          pinyin: findChunkByText(step.correctAnswer)?.pinyin ?? charsInText(step.correctAnswer)[0]?.pinyin,
          meaning:
            findChunkByText(step.correctAnswer)?.meaningPt ??
            charsInText(step.correctAnswer)[0]?.meaningPt,
          note: step.explanation,
        },
      }),
      format: "choice",
      answer: step.correctAnswer,
      options: buildSafeOptions(step.correctAnswer, step.options),
    });
  }

  if (step.kind === "produce" || step.kind === "sentence_build") {
    const pieces = step.kind === "produce" ? step.target : step.targetParts;
    const meaning = step.kind === "produce" ? step.pt : step.prompt;
    if (pieces && pieces.length >= 2 && meaning) {
      const answer = pieces.join("");
      const chunk = findChunkByText(answer);
      questions.push({
        ...base({
          kind: "uso",
          prompt: step.kind === "produce" ? `Monte a frase: “${meaning}”` : meaning,
          isEssential: ctx.essentials.sentences.includes(answer),
          display: {},
          feedback: chunk
            ? chunkFeedback(chunk)
            : { hanzi: answer, meaning, note: step.explanation },
          reviewRef: chunk
            ? { type: "chunk", itemId: chunk.id, domain: "uso", track }
            : undefined,
        }),
        format: "order",
        pieces,
        answer,
      });
    }
  }

  if (step.kind === "fill_blank" && step.blankAnswer && step.sentenceBefore !== undefined) {
    questions.push({
      ...base({
        kind: "uso",
        prompt: step.prompt ?? "Complete a frase.",
        isEssential: false,
        display: {},
        feedback: {
          hanzi: step.correctAnswer,
          meaning: step.explanation,
          note: step.explanation,
        },
      }),
      format: "cloze",
      sentenceBefore: step.sentenceBefore ?? "",
      sentenceAfter: step.sentenceAfter ?? "",
      answer: step.blankAnswer,
      options: buildSafeOptions(step.blankAnswer, [
        ...(step.bank ?? []),
        ...ctx.vocab.chars.map((char) => char.hanzi),
      ]),
    });
  }

  if (step.kind === "match_pairs" && step.pairs && step.pairs.length >= 2) {
    const pairs = step.pairs.map((pair) => ({ left: pair.left, right: pair.right }));
    const tonal = pairs.some((pair) => pair.right.includes("tom") || pair.left.includes("tom"));
    questions.push({
      ...base({
        kind: tonal ? "som" : "significado",
        prompt: step.title ?? "Ligue cada item ao par correto.",
        isEssential: false,
        display: {},
        feedback: {
          note: step.explanation,
          meaning: pairs.map((pair) => `${pair.left} = ${pair.right}`).join(" · "),
        },
      }),
      format: "match",
      pairs: pairs.slice(0, 6),
    });
  }

  if (step.kind === "dialogue_choice" && (step.correctAnswer ?? step.answer) && step.options?.length) {
    const answer = step.correctAnswer ?? step.answer ?? "";
    const answerIsCjk = isCjk(answer);
    questions.push({
      ...base({
        kind: answerIsCjk ? "uso" : "significado",
        prompt: step.dialoguePrompt ?? step.prompt ?? step.title ?? "Escolha a resposta adequada.",
        isEssential: false,
        display: {},
        feedback: {
          hanzi: answerIsCjk ? answer : undefined,
          meaning: answerIsCjk ? step.explanation : answer,
          note: step.explanation,
        },
      }),
      format: "choice",
      answer,
      options: buildSafeOptions(answer, step.options),
    });
  }

  if (step.kind === "write" && step.answer && step.mode !== "free_reflection") {
    const chunk = findChunkByText(step.answer);
    questions.push({
      ...base({
        kind: "uso",
        prompt: step.body ?? step.title ?? "Qual resposta completa a produção guiada?",
        isEssential: false,
        // Sem sugestão visível: "Use como guia: ..." entregaria a resposta.
        display: {},
        feedback: chunk ? chunkFeedback(chunk) : { hanzi: step.answer },
        reviewRef: chunk ? { type: "chunk", itemId: chunk.id, domain: "uso", track } : undefined,
      }),
      format: "choice",
      answer: step.answer,
      options: buildSafeOptions(step.answer, [
        ...(step.wordBank ?? []).filter(isCjk),
        ...ctx.vocab.chunks.map((candidate) => candidate.hanzi),
        ...CHUNKS.map((candidate) => candidate.hanzi),
      ]),
    });
  }

  if (step.kind === "microread" && step.lines?.length) {
    const line = step.lines[0];
    const meaning = line.pt ?? "";
    if (meaning) {
      questions.push({
        ...base({
          kind: "leitura",
          prompt: "Leia a frase e escolha a tradução.",
          isEssential: false,
          display: { hanzi: line.hanzi, audioText: line.hanzi },
          feedback: { hanzi: line.hanzi, pinyin: line.pinyin, meaning },
        }),
        format: "choice",
        answer: meaning,
        options: buildSafeOptions(meaning, [
          ...step.lines.map((candidate) => candidate.pt).filter((value): value is string => Boolean(value)),
          ...moduleChunkMeanings,
        ]),
      });
    }
  }

  return questions;
}

/** Pares hànzì → significado a partir do vocabulário do módulo. */
function moduleMatchingBank(vocab: ModuleVocab): ExamPair[] {
  const pairs: ExamPair[] = [];
  const seenLeft = new Set<string>();
  const seenRight = new Set<string>();
  for (const item of [...vocab.chunks, ...vocab.chars]) {
    const left = item.hanzi.trim();
    const right = item.meaningPt.trim();
    if (!left || !right) continue;
    const leftKey = normalizeOption(left);
    const rightKey = normalizeOption(right);
    if (seenLeft.has(leftKey) || seenRight.has(rightKey)) continue;
    seenLeft.add(leftKey);
    seenRight.add(rightKey);
    pairs.push({ left, right });
  }
  return pairs;
}

/** Lacunas sintetizadas: frase do módulo que contém outra palavra do módulo. */
function synthesizedClozeQuestions(ctx: BuildContext): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  const fillers = [...ctx.vocab.chunks, ...ctx.vocab.chars];
  for (const container of ctx.vocab.chunks) {
    if (questions.length >= 2) break;
    const sentence = container.hanzi;
    for (const part of fillers) {
      if (part.hanzi === sentence) continue;
      const first = sentence.indexOf(part.hanzi);
      if (first < 0) continue;
      // A palavra precisa aparecer exatamente uma vez para a lacuna ser única.
      if (sentence.indexOf(part.hanzi, first + part.hanzi.length) >= 0) continue;
      const before = sentence.slice(0, first);
      const after = sentence.slice(first + part.hanzi.length);
      if (!before && !after) continue;
      const lesson = ctx.unit.lessons[0];
      const distractorPool = fillers
        .map((item) => item.hanzi)
        .filter((hanzi) => hanzi !== part.hanzi && !sentence.includes(hanzi));
      questions.push({
        id: nextId(ctx, lesson),
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        kind: "uso",
        ...examDifficultyMeta(lesson, ctx.essentials.chunkIds.includes(part.id)),
        prompt: "Complete a frase com a peça correta.",
        isEssential: ctx.essentials.chunkIds.includes(part.id),
        display: {},
        feedback: chunkFeedback(container),
        reviewRef: { type: "chunk", itemId: container.id, domain: "uso", track: SKILL_TRACK[lesson.skill] },
        format: "cloze",
        sentenceBefore: before,
        sentenceAfter: after,
        answer: part.hanzi,
        options: buildSafeOptions(part.hanzi, distractorPool),
      });
      break;
    }
  }
  return questions;
}

// ---------------------------------------------------------------------------
// Montagem do teste
// ---------------------------------------------------------------------------

function dedupeQuestions(questions: ExamQuestion[]): ExamQuestion[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const answerKey =
      question.format === "match"
        ? question.pairs.map((pair) => pair.left).join("|")
        : question.answer;
    const key = [
      question.format,
      question.kind,
      normalizeOption(answerKey),
      normalizeHanzi(question.display.hanzi ?? question.display.pt ?? question.prompt),
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Seleciona perguntas com distribuição de habilidades e formatos:
 * nem tudo múltipla escolha, nem tudo tradução de palavras.
 */
function selectExamQuestions(pool: ExamQuestion[], target: number): ExamQuestion[] {
  const caps: Record<ExamKind, number> = {
    significado: 4,
    som: 3,
    uso: 3,
    forma: 2,
    leitura: 2,
  };
  // Teto absoluto: nunca 8+ perguntas do mesmo tipo, mesmo relaxando as cotas.
  // Se não der para fechar 10 perguntas sob esse teto, o teste fica indisponível.
  const HARD_KIND_CAP = 7;
  const maxNonChoice = 4;

  const remaining = shuffle(pool);
  const selected: ExamQuestion[] = [];
  const kindCount: Record<ExamKind, number> = { significado: 0, som: 0, uso: 0, forma: 0, leitura: 0 };
  let nonChoiceCount = 0;

  const take = (index: number) => {
    const [question] = remaining.splice(index, 1);
    selected.push(question);
    kindCount[question.kind] += 1;
    if (question.format !== "choice") nonChoiceCount += 1;
  };

  const fits = (question: ExamQuestion, capBonus: number) => {
    const cap = Math.min(caps[question.kind] + capBonus, HARD_KIND_CAP);
    if (kindCount[question.kind] >= cap) return false;
    if (question.format !== "choice" && nonChoiceCount >= maxNonChoice) return false;
    return true;
  };

  // 1. Essenciais entram primeiro (respeitando o teto de formatos).
  for (let i = remaining.length - 1; i >= 0; i--) {
    if (selected.length >= target) break;
    if (remaining[i].isEssential && fits(remaining[i], 1)) take(i);
  }

  // 2. Garante variedade de formato: até 3 perguntas não-múltipla-escolha.
  for (const format of ["match", "cloze", "order"] as ExamFormat[]) {
    if (selected.length >= target) break;
    const index = remaining.findIndex(
      (question) => question.format === format && fits(question, 0)
    );
    if (index >= 0) take(index);
  }

  // 3. Preenche por habilidade, preferindo lições ainda pouco representadas.
  let capBonus = 0;
  while (selected.length < target && remaining.length > 0) {
    const lessonCounts = new Map<string, number>();
    for (const question of selected) {
      lessonCounts.set(question.lessonId, (lessonCounts.get(question.lessonId) ?? 0) + 1);
    }
    let bestIndex = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    remaining.forEach((question, index) => {
      if (!fits(question, capBonus)) return;
      const lessonLoad = lessonCounts.get(question.lessonId) ?? 0;
      const kindLoad = kindCount[question.kind];
      const score = lessonLoad * 10 + kindLoad;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex < 0) {
      capBonus += 1;
      if (capBonus > 6) break;
      continue;
    }
    take(bestIndex);
  }

  return shuffle(selected);
}

export function buildModuleSkipTest(unit: Unit): ModuleExam {
  const ctx: BuildContext = {
    unit,
    vocab: vocabForUnit(unit),
    essentials: essentialItemsForUnit(unit),
    seq: 0,
  };

  const candidates: ExamQuestion[] = [];
  for (const lesson of unit.lessons) {
    for (const step of lesson.steps) {
      candidates.push(...questionsFromStep(ctx, lesson, step));
    }
  }
  candidates.push(...synthesizedClozeQuestions(ctx));

  // Pares sintetizados só quando o banco do módulo é forte (≥ 8 pares).
  const matchBank = moduleMatchingBank(ctx.vocab);
  if (matchBank.length >= 8 && validateMatchingPairs(matchBank).valid) {
    const lesson = ctx.unit.lessons[0];
    candidates.push({
      id: nextId(ctx, lesson),
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      kind: "significado",
      ...examDifficultyMeta(lesson, false),
      prompt: "Ligue cada item ao seu significado.",
      isEssential: false,
      display: {},
      feedback: {
        meaning: matchBank.slice(0, 6).map((pair) => `${pair.left} = ${pair.right}`).join(" · "),
      },
      format: "match",
      pairs: shuffle(matchBank).slice(0, 6),
    });
  }

  // Nenhuma pergunta quebrada passa: inválidas são descartadas, nunca exibidas.
  const valid = dedupeQuestions(
    candidates.filter((question) => validateExamQuestion(question).valid)
  );

  if (valid.length < EXAM_MIN_QUESTIONS) {
    return { status: "insufficient", validCount: valid.length };
  }

  // No máximo 3 questões essenciais por teste (uma por resposta central):
  // errar item central bloqueia o pulo, então o rótulo precisa ser criterioso.
  let essentialBudget = 3;
  const essentialKeys = new Set<string>();
  for (const question of valid) {
    if (!question.isEssential) continue;
    // Dedupe pelo item central (hànzì), não pela resposta: duas perguntas
    // sobre 你好 com respostas "Olá." e "你好" são o mesmo item essencial.
    const key =
      question.format === "match"
        ? question.id
        : normalizeOption(question.feedback.hanzi ?? question.answer);
    if (essentialBudget <= 0 || essentialKeys.has(key)) {
      question.isEssential = false;
      const fallbackLesson = ctx.unit.lessons.find((lesson) => lesson.id === question.lessonId);
      if (fallbackLesson) {
        const meta = examDifficultyMeta(fallbackLesson, false);
        question.difficulty = meta.difficulty;
        question.diagnosticOnly = meta.diagnosticOnly;
      }
      continue;
    }
    essentialKeys.add(key);
    essentialBudget -= 1;
  }

  const target =
    valid.length >= EXAM_IDEAL_QUESTIONS
      ? Math.min(EXAM_MAX_QUESTIONS, valid.length)
      : Math.max(EXAM_MIN_QUESTIONS, valid.length);
  const questions = selectExamQuestions(valid, target);
  if (questions.length < EXAM_MIN_QUESTIONS) {
    return { status: "insufficient", validCount: questions.length };
  }

  // Todo teste tem pelo menos 1 questão essencial: se o módulo não tem itens
  // centrais mapeados, a primeira questão de significado (ou uso) assume o papel.
  if (!questions.some((question) => question.isEssential)) {
    const fallback =
      questions.find((question) => question.kind === "significado" && question.format !== "match") ??
      questions.find((question) => question.kind === "uso") ??
      questions[0];
    fallback.isEssential = true;
    fallback.difficulty = "core";
    fallback.diagnosticOnly = false;
  }

  return { status: "ok", questions };
}

// ---------------------------------------------------------------------------
// Nota
// ---------------------------------------------------------------------------

export function gradeModuleSkipTest(
  questions: ExamQuestion[],
  correctIds: ReadonlySet<string>
): ExamGradeResult {
  const total = questions.length;
  const correctCount = questions.filter((question) => correctIds.has(question.id)).length;
  const scoredQuestions = questions.filter((question) => !question.diagnosticOnly);
  const diagnosticQuestions = questions.filter((question) => question.diagnosticOnly);
  const scoredTotal = scoredQuestions.length;
  const scoredCorrectCount = scoredQuestions.filter((question) => correctIds.has(question.id)).length;
  const diagnosticTotal = diagnosticQuestions.length;
  const diagnosticCorrectCount = diagnosticQuestions.filter((question) => correctIds.has(question.id)).length;
  const requiredCorrect = examPassScore(scoredTotal);
  const essentialMissed = questions.filter(
    (question) => question.isEssential && !correctIds.has(question.id)
  );
  return {
    total,
    correctCount,
    scoredTotal,
    scoredCorrectCount,
    diagnosticTotal,
    diagnosticCorrectCount,
    requiredCorrect,
    percent: scoredTotal > 0 ? Math.round((scoredCorrectCount / scoredTotal) * 100) : 0,
    essentialMissed,
    passed: scoredCorrectCount >= requiredCorrect && essentialMissed.length === 0,
  };
}
