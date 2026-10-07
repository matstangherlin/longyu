# RC2.3.8 — Provider matrix

| Provider | Button copy | Supabase id | Scopes | Code | Supabase config | Web test | Android test | Status |
|---|---|---|---|---|---|---|---|---|
| Google | Continuar com Google | `google` | default | CODE_READY | disabled | NOT_RUN | NOT_RUN | **PROVIDER_CONFIG_REQUIRED** |
| Apple | Continuar com Apple | `apple` | `name email` | CODE_READY | disabled | NOT_RUN | NOT_RUN | **PROVIDER_CONFIG_REQUIRED** |
| Microsoft | Continuar com Microsoft · *Outlook · Hotmail · Live* | `azure` | `email` | CODE_READY | disabled | NOT_RUN | NOT_RUN | **PROVIDER_CONFIG_REQUIRED** |
| E-mail | (form) | `email` | — | existing | enabled | PASS | existing | VERIFIED |

- Buttons render only for providers listed in `VITE_AUTH_PROVIDERS` (QA override only in seeded/dev sessions). With
  nothing configured the login shows e-mail only — no dead buttons.
- Order: Google, Apple, Microsoft, divider "ou", e-mail. Icon + text, never icon-only. Never "iCloud".
- Provider outage → `providerAvailability(..., outage)` hides that provider; e-mail is always offered.
- No provider is marked PASS: none is configured externally. See `rc2-3-8-owner-actions.md`.
