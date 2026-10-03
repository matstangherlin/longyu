# RC2.3.3 — Human Validation Script (Culture Deep)

Owner physical checklist. Do **not** mark `OWNER_CULTURE_ACCEPTANCE=PASS` without running this on a real device/APK.

## Setup

1. Install APK from this branch (or open web build on phone).
2. Fresh account or reset culture progress.
3. Locale PT-BR first; spot-check EN overlays if time allows.

## Flow A — Journey Culture Gate → Moment → Return

1. Advance Mandarin Journey until the first culture gate appears (social etiquette).
2. Confirm the dragon short line: context before continuing (not a long lecture).
3. CTA opens the **exact** Culture Lesson with `src=jornada`, `gate=…`, `mode=journey`.
4. Culture Moment stays short (scene → one decision → reaction → takeaway).
5. Complete → return to the **same Journey node** (not Hub top, not generic Cultura).
6. Gate shows resolved / disappears; brief “contexto compreendido” if present.
7. Reopen Journey: gate must not reappear incorrectly once seal requirements are met.

## Flow B — Flagships (Deep Dive from Cultura)

For each: visiting-home, shared-dishes, digital-pay, metro-qr (plus spot-check hotel / bargaining):

1. Story starts with a situation (not a text wall).
2. Visual is present.
3. Mandarin appears when relevant.
4. Choice feels natural; reaction changes with the decision.
5. Feedback is not purely binary when variation exists.
6. “Pode variar” / “Por quê?” deepen without clutter.
7. Sources available at end / Saiba mais — not required to finish.

## Flow C — Kind integrity

1. History item: timeline/context language — not legend tone.
2. Festival: temporal context; year fact not sold as evergreen date.
3. Literature / legend: badge **LITERATURA** / **LENDA**; not “this happened”.

## Flow D — Review & seal

1. Force or wait for culture review due.
2. Review uses a **new** situation (not the original question verbatim).
3. Earn a seal once — short reveal + haptic/sound; reopening does not repeat.

## Flow E — Hygiene

1. No horizontal scroll at 360×640 / 375×667 / 390×844.
2. CTA reachable; Hànzì readable.
3. No technical/QA chrome in production UI.
4. Canonical voice still used for speech.

## Result

Record PASS/FAIL per flow in the owner notes. Leave matrix `OWNER_CULTURE_ACCEPTANCE` and `APK_PASS` as `NOT_RUN` until this script is executed for real.
