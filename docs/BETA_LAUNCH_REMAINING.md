# Longyu — trabalho restante para beta pública (pós #148)

Atualizado em 2026-08-12. Separa o que **código/CI já cobre** do que **exige humano**.  
Tip `main`: `3622885` (#148).

> **Automação não substitui QA humano.** Playwright, `validate:beta` e scripts de guarda provam regressões — não substituem aparelho físico, L1–L20 como aluno novo, e-mail live, Stripe Test Mode, sync entre dois aparelhos reais, VoiceOver/TalkBack nem testadores externos.

> **Próximo passo imediato:** revalidar B001 no Android físico  
> ([checklist](./BETA_BUG_LOG.md#checklist-de-revalidação-b001-android-físico))  
> e B002 no app ([checklist](./BETA_BUG_LOG.md#checklist-de-revalidação-b002-revisão--estrela)).  
> Depois: [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md) §1 L1–L20.  
> Status da SHA: `npm run beta:rc-status`

## Mapa ponderado (agora)

| Trabalho restante | Peso | Estado |
| --- | ---: | --- |
| QA Android/iPhone/desktop real | 20% | **~15–20% Android** (B001 corrigido em código, revalidação física pendente); iPhone ~0% |
| L1–L20 completo como aluno novo | 15% | **~0–5%** — proxy E2E **não** conta |
| 5–15 testadores reais + telemetria | 15% | **0%** |
| Sync/offline/multi-device | 10% | Fixture OK (#133); **2 aparelhos reais = humano** §6 |
| Corrigir P0/P1 encontrados | 10% | B001 + B002 corrigidos em código (#138–#140, #148); **revalidação humana pendente** |
| Auth + conta + recuperação | 8% | E2E superfície OK; **e-mail live = humano** §4 |
| Stripe/Pro/entitlements | 7% | Testes de lógica OK; **Stripe Test Mode live = humano** §5 |
| RC + `gate:public-beta` + Security Scan final | 7% | Scripts prontos; **RC não congelada**; full security scan final pendente |
| Performance/PWA/browser/a11y | 5% | Parcial (#133); **VoiceOver/TalkBack = humano** §7 |
| Observabilidade + deploy/rollback/privacy | 3% | Parcial (#133 diagnostics/feedback) |

**Processo pré-lançamento executado:** ~45%.  
**Produto pronto para começar beta fechado controlado:** ~99,5% em código — falta prova humana.

## Já entregue em código (não reabrir sem regressão)

- #131 Beta Experience Hardening  
- #132 Lesson Player Viewport & Scroll Hardening  
- #133 Launch readiness (diagnostics, PWA prompt, auth surface, sync fixture, a11y zoom)  
- #134 Kit de QA humano (runbook, bug log, `beta:rc-status`)  
- #138–#140 B001 mobile (scroll lock reforçado + CTA/vitória na viewport) — **revalidar no aparelho**  
- **#148** produção/transferência friendliness, revisão/estrela (B002), PieceAssembly, `reviewCopy`, guarda QA  
- `test:qa-regression-guard`, `test:review-ux`, `test:assembly-ux`, `test:immediate-remediation` no `validate:beta`  
- E2E: `qa-regression-guard`, `review-remediation`  
- Docs: [`PRODUCTION_REVIEW_FRIENDLINESS.md`](./PRODUCTION_REVIEW_FRIENDLINESS.md), [`QA_REGRESSION_GUARD.md`](./QA_REGRESSION_GUARD.md)  
- Feedback com lição/step/versão/ambiente/display-mode  
- `validate:client-diagnostics` no `validate:beta`

## Pendente (não confundir com “falta código”)

- **#146** hardening geral de UX do player (copy curta, mic/fala, `test:player-ux`) — **PR #149 aberta**; integração seletiva sobre #148 ainda não mergeada na `main`  
- Revalidação humana B001 (Android físico) e B002 (revisão/estrela)  
- L1–L20 humano, iPhone físico, e-mail real, Stripe Test Mode live, sync 2 aparelhos, VoiceOver/TalkBack, testadores externos, RC congelada, full security scan final

## Não fingir em código

- Aparelho físico iOS/Android + PWA instalado  
- Checkout Stripe Test Mode ponta a ponta  
- Entrega real de e-mail (confirm/reset)  
- Dois dispositivos reais sincronizando em produção  
- VoiceOver/TalkBack e contraste formal  
- 5–15 testadores reais  
- Fechar B001/B002 sem revalidação humana  
- RC congelada + full security scan final  

## Comando de RC

```bash
npm run beta:rc-status
npm run gate:public-beta
```

Security: workflow `Security` no GitHub Actions (npm audit + CodeQL + gitleaks) na SHA da RC. Full security scan final roda só na RC — **não concluído**.
