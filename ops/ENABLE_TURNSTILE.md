# Ativar Cloudflare Turnstile no cadastro público

Estado (2026-08-04): **ligado em produção**.

- Site key: `VITE_TURNSTILE_SITE_KEY` no `netlify.toml` (contexto production)
- Secret: Vault `TURNSTILE_SECRET_KEY` + RPC `public._edge_get_turnstile_secret()` (service_role)
- Edge `create-account` lê env `TURNSTILE_SECRET_KEY` **ou** o Vault e valida no siteverify
- Probe sem token → `captcha_failed`

## Domínios (sem domínio próprio ainda)

Widget Turnstile só com:

- `singular-meringue-7838cd.netlify.app`
- `longyu.netlify.app`
- `localhost` / `127.0.0.1`

Quando comprar `longyu.com.br`, edite o widget e inclua o domínio.

## Espelhar no Edge Secrets (opcional)

Se tiver `SUPABASE_ACCESS_TOKEN`:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<secret> --project-ref drjcfalvlbbeblmmyhwj
```

A Edge prefere o env; o Vault continua como fallback.

## Redeploy Netlify

Após merge deste PR (site key no `netlify.toml`), rode **Clear cache and deploy**
no Netlify para o front obter o token Turnstile no `/conta`.

## Smoke

```bash
# Sem token → captcha_failed
npm run test:create-account-hardening
```

No browser (após deploy): criar conta em `/conta` deve passar o desafio invisible.

## Desligar (rollback)

```sql
-- remove do Vault
delete from vault.secrets where name = 'TURNSTILE_SECRET_KEY';
```

Remova `VITE_TURNSTILE_SITE_KEY` do `netlify.toml` / Netlify e redeploy.
Opcional: `supabase secrets unset TURNSTILE_SECRET_KEY`.
