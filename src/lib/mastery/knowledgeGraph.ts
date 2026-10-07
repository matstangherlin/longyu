/**
 * RC2.3.6 — Knowledge Graph Foundation.
 *
 * A deterministic registry of what the Journey teaches (targets) and how those
 * things relate. Built from authored data only — no graph database, no
 * embeddings, no model. Every target carries its curriculum position
 * (`introducedAt`) so nothing downstream can recommend what was not taught.
 *
 * Canonicalisation: 水 (HANZI), shui3 (SYLLABLE) and "água" (meaning alias)
 * are RELATED, never the same target.
 */
import { CHARACTERS } from "../../data/characters";
import { RADICALS } from "../../data/radicals";
import { chunkById } from "../../data/chunks";
import { ALL_LESSONS, type LessonStep } from "../../data/journey";
import { PRONUNCIATION_CORE_BR } from "../../data/pronunciationCoreBr";
import { contrastLibrary } from "../audioContrastPairs";
import { introducedCharIdsForStep } from "../hanziWriting/introductions";
import { inferEverydayIntentFromText, intentIsCommunicative, type EverydayIntent } from "../everydayMandarin/intents";
import { conceptIdForItem } from "../cultureMastery";
import { targetId as tid } from "./adapters";
import type { KnowledgeTargetType } from "./evidence";

