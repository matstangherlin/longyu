# English product glossary — Longyu V4.8.0

Keep these terms stable across the English UI. Do not calque from Portuguese
when a natural product word already exists.

| Term (EN) | pt-BR | Notes |
| --- | --- | --- |
| Longyu | Longyu | Product name. Do not translate. |
| 龙语 | 龙语 | Chinese product name. Canonical. |
| Journey | Jornada | The main Mandarin path. Capitalize as a product area. |
| Lesson | Lição | One session on the Journey. |
| Review | Revisão | Spaced repetition / weak-item practice. |
| Mastery | Domínio | Topic mastery 1/4–4/4. Not “domain” in the UI. |
| Streak | Sequência / Ofensiva | Consecutive study days. Top bar uses Sequência; overlay chrome uses Ofensiva in pt-BR and **Streak** in EN. |
| Pearls | Pérolas | Premium currency. Keep the metaphor. |
| Qi | Qi | XP analog. Do not translate. |
| Missions | Missões | Daily/weekly goals. |
| Charges | Cargas | Daily energy / lesson attempts. |
| Practice | Praticar | Skill drills hub. |
| Placement | Diagnóstico | Starting-point check. Keep “Placement” in EN. Onboarding/Placement chrome in V4.8.1 uses this term only — not Diagnostic / Level Test / Assessment. |
| Hànzì | Hànzì | Characters. Do not spell “Hanzi” in chrome unless already in code. |
| Pinyin | Pinyin | Romanization. Untranslated. |
| Pro | Pro | Paid plan. |
| Mandarin | Mandarim | Target language. |
| Interface language | Idioma da interface | Not country, not “I am learning”. |
| I am learning Mandarin | Estou aprendendo mandarim | Target language. Never inferred from country. |
| Discovery | Descoberta | Mastery pass 1 (M1). |
| Consolidation | Consolidação | Mastery pass 2 (M2). |
| Production | Produção | Mastery pass 3 (M3). |
| Mastery | Domínio | Mastery pass 4 (M4) and the 4/4 ring. |
| Hello | Olá | Scored gloss for 你好. `Hi` is an accepted alias only. |
| Thanks | Obrigado(a) | Scored gloss for 谢谢. |
| See you later | Até logo | Scored gloss for 再见. |

## V4.8.2 instruction overlay

- Canonical copy stays in Journey data (pt-BR). English is a string overlay, not
  `lesson-001-en.ts`.
- Scoring maps EN labels back to the Portuguese identity (`answersEquivalent`).
- Pronunciation analogies must not calque Portuguese (“silent English h”, not
  “h mudo do português”).


## Gloss vs UI

- UI: buttons and chrome (`Continue`, `Sign in`).
- Chinese gloss: meaning of a Mandarin form (`Hello` for 你好).
- Canonical Chinese (hanzi, pinyin, tone, audio id) is never translated.

## Do not use

- Country as a language (`Brazil` → Portuguese).
- Duplicate Journey files per locale (`lesson-001-en.ts`).
- `en-US` as a shipped interface locale. Ship `en`.
