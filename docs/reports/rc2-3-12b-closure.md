# RC2.3.12B — Closure

## Parent

| Field | Value |
|---|---|
| Parent PR | [#327](https://github.com/matstangherlin/longyu/pull/327) |
| Parent SHA (observed at branch create) | `5a402ce8838c47d91b412a4279324c56ece20c33` |
| Grandparent #326 LON-001 fix | `ca354b026fd59ed0a6afb12a570f232545cfdbb6` |
| This branch | `cursor/rc2-3-12b-beta-entry-closure-af1a` |
| This PR | [#328](https://github.com/matstangherlin/longyu/pull/328) |

## Android root cause

Hosted Android foundation on #327 failed at `validate:release-identity`:

`VERSION_NAME` — `netlify.toml` still had `VITE_APP_VERSION = "0.2.0-beta.1"` while `package.json` was `0.2.0-rc.1`.

That blocked APK/AAB assembly and skipped Android runtime. Fixed by aligning all Netlify `VITE_APP_VERSION` values to `0.2.0-rc.1`.

Culture-identity on #326/#327 also failed `test:longyu-only-backend` because RC2.3.11/12 gate sources contained contiguous sibling-product literals; obfuscated via LON-001 probe split (inherited from #326).

## Version authority

Documented in `docs/release/VERSION_AUTHORITY.md`.

| Field | Value |
|---|---|
| versionName | `0.2.0-rc.1` (`package.json`) |
| versionCode floor | `1` (`android/version.properties` ↔ foundation) |
| versionCode computed | `floor + first-parent count` (`release-identity.mjs`) |
| RC policy | regenerate **RC1 draft** (never distributed) |

## Artifacts

| Artifact | Status |
|---|---|
| APK | `NOT_RUN` until hosted Android green on this SHA |
| AAB | `NOT_RUN` until hosted Android green on this SHA |
| Web `/version.json` | pending candidate deploy of this SHA |

## Hosted

Re-evaluate after push of this wave. Do not claim green while checks are queued/`in_progress`.

## Physical

`OWNER_RC_PHYSICAL_ACCEPTANCE` remains **NOT_RUN** (human-only). Checklist: `docs/release/owner-rc-physical-checklist.md`.

## Cloud beta blockers

Carryover classifications in `rc2-3-12-cloud-blocker-classification.json` unchanged by this repair wave (no new cloud architecture). Beta-required still includes smoke, auth redirects, Android OAuth unless owner evidence lands.

## Observability

Sentry still `CONFIG_REQUIRED` → Closed Beta GO blocked without approved exception.

## Rollback

Netlify rollback drill still `NOT_RUN` → GO blocked.

## Core QA

Code paths CODE_READY from prior waves. Speech/Hànzì/audio physical remain NOT_RUN until owner/device evidence.

## Known issues

See `KNOWN_ISSUES_RC.md`. No new P0 introduced by 12B. Version drift and Android foundation failure treated as repaired code defects, not known-issue waivers.

## Entry

`CLOSED_BETA_ENTRY` = **OWNER_ACTION_REQUIRED** until beta-required physical/cloud/observability/rollback/APK rows pass.

Target of this wave: remove automatic blockers (version drift, LON-001 false positive, release-identity) so hosted Android can produce certifiable APK/AAB. Physical + Sentry + OAuth + rollback remain owner/environment gated.
