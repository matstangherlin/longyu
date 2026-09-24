# supabase/pending — código pronto, NÃO aplicado

Arquivos aqui estão **fora** de `supabase/migrations/` de propósito: nenhum
script (`db:apply-api`, `apply-staging-migrations`, rehearsal efêmero) os aplica.

| Arquivo | Remessa | Status |
|---|---|---|
| `rc2-2-11-username-identifier.sql` | RC2.2.11 (username + login por identificador) | `CODE_READY_AWAITING_CLOUD_APPLY` |

Para ativar o login por nome de usuário (owner):

1. Copiar `rc2-2-11-username-identifier.sql` para
   `supabase/migrations/<timestamp>_username_identifier_login.sql`, registrar no
   `docs/backend/migration-manifest.json` e regenerar os contratos
   (`npm run generate:backend-contracts` / fluxo da v489).
2. Aplicar no QA real (#273) e só depois em produção.
3. Adicionar `sign-in-identifier` a `LONGYU_EDGE_FUNCTIONS`
   (`scripts/lib/edge-functions.mjs`) e publicar a função.
4. Definir `VITE_USERNAME_LOGIN_ENABLED=true` no build.
5. Rodar a verificação ao vivo (email path + username path + erro genérico +
   rate limit). Até lá o login por username **não** está certificado.

Garantias do contrato: nunca existe endpoint público `username → email`;
`resolve_login_identity` devolve só o id e só para `service_role`; a função
responde igual para "usuário não existe" e "senha errada".
