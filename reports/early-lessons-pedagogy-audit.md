# Auditoria pedagógica — lições 1–20

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | e0027b6a3d2c86f7843dcde4d82295f8013c0387 |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-12T17:30:14.109Z |
| Lições | 20 |
| Hash da Jornada | 2e9647f83624 |


## Escopo

- Primeiras **20** entradas de `ALL_LESSONS` (ordem do currículo).
- Plano real attempt=0 (`lessonRoundStepsFor`).
- Critérios: vocabulário, estrutura, metalanguage, formato, carga, escrita, open, transfer, áudio, sentence build.

## Faixas

| Faixa | Índices | Expectativa |
|-------|--------:|-------------|
| L1–L5 | 0–4 | Extremamente acessível: conceito, reconhecimento, chunks leves |
| L6–L10 | 5–9 | Chunks, reconhecimento, construção guiada |
| L11–L20 | 10–19 | Produção gradual; transfer só com base |

## Resumo

| Severidade | Qtd |
|------------|----:|
| high | 0 |
| medium | 0 |
| low | 0 |
| **total** | **0** |

## Achados

_Nenhum problema objetivo encontrado._

## Lições auditadas

- **0.** `p1-o-que-e-mandarim` — O que é mandarim?
- **1.** `p1-o-que-e-pinyin` — O que é pinyin?
- **2.** `p1-o-que-e-tom` — O que é tom?
- **3.** `p1-o-que-e-hanzi` — O que é hànzì?
- **4.** `p1-primeiros-hanzi` — Montando primeiros hànzì
- **5.** `p1-engine-2-lab` — Laboratório de exercícios
- **6.** `l1` — Mandarim, pinyin e tom
- **7.** `l2` — Olá
- **8.** `l3` — Tudo bem?
- **9.** `l1-rev` — Revisão do módulo
- **10.** `l4` — Obrigado
- **11.** `p1-ate-logo` — Até logo
- **12.** `p1-primeira-conversa` — Primeira conversa
- **13.** `p1-qingwen-cortesia` — Com licença
- **14.** `l2-rev` — Revisão do módulo
- **15.** `p2-ma-primeiro-tom` — 1º tom com ma
- **16.** `p2-ma-segundo-tom` — 2º tom com ma
- **17.** `p2-ma-terceiro-tom` — 3º tom com ma
- **18.** `p2-ma-quarto-tom` — 4º tom com ma
- **19.** `p2-comparar-tom-1-4` — Comparar 1º e 4º tom


## Correções aplicadas (objetivas)

| Problema | Correção |
|----------|----------|
| `ensureCoverage` forçava CORE_REVIEW (谢谢/再见…) nas primeiras lições | Gate `earlyPedagogy`: sem força de núcleo/produção pesada em fundação/fase ≤2 |
| Ditado/conversa/`spot_error` gerados em lições-conceito | `foundationLite` + perfil de fundação sem assembly/usage gerados |
| `makeOldPhraseReuseStep` injetava fill_blank de 谢谢 | Só fora de `foundationLite` |
| Jargão (verbo/objeto/sujeito) em `spot_error` | Copy reescrita em linguagem intuitiva; spot_error só a partir da fase 3 |
| “tone sandhi” em `l1` | Explicação em PT-BR sem jargão inglês |

Auditoria automatizada: `npm run audit:early-lessons` → este relatório.

<!-- integridade:e80cdc4f0708e66f -->
