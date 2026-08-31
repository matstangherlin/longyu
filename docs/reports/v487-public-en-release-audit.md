# V4.8.7 — Public English release surface audit

Audit scope: every user-reachable surface, classified against the public EN
core flow. This is a frontend/localization audit, not release authorization.

Classification:

- `PUBLIC_EN_READY`: usable in English for the public launch flow.
- `PUBLIC_EN_BLOCKER`: substantial Portuguese in the ordinary acquisition,
  learning, account, payment-chrome, support, or error flow.
- `POST_LAUNCH_EN`: reachable but outside the ordinary core flow; explicitly
  deferred without hiding it from the inventory.
- `INTERNAL_ONLY`: not a public learner surface.

| Surface | Classification | EN ready / PT leak | Launch blocker | Remediation |
| --- | --- | --- | --- | --- |
| `/` landing | PUBLIC_EN_READY | Catalog-backed EN chrome | No | None |
| `/comecar`, onboarding, Placement | PUBLIC_EN_READY | EN flow and localized errors | No | None |
| signup/login/recovery/email confirmation | PUBLIC_EN_READY | Auth catalog + localized provider messages | No | None |
| `/finalizar-cadastro` | PUBLIC_EN_READY | Core handoff states localized | No | None |
| Journey `/jornada` | PUBLIC_EN_READY | 113/113 teaching topics READY | No | None |
| topic detail | PUBLIC_EN_READY | Titles/instructions use overlay | No | None |
| LessonPlayer M1–M4 | PUBLIC_EN_READY | 113-topic fail-closed walk: zero missing/leak | No | None |
| Review / mistakes / SRS | PUBLIC_EN_READY | EN display; canonical item identity unchanged | No | None |
| Missions | PUBLIC_EN_READY | Core chrome covered by EN gate | No | None |
| Practice / training | PUBLIC_EN_READY | Core chrome covered by EN gate | No | None |
| Achievements | PUBLIC_EN_READY | Stable IDs with localized display | No | None |
| Profile | PUBLIC_EN_READY | Essential account/progress chrome localized | No | None |
| Account | PUBLIC_EN_READY | Login/session/sync/placement chrome localized | No | None |
| Settings | PUBLIC_EN_READY | Locale, audio, appearance, data controls localized | No | None |
| Pro / payment / paywall chrome | PUBLIC_EN_READY | pt-BR + EN and currency-aware; checkout remains fail-closed | No | No Stripe Live in this wave |
| Business public page | PUBLIC_EN_READY | Public plan/form chrome is bilingual | No | Hosted submission remains independent |
| Feedback / support | PUBLIC_EN_READY | Modal, categories, errors, and status localized | No | None |
| About | PUBLIC_EN_READY | Core beta/support chrome localized | No | None |
| render errors | PUBLIC_EN_READY | Localized ErrorBoundary; progress-preserving recovery | No | None |
| 404 / unknown route | PUBLIC_EN_READY | Added bilingual fail-safe page in V4.8.7 | No | None |
| Friends / referral | PUBLIC_EN_READY | Public/core and cloud-required chrome localized | No | Deep social content follows real backend validation |
| SEO title/meta for core routes | PUBLIC_EN_READY | Locale-aware core metadata | No | PT-keyword marketing routes remain below |
| Privacy/legal body | POST_LAUNCH_EN | Legal body is explicitly marked `data-legal-later` | No | Legal review + authoritative EN translation before claiming full legal parity |
| Hanzi Atlas deep catalog | POST_LAUNCH_EN | Large reference corpus is not part of the core learner flow | No | Dedicated Atlas localization wave; do not mass-translate here |
| Pinyin Lab advanced drills | POST_LAUNCH_EN | Some advanced drill/result copy remains PT | No | Localize in full-product completion; Journey pinyin activities are READY |
| Tone Trainer advanced/peripheral states | POST_LAUNCH_EN | Core unlock/player references are EN; exhaustive lab audit deferred | No | Dedicated peripheral visual/runtime audit |
| Shop cosmetic SKU names/descriptions | POST_LAUNCH_EN | Chrome EN; SKU copy retains `data-commercial-later` | No | Translate remaining commercial catalog in V4.8.8 |
| PT-keyword marketing routes (`/aprender-*`, `/mandarim-para-brasileiros`) | POST_LAUNCH_EN | Brazil SEO content intentionally PT-first | No | Decide EN routing/canonicals in full-product SEO wave |
| Admin feedback | INTERNAL_ONLY | Portuguese admin operations do not face learners | No | None for public EN |
| QA fast path | INTERNAL_ONLY | Preview/dev-only test state | No | Must remain impossible in production |

## Core flow decision

`signup → Placement → Journey → lesson → Review → account → Pro/paywall → support/error`
has no known `PUBLIC_EN_BLOCKER` after the localized 404 fallback was added.

`PUBLIC_EN_CORE_FLOW_READY = PASS`

This does **not** promote `READY_FOR_PUBLIC_BETA`. Auth, sync, payments,
physical-device validation, hosted security, and human release approval remain
independent.

## Remaining PUBLIC_EN_BLOCKERS

None known in the defined core flow. Deferred surfaces above remain visible
work and must not be described as full-product English completion.

