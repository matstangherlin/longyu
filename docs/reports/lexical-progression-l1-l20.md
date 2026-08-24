# Lexical progression — L1–L20

_Gerado por `validate:lexical-progression` · 2026-08-24_

## Contagem (PED-022 / PED-025)

Oportunidades pedagógicas = estímulo/resposta/montagem/falas primárias, **deduplicadas por passo**.
Não entram: distractores de MCQ, stamps `introducesNewVocabulary` / `reusesPreviousVocabulary`.
Frases longas (ex.: 你好吗) não contam como 你好.

## Limiares (lições iniciais)

| Métrica | Limite | Gate |
|---------|-------:|------|
| Concentração máx. de saudação seed (janela 5) | 45% | hard |
| Lições dominadas pela mesma seed na janela | 3 | hard |
| Seed / lição normal | ≤8 ok · 9–12 aviso · >12 fail | hard |
| Seed / lição review | ≤14 ok · 15–18 aviso · >18 fail | hard |
| Novelty load médio / passo | 4.5 | soft |

Saudação seed: 你好 · 谢谢 · 再见 · 不客气 · 早上好 · 晚上好

## Totais seed (oportunidades L1–L20)

| Seed | Oportunidades |
|------|-------------:|
| 你好 | 34 |
| 谢谢 | 9 |
| 再见 | 6 |
| 不客气 | 6 |
| 早上好 | 0 |
| 晚上好 | 1 |

## Por lição

| # | Lição | Review | Top token | Conc. | Seed share | Novel | Lex | Str | Mod | Rec | Top3 | Dominada |
|--:|-------|:------:|----------|------:|-----------:|------:|----:|----:|----:|----:|------|----------|
| 1 | `p1-o-que-e-mandarim` | — | 你好 | 60% | 60% | 3 | 2 | 2 | 0 | 1 | 你好×3, 你×1, 好×1 | 你好 |
| 2 | `p1-o-que-e-pinyin` | — | 你好 | 60% | 60% | 0 | 0 | 1 | 1 | 2 | 你好×3, 你×1, 好×1 | 你好 |
| 3 | `p1-o-que-e-tom` | — | 妈 | 43% | 29% | 1 | 1 | 3 | 1 | 3 | 妈×3, 你好×2, 你×1 | — |
| 4 | `p1-o-que-e-hanzi` | — | 木 | 50% | 0% | 3 | 2 | 3 | 1 | 2 | 木×3, 森×1, 你×1 | — |
| 5 | `p1-primeiros-hanzi` | — | 人 | 29% | 0% | 3 | 3 | 2 | 1 | 4 | 人×2, 口×2, 山×1 | — |
| 6 | `p1-engine-2-lab` | — | 你 | 22% | 33% | 4 | 3 | 5 | 0 | 1 | 你×2, 好×2, 谢谢×1 | — |
| 7 | `l1` | — | 你好 | 23% | 23% | 3 | 1 | 3 | 2 | 5 | 你好×3, 你×2, 你叫×2 | — |
| 8 | `l2` | — | 你 | 24% | 18% | 0 | 0 | 4 | 3 | 7 | 你×4, 你好×3, 我叫×3 | — |
| 9 | `l3` | — | 我很好 | 14% | 18% | 7 | 4 | 7 | 2 | 5 | 我很好×3, 好×3, 你×3 | — |
| 10 | `l1-rev` | sim | 你好 | 36% | 36% | 0 | 0 | 3 | 2 | 7 | 你好×5, 你×4, 好×3 | 你好 |
| 11 | `l4` | — | 你好 | 13% | 30% | 6 | 4 | 10 | 2 | 6 | 你好×3, 谢谢×2, 不客气×2 | — |
| 12 | `p1-ate-logo` | — | 再见 | 21% | 37% | 2 | 2 | 7 | 3 | 7 | 再见×4, 再×2, 见×2 | — |
| 13 | `p1-primeira-conversa` | — | 你好 | 21% | 21% | 0 | 0 | 4 | 2 | 5 | 你好×3, 你×2, 你叫×2 | — |
| 14 | `p1-qingwen-cortesia` | — | 你 | 16% | 13% | 4 | 2 | 8 | 2 | 8 | 你×5, 好×4, 你好×4 | — |
| 15 | `l2-rev` | sim | 谢谢 | 31% | 54% | 0 | 0 | 6 | 2 | 6 | 谢谢×4, 不客气×3, 明天见×1 | 谢谢 |
| 16 | `p2-ma-primeiro-tom` | — | 山 | 50% | 0% | 0 | 0 | 2 | 0 | 6 | 山×3, 妈×2, 吗×1 | — |
| 17 | `p2-ma-segundo-tom` | — | 麻 | 100% | 0% | 1 | 1 | 1 | 0 | 2 | 麻×3 | — |
| 18 | `p2-ma-terceiro-tom` | — | 马 | 100% | 0% | 0 | 0 | 1 | 0 | 3 | 马×3 | — |
| 19 | `p2-ma-quarto-tom` | — | 骂 | 60% | 40% | 1 | 1 | 2 | 0 | 4 | 骂×3, 谢谢×2 | — |
| 20 | `p2-comparar-tom-1-4` | — | 骂 | 67% | 0% | 0 | 0 | 1 | 0 | 3 | 骂×2, 妈×1 | — |

## Janelas de 5 lições

| Janela | Seed top | Seed % | Dominadas | Top token | Conc. |
|--------|----------|-------:|----------:|-----------|------:|
| p1-o-que-e-mandarim…p1-primeiros-hanzi | 你好 | 27% | 2 | 你好 | 27% |
| p1-o-que-e-pinyin…p1-engine-2-lab | 你好 | 18% | 1 | 你好 | 18% |
| p1-o-que-e-tom…l1 | 你好 | 14% | 0 | 你好 | 14% |
| p1-o-que-e-hanzi…l2 | 你好 | 13% | 0 | 你 | 17% |
| p1-primeiros-hanzi…l3 | 你好 | 13% | 0 | 你 | 16% |
| p1-engine-2-lab…l1-rev | 你好 | 19% | 1 | 你 | 20% |
| l1…l4 | 你好 | 18% | 1 | 你好 | 18% |
| l2…p1-ate-logo | 你好 | 16% | 1 | 你好 | 16% |
| l3…p1-primeira-conversa | 你好 | 16% | 1 | 你好 | 16% |
| l1-rev…p1-qingwen-cortesia | 你好 | 17% | 1 | 你好 | 17% |
| l4…l2-rev | 你好 | 12% | 0 | 你好 | 12% |
| p1-ate-logo…p2-ma-primeiro-tom | 你好 | 11% | 0 | 你好 | 11% |
| p1-primeira-conversa…p2-ma-segundo-tom | 你好 | 10% | 0 | 你好 | 10% |
| p1-qingwen-cortesia…p2-ma-terceiro-tom | 你好 | 7% | 0 | 你 | 9% |
| l2-rev…p2-ma-quarto-tom | 谢谢 | 20% | 1 | 谢谢 | 20% |
| p2-ma-primeiro-tom…p2-comparar-tom-1-4 | 谢谢 | 10% | 0 | 骂 | 25% |

## Issues (hard gate)

Nenhuma issue hard em L1–L20.

## Avisos (soft)

_Nenhum._
