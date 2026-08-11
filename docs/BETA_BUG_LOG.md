# Longyu — Log de bugs do QA humano

Preencha durante o runbook [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md).  
Uma linha por problema. Severidade: **P0** (bloqueia) · **P1** (fluxo principal ruim) · **P2** (polimento).

## Meta da rodada

| Campo | Valor |
| --- | --- |
| Data início | |
| URL / ambiente | |
| Versão (Sobre / landing) | |
| SHA congelada (RC) | _preencher só na RC_ |
| Executor | |

## Log

| ID | Sev | Onde (rota / lição / step) | Aparelho | O que aconteceu | Esperado | Repro | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | | | | | | | aberto |
| B002 | | | | | | | |
| B003 | | | | | | | |

## Contagem rápida

| Sev | Abertos | Fechados |
| --- | ---: | ---: |
| P0 | 0 | 0 |
| P1 | 0 | 0 |
| P2 | 0 | 0 |

## Critério para RC

- [ ] P0 = 0  
- [ ] P1 de player/auth/sync/pagamento = 0 (ou waivers assinados)  
- [ ] Runbook §§1–6 no mínimo executados  
- [ ] `gate:public-beta` verde na SHA abaixo  

```
SHA RC:
gate:public-beta:
Security:
```
