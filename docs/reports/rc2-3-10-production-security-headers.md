# RC2.3.10 — Headers de segurança, rate limits, Turnstile e abuso

| Gate | Status |
|---|---|
| `SECURITY_HEADERS_PASS` | **NOT_RUN**: config auditada; headers ao vivo exigem o `cloud-smoke` (o host `*.netlify.app` está bloqueado nesta sessão) |
| `RATE_LIMIT_PASS` | **OWNER_ACTION_REQUIRED** (`OA-AUTH-RATE-LIMITS-READ`) |
| `TURNSTILE_PASS` | **OWNER_ACTION_REQUIRED** (`OA-EDGE-SECRET-NAMES`) |

## Headers (`netlify.toml`, `for = "/*"`)

| Header | Valor | Avaliação |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`; `script-src 'self'` + hash + Stripe + Turnstile; `script-src-attr 'none'`; `connect-src 'self'` + `*.supabase.co` (https/wss) + Stripe + `*.netlify.app` + Turnstile | Bom. `style-src 'unsafe-inline'` já existia (não ampliado). Sentry **não** foi adicionado (sem host definido). |
| `X-Frame-Options` | `DENY` | ok (e `frame-ancestors 'none'`) |
| `X-Content-Type-Options` | `nosniff` | ok |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ok |
| `Permissions-Policy` | `microphone=(self), camera=(), geolocation=()` | ok: microfone só no próprio site |
| `Strict-Transport-Security` | **ausente** na config | Recomendação: `max-age=31536000; includeSubDomains` só depois que o domínio final estiver fixo. Hoje o site está em `*.netlify.app`, que o Netlify já serve via HTTPS. Decisão explícita: **não adicionar nesta wave** (sem domínio próprio, `includeSubDomains`/preload seriam prematuros). |

O `cloud-smoke` (passo `security_headers`) verifica `frame-ancestors 'none'`, `nosniff`, microfone `self` e registra a presença de HSTS na URL real.

## Rate limits e anti-abuso (produção, leitura 2026-10-08)

| Controle | Evidência |
|---|---|
| Signup | `create-account` → `check_and_record_signup_rate(ip_hash, email_hash)` (e-mail canonicalizado: plus-address e pontos do Gmail); tabela `signup_rate_events` |
| Login por username | `sign-in-identifier` + `check_and_record_login_rate`; tabela `login_rate_events` |
| Ingestão anônima | `issue-anon-ingestion-session` + `beta_anon_consume_ingestion_quota` (por origem e global); sessões com expiração |
| Feedback / telemetria | `beta_feedback_rate_limited`, `beta_pedagogy_event_rate_limited`, `…_type_rate_limited` |
| Economia | `economy_anti_cheat_qi`, recompensas uma vez por lição/missão no servidor (`grant_lesson_reward`, `claim_mission`) |
| Auth (dashboard) | limites de e-mail/OTP/verificação **não legíveis** pelo agente → `OA-AUTH-RATE-LIMITS-READ` |
| Senha vazada | advisor: **desligado** → `OA-AUTH-RATE-LIMITS-READ` |

## Turnstile

- O segredo existe no Vault (`TURNSTILE_SECRET_KEY`, só o nome lido).
- `create-account` falha fechado: sem segredo → `captcha_unavailable`; o skip só acontece com `TURNSTILE_ALLOW_SKIP === "1"`.
- **Garantia testada** (`checkTurnstileFailClosed`): nenhuma config de produção (`netlify.toml`, `.env.production`, `supabase/config.toml`, workflows que miram o projeto de produção ou fazem deploy/release) define `TURNSTILE_ALLOW_SKIP=1`. O único uso é o backend efêmero de teste (`backend-contract.yml`), que não é produção. Há mutações para "skip em config de produção" e "não falha fechado".
- O que falta: confirmar que `TURNSTILE_ALLOW_SKIP` **não existe** entre os secrets das Edge Functions de produção. O MCP não lista secrets → `OA-EDGE-SECRET-NAMES`.
