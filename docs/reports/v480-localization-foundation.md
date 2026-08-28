# V4.8.0 — Localization foundation (pt-BR + English)

Frontend/product i18n. **PR #208 stays paused.** No MandarimProject writes,
no hosted migrations, no Edge deploys.

Base: `origin/main` (`3223d4379b5ab4af118a8d88773186e965c504b5` at branch creation;
still current when this branch was cut).

HEAD of this remessa: `cursor/v480-localization-foundation-3618` (see latest commit on the PR).

## Architecture

```
Chinese canonical content (zh-CN)
  hanzi · pinyin · audio · tone · lexical / SRS ids
        +
localized instructional / interface layer
  pt-BR (default) · en
```

Country ≠ language. `launchLocaleFields()` still ignores country. The UI locale
is **not** stored in the pedagogical Zustand persist (store version **20**).

Fallback: stored preference → local `longyu:interface-locale` → `pt-BR`.
Cloud adapter is local today; post-#208 it can write `interface_locale`.

No `/en/...` routes. Authenticated app is preference-based.

Reload is **not** required to switch UI language. React subscribers +
`document.documentElement.lang` update in place.

## Scoreboard

Filled from live commands on this PR (2026-08-28).

| Gate | Result | Evidence |
| --- | --- | --- |
| I18N_RUNTIME_READY | **PASS** | `src/i18n/*`; `npm run test:i18n` — default pt-BR, switch en, persist reload, unsupported → pt-BR, no `country === "BR"`, no `navigator.language` |
| PT_BR_CATALOG_READY | **PASS** | `src/locales/pt-BR.ts` extracts current chrome copy (shell/auth/settings/errors/pro/marketing) |
| EN_CATALOG_READY | **PASS** | `src/locales/en.ts` natural product English; glossary `docs/localization/glossary-en.md` |
| LANGUAGE_SWITCHER_READY | **PASS** | Settings + landing + marketing `<select data-testid="interface-locale-select">`; e2e switcher test |
| LOCALE_PERSISTENCE_READY | **PASS** | `longyu:interface-locale` outside Zustand; e2e reload keeps `lang=en`; store version still **20** |
| HTML_LANG_READY | **PASS** | `test:i18n` asserts `document.documentElement.lang`; e2e `html[lang=pt-BR\|en]` |
| KEY_PARITY_READY | **PASS** | `npm run validate:i18n` — 431 keys, same tree, no empty / `[object Object]`, namespaces gated |
| APP_SHELL_EN_READY | **PASS** | e2e Journey EN nav `Main` / `Journey`; TopBar/TabBar/Sidebar use `t()`; landing PT+EN smokes |
| AUTH_EN_READY | **PASS** | e2e `/login` EN: `Sign in`, `Forgot password`, no `Entrar na conta`; `localizeUserMessage()` |
| SETTINGS_EN_READY | **PASS** | e2e Language vs “I am learning Mandarin”; Theme / How to see Mandarin / Privacy and data; target card stays `zh-CN` / `中文` |
| PEDAGOGICAL_LOCALIZATION_CONTRACT_READY | **PASS** | `src/i18n/pedagogy.ts` `LocalizedText` / overlays; `test:i18n` canonical vs instruction fields |

**Accept:** all eleven gates PASS. Chinese canonical identity unchanged.

## Gates run

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS (after final UI wiring) |
| `npm run validate:i18n` | PASS (431 keys) |
| `npm run test:i18n` | PASS |
| `npm run test:brazil-beta-readiness` | PASS |
| `npm run test:rc-hardening` | PASS |
| Remaining `validate:beta` chain (cloud-first-auth → seo / security / plans / economy / qa-fast-path) | PASS in split batches; pedagogical generators unchanged |
| `npm run build` | PASS |
| Playwright `e2e/i18n-shell.spec.ts` chromium | PASS (6); EN settings asserts Theme / How to see Mandarin / Privacy and data |
| Playwright `e2e/smoke.spec.ts` + `e2e/auth-surface.spec.ts` chromium | PASS |

## Chinese canonical identity

Unchanged: hanzi, pinyin, tone marks, audio identity, lexical ids, SRS target
ids, lesson target ids. Landing demo `你好` / `nǐ hǎo` stays the same object
in pt-BR and en (gloss `olá` / `hello` is the localizable layer).

## Out of scope (as specified)

- PR #208 apply / MandarimProject writes / Edge deploys / RLS / Stripe
- Translating 466 Journey sessions
- `/en/...` marketing SEO routing
- Inferring language from country
- Cloud write of `interface_locale`

## Next waves

- V4.8.1 Onboarding + Placement EN
- V4.8.2 First 20 Journey topics EN
- V4.8.3+ remaining Journey overlays

#208 backup/apply remains a hard gate before closed beta / hosted onboarding V2
/ production backend upgrade.
