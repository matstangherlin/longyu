# OWNER_NEXT_ACTIONS — RC2.3.10C (1 página)

Estado: `cloud.certification = BLOCKED`. Batch A (liga) está empacotado e **não aplicado**. Nada abaixo pede senha, chave ou token no chat/PR.

## NÃO FAÇA

- Não rode `npm run db:apply-api` nem SQL solto no editor de produção.
- Não rode **Deploy Leagues** (recusa reaplicar `004_leagues.sql`).
- Não aplique placement / retenção / least-privilege / social / pearl sem o pacote próprio.
- Não redeploye `create-account` antes das migrations de placement.
- Não sobrescreva `claim_mission` / `grant_story_energy` / `grant_lesson_reward` (`KEEP_PROD_BODY`).

## FAÇA AGORA (destravam o APPLY do Batch A)

1. **Backup** (`OA-DATA-EXPORT`, ~20 min). Plano free não tem backup automático. Siga `docs/launch/production-backup-runbook.md`. Guarde criptografado **fora do repo**. No PR #324 cole só: horário UTC, ref `drjcfalvlbbeblmmyhwj`, SHA candidato, contagens por tabela. Pré-voo: `npm run backup:production-preflight -- --dest <pasta fora do repo>` (dry-run).
2. **Decisão de histórico** (`OA-MIGRATION-RECONCILIATION-DECISION`): manter o histórico e tratar o ledger como autoridade (recomendado).
3. **Aprovar Batch A** (`OA-LEAGUE-POLICY-FIX`): `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql`. Revisão: `docs/reports/rc2-3-10b-league-policy-review.md`. Pedido: `docs/launch/rc2-3-10c-batch-a-ready.json`.

Quando 1–3 estiverem no PR, o agente (ou você) atualiza o JSON de readiness para `productionMigrationReady = PASS`, mergeia em `main`, e você roda **Apply Beta Feedback** com:

- `migration_id` = `rc2-3-10-league-memberships-policy-recursion`
- `confirm` = `APPLY-rc2-3-10-league-memberships-policy-recursion`
- `expected_sha` = SHA do merge em `main`
- `project_ref` = `drjcfalvlbbeblmmyhwj`
- environment `production` (aprovação do GitHub)

Sem backup verificado o script sai com `PRODUCTION_MIGRATION_NOT_READY` (exit 6).

## DEPOIS DO BATCH A (nessa ordem)

1. Placement (2 arquivos; o handoff é irreversível sem backup) → deploy `commit-placement` → `finalize-onboarding` → só então `create-account` novo.
2. Retenção: escolha 30/60/90 (`OA-TELEMETRY-RETENTION-DECISION`; recomendado 30 + agregados).
3. Smoke de nuvem com `expected_sha` do web no ar (`ec26ffcb…` até um novo `[release]`).
4. Redirect URLs (se ainda faltarem): acrescente sem apagar — ou rode **Configure Supabase Auth** só com confirm `MERGE-AUTH-REDIRECTS` e SHA esperado (o script agora faz merge, não replace-all).
5. Jev triage v2 **só depois do merge** em `main` (`DEPLOY-triage-feedback`).
6. Demais config (Resend/SMTP/OAuth/Sentry) sem pressa. Monetização congelada (RC2.3.11).

## Já feito pelo agente (sem write em produção)

- Workflows fail-closed; apply single-file allowlistado.
- Gating de social/family/business/pearl no cliente.
- Diff estrutural dos 3 hotfixes de economia → manter corpo de produção.
- SHA web `ec26ffcb…` identificado; headers de segurança lidos.
- Provas estáticas: Jev off no learner; áudio de fala não sobe; tinta hànzì só em memória.

Referências: `docs/reports/rc2-3-10c-closure.md`, `docs/launch/rc2-3-10c-batch-a-ready.json`.
