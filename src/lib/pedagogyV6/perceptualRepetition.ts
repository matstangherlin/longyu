/**
 * RC2.3.0 — repetição perceptiva (o que o aluno VÊ), além da semântica.
 *
 * Evita sequências como: 你好 escolha → 你好 escolha → 你好 ouça → 你好 escolha
 * mesmo quando IDs/operações internas diferem ligeiramente.
 */
import {
  cognitiveOperationFor,
  classifyRepetitions,
  repetitionReport,
  type CognitiveOperation,
  type RepetitionItem,
  type RepetitionReport,
} from "../semanticRepetition";
import type { LessonStep } from "../../data/journey";

export type InteractionFamily =
  | "choice"
  | "listen"
  | "build"
  | "match"
  | "produce"
  | "conversation"
  | "visual"
  | "tone"
  | "intro"
  | "other";

export interface PerceptualItem {
  semanticTargetKey: string;
  cognitiveOperation: CognitiveOperation;
  interactionFamily: InteractionFamily;
  presentationKey: string;
  /** RC2.3.2 — TARGET_REPEAT vs CONTEXTUAL_REUSE. */
  targetRole?: "TARGET" | "CONTEXTUAL_REUSE" | "OTHER";
  remediation?: boolean;
  index: number;
}

/** Família de interação perceptível (UI), não só o kind interno. */
export function interactionFamilyFor(kind: string): InteractionFamily {
  if (/^intro$/.test(kind)) return "intro";
  if (/image_choice|compare_with_image|place_label/.test(kind)) return "visual";
  if (/listen|audio_discrimination|dictation|audio_to_action/.test(kind)) return "listen";
  if (/tone|tone_pair/.test(kind)) return "tone";
  if (/match_pairs/.test(kind)) return "match";
  if (/build|hanzi_build|fill_blank|sentence_transform|substitution/.test(kind)) return "build";
  if (/produc|write|free_production|reverse_recall|dictation/.test(kind)) return "produce";
  if (/conversation|dialogue/.test(kind)) return "conversation";
  if (/comprehend|recognize|odd_one_out|spot_error|contextual_choice|flashcard/.test(kind)) return "choice";
  return "other";
}

export function semanticTargetOfStep(step: LessonStep): string {
  const candidates = [
    step.targetHanzi,
    step.hanzi,
    step.correctAnswer,
    step.answer,
    step.audioText,
    step.text,
  ];
  for (const raw of candidates) {
    if (raw == null) continue;
    const s = String(raw).replace(/\s+/g, "").trim();
    if (!s) continue;
    // Prefer linguistic material; skip long Portuguese prompts used as titles.
    if (/[\u4e00-\u9fff]/.test(s) || /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/.test(s)) {
      return s.slice(0, 32);
    }
    if (s.length <= 12) return s.slice(0, 32);
  }
  const title = String(step.title ?? step.promptPt ?? step.kind).replace(/\s+/g, "");
  if (title.length <= 16) return title.slice(0, 32);
  return String(step.kind);
}

export function presentationKeyOfStep(step: LessonStep): string {
  const family = interactionFamilyFor(step.kind);
  const target = semanticTargetOfStep(step);
  const visual = step.visualConceptId || step.imageId || step.correctImageId || "";
  const role = step.contextRole === "CONTEXTUAL_REUSE" ? "reuse" : "target";
  return `${family}|${target}|${step.kind}|${visual}|${role}`;
}

export function perceptualItemFromStep(step: LessonStep, index: number): PerceptualItem {
  return {
    semanticTargetKey: semanticTargetOfStep(step),
    cognitiveOperation: cognitiveOperationFor(step.kind),
    interactionFamily: interactionFamilyFor(step.kind),
    presentationKey: presentationKeyOfStep(step),
    targetRole:
      step.contextRole === "CONTEXTUAL_REUSE"
        ? "CONTEXTUAL_REUSE"
        : step.contextRole === "TARGET"
          ? "TARGET"
          : "OTHER",
    remediation: step.pedagogyRole === "remediation",
    index,
  };
}

export interface SaturationScore {
  targetDominance: number;
  interactionDominance: number;
  presentationDominance: number;
  semanticRedundancy: number;
  dominantTarget: string | null;
  dominantFamily: InteractionFamily | null;
  warning: boolean;
  report: RepetitionReport;
}

