# RC2.3.13R.3.2.5 — Premium Surface Hierarchy, Reward Rituals, Resilient States & UX Closure

Presentation-only closure wave on top of R.3.2.4 (#355, same branch). There is no
navigation, curriculum, pedagogy, mastery, SRS, XP, Fôlego, unlock, economy,
grant-timing, schema, billing or JEV change.

## Parent: #355

#355's Android failure (`CAPACITOR_OUTSIDE_PLATFORM`) came from a lexical rule
matching a *comment*. The validator was repaired at the root: an AST detector
(`findCapacitorAccess`) flags only real access. That covers imports,
import-equals, dynamic `import()`, `require`, import types, `Capacitor`
identifiers and `["Capacitor"]` element access. The comment was not edited. The
detector is backed by a 10-violation / 7-prose battery, 5 detector mutants, and
platform mutants 1–7 in this wave's gate.

On `0df0fdc`, #355's WebKit job failed one test twice
(`guided-journey-culture.spec.ts` › Tone Trainer handoff). The same error had
already appeared as a flake on #354 @ `64a06df`. Classification:
**TEST_RACE_PREEXISTING**. The test read `data-guide-phase` and then clicked; when
the typing finished in between, the click dismissed the guide. Fixed in
`a3579c2`: the check and the click now run in one page task. The runtime is
unchanged.

## The four R.3.2.4 follow-ups — closed

| Follow-up | Root cause | Fix | Regression |
| --- | --- | --- | --- |
| Culture topic direction | the mark survived modified clicks and was eaten by StrictMode's second initializer | plain primary clicks only, destination-bound, ≤ 3 s, idempotent per `location.key` | E2E (Ctrl-click + positive control) + executed gate check |
| Mascot blink rest pose | a paused blink froze with the eyes shut | `animation: none` when the slot is withheld | E2E (no slot, reduced motion) |
| Victory burst | the burst lived inside the entrance fade | burst outside `lesson-victory-in` | gate (component order) |
| Stitch draw | the keyframe ended at opacity 1 and snapped to 0.62 | `from { opacity: 0 }` only | E2E (clay, dark) + gate |

## What changed for the learner

- **Surfaces:** semantic tokens per theme, elevation as variables (dark no longer
  erases verdict rings), a scrim that is dark in dark mode, on-colours that pass
  AA, a focus ring at ≥ 3:1, and `Card` overrides that actually apply.
  Ratchets: arbitrary radius ≤ 2, arbitrary shadow = 0.
- **States:** one state matrix (disabled reads "not now", loading keeps its
  colour). Verificar stays primary until a verdict. Verdicts show a check or an X.
  Switches show their OFF track.
- **Resilient:** no blank frame on route changes. Offline cold start keeps a
  confirmed cloud learner in the app. Offline economy failures read "saved on
  this device". Error text fails closed. The League never prints backend text.
  Sync truth on Conta, the chip and sign-out. Reconnecting flushes once. Lessons
  show one offline line. Retry works for failed chunks. Empty and error states
  offer a next step.
- **Rewards:** one ChestOpeningRitual (single claim, ~760 ms, reduced motion
  instant, honest "unavailable"). Catalog names, distinct icons, copy that
  matches the roll. Victory shows only Qi the store pays.
- **Guide / auth / mobile:** teacher lines type once. Back works with inline
  tips. Journey guides are remembered. Sign-out always confirms. OAuth copy is
  in the interface language. The password keyboard no longer capitalises.
  Keyboard and safe-area fixes. 44 px targets.

## Gate

`gate:rc2-3-13r3-2-5-premium-ux-closure` = seven validators + release honesty +
the mutation suite (≥ 160). Behaviour is executed wherever possible: the chest
ritual (hooks, timers, taps), the toast hook, economy pending, the error
localizer, Card merging, Button state classes, Victory Qi against the store's own
formula, topic transitions, the teacher bubble, the Android detector, and token
contrast.

## Escalated (economy owner, not changed here)

1. Back on Victory forfeits the first-completion Qi (grant timing).
2. The cloud chest summary shows the local roll; the server rolls its own table.
3. Journey chests in cloud accounts are local-only.

## Not done in this wave

- The type/icon hierarchy audit agent did not run (usage limit). Reward icons and
  typography tokens were self-audited only.
- The coachmark and the in-page culture guide still compete on the first
  /cultura visit (existing e2e contract). The typewriter still starts offscreen.
- Android blob export honesty. Guests still see the Danger Zone (seeded e2e
  contract).

## Truth

- learnerRuntimeSha `3b1bb08c` (prior `2618683e`).
- Fingerprint **29bb02ec0336**, from the generator, unchanged.
- Hosted: PENDING. APK: NOT_BUILT (one APK after exact-head green).
- Physical: NOT_RUN. Public Beta / Play: HOLD.
- UI freeze `OWNER_ACCEPTED_R325` only after the owner accepts.
