# RC2.3.13R.2.1 — Android Foundation Root-Cause

## Parent

| Field | Value |
|-------|-------|
| PR | #342 |
| HEAD | `6b2a9e1fe10da4f3c2219a32208b46e458598edf` |
| Branch | `cursor/rc2-3-13r2-artifact-reconciliation-physical-go-af1a` |

## Failed workflow

| Field | Value |
|-------|-------|
| Workflow | Android build |
| runId | `38000277968` |
| Job | Android foundation (contratos + debug APK/AAB) |
| Step | Contratos Android + pipeline de entrega |
| Conclusion | failure (before APK compile) |

CI twin:

| Field | Value |
|-------|-------|
| Workflow | CI |
| Job | Beta suite android-foundation |
| Same root cause | yes (`gate:main-delivery-pipeline` → `validate:android-release-safety`) |

## Exact failed gate

```text
gate: main-delivery-pipeline → validate:android-release-safety
exit code: 1
failure code: SERVICE_ACCOUNT_COMMITTED
source file: scripts/rc2-3-13r2-artifact-physical-go.mjs
expected truth: no PEM / service-account content in tracked files
actual truth: mutation fixture contained a contiguous RSA private-key PEM header
  (BEGIN + RSA + PRIVATE KEY joined on one line)
```

Classification: **GATE_REGISTRY_DRIFT / CERT_SCHEMA_DRIFT** adjacent — specifically a **LEGACY_GATE_FALSE_POSITIVE** triggered by an R.2 mutation fixture, not a learner-runtime regression.

## Root cause

R.2 added a mutation kill for `SIGNING_SECRET_COMMITTED` that embedded a literal PEM private-key header in the tracked test script.  
`validate:android-release-safety` correctly git-greps for contiguous PEM private-key headers and failed closed.

No Android native code, Capacitor config, package version, or learner UI changed for this failure.

## Fix

Construct PEM markers at runtime by joining fragments so the contiguous PEM line is not present in the tracked source.  
Safety gate remains fully mandatory; no skip, no NON_BLOCKING, no gate removal.

## Follow-on hosted failure (R.2.1 first push)

| Field | Value |
|-------|-------|
| Workflow | CI |
| runId | `38002645654` |
| Job | Release truth (fast failure) |
| Gate | `gate:rc2-3-9-stack-convergence` |
| Failure code | `CONVERGENCE_HIDDEN_SKIP` |
| Source | `scripts/rc2-3-13r2-1-hosted-android-closure.mjs:45` |
| Cause | Mutation kill for `GATE_OR_TRUE` embedded literal shell-or-true in tracked source |
| Classification | **LEGACY_GATE_FALSE_POSITIVE** (fixture scan collision; not product regression) |

Same fix class: build shell-or-true and PEM markers from fragments at runtime (pipe fragments + `" true"` join), matching `rc2-3-10b-certification.mjs`. Convergence + release-safety gates remain mandatory.

## Impact

| Question | Answer |
|----------|--------|
| learner runtime changed? | **no** |
| learnerRuntimeSha moved? | **no** (`ce8b7cc82740d6c05d080c462f8403e7d91b1a90`) |
| artifact invalidated? | **no** — Owner QA APK SHA256 preserved |
| versionCode | still **651** |
| Play signing | still `BLOCKED_SIGNING_SECRETS` |

## Preserved Owner QA candidate

```text
RC2.3.13-RC1 / 0.2.0-rc.5 / 651
artifactSourceSha = 5c27be365ed276ce7694c15769dd7f9997ec1989
APK SHA256 = fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
```

## Hosted rerun

Re-query after R.2.1 push — record SUCCESS run IDs in certification when terminal.

## Entry (unchanged honesty)

```text
OWNER_QA_ENTRY = OWNER_ACTION_REQUIRED
PLAY_CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED
PUBLIC_BETA_ENTRY = HOLD
Physical / Operations = NOT_RUN
```
