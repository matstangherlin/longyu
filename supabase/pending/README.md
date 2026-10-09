# supabase/pending — código pronto, NÃO aplicado

Arquivos aqui estão **fora** de `supabase/migrations/` de propósito: nenhum
script (`db:apply-api`, `apply-staging-migrations`, rehearsal efêmero) os aplica.

| Arquivo | Remessa | Status |
|---|---|---|
| `rc2-2-11-username-identifier.sql` | RC2.2.11 (username + login por identificador) | `CLOUD_APPLIED_FLAG_OFF`: aplicado em produção em 2026-09-24 (migration remota `rc2_2_11_username_identifier_login`) + Edge `sign-in-identifier` publicada; QA (#273) não; flag do app desligada |
| `rc2-3-10-league-memberships-policy-recursion.sql` (+ `.down.sql`) | RC2.3.10C Batch A | `PACKAGED_NOT_APPLIED`: allowlist em `scripts/lib/production-migration-allowlist.mjs`; readiness `docs/launch/rc2-3-10c-batch-a-ready.json` ainda **BLOCKED** (backup + ledger decision + owner approval) |
| `rc2-3-10-telemetry-retention.sql` | RC2.3.10 | `PENDING`: dry-run cron; precisa `OA-TELEMETRY-RETENTION-DECISION` antes de qualquer pacote |

Estado em 2026-09-24 (RC2.2.13, autorizado pelo owner):

- [x] SQL aplicado em **produção** (MandarimProject) como migration remota
  `rc2_2_11_username_identifier_login` (mesmo corpo deste arquivo). Conferido:
  `resolve_login_identity` e `check_and_record_login_rate` só para
  `service_role`, `claim_own_username` só para `authenticated`, RLS ligada nas
  duas tabelas novas, 80 nomes reservados, índice único e constraint v2.
- [x] Edge `sign-in-identifier` publicada em produção (`verify_jwt = true`).
- [ ] QA (#273): **não** aplicado (projeto inativo, fora do escopo).
- [ ] Promover para `supabase/migrations/` + manifest + contratos: **adiado**
  até a #273 reabrir (mudaria as 52 migrations do candidate congelado e os
  hashes v478/v489).
- [ ] `VITE_USERNAME_LOGIN_ENABLED=true`: **desligado**. Antes de ligar, rodar a
  verificação ao vivo (email path + username path + erro genérico + rate limit).
  Até lá o login por username **não** está certificado.

Garantias do contrato: nunca existe endpoint público `username → email`;
`resolve_login_identity` devolve só o id e só para `service_role`; a função
responde igual para "usuário não existe" e "senha errada".
