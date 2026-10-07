# RC2.3.8 — Closure: Account Access, Social Identity & Progress Claim

## Status matrix

| Area | Status |
|---|---|
| Provider registry + login UI (Google, Apple, Microsoft, ou, e-mail) | CODE_READY · WEB_E2E_PASS (QA override) |
| Google / Apple / Microsoft real sign-in | **PROVIDER_CONFIG_REQUIRED / OWNER_ACTION_REQUIRED** |
| E-mail auth | VERIFIED (unchanged) |
| Callback router, PKCE, allowlist, dedupe, timeout | CODE_READY · gate + E2E PASS |
| Android deep link (cold/warm) | CODE_READY · device NOT_RUN |
| Progress claim (6 cases, idempotent, per-field policy) | CODE_READY · gate PASS |
| Evidence merge + mastery re-derivation | CODE_READY · gate PASS |
| Identity linking / unlink | CODE_READY · manual linking OWNER_ACTION_REQUIRED |
| Storage namespaces + migration | CODE_READY · gate PASS |
| Offline logout | CODE_READY |
| Secret scan (src/dist/android assets) | PASS |
| Auth QA panel | CODE_READY |
| `gate:rc2-3-8-auth-identity` | 19/19 mutations killed (≥18 required) |
| E2E `rc2-3-8-auth-identity.spec.ts` | 9/9 PASS (360/375/390) |
| Jev in learner runtime / auth | not enabled (`JEV_RUNTIME_ENABLED=false`) |

WEB_PASS ≠ OWNER_UX_ACCEPTANCE. No provider is reported PASS without external configuration.

## OWNER_AUTH_ACCEPTANCE checklist

- [ ] Each provider: new user → lands in Jornada with a profile.
- [ ] Each provider: cancel → "Acesso cancelado." with two exits.
- [ ] Anonymous progress then social login → claim prompt; "Salvar na conta" keeps lessons/evidence; repeat login does not duplicate.
- [ ] "Agora não" → cloud progress shown, local progress parked (not lost).
- [ ] Conta → Métodos de acesso: link second provider; remove allowed only with ≥ 2.
- [ ] Provider already on another account → "Este método já está ligado a outra conta."
- [ ] Apple "Hide my email" → shown as "e-mail oculto pela Apple".
- [ ] Android: cold start and warm start callbacks; back from browser.
- [ ] Logout → switch account → no data from previous account.
- [ ] Offline logout works.

## Next
- LAB-B Struggle-Aware Guidance (roadmap, `docs/roadmap/lab-b-struggle-aware-guidance.md`) → RC2.4.2.
- RC2.3.9 Stack Convergence.
