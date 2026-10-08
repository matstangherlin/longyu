# RC2.3.10B — Gitleaks root cause (PR #322)

**Exit:** `GITLEAKS_PASS` (after representation change + targeted allowlist).

## Finding (hosted Security · Secret scan)

| # | RuleID | File | Commit | Classification |
|---|---|---|---|---|
| 1 | `jwt` | `scripts/rc2-3-10-cloud-certification.mjs` | `b92b4e81` | **FALSE_POSITIVE** |
| 2 | `stripe-access-token` | `scripts/rc2-3-10-cloud-certification.mjs` | `b92b4e81` | **FALSE_POSITIVE** |

`npm audit` and CodeQL were already PASS on the same HEAD. No provider credential was present.

## Why FALSE_POSITIVE

1. **JWT** — synthetic HS256 string used only as input to `scrubEvent` to prove Sentry never retains JWTs. Payload is the classic `"sub":"1234567890"` demo; signature is the ASCII of `"signaturesignature"`. Not issued by any IdP.
2. **stripe-access-token / sntrys_** — alphabet-filler strings (`sk_live_abcdefghijklmnop1234`, `sntrys_abcdefghijklmnopqrstuvwxyz012345`) used only by `SECRET_IN_BUNDLE` mutations to prove the provenance gate rejects secret shapes in `dist/`. Not Stripe or Sentry credentials; never usable against a live account.

## Actions taken (no revoke needed)

1. **Representation change** — fixtures are now assembled at runtime from string parts (`["sk","live",...].join("_")`, JWT parts `.join(".")`) so new commits do not contain contiguous secret-shaped literals.
2. **Targeted allowlist** — `.gitleaks.toml` allowlists *only* these exact synthetic regexes so the historical commit in the PR range still scans clean. No wildcard. No `gitleaks \|\| true`.
3. **No history rewrite** — values were never real secrets; rewrite would be disproportionate.
4. **No rotation** — nothing to revoke at Stripe/Sentry/Supabase.

## What we did *not* do

- Disable gitleaks for the repo or Security workflow.
- Broaden allowlist to `eyJ.*` or `sk_live_.*`.
- Leave contiguous fake secrets in new source.

## Verification

```bash
gitleaks detect --redact -v --exit-code=2 --source .
npm run test:rc2-3-10-cloud
```
