# Lexical progression — L1–L20

_Gerado por `report:lexical-progression` · 2026-08-13_

Relatório humano da progressão lexical nas primeiras 20 lições.
O validador (`validate:lexical-progression`) usa a mesma análise e falha só em concentração abusiva de saudações seed (janela 5).

## Limiares

- Concentração máx. seed (janela 5): **45%** (hard)
- Lições dominadas na janela: **3** (hard)
- Novelty load médio: **4.5** (soft)
- Tokens seed vigiados: 你好, 谢谢, 再见, 不客气, 早上好, 晚上好

## Resumo

| Indicador | Valor |
|-----------|------:|
| Lições analisadas | 20 |
| Janelas de 5 | 16 |
| Issues (hard) | 0 |
| Avisos (soft) | 25 |
| Lições dominadas por seed | 3 |

## Por lição

| # | Lição | Título | Top | Conc. | Seed % | Novelty |
|--:|-------|--------|-----|------:|-------:|--------:|
| 1 | `p1-o-que-e-mandarim` | O que é mandarim? | 你好 | 43% | 91% | 1.67 |
| 2 | `p1-o-que-e-pinyin` | O que é pinyin? | 你好 | 42% | 77% | 1.14 |
| 3 | `p1-o-que-e-tom` | O que é tom? | 你好 | 20% | 49% | 1.08 |
| 4 | `p1-o-que-e-hanzi` | O que é hànzì? | 木 | 22% | 0% | 1.45 |
| 5 | `p1-primeiros-hanzi` | Montando primeiros hànzì | 木 | 23% | 0% | 1.30 |
| 6 | `p1-engine-2-lab` | Laboratório de exercícios | 你好 | 16% | 56% | 1.29 |
| 7 | `l1` | Mandarim, pinyin e tom | 你好 | 26% | 28% | 1.31 |
| 8 | `l2` | Olá | 你好 | 25% | 31% | 1.15 |
| 9 | `l3` | Tudo bem? | 吗 | 17% | 19% | 1.31 |
| 10 | `l1-rev` | Revisão do módulo | 你好 | 29% | 30% | 1.14 |
| 11 | `l4` | Obrigado | 谢谢 | 15% | 41% | 1.21 |
| 12 | `p1-ate-logo` | Até logo | 再见 | 21% | 44% | 1.17 |
| 13 | `p1-primeira-conversa` | Primeira conversa | 你好 | 25% | 33% | 1.18 |
| 14 | `p1-qingwen-cortesia` | Com licença | 你好 | 22% | 30% | 1.30 |
| 15 | `l2-rev` | Revisão do módulo | 你好 | 25% | 36% | 1.00 |
| 16 | `p2-ma-primeiro-tom` | 1º tom com ma | 你好 | 23% | 23% | 1.17 |
| 17 | `p2-ma-segundo-tom` | 2º tom com ma | 麻 | 16% | 16% | 1.17 |
| 18 | `p2-ma-terceiro-tom` | 3º tom com ma | 马 | 17% | 17% | 1.17 |
| 19 | `p2-ma-quarto-tom` | 4º tom com ma | 骂 | 17% | 17% | 1.17 |
| 20 | `p2-comparar-tom-1-4` | Comparar 1º e 4º tom | 妈 | 16% | 22% | 1.00 |

## Janelas

