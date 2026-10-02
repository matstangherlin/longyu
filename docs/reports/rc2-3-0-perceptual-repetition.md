# RC2.3.0 — Perceptual Repetition

## Problema

O audit semântico via `semanticRepetition.ts` classificava poucas REDUNDANT, mas o aluno via:

你好 → 你好 → 你好  

com operações “diferentes” internamente.

## Conceito novo

**Perceptual repetition** = alvo + apresentação + família de interação + janela curta.

Módulo: `src/lib/pedagogyV6/perceptualRepetition.ts`

### Métricas (`saturationScore`)

- `targetDominance`
- `interactionDominance`
- `presentationDominance`
- `semanticRedundancy`

Warning quando um alvo/família domina a experiência.

### Diversificação (`diversifyPerceptualSession`)

- Evita >2 aparições próximas do mesmo alvo (exceto remediação/teach)
- Cap de aparições do mesmo alvo ≈ 35% da prática
- Evita streaks longos da mesma família (ex.: 4× choice)
- Remove excesso de `presentationKey` / alvo duplicado quando há alternativa
- **Não** inventa 15 tarefas artificiais

## Antes vs depois (primeiras 20)

| | RC2.2.x (semântico) | RC2.3.0 V6 (perceptivo) |
|---|---|---|
| Análise | ID / operação / contexto | + família / apresentação / janela |
| Sessões 5/6 (你好) | 你好 em 5/7 e 6/7 graded | cap + reordenação; Descoberta TEACH no Pass 1 |
| Warnings | saturação semântica pontual | 11/20 com warning (labs fonéticos filtrados) |
| Remoções | n/a | 3 aparições excedentes removidas no piloto |

Detalhes numéricos por sessão: `docs/reports/rc2-3-0-first-20-v6.json`.

## Transformações aplicadas

1. Reordenação para quebrar streaks de família  
2. Remoção de aparições presentation-duplicadas e alvo acima do cap  
3. Descoberta TEACH no início (não conta como saturação de prática)

## Alvos ainda dominantes (dívida honesta)

Foundation authored plans ainda concentram 你好 / tons / componentes em sessões curtas.  
O motor **avisa** e **corta excesso**; não inventa conteúdo novo para “esconder” saturação.  
Expansão de variedade de conteúdo = RC2.3.1 / RC2.3.2.
