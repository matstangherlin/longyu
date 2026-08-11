# Longyu — trabalho restante para beta pública (pós #131/#132)

Atualizado em 2026-08-11. Separa o que **código/CI já cobre** do que **exige humano**.

## Mapa ponderado (agora)

| Trabalho restante | Peso | Estado automatizável |
| --- | ---: | --- |
| QA Android/iPhone/desktop real | 20% | Humano — ver `REAL_DEVICE_QA.md` |
| L1–L20 completo como aluno novo | 15% | Humano |
| Auth + conta + recuperação | 8% | Parcial — `e2e/auth-surface.spec.ts` (rotas/CTA); e-mail live = humano |
| Stripe/Pro/entitlements | 7% | Parcial — `test:entitlements` + webhook fixtures; checkout live = humano |
| Sync/offline/multi-device | 10% | Parcial — `validate:sync-merge` (fixture 2 dispositivos) + offline e2e; 2 aparelhos = humano |
| 5–15 testadores reais + telemetria | 15% | Humano |
| Corrigir P0/P1 encontrados | 10% | Contínuo (#132 scroll feito) |
| Performance/PWA/browser/a11y | 5% | Parcial — banner PWA, viewport zoomável, apple meta |
| Observabilidade + deploy/rollback/privacy | 3% | Parcial — diagnostics + Reportar no ErrorBoundary; feedback com env/versão |
| RC + `gate:public-beta` + Security Scan | 7% | Scripts prontos; rodar no SHA final |

## Já entregue em código (não reabrir sem regressão)

- #131 Beta Experience Hardening (telemetria, mobile IME, falhas, admin)
- #132 Lesson Player Viewport & Scroll Hardening
- Feedback com lição/step/versão/ambiente/display-mode
- ErrorBoundary → diagnóstico + Reportar problema
- Sync merge com fixture multi-device
- PWA update prompt (`Nova versão — Atualizar`)

## Não fingir em código

- Aparelho físico iOS/Android + PWA instalado
- Checkout Stripe Test Mode ponta a ponta
- Entrega real de e-mail (confirm/reset)
- Dois dispositivos reais sincronizando em produção
- VoiceOver/TalkBack e contraste formal

## Comando de RC

```bash
npm run gate:public-beta
```

Security Scan completo: workflow `Security` no GitHub Actions (npm audit + CodeQL + gitleaks).
