# RC2.3.4 — Hànzì system audit

Generated: 2026-10-03T01:34:35.947Z

## Coverage

- charactersTotal: 175
- builderSupported: 19
- handwritingReferenceVerified: 11
- traceSupported: 11
- memoryWriteSupported: 11
- dataRequired (builder without HW ref): 8
- curriculumLeaks: 0

## Builder geometry policy

`BUILDER_GEOMETRY_NOT_GRADING_SOURCE` — builder SVG paths are didactic approximations and MUST NOT grade handwriting.

## Verified handwriting set

人 口 木 日 月 山 水 火 大 小 中

## Sample rows

| char | builder | HW status | visualPrep | journey |
|---|---|---|---|---|
| 我 | true | UNAVAILABLE | false | — |
| 大 | true | VERIFIED | false | — |
| 小 | true | VERIFIED | false | — |
| 人 | true | VERIFIED | true | p1-primeiros-hanzi |
| 中 | true | VERIFIED | false | — |
| 你 | true | UNAVAILABLE | false | — |
| 好 | true | UNAVAILABLE | false | — |
| 木 | true | VERIFIED | true | p1-primeiros-hanzi |
| 水 | true | VERIFIED | true | — |
| 火 | true | VERIFIED | true | — |
| 山 | true | VERIFIED | true | — |
| 口 | true | VERIFIED | true | p1-primeiros-hanzi |
| 日 | true | VERIFIED | true | p1-primeiros-hanzi |
| 月 | true | VERIFIED | true | — |
| 休 | true | UNAVAILABLE | false | — |
| 林 | true | UNAVAILABLE | false | — |
| 明 | true | UNAVAILABLE | false | — |
| 森 | true | UNAVAILABLE | false | — |
| 文 | true | UNAVAILABLE | false | — |
