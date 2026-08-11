# Longyu — trabalho restante para beta pública (pós #133)

Atualizado em 2026-08-11. Separa o que **código/CI já cobre** do que **exige humano**.

> **Próximo passo:** executar [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md)  
> e registrar bugs em [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md).  
> Status da SHA: `npm run beta:rc-status`

## Mapa ponderado (agora)

| Trabalho restante | Peso | Estado |
| --- | ---: | --- |
| QA Android/iPhone/desktop real | 20% | **Humano** — runbook §2–3 |
| L1–L20 completo como aluno novo | 15% | **Humano** — runbook §1 |
| 5–15 testadores reais + telemetria | 15% | **Humano** — runbook §8 |
| Sync/offline/multi-device | 10% | Fixture OK (#133); **2 aparelhos = humano** §6 |
| Corrigir P0/P1 encontrados | 10% | Depois do QA — log de bugs |
| Auth + conta + recuperação | 8% | E2E superfície OK; **e-mail live = humano** §4 |
| Stripe/Pro/entitlements | 7% | Testes de lógica OK; **Test Mode live = humano** §5 |
| RC + `gate:public-beta` + Security Scan | 7% | Scripts prontos; rodar na SHA congelada |
| Performance/PWA/browser/a11y | 5% | Parcial (#133); VoiceOver/TalkBack = humano §7 |
| Observabilidade + deploy/rollback/privacy | 3% | Parcial (#133 diagnostics/feedback) |

**Processo pré-lançamento executado:** ~30–35% (código).  
**Produto pronto para começar beta fechado controlado:** ~98%+ em código — falta prova humana.

## Já entregue em código (não reabrir sem regressão)

- #131 Beta Experience Hardening  
- #132 Lesson Player Viewport & Scroll Hardening  
- #133 Launch readiness (diagnostics, PWA prompt, auth surface, sync fixture, a11y zoom)  
- Feedback com lição/step/versão/ambiente/display-mode  
- `validate:client-diagnostics` no `validate:beta`

## Não fingir em código

- Aparelho físico iOS/Android + PWA instalado  
- Checkout Stripe Test Mode ponta a ponta  
- Entrega real de e-mail (confirm/reset)  
- Dois dispositivos reais sincronizando em produção  
- VoiceOver/TalkBack e contraste formal  
- 5–15 testadores reais  

## Comando de RC

```bash
npm run beta:rc-status
npm run gate:public-beta
```

Security: workflow `Security` no GitHub Actions (npm audit + CodeQL + gitleaks) na SHA da RC.
