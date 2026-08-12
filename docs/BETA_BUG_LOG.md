# Longyu — Log de bugs do QA humano

Preencha durante o runbook [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md).  
Uma linha por problema. Severidade: **P0** (bloqueia) · **P1** (fluxo principal ruim) · **P2** (polimento).

> **Automação não substitui QA humano.** `test:qa-regression-guard`, E2E e fixtures provam regressões em código — não fecham bug até revalidação no app real.  
> **Nenhum checkbox humano abaixo foi marcado automaticamente.**

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
| B001 | P1 | `/licao/*/player` · dialogue_choice / vitória | Android Chrome | Rubber-band + CTA Continuar/Verificar abaixo da viewport; vitória também exigia scroll | Body não arrasta; CTA acessível; teclado ok; vitória correta | Lição pinyin pós-resposta + tela final | **corrigido em código**, aguardando revalidação Android física (#138→#139→#140; tip `3622885`) |
| B002 | P1 | Star recovery / remediação imediata | Desktop + mobile | Prompt/hànzì/pinyin concatenados (`你好 / 你好吗 / …`); “Pulou…” virava opção; Correto inconsistente; UI bagunçada | Errar/pular → revisão; um prompt; pinyin coerente; status ≠ alternativa; sentence build ok; estrela recupera | Errar/pular diálogo → aceitar revisão | **corrigido em código**, aguardando revalidação humana (#148 / tip `3622885`) |
| B003 | | | | | | | |

## Contagem rápida

| Sev | Abertos | Fechados |
| --- | ---: | ---: |
| P0 | 0 | 0 |
| P1 | 2 | 0 |
| P2 | 0 | 0 |

> B001 e B002: código + testes automatizados verdes.  
> Contam como **abertos para RC** até confirmação humana.  
> **Não marcar como fechado** só porque a automação passou.

## Checklist de revalidação B001 (Android físico)

Tip: `3622885`. Force refresh / cache limpo **antes**. Ver runbook §B001.

- [ ] **Body não arrasta** — documento não move ao puxar a página  
- [ ] **CTA acessível** — Continuar / Verificar / Tentar de novo sem caça (acerto e erro)  
- [ ] **Teclado aberto** — CTA alcançável com IME aberto  
- [ ] **Teclado fechado** — layout/CTA corretos ao fechar  
- [ ] **Vitória correta** — Continuar Jornada / recompensas sem scroll da página  

## Checklist de revalidação B002 (revisão / estrela)

Tip: `3622885`. Force refresh / cache limpo **antes**. Ver runbook §B002.

- [ ] **Errar / pular** dispara a oferta de revisão  
- [ ] **Aceitar revisão** abre a sessão  
- [ ] **Um único prompt** situacional (sem dump `你好 / 你好吗 / …`)  
- [ ] **Pinyin coerente** — só o da resposta / alvo  
- [ ] **Status não vira alternativa** — “Pulou…” / “incorretamente” ausente nas opções  
- [ ] **Sentence build correto** — peças certas, sem dump (PieceAssembly)  
- [ ] **Recuperação da estrela funciona** — acertar recupera 3ª estrela / feedback coerente  

## Critério para RC

- [ ] P0 = 0  
- [ ] P1 de player/auth/sync/pagamento = 0 (ou waivers) — **B001/B002 só após humano**  
- [ ] Runbook: fluxo 1→15 (mínimo §§B001–B002 + L1–L20 + Android + passos críticos)  
- [ ] `gate:public-beta` verde na SHA abaixo  
- [ ] Full security scan da SHA final  

```
SHA RC:
gate:public-beta:
Security:
```
