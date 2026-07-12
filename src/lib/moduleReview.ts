import { CHARACTERS } from "../data/characters";
import { CHUNKS } from "../data/chunks";
import { ALL_LESSONS, JOURNEY, type Lesson, type Unit } from "../data/journey";
import type { ItemType } from "../data/types";
import type { ReviewDomain } from "./srs";
import type { SRSItem } from "./srs";

export interface ModuleReviewFocusItem {
  key: string;
  hanzi: string;
  pinyin?: string;
  meaningPt: string;
  type?: ItemType;
  itemId?: string;
  pool?: "current" | "prior" | "weak" | "error";
}

export interface ModuleReviewRecentError {
  correctAnswer?: string;
  hanzi?: string;
  pinyin?: string;
  meaningPt?: string;
  tokens?: string[];
  targets?: { type: ItemType; itemId: string }[];
  timestamp?: number;
}

export interface ModuleReviewContext {
  completedLessons?: string[];
  recentErrors?: ModuleReviewRecentError[];
  srs?: Record<string, SRSItem>;
}

export interface ModuleReviewPools {
  current: ModuleReviewFocusItem[];
  prior: ModuleReviewFocusItem[];
  weak: ModuleReviewFocusItem[];
  errors: ModuleReviewFocusItem[];
}

export interface ModuleReviewCoverageIssue {
  unitId: string;
  unitTitle: string;
  message: string;
}

export interface ReviewPlanStep {
  kind: string;
  hanzi?: string;
  text?: string;
  audioText?: string;
  correctAnswer?: string;
  answer?: string;
  target?: string[];
  lines?: { hanzi: string }[];
}

/** Frases progressivas — só entram depois do módulo indicado. */
export const PROGRESSIVE_PHRASE_REFS: readonly { ref: string; afterUnitIndex: number }[] = [
  { ref: "chunk:nihao", afterUnitIndex: 0 },
  { ref: "chunk:xiexie", afterUnitIndex: 0 },
  { ref: "chunk:bukeqi", afterUnitIndex: 0 },
  { ref: "chunk:zaijian", afterUnitIndex: 0 },
  { ref: "char:ni", afterUnitIndex: 0 },
  { ref: "char:wo", afterUnitIndex: 0 },
  { ref: "char:ren", afterUnitIndex: 3 },
  { ref: "char:mu", afterUnitIndex: 4 },
  { ref: "chunk:wohenhao", afterUnitIndex: 1 },
  { ref: "chunk:nihaoma", afterUnitIndex: 1 },
  { ref: "chunk:wobuhui", afterUnitIndex: 2 },
  { ref: "chunk:jintianhenhao", afterUnitIndex: 3 },
  { ref: "chunk:woxianghe", afterUnitIndex: 7 },
  { ref: "chunk:mingtianjian", afterUnitIndex: 6 },
  { ref: "chunk:nijiaoshenme", afterUnitIndex: 1 },
  { ref: "chunk:zheshishui", afterUnitIndex: 5 },
  { ref: "chunk:nashirenm", afterUnitIndex: 5 },
];

const charByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
const HANZI_PUNCTUATION_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/g;
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;

function normalizeHanzi(value: string): string {
  return value.replace(HANZI_PUNCTUATION_RE, "");
}

const chunkByHanzi = new Map(CHUNKS.map((chunk) => [normalizeHanzi(chunk.hanzi), chunk]));

const AUDIO_KINDS = new Set(["listen", "listen_select", "tone", "tone_pair", "image_choice"]);
const PINYIN_KINDS = new Set(["tone", "tone_pair", "listen_select", "image_choice"]);
const MEANING_KINDS = new Set(["comprehend", "flashcard", "dialogue_choice", "match_pairs", "image_choice"]);
const HANZI_KINDS = new Set(["recognize", "decompose", "hanzi_build", "hanzi_evolution", "image_choice"]);
const PHRASE_KINDS = new Set(["produce", "write", "sentence_build", "translation_build", "fill_blank", "dialogue_choice", "microread"]);

export function findUnitById(unitId: string): Unit | undefined {
  for (const phase of JOURNEY) {
    const unit = phase.units.find((candidate) => candidate.id === unitId);
    if (unit) return unit;
  }
  return undefined;
}

