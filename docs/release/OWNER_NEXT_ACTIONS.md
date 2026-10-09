# OWNER_NEXT_ACTIONS — RC2.3.10D (comprimido)

`cloud.certification = BLOCKED`. Agente já fez o que dá sem backup/credencial externa. Só o inevitável:

## FAÇA (ordem)

1. **`OA-BATCH-A-EXECUTE`** — um bloco: `docs/release/OA-BATCH-A-EXECUTE.md`  
   Pré-requisito: backup real (`docs/launch/production-backup-runbook.md`) + `npm run verify:production-backup -- --manifest <fora-do-repo>/…`.  
   Cole no PR a aprovação no formato do doc. Depois merge + Apply Beta Feedback.

2. **`OA-CLOUD-SMOKE-RUN`** — Actions → Cloud smoke → `expected_sha` = SHA web no ar (`ec26ffcb…` até novo `[release]`). Segredos QA já nomeados; não cole valores.

3. **`OA-AUTH-REDIRECT-URLS`** — acrescente (sem apagar) ou rode Configure Supabase Auth com `MERGE-AUTH-REDIRECTS` + SHA:  
   - `https://singular-meringue-7838cd.netlify.app/auth/callback`  
   - `longyu.noba.com://auth/callback`

4. **`OA-TELEMETRY-RETENTION-DECISION`** — A=30d+agregados (recomendado) / B=60 / C=90.

5. **OAuth externos (se quiser no closed beta):** Google e/ou Microsoft no console do provedor. Apple = **BETA_OPTIONAL** (não bloqueia Android closed beta).

6. **Resend domínio existente + SMTP Supabase** — sem comprar domínio. Depois recovery email.

7. **Sentry projeto + DSN** — se quiser ingest real (código já scrub/lazy).

8. **Jev triage v2 (`OA-JEV-TRIAGE-V2-DEPLOY`)** — live ainda é **v1** (sem breaker/dedupe/3s/kill switch). Ler `docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md`. Aprovar com `APPROVE OA-JEV-TRIAGE-V2-DEPLOY`, merge na `main`, workflow `DEPLOY-triage-feedback` + `expected_sha`. Confirme TypeSafe credits (número só). Até lá: `JEV_TRIAGE_LIVE=OWNER_ACTION_REQUIRED`.

9. **Netlify deploy record** (opcional) — confirme publish = `ec26ffc` (agente não tem token Netlify).

10. **Physical Android OAuth** — só para marcar AUTH_* Android PASS.

## NÃO FAÇA

- SQL solto / `db:apply-api` / Deploy Leagues / Stripe live / comprar plano / apagar `_jev_triage_tmp` sem backup / merge #273 antigo.

## Já feito pelo agente (10D)

- Ledger Batch A: `BATCH_A_LEDGER_SAFE_TO_PROCEED`
- `verify:production-backup` + OA pack único
- `MISSING_AND_REACHABLE = 0` (commit-placement local-only até Batch B)
- Snapshots novos sem email
- Batch B placement empacotado (não aplicado)
- Live snapshot 2026-10-09 (36 migrations, triage v1, policy ainda recursiva)
- `gate:rc2-3-10d`

Referências: `docs/reports/rc2-3-10d-closure.md`, `docs/release/launch-blockers.json`.
