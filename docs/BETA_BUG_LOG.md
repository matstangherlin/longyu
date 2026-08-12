# Longyu — Log de bugs do QA humano

Preencha durante o runbook [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md).  
Uma linha por problema. Severidade: **P0** (bloqueia) · **P1** (fluxo principal ruim) · **P2** (polimento).

> **Automação não substitui QA humano.** `test:qa-regression-guard`, E2E e fixtures provam regressões em código — não fecham bug até revalidação no app real.

## Meta da rodada

| Campo | Valor |
| --- | --- |
| Data início | 2026-08-11 |
| URL / ambiente | produção Netlify / preview |
| Versão (Sobre / landing) | v0.2.0-beta.1 |
| SHA tip `main` | `3622885` (#148 — produção/revisão/PieceAssembly/guarda QA) |
| SHA congelada (RC) | _preencher só na RC_ |
| Executor | Cloud Agent + QA humano (Matheus) |

## Log

| ID | Sev | Onde (rota / lição / step) | Aparelho | O que aconteceu | Esperado | Repro | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | P1 | `/licao/*/player` · dialogue_choice / vitória | Android Chrome | Rubber-band + CTA Continuar/Verificar abaixo da viewport; vitória também exigia scroll | Página não arrasta; CTA acessível sem caça; vitória cabe no frame | Lição pinyin pós-resposta + tela final | **corrigido em código**, aguardando revalidação Android física (#138→#139→#140; tip `3622885`) |
| B002 | P1 | Star recovery / remediação imediata | Desktop + mobile | Prompt/hànzì/pinyin concatenados (`你好 / 你好吗 / …`); “Pulou…” virava opção; Correto inconsistente; UI bagunçada | Um exercício coerente: prompt situacional + opções + pinyin só da resposta; UI em blocos claros | Errar/pular diálogo → aceitar revisão de estrela | **corrigido em código**, aguardando revalidação humana (#148 / tip `3622885`) |
| B003 | | | | | | | |

## Contagem rápida

| Sev | Abertos | Fechados |
| --- | ---: | ---: |
| P0 | 0 | 0 |
| P1 | 2 | 0 |
| P2 | 0 | 0 |

> B001 e B002: código + testes automatizados verdes (`test:qa-regression-guard`, `test:review-ux`, `test:immediate-remediation`, E2E).  
> Contam como **abertos para RC** até alguém confirmar no app (Android físico para B001; desktop/mobile para B002).  
> P1 abertos efetivos para RC: **B001 + B002** até revalidação humana.  
> **Não marcar como fechado** só porque a automação passou.

## Checklist de revalidação B001 (Android físico)

Tip a testar: `3622885` (`main` pós-#148). Force refresh / limpe cache.

- [ ] Arrastar página inteira → **não move**
- [ ] Avançar atividade → atividade (curta e longa)
- [ ] Após acerto: Continuar visível sem caça
- [ ] Após erro: Verificar / Tentar de novo acessível
- [ ] Teclado aberto e fechado
- [ ] Tela de vitória: Continuar Jornada acessível sem caça

## Checklist de revalidação B002 (revisão / estrela)

Tip a testar: `3622885` (`main` pós-#148). Force refresh / limpe cache.

- [ ] Errar ou pular um diálogo → aceitar revisão
- [ ] Um único prompt situacional (sem `你好 / 你好吗 / …`)
- [ ] Pinyin só da resposta correta
- [ ] “Pulou…” **não** aparece como alternativa
- [ ] Correto / pinyin / significado batem entre si
- [ ] Explicação curta e contextual
- [ ] Sentence build em revisão: peças corretas, sem dump concatenado (#148 / PieceAssembly)

## Critério para RC

- [ ] P0 = 0  
- [ ] P1 de player/auth/sync/pagamento = 0 (ou waivers assinados) — **B001/B002 só fecham após revalidação humana**  
- [ ] Runbook §§1–6 no mínimo executados  
- [ ] `gate:public-beta` verde na SHA abaixo  

```
SHA RC:
gate:public-beta:
Security:
```
