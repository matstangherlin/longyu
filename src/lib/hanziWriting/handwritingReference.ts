/**
 * RC2.3.4 — handwriting reference registry.
 * BUILDER_GEOMETRY must never be used as grading truth.
 */

import {
  BUILDER_GEOMETRY_NOT_GRADING_SOURCE,
  HANDWRITING_DATA_REQUIRED,
  HANDWRITING_REFERENCE_REQUIRED,
  HANDWRITING_REFERENCE_VERIFIED,
  STROKE_ORDER_DATA_MISSING,
} from "./gates";
import {
  VERIFIED_HANDWRITING_BY_CHAR,
  VERIFIED_HANDWRITING_BY_ID,
  VERIFIED_HANDWRITING_WAVE1,
} from "./references/verifiedWave1";
import type { HanziHandwritingReference, HandwritingValidationStatus } from "./types";

export {
  VERIFIED_HANDWRITING_WAVE1,
  VERIFIED_HANDWRITING_BY_CHAR,
  VERIFIED_HANDWRITING_BY_ID,
};

export function handwritingReferenceFor(character: string): HanziHandwritingReference | null {
  return VERIFIED_HANDWRITING_BY_CHAR.get(character) ?? null;
}

export function handwritingReferenceForId(charId: string): HanziHandwritingReference | null {
  return VERIFIED_HANDWRITING_BY_ID.get(charId) ?? null;
}

export function handwritingStatusFor(character: string): HandwritingValidationStatus {
  const ref = handwritingReferenceFor(character);
  return ref?.status ?? "UNAVAILABLE";
}

export function isHandwritingReferenceVerified(character: string): boolean {
  return handwritingStatusFor(character) === "VERIFIED";
}

/**
 * Graded MEMORY_WRITE requires VERIFIED reference.
 * TRACE may use VERIFIED; PARTIAL only for formative (non-graded) demos.
 */
export function canGradeMemoryWrite(character: string): boolean {
  return isHandwritingReferenceVerified(character);
}

export function canOfferTrace(character: string): boolean {
  const status = handwritingStatusFor(character);
  return status === "VERIFIED" || status === "PARTIAL";
}

export function handwritingBlockReason(character: string): string {
  const ref = handwritingReferenceFor(character);
  if (!ref) return HANDWRITING_DATA_REQUIRED;
  if (ref.status === "UNAVAILABLE") return STROKE_ORDER_DATA_MISSING;
  if (ref.status === "PARTIAL") return HANDWRITING_REFERENCE_REQUIRED;
  return HANDWRITING_REFERENCE_VERIFIED;
}

/** Hard rule documentation for audits / QA. */
export function gradingSourcePolicy(): {
  gradingSource: "HANDWRITING_REFERENCE";
  builderGeometry: typeof BUILDER_GEOMETRY_NOT_GRADING_SOURCE;
  note: string;
} {
  return {
    gradingSource: "HANDWRITING_REFERENCE",
    builderGeometry: BUILDER_GEOMETRY_NOT_GRADING_SOURCE,
    note: "HanziBuilder SVG paths are didactic approximations and MUST NOT grade handwriting.",
  };
}

export function listVerifiedHandwritingCharacters(): string[] {
  return VERIFIED_HANDWRITING_WAVE1.map((r) => r.character);
}

export function listVerifiedHandwritingCharIds(): string[] {
  return VERIFIED_HANDWRITING_WAVE1.map((r) => r.charId);
}
