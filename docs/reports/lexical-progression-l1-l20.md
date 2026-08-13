# Lexical progression — L1–L20

_Gerado por `validate:lexical-progression` · 2026-08-13_

## Limiares (lições iniciais)

| Métrica | Limite | Gate |
|---------|-------:|------|
| Concentração máx. de saudação seed (janela 5) | 45% | hard |
| Lições dominadas pela mesma seed na janela | 3 | hard |
| Novelty load médio / passo | 4.5 | soft |
| Seed repetition aviso / lição | 8 | soft |

Saudação seed: 你好 · 谢谢 · 再见 · 不客气 · 早上好 · 晚上好

## Por lição

| # | Lição | Top token | Conc. | Seed share | Novel | Reuse | Excess | Novelty load | Dominada |
|--:|-------|----------|------:|-----------:|------:|------:|-------:|-------------:|----------|
| 1 | `p1-o-que-e-mandarim` | 你好 | 43% | 91% | 6 | 0 | 8 | 1.67 | 你好 |
| 2 | `p1-o-que-e-pinyin` | 你好 | 42% | 77% | 4 | 27 | 14 | 1.14 | 你好 |
| 3 | `p1-o-que-e-tom` | 你好 | 20% | 49% | 4 | 41 | 52 | 1.08 | — |
| 4 | `p1-o-que-e-hanzi` | 木 | 22% | 0% | 10 | 21 | 52 | 1.45 | — |
| 5 | `p1-primeiros-hanzi` | 木 | 23% | 0% | 2 | 50 | 44 | 1.30 | — |
| 6 | `p1-engine-2-lab` | 你好 | 16% | 56% | 2 | 74 | 67 | 1.29 | — |
| 7 | `l1` | 你好 | 26% | 28% | 5 | 89 | 78 | 1.31 | — |
| 8 | `l2` | 你好 | 25% | 31% | 0 | 83 | 49 | 1.15 | — |
| 9 | `l3` | 吗 | 17% | 19% | 3 | 85 | 59 | 1.31 | — |
| 10 | `l1-rev` | 你好 | 29% | 30% | 4 | 108 | 84 | 1.14 | 你好 |
| 11 | `l4` | 谢谢 | 15% | 41% | 4 | 86 | 65 | 1.21 | — |
| 12 | `p1-ate-logo` | 再见 | 21% | 44% | 0 | 61 | 30 | 1.17 | — |
| 13 | `p1-primeira-conversa` | 你好 | 25% | 33% | 0 | 95 | 61 | 1.18 | — |
| 14 | `p1-qingwen-cortesia` | 你好 | 22% | 30% | 1 | 80 | 65 | 1.30 | — |
| 15 | `l2-rev` | 你好 | 25% | 36% | 0 | 160 | 122 | 1.00 | — |
| 16 | `p2-ma-primeiro-tom` | 你好 | 23% | 23% | 0 | 93 | 61 | 1.17 | — |
| 17 | `p2-ma-segundo-tom` | 麻 | 16% | 16% | 0 | 79 | 47 | 1.17 | — |
| 18 | `p2-ma-terceiro-tom` | 马 | 17% | 17% | 0 | 77 | 48 | 1.17 | — |
| 19 | `p2-ma-quarto-tom` | 骂 | 17% | 17% | 0 | 77 | 49 | 1.17 | — |
| 20 | `p2-comparar-tom-1-4` | 妈 | 16% | 22% | 0 | 83 | 46 | 1.00 | — |

## Janelas de 5 lições

| Janela | Seed top | Seed % | Dominadas | Top token | Conc. |
|--------|----------|-------:|----------:|-----------|------:|
| p1-o-que-e-mandarim…p1-primeiros-hanzi | 你好 | 14% | 2 | 你好 | 14% |
| p1-o-que-e-pinyin…p1-engine-2-lab | 你好 | 12% | 1 | 你好 | 12% |
| p1-o-que-e-tom…l1 | 你好 | 14% | 0 | 你好 | 14% |
| p1-o-que-e-hanzi…l2 | 你好 | 15% | 0 | 你好 | 15% |
| p1-primeiros-hanzi…l3 | 你好 | 18% | 0 | 你好 | 18% |
| p1-engine-2-lab…l1-rev | 你好 | 23% | 1 | 你好 | 23% |
| l1…l4 | 你好 | 21% | 1 | 你好 | 21% |
| l2…p1-ate-logo | 你好 | 19% | 1 | 你好 | 19% |
| l3…p1-primeira-conversa | 你好 | 19% | 1 | 你好 | 19% |
| l1-rev…p1-qingwen-cortesia | 你好 | 21% | 1 | 你好 | 21% |
| l4…l2-rev | 你好 | 20% | 0 | 你好 | 20% |
| p1-ate-logo…p2-ma-primeiro-tom | 你好 | 23% | 0 | 你好 | 23% |
| p1-primeira-conversa…p2-ma-segundo-tom | 你好 | 23% | 0 | 你好 | 23% |
| p1-qingwen-cortesia…p2-ma-terceiro-tom | 你好 | 21% | 0 | 你好 | 21% |
| l2-rev…p2-ma-quarto-tom | 你好 | 21% | 0 | 你好 | 21% |
| p2-ma-primeiro-tom…p2-comparar-tom-1-4 | 你好 | 15% | 0 | 你好 | 15% |

## Issues (hard gate)

Nenhuma issue de concentração abusiva de saudação seed em L1–L20.

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
