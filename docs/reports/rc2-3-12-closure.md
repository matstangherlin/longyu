# RC2.3.12 — Closure (in progress)

| Field | Value |
|---|---|
| RC ID | `RC2.3.12-RC1` |
| Version | `0.2.0-rc.1` |
| versionCode | `565` (floor 1 + first-parent commits) |
| Fingerprint | `5a64821d0b7d` |
| Parent | PR #326 (Release Truth fix `c6197ede`+) |
| Monetization | **TEST** / Closed Beta **FREE_ONLY** |
| Live billing | **DISABLED** |
| Feature freeze | **ON** (`RC_CHANGE_POLICY.md`) |

## Parent truth

#326 initially failed hosted `Release truth` with `GATE_REGISTRY_STALE` (not Product Truth SHA alone). Fixed via `generate:gate-registry` + product-truth refresh; local `validate:beta --suite release-truth` PASS. Hosted re-run: see CI on #326.

## RC identity

`docs/release/rc-candidate.json` — status starts `NOT_BUILT` until artifacts + validation evidence.

## Commercial

FREE_ONLY beta recommended. OA-FINAL-PRICING open. Stripe TEST catalog re-verified (8 prices). Edge price secrets still CONFIG_REQUIRED. Android IAP DISABLED_FOR_BETA.

## Cloud residual

Classified in `rc2-3-12-cloud-blocker-classification.json`. Beta-required cloud items remain owner actions (smoke, auth redirects, Android OAuth). Security/data-loss never optional.

## Artifacts

Local Android SDK absent → APK/AAB **NOT_RUN** here; rely on hosted Android build + provenance after push.

## Physical QA

`OWNER_RC_PHYSICAL_ACCEPTANCE` NOT_RUN — checklist in `owner-rc-physical-checklist.md`.

## Observability

Sentry CONFIG_REQUIRED — Closed Beta GO blocked unless exception approved.

## CLOSED_BETA_ENTRY

`OWNER_ACTION_REQUIRED` via `gate:closed-beta-entry` until beta-required rows pass.

## Known issues

See `KNOWN_ISSUES_RC.md` (P0 none declared; P1 cloud/oauth/sentry).

## Next

RC2.3.13 Closed Beta only if `CLOSED_BETA_ENTRY=GO`.