export function unitOrderIndex(unitId: string): number {
  const units = JOURNEY.flatMap((phase) => phase.units);
  return units.findIndex((unit) => unit.id === unitId);
}

function containsCjk(value: string | undefined): boolean {
  return Boolean(value && CJK_RE.test(value));
}

function focusKey(type: ItemType | "text", id: string): string {
  return `${type}:${id}`;
}

function focusFromRef(ref: string): ModuleReviewFocusItem | null {
  const [rawType, itemId] = ref.split(":");
  if (!itemId) return null;
  if (rawType === "chunk") {
    const chunk = CHUNKS.find((entry) => entry.id === itemId);
    if (!chunk) return null;
    return {
      key: focusKey("chunk", chunk.id),
      hanzi: chunk.hanzi,
      pinyin: chunk.pinyin,
      meaningPt: chunk.meaningPt.replace(/\.$/, ""),
      type: "chunk",
      itemId: chunk.id,
    };
  }
  if (rawType === "char") {
    const char = CHARACTERS.find((entry) => entry.id === itemId);
    if (!char) return null;
    return {
      key: focusKey("char", char.id),
      hanzi: char.hanzi,
      pinyin: char.pinyin,
      meaningPt: char.meaningPt.replace(/\.$/, ""),
      type: "char",
      itemId: char.id,
    };
  }
  return null;
}

function focusFromText(hanzi?: string, pinyin?: string, meaningPt?: string): ModuleReviewFocusItem | null {
  if (!hanzi || !containsCjk(hanzi)) return null;
  const normalized = normalizeHanzi(hanzi);
  const chunk = chunkByHanzi.get(normalized);
  if (chunk) {
    return {
      key: focusKey("chunk", chunk.id),
      hanzi: chunk.hanzi,
      pinyin: chunk.pinyin,
      meaningPt: chunk.meaningPt.replace(/\.$/, ""),
      type: "chunk",
      itemId: chunk.id,
    };
  }
  const glyphs = [...normalized];
  if (glyphs.length === 1) {
    const char = charByHanzi.get(glyphs[0]);
    if (char) {
      return {
        key: focusKey("char", char.id),
        hanzi: char.hanzi,
        pinyin: char.pinyin,
        meaningPt: char.meaningPt.replace(/\.$/, ""),
        type: "char",
        itemId: char.id,
      };
    }
  }
  return {
    key: focusKey("text", normalized),
    hanzi,
    pinyin,
    meaningPt: meaningPt?.replace(/\.$/, "") ?? "Reconheça no contexto do módulo.",
  };
}

function addFocusItem(items: ModuleReviewFocusItem[], item: ModuleReviewFocusItem | null, pool?: ModuleReviewFocusItem["pool"]) {
  if (!item) return;
  if (items.some((entry) => entry.key === item.key)) return;
  items.push(pool ? { ...item, pool } : item);
}

function lessonsForUnit(unitId: string): Lesson[] {
  return ALL_LESSONS.filter((lesson) => lesson.unitId === unitId);
}

