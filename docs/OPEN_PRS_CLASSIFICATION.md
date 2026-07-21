# Classificação de PRs abertos (auditoria 2026-07-21)

**Base:** `main` @ `7d12997` (+ correções da auditoria).  
**Regra:** nenhuma PR foi fechada ou excluída automaticamente. Esta é só a classificação recomendada.

## Podem ser fechadas (obsoletas / já incorporadas por remessas posteriores)

Estas PRs estão em **CONFLICTING** e o tema principal já entrou no `main` por PRs posteriores (catálogo V2, pós-conversa, novelty, imagens, feedback, sync, etc.). Revisar o diff residual antes de fechar; na maioria não há mudança exclusiva crítica.

| PR | Título | Motivo |
|---:|---|---|
| #26 | Expand conversation scenes catalog… | Catálogo V2 + seleção já em main (#35/#37/#51) |
| #25 | Semantic novelty… | `validate:lesson-novelty` já em main |
| #24 | geração automática de image_choice | Cobertura visual automática já em main |
| #22 | validate:exercise-depth | Validador + relatório já em main |
| #21 | compositor de cenas | Motor de cenas/catálogo atual supersede |
| #20 | exercícios visuais 8 modos | Pipeline visual atual supersede |
| #19 | histórias interativas | Imersão atual no main; conflito antigo |
| #18 | Motor de novidade pedagógica | Novelty já em main |
| #7 | Feedback interno Supabase | Substituído por #29 (merged) |
| #5 | Compacta UX / glossário | `validate:glossary-ui` + UX já em main |
| #4 | Protege restore cloud | Sync/merge atual no main |

## Em conflito — avaliar conteúdo residual (não fechar às cegas)

Podem ter ideias ainda úteis, mas o rebase será caro.

| PR | Título | Nota |
|---:|---|---|
| #27 | VisualScene — camada de imagens | Camada situacional ainda não está no main como proposta; conflito alto |
| #11 | analytics beta + dashboard | Parcialmente coberto por pedagogia/feedback; dashboard pode ser valioso |
| #10 | versões / novidades / patches PWA | Parte da versão já em UI; prompt de update PWA pode ainda ser útil |
| #9 | gate:production / RLS / Stripe | Endurecimento extra; main já tem webhook tests + rpc hardening |
| #8 | monitoramento de erros / crashes | Error boundary parcial pode existir; revisar o que falta |

## Mergeable — mudanças exclusivas / úteis

| PR | Título | Recomendação |
|---:|---|---|
| #43 | adaptar player para conversas longas (draft) | **Manter** — próximo candidato de produto pós-auditoria |
| #39 | RLS migrations idempotentes para Preview | **Manter / merge** — baixo risco, melhora Preview Supabase |
| #30 | AGENTS.md (dev environment) | **Opcional** — só docs de cloud agent; fechar se AGENTS.md for indesejado |

## Já merged (contexto; não precisam ação)

Inclui, entre outras: #52 (conceitos visuais), #51 (pedagogy gate), #50–#44 (landing/mascote), #42 (loop→SRS), #41 (e2e CI), #40/#38/#36 (autoplay), #37 (V1→V2 + pós-conversa), #35 (catálogo V2), #34 (SVG visual), #33/#32 (privacy/rpc), #31 (beta prep), #29 (feedback).

## Ação sugerida (manual)

1. Merge #39 após review rápido.  
2. Priorizar review de #43 (player longo).  
3. Fechar em lote as PRs da primeira tabela após confirmar que não há commit exclusivo desejado (`gh pr diff <n>`).  
4. Triagem semanal de #27/#11/#10/#9/#8.
