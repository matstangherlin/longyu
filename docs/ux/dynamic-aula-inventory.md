# Dynamic Aula Inventory — RC2.3.13H

Presentation audit of mandatory foundation instructional AULA surfaces.

| Lesson / Node ID | Topic | Current presentation | Dynamic status | Visual | Audio | Handoff |
|---|---|---|---|---|---|---|
| `capsule:foundation:mandarin:v1` / `node:instruction:foundation:mandarin` | O que é mandarim | Guided shell + beats | **DYNAMIC_PASS** | greeting-nihao | 你好 | conversation |
| `capsule:foundation:pinyin:v1` / `node:instruction:foundation:pinyin` | O que é pinyin | Guided shell + beats | **DYNAMIC_PASS** | pinyin-layers | 你好 | pinyin practice |
| `capsule:foundation:tone:v1` / `node:instruction:foundation:tone` | O que é tom | Guided shell + beats | **DYNAMIC_PASS** | tones-four-contours | mā… | tone trainer |
| `capsule:foundation:hanzi:v1` / `node:instruction:foundation:hanzi` | O que é hànzì | Guided shell + beats | **DYNAMIC_PASS** | hanzi-mu-tree | — | hanzi builder |
| `capsule:foundation:hanzi-components:v1` / `node:instruction:foundation:hanzi-components` | Componentes | Guided shell + beats | **DYNAMIC_PASS** | hanzi-mu-tree | — | hanzi builder |

## First ~30 minutes priority

All five foundation AULA capsules above are `DYNAMIC_PASS`.

## Fallback

If a capsule has no `lessonPresentations` entry, `LessonCapsulePlayer` keeps `AnimatedCapsuleRenderer` / video path. No lesson becomes inaccessible.

## Rules

- Images must not bake instructional paragraphs into pixels (alt + UI text).
- Presentation beats never grant XP / Mastery / SRS / unlocks.
- Replay is idempotent at the curriculum layer (`completeJourneyNode` remains local decoration).
