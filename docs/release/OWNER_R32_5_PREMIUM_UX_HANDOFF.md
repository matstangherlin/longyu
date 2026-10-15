# Owner handoff — RC2.3.13R.3.2.5 Premium UX Closure

Wave: RC2.3.13R.3.2.5 · branch `claude/journey-svg-storytelling-7amwba`
learnerRuntimeSha: 5a9a8ab1cdde2ba3512fc2844366329b64265f44 · fingerprint 29bb02ec0336

## USE THIS APK

**NOT_BUILT yet.** ONE Device-QA APK is minted only after exact-head hosted green
(Chromium, Firefox, WebKit, Android foundation + runtime). Its SHA256 and
provenance (workflow run, artifact id) will be written here and in
`docs/release/rc2-3-13r3-2-5-certification.json`.

## DO NOT USE

These APKs predate the current runtime (stale for R.3.2.3, R.3.2.4 and R.3.2.5):

- `fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af`
- `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8`

## What to judge on the phone

Open `/qa/device` › **Premium UX closure**. Its previews are local only and
change nothing.

1. Surfaces: one "do this now" card per screen. Cards are calm, nothing glows.
2. Buttons: a disabled button is grey but readable. A loading button keeps its
   colour and shows a spinner.
3. Verdicts carry a check or an X, never colour alone.
4. Chest: press, lid, light, rewards, in that order and once (~0.8 s). Under
   reduced motion it is instant. A double tap opens one chest.
5. Offline: lessons show one small "Sem conexão" line. Conta says "salvo neste
   aparelho".
6. Errors offer "Tentar de novo". An empty Review offers the Journey.
7. Keyboard: the TabBar hides while typing. Fields do not zoom.
8. TalkBack: rewards are announced. Guide lines are read once.

Physical status stays NOT_RUN until you run it. `LONGYU_UI_UX_FREEZE` becomes
`OWNER_ACCEPTED_R325` only after you accept this APK on a device. Public Beta
and Play remain HOLD.
