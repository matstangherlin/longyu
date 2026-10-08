# RC2.3.6 — Knowledge Graph Foundation

Code: `src/lib/mastery/knowledgeGraph.ts`. Deterministic, built from the authored Journey, `CHARACTERS`, `RADICALS`, `CHUNKS`, contrast library V2 and Pinyin Lab. No graph database, no embeddings, no model. Journey fingerprint unchanged (`5a64821d0b7d`).

## Counts (full curriculum)

| Type | Targets |
|---|---|
| HANZI | 280 |
| CHUNK | 204 |
| WORD | 158 |
| SYLLABLE | 143 |
| PRONUNCIATION_CONTRAST | 79 (68 library V2 + 11 Pinyin Lab) |
| SCENARIO | 47 |
| COMPONENT | 19 |
| COMMUNICATIVE_INTENT | 18 |
| CULTURE_CONCEPT | 14 |
| TONE | 4 |
| **Total** | **966** (931 Journey · 11 Pinyin Lab · 24 not taught) |

| Relation | Count |
|---|---|
| prerequisite_of | 1424 |
| contains | 1372 |
| appears_in | 543 |
| pronounced_as | 154 |
| used_in_scenario | 145 |
| uses_tone | 136 |
| expresses_intent | 136 |
| composed_of | 79 |
| culture_related | 59 |
| **Total** | **4048** |

Coverage pilot (first 20 lessons): 128 targets (39 hànzì, 33 syllables, 16 words, 14 components, 9 intents, 6 scenarios, 3 culture, 3 contrasts, 4 tones, 1 chunk) — then the full curriculum above.

## Audit

| Check | Result |
|---|---|
| Prerequisite cycles | **0** |
| Dangling relations | **0** |
| Prerequisite introduced after dependant | **0** |
| Aliases identical to two same-kind targets | **0** |
| `KNOWLEDGE_GRAPH_CURRICULUM_LEAK` (probe at 1/5/20/60 lessons) | **0** |
| Orphans | 8 — 做 航 午 花 星 晴 风 (in `newHanzi` but missing from `CHARACTERS`, so no pinyin/components) and `chunk:wifi` (no hànzì) |
| Words without hànzì prerequisite | 1 — `chunk:wifi` |

Canonicalisation: `水` → `hanzi:水` (IDENTICAL); `shui3` / `shuǐ` → `syl:shui3` (IDENTICAL); `água` → `hanzi:水` (RELATED). Related, never the same target.

Curriculum awareness: every target has `introducedAt` (first Journey lesson that puts it in focus, same rule as RC2.3.4A). `isTargetTaught` gates every recommendation; Pinyin Lab contrasts count only after the learner practised them there.

Follow-ups (content, not this wave): add the 7 orphan glyphs to `CHARACTERS`.
