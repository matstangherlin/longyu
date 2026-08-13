# Economia V2 — Pérolas de Jade e Pro temporário

Tabela canônica de preços e marcos: `src/data/economy.ts` (`PEARL_PRICES`, `PEARL_*_MILESTONES`, `PEARL_ECONOMY_SUMMARY`).

Ajuste números **só** nesse arquivo. A lógica (claims, Pro pass, Loja, RPCs) lê as constantes — não reescreva sinks espalhados em componentes.

## Papéis das moedas

| Moeda | Função |
|-------|--------|
| **Qi** | Comum; estudo diário; conforto/conveniência. Nunca compra lição, estrela ou progresso. |
| **Pérolas** | Rara; marcos; sinks de prestígio (carga, foco, escudo, cosmético, Pro 7d). Conversão → Qi é secundária. |

## Sinks (Pérolas)

| Item | Preço |
|------|-------|
| +1 Carga | 1 |
| Foco 24h | 2 |
| Foco 48h | 3 |
| Escudo | 3 |
| Cosmético especial | 4 (faixa 2–6) |
| Pacote Qi (120) | 3 |
| 7 dias Pro | 12 |

## Pro por Pérolas

- Custo: 12 · duração: 7 dias · cooldown: 30 dias · sem acumular passes.
- Assinante Stripe: nunca consome Pérolas automaticamente.
- Cloud: RPC `activate_pearl_pro_pass` é autoridade; offline só marca pendência.
- Ads: `shouldShowAds` / `useShouldShowAds` — Free sem Pro/pass = ads.

## Marcos (únicos)

Ofensiva 7/30/60/90/180/365; erros 25/100/250; Hànzì 50/100/250; áudio 100/500; produção 100/500; fase 3★; desafio mensal. Ledger: `pearlMilestonesClaimed` + `pearlLedger`.
