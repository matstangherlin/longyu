# RC2.3.13R.3.2.2.1 — Terminal Artifact & Physical Regression Certification

## Parent / tip

- Tip PR **#353** — Terminal artifact + physical certification
- Parent PR **#352** — Final Visual Candidate framework
- Exact tip HEAD: `01f9ff17cf5f2bcca5a416d402d7c48ae97135e1`
- `learnerRuntimeSha`: `0357f82476d03bc8364efc66902b4640b4a155b9` (runtime harden)
- Fingerprint: `29bb02ec0336`

## Scope

**NO DESIGN. NO CONTENT.** Prove the final visual runtime via exact-head hosted green → one Device-QA APK → owner physical + visual acceptance.

## Chromium failure classification (tip)

| Class | Fix |
| --- | --- |
| STALE_TEST_CONTRACT | Culture hub / Journey / nav / bubble / Home cognitive E2E updated for topic-hub IA |
| REAL_RUNTIME_REGRESSION | Null SRS Journey crash; culture gate `instructionLocale`; persist merge; early nav density |

Local retest of previously failing Chromium specs: **PASS**.

## Hosted workflow IDs

Update certification `hosted` when tip #353 exact-head is terminal green.

## Gates

- `gate:rc2-3-13r3-2-2-final-visual-candidate` (90 kills) — parent framework
- `gate:rc2-3-13r3-2-2-1-terminal-artifact-physical` (≥70 kills) — this wave
- Also require R.3.2.1 visual polish + Culture hierarchy validators

## Artifact

```text
status: NOT_BUILT until exact-head hosted PASS + Android debug APK provenance
channel: DEVICE_QA
stale:
  fc72f9e3… (#348)
  fb835ce8… (legacy)
```

## Physical / visual / operations

All `NOT_RUN` until owner installs the exact new APK.

## Entry

```text
OWNER_QA_ENTRY = HOLD → OWNER_ACTION_REQUIRED after mint
PLAY_CLOSED_BETA_ENTRY = HOLD
PUBLIC_BETA_ENTRY = HOLD
Wave1 = 0/10
```

## Next

1. Exact-head hosted PASS
2. Reconcile Android artifact (prefer existing #352 run if valid)
3. Owner install + targeted/visual acceptance
4. Final visual freeze OWNER_ACCEPTED
5. Full R.3 physical + operations
