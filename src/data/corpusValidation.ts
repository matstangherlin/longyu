import { CHARACTERS, charById } from "./characters";
import { CHUNKS, chunkById } from "./chunks";
import { VOCABULARY } from "./vocabulary";
import { MICROTEXTS } from "./microtexts";
import {
  ALL_LESSONS,
  JOURNEY,
  type Lesson,
  type LessonStep,
  type PedagogicalItemStatus,
  type StepKind,
  type Unit,
} from "./journey";
import { RADICALS, radicalById } from "./radicals";
import { glossFor } from "./gloss";
import { TONE_SANDHI_RULES } from "./toneSandhi";
import { HANZI_EVOLUTIONS } from "./hanziPedagogy";
import { validateContentArchitecture } from "./contentValidation";

// ————————————————————————————————————————————————————————————————
// Validador do corpus pedagógico do Longyu.
//
// Regras centrais (ver BLUEPRINT):
// - todo chunk tem hanzi, pinyin e significado pt-BR;
// - toda entrada de vocabulário tem hanzi, pinyin, significado, domínio e nível;
// - toda pergunta tem resposta, e a resposta está nas alternativas;
// - nenhuma lista de alternativas tem duplicatas;
// - referências charId/chunkId apontam para itens existentes;
// - todo hànzì exibido em lição/microtexto tem gloss (toque-para-traduzir)
//   ou está no repertório de caracteres;
// - microtextos declaram os itens necessários e a lição de desbloqueio existe;
// - tom declarado de um caractere bate com o diacrítico do pinyin.
//
// Uso: `npm run validate:corpus` (script Node) ou em dev via console.
// ————————————————————————————————————————————————————————————————

export type IssueSeverity = "error" | "warn";

export interface CorpusIssue {
  severity: IssueSeverity;
  /** Área do corpus ("chunks", "characters", "vocabulary", "journey", ...). */
  area: string;
  /** Identificador do item com problema (id, lição, hanzi...). */
  ref: string;
  message: string;
}

const issue = (
  severity: IssueSeverity,
  area: string,
  ref: string,
  message: string
): CorpusIssue => ({ severity, area, ref, message });

