# RC2.3.10 — Rollback drill

**Gate `NETLIFY_ROLLBACK_PASS` / `ROLLBACK_PASS` = `NOT_RUN`.**

Esta sessão não alcança o Netlify (o egress bloqueia `*.netlify.app` e não há conector Netlify). Não existe evidência de um rollback executado, então o gate **não** é marcado.

## Drill do frontend (sem tocar dados): `OA-ROLLBACK-DRILL`

1. Netlify → site `singular-meringue-7838cd` → Deploys: anote o deploy publicado e abra `/version.json` → **SHA A**.
2. No deploy de produção anterior: "Publish deploy" → abra `/version.json` → precisa mostrar **SHA B** (anterior). Anote o tempo.
3. Volte ao deploy candidato ("Publish deploy") → `/version.json` = **SHA A**. Anote o tempo.
4. Rode o workflow "Cloud smoke (manual, production)" com `expected_sha = A`.
5. Evidência no PR: A, B, os dois horários e o link do run do smoke.

Custo: publicar um deploy existente **não** gera build novo nem gasta crédito de build (a regra `[release]` só filtra builds).

## Banco de dados

O rollback de banco **não** é exercitado em produção. A estratégia é documental:
- cada migration futura leva uma seção "Down" ou uma nota de irreversibilidade (exigido por `PRODUCTION_MIGRATION_READY`);
- a recuperação real vem do export verificado (`docs/launch/production-backup-runbook.md`), porque o plano free não tem PITR.

As duas migrations pendentes desta wave já trazem a seção Down.
