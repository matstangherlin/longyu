# Relatório: prerequisites de transfer / free_production

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | e0c42e03d924 |
| HEAD no instante da geração | 72971a75d4a9d04722f0ee2dd05a9120df807785 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T08:46:04.028Z |
| Lições | 127 |

## Política

1. Exposição da estrutura (foco/autoral no padrão).
2. Completion ou sentence build do padrão.
3. Produção guiada (`free_production` do frame).
4. Só então `transfer_task` (frase/situação nova).
5. Produção aberta só depois de guided do objetivo.

## Resumo do plano real

| Indicador | Valor |
|-----------|------:|
| Lições | 127 |
| Lições com transfer_task | 25 |
| Lições com free_production guiada | 75 |
| Lições com produção aberta | 50 |
| Transfers precoces | 0 |
| Opens precoces | 0 |

## Primeira ocorrência por estrutura

| Frame | Padrão | Exposta | Guided | Transfer |
|-------|--------|---------|--------|----------|
| `frame_woyao` | 我要 ___ | l26b | l27 | p6-direcoes |
| `frame_woxianghe` | 我想喝 ___ | l26 | l28 | p6-clima |
| `frame_nijiaoshenme` | 你叫什么？ | p1-primeira-conversa | p1-primeira-conversa | — |
| `frame_qingwennijiaoshenme` | 请问，你叫什么？ | — | — | l2-rev |
| `frame_zainali` | ___ 在哪里？ | l25 | p6-china-cidades-2 | p6-china-ruas |
| `frame_qingwenzainali` | 请问，___ 在哪里？ | l25 | — | — |
| `frame_woxiangchi` | 我想吃 ___ | l26b | p6-cidade-lugares | p6-china-cidades |
| `frame_woxiangmai` | 我想买 ___ | — | — | — |
| `frame_duoshaoqian` | ___ 多少钱？ | p6-compras | p6-compras | p6-survival-mandarin |
| `frame_woyouge` | 我有 ___ 个 ___ | l13-dialogo-nome | l13-dialogo-nome | p3-ordem-das-palavras |
| `frame_woxihuan` | 我喜欢 ___ | l26 | l26 | l26b |
| `frame_woqu` | 我去 ___ | p6-cidade-lugares | p6-china-cidades | p6-china-cidades-2 |
| `frame_woyaomai` | 我要买 ___ | p6-compras | p6-survival-mandarin | l29 |
| `frame_niyao` | 你要 ___ | — | — | — |
| `frame_niyaoma` | 你要 ___ 吗？ | l26b | l26b | — |
| `frame_wobuhe` | 我不喝 ___ | — | — | — |
| `frame_wobuchi` | 我不吃 ___ | — | — | — |
| `frame_huijia_action` | 我回家 ___ | p7-imersao-casa-amigo | — | — |
| `frame_zuofeijiqu` | 我坐飞机去 ___ | — | — | — |
| `frame_wozai` | 我在 ___ | l11-falo-pouco | l11-falo-pouco | l26 |
| `frame_wo_le` | 我 ___ 了 | l26 | p6-rotina-trabalho | p6-cidade-lugares |

## Primeiras transferências (por frame)

- **l2-rev** · `frame_qingwennijiaoshenme` · supported · `请问，你叫什么？`
- **p3-ordem-das-palavras** · `frame_woyouge` · guided · `我有一个朋友。`
- **l26** · `frame_wozai` · guided · `我在喝水。`
- **l26b** · `frame_woxihuan` · guided · `我喜欢中国。`
- **p6-cidade-lugares** · `frame_wo_le` · guided · `我睡觉了。`
- **p6-china-cidades** · `frame_woxiangchi` · guided · `我想吃鱼。`
- **p6-china-cidades-2** · `frame_woqu` · guided · `我去银行。`
- **p6-china-ruas** · `frame_zainali` · guided · `车站在哪里？`
- **p6-clima** · `frame_woxianghe` · guided · `我想喝热水。`
- **p6-direcoes** · `frame_woyao` · guided · `我要热水。`
- **p6-survival-mandarin** · `frame_duoshaoqian` · guided · `衣服多少钱？`
- **l29** · `frame_woyaomai` · guided · `我要买书。`

## Primeiras free_production guiadas

- **p1-primeira-conversa** · `frame_nijiaoshenme` · `你叫什么？`
- **l11-falo-pouco** · `frame_wozai` · `我在学中文。`
- **l13-dialogo-nome** · `frame_woyouge` · `我有三个朋友。`
- **l26** · `frame_woxihuan` · `我喜欢中文。`
- **l26b** · `frame_niyaoma` · `你要茶吗？`
- **l27** · `frame_woyao` · `我要这个`
- **l28** · `frame_woxianghe` · `我想喝水。`
- **p6-rotina-trabalho** · `frame_wo_le` · `我饿了。`
- **p6-cidade-lugares** · `frame_woxiangchi` · `我想吃米饭。`
- **p6-china-cidades** · `frame_woqu` · `我去学校`
- **p6-china-cidades-2** · `frame_zainali` · `超市在哪里？`
- **p6-compras** · `frame_duoshaoqian` · `这件衣服多少钱？`
- **p6-survival-mandarin** · `frame_woyaomai` · `我要买衣服。`

## Primeiras produções abertas

- **l9** · objetivo `ask_name` · modelo `你叫什么？`
- **l27** · objetivo `offer_item` · modelo `你要菜。`
- **p6-rotina-trabalho** · objetivo `state_preference` · modelo `我喜欢茶。`
- **p6-china-ruas** · objetivo `request_item` · modelo `我想吃米饭。`
- **p6-saude** · objetivo `ask_location` · modelo `请问，超市在哪里？`
- **p6-natureza** · objetivo `state_ongoing` · modelo `我在北京。`
- **p6-clima** · objetivo `state_change` · modelo `我病了`
- **p6-survival-mandarin** · objetivo `ask_price` · modelo `这个多少钱？`
- **l30** · objetivo `state_destination` · modelo `我去北京。`
- **p7-imersao-casa-amigo** · objetivo `buy_item` · modelo `我想买牛奶。`

<!-- integridade:00ebb1eb6bbbeee5 -->
