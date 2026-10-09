# Final Pre-Beta RC Closure — RC2.3.13R

## Parent

- PR #339 — Sticky Progression Chrome
- Parent HEAD at branch: `51f8bd514d9e275fe5c83553fdb5d6e85f182262`

## Typography / motion

See `docs/ux/final-typography-inventory.md`, `docs/ux/final-motion-system.md`, `docs/reports/final-ui-motion-closure.md`.

## SHA semantics

| Field | Meaning |
|-------|---------|
| `learnerRuntimeSha` | Last commit affecting learner UI/runtime |
| `certificationHeadSha` | Commit containing certification/release metadata |
| `artifactSourceSha` | Exact checkout used for APK/AAB/web |

## RC identity

- Proposed: `RC2.3.13-RC1` (NOT_BUILT until provenance minted)
- Prior built candidate remains `RC2.3.12-RC2` — cannot certify 13H/H.1/13R UI

## Entry

`CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED` until physical QA, Sentry, rollback, cloud smoke ×2, OAuth, artifacts, and owner acceptance are evidence-backed.

`PUBLIC_BETA_ENTRY = HOLD`. NO 13I.
