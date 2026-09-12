# RC1 — Manual runbook

Automation does not replace this document. Do not mark a checkbox here
from CI, Playwright, or a cloud agent.

**Current verdict: NO-GO.**

Identity to cite in every note:

- Freeze: `RC1`
- Fingerprint: `38e70062857d`
- `main` after #254: `c4441b68ae2388027d72e3af748417ef7caf2bb6`
- App version: `0.2.0-beta.1`

## 0. After the hotfix deploy

- [ ] Production is the #254 build, not a stale preview
- [ ] Close **all** Longyu tabs (old service worker will keep an old `index.html`)
- [ ] Hard refresh / clear site data on the device under test
- [ ] `/jornada` renders with a real account and with an empty local persist
- [ ] Confirm the old “Algo saiu do prumo” screenshot path no longer reproduces

## 1. Stripe

`npm run test:stripe` fails closed without `sk_test_` credentials. That
failure is **not** a pass. Live keys never enter `VITE_*`.

- [ ] Checkout Session in Stripe **Test Mode** on a real publishable key
- [ ] Webhook `checkout.session.completed` updates entitlement
- [ ] Customer portal / cancel path
- [ ] **Live** mode rehearsal only after Test Mode is real — required for GO

Record evidence path in `docs/release/rc1-operational-checks.json` →
`stripe_live` only when a human watched the Dashboard objects.

## 2. Real devices

Emulation (Pixel 5 / iPhone 13 in Playwright) does not count.

- [ ] Android Chrome: first lesson, CTA with keyboard open, PWA install, offline
- [ ] iPhone Safari: same path, safe-area, Add to Home Screen
- [ ] Hard-refresh after deploy on both

## 3. Cloud auth and sync

- [ ] New email signup (real inbox)
- [ ] Login on a second device
- [ ] Progress created on device A appears on device B without clobber
- [ ] Logout clears `serverIsPro`

## 4. Feedback backend

- [ ] In-app “reportar problema” creates a row a human can open
- [ ] No PII beyond what the form asked for
- [ ] `/admin/feedback` (if used) matches the environment label

## 5. Rollback drill

- [ ] Identify the previous Netlify production deploy
- [ ] Restore it (or a documented one-click rollback)
- [ ] Confirm `/jornada` still loads and local progress is not wiped
- [ ] Write the deploy IDs and time window in the evidence file

## 6. 134-lesson crawl (human spot-check)

`npx playwright test e2e/rc1-lesson-crawler.spec.ts --project=chromium`
opens every lesson’s first step. It does **not** finish the lessons.

Humans still spot-check:

- [ ] L1, a mid-Journey review, a premium lesson, `p6-saude`, `p7-china-survival`
- [ ] First step is the authored kind, not a crash card
- [ ] Sticky CTA is reachable at 390px

## 7. Freeze discipline

While `CURRICULUM_FREEZE=RC1`:

- Do not add lessons, chunks, characters, or arcs
- Do not retarget `RC_BASE_FINGERPRINT` without a written BLOCKER
- Keep health plans as `saudeSurvivalPlanFor` / `saudePlan`

## 8. When this becomes GO

Only a human sets `verdict` to `GO` in `rc1-operational-checks.json`, and
only after every check is `true` with an evidence file that exists in the
repo or a linked ops note. `validate:release-candidate` will reject a
fake GO.
