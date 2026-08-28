# V4.8.0 localization audit

Visible-string inventory for the first i18n wave. This is a classification,
not a dump of every pedagogical line in 466 sessions.

Generated against `origin/main` plus this PR. Default interface locale remains
**pt-BR**. Target language remains **zh-CN**.

## Classes

| Class | Meaning |
| --- | --- |
| `MIGRATED` | Wired to `t()` / catalogs in this remessa. |
| `PEDAGOGICAL_LATER` | Lesson/instruction copy. Contract only in V4.8.0. |
| `TECHNICAL` | Logs, diagnostics, code identifiers, admin internals. |
| `INTENTIONALLY_CHINESE` | Hanzi, pinyin, 龙语, spoken Mandarin. |

## MIGRATED (V4.8.0)

| Surface | Files |
| --- | --- |
| App shell nav / sidebar / tab bar / top bar | `src/components/layout/nav.tsx`, `Sidebar.tsx`, `TabBar.tsx`, `TopBar.tsx` |
| Loading / error / PWA banner | `PageFallback.tsx`, `ErrorBoundary.tsx`, `PwaUpdateBanner.tsx`, `LoadingState` / `ErrorState` |
| Auth screens | `LoginPage`, `CloudLoginForm`, `ForgotPasswordPage`, `ResetPasswordPage`, `ConfirmEmailPage` |
| Known auth/backend errors | `src/i18n/errors.ts` maps PT + common Supabase EN |
| Settings language + headers | `SettingsPage.tsx` Language vs “I am learning Mandarin” |
| Settings chrome (theme, display, audio, privacy, Pro blurbs) | `SettingsPage.tsx` full first-wave copy via `t()` |
| Consent modal / EngineGate / paywall chrome | `TelemetryConsentModal.tsx`, `EngineGate.tsx`, `ProPaywall.tsx` buttons/footnotes |
| Marketing shell | `LandingPage.tsx`, `PublicMarketingLayout.tsx` CTAs/header/footer |
| Pro shell | `ProPage.tsx` headline, CTAs, plan names (feature matrix still PT) |
| More hub | `MorePage.tsx` titles/descriptions |
| Journey chrome | Continue / first lesson / completed / phase·unit labels; Offline + streak aria |
| Language switcher | `LanguageSwitcher` on landing, marketing, settings |

## PEDAGOGICAL_LATER

Leave for V4.8.1+ (onboarding/placement) and V4.8.2+ (Journey overlays).

- `src/data/journey.ts` lesson titles, intros, unit goals
- `LessonPlayer.tsx` activity chrome (`Confirmar`, `Entendi`, `Preparando atividades`)
- `src/data/vocabulary.ts` `meaningPt` / `notePt`
- `src/data/gloss.ts`, chunks, Atlas meanings
- Placement questions (`src/lib/placement/questions.ts`)
- Onboarding funnel copy (`ComecarPage.tsx`, `onboardingCopy.ts`)
- Tone trainer / pinyin lab / error diagnosis (source-language specific)
- Conversation scenes instruction text
- Review session labels (`reviewSessionLabel`)
- Plan feature matrix (`src/data/planFeatures.ts`)
- Missions/achievements bodies
- SEO article bodies (`src/lib/seo.ts` public pages)

Do **not** duplicate as `lesson-001-en.ts`. Use `LocalizedText` overlays
(`src/i18n/pedagogy.ts`).

## TECHNICAL

- Console diagnostics, `recordClientDiagnostic`, correlation ids
- Store persist keys, route paths (`/jornada`, `/revisao`)
- SQL / RPC / Edge function identifiers
- `BACKEND_UNAVAILABLE_MESSAGE` constant (display is mapped; services still return PT)
- QA / admin feedback inbox labels beyond the More hub entry
- `toLocaleLowerCase("pt-BR")` used as **answer matching**, not UI copy

## INTENTIONALLY_CHINESE

- Hanzi / pinyin / tone / audio ids / lexical and SRS target ids
- Landing demo `你好` `nǐ hǎo` / `谢谢` `xièxie` (gloss `olá`/`hello` is UI)
- Product names `Longyu` and `龙语`
- `COURSE_PROFILE.targetLanguage.nativeName` (`中文`)
- `MandarinText` `data-hanzi` / `data-pinyin`

## Out of this remessa

- `/en/...` marketing SEO routing
- Cloud write of `interface_locale` (adapter is local-only until #208)
- Inferring language from `country === "BR"`
- Translating all 466 Journey sessions
