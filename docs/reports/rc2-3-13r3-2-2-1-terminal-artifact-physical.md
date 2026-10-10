# RC2.3.13R.3.2.2.1 — Terminal Artifact & Physical Regression Certification

## Parent

- PR **#352** — Final Visual Candidate framework
- Exact HEAD (re-queried): `abbe4a04998a2510a1ce20a23252b259774f1365`
- `learnerRuntimeSha`: `824a55deb79898b3ee6c0f60d66dc762333828a4`
- Fingerprint: `29bb02ec0336`

## Scope

**NO DESIGN. NO CONTENT.** Prove the final visual runtime via exact-head hosted green → one Device-QA APK → owner physical + visual acceptance.

## Hosted workflow IDs (#352)

| Workflow | Run ID | Status at cert scaffolding |
| --- | --- | --- |
| Security | `38032295102` | PASS (gitleaks, npm audit, CodeQL Build + Analysis) |
| CI | `38032295031` | IN_PROGRESS |
| Android build | `38032295198` | IN_PROGRESS |

Update certification `hosted` when terminal.

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
