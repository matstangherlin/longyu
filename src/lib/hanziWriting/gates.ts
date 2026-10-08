/**
 * RC2.3.4 — Hànzì Progressive Writing gate codes.
 * Data / curriculum integrity only — never shown as student-facing strings.
 */

export const HANDWRITING_REFERENCE_REQUIRED = "HANDWRITING_REFERENCE_REQUIRED" as const;
export const HANDWRITING_REFERENCE_VERIFIED = "HANDWRITING_REFERENCE_VERIFIED" as const;
export const BUILDER_GEOMETRY_NOT_GRADING_SOURCE = "BUILDER_GEOMETRY_NOT_GRADING_SOURCE" as const;
export const STROKE_ORDER_DATA_MISSING = "STROKE_ORDER_DATA_MISSING" as const;
export const HANDWRITING_CURRICULUM_LEAK = "HANDWRITING_CURRICULUM_LEAK" as const;
export const HANDWRITING_DATA_REQUIRED = "HANDWRITING_DATA_REQUIRED" as const;
/** RC2.3.4A — taught + verified, but memory/production before recorded progression. */
export const HANDWRITING_PROGRESSION_REQUIRED = "HANDWRITING_PROGRESSION_REQUIRED" as const;

/** Explicit separation: builder SVG paths are didactic approximations only. */
export const GEOMETRY_SOURCE = {
  BUILDER_GEOMETRY: "BUILDER_GEOMETRY",
  HANDWRITING_REFERENCE: "HANDWRITING_REFERENCE",
} as const;

export type GeometrySource = (typeof GEOMETRY_SOURCE)[keyof typeof GEOMETRY_SOURCE];

export const HANZI_WRITING_GATE_CODES = [
  HANDWRITING_REFERENCE_REQUIRED,
  HANDWRITING_REFERENCE_VERIFIED,
  BUILDER_GEOMETRY_NOT_GRADING_SOURCE,
  STROKE_ORDER_DATA_MISSING,
  HANDWRITING_CURRICULUM_LEAK,
  HANDWRITING_DATA_REQUIRED,
  HANDWRITING_PROGRESSION_REQUIRED,
] as const;

export type HanziWritingGateCode = (typeof HANZI_WRITING_GATE_CODES)[number];
