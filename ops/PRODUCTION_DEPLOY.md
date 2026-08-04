# Deploy de produção — o que fazer agora vs após Netlify pago

## Achado (2026-08-04)

Site vivo: `https://singular-meringue-7838cd.netlify.app`

- `longyu.netlify.app` → **404** (não usar como canonical)
- Produção atual **não** serve `robots.txt` / `sitemap.xml` / `og-image.png` (a SPA devolve HTML) → deploy desatualizado em relação à `main` com SEO (`7f34ef0`+)

Isso é consistente com o Turnstile pausado “até o Netlify pago”: sem redeploy de produção, o pacote SEO e a site key não entram no site público.

## Agora (sem pagamento)

1. Canonical SEO aponta para `singular-meringue-7838cd.netlify.app` (PR / `main`)
2. `npm run gate:public-beta` no código local / CI
3. Cadastro real no site vivo (domínio singular-meringue)
4. QA Android/iPhone no mesmo domínio
5. Branch protection com **seu** PAT admin:
   ```bash
   export GITHUB_TOKEN=ghp_...
   node scripts/setup-branch-protection.mjs
   ```
   (token do agente Cloud recebe 403)

## Após pagar Netlify

1. Netlify → **Clear cache and deploy site** (branch `main`)
2. Confirmar:
   ```bash
   curl -sI https://singular-meringue-7838cd.netlify.app/robots.txt | head
   # content-type text/plain (não text/html)
   npm run smoke:production
   ```
3. Restaurar Turnstile (`ops/ENABLE_TURNSTILE.md`)
4. Opcional: criar alias `longyu.netlify.app` → 301 para o principal; só então atualizar `VITE_SITE_URL`

## Não fazer

- Divulgar `longyu.netlify.app` enquanto 404
- Ligar Turnstile no Vault antes do bundle de produção ter a site key
