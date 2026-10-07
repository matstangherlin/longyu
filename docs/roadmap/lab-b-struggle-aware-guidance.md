# LAB-B — Struggle-Aware Guidance / Jev Shadow Mode (roadmap, target RC2.4.2)

Status: **ROADMAP ONLY**. `JEV_RUNTIME_ENABLED=false`. Nothing here runs in the learner app.

## Struggle signals
Computed from **active-idle** time only (app foregrounded, activity on screen, no input), repeated errors on the
same target, replay loops, hint requests. Background time never counts.

States: `NONE` · `POSSIBLE` · `LIKELY` · `TECHNICAL_BLOCK` (audio/mic/network failure — routed to a technical fix,
never to pedagogy).

## Intervention candidates (deterministic, safe)
Inline nudge (replay audio, show pinyin, slow audio, simpler item, take a break). Never a modal. Each candidate
is safe on its own; the app can always choose `NONE`.

## Jev's role
Jev only **chooses among candidates**. Structured input only (state, counts, activity kind, candidate ids) —
no PII, no free text, no user id. Question shapes: `NOUL` (no-op allowed), `CHOICE` (pick candidate), `SCORE`.

## Shadow mode first
Jev's choice is logged next to the deterministic choice; the deterministic one is shown. Metrics: agreement,
nudge acceptance, time-to-recover, abandon rate. Intervention budget per session. **Fail open**: timeout / error →
deterministic choice, learner never waits.

## Exit criteria to go live (RC2.4.2)
Agreement and recovery metrics reviewed by owner; budget respected; zero PII in payloads; kill switch.
