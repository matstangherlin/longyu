# Progressão e prerequisites de `transfer_task` / `free_production`

## Problema (QA humano)

Transferência podia aparecer cedo demais:

- “Use o que já sabe” + situação nova
- scaffold com sujeito/verbo/objeto/partícula
- modelo `你要___吗?`
- campo aberto

Glifos conhecidos bastavam. A estrutura não tinha sido praticada em degraus guiados.

## Política explícita

```
estrutura nova
  → exposição (foco / autoral / conversa no padrão)
  → completion (fill_blank) ou sentence build
  → produção guiada (free_production do frame)
  → transfer_task (frase/situação nova)
  → produção aberta (objetivo sem alvo fixo)
```

| Regra | Gate |
|-------|------|
| Vocabulário ≠ estrutura | `StructureExposureMap` além de `seenGlyphs` |
| Free guiada | `exposed + (completion\|build)` |
| Transfer | `exposed + (completion\|build) + guidedProduction` **em lição anterior** |
| Open | guided prévio de algum frame do mesmo objetivo |
| Assist tentativa 0 | só `guided` (1 transformação) |
| UI | mostra padrão `我要 ___`, sem jargão de papéis |

## Antes → depois (plano real)

| Caso | Antes | Depois |
|------|-------|--------|
| `l5` / início | transfer `我不喝水` sem estrutura ensinada | sem transfer precoce |
| `我要 ___` | transfer possível só por glifos | exposta `l26b` → guided `l28` → transfer `l10-rev` |
| `你要…吗？` | 1ª ocorrência possível | exposta via conversa; transfer só após escada `niyao` + assist `question` |
| Produção aberta | ~50 lições cedo | 18 lições, só após guided do objetivo |

## Auditoria (122 lições)

`npm run validate:transfer-prerequisites` → `reports/transfer-prerequisites-report.md`

- 0 transfers precoces nas primeiras 40 lições
- 0 opens precoces
- ~75 lições com transfer, ~78 com free guiada, ~18 com open (depois dos prerequisites)

Também: `validate:production-transfer`, `test:transfer-scaffold`.
