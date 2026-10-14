# RC2.3.10B - Production web SHA (Prompt 52)

**Result: `PASS` for identification only.** Production web serves commit `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e` (`ec26ffc`, the `[release]` squash of #320). Evidence: `docs/launch/rc2-3-10b-web-sha.json`. Re-run with `node scripts/rc2-3-10b-prod-web-sha.mjs`.

This is not a cloud certification. `docs/release/rc2-3-10-cloud-matrix.json` is unchanged: `PRODUCTION_WEB_SHA_IDENTIFIED` stays `OWNER_ACTION_REQUIRED` there until a reviewed change accepts this evidence (the certification gate rejects an owner-gate `PASS` that does not carry owner evidence).

## What was checked

| Check | Result |
|---|---|
| `GET https://singular-meringue-7838cd.netlify.app/version.json` | HTTP 200, `application/json`, `longyu-build-identity/2` |
| `commitSha` / `sourceHeadSha` / `workflowSha` / both embedded SHAs | all `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e` |
| `environment` / `branch` / `platform` / `appVersion` | `production_beta` / `main` / `web` / `0.2.0-beta.1` |
| `builtAt` | `2026-10-08T05:36:37.673Z` (commit time `2026-10-08T05:35:25Z`) |
| SHA embedded in the JS the browser runs (`assets/index-BAuS39Wg.js`) | present, 16 occurrences |
| SHA is a commit of this repo and an ancestor of `origin/main` | yes |
| Netlify deploy API | **not used**: `NETLIFY_AUTH_TOKEN` is not set in this environment |
| `LONGYU_PROD_URL` pattern from `.env.example` | same host, `https://singular-meringue-7838cd.netlify.app` |

## Is production on the latest `main`?

No, and that is expected. `origin/main` is `7d1890ad` (#321), one commit after `ec26ffc`. That commit has no `[release]`/`[deploy]` marker, and `scripts/lib/netlify-deploy-policy.mjs` returns `build: false` for it and `build: true` (release marker) for `ec26ffc`. The two facts agree: production publishes only marked release commits.

## Not proven here

- The Netlify deploy record (deploy id, "published" state, who triggered it). `version.json` and the bundle come from the same site, so they prove what is served now, not the deploy history. Owner step if wanted: Netlify > Deploys > confirm the published deploy is `ec26ffc`.
- Anything after `verifiedAt`. A later `[release]` push changes what is served.
- That `ec26ffc` is a good release. GitHub's check runs on that commit (read via `gh api`) show `Beta suite android-runtime`, `Beta suite android-foundation` and `Android foundation (contratos + debug APK/AAB)` as `failure`, and the E2E, quality-gate and cross-engine runs as `skipped`; #320 was merged on the owner's request before cross-engine E2E (per its commit message). This report does not rule on those results.

## Reproducing and failure modes

`node scripts/rc2-3-10b-prod-web-sha.mjs` fetches, cross-checks and writes the JSON. `validate` and `test` are offline.

| Situation | Status written |
|---|---|
| host unreachable | `BLOCKED`, no SHA |
| `version.json` missing or not JSON | `NOT_PROVEN` |
| bundle does not embed the claimed SHA, SHA not in git, or not on `origin/main` | `NOT_PROVEN` |
| all of the above hold | `PASS` |

The script refuses to write evidence that its own validator rejects, and `npm run test:rc2-3-10b-web-sha` mutates the evidence (short SHA, wrong environment, no bundle match, token in file...) and requires each mutation to be rejected.

Use `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e` as `expected_sha` for the "Cloud smoke (manual, production)" workflow.