export const RELATION_TYPES = [
  "contains",
  "pronounced_as",
  "uses_tone",
  "composed_of",
  "appears_in",
  "expresses_intent",
  "used_in_scenario",
  "culture_related",
  "prerequisite_of",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export interface KnowledgeTarget {
  id: string;
  type: KnowledgeTargetType;
  /** Display text (hànzì, pinyin, intent label…). */
  label: string;
  /** Short PT gloss when one exists (never used as identity). */
  glossPt?: string;
  /** Journey lesson that first teaches it; null = not in the Journey. */
  introducedAt: { lessonId: string; lessonIndex: number } | null;
  /** Where it is available besides the Journey. */
  availability: "JOURNEY" | "PINYIN_LAB" | "NOT_TAUGHT";
}

export interface KnowledgeRelation {
  from: string;
  to: string;
  type: RelationType;
}

export interface KnowledgeGraph {
  targets: Map<string, KnowledgeTarget>;
  relations: KnowledgeRelation[];
  /** alias → { id, kind } (IDENTICAL = same target, RELATED = linked target). */
  aliases: Map<string, { id: string; kind: "IDENTICAL" | "RELATED" }[]>;
  lessonIndexById: Map<string, number>;
}

const HAN = /\p{Script=Han}/u;
const hanOnly = (s: string) => [...s].filter((c) => HAN.test(c)).join("");

function stepTexts(step: LessonStep): string[] {
  const out: string[] = [];
  for (const v of [step.targetHanzi, step.hanzi, step.correctAnswer, step.answer, step.blankAnswer]) {
    if (typeof v === "string" && HAN.test(v)) out.push(hanOnly(v));
  }
  return out.filter((t) => t.length > 0 && t.length <= 8);
}

/**
 * Same intent the Everyday runtime attaches to the step (authored metadata
 * first, the RC2.3.2 text inference as fallback). Only communicative intents
 * that are the step's TARGET become graph targets.
 */
function stepIntent(step: LessonStep): EverydayIntent | null {
  if (step.everydayIntent) {
    const authored = step.everydayIntent as EverydayIntent;
    return intentIsCommunicative(authored) && step.contextRole !== "SCAFFOLD" ? authored : null;
  }
  const blob = [step.dialoguePrompt, step.promptPt, step.prompt, step.title, step.body, step.hanzi, step.correctAnswer].filter(Boolean).join(" ");
  if (!blob) return null;
  const meta = inferEverydayIntentFromText(blob);
  return intentIsCommunicative(meta.everydayIntent) && meta.contextRole === "TARGET" ? meta.everydayIntent : null;
}

export function buildKnowledgeGraph(): KnowledgeGraph {
  const targets = new Map<string, KnowledgeTarget>();
  const relations: KnowledgeRelation[] = [];
  const relKeys = new Set<string>();
  const aliases = new Map<string, { id: string; kind: "IDENTICAL" | "RELATED" }[]>();
  const lessonIndexById = new Map<string, number>();
  const charByGlyph = new Map(CHARACTERS.map((c) => [c.hanzi, c]));
  const charById = new Map(CHARACTERS.map((c) => [c.id, c]));
  const radicalById = new Map(RADICALS.map((r) => [r.id, r]));

  const addTarget = (t: KnowledgeTarget) => {
    const prev = targets.get(t.id);
    if (!prev) targets.set(t.id, t);
    else if (t.introducedAt && (!prev.introducedAt || t.introducedAt.lessonIndex < prev.introducedAt.lessonIndex)) {
      targets.set(t.id, { ...prev, introducedAt: t.introducedAt, availability: "JOURNEY" });
    }
  };
  const rel = (from: string, to: string, type: RelationType) => {
    if (from === to) return;
    const key = `${from}>${type}>${to}`;
    if (relKeys.has(key)) return;
    relKeys.add(key);
    relations.push({ from, to, type });
  };
  const alias = (text: string, id: string, kind: "IDENTICAL" | "RELATED") => {
    const k = text.trim().toLowerCase();
    if (!k) return;
    const list = aliases.get(k) ?? [];
    if (!list.some((a) => a.id === id)) list.push({ id, kind });
    aliases.set(k, list);
  };

  const addHanzi = (glyph: string, at: KnowledgeTarget["introducedAt"]) => {
    const char = charByGlyph.get(glyph);
    const id = tid.hanzi(glyph);
    addTarget({ id, type: "HANZI", label: glyph, glossPt: char?.meaningPt, introducedAt: at, availability: at ? "JOURNEY" : "NOT_TAUGHT" });
    alias(glyph, id, "IDENTICAL");
    if (!char) return id;
    if (char.meaningPt) alias(char.meaningPt.split(/[,;(]/)[0], id, "RELATED");
    const tone = char.tone === 5 ? 5 : char.tone;
    const sylId = tid.syllable(char.toneless, tone);
    addTarget({ id: sylId, type: "SYLLABLE", label: char.pinyin, introducedAt: at, availability: at ? "JOURNEY" : "NOT_TAUGHT" });
    alias(`${char.toneless}${tone}`, sylId, "IDENTICAL");
    alias(char.pinyin, sylId, "IDENTICAL");
    rel(id, sylId, "pronounced_as");
    if (tone >= 1 && tone <= 4) {
      const toneId = tid.tone(tone);
      addTarget({ id: toneId, type: "TONE", label: `${tone}º tom`, introducedAt: at, availability: at ? "JOURNEY" : "NOT_TAUGHT" });
      rel(sylId, toneId, "uses_tone");
    }
    for (const compId of char.components ?? []) {
      const r = radicalById.get(compId);
      if (!r) continue;
      const cid = tid.component(compId);
      addTarget({ id: cid, type: "COMPONENT", label: r.glyph, glossPt: r.meaningPt, introducedAt: at, availability: at ? "JOURNEY" : "NOT_TAUGHT" });
      rel(id, cid, "composed_of");
      rel(cid, id, "prerequisite_of");
    }
    return id;
  };

  const addWord = (text: string, at: KnowledgeTarget["introducedAt"], chunkId?: string) => {
    const id = chunkId ? tid.chunk(chunkId) : tid.word(text);
    const chunk = chunkId ? chunkById[chunkId] : undefined;
    addTarget({ id, type: chunkId ? "CHUNK" : [...text].length > 4 ? "CHUNK" : "WORD", label: chunk?.hanzi ?? text, glossPt: chunk?.meaningPt, introducedAt: at, availability: at ? "JOURNEY" : "NOT_TAUGHT" });
    alias(chunk?.hanzi ?? text, id, "IDENTICAL");
    for (const g of [...hanOnly(chunk?.hanzi ?? text)]) {
      const hid = addHanzi(g, at);
      rel(id, hid, "contains");
      rel(hid, id, "prerequisite_of");
    }
    return id;
  };

  ALL_LESSONS.forEach((lesson, lessonIndex) => {
    lessonIndexById.set(lesson.id, lessonIndex);
    const at = { lessonId: lesson.id, lessonIndex };
    const lessonWords: string[] = [];
    const lessonIntents: string[] = [];
    const lessonScenes: string[] = [];

    for (const charId of lesson.steps.flatMap((s) => introducedCharIdsForStep(s))) {
      const c = charById.get(charId);
      if (c) addHanzi(c.hanzi, at);
    }
    for (const g of lesson.newHanzi ?? []) for (const ch of [...hanOnly(g)]) addHanzi(ch, at);

    for (const step of lesson.steps) {
      const words: string[] = [];
      if (step.chunkId && chunkById[step.chunkId]) words.push(addWord(chunkById[step.chunkId].hanzi, at, step.chunkId));
      for (const text of stepTexts(step)) words.push([...text].length === 1 ? addHanzi(text, at) : addWord(text, at));
      lessonWords.push(...words);
      const intent = stepIntent(step);
      if (intent) {
        const iid = tid.intent(intent);
        addTarget({ id: iid, type: "COMMUNICATIVE_INTENT", label: intent, introducedAt: at, availability: "JOURNEY" });
        lessonIntents.push(iid);
        for (const w of words) rel(w, iid, "expresses_intent");
      }
      if (step.kind === "conversation_scene" && step.sceneId) {
        const sid = tid.scenario(step.sceneId);
        addTarget({ id: sid, type: "SCENARIO", label: step.sceneId, introducedAt: at, availability: "JOURNEY" });
        lessonScenes.push(sid);
      }
    }
    for (const sid of lessonScenes) {
      for (const w of lessonWords) rel(w, sid, "appears_in");
      for (const i of lessonIntents) rel(i, sid, "used_in_scenario");
    }
    const conceptIds = [...(lesson.cultureConceptIds ?? []), ...(lesson.cultureItemId ? [conceptIdForItem(lesson.cultureItemId)] : [])];
    for (const conceptId of conceptIds) {
      const cid = tid.culture(conceptId);
      addTarget({ id: cid, type: "CULTURE_CONCEPT", label: conceptId, introducedAt: at, availability: "JOURNEY" });
      for (const i of lessonIntents) rel(cid, i, "culture_related");
      for (const s of lessonScenes) rel(cid, s, "culture_related");
      if (lessonIntents.length === 0 && lessonScenes.length === 0 && lessonWords[0]) rel(cid, lessonWords[0], "culture_related");
    }
  });

  // Pronunciation contrasts — library V2 (Journey-backed) and Pinyin Lab core.
  for (const entry of contrastLibrary().accepted) {
    const a = targets.get(tid.hanzi(entry.a.hanzi));
    const b = targets.get(tid.hanzi(entry.b.hanzi));
    const both = a?.introducedAt && b?.introducedAt ? (a.introducedAt.lessonIndex >= b.introducedAt.lessonIndex ? a.introducedAt : b.introducedAt) : null;
    const taught = entry.curriculumBacked && !entry.discoveryOnly ? both : null;
    addTarget({ id: entry.id, type: "PRONUNCIATION_CONTRAST", label: `${entry.a.pinyin} × ${entry.b.pinyin}`, glossPt: entry.family, introducedAt: taught, availability: taught ? "JOURNEY" : "NOT_TAUGHT" });
    for (const side of [entry.a, entry.b]) {
      const hid = tid.hanzi(side.hanzi);
      if (targets.has(hid)) rel(entry.id, hid, "contains");
    }
    if (entry.kind === "tone") for (const t of [entry.a.tone, entry.b.tone]) if (t >= 1 && t <= 4) rel(tid.tone(t), entry.id, "prerequisite_of");
  }
  for (const c of PRONUNCIATION_CORE_BR) {
    const id = tid.contrast(c.id);
    addTarget({ id, type: "PRONUNCIATION_CONTRAST", label: c.title, introducedAt: null, availability: "PINYIN_LAB" });
  }

  return { targets, relations, aliases, lessonIndexById };
}

let cached: KnowledgeGraph | null = null;
export function knowledgeGraph(): KnowledgeGraph {
  cached ??= buildKnowledgeGraph();
  return cached;
}

/** Resolve free text (hànzì, pinyin, gloss) to targets, marking identical vs related. */
export function resolveAlias(text: string, graph: KnowledgeGraph = knowledgeGraph()): { id: string; kind: "IDENTICAL" | "RELATED" }[] {
  return graph.aliases.get(text.trim().toLowerCase()) ?? [];
}

/**
 * Curriculum gate: a target may be recommended only when the learner has
 * completed the lesson that introduces it (or it lives in the Pinyin Lab and
 * the learner has already worked on it there).
 */
export function isTargetTaught(
  target: KnowledgeTarget | undefined,
  completedLessons: ReadonlySet<string>,
  opts: { labTargetsMet?: ReadonlySet<string> } = {}
): boolean {
  if (!target) return false;
  if (target.availability === "PINYIN_LAB") return opts.labTargetsMet?.has(target.id) ?? false;
  return !!target.introducedAt && completedLessons.has(target.introducedAt.lessonId);
}

// ---------------------------------------------------------------------------
// Audit (orphans, duplicate aliases, missing prerequisites, cycles, leaks)
// ---------------------------------------------------------------------------

export interface GraphAudit {
  targets: number;
  relations: number;
  byType: Record<string, number>;
  byRelation: Record<string, number>;
  journeyTargets: number;
  notTaughtTargets: number;
  labTargets: number;
  orphans: string[];
  duplicateIdenticalAliases: { alias: string; ids: string[] }[];
  danglingRelations: KnowledgeRelation[];
  missingPrerequisites: string[];
  prerequisiteCycles: string[][];
  /** prerequisite_of edges whose source is introduced AFTER its dependant. */
  prerequisiteOrderViolations: KnowledgeRelation[];
}

export function findPrerequisiteCycles(relations: readonly KnowledgeRelation[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const r of relations) if (r.type === "prerequisite_of") (adj.get(r.from) ?? adj.set(r.from, []).get(r.from)!).push(r.to);
  const state = new Map<string, 1 | 2>();
  const cycles: string[][] = [];
  const stack: string[] = [];
  const visit = (n: string) => {
    state.set(n, 1);
    stack.push(n);
    for (const m of adj.get(n) ?? []) {
      if (state.get(m) === 1) cycles.push([...stack.slice(stack.indexOf(m)), m]);
      else if (!state.has(m)) visit(m);
    }
    stack.pop();
    state.set(n, 2);
  };
  for (const n of adj.keys()) if (!state.has(n)) visit(n);
  return cycles;
}

export function auditKnowledgeGraph(graph: KnowledgeGraph = knowledgeGraph()): GraphAudit {
  const byType: Record<string, number> = {};
  for (const t of graph.targets.values()) byType[t.type] = (byType[t.type] ?? 0) + 1;
  const byRelation: Record<string, number> = {};
  const linked = new Set<string>();
  const dangling: KnowledgeRelation[] = [];
  for (const r of graph.relations) {
    byRelation[r.type] = (byRelation[r.type] ?? 0) + 1;
    linked.add(r.from);
    linked.add(r.to);
    if (!graph.targets.has(r.from) || !graph.targets.has(r.to)) dangling.push(r);
  }
  // Orphans: targets with no relation at all (intents/scenes/culture can legitimately be leaves only if linked).
  const orphans = [...graph.targets.values()].filter((t) => !linked.has(t.id) && t.type !== "PRONUNCIATION_CONTRAST" && t.type !== "TONE").map((t) => t.id);
  const duplicateIdenticalAliases = [...graph.aliases.entries()]
    .map(([alias, list]) => ({ alias, ids: list.filter((a) => a.kind === "IDENTICAL").map((a) => a.id) }))
    .filter((d) => d.ids.length > 1 && new Set(d.ids.map((i) => i.split(":")[0])).size < d.ids.length);
  // Words must have their hànzì as prerequisites.
  const prereqTo = new Set(graph.relations.filter((r) => r.type === "prerequisite_of").map((r) => r.to));
  const missingPrerequisites = [...graph.targets.values()].filter((t) => (t.type === "WORD" || t.type === "CHUNK") && !prereqTo.has(t.id)).map((t) => t.id);
  const prerequisiteOrderViolations = graph.relations.filter((r) => {
    if (r.type !== "prerequisite_of") return false;
    const a = graph.targets.get(r.from)?.introducedAt;
    const b = graph.targets.get(r.to)?.introducedAt;
    return !!b && (!a || a.lessonIndex > b.lessonIndex);
  });
  const all = [...graph.targets.values()];
  return {
    targets: graph.targets.size,
    relations: graph.relations.length,
    byType,
    byRelation,
    journeyTargets: all.filter((t) => t.availability === "JOURNEY").length,
    notTaughtTargets: all.filter((t) => t.availability === "NOT_TAUGHT").length,
    labTargets: all.filter((t) => t.availability === "PINYIN_LAB").length,
    orphans,
    duplicateIdenticalAliases,
    danglingRelations: dangling,
    missingPrerequisites,
    prerequisiteCycles: findPrerequisiteCycles(graph.relations),
    prerequisiteOrderViolations,
  };
}
