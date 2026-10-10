# Owner — Final Pre-Beta RC Physical Test

**NO FEATURE WAVE. ARTIFACT / PHYSICAL / OPERATIONAL CLOSURE ONLY.**

## OWNER QA — EXACT CANDIDATE

| Field | Value |
|-------|-------|
| RC ID | `RC2.3.13-RC1` |
| Version | `0.2.0-rc.5` |
| versionCode | `651` |
| artifactSourceSha | `5c27be365ed276ce7694c15769dd7f9997ec1989` |
| workflowMergeSha | `3be0ade5565e28297ebedf71645261f037e13c1a` |
| APK file | `longyu-android-debug-0.2.0-rc.5-3be0ade.apk` |
| APK SHA256 | `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8` |
| Fingerprint | `fea5455e1461` |
| Channel | `DEVICE_QA` debug (sideload) |
| Android run | `37995330174` |

**STOP** if `/qa/device` does not match this table.

This is **not** a Play-ready release. Play Closed Beta = `BLOCKED_SIGNING_SECRETS`.

## OWNER ACTIONS (exact pending)

Full R.3 pack: `OWNER_R3_PHYSICAL_OPERATIONAL_PACK.md`.


- [ ] Configure Play signing secrets (`PLAY_SIGNING_HANDOFF.md`) if Play Closed Testing is the distribution path
- [ ] Install APK SHA256 `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8` only
- [ ] Clean install + cold launch + `/qa/device` identity
- [ ] Upgrade path from prior QA build (if applicable)
- [ ] Sticky chrome + Journey ↔ Culture + rapid switch
- [ ] Typography + motion physical
- [ ] Audio ×20
- [ ] Guided Try ×10 complete
- [ ] Speech ×5 complete
- [ ] Conversation ×5 full
- [ ] Hànzì / Review / Dynamic Aula
- [ ] TalkBack / font scale / reduced motion / Back / IME
- [ ] Background/resume / offline-reconnect / 30min session
- [ ] Android OAuth physical
- [ ] Sentry synthetic event + Netlify rollback drill
- [ ] Confirm cloud smoke ×2
- [ ] `OWNER_FINAL_PRE_BETA_ACCEPTANCE` naming this APK SHA256

## Entry (honest)

```text
OWNER_QA_ENTRY = OWNER_ACTION_REQUIRED
PLAY_CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED (BLOCKED_SIGNING_SECRETS)
PUBLIC_BETA_ENTRY = HOLD
```

Do **not** invite 10 real testers before distribution GO.
