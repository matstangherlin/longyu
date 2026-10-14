# RC2.3.13R.3.2.2 — Final Visual Candidate (Hosted Closure & Device-QA Mint)

## Parent

- PR **#351** — Culture/Journey Visual Polish & Symbolic Progression
- Observed / re-queried HEAD: `c47bc5b0e2f84dd990faa510afc34bed5628ca47`
- `learnerRuntimeSha`: `824a55deb79898b3ee6c0f60d66dc762333828a4`
- Fingerprint: `29bb02ec0336`

## Scope

**STOP DESIGNING.** This wave freezes Journey/Culture visual design after hosted green + Device-QA APK mint + owner physical acceptance.

Not in scope: new icons, new IA, new ornament family, new typography, new Journey/Culture layout.

## Hosted workflow IDs (exact-head)

| Workflow | Run ID | Status |
| --- | --- | --- |
| Security | `38031710881` | PASS (re-query: npm audit, gitleaks, CodeQL Build + Analysis) |
| CI | `38031710900` | PENDING at cert creation |
| Android build | `38031710888` | PENDING at cert creation |

Update `docs/release/rc2-3-13r3-2-2-certification.json` → `hosted` when terminal.

## Culture hierarchy

- Gate: `gate:rc2-3-13r3-2-culture-topic-hierarchy`
- Root = topic hub (rectangular cards); bubbles only in topic detail
- No root path chips; no `Trocar de caminho`

## Visual polish

- Gate: `gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression` (71 mutation kills)
- Stable center axis; `longyu-line` icons; left/right ornaments; reduced-motion

## This wave gate

- `gate:rc2-3-13r3-2-2-final-visual-candidate` (≥80 mutation kills)
- Rejects unhosted/unphysical visual promotion, stale APKs, Culture/visual regressions, physical honesty failures

## Artifact

```text
status: NOT_BUILT (until exact-head hosted PASS)
channel: DEVICE_QA
stale rejected:
  fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af  (#348)
  fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8  (legacy)
```

## Physical / visual acceptance

All `NOT_RUN` until owner installs the exact new APK.

## Entry

```text
OWNER_QA_ENTRY = HOLD (→ OWNER_ACTION_REQUIRED after mint)
PLAY_CLOSED_BETA_ENTRY = HOLD
PUBLIC_BETA_ENTRY = HOLD
Wave1 = 0/10
```

## Remaining after owner visual PASS

Full R.3 physical remainder → Sentry → Rollback → Cloud Smoke ×2 → Android OAuth → signed Play AAB → Closed Beta GO.
