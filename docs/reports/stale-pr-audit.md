# Stale PR Audit (V4.6)

Auditoria semântica vs `main` em `f10f14e` (pós V4.5).  
**Não fecha PRs automaticamente** — só classificação.

| PR | Título | Base | Head | Classificação | Motivo |
|----|--------|------|------|---------------|--------|
| [#181](https://github.com/matstangherlin/longyu/pull/181) | fix(economy): remove o toast vago de resgate de Pérola | main | `cursor/remove-pearl-sync-banner-d298` | **SUPERSEDED / CLOSE_SAFE** | `main` já trata `economySyncMessage` como efêmero (não reidrata; comentário explícito sobre “Resgatando Pérola...”). Mergeable=CONFLICTING; objetivo já na árvore. |
| [#117](https://github.com/matstangherlin/longyu/pull/117) | Add workflow to apply security migrations in production | main | `cursor/prod-apply-security-migrations-009d` | **STILL_NEEDED / REBASE_REQUIRED** | Workflow `.github/workflows/apply-security-migrations.yml` **não** está em `main`. Ainda relevante para ops, mas exige rebase + revisão de segurança (produção). Não mergear nesta remessa. |
| [#100](https://github.com/matstangherlin/longyu/pull/100) | fix: Convide amigos sempre visível no menu | main | `cursor/show-referral-nav-89e5` | **STILL_NEEDED / REBASE_REQUIRED** | Em `main`, Convide continua filtrado para `authMode === "cloud"` (Sidebar/TabBar). Decisão de produto ainda aberta; branch antiga. |

## Notas

- V4.3 reaplicou objetivos pedagógicos/visuais de branches antigas; **#181** nesta auditoria é higiene de toast de Pérola (já na `main` via commits de economy sync), não currículo.
- Não reabrir branches velhas de pedagogia.
- Fechar #181 só com autorização explícita do mantenedor.