function itemsFromLessons(lessons: readonly Lesson[], pool: ModuleReviewFocusItem["pool"]): ModuleReviewFocusItem[] {
  const items: ModuleReviewFocusItem[] = [];
  for (const lesson of lessons) {
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      addFocusItem(items, focusFromRef(ref), pool);
    }
    for (const step of lesson.steps) {
      if (step.kind === "flashcard" && step.chunkId) addFocusItem(items, focusFromRef(`chunk:${step.chunkId}`), pool);
      if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) {
        addFocusItem(items, focusFromRef(`char:${step.charId}`), pool);
      }
      if (step.kind === "listen") addFocusItem(items, focusFromText(step.text, step.pinyin, step.pt), pool);
      if (step.kind === "tone") addFocusItem(items, focusFromText(step.hanzi, step.pinyin), pool);
      if (step.kind === "comprehend") addFocusItem(items, focusFromText(step.hanzi, step.pinyin, step.answer), pool);
      if (step.kind === "listen_select") addFocusItem(items, focusFromText(step.audioText ?? step.correctAnswer, undefined, step.explanation), pool);
      if (step.kind === "sentence_build" || step.kind === "translation_build" || step.kind === "hanzi_build") {
        addFocusItem(items, focusFromText(step.correctAnswer ?? step.targetParts?.join(""), step.sourcePinyin, step.explanation), pool);
      }
      if (step.kind === "fill_blank") {
        addFocusItem(
          items,
          focusFromText(step.correctAnswer ?? `${step.sentenceBefore ?? ""}${step.blankAnswer ?? ""}${step.sentenceAfter ?? ""}`, undefined, step.explanation),
          pool
        );
      }
      if (step.kind === "dialogue_choice") addFocusItem(items, focusFromText(step.correctAnswer ?? step.answer, undefined, step.explanation), pool);
      if (step.kind === "image_choice") addFocusItem(items, focusFromText(step.targetHanzi, step.targetPinyin, step.targetMeaningPt), pool);
      for (const line of step.lines ?? []) addFocusItem(items, focusFromText(line.hanzi, line.pinyin, line.pt), pool);
      for (const pair of step.pairs ?? []) {
        const hanziSide = containsCjk(pair.left) ? pair.left : containsCjk(pair.right) ? pair.right : undefined;
        const meaningSide = containsCjk(pair.left) ? pair.right : containsCjk(pair.right) ? pair.left : undefined;
        addFocusItem(items, focusFromText(hanziSide, undefined, meaningSide), pool);
      }
    }
  }
  return items;
}

export function resolveModuleFocusItems(unit: Unit): ModuleReviewFocusItem[] {
  const items: ModuleReviewFocusItem[] = [];
  for (const hanzi of unit.focusHanzi ?? []) {
    const char = charByHanzi.get(hanzi);
    if (char) addFocusItem(items, focusFromRef(`char:${char.id}`), "current");
    else addFocusItem(items, focusFromText(hanzi), "current");
  }
  for (const chunkHanzi of unit.focusChunks ?? []) {
    addFocusItem(items, focusFromText(chunkHanzi), "current");
  }
  for (const sound of unit.focusSounds ?? []) {
    addFocusItem(items, focusFromText(sound, sound), "current");
  }
  for (const item of itemsFromLessons(lessonsForUnit(unit.id), "current")) addFocusItem(items, item, "current");
  return items;
}

function progressivePhrasesForUnit(unitIndex: number): ModuleReviewFocusItem[] {
  const items: ModuleReviewFocusItem[] = [];
  for (const phrase of PROGRESSIVE_PHRASE_REFS) {
    if (phrase.afterUnitIndex > unitIndex) continue;
    addFocusItem(items, focusFromRef(phrase.ref), "prior");
  }
  return items;
}

function priorModuleItems(unitId: string, completed: Set<string>): ModuleReviewFocusItem[] {
  const index = unitOrderIndex(unitId);
  if (index <= 0) return progressivePhrasesForUnit(index);
  const units = JOURNEY.flatMap((phase) => phase.units).slice(0, index);
  const items: ModuleReviewFocusItem[] = [];
  for (const unit of units) {
    for (const lesson of lessonsForUnit(unit.id)) {
      if (completed.size > 0 && !completed.has(lesson.id)) continue;
      for (const item of itemsFromLessons([lesson], "prior")) addFocusItem(items, item, "prior");
    }
  }
  for (const item of progressivePhrasesForUnit(index)) addFocusItem(items, item, "prior");
  return items;
}

function errorFocusItems(errors: ModuleReviewRecentError[] | undefined): ModuleReviewFocusItem[] {
  const items: ModuleReviewFocusItem[] = [];
  const sorted = [...(errors ?? [])]
    .filter((error) => !error.timestamp || error.timestamp > Date.now() - 1000 * 60 * 60 * 24 * 14)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  for (const error of sorted) {
    for (const target of error.targets ?? []) addFocusItem(items, focusFromRef(`${target.type}:${target.itemId}`), "error");
    addFocusItem(items, focusFromText(error.hanzi ?? error.correctAnswer, error.pinyin, error.meaningPt), "error");
    for (const token of error.tokens ?? []) addFocusItem(items, focusFromText(token, error.pinyin, error.meaningPt), "error");
    if (items.length >= 8) break;
  }
  return items;
}

