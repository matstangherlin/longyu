# RC2.2.19 — Password recovery email template (OWNER ACTION REQUIRED)

Status: `RECOVERY_TEMPLATE_CODE_READY`. The `OWNER_APPLIED` and `PHYSICALLY_VERIFIED` fields in
`docs/release/rc2-2-19-manifest.json` stay `NOT_RUN` until the owner does the steps below.

The app now resets the password **inside the app** using a 6-digit code
(`verifyOtp({ type: "recovery" })`) instead of relying only on the email link. The link opens
in the phone's browser, not in the app. The code only arrives if the Supabase
"Reset Password" email template includes `{{ .Token }}`.

This repository **does not** change the production email template, `supabase/config.toml` or any
project setting. Nothing here runs against Supabase.

## Owner steps

1. Supabase Dashboard → the **production beta** project → Authentication → Emails → **Reset Password**.
2. Paste the body of `supabase/templates/recovery.html` (it keeps `{{ .ConfirmationURL }}`, so
   the old link keeps working).
3. Save. Do this only in the project the owner chooses. It does not touch #273 / the QA candidate.
4. On a physical Android phone with the Play build:
   Login → "Esqueci minha senha" → email → receive the code → type it → new password → Login.
5. Record the evidence in `docs/release/android-physical-qa.json`
   (`passwordRecoveryOtpDevice`), then set `recoveryTemplate.ownerApplied` and
   `recoveryTemplate.physicallyVerified` in the RC2.2.19 manifest.

## Privacy

- Same message whether or not the email exists:
  "Se este email estiver cadastrado, enviaremos as instruções."
- The code is never stored, logged, sent to analytics or put in a URL; it lives only in the
  form state and is cleared after use.
