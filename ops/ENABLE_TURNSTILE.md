# Ativar Cloudflare Turnstile no cadastro público

O código já valida Turnstile na Edge `create-account` e obtém o token no frontend.
Sem secrets, a verificação é **pulada** (pré-marketing).

## Domínios (sem domínio próprio ainda)

O site público está no Netlify. No widget Turnstile use **somente**:

- `singular-meringue-7838cd.netlify.app`
- `longyu.netlify.app` (se o alias existir)
- `localhost`
- `127.0.0.1`

**Não** adicione `longyu.com.br` até comprar e apontar o DNS.
Depois de comprar o domínio, edite o widget e inclua `longyu.com.br` / `www.longyu.com.br`.

## 1. Criar widget no Cloudflare

1. Abra [Turnstile neste account](https://dash.cloudflare.com/078363b269748bdf721535c08b1e37ea/turnstile).
2. **Add widget**.
3. Nome: `longyu-signup`.
4. Modo: **Invisible**.
5. Hostnames: a lista Netlify acima.
6. Create → copie **Site Key** e **Secret Key**.

## 2. Secret na Edge (Supabase)

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<secret> --project-ref drjcfalvlbbeblmmyhwj
```

Com o secret definido, requests **sem** token válido passam a retornar `captcha_failed`.

## 3. Site Key no Netlify (build)

Production (e local `.env.local` se for testar):

```text
VITE_TURNSTILE_SITE_KEY=<sitekey>
```

Netlify → Site settings → Environment variables → Add (contexto **production**).
Depois: **Clear cache and deploy**.

## 4. Smoke

No site Netlify, criar conta em `/conta` (Turnstile invisible no submit).
Cadastro deve retornar a mensagem genérica de confirmação por e-mail.

```bash
# Probe HTTP (sem token) — com secret ativo espera captcha_failed ou rate_limited
npm run test:create-account-hardening
```

## Desligar (rollback)

```bash
supabase secrets unset TURNSTILE_SECRET_KEY --project-ref drjcfalvlbbeblmmyhwj
```

Remova `VITE_TURNSTILE_SITE_KEY` do Netlify e redeploy. A Edge volta a pular captcha.