- **p1-o-que-e-mandarim → p1-o-que-e-pinyin → p1-o-que-e-tom → p1-o-que-e-hanzi → p1-primeiros-hanzi** — seed 你好 14%; dominadas 2
- **p1-o-que-e-pinyin → p1-o-que-e-tom → p1-o-que-e-hanzi → p1-primeiros-hanzi → p1-engine-2-lab** — seed 你好 12%; dominadas 1
- **p1-o-que-e-tom → p1-o-que-e-hanzi → p1-primeiros-hanzi → p1-engine-2-lab → l1** — seed 你好 14%; dominadas 0
- **p1-o-que-e-hanzi → p1-primeiros-hanzi → p1-engine-2-lab → l1 → l2** — seed 你好 15%; dominadas 0
- **p1-primeiros-hanzi → p1-engine-2-lab → l1 → l2 → l3** — seed 你好 18%; dominadas 0
- **p1-engine-2-lab → l1 → l2 → l3 → l1-rev** — seed 你好 23%; dominadas 1
- **l1 → l2 → l3 → l1-rev → l4** — seed 你好 21%; dominadas 1
- **l2 → l3 → l1-rev → l4 → p1-ate-logo** — seed 你好 19%; dominadas 1
- **l3 → l1-rev → l4 → p1-ate-logo → p1-primeira-conversa** — seed 你好 19%; dominadas 1
- **l1-rev → l4 → p1-ate-logo → p1-primeira-conversa → p1-qingwen-cortesia** — seed 你好 21%; dominadas 1
- **l4 → p1-ate-logo → p1-primeira-conversa → p1-qingwen-cortesia → l2-rev** — seed 你好 20%; dominadas 0
- **p1-ate-logo → p1-primeira-conversa → p1-qingwen-cortesia → l2-rev → p2-ma-primeiro-tom** — seed 你好 23%; dominadas 0
- **p1-primeira-conversa → p1-qingwen-cortesia → l2-rev → p2-ma-primeiro-tom → p2-ma-segundo-tom** — seed 你好 23%; dominadas 0
- **p1-qingwen-cortesia → l2-rev → p2-ma-primeiro-tom → p2-ma-segundo-tom → p2-ma-terceiro-tom** — seed 你好 21%; dominadas 0
- **l2-rev → p2-ma-primeiro-tom → p2-ma-segundo-tom → p2-ma-terceiro-tom → p2-ma-quarto-tom** — seed 你好 21%; dominadas 0
- **p2-ma-primeiro-tom → p2-ma-segundo-tom → p2-ma-terceiro-tom → p2-ma-quarto-tom → p2-comparar-tom-1-4** — seed 你好 15%; dominadas 0

## Issues (hard)

_Nenhuma._

## Avisos (soft)

- **seed_excess_in_lesson**: p1-o-que-e-mandarim: seed "你好" aparece 10× (aviso > 8)
- **seed_excess_in_lesson**: p1-o-que-e-pinyin: seed "你好" aparece 13× (aviso > 8)
- **seed_excess_in_lesson**: p1-o-que-e-tom: seed "你好" aparece 16× (aviso > 8)
- **seed_excess_in_lesson**: p1-o-que-e-tom: seed "谢谢" aparece 9× (aviso > 8)
- **seed_excess_in_lesson**: p1-engine-2-lab: seed "你好" aparece 16× (aviso > 8)
- **seed_excess_in_lesson**: p1-engine-2-lab: seed "谢谢" aparece 14× (aviso > 8)
- **seed_excess_in_lesson**: p1-engine-2-lab: seed "再见" aparece 14× (aviso > 8)
- **seed_excess_in_lesson**: p1-engine-2-lab: seed "不客气" aparece 11× (aviso > 8)
- **seed_excess_in_lesson**: l1: seed "你好" aparece 30× (aviso > 8)
- **seed_excess_in_lesson**: l2: seed "你好" aparece 21× (aviso > 8)
- **seed_excess_in_lesson**: l3: seed "你好" aparece 15× (aviso > 8)
- **seed_excess_in_lesson**: l1-rev: seed "你好" aparece 33× (aviso > 8)
- **seed_excess_in_lesson**: l4: seed "谢谢" aparece 15× (aviso > 8)
- **seed_excess_in_lesson**: l4: seed "不客气" aparece 14× (aviso > 8)
- **seed_excess_in_lesson**: p1-ate-logo: seed "再见" aparece 13× (aviso > 8)
- **seed_excess_in_lesson**: p1-ate-logo: seed "你好" aparece 12× (aviso > 8)
- **seed_excess_in_lesson**: p1-primeira-conversa: seed "你好" aparece 24× (aviso > 8)
- **seed_excess_in_lesson**: p1-qingwen-cortesia: seed "你好" aparece 22× (aviso > 8)
- **seed_excess_in_lesson**: l2-rev: seed "你好" aparece 40× (aviso > 8)
- **seed_excess_in_lesson**: l2-rev: seed "谢谢" aparece 9× (aviso > 8)
- **seed_excess_in_lesson**: p2-ma-primeiro-tom: seed "你好" aparece 21× (aviso > 8)
- **seed_excess_in_lesson**: p2-ma-segundo-tom: seed "你好" aparece 13× (aviso > 8)
- **seed_excess_in_lesson**: p2-ma-terceiro-tom: seed "你好" aparece 13× (aviso > 8)
- **seed_excess_in_lesson**: p2-ma-quarto-tom: seed "你好" aparece 13× (aviso > 8)
- **seed_excess_in_lesson**: p2-comparar-tom-1-4: seed "再见" aparece 13× (aviso > 8)
