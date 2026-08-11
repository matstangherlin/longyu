# Longyu — trabalho restante para beta pública (pós #140)

Atualizado em 2026-08-11. Separa o que **código/CI já cobre** do que **exige humano**.  
Tip `main`: `d294764` (#140).

> **Próximo passo imediato:** revalidar B001 no Android físico  
> ([checklist](./BETA_BUG_LOG.md#checklist-de-revalidação-b001-android-físico)).  
> Depois: [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md) §1 L1–L20.  
> Status da SHA: `npm run beta:rc-status`

## Mapa ponderado (agora)

| Trabalho restante | Peso | Estado |
| --- | ---: | --- |
| QA Android/iPhone/desktop real | 20% | **~15–20% Android** (B001 em revalidação); iPhone ~0% |
| L1–L20 completo como aluno novo | 15% | **~0–5%** — proxy E2E não conta |
| 5–15 testadores reais + telemetria | 15% | **0%** |
| Sync/offline/multi-device | 10% | Fixture OK (#133); **2 aparelhos = humano** §6 |
| Corrigir P0/P1 encontrados | 10% | B001 aberto até revalidação física |
| Auth + conta + recuperação | 8% | E2E superfície OK; **e-mail live = humano** §4 |
| Stripe/Pro/entitlements | 7% | Testes de lógica OK; **Test Mode live = humano** §5 |
| RC + `gate:public-beta` + Security Scan | 7% | Scripts prontos; rodar na SHA congelada |
| Performance/PWA/browser/a11y | 5% | Parcial (#133); VoiceOver/TalkBack = humano §7 |
| Observabilidade + deploy/rollback/privacy | 3% | Parcial (#133 diagnostics/feedback) |

**Processo pré-lançamento executado:** ~40%.  
**Produto pronto para começar beta fechado controlado:** ~99%+ em código — falta prova humana.

## Já entregue em código (não reabrir sem regressão)

- #131 Beta Experience Hardening  
- #132 Lesson Player Viewport & Scroll Hardening  
- #133 Launch readiness (diagnostics, PWA prompt, auth surface, sync fixture, a11y zoom)  
- #134 Kit de QA humano (runbook, bug log, `beta:rc-status`)  
- #138–#140 B001 mobile (scroll lock reforçado + CTA/vitória na viewport) — **revalidar no aparelho**  
- Feedback com lição/step/versão/ambiente/display-mode  
- `validate:client-diagnostics` no `validate:beta`

## Não fingir em código

- Aparelho físico iOS/Android + PWA instalado  
- Checkout Stripe Test Mode ponta a ponta  
- Entrega real de e-mail (confirm/reset)  
- Dois dispositivos reais sincronizando em produção  
- VoiceOver/TalkBack e contraste formal  
- 5–15 testadores reais  
- Fechar B001 sem revalidação Android  

## Comando de RC

```bash
npm run beta:rc-status
npm run gate:public-beta
```

Security: workflow `Security` no GitHub Actions (npm audit + CodeQL + gitleaks) na SHA da RC.
