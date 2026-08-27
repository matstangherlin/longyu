# Auditoria de PRs antigas — V4.7.4

Objetivo: **não carregar dívida histórica** para a Release Candidate.
Não mergear branch velha. Fechar como superseded quando a `main` já absorveu o delta.

`main` de referência no início desta remessa: `79abef616b26439ecbde4e2ca532127684913d35`.

## Fechar como superseded (não mergear)

| PR | Título | Veredito | Motivo |
| --- | --- | --- | --- |
| [#195](https://github.com/matstangherlin/longyu/pull/195) | percentual de progresso / loading infinito | `CLOSE_SAFE` | Já na main (`e2e/progress-loading.spec.ts`, timeout de sync, ProgressBar). Relatório prévio: `docs/reports/pr-195-superseded.md`. Branch `cursor/fix-progress-percent-loading-f053` está atrás do funil V4.7 |
| [#193](https://github.com/matstangherlin/longyu/pull/193) | atalho 1 só depois do listen_select | `CLOSE_SAFE` | Sintoma do Firefox/M1. A V4.7.4 corrige a **classe** (capture + `DigitN` + `data-selected`). Não rebasear a branch antiga |
| [#190](https://github.com/matstangherlin/longyu/pull/190) | V4.6 Paid Beta RC | `CLOSE_SAFE` | Superseded pela consolidação V4.7 na main |
| [#181](https://github.com/matstangherlin/longyu/pull/181) | toast “Resgatando Pérola...” | `CLOSE_SAFE` | Já guardado em `validate-economy-server` / `test-pearl-economy` / comentário da persistência |

## Não fechar / não mergear

| PR | Veredito | Motivo |
| --- | --- | --- |
| [#117](https://github.com/matstangherlin/longyu/pull/117) | `DO_NOT_MERGE` | Workflow que aplica migrations de segurança em **produção**. Staging primeiro (V4.7.5). Manter aberta como alerta |
| [#100](https://github.com/matstangherlin/longyu/pull/100) | `KEEP_OPEN` | “Convide amigos” no menu. `/convide` existe na main, mas o filtro do flyout ainda pode divergir. Não fechar às cegas; não mergear a branch velha |
| Dependabot #137 #136 #135 #88 #85 #84 #83 #82 #79 #78 #77 #76 #74 #73 #72 | `LEAVE` | Fora do escopo da RC. Não fechar nem mergear nesta remessa |

## PRs V4.7 já concluídas

| PR | Estado |
| --- | --- |
| #199 | MERGED — árvore cumulativa V4.7.1–V4.7.3 |
| #197 | MERGED (auto, commits já na main via #199) |
| #198 | CLOSED superseded |
| #200 | MERGED — relatório de consolidação |

## Ação nesta remessa

Fechar #195, #193, #190 e #181 **sem merge**, com comentário `SUPERSEDED_BY_V474_RC` apontando este arquivo e a PR da V4.7.4.
Não tocar Dependabot. Não mergear #117.
