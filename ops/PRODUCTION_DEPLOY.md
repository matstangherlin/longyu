# Deploy de produção — o que fazer agora vs após Netlify pago

## Achado (2026-08-04)

Site vivo: `https://singular-meringue-7838cd.netlify.app`

- `longyu.netlify.app` → **404** (não usar como canonical)
- Produção atual **não** serve `robots.txt` / `sitemap.xml` / `og-image.png` (a SPA devolve HTML)
- Bundle de produção ainda usa **`auth.signUp` + upsert em `profiles`**, não a Edge `create-account` da `main`

### Por que o cadastro falha no site vivo

1. `signUp` cria o usuário (trigger `handle_new_user` cria o perfil).
2. Com confirmação de e-mail obrigatória, muitas vezes **não há sessão**.
3. O cliente tenta `profiles.upsert` sem `auth.uid()` → erro:
   `new row violates row-level security policy for table 'profiles'`.

A `main` já corrige isso (Edge `create-account` + RPC `ensure_own_profile`), mas **só vale depois do redeploy Netlify**.

## Agora (sem pagamento / sem redeploy)

1. Canonical SEO → `singular-meringue-7838cd.netlify.app`
2. `npm run gate:public-beta` no código / CI
3. Branch protection (PAT admin do owner)
4. **Não** divulgar cadastro no site vivo até republicar a `main`

## Após pagar Netlify (ou conseguir redeploy)

1. Netlify → **Clear cache and deploy site** (`main`)
2. Confirmar bundle novo:
   ```bash
   # NÃO deve achar auth.signUp no fluxo de createAccount; deve achar create-account
   curl -s https://singular-meringue-7838cd.netlify.app/ | rg -o 'assets/index-[^"]+\.js'
   npm run smoke:production
   ```
3. Aplicar migration `021_ensure_own_profile.sql` no Supabase (se ainda não estiver)
4. Testar cadastro real → e-mail → confirmar → login → 1 lição
5. Restaurar Turnstile (`ops/ENABLE_TURNSTILE.md`)

## Não fazer

- Divulgar `longyu.netlify.app` enquanto 404
- Ligar Turnstile no Vault antes do bundle de produção ter a site key
- Prometer cadastro cloud enquanto o site vivo ainda servir o bundle antigo
