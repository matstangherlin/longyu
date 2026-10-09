# OWNER_RC_LEARNING_FLOW_TEST — Physical device checklist

**Waves:** RC2.3.13C learning flow · **RC2.3.13D** device UX  
**Preferred stamp:** RC2.3.12-RC4 — **currently NOT_BUILT** (use DEVICE-QA APK from 13D)  
**Do not mark PASS from browser alone.**

## Setup

- Uninstall old Longyu → install **DEVICE-QA — NOT FINAL BETA** APK (record SHA / versionCode)
- Also once: upgrade from previous RC → new QA build (progress preserved)
- Network on; then repeat key paths offline
- Devices: SMALL 360 · COMPACT 375 · TARGET 390 (see `docs/ux/mobile-device-matrix.md`)

## Audio (10 plays)

1–10. Tap Ouvir on model listen steps across ≥3 lessons. Confirm:
- Visual STARTING / PLAYING / Heard
- Continuar disabled reason until heard
- On forced audio failure: recovery UI; not scored as wrong

## Conversations (5)

1–5. Complete 5 conversation turns (or 5 scenes). Confirm each turn advances visibly; no stuck “Listening” without Your turn.

## Speech (5)

1–5. Record → playback mine → compare model → Continuar / Tentar novamente.  
Mic deny/reallow once: settings path or Continuar without trap.

## Hànzì (5)

1–5. Open writing/trace; interact; complete; Continuar does not cover canvas.

## Review

- Hub: Começar revisão primary
- Grade with semantic labels (Errei / Difícil / Bom / Fácil)
- End → Continuar jornada

## Completion

- Ability message before XP
- One primary Continuar jornada
- No Store / League / Pro competing

## System

- Offline banner calm
- Background / resume mid-lesson
- Android Back: no silent progress loss; confirm only when needed
- Safe-area: Continuar above gesture nav

## Result

| Item | Pass? | Notes |
| --- | --- | --- |
| Audio ×10 | | |
| Conversations ×5 | | |
| Speech ×5 + mic | | |
| Hànzì ×5 | | |
| Review | | |
| Completion | | |
| Offline / Back | | |

Owner: ________  Date: ________  Build SHA: ________
