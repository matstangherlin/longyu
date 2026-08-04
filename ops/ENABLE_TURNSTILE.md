# Ativar Cloudflare Turnstile no cadastro público

## Estado atual (2026-08-04)

**Temporariamente pausado** até o Netlify pago fazer deploy com a site key.

- Secret renomeado no Vault: `TURNSTILE_SECRET_KEY_PAUSED_UNTIL_NETLIFY`
- Edge sem secret → **não** exige captcha (cadastro funciona)
- Código + site key no `netlify.toml` já estão na `main` (#95)

### Restaurar amanhã (depois de pagar Netlify + deploy)

1. Netlify → **Clear cache and deploy** (confirma que o bundle tem `VITE_TURNSTILE_SITE_KEY`)
2. No SQL Editor do Supabase:
   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'TURNSTILE_SECRET_KEY_PAUSED_UNTIL_NETLIFY'),
     new_name := 'TURNSTILE_SECRET_KEY'
   );
   ```
3. Probe sem token deve voltar a `captcha_failed`.

---

Estado quando ligado:

- Site key: `VITE_TURNSTILE_SITE_KEY` no `netlify.toml` (contexto production)
- Secret: Vault `TURNSTILE_SECRET_KEY` + RPC `public._edge_get_turnstile_secret()` (service_role)
- Edge `create-account` lê env `TURNSTILE_SECRET_KEY` **ou** o Vault e valida no siteverify
- Probe sem token → `captcha_failed`

## Domínios

Widget Turnstile só com:

- `singular-meringue-7838cd.netlify.app` ← **principal (vivo)**
- `longyu.netlify.app` ← só se/quando o alias Netlify existir
- `localhost` / `127.0.0.1`

Quando comprar `longyu.com.br`, edite o widget e inclua o domínio.

## Espelhar no Edge Secrets (opcional)

Se tiver `SUPABASE_ACCESS_TOKEN`:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<secret> --project-ref drjcfalvlbbeblmmyhwj
```

A Edge prefere o env; o Vault continua como fallback.

## Smoke

```bash
# Sem token → captcha_failed (quando ligado)
npm run test:create-account-hardening
```

No browser (após deploy): criar conta em `/conta` deve passar o desafio invisible.

## Desligar (rollback)

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'TURNSTILE_SECRET_KEY'),
  new_name := 'TURNSTILE_SECRET_KEY_PAUSED_UNTIL_NETLIFY'
);
```

Ou delete do Vault. Remova `VITE_TURNSTILE_SITE_KEY` do Netlify e redeploy.
