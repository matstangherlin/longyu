# RC2.2.20 — evidência física

Pasta para a evidência do QA **físico** (Android real). Nada aqui é gerado por automação.

- Um arquivo por teste: `<testId>-<deviceClass>-<AAAA-MM-DD>.<png|mp4|json>`
  (ex.: `guidedTryAudioDevice-OWNER_DEVICE-2026-10-02.mp4`).
- O JSON exportado de `/qa/device` (botão **Copiar JSON**) vai para
  `docs/release/rc2-2-20-device-matrix.json`.
- **Nunca** commitar: e-mail, senha, código OTP, gravação de voz, token, nome
  completo ou qualquer PII. Screenshot com e-mail precisa ser recortado antes.
- Classes de aparelho: `OWNER_DEVICE`, `SECOND_ANDROID` (só se existir de
  verdade), `PLAY_BUILD`, `DEBUG_DIAGNOSTIC_BUILD`. APK de diagnóstico serve para
  diagnosticar; a certificação final é no build instalado pela Play.

Screenshots automatizados (Playwright) **não** entram aqui: eles são evidência
de WEB/E2E, não de aparelho.