const MAX_SAME_FAMILY_STREAK = 2;
const MAX_TARGET_NEAR = 2;

export function saturationScore(items: readonly PerceptualItem[]): SaturationScore {
  const asRep: RepetitionItem[] = items.map((item) => ({
    semanticTargetKey: item.semanticTargetKey,
    cognitiveOperation: item.cognitiveOperation,
    interactionFamily: item.interactionFamily,
    contextKey: item.presentationKey,
    remediation: item.remediation,
  }));
  const report = repetitionReport(asRep, { round: true });
  const practice = items.filter((i) => i.cognitiveOperation !== "TEACH");
  const n = Math.max(1, practice.length);

  const targetCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  const presentationCounts = new Map<string, number>();
  for (const item of practice) {
    // CONTEXTUAL_REUSE (你好 como ferramenta) não conta igual a TARGET_REPEAT.
    if (item.targetRole !== "CONTEXTUAL_REUSE") {
      targetCounts.set(item.semanticTargetKey, (targetCounts.get(item.semanticTargetKey) ?? 0) + 1);
    }
    familyCounts.set(item.interactionFamily, (familyCounts.get(item.interactionFamily) ?? 0) + 1);
    presentationCounts.set(item.presentationKey, (presentationCounts.get(item.presentationKey) ?? 0) + 1);
  }

  const topTarget = [...targetCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topFamily = [...familyCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPres = [...presentationCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const targetDominance = topTarget ? topTarget[1] / n : 0;
  const interactionDominance = topFamily ? topFamily[1] / n : 0;
  const presentationDominance = topPres ? topPres[1] / n : 0;
  const semanticRedundancy = report.redundant / n;

  const warning =
    targetDominance > 0.4 ||
    interactionDominance > 0.55 ||
    presentationDominance > 0.35 ||
    !report.clean;

  return {
    targetDominance,
    interactionDominance,
    presentationDominance,
    semanticRedundancy,
    dominantTarget: topTarget?.[0] ?? null,
    dominantFamily: (topFamily?.[0] as InteractionFamily) ?? null,
    warning,
    report,
  };
}

/**
 * Warning pedagógico: labs fonéticos (tom/pinyin) esperam família listen/tone dominante.
 * Nesses casos só alerta por alvo/apresentação/redundância semântica.
 */
export function saturationWarningForLesson(lessonId: string, score: SaturationScore): boolean {
  const phoneticLab = /pinyin|tom|tone|perception|engine-2-lab|fon/.test(lessonId);
  if (phoneticLab && (score.dominantFamily === "listen" || score.dominantFamily === "tone")) {
    return (
      score.targetDominance > 0.45 ||
      score.presentationDominance > 0.35 ||
      score.semanticRedundancy > 0.25 ||
      !score.report.clean
    );
  }
  return score.warning;
}

/** Teto de aparições do mesmo alvo na prática (além de TEACH/discovery). */
function maxTargetAppearances(practiceLen: number): number {
  return Math.max(MAX_TARGET_NEAR, Math.ceil(practiceLen * 0.35));
}

function practiceTargetCount(steps: readonly LessonStep[], target: string): number {
  return steps.filter(
    (s) =>
      cognitiveOperationFor(s.kind) !== "TEACH" &&
      s.pedagogyRole !== "discovery" &&
      s.contextRole !== "CONTEXTUAL_REUSE" &&
      semanticTargetOfStep(s) === target
  ).length;
}

/**
 * Reordena / filtra aparições redundantes perceptíveis.
 * Não inventa conteúdo novo: só diversifica a ordem e remove excesso
 * do mesmo alvo/apresentação quando há alternativas.
 */
export function diversifyPerceptualSession(steps: LessonStep[]): {
  steps: LessonStep[];
  removed: number;
  reordered: boolean;
  scoreBefore: SaturationScore;
  scoreAfter: SaturationScore;
} {
  const beforeItems = steps.map(perceptualItemFromStep);
  const scoreBefore = saturationScore(beforeItems);

  const head = steps.filter((s) => s.pedagogyRole === "discovery");
  const body = steps.filter((s) => s.pedagogyRole !== "discovery");
  const practiceBudget = body.filter((s) => cognitiveOperationFor(s.kind) !== "TEACH").length;
  const targetCap = maxTargetAppearances(practiceBudget);

  const out: LessonStep[] = [...head];
  const targetRecent: string[] = [];
  const familyRecent: InteractionFamily[] = [];
  let removed = 0;
  const deferred: LessonStep[] = [];
  // Teach-before-test: "adiar" só move um passo para DEPOIS. Ele nunca volta
  // para antes de um passo que o precedia no plano autorado — senão uma
  // cobrança sobe para antes do ensino/exposição (ex.: montar 木 antes de
  // "Note a forma de 木", ou escolher 你好 antes da escuta NOTICE de 你好).
  const bodyOrder = new Map<LessonStep, number>(body.map((step, index) => [step, index]));

  for (const step of body) {
    const target = semanticTargetOfStep(step);
    const family = interactionFamilyFor(step.kind);
    const op = cognitiveOperationFor(step.kind);
    if (op === "TEACH") {
      out.push(step);
      continue;
    }

    const sameTargetNear = targetRecent.filter((t) => t === target).length;
    const familyStreak =
      familyRecent.length >= MAX_SAME_FAMILY_STREAK &&
      familyRecent.slice(-MAX_SAME_FAMILY_STREAK).every((f) => f === family);
    const overTargetCap = practiceTargetCount(out, target) >= targetCap;

    if (sameTargetNear >= MAX_TARGET_NEAR || familyStreak || overTargetCap) {
      deferred.push(step);
      continue;
    }
    out.push(step);
    targetRecent.push(target);
    if (targetRecent.length > 4) targetRecent.shift();
    familyRecent.push(family);
    if (familyRecent.length > 4) familyRecent.shift();
  }

  // Reinserir deferred onde quebra saturação; se não couber sem piorar, descarta excesso.
  for (const step of deferred) {
    const target = semanticTargetOfStep(step);
    const family = interactionFamilyFor(step.kind);
    const presentation = presentationKeyOfStep(step);
    const samePresentation = out.filter((s) => presentationKeyOfStep(s) === presentation).length;
    if (samePresentation >= 2 && cognitiveOperationFor(step.kind) !== "TEACH") {
      removed += 1;
      continue;
    }
    if (practiceTargetCount(out, target) >= targetCap) {
      removed += 1;
      continue;
    }
    let inserted = false;
    const originalIndex = bodyOrder.get(step) ?? 0;
    let afterPredecessors = 0;
    out.forEach((placed, position) => {
      const placedIndex = bodyOrder.get(placed);
      if (placedIndex != null && placedIndex < originalIndex) afterPredecessors = position + 1;
    });
    for (let i = Math.max(head.length, 1, afterPredecessors); i <= out.length; i += 1) {
      const prevFamily = i > 0 ? interactionFamilyFor(out[i - 1].kind) : null;
      const nextFamily = i < out.length ? interactionFamilyFor(out[i].kind) : null;
      if (prevFamily === family && nextFamily === family) continue;
      const windowTargets = out.slice(Math.max(0, i - 2), i).map(semanticTargetOfStep);
      if (windowTargets.filter((t) => t === target).length >= MAX_TARGET_NEAR) continue;
      out.splice(i, 0, step);
      inserted = true;
      break;
    }
    if (!inserted) {
      const count = practiceTargetCount(out, target);
      if (count >= targetCap) {
        removed += 1;
      } else {
        out.push(step);
      }
    }
  }

  const scoreAfter = saturationScore(out.map(perceptualItemFromStep));
  const fingerprint = (list: LessonStep[]) =>
    list.map((s) => `${s.kind}:${presentationKeyOfStep(s)}:${s.promptPt ?? s.title ?? ""}`).join("|");
  const reordered = fingerprint(out) !== fingerprint(steps);
  void classifyRepetitions;
  return { steps: out, removed, reordered, scoreBefore, scoreAfter };
}

/** Sequência longa da mesma família (ex.: 4× choice). */
export function interactionFamilyStreaks(steps: readonly LessonStep[]): { family: InteractionFamily; length: number; start: number }[] {
  const streaks: { family: InteractionFamily; length: number; start: number }[] = [];
  let start = 0;
  while (start < steps.length) {
    const family = interactionFamilyFor(steps[start].kind);
    let end = start + 1;
    while (end < steps.length && interactionFamilyFor(steps[end].kind) === family) end += 1;
    const length = end - start;
    if (length > MAX_SAME_FAMILY_STREAK && family !== "intro") {
      streaks.push({ family, length, start });
    }
    start = end;
  }
  return streaks;
}
