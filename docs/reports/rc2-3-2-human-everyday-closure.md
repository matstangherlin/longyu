# RC2.3.2 — Human & Everyday Mandarin Closure

**Parent:** PR #311 · HEAD `26de55bf` (`cursor/rc2-3-1-visual-first-25db`)  
**#273:** NOT_TOUCHED (`rc2-candidate.json` hash congelado da main).  
**Budgets V6:** preservados (7–9 / 8–11 / 10–13 / 12–15).  
**Visual First:** preservado e aprofundado (cenas por mastery pass).

## Prompt 1 — verdade dos audits herdados

Inconsistência RC2.3.1:

- Matrix: `FIRST_EXPOSURE_PASS=YES`
- Audit: `firstExposureCovered=0` / `missing=19`

**Causa:** `auditConcreteFirstExposure` não emitia findings de sucesso (`continue` silencioso), então o audit nunca contava cobertura; a matrix marcava PASS só pela existência do gate.

**Correção:**

1. Findings cobertos agora são emitidos (`code=null`).
2. Enrichment Visual First cobre intro/listen/flashcard na primeira exposição.
3. Labs abstratos de tom excluídos com justificativa pedagógica.
4. Invariant `MATRIX_STATUS_MUST_MATCH_AUDIT` nos gates RC2.3.1 e RC2.3.2.

**Evidência pós-correção:** covered=20 · missing=0 · coverage=1.0

## Arquitetura Everyday

| Módulo | Papel |
|---|---|
| `everydayMandarin/intents.ts` | `EverydayIntent` + metadata comunicativa |
| `everydayMandarin/scenarios.ts` | banco de micro-situações + comportamento por pass |
| `everydayMandarin/applyEverydayMandarin.ts` | anota / humaniza / injeta no plano |
| `everydayMandarin/quality.ts` | context quality · answer leak · curriculum leak · human dimensions |
| `EverydayMandarinQaPanel` | inspeção no Device QA |

`humanContext.ts` delega ao contrato EverydayIntent (regex = fallback).

## Snapshot

- 134/134 lições com communicative outcome mapeado
- 14 cenários no banco
- curriculum leaks = 0 · context quality errors = 0
- production share Pass 3 ≈ 50% · Pass 4 ≈ 46%
- transfer share Pass 4 ≈ 13%
- first-20: greet / dialogue / production / visual / humanSituation = YES

## Status

| Gate | Valor |
|---|---|
| EVERYDAY_ENGINE_READY | YES |
| COMMUNICATIVE_MAP_READY | YES |
| FIRST20_HUMAN_PASS | YES |
| FULL_CURRICULUM_AUDITED | YES |
| CONTEXT_QUALITY_PASS | YES |
| CURRICULUM_LEAK_PASS | YES |
| PRODUCTION_PROGRESSION_PASS | YES |
| TRANSFER_PROGRESSION_PASS | YES |
| WEB_PASS | PASS (`npm run build`) |
| ANDROID_BUILD_PASS | NOT_RUN |
| APK_PASS | NOT_RUN |
| OWNER_HUMAN_ACCEPTANCE | NOT_RUN |

**Não** Closed Beta ready.  
Fora de escopo: Culture Deep · Hànzì writing · Speech & Contrast · Personal Mastery.
