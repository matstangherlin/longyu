# Public Beta — Pedagogical Gap Baseline

**Status:** BASELINE ONLY — do not “fix” counts in this remessa.  
**Recorded for:** RC2.2.5 Journey Dragon Teacher Layer  
**Curriculum freeze:** `RC2_CONTENT_FREEZE` · fingerprint `516692632525`  
**Feature freeze:** `PUBLIC_BETA`

This document freezes the pedagogical debt observed at Public Beta so later
waves (Tone Transfer closure, PARTIAL capability audit) can measure progress
without rewriting history.

---

## Frozen curriculum identity (unchanged by presentation remessas)

| Metric | Count |
|---|---|
| Core lessons | 134 |
| Teaching topics | 113 |
| CultureItems | 30 |
| Culture Native Lessons | 30 |
| Journey Culture nodes (`CULTURE_LESSON`) | 20 |
| Journey Culture Moments (presentation) | 5 |
| Fingerprint | `516692632525` |

Pedagogical spine stages already in product:

`EXPOSED → NOTICED → GUIDED → RECOGNIZED → RECALLED → PRODUCED → TRANSFERRED → MASTERED`

---

## Conversation capabilities

Source of truth: `src/data/conversationCapabilities.ts`

| Status | Count |
|---|---|
| Total | **31** |
| READY | **20** |
| PARTIAL | **11** |

### PARTIAL (11) — do not mark READY without real content

- `talk_family`
- `order_food`
- `order_drink`
- `negotiate_basic`
- `pay`
- `use_metro`
- `use_train`
- `ask_for_help`
- `ask_repeat`
- `express_preference`
- `make_simple_plan`

These remain PARTIAL until a later remessa (Pedagogy Wave 3) audits and closes
gaps with real curriculum — not status flips.

> **Atualização RC2.2.9 (histórico acima preservado):** as 11 foram auditadas
> contra o runtime e fechadas com conteúdo real — ver
> `docs/reports/rc2-2-9-capability-closure.md` e
> `docs/release/rc2-capability-closure.json`. O status READY agora é calculado
> a partir de evidência de runtime (`validate:capability-runtime-evidence`),
> não declarado.

---

## Tone task baseline

Source of truth: `npm run validate:tone-teach-before-test` / `docs/reports/v491-tone-progression.md`

| Metric | Count |
|---|---|
| Tone tasks total | **190** |
| Awareness | **32** |
| Contour | **85** |
| Number | **42** |
| Mark | **13** |
| Production | **5** |
| Transfer | **0** |

**Tone Transfer = 0** is an explicit Public Beta gap. Closing it is Pedagogy
Wave 2 (`TONE TRANSFER CLOSURE`) and requires an explicit content-freeze
exception — not this remessa.

---

## Why no content in RC2.2.5

Public Beta is under feature + content freeze. RC2.2.5 improves **how** the
existing curriculum is taught (dragon as teacher on Journey handoffs) without
mutating lessons, topics, culture, or conversation capability readiness.

---

## Next pedagogical remessas (planned, not started)

1. **Pedagogy Wave 2 — Tone Transfer Closure**  
   Move from 190 tasks / 5 production / 0 transfer toward tones inside real
   communication — without more theory-only drills.

2. **Pedagogy Wave 3 — 11 PARTIAL capabilities audit**  
   Deepen existing capabilities; do not invent new subjects first.

---

## Honesty

Public Beta verdict remains **NO-GO** while candidate cloud (#273) is pending.
This baseline does **not** invent operational PASS.
