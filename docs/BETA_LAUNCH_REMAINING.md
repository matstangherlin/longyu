# Longyu — trabalho restante para beta pública (pós #148 / #159)

Atualizado em 2026-08-13. Separa o que **código/CI já cobre** do que **exige humano**.

> **Tip oficial da `main`:** rode `npm run beta:rc-status` (campo `origin/main`).  
> Não confie em SHA colada neste arquivo se divergir do comando.  
> Pós-#159 (hardening RC): tip conhecida no merge = `6c538df`.

> **Automação não substitui QA humano.** Playwright, `validate:beta` e scripts de guarda provam regressões — não substituem aparelho físico, L1–L20 como aluno novo, e-mail live, Stripe Test Mode, sync entre dois aparelhos reais, VoiceOver/TalkBack nem testadores externos.

> **Próximo fluxo (humano):** ver [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md) — ordem 1→15.  
> Começar por: force refresh → **B001 Android real** → **B002 app real** → L1–L20 conta nova.  
> Status da SHA: `npm run beta:rc-status`

## Mapa ponderado (agora)

| Trabalho restante | Peso | Estado |
| --- | ---: | --- |
| QA Android/iPhone/desktop real | 20% | **~15–20% Android**; iPhone ~5% (B003 encontrado + correção em código; QA-008 pendente) |
| L1–L20 completo como aluno novo | 15% | **~0–5%** — proxy E2E **não** conta |
| 5–15 testadores reais + telemetria | 15% | **0%** |
| Sync/offline/multi-device | 10% | Fixture OK (#133); **2 aparelhos reais = humano** §6 |
| Corrigir P0/P1 encontrados | 10% | B001 reaberto; B002/B003/B004/PED-005 em código (#158+#159); **revalidação humana pendente** |
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
- **#158** remessa aparelho (B003/B004/B001 padding/PED-005/VIS)  
- **#159** hardening RC: E2E B001/B003/B004, `validate:tone-progression`, `validate:visual-assets`, `beta:rc-status` com SHA de `origin/main`  
- `test:qa-regression-guard`, `test:review-ux`, `test:assembly-ux`, `test:immediate-remediation` no `validate:beta`  
- E2E: `qa-regression-guard`, `review-remediation`, `image-choice-b004`, `review-continue-iphone`, sticky dense build  
- Docs: [`PRODUCTION_REVIEW_FRIENDLINESS.md`](./PRODUCTION_REVIEW_FRIENDLINESS.md), [`QA_REGRESSION_GUARD.md`](./QA_REGRESSION_GUARD.md)  
- Feedback com lição/step/versão/ambiente/display-mode  
- `validate:client-diagnostics` no `validate:beta`

## Pendente em código (não confundir com QA humano)

- Bugs que o QA físico ainda encontrar — **só então** mexer em player/revisão/imagens  
- Confirmar na tip congelada: CI Portão + E2E + **WebKit verde** + `gate:public-beta` + Security  

## Ainda NÃO concluído (prova humana / RC)

Não marcar como feito (nenhum checkbox humano foi marcado automaticamente):

- [ ] Force refresh / cache limpo na tip de `npm run beta:rc-status` (`origin/main`)  
- [ ] Revalidação B001 no Android real (regressão StickyActionBar)  
- [ ] Revalidação B002 no app real  
- [ ] Revalidação B003 no iPhone (revisão Continuar)  
- [ ] Revalidação B004 imagens associação visual  
- [ ] L1–L20 humano com conta nova  
- [ ] Android completo  
- [ ] QA iPhone / Safari  
- [ ] E-mail real (confirm / reset)  
- [ ] Stripe Test Mode real (ponta a ponta)  
- [ ] Sync PC ↔ celular (2 aparelhos reais)  
- [ ] VoiceOver / TalkBack  
- [ ] Testadores externos (5–15)  
- [ ] Corrigir P0/P1 encontrados  
- [ ] RC congelada  
- [ ] `gate:public-beta` na SHA final  
- [ ] Job CI **E2E cross-engine (WebKit)** verde na tip (mesmo com `continue-on-error` no merge)  
- [ ] Full security scan final  

## Não fingir em código

- Aparelho físico iOS/Android + PWA instalado  
- Checkout Stripe Test Mode ponta a ponta  
- Entrega real de e-mail (confirm/reset)  
- Dois dispositivos reais sincronizando em produção  
- VoiceOver/TalkBack e contraste formal  
- 5–15 testadores reais  
- Fechar B001/B002/B003/B004 sem revalidação humana  
- RC congelada + full security scan final  
- Congelar RC com WebKit vermelho (iPhone/Safari foi fonte dos bugs recentes)  

## Comando de RC

```bash
npm run beta:rc-status          # fonte oficial da tip (origin/main)
npm run gate:public-beta        # na tip congelada
npm run test:e2e:webkit         # obrigatório na RC (Safari ≈ WebKit)
# opcional, mais estrito:
npm run gate:production
```

Security: workflow `Security` no GitHub Actions (npm audit + CodeQL + gitleaks) na SHA da RC. Full security scan final roda só na RC — **não concluído** até marcar o checkbox acima.
