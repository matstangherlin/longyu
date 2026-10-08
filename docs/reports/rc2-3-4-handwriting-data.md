# RC2.3.4 — Handwriting data provenance

## Sources

### 1. longyu-authorial-stroke-order-v1 (VERIFIED wave 1)

- Origin: Longyu authorial didactic stroke geometry (normalized 0–100 polylines)
- License: All-rights-reserved — Longyu didactic authorial data
- Version: 1.0.0
- Characters: 人 口 木 日 月 山 水 火 大 小 中
- Validation: mapped to common Mainland modern stroke-order teaching conventions
- NOT derived from: font glyph outlines, HanziBuilder SVG paths, OCR, remote APIs

### 2. HanziBuilder SVG stroke banks (BUILDER_GEOMETRY)

- Origin: `src/data/hanziBuilder.ts`
- Role: didactic puzzle assembly only
- Explicit comment in source: aproximacões didáticas, não caligrafia rigorosa
- Grading: FORBIDDEN (`BUILDER_GEOMETRY_NOT_GRADING_SOURCE`)

### 3. Unavailable characters

Any character without a VERIFIED `HanziHandwritingReference` is marked `HANDWRITING_DATA_REQUIRED` / `UNAVAILABLE`.
Do not invent stroke order from fonts.