function srsLapsesForFocus(srs: Record<string, SRSItem>, focus: ModuleReviewFocusItem): number {
  if (!focus.itemId || !focus.type) return 0;
  return Object.values(srs)
    .filter((entry) => entry.type === focus.type && entry.itemId === focus.itemId)
    .reduce((max, entry) => Math.max(max, entry.lapses), 0);
}

function weakSrsFocusItems(srs: Record<string, SRSItem> | undefined, allowedKeys: Set<string>): ModuleReviewFocusItem[] {
  if (!srs) return [];
  const now = Date.now();
  const items: ModuleReviewFocusItem[] = [];
  for (const entry of Object.values(srs)) {
    if (entry.lapses <= 0) continue;
    const touchedAt = entry.reviewedAt ?? entry.createdAt;
    if (touchedAt < now - 1000 * 60 * 60 * 24 * 14) continue;
    const focus = focusFromRef(`${entry.type}:${entry.itemId}`);
    if (!focus) continue;
    const key = `${entry.type}:${entry.itemId}`;
    if (allowedKeys.size > 0 && !allowedKeys.has(key) && !allowedKeys.has(focus.key)) continue;
    addFocusItem(items, { ...focus, pool: "weak" }, "weak");
  }
  return items.sort((a, b) => srsLapsesForFocus(srs, b) - srsLapsesForFocus(srs, a));
}

export function buildModuleReviewPools(unitId: string, context: ModuleReviewContext = {}): ModuleReviewPools {
  const unit = findUnitById(unitId);
  const completed = new Set(context.completedLessons ?? []);
  const current = unit ? resolveModuleFocusItems(unit) : [];
  const prior = priorModuleItems(unitId, completed);
  const errors = errorFocusItems(context.recentErrors);
  const allowed = new Set([...current, ...prior].map((item) => item.key));
  const weak = weakSrsFocusItems(context.srs, allowed);
  return { current, prior, weak, errors };
}

function pickRotating(source: ModuleReviewFocusItem[], count: number, offset: number): ModuleReviewFocusItem[] {
  if (!source.length || count <= 0) return [];
  const result: ModuleReviewFocusItem[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(source[(offset + i) % source.length]);
  }
  return result;
}

/** 50% módulo atual · 25% revisão antiga · 25% erros/fracos. */
export function buildWeightedModuleReviewFocus(unitId: string, context: ModuleReviewContext = {}, slots = 20): ModuleReviewFocusItem[] {
  const pools = buildModuleReviewPools(unitId, context);
  const remediation = [...pools.errors, ...pools.weak];
  const currentCount = Math.max(1, Math.round(slots * 0.5));
  const priorCount = Math.max(1, Math.round(slots * 0.25));
  const weakCount = Math.max(remediation.length > 0 ? 1 : 0, slots - currentCount - priorCount);

  const ordered = [
    ...pickRotating(pools.current, currentCount, 0),
    ...pickRotating(pools.prior, priorCount, 0),
    ...pickRotating(remediation, weakCount, 0),
  ];

  const seen = new Set<string>();
  const unique: ModuleReviewFocusItem[] = [];
  for (const item of ordered) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    unique.push(item);
  }
  for (const item of [...pools.current, ...pools.prior, ...remediation]) {
    if (unique.length >= slots) break;
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    unique.push(item);
  }
  return unique;
}

function stepHanziBlob(step: ReviewPlanStep): string {
  return normalizeHanzi(
    [
      step.hanzi,
      step.text,
      step.audioText,
      step.correctAnswer,
      step.answer,
      ...(step.target ?? []),
      ...(step.lines?.map((line) => line.hanzi) ?? []),
    ]
      .filter(Boolean)
      .join("")
  );
}

function planUsesFocus(plan: readonly ReviewPlanStep[], items: ModuleReviewFocusItem[]): boolean {
  if (!items.length) return true;
  return plan.some((step) => {
    const blob = stepHanziBlob(step);
    return items.some((item) => {
      const hanzi = normalizeHanzi(item.hanzi);
      return hanzi.length > 0 && blob.includes(hanzi);
    });
  });
}

