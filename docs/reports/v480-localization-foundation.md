# V4.8.0 — Localization foundation (pt-BR + English)

Frontend/product i18n. **PR #208 stays paused.** No MandarimProject writes,
no hosted migrations, no Edge deploys.

Base: `origin/main` (`3223d4379b5ab4af118a8d88773186e965c504b5` at branch creation).

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

## Scoreboard

Filled from live commands on this PR. `NOT_RUN` until the gate command runs.

| Gate | Result | Evidence |
| --- | --- | --- |
| I18N_RUNTIME_READY | NOT_RUN | `src/i18n/*`, `npm run test:i18n` |
| PT_BR_CATALOG_READY | NOT_RUN | `src/locales/pt-BR.ts` extracts current chrome copy |
| EN_CATALOG_READY | NOT_RUN | `src/locales/en.ts` natural product English |
| LANGUAGE_SWITCHER_READY | NOT_RUN | Settings + landing + marketing `<select>` |
| LOCALE_PERSISTENCE_READY | NOT_RUN | `longyu:interface-locale`; e2e reload |
| HTML_LANG_READY | NOT_RUN | `<html lang>` + `data-interface-locale` |
| KEY_PARITY_READY | NOT_RUN | `npm run validate:i18n` |
| APP_SHELL_EN_READY | NOT_RUN | nav / top bar / tab bar / errors |
| AUTH_EN_READY | NOT_RUN | login / reset / confirm + error mapper |
| SETTINGS_EN_READY | NOT_RUN | Language ≠ “I am learning Mandarin” |
| PEDAGOGICAL_LOCALIZATION_CONTRACT_READY | NOT_RUN | `src/i18n/pedagogy.ts` |

## Chinese canonical identity

Unchanged: hanzi, pinyin, tone marks, audio identity, lexical ids, SRS target
ids, lesson target ids. Reload is **not** required to switch UI language.

## Next waves

- V4.8.1 Onboarding + Placement EN
- V4.8.2 First 20 Journey topics EN
- V4.8.3+ remaining Journey overlays

#208 backup/apply remains a hard gate before closed beta / hosted onboarding V2
/ production backend upgrade.
