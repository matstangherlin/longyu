# RC2.3.13G — Navigation Convergence, Beta Feedback & Learner Health

## Mission

Final learner-facing pre-beta wave: remove Culture bottom-tab redundancy, prepare privacy-safe beta telemetry + micro-feedback, freeze the experience for Closed Beta.

## Navigation before → after

| Surface | Before (13F) | After (13G) |
| --- | --- | --- |
| Bottom TabBar | Jornada · Praticar · **Cultura** · Missões · Mais | Jornada · Praticar · Missões · Mais |
| Journey ↔ Culture | ProgressionShell + TabBar Cultura | **ProgressionShell only** `[ Jornada \| Cultura ]` |
| `/cultura*` active parent | Cultura tab | **Jornada** (progression parent) |

### CULTURE IS NOT A BOTTOM NAV ITEM

Culture is a submode of the global progression destination:

```text
GLOBAL PROGRESSION DESTINATION
          │
          ▼
 [ JORNADA | CULTURA ]
```

Deep links (`/cultura`, `/cultura/explorar`, `/cultura/:id`, `/cultura/revisao`) remain valid.

## Feedback surfaces

- Micro-feedback sheet (one question, dismissible, frequency-capped)
- Reportar problema categories expanded (Aula, Áudio, Fala, Hànzì, Jornada, Cultura, Conta/Login, …)
- Safe diagnostics payload + `LY-******` correlation id

## Event taxonomy

Canonical `beta_event/1` in `src/lib/beta/betaEvents.ts` — SESSION / ACTIVATION / LEARNING / NAVIGATION / CULTURE / MASTERY / PRACTICE / TECHNICAL_FAILURE / FEEDBACK.

PII allowlist + sanitizer; forbidden email/token/audio/stroke fields.

## Health metrics

See `docs/beta/BETA_HEALTH_MODEL.md` + `docs/beta/beta-health-schema.json`.
Generator: `node scripts/generate-beta-health-report.mjs`.

## Freeze

- Fingerprint frozen: `fea5455e1461`
- CultureItems 36 · Native 36 · Journey culture nodes 20 · Paths 12 · FLAGSHIP_DEEP 11
- Thin paths remain `EXPANSION_PENDING` (no filler)

## Gates

`gate:rc2-3-13g-beta-feedback-learner-health` — validate + ≥40 mutation kills.

## UI freeze

`docs/release/pre-beta-ui-freeze.json` — after hosted green, no new visual features before beta.
