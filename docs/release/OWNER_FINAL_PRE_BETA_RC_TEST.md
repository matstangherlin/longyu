# Owner — Final Pre-Beta RC Physical Test

**NO FEATURE WAVE. FINAL PRE-BETA RELEASE EXECUTION.**

## Artifact identity (fill after mint)

| Field | Value |
|-------|-------|
| RC ID | `RC2.3.13-RC1` |
| Version | `0.2.0-rc.5` |
| versionCode | _(from mint)_ |
| artifactSourceSha | `NOT_BUILT` |
| APK SHA256 | `NOT_BUILT` |
| Fingerprint | `fea5455e1461` |

**STOP** if `/qa/device` Release Truth does not match the table above.

## Remaining owner checklist (exact)

- [ ] Install the single Final Pre-Beta APK (SHA256 above) — not RC2 / not random debug from another PR
- [ ] Clean install + cold launch + identity check
- [ ] Upgrade path from prior QA build (if applicable)
- [ ] Sticky chrome: scroll Journey far — TopBar + switch immobile
- [ ] Journey ↔ Culture animation + reverse + rapid switch ×5
- [ ] Typography physical: Home, Journey, Culture card, Review, tasks
- [ ] Motion physical: path change, reduced-motion setting
- [ ] Audio ×20
- [ ] Guided Try ×10 complete
- [ ] Speech ×5 complete (grant/deny/reallow)
- [ ] Conversation ×5 full
- [ ] Hànzì physical drawing
- [ ] Review complete path
- [ ] Dynamic Aula foundation sample
- [ ] TalkBack order: global → switch → content
- [ ] Font scale 100% / large / largest
- [ ] Android Back + IME
- [ ] Background/resume during lesson + audio + Speech
- [ ] Offline → reconnect
- [ ] 30-minute continuous session
- [ ] Android OAuth physical (intended providers)
- [ ] Sentry synthetic event (release/env/source)
- [ ] Netlify rollback drill evidence
- [ ] Confirm cloud smoke #1 and #2 already green (or re-run)
- [ ] `OWNER_FINAL_PRE_BETA_ACCEPTANCE` naming this APK SHA256

Until these are done: **`CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED`**.  
**`PUBLIC_BETA_ENTRY = HOLD`**. Do not invite 10 real testers before GO.