export function validateModuleReviewCoverage(
  unitId: string,
  plan: readonly ReviewPlanStep[],
  context: ModuleReviewContext = {}
): ModuleReviewCoverageIssue[] {
  const unit = findUnitById(unitId);
  if (!unit) return [{ unitId, unitTitle: unitId, message: "Módulo não encontrado." }];

  const pools = buildModuleReviewPools(unitId, context);
  const issues: ModuleReviewCoverageIssue[] = [];
  const push = (message: string) => issues.push({ unitId, unitTitle: unit.title, message });

  const hanziItems = pools.current.filter((item) => item.type === "char" || normalizeHanzi(item.hanzi).length === 1);
  const phraseItems = pools.current.filter((item) => normalizeHanzi(item.hanzi).length > 1);

  if (hanziItems.length > 0 && !planUsesFocus(plan, hanziItems)) push("Revisão não cobre hànzì do módulo.");
  if (phraseItems.length > 0 && !planUsesFocus(plan, phraseItems)) push("Revisão não cobre frases/chunks do módulo.");
  if (!plan.some((step) => AUDIO_KINDS.has(step.kind))) push("Falta exercício de escuta/som.");
  if (!plan.some((step) => PINYIN_KINDS.has(step.kind))) push("Falta exercício de pinyin/tom.");
  if (!plan.some((step) => MEANING_KINDS.has(step.kind))) push("Falta exercício de significado.");
  if (hanziItems.length > 0 && !plan.some((step) => HANZI_KINDS.has(step.kind))) push("Falta exercício de hànzì.");
  if (phraseItems.length > 0 && !plan.some((step) => PHRASE_KINDS.has(step.kind))) push("Falta exercício de frase/contexto.");
  if (pools.errors.length > 0 && !planUsesFocus(plan, pools.errors)) push("Falta reforço de erro recente do módulo.");

  const unitIndex = unitOrderIndex(unitId);
  for (const phrase of PROGRESSIVE_PHRASE_REFS) {
    if (phrase.afterUnitIndex > unitIndex) {
      const item = focusFromRef(phrase.ref);
      if (item && planUsesFocus(plan, [item])) {
        push(`Item avançado "${item.hanzi}" aparece antes de ser ensinado.`);
      }
    }
  }

  return issues;
}

export function moduleFocusItemKeys(unitId: string): Set<string> {
  const unit = findUnitById(unitId);
  if (!unit) return new Set();
  return new Set(resolveModuleFocusItems(unit).map((item) => item.key));
}

export function srsItemMatchesModule(item: SRSItem, unitId: string, completedLessons: string[]): boolean {
  const keys = moduleFocusItemKeys(unitId);
  const itemKey = `${item.type}:${item.itemId}`;
  if (keys.has(itemKey)) return true;
  const lesson = ALL_LESSONS.find((entry) => entry.unitId === unitId && (entry.libraryItems ?? []).includes(itemKey));
  if (lesson && completedLessons.includes(lesson.id)) return true;
  return false;
}

export interface ReviewSessionInsight {
  strengths: { label: string; count: number }[];
  weaknesses: { label: string; count: number }[];
  returning: string[];
  nextFocus: string;
}

const DOMAIN_LABELS: Record<ReviewDomain, string> = {
  som: "Escuta e tons",
  fala: "Fala",
  significado: "Significado",
  forma: "Forma do hànzì",
  uso: "Uso em frase",
  pinyin: "Pinyin",
  leitura: "Leitura",
};

export function buildReviewSessionInsight(
  grades: { domain: ReviewDomain; correct: boolean; label: string }[],
  returningItems: string[]
): ReviewSessionInsight {
  const correctDomains = grades.filter((entry) => entry.correct).map((entry) => DOMAIN_LABELS[entry.domain] ?? entry.domain);
  const wrongDomains = grades.filter((entry) => !entry.correct).map((entry) => DOMAIN_LABELS[entry.domain] ?? entry.domain);
  const strengths = topCounts(correctDomains, 3);
  const weaknesses = topCounts(wrongDomains, 3);
  const nextFocus = weaknesses[0]?.label ?? strengths[0]?.label ?? "Revisar o módulo atual";
  return {
    strengths,
    weaknesses,
    returning: returningItems.slice(0, 6),
    nextFocus,
  };
}

function topCounts(values: string[], limit: number): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}
