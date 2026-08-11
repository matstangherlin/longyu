# Longyu — Log de bugs do QA humano

Preencha durante o runbook [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md).  
Uma linha por problema. Severidade: **P0** (bloqueia) · **P1** (fluxo principal ruim) · **P2** (polimento).

## Meta da rodada

| Campo | Valor |
| --- | --- |
| Data início | 2026-08-11 |
| URL / ambiente | produção Netlify / preview |
| Versão (Sobre / landing) | v0.2.0-beta.1 |
| SHA tip `main` | `d294764` (#140) |
| SHA congelada (RC) | _preencher só na RC_ |
| Executor | Cloud Agent + QA humano (Matheus) |

## Log

| ID | Sev | Onde (rota / lição / step) | Aparelho | O que aconteceu | Esperado | Repro | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | P1 | `/licao/*/player` · dialogue_choice / vitória | Android Chrome | Rubber-band + CTA Continuar/Verificar abaixo da viewport; vitória também exigia scroll | Página não arrasta; CTA acessível sem caça; vitória cabe no frame | Lição pinyin pós-resposta + tela final | **aberto — aguarda revalidação física** (#138→#139→#140 no código) |
| B002 | | | | | | | |
| B003 | | | | | | | |

## Contagem rápida

| Sev | Abertos | Fechados |
| --- | ---: | ---: |
| P0 | 0 | 0 |
| P1 | 1 | 0 |
| P2 | 0 | 0 |

## Checklist de revalidação B001 (Android físico)

Tip a testar: `d294764` (ou tip `main` após #140). Force refresh / limpe cache.

- [ ] Arrastar página inteira → **não move**
- [ ] Avançar atividade → atividade (curta e longa)
- [ ] Após acerto: Continuar visível sem caça
- [ ] Após erro: Verificar / Tentar de novo acessível
- [ ] Teclado aberto e fechado
- [ ] Tela de vitória: Continuar Jornada acessível sem caça

Se tudo OK → marcar B001 **fechado** e zerar P1 abertos.

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
