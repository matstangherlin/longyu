# Ativar Cloudflare Turnstile no cadastro público

## Estado atual (2026-08-07)

**Ligado em produção.**

- Site key no bundle Netlify (`VITE_TURNSTILE_SITE_KEY`)
- Secret no Vault: `TURNSTILE_SECRET_KEY` (restaurado)
- Edge `create-account` exige siteverify → probe sem token = `captcha_failed`
- App obtém token via `getTurnstileToken()`: widget **Managed** (`size: normal`, `appearance: interaction-only`) — a API client não aceita mais `size: invisible`

## Tipo do widget no dashboard Cloudflare

Use **Managed** (recomendado). A site key de widget Invisible antigo ainda funciona,
mas o client só configura `size: normal|flexible|compact` (a opção `size: invisible`
foi removida da API).

## Domínios do widget

- `singular-meringue-7838cd.netlify.app` ← principal
- `longyu.netlify.app` ← se/quando o alias existir
- `localhost` / `127.0.0.1`

Quando comprar `longyu.com.br`, edite o widget e inclua o domínio.

## Pausar (rollback)

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'TURNSTILE_SECRET_KEY'),
  new_name := 'TURNSTILE_SECRET_KEY_PAUSED_UNTIL_NETLIFY'
);
```

## Restaurar

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'TURNSTILE_SECRET_KEY_PAUSED_UNTIL_NETLIFY'),
  new_name := 'TURNSTILE_SECRET_KEY'
);
```

## Espelhar no Edge Secrets (opcional)

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<secret> --project-ref drjcfalvlbbeblmmyhwj
```

## Smoke

```bash
# Sem token → captcha_failed
npm run test:create-account-hardening
```

No browser (humano): `/conta` → criar conta → mensagem genérica de confirmação.
