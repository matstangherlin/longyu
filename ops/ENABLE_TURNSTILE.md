# Ativar Cloudflare Turnstile no cadastro público

O código já valida Turnstile na Edge `create-account` e obtém o token no frontend.
Sem secrets, a verificação é **pulada** (pré-marketing). Com Cloudflare disponível,
ative antes de marketing amplo.

## 1. Criar widget no Cloudflare

1. Dashboard → [Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → Add widget  
   (ou **Set up with Spin**).
2. Nome: `longyu-signup`.
3. Domínios (hostnames):
   - `longyu.com.br`
   - `www.longyu.com.br`
   - `longyu.netlify.app`
   - `singular-meringue-7838cd.netlify.app`
   - `localhost` / `127.0.0.1` (dev)
4. Modo: **Invisible** (o app usa `size: "invisible"`).
5. Copie **Site Key** e **Secret Key**.

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

```bash
# Sem token → deve falhar com captcha_failed (após secret set)
# Com widget no browser em /conta → cadastro retorna mensagem genérica
npm run test:create-account-hardening
```

Nota: o smoke HTTP atual não envia token Turnstile; com secret ativo ele
pode passar a falhar até o fluxo browser gerar token. Use uma conta de teste
no site de produção para validar o caminho feliz.

## Desligar (rollback)

```bash
supabase secrets unset TURNSTILE_SECRET_KEY --project-ref drjcfalvlbbeblmmyhwj
```

Remova `VITE_TURNSTILE_SITE_KEY` do Netlify e redeploy. A Edge volta a pular captcha.
