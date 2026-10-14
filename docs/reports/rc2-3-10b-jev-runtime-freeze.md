# RC2.3.10B - Jev learner runtime freeze (static proof)

**Result: `PASS`.** No learner device (web, PWA or Android) contains the TypeSafe/Jev host, key name or call helper. Evidence: `docs/launch/rc2-3-10b-static-proofs.json` (`JEV_LEARNER_RUNTIME_FREEZE`). Re-run: `npm run proofs:rc2-3-10b-static`, check: `npm run validate:rc2-3-10b-static`.

The host is `api.typesafe.ai`; the only place it exists is `supabase/functions/_shared/jev.ts`, reachable only from the `triage-feedback` Edge Function (feedback triage, server side) and from two offline audit scripts (`scripts/jev-copy-audit.mjs`, `scripts/jev-evidence-audit.mjs`).

## Checks

| Id | Claim | Result |
|---|---|---|
| J1 | Pattern `typesafe.ai`, `systemone`, `TYPESAFE_API_KEY`, `VITE_TYPESAFE`, `VITE_JEV`, `askJev`, `_shared/jev`, `jevAllowed(` has zero hits in `src/`, `public/`, `index.html`, `capacitor.config.ts`, `vite.config.ts`, `netlify.toml`, `nginx.conf`, Android `java/`, `res/`, `AndroidManifest.xml`, `build.gradle`, `.env.example` (tests excluded) | PASS |
| J2 | `.env.example` declares no `VITE_TYPESAFE*`/`VITE_JEV*` | PASS |
| J3 | No Edge Function other than `triage-feedback` imports/calls the Jev helper, so no learner-facing function can reach the host | PASS (server-side references: `_shared/jev.ts`, `triage-feedback/index.ts`) |
| J4 | Kill switch defaults off: `JEV_RUNTIME_ENABLED: false` in `supabase/functions/_shared/budgetPolicy.ts` | PASS |
| J5 | The web CSP `connect-src` in `netlify.toml` does not allow the host, so a browser could not call it even if code tried | PASS |

The word "TypeSafe" appears once in client code, as a comment in `src/services/feedbackService.ts` (`Triagem TypeSafe Jev (Edge triage-feedback)`), next to a type field that holds the server's triage result. It is not a host, key or call.

## Built artifacts

| Artifact | Result |
|---|---|
| Local build of this branch (`node scripts/vite-build.mjs`, build SHA `ddafc071`): 194 text files, 175 JS chunks | 0 hits for host/key/helper |
| Live production bundle (served SHA `ec26ffcb`): entry + 166 referenced chunks fetched, 167 scanned, 0 unfetchable | 0 hits |

The live check is also in `docs/launch/rc2-3-10b-static-proofs.json` (`artifactScans`). The HTML fallback of a missing chunk was excluded so a 404 cannot count as a clean scan.

## Mutation check

`npm run test:rc2-3-10b-static` plants the host in a client file, an `askJev` import in a learner Edge Function, `JEV_RUNTIME_ENABLED: true`, and a CSP that allows the host; each must flip the matching check to `FAIL`. All are caught.

## Not covered

- An installed APK was not unpacked (none exists in this environment). Android ships the same `dist/` through Capacitor, which the local-build scan covers, plus the native Java sources, which the source scan covers.
- This proves the learner path cannot call Jev. It does not prove the server-side `triage-feedback` guardrails; that is `JEV_SERVER_TRIAGE_PASS` (owner step `OA-JEV-CONSOLE-CHECK`) and the old deployed version 1 is still unproven.
- Feature `JEV_STRUGGLE*` flags are covered by the existing `checkJevStruggleOff` gate, not repeated here.
