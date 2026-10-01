# RC2.2.29 — Launch Convergence

Stacked on #301 (`RC2_2_29_BASE_SHA=6c7d54e8e6d186a6c4497ce73f4d2a56df20abcf`).

## Closed in code

- FIXED_CONTENT_MISSING_AUDIO = 0 (657 assets; 7 DYNAMIC_TTS)
- Learner UI: no TTS/plugin/diagnostic pollution in Guided Try
- Conversation Continue stall contract: pointer→click→handler→lock→commit→DOM→audio; forceRelease on DOM; 800ms failsafe same `transitionId`; APK traces
- Owner request register OR01–OR60
- Tone Trace / confusion / profile coachmark guidance
- Local-profile copy removed from learner-facing strings
- Physical matrix expanded (pointer/click/20 transitions / no-scroll viewports / …)
- `gate:rc2-2-29-launch-convergence` green

## Still physical / owner

CODE_READY ≠ DONE. Critical P1 (conversation Continuar, signup, OTP, completion, self-compare) require APK_PASS / OWNER_ACCEPTED. See physical matrix (`NOT_RUN`) and owner register.
