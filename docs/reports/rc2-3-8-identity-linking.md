# RC2.3.8 — Identity linking

- Linking uses Supabase's official mechanism only: `linkIdentity({provider})` from a signed-in session.
  **Never by e-mail alone** in app code.
- Supabase **manual linking** is beta and must be enabled by the owner (Auth → settings). Until then:
  OWNER_ACTION_REQUIRED.
- Supabase **automatic linking** links a new OAuth identity to an existing user with the *same verified e-mail*,
  server-side. This is an **owner decision** (documented, not changed here).
- Conflict (identity already belongs to another user) → `AuthError{category:"CONFLICT"}` →
  **"Este método já está ligado a outra conta."** No silent merge, no merge button.
- Unlink: `unlinkIdentity` only when ≥ 2 identities (`canUnlink`); last method can never be removed
  (`ACCOUNT_MUST_REMAIN_RECOVERABLE`).
- Apple private relay (`@privaterelay.appleid.com`) shown as "e-mail oculto pela Apple".
- Provider profile (name/avatar) ≠ Longyu profile: `ensure_own_profile` only fills a suggested name when the
  profile is new; it never overwrites the learner's chosen name.

## Future account-merge contract (not implemented)

Two existing Longyu accounts would merge only via a server-side, audited, authenticated-on-both-sides flow
with the same per-field policy as progress claim. Not in this wave.
