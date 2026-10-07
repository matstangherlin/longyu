# RC2.3.8 — Owner actions (no secrets in this document)

All secrets go **only** into the Supabase dashboard (Auth → Providers). Never into the repo, `.env` committed
files, the APK or reports.

## 1. Supabase (project MandarimProject)
- Auth → URL Configuration → Redirect URLs: add
  `https://<production host>/auth/callback`, `longyu.noba.com://auth/callback`, and any preview host you test.
- Auth → Providers: enable Google, Apple, Azure (Microsoft) after steps 2–4.
- Auth → settings: decide on **manual linking** (needed for "Vincular" in Conta) and confirm the
  automatic same-verified-e-mail linking policy.

## 2. Google Cloud Console
- OAuth consent screen (external, app name Longyu, support e-mail).
- OAuth client (Web): authorized redirect URI = Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback`.
- Paste client id + secret into Supabase (not here).

## 3. Apple Developer
- App ID with Sign in with Apple; Services ID; return URL = Supabase callback.
- Key (.p8) → generate client secret per Supabase docs; paste into Supabase. Rotate every 6 months.
- Private relay: register the sending domain if you e-mail relay addresses.

## 4. Microsoft Entra (Azure)
- App registration, supported accounts: personal + organizational (or `consumers` for Outlook/Hotmail/Live only).
- Redirect URI = Supabase callback. Add optional claim `xms_edov` (email verified) per Supabase docs.
- Paste application id + secret (+ tenant URL if not `common`) into Supabase.

## 5. Build config
- Set `VITE_AUTH_PROVIDERS=google,apple,azure` (only the configured ones) in Netlify / Android build env.

## 6. Acceptance
Run the OWNER_AUTH_ACCEPTANCE checklist in `rc2-3-8-closure.md`. Use the QA panel (`/qa/device`) "Testar" buttons.
