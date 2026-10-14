# RC2.3.10 — Provenance de APK e web

Problema: era possível instalar um APK (ou abrir o site) sem saber se ele representava o código atual. Foi o que aconteceu com o app baixado no #307/#320.

## Contrato (uma identidade, nenhuma segunda fonte)

`scripts/vite-build.mjs` embute no bundle (`VITE_*`) e em `dist/version.json` (que também entra no APK em `assets/public/version.json`):

| Campo | Origem |
|---|---|
| `commitSha` | `VITE_COMMIT_SHA` / `git rev-parse HEAD` (no CI, o head do PR) |
| `curriculumFingerprint` | `journeyFingerprint(root)`: as **mesmas** fontes que os gates hasheiam (`scripts/lib/report-meta.mjs`) |
| `buildChannel` | `dev` \| `internal` \| `closed` \| `production` (Netlify production → `production`; `android-release.yml` passa o canal escolhido; o resto é `dev`) |
| `deviceQaBuild`, `testFixtures` | `VITE_DEVICE_QA`, `VITE_USE_TEST_FIXTURES` |
| `appVersion`, `builtAt`, `environment`, `branch` | já existiam |
| `versionCode` | do APK instalado (`App.getInfo`), não do bundle |

Nada sensível: SHA, fingerprint e canal são públicos.

## `/qa/device › Release truth`

Mostra `BUILD SHA`, `EXPECTED/CERTIFIED SHA` (campo, ou `?expect=<sha>`), `CURRICULUM FINGERPRINT` (build × certificado `RC_BASE_FINGERPRINT`), `VERSION (versionCode)`, `BUILD CHANNEL`, `QA BUILD` e o veredito:

- **`MATCH`**: SHA e fingerprint iguais aos certificados;
- **`MISMATCH`**: `· PHYSICAL_QA_INVALID_WRONG_BUILD`;
- **`UNKNOWN`**: falta SHA esperado/do build; nunca vira `MATCH`.

Gravar **PASS físico** com `expectedSha` diferente do SHA do build é recusado (`PHYSICAL_QA_INVALID_WRONG_BUILD` em `validateDeviceQaResult`).

## Gate automatizado

`npm run validate:apk-provenance` (`provenance --dist <dir> --expect-sha <sha>`):
- `version.json` precisa ter o SHA esperado (`WRONG_SHA`), o fingerprint vivo (`WRONG_FINGERPRINT`) e um canal válido;
- num artefato `production`: `VITE_DEVICE_QA` (`QA_FLAG_IN_PRODUCTION`) e fixtures (`TEST_FIXTURES_IN_PRODUCTION`) reprovam;
- varre todo `.js/.html/.json/.txt/.map` atrás de: JWT `service_role`, `sb_secret_`, conexão Postgres, chave Stripe, chave Resend, token Sentry, host do Jev, nomes de env secretos (`TYPESAFE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS(WORD)`, `SENTRY_AUTH_TOKEN`, `TURNSTILE_SECRET_KEY`, `STRIPE_SECRET_KEY`).

Prova local:
- primeiro rodei sobre o `dist` **antigo** (build anterior desta sessão): `WRONG_SHA` + `ARTIFACT_FINGERPRINT_MISSING` + `ARTIFACT_CHANNEL_MISSING`. É exatamente o problema que o gate existe para pegar;
- depois do build atual: `PASS · sha a47a7b479ba9 · fp 5a64821d0b7d · channel dev · 191 files scanned, no secret shape`.

No CI (`android-build.yml › Provenance do APK`), o APK gerado é **desempacotado** e o gate roda sobre `assets/public`, com `--expect-sha` = head do PR. O artefato precisa provar o próprio SHA.

`TURNSTILE_ALLOW_SKIP` é variável de Edge Function, não do frontend; está coberta por `checkTurnstileFailClosed` (relatório de headers).

## Matriz de provenance (`docs/release/rc2-3-10-cloud-matrix.json › provenance`)

| Surface | SHA | Fingerprint | Canal | Verificado |
|---|---|---|---|---|
| WEB (produção) | desconhecido | desconhecido | production | `OWNER_ACTION_REQUIRED` (`OA-PROD-WEB-SHA`: daqui não alcanço `*.netlify.app` e o Netlify não publica status na `main`) |
| APK (CI debug, head do PR) | head do PR | `5a64821d0b7d` | dev | `NOT_RUN` → `PASS` quando o passo do CI passar |
| AAB (release) | — | — | internal | `NOT_RUN` (`BLOCKED_SIGNING_SECRETS`) |
| Product Truth | `generatedFromSha` | `5a64821d0b7d` | — | `NOT_RUN` |
| QA físico | — | — | — | `OWNER_ACTION_REQUIRED` (`OA-PHYSICAL-PROVENANCE`) |

Nenhuma release é certificada nesta wave (`certifiedSha: null`). Qualquer surface marcada `PASS` com SHA diferente do certificado reprova o gate (`INVALID_RELEASE_EVIDENCE`, testado).

## Mutações (`npm run test:rc2-3-10-cloud`)

SHA errado, fingerprint errado, flag de QA e fixtures em produção, canal ausente, service role / host do Jev / nome de senha SMTP / token Sentry / string de conexão / chave Stripe no bundle, divergência de SHA e fingerprint no app, `UNKNOWN` sem SHA esperado, PASS físico num APK antigo: todas mortas. A anon key pública **não** é sinalizada.
