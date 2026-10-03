/**
 * RC2.3.4 — local handwriting geometry evaluation.
 * Known expected character + HANDWRITING_REFERENCE strokes.
 * No OCR. No remote model. No builder SVG comparison.
 */

import type {
  CharacterEvalResult,
  HanziHandwritingReference,
  Point2D,
  StrokeAttemptSample,
  StrokeErrorCategory,
  StrokeEvalResult,
  WritingUiVerdict,
} from "./types";

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(points: readonly Point2D[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += dist(points[i - 1]!, points[i]!);
  return total;
}

function unit(a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function angleDegrees(a: Point2D, b: Point2D): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Distance from point to segment AB. */
function pointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  return dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}

function meanDistanceToPath(sample: readonly Point2D[], reference: readonly Point2D[]): number {
  if (sample.length === 0 || reference.length < 2) return 999;
  let sum = 0;
  for (const p of sample) {
    let best = Infinity;
    for (let i = 1; i < reference.length; i += 1) {
      best = Math.min(best, pointToSegment(p, reference[i - 1]!, reference[i]!));
    }
    sum += best;
  }
  return sum / sample.length;
}

function feedbackFor(
  category: StrokeErrorCategory | null,
  accepted: boolean
): { pt: string; en: string } {
  if (accepted) {
    return { pt: "Boa forma.", en: "Good shape." };
  }
  switch (category) {
    case "STROKE_ORDER":
      return { pt: "Esse traço vem depois. Tente o traço indicado.", en: "That stroke comes later. Try the indicated stroke." };
    case "START_POSITION":
      return { pt: "Boa forma. Tente começar este traço um pouco mais perto do ponto indicado.", en: "Good shape. Start a bit closer to the indicated point." };
    case "END_POSITION":
      return { pt: "Quase. Termine o traço um pouco mais perto do fim indicado.", en: "Almost. End a bit closer to the indicated finish." };
    case "DIRECTION":
      return { pt: "Siga a direção do traço indicado.", en: "Follow the direction of the indicated stroke." };
    case "SHAPE":
      return { pt: "A forma ficou irreconhecível. Observe o guia e tente de novo.", en: "The shape is unrecognizable. Watch the guide and try again." };
    case "MISSING_STROKE":
      return { pt: "Ainda falta um traço.", en: "A stroke is still missing." };
    case "EXTRA_STROKE":
      return { pt: "Sobrou um traço. Use Desfazer se precisar.", en: "There is an extra stroke. Use Undo if needed." };
    default:
      return { pt: "Tente novamente.", en: "Try again." };
  }
}

export function evaluateStrokeAttempt(
  reference: HanziHandwritingReference,
  expectedStrokeIndex: number,
  attempt: StrokeAttemptSample,
  opts?: { enforceOrder?: boolean; previousAccepted?: number }
): StrokeEvalResult {
  const tol = reference.tolerance;
  const expected = reference.strokes[expectedStrokeIndex];
  if (!expected) {
    return {
      accepted: false,
      category: "EXTRA_STROKE",
      confidence: 0.1,
      feedbackPt: feedbackFor("EXTRA_STROKE", false).pt,
      feedbackEn: feedbackFor("EXTRA_STROKE", false).en,
    };
  }
  const pts = attempt.points;
  if (pts.length < 2) {
    return {
      accepted: false,
      category: "SHAPE",
      confidence: 0.05,
      feedbackPt: feedbackFor("SHAPE", false).pt,
      feedbackEn: feedbackFor("SHAPE", false).en,
    };
  }

  const start = pts[0]!;
  const end = pts[pts.length - 1]!;
  const refStart = expected.points[0]!;
  const refEnd = expected.points[expected.points.length - 1]!;

  // Order: if caller passes a mismatched index, treat as STROKE_ORDER when enforceOrder
  if (opts?.enforceOrder && typeof opts.previousAccepted === "number" && expectedStrokeIndex !== opts.previousAccepted) {
    // caller responsibility — keep for API completeness
  }

  const startOk = dist(start, refStart) <= tol.startRadius;
  if (!startOk) {
    const fb = feedbackFor("START_POSITION", false);
    return { accepted: false, category: "START_POSITION", confidence: 0.35, feedbackPt: fb.pt, feedbackEn: fb.en };
  }

  const userDir = unit(start, end);
  const dirDeg = angleDegrees(userDir, expected.direction);
  if (dirDeg > tol.directionDegrees) {
    const fb = feedbackFor("DIRECTION", false);
    return { accepted: false, category: "DIRECTION", confidence: 0.4, feedbackPt: fb.pt, feedbackEn: fb.en };
  }

  const endOk = dist(end, refEnd) <= tol.endRadius;
  if (!endOk) {
    const fb = feedbackFor("END_POSITION", false);
    return { accepted: false, category: "END_POSITION", confidence: 0.45, feedbackPt: fb.pt, feedbackEn: fb.en };
  }

  const userLen = pathLength(pts);
  const refLen = pathLength(expected.points) || 1;
  const ratio = userLen / refLen;
  if (ratio < tol.minLengthRatio || ratio > tol.maxLengthRatio) {
    const fb = feedbackFor("SHAPE", false);
    return { accepted: false, category: "SHAPE", confidence: 0.35, feedbackPt: fb.pt, feedbackEn: fb.en };
  }

  const mean = meanDistanceToPath(pts, expected.points);
  if (mean > tol.shapeMeanDistance) {
    const fb = feedbackFor("SHAPE", false);
    return { accepted: false, category: "SHAPE", confidence: 0.3, feedbackPt: fb.pt, feedbackEn: fb.en };
  }

  const confidence = Math.max(0.55, Math.min(0.98, 1 - mean / (tol.shapeMeanDistance * 2)));
  const fb = feedbackFor(null, true);
  return { accepted: true, category: null, confidence, feedbackPt: fb.pt, feedbackEn: fb.en };
}

/**
 * Evaluate a sequence of user strokes against reference order.
 * Extra strokes after complete → EXTRA_STROKE.
 * Wrong order detected when current stroke matches a later reference better than the next expected.
 */
export function evaluateCharacterAttempt(
  reference: HanziHandwritingReference,
  attempts: readonly StrokeAttemptSample[],
  meta?: { helpUsed?: boolean; undoUsed?: boolean; replayUsed?: boolean }
): CharacterEvalResult {
  const strokeResults: StrokeEvalResult[] = [];
  let orderIssue = false;
  let shapeIssue = false;
  let acceptedCount = 0;

  for (let i = 0; i < attempts.length; i += 1) {
    if (i >= reference.strokes.length) {
      const fb = feedbackFor("EXTRA_STROKE", false);
      strokeResults.push({
        accepted: false,
        category: "EXTRA_STROKE",
        confidence: 0.2,
        feedbackPt: fb.pt,
        feedbackEn: fb.en,
      });
      orderIssue = true;
      continue;
    }

    // Detect clear wrong-order: attempt matches a different remaining stroke much better
    const nextEval = evaluateStrokeAttempt(reference, i, attempts[i]!);
    if (!nextEval.accepted && nextEval.category === "START_POSITION") {
      let betterLater = -1;
      let bestConf = 0;
      for (let j = i + 1; j < reference.strokes.length; j += 1) {
        const alt = evaluateStrokeAttempt(reference, j, attempts[i]!);
        if (alt.accepted && alt.confidence > bestConf) {
          bestConf = alt.confidence;
          betterLater = j;
        }
      }
      if (betterLater > i) {
        const fb = feedbackFor("STROKE_ORDER", false);
        strokeResults.push({
          accepted: false,
          category: "STROKE_ORDER",
          confidence: 0.5,
          feedbackPt: fb.pt,
          feedbackEn: fb.en,
        });
        orderIssue = true;
        continue;
      }
    }

    strokeResults.push(nextEval);
    if (nextEval.accepted) acceptedCount += 1;
    else if (nextEval.category === "STROKE_ORDER") orderIssue = true;
    else if (nextEval.category === "SHAPE" || nextEval.category === "DIRECTION") shapeIssue = true;
  }

  if (attempts.length < reference.strokes.length) {
    const fb = feedbackFor("MISSING_STROKE", false);
    strokeResults.push({
      accepted: false,
      category: "MISSING_STROKE",
      confidence: 0.4,
      feedbackPt: fb.pt,
      feedbackEn: fb.en,
    });
  }

  const complete = acceptedCount === reference.strokes.length && attempts.length === reference.strokes.length;
  const meanConf =
    strokeResults.length === 0
      ? 0
      : strokeResults.reduce((s, r) => s + r.confidence, 0) / strokeResults.length;

  let verdict: WritingUiVerdict = "Tente novamente";
  if (complete && meanConf >= 0.7) verdict = "Ótimo";
  else if (acceptedCount >= Math.max(1, reference.strokes.length - 1) || meanConf >= 0.55) verdict = "Quase";

  return {
    complete,
    verdict,
    confidence: meanConf,
    strokeResults,
    orderIssue,
    shapeIssue,
    helpUsed: Boolean(meta?.helpUsed),
    undoUsed: Boolean(meta?.undoUsed),
    replayUsed: Boolean(meta?.replayUsed),
  };
}

/** Pure helpers exported for unit tests. */
export const __geometryTestUtils = {
  dist,
  pathLength,
  angleDegrees,
  meanDistanceToPath,
  pointToSegment,
};