const CJK_RE = /[㐀-鿿]/u;
const HANZI_PUNCTUATION_RE = /[，。！？、,.!?\s：；;“”"（）()]/g;

const charByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
const vocabById = Object.fromEntries(VOCABULARY.map((entry) => [entry.id, entry]));

function cjkChars(text: string | undefined): string[] {
  if (!text) return [];
  return [...text].filter((ch) => CJK_RE.test(ch));
}

function normalizeHanziText(text: string | undefined): string {
  return (text ?? "").replace(HANZI_PUNCTUATION_RE, "");
}

function chunkIdByExactText(text: string | undefined): string | null {
  const normalized = normalizeHanziText(text);
  if (!normalized) return null;
  return CHUNKS.find((chunk) => normalizeHanziText(chunk.hanzi) === normalized)?.id ?? null;
}

function itemExists(ref: string): boolean {
  const [type, id] = ref.split(":");
  if (!type || !id) return false;
  if (type === "char") return Boolean(charById[id]);
  if (type === "chunk") return Boolean(chunkById[id]);
  if (type === "vocab") return Boolean(vocabById[id]);
  return false;
}

function charsForItemRef(ref: string): string[] {
  const [type, id] = ref.split(":");
  if (type === "char") return charById[id]?.hanzi ? [charById[id].hanzi] : [];
  if (type === "chunk") return cjkChars(chunkById[id]?.hanzi);
  if (type === "vocab") return cjkChars(vocabById[id]?.hanzi);
  return [];
}

function normalizeOption(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

// Diacríticos por tom (mesma convenção do first5000Seed).
const TONE_MARKS: Record<1 | 2 | 3 | 4, RegExp> = {
  1: /[āēīōūǖ]/u,
  2: /[áéíóúǘ]/u,
  3: /[ǎěǐǒǔǚ]/u,
  4: /[àèìòùǜ]/u,
};

/** Tom aparente de um pinyin monossilábico (5 = nenhum diacrítico). */
export function toneFromPinyin(pinyin: string): 1 | 2 | 3 | 4 | 5 {
  for (const tone of [1, 2, 3, 4] as const) {
    if (TONE_MARKS[tone].test(pinyin)) return tone;
  }
  return 5;
}

function hasDuplicates(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalizeOption(value);
    if (seen.has(key)) return value;
    seen.add(key);
  }
  return null;
}

// ————————————————————————————————————————————————————————————————
// Caracteres
// ————————————————————————————————————————————————————————————————

export function validateCharacters(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const byId = new Set<string>();
  const byHanzi = new Set<string>();

  for (const char of CHARACTERS) {
    const ref = `${char.hanzi} (${char.id})`;
    if (!char.id) issues.push(issue("error", "characters", char.hanzi, "id vazio"));
    if (!char.hanzi) issues.push(issue("error", "characters", char.id, "hanzi vazio"));
    if (!char.pinyin?.trim()) issues.push(issue("error", "characters", ref, "pinyin vazio"));
    if (!char.meaningPt?.trim()) issues.push(issue("error", "characters", ref, "meaningPt vazio"));

    if (byId.has(char.id)) issues.push(issue("error", "characters", ref, "id duplicado"));
    byId.add(char.id);
    if (byHanzi.has(char.hanzi)) issues.push(issue("error", "characters", ref, "hanzi duplicado"));
    byHanzi.add(char.hanzi);

    // Tom declarado deve bater com o diacrítico do pinyin.
    const apparent = toneFromPinyin(char.pinyin);
    if (apparent !== char.tone) {
      issues.push(
        issue("error", "characters", ref, `tone ${char.tone} não bate com o pinyin "${char.pinyin}" (aparenta ${apparent})`)
      );
    }

    // Componentes precisam existir no repertório de radicais.
    for (const componentId of char.components) {
      if (!radicalById[componentId]) {
        issues.push(issue("error", "characters", ref, `componente desconhecido: ${componentId}`));
      }
    }
    if (char.phonetic && !char.components.includes(char.phonetic)) {
      issues.push(issue("error", "characters", ref, `phonetic ${char.phonetic} não está em components`));
    }
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Chunks
// ————————————————————————————————————————————————————————————————

export function validateChunks(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const byId = new Set<string>();
  const byHanzi = new Set<string>();

  for (const chunk of CHUNKS) {
    const ref = `${chunk.hanzi} (${chunk.id})`;
    if (!chunk.hanzi?.trim()) issues.push(issue("error", "chunks", chunk.id, "hanzi vazio"));
    if (!chunk.pinyin?.trim()) issues.push(issue("error", "chunks", ref, "pinyin vazio"));
    if (!chunk.meaningPt?.trim()) issues.push(issue("error", "chunks", ref, "meaningPt vazio"));
    if (!chunk.tags?.length) issues.push(issue("warn", "chunks", ref, "sem tags"));

    if (byId.has(chunk.id)) issues.push(issue("error", "chunks", ref, "id duplicado"));
    byId.add(chunk.id);
    if (byHanzi.has(chunk.hanzi)) issues.push(issue("warn", "chunks", ref, "hanzi duplicado em outro chunk"));
    byHanzi.add(chunk.hanzi);
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Vocabulário
// ————————————————————————————————————————————————————————————————

export function validateVocabulary(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const byId = new Set<string>();
  const byHanzi = new Map<string, string>();

  for (const entry of VOCABULARY) {
    const ref = `${entry.hanzi} (${entry.id})`;
    if (!entry.hanzi?.trim()) issues.push(issue("error", "vocabulary", entry.id, "hanzi vazio"));
    if (!entry.pinyin?.trim()) issues.push(issue("error", "vocabulary", ref, "pinyin vazio"));
    if (!entry.meaningPt?.trim()) issues.push(issue("error", "vocabulary", ref, "meaningPt vazio"));
    if (!entry.domain) issues.push(issue("error", "vocabulary", ref, "sem domínio"));
    if (!entry.level) issues.push(issue("error", "vocabulary", ref, "sem nível"));
    if (!entry.kind) issues.push(issue("error", "vocabulary", ref, "sem kind (word/phrase)"));

    if (byId.has(entry.id)) issues.push(issue("error", "vocabulary", ref, "id duplicado"));
    byId.add(entry.id);

    // Mesmo hanzi só pode repetir se o sentido for outro (polissemia declarada).
    const previous = byHanzi.get(entry.hanzi);
    if (previous && previous === normalizeOption(entry.meaningPt)) {
      issues.push(issue("error", "vocabulary", ref, "hanzi duplicado com o mesmo significado"));
    }
    byHanzi.set(entry.hanzi, normalizeOption(entry.meaningPt));
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Jornada (perguntas das lições)
// ————————————————————————————————————————————————————————————————

function validateItemRefs(area: string, ref: string, refs: string[] | undefined, label: string): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const duplicate = hasDuplicates(refs ?? []);
  if (duplicate) issues.push(issue("error", area, ref, `${label}: item duplicado "${duplicate}"`));
  for (const itemRef of refs ?? []) {
    if (!itemExists(itemRef)) {
      issues.push(issue("error", area, ref, `${label}: referência não resolve: ${itemRef}`));
    }
  }
  return issues;
}

function stepTextSources(step: LessonStep): string[] {
  return [
    step.text,
    step.hanzi,
    step.audioText,
    step.slowAudioText,
    step.sourceText,
    step.sentenceBefore,
    step.sentenceAfter,
    step.blankAnswer,
    step.correctAnswer,
    step.answer,
    ...(step.lines ?? []).map((line) => line.hanzi),
    ...(step.target ?? []),
    ...(step.targetParts ?? []),
    ...(step.bank ?? []),
    ...(step.options ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ].filter((value): value is string => Boolean(value));
}

function explicitStepRefs(step: LessonStep): string[] {
  const refs = new Set<string>();
  if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) refs.add(`char:${step.charId}`);
  if (step.kind === "hanzi_evolution") {
    for (const charId of step.charIds ?? []) refs.add(`char:${charId}`);
  }
  if (step.kind === "flashcard" && step.chunkId) refs.add(`chunk:${step.chunkId}`);
  if (step.kind === "write" && step.chunkId) refs.add(`chunk:${step.chunkId}`);
  return [...refs];
}

function stepItemRefs(step: LessonStep): string[] {
  const refs = new Set(explicitStepRefs(step));
  for (const source of stepTextSources(step)) {
    const chunkId = chunkIdByExactText(source);
    if (chunkId) refs.add(`chunk:${chunkId}`);
    for (const char of cjkChars(source)) {
      const id = charByHanzi.get(char)?.id;
      if (id) refs.add(`char:${id}`);
    }
  }
  return [...refs];
}

function validateStep(lesson: Lesson, index: number, step: LessonStep): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const ref = `${lesson.id} passo ${index + 1} (${step.kind})`;

  const checkOptions = (answer: string | undefined, options: string[] | undefined, label: string) => {
    if (!answer?.trim()) {
      issues.push(issue("error", "journey", ref, `${label}: sem resposta`));
      return;
    }
    if (!options?.length) {
      issues.push(issue("error", "journey", ref, `${label}: sem alternativas`));
      return;
    }
    const duplicate = hasDuplicates(options);
    if (duplicate) issues.push(issue("error", "journey", ref, `${label}: alternativa duplicada "${duplicate}"`));
    if (!options.some((option) => normalizeOption(option) === normalizeOption(answer))) {
      issues.push(issue("error", "journey", ref, `${label}: resposta "${answer}" não está nas alternativas`));
    }
  };

  if (step.options?.length && !["comprehend", "listen_select", "dialogue_choice", "conversation_scene"].includes(step.kind)) {
    checkOptions(step.correctAnswer ?? step.answer, step.options, step.kind);
  }
  for (const [label, values] of [
    ["options", step.options],
    ["bank", step.bank],
    ["wordBank", step.wordBank],
    ["distractors", step.distractors],
  ] as const) {
    const duplicate = hasDuplicates(values ?? []);
    if (duplicate) issues.push(issue("error", "journey", ref, `${label}: item duplicado "${duplicate}"`));
  }

  switch (step.kind) {
    case "comprehend":
      checkOptions(step.answer, step.options, "comprehend");
      break;
    case "listen_select":
      checkOptions(step.correctAnswer, step.options, "listen_select");
      break;
    case "dialogue_choice":
      checkOptions(step.correctAnswer, step.options, "dialogue_choice");
      break;
    case "conversation_scene": {
      const checkpoint = step.checkpoint;
      const answer = checkpoint?.correctAnswer ?? step.correctAnswer;
      const options = checkpoint?.options ?? step.options;
      if (checkpoint?.type === "order_reply") {
        const duplicate = hasDuplicates(options ?? []);
        if (duplicate) issues.push(issue("error", "journey", ref, `conversation_scene: peça duplicada "${duplicate}"`));
        if (!answer?.trim()) issues.push(issue("error", "journey", ref, "conversation_scene sem resposta correta"));
      } else {
        checkOptions(answer, options, "conversation_scene");
      }
      break;
    }
    case "fill_blank": {
      if (!step.blankAnswer?.trim()) {
        issues.push(issue("error", "journey", ref, "fill_blank sem blankAnswer"));
      } else if (step.bank?.length) {
        const duplicate = hasDuplicates(step.bank);
        if (duplicate) issues.push(issue("error", "journey", ref, `fill_blank: banco com duplicata "${duplicate}"`));
        if (!step.bank.some((option) => normalizeOption(option) === normalizeOption(step.blankAnswer!))) {
          issues.push(issue("error", "journey", ref, `fill_blank: banco não contém a resposta "${step.blankAnswer}"`));
        }
      }
      break;
    }
    case "produce": {
      const missing = (step.target ?? []).filter((piece) => !(step.bank ?? []).includes(piece));
      if (missing.length) {
        issues.push(issue("error", "journey", ref, `produce: banco não contém as peças ${missing.join(", ")}`));
      }
      break;
    }
    case "sentence_build": {
      const missing = (step.targetParts ?? []).filter((piece) => !(step.bank ?? []).includes(piece));
      if (missing.length) {
        issues.push(issue("error", "journey", ref, `sentence_build: banco não contém ${missing.join(", ")}`));
      }
      break;
    }
    case "translation_build": {
      const missing = (step.targetParts ?? []).filter((piece) => !(step.bank ?? []).includes(piece));
      if (missing.length) {
        issues.push(issue("error", "journey", ref, `translation_build: banco não contém ${missing.join(", ")}`));
      }
      break;
    }
    case "match_pairs": {
      const pairs = step.pairs ?? [];
      if (pairs.length < 2) issues.push(issue("error", "journey", ref, "match_pairs com menos de 2 pares"));
      const lefts = hasDuplicates(pairs.map((pair) => pair.left));
      const rights = hasDuplicates(pairs.map((pair) => pair.right));
      if (lefts) issues.push(issue("error", "journey", ref, `match_pairs: lado esquerdo repetido "${lefts}"`));
      if (rights) issues.push(issue("error", "journey", ref, `match_pairs: lado direito repetido "${rights}"`));
      break;
    }
    case "flashcard":
      if (step.chunkId && !chunkById[step.chunkId]) {
        issues.push(issue("error", "journey", ref, `chunkId desconhecido: ${step.chunkId}`));
      }
      break;
    case "recognize":
    case "decompose":
      if (step.charId && !charById[step.charId]) {
        issues.push(issue("error", "journey", ref, `charId desconhecido: ${step.charId}`));
      }
      break;
    case "hanzi_evolution": {
      const charIds = step.charIds ?? [];
      if (charIds.length === 0) issues.push(issue("error", "journey", ref, "hanzi_evolution sem charIds"));
      for (const charId of charIds) {
        if (!charById[charId]) issues.push(issue("error", "journey", ref, `charId desconhecido: ${charId}`));
        if (!HANZI_EVOLUTIONS[charId]) {
          issues.push(issue("error", "journey", ref, `sem evolução cadastrada para charId: ${charId}`));
        }
      }
      break;
    }
    case "tone":
      if (!step.hanzi || !step.pinyin || !step.tone) {
        issues.push(issue("error", "journey", ref, "tone sem hanzi/pinyin/tom"));
      }
      break;
    default:
      break;
  }

  return issues;
}

export function validateJourney(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const lessonIds = new Set<string>();
  const presentedItems = new Set<string>();

  for (const lesson of ALL_LESSONS) {
    if (lessonIds.has(lesson.id)) {
      issues.push(issue("error", "journey", lesson.id, "id de lição duplicado"));
    }
    lessonIds.add(lesson.id);
    issues.push(...validateItemRefs("journey", lesson.id, lesson.libraryItems, "libraryItems"));
    issues.push(...validateItemRefs("journey", lesson.id, lesson.reviewItems, "reviewItems"));
    issues.push(...validateItemRefs("journey", lesson.id, lesson.previewItems, "previewItems"));

    const declaredNow = new Set([...(lesson.libraryItems ?? []), ...(lesson.previewItems ?? [])]);
    const newHanzi = new Set(lesson.newHanzi ?? []);
    const duplicateNewHanzi = hasDuplicates(lesson.newHanzi ?? []);
    if (duplicateNewHanzi) issues.push(issue("error", "journey", lesson.id, `newHanzi duplicado: ${duplicateNewHanzi}`));

    lesson.steps.forEach((step, index) => issues.push(...validateStep(lesson, index, step)));

    for (const [index, step] of lesson.steps.entries()) {
      const stepRef = `${lesson.id} passo ${index + 1} (${step.kind})`;
      for (const char of stepTextSources(step).flatMap((source) => cjkChars(source))) {
        if (!charByHanzi.has(char) && !newHanzi.has(char)) {
          issues.push(
            issue("error", "journey", stepRef, `hànzì "${char}" não existe em CHARACTERS nem em newHanzi da lição`)
          );
        }
      }

      for (const itemRef of explicitStepRefs(step)) {
        if (!itemExists(itemRef)) continue;
        if (!presentedItems.has(itemRef) && !declaredNow.has(itemRef)) {
          issues.push(
            issue(
              "error",
              "journey",
              stepRef,
              `${itemRef} usado antes de ser apresentado; adicione em libraryItems ou marque em previewItems`
            )
          );
        }
      }
    }

    for (const itemRef of lesson.libraryItems ?? []) {
      if (itemExists(itemRef)) presentedItems.add(itemRef);
    }
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Auditoria pedagógica 5x por módulo
// ————————————————————————————————————————————————————————————————

export type PedagogicalExposureAxis = "som" | "significado" | "forma" | "producao" | "contexto";
export type PedagogicalFocusItemType = "chunk" | "hanzi";

export interface PedagogicalExposureAuditItem {
  moduleId: string;
  moduleTitle: string;
  type: PedagogicalFocusItemType;
  item: string;
  count: number;
  formats: StepKind[];
  axes: PedagogicalExposureAxis[];
  status: PedagogicalItemStatus;
  lessonIds: string[];
  reviewCount: number;
  stepRefs: string[];
}

export interface PedagogicalModuleAudit {
  moduleId: string;
  moduleTitle: string;
  focusChunks: string[];
  focusHanzi: string[];
  items: PedagogicalExposureAuditItem[];
}

const MIN_FOCUS_EXPOSURES = 5;
const REQUIRED_EXPOSURE_AXES: PedagogicalExposureAxis[] = [
  "som",
  "significado",
  "forma",
  "producao",
  "contexto",
];

const EXPOSURE_AXES_BY_KIND: Record<StepKind, PedagogicalExposureAxis[]> = {
  intro: ["significado", "contexto"],
  listen: ["som", "significado"],
  tone: ["som", "forma"],
  comprehend: ["significado", "forma"],
  produce: ["producao", "forma"],
  write: ["producao", "contexto"],
  recognize: ["forma"],
  decompose: ["forma", "significado"],
  flashcard: ["som", "significado", "forma"],
  microread: ["contexto", "significado", "forma"],
  match_pairs: ["significado", "forma"],
  listen_select: ["som", "significado", "forma"],
  sentence_build: ["producao", "forma", "contexto"],
  translation_build: ["significado", "producao", "contexto", "forma"],
  fill_blank: ["producao", "contexto", "forma"],
  dialogue_choice: ["contexto", "significado"],
  conversation_scene: ["contexto", "significado", "som"],
  hanzi_evolution: ["forma", "significado", "contexto"],
  hanzi_build: ["producao", "forma"],
  tone_pair: ["som", "significado"],
  image_choice: ["significado", "forma", "som"],
};

function exposureTextSources(step: LessonStep): string[] {
  const sources: (string | undefined)[] = [
    step.title,
    step.body,
    step.text,
    step.pt,
    step.hanzi,
    step.answer,
    step.suggestion,
    step.audioText,
    step.slowAudioText,
    step.prompt,
    step.sourceText,
    step.sourcePinyin,
    step.sourceMeaning,
    step.target?.join(""),
    step.targetParts?.join(""),
    step.sentenceBefore,
    step.sentenceAfter,
    step.blankAnswer,
    step.correctAnswer,
    step.explanation,
    step.dialoguePrompt,
    step.speaker,
  ];

  if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) {
    sources.push(charById[step.charId]?.hanzi);
  }
  if (step.kind === "hanzi_evolution") {
    for (const charId of step.charIds ?? []) {
      const model = HANZI_EVOLUTIONS[charId];
      sources.push(
        charById[charId]?.hanzi,
        model?.hanzi,
        model?.meaningPt,
        model?.word.hanzi,
        model?.word.pt,
        model?.sentence.hanzi,
        model?.sentence.pt,
        model?.insight
      );
    }
  }
  if ((step.kind === "flashcard" || step.kind === "write") && step.chunkId) {
    sources.push(chunkById[step.chunkId]?.hanzi);
  }

    sources.push(
    ...(step.requiredTerms ?? []),
    ...(step.wordBank ?? []),
    ...(step.accepts ?? []),
    ...(step.options ?? []),
    ...(step.target ?? []),
    ...(step.bank ?? []),
    ...(step.targetParts ?? []),
    ...(step.distractors ?? []),
    ...(step.lines ?? []).flatMap((line) => [line.hanzi, line.pinyin, line.pt]),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
    ...(step.learnedRefs ?? []),
    ...(step.newRefs ?? []),
    step.checkpoint?.prompt,
    step.checkpoint?.correctAnswer,
    step.checkpoint?.explanation,
    ...(step.checkpoint?.options ?? [])
  );

  return sources.filter((value): value is string => Boolean(value?.trim()));
}

function exposureKey(value: string): string {
  return normalizeHanziText(value);
}

function stepContainsFocusItem(step: LessonStep, item: string): boolean {
  const key = exposureKey(item);
  if (!key) return false;
  return exposureTextSources(step).some((source) => exposureKey(source).includes(key));
}

function focusChunkExists(item: string): boolean {
  const key = exposureKey(item);
  return Boolean(key) && CHUNKS.some((chunk) => exposureKey(chunk.hanzi) === key);
}

function focusHanziExists(item: string): boolean {
  const chars = cjkChars(item);
  return chars.length === 1 && charByHanzi.has(chars[0]);
}

function statusForExposure(
  count: number,
  axes: Set<PedagogicalExposureAxis>,
  reviewCount: number
): PedagogicalItemStatus {
  const hasAllRequired = REQUIRED_EXPOSURE_AXES.every((axis) => axes.has(axis));
  if (count === 0) return "novo";
  if (count >= MIN_FOCUS_EXPOSURES && hasAllRequired && reviewCount > 0) return "dominado";
  if (reviewCount > 0) return "revisao_ativa";
  if (axes.has("contexto")) return "usado_em_contexto";
  if (axes.has("producao")) return "produzido";
  if (axes.has("forma") && axes.has("significado")) return "reconhecido";
  return "apresentado";
}

function auditFocusItem(
  unit: Unit,
  type: PedagogicalFocusItemType,
  item: string
): PedagogicalExposureAuditItem {
  const formats = new Set<StepKind>();
  const axes = new Set<PedagogicalExposureAxis>();
  const lessonIds = new Set<string>();
  const stepRefs: string[] = [];
  let count = 0;
  let reviewCount = 0;

  for (const lesson of unit.lessons) {
    lesson.steps.forEach((step, index) => {
      if (!stepContainsFocusItem(step, item)) return;
      count += 1;
      formats.add(step.kind);
      lessonIds.add(lesson.id);
      stepRefs.push(`${lesson.id}#${index + 1}:${step.kind}`);
      if (lesson.isReview) reviewCount += 1;
      for (const axis of EXPOSURE_AXES_BY_KIND[step.kind]) axes.add(axis);
    });
  }

  return {
    moduleId: unit.id,
    moduleTitle: unit.title,
    type,
    item,
    count,
    formats: [...formats],
    axes: [...axes],
    status: statusForExposure(count, axes, reviewCount),
    lessonIds: [...lessonIds],
    reviewCount,
    stepRefs,
  };
}

export function auditPedagogicalExposure(): PedagogicalModuleAudit[] {
  return JOURNEY.flatMap((phase) =>
    phase.units.map((unit) => ({
      moduleId: unit.id,
      moduleTitle: unit.title,
      focusChunks: unit.focusChunks,
      focusHanzi: unit.focusHanzi,
      items: [
        ...unit.focusChunks.map((item) => auditFocusItem(unit, "chunk", item)),
        ...unit.focusHanzi.map((item) => auditFocusItem(unit, "hanzi", item)),
      ],
    }))
  );
}

export function validatePedagogicalExposure(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];

  for (const moduleAudit of auditPedagogicalExposure()) {
    const refBase = `${moduleAudit.moduleTitle} (${moduleAudit.moduleId})`;
    for (const chunk of moduleAudit.focusChunks) {
      if (!focusChunkExists(chunk)) {
        issues.push(issue("warn", "pedagogy", refBase, `focusChunks referencia chunk desconhecido: ${chunk}`));
      }
    }
    for (const hanzi of moduleAudit.focusHanzi) {
      if (!focusHanziExists(hanzi)) {
        issues.push(issue("warn", "pedagogy", refBase, `focusHanzi deve ser um hànzì conhecido: ${hanzi}`));
      }
    }

    for (const item of moduleAudit.items) {
      if (item.count < MIN_FOCUS_EXPOSURES) {
        issues.push(
          issue(
            "warn",
            "pedagogy",
            `${refBase} · ${item.item}`,
            `item central com ${item.count}/${MIN_FOCUS_EXPOSURES} exposições; formatos: ${item.formats.join(", ") || "nenhum"}`
          )
        );
      }
    }
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Cobertura de gloss: todo hànzì exibido deve ser traduzível no toque.
// ————————————————————————————————————————————————————————————————

function stepVisibleHanzi(step: LessonStep): string[] {
  return stepTextSources(step).flatMap((source) => cjkChars(source));
}

export function validateGlossCoverage(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const missing = new Map<string, Set<string>>();

  const track = (char: string, where: string) => {
    if (glossFor(char)) return;
    if (!missing.has(char)) missing.set(char, new Set());
    missing.get(char)!.add(where);
  };

  for (const lesson of ALL_LESSONS) {
    for (const step of lesson.steps) {
      for (const char of stepVisibleHanzi(step)) track(char, lesson.id);
    }
  }
  for (const chunk of CHUNKS) {
    for (const char of cjkChars(chunk.hanzi)) track(char, `chunk:${chunk.id}`);
  }
  for (const text of MICROTEXTS) {
    for (const line of text.lines) {
      for (const char of cjkChars(line.hanzi)) track(char, `microtexto:${text.id}`);
    }
  }
  for (const entry of VOCABULARY) {
    for (const char of cjkChars(entry.hanzi)) track(char, `vocab:${entry.id}`);
  }

  for (const [char, places] of missing) {
    issues.push(
      issue(
        "error",
        "gloss",
        char,
        `sem gloss (toque-para-traduzir falha) — usado em: ${[...places].slice(0, 4).join(", ")}${places.size > 4 ? "…" : ""}`
      )
    );
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Microtextos
// ————————————————————————————————————————————————————————————————

export function validateMicrotexts(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const lessonIds = new Set(ALL_LESSONS.map((lesson) => lesson.id));
  const lessonOrder = new Map(ALL_LESSONS.map((lesson, index) => [lesson.id, index]));

  const presentedCharsThrough = (lessonId: string): Set<string> => {
    const lastIndex = lessonOrder.get(lessonId);
    const chars = new Set<string>();
    if (lastIndex == null) return chars;
    for (const lesson of ALL_LESSONS.slice(0, lastIndex + 1)) {
      for (const itemRef of lesson.libraryItems ?? []) {
        for (const char of charsForItemRef(itemRef)) chars.add(char);
      }
      for (const step of lesson.steps) {
        for (const itemRef of stepItemRefs(step)) {
          for (const char of charsForItemRef(itemRef)) chars.add(char);
        }
      }
    }
    return chars;
  };

  for (const text of MICROTEXTS) {
    const ref = `${text.title} (${text.id})`;
    if (!text.lines?.length) issues.push(issue("error", "microtexts", ref, "sem linhas"));
    if (!text.glossary?.length) issues.push(issue("warn", "microtexts", ref, "sem glossário"));
    if (!lessonIds.has(text.unlockAfterLesson)) {
      issues.push(issue("error", "microtexts", ref, `unlockAfterLesson desconhecida: ${text.unlockAfterLesson}`));
    }
    if (!text.requiredItems?.length) {
      issues.push(issue("error", "microtexts", ref, "sem requiredItems declarados"));
    }
    issues.push(...validateItemRefs("microtexts", ref, text.requiredItems, "requiredItems"));

    for (const line of text.lines ?? []) {
      if (!line.hanzi?.trim()) issues.push(issue("error", "microtexts", ref, "linha sem hanzi"));
      if (!line.pinyin?.trim()) issues.push(issue("error", "microtexts", ref, `linha sem pinyin: ${line.hanzi}`));
      if (!line.pt?.trim()) issues.push(issue("error", "microtexts", ref, `linha sem tradução: ${line.hanzi}`));
    }

    const availableChars = presentedCharsThrough(text.unlockAfterLesson);
    for (const item of text.requiredItems ?? []) {
      for (const char of charsForItemRef(item)) availableChars.add(char);
    }
    const missingChars = new Set<string>();
    for (const line of text.lines ?? []) {
      for (const char of cjkChars(line.hanzi)) {
        if (!availableChars.has(char)) missingChars.add(char);
      }
    }
    if (missingChars.size > 0) {
      issues.push(
        issue(
          "error",
          "microtexts",
          ref,
          `usa hànzì sem item prévio/requiredItems: ${[...missingChars].join(" ")}`
        )
      );
    }

    // Glossário deve referenciar itens que aparecem de fato nas linhas.
    const textHanzi = new Set(text.lines.flatMap((line) => cjkChars(line.hanzi)));
    for (const entry of text.glossary ?? []) {
      if (!entry.pt?.trim()) issues.push(issue("error", "microtexts", ref, `glossário sem tradução para ${entry.hanzi}`));
      const chars = cjkChars(entry.hanzi);
      if (chars.length > 0 && !chars.some((char) => textHanzi.has(char))) {
        issues.push(issue("warn", "microtexts", ref, `glossário lista ${entry.hanzi}, que não aparece no texto`));
      }
    }
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Tone sandhi (conteúdo pedagógico mínimo bem formado)
// ————————————————————————————————————————————————————————————————

export function validateToneSandhi(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const lessonIds = new Set(ALL_LESSONS.map((lesson) => lesson.id));
  for (const rule of TONE_SANDHI_RULES) {
    const ref = rule.id;
    if (!rule.title?.trim()) issues.push(issue("error", "toneSandhi", ref, "sem título"));
    if (!rule.rulePt?.trim()) issues.push(issue("error", "toneSandhi", ref, "sem explicação"));
    if (!rule.tipPt?.trim()) issues.push(issue("error", "toneSandhi", ref, "sem dica prática"));
    if (!lessonIds.has(rule.relevantFromLesson)) {
      issues.push(issue("error", "toneSandhi", ref, `relevantFromLesson desconhecida: ${rule.relevantFromLesson}`));
    }
    if (!rule.examples?.length) issues.push(issue("error", "toneSandhi", ref, "sem exemplos"));
    for (const example of rule.examples ?? []) {
      if (!example.hanzi || !example.pinyin || !example.citation || !example.pt) {
        issues.push(issue("error", "toneSandhi", ref, `exemplo incompleto: ${example.hanzi ?? "?"}`));
      }
    }
  }
  return issues;
}

// ————————————————————————————————————————————————————————————————
// Metas mínimas do MVP pedagógico
// ————————————————————————————————————————————————————————————————

export function validateCorpusTargets(): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const vocabularyPhrases = VOCABULARY.filter((entry) => entry.kind === "phrase").length;
  const usefulItems = VOCABULARY.length + CHUNKS.length;
  const targets = [
    { label: "palavras/chunks úteis", actual: usefulItems, minimum: 300 },
    { label: "hànzì no repertório", actual: CHARACTERS.length, minimum: 100 },
    { label: "chunks de frase", actual: CHUNKS.length, minimum: 50 },
    { label: "microfrases úteis", actual: vocabularyPhrases, minimum: 30 },
    { label: "microtextos curtos", actual: MICROTEXTS.length, minimum: 15 },
  ];

  for (const target of targets) {
    if (target.actual < target.minimum) {
      issues.push(
        issue("error", "targets", target.label, `mínimo ${target.minimum}, atual ${target.actual}`)
      );
    }
  }

  return issues;
}

// ————————————————————————————————————————————————————————————————
// Agregador + resumo
// ————————————————————————————————————————————————————————————————

export interface CorpusReport {
  issues: CorpusIssue[];
  errors: CorpusIssue[];
  warnings: CorpusIssue[];
  stats: {
    characters: number;
    chunks: number;
    vocabulary: number;
    vocabularyWords: number;
    vocabularyPhrases: number;
    microtexts: number;
    lessons: number;
    radicals: number;
    usefulItems: number;
    totalItems: number;
  };
}

export function validateCorpus(): CorpusReport {
  const issues = [
    ...validateCharacters(),
    ...validateChunks(),
    ...validateVocabulary(),
    ...validateContentArchitecture(),
    ...validateJourney(),
    ...validatePedagogicalExposure(),
    ...validateMicrotexts(),
    ...validateGlossCoverage(),
    ...validateToneSandhi(),
    ...validateCorpusTargets(),
  ];

  return {
    issues,
    errors: issues.filter((item) => item.severity === "error"),
    warnings: issues.filter((item) => item.severity === "warn"),
    stats: {
      characters: CHARACTERS.length,
      chunks: CHUNKS.length,
      vocabulary: VOCABULARY.length,
      vocabularyWords: VOCABULARY.filter((entry) => entry.kind === "word").length,
      vocabularyPhrases: VOCABULARY.filter((entry) => entry.kind === "phrase").length,
      microtexts: MICROTEXTS.length,
      lessons: ALL_LESSONS.length,
      radicals: RADICALS.length,
      usefulItems: CHUNKS.length + VOCABULARY.length,
      totalItems: CHARACTERS.length + CHUNKS.length + VOCABULARY.length,
    },
  };
}
