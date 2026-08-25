# Relatório: prerequisites de transfer / free_production

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 8043a11ab298 |
| HEAD no instante da geração | 6911283aeb07716c251d34a0dd09e7729f0fc23b |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T17:24:32.260Z |
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
| Lições com free_production guiada | 74 |
| Lições com produção aberta (estruturalmente elegível) | 50 |
| Transfers precoces | 0 |
| Opens precoces (sem guided do objetivo) | 0 |

## Semântica: open production

- **structurallyEligibleOpen**: o auditor do plano real encontra `productionOpen` quando glifos + guided do objetivo já existem (pode aparecer cedo, ex. ask_name).
- **firstRealLearnerOpenProduction / produção independente**: no onboarding do aluno novo, a primeira `free_production` guiada sem apoio entra ~L12 (`validate:onboarding-pace`).
- Não confundir elegibilidade estrutural com o momento em que o aluno novo encontra produção no caminho real.

## Primeira ocorrência por estrutura

| Frame | Padrão | Exposta | Guided | Transfer |
|-------|--------|---------|--------|----------|
| `frame_woyao` | 我要 ___ | l26b | l27 | p6-compras |
| `frame_woxianghe` | 我想喝 ___ | l26 | l28 | p6-clima |
| `frame_nijiaoshenme` | 你叫什么？ | p1-primeira-conversa | p1-primeira-conversa | — |
| `frame_qingwennijiaoshenme` | 请问，你叫什么？ | — | — | l2-rev |
| `frame_zainali` | ___ 在哪里？ | l25 | p6-china-cidades | p6-china-cidades-2 |
| `frame_qingwenzainali` | 请问，___ 在哪里？ | l25 | — | — |
| `frame_woxiangchi` | 我想吃 ___ | l26b | p6-china-cidades-2 | p6-china-ruas |
| `frame_woxiangmai` | 我想买 ___ | — | — | — |
| `frame_duoshaoqian` | ___ 多少钱？ | p6-compras | p6-compras | p6-survival-mandarin |
| `frame_woyouge` | 我有 ___ 个 ___ | l13-dialogo-nome | p3-ordem-das-palavras | p3-nomes-da-frase |
| `frame_woxihuan` | 我喜欢 ___ | l26 | l26 | l26b |
| `frame_woqu` | 我去 ___ | p6-cidade-lugares | p6-cidade-lugares | p6-china-cidades |
| `frame_woyaomai` | 我要买 ___ | p6-compras | p6-survival-mandarin | l29 |
| `frame_niyao` | 你要 ___ | — | — | — |
| `frame_niyaoma` | 你要 ___ 吗？ | l26b | l26b | — |
| `frame_wobuhe` | 我不喝 ___ | — | — | — |
| `frame_wobuchi` | 我不吃 ___ | — | — | — |
| `frame_huijia_action` | 我回家 ___ | p7-imersao-casa-amigo | — | — |
| `frame_zuofeijiqu` | 我坐飞机去 ___ | — | — | — |
| `frame_wozai` | 我在 ___ | l11-falo-pouco | l11-falo-pouco | l26 |
| `frame_wo_le` | 我 ___ 了 | l26 | p6-china-ruas | p6-saude |

## Primeiras transferências (por frame)

- **l2-rev** · `frame_qingwennijiaoshenme` · supported · `请问，你叫什么？`
- **p3-nomes-da-frase** · `frame_woyouge` · guided · `我有五个朋友。`
- **l26** · `frame_wozai` · guided · `我在喝水。`
- **l26b** · `frame_woxihuan` · guided · `我喜欢中国。`
- **p6-china-cidades** · `frame_woqu` · guided · `我明天去医院。`
- **p6-china-cidades-2** · `frame_zainali` · guided · `车站在哪里？`
- **p6-china-ruas** · `frame_woxiangchi` · guided · `我想吃鱼。`
- **p6-saude** · `frame_wo_le` · guided · `我睡觉了。`
- **p6-clima** · `frame_woxianghe` · guided · `我想喝热水。`
- **p6-compras** · `frame_woyao` · guided · `我要热水。`
- **p6-survival-mandarin** · `frame_duoshaoqian` · guided · `香蕉多少钱？`
- **l29** · `frame_woyaomai` · guided · `我要买书。`

## Primeiras free_production guiadas

- **p1-primeira-conversa** · `frame_nijiaoshenme` · `你叫什么？`
- **l11-falo-pouco** · `frame_wozai` · `我在学中文。`
- **p3-ordem-das-palavras** · `frame_woyouge` · `我有三个朋友。`
- **l26** · `frame_woxihuan` · `我喜欢中文。`
- **l26b** · `frame_niyaoma` · `你要茶吗？`
- **l27** · `frame_woyao` · `我要这个`
- **l28** · `frame_woxianghe` · `我想喝水。`
- **p6-cidade-lugares** · `frame_woqu` · `我去医院。`
- **p6-china-cidades** · `frame_zainali` · `飞机场在哪里？`
- **p6-china-cidades-2** · `frame_woxiangchi` · `我想吃米饭。`
- **p6-china-ruas** · `frame_wo_le` · `我饿了。`
- **p6-compras** · `frame_duoshaoqian` · `这件衣服多少钱？`
- **p6-survival-mandarin** · `frame_woyaomai` · `我要买衣服。`

## structurallyEligibleOpen (primeira por objetivo)

- **l9** · objetivo `ask_name` · modelo `你叫什么？` _(elegibilidade estrutural — ver semântica acima)_
- **l27** · objetivo `offer_item` · modelo `你要菜。` _(elegibilidade estrutural — ver semântica acima)_
- **p6-rotina-trabalho** · objetivo `state_preference` · modelo `我喜欢茶。` _(elegibilidade estrutural — ver semântica acima)_
- **p6-cidade-lugares** · objetivo `state_ongoing` · modelo `我在公司上班` _(elegibilidade estrutural — ver semântica acima)_
- **p6-china-ruas** · objetivo `request_item` · modelo `我想吃米饭。` _(elegibilidade estrutural — ver semântica acima)_
- **p6-saude** · objetivo `ask_location` · modelo `请问，超市在哪里？` _(elegibilidade estrutural — ver semântica acima)_
- **p6-clima** · objetivo `state_change` · modelo `我病了` _(elegibilidade estrutural — ver semântica acima)_
- **p6-survival-mandarin** · objetivo `ask_price` · modelo `这个多少钱？` _(elegibilidade estrutural — ver semântica acima)_
- **l30** · objetivo `state_destination` · modelo `我去北京。` _(elegibilidade estrutural — ver semântica acima)_
- **p7-imersao-casa-amigo** · objetivo `buy_item` · modelo `我想买牛奶。` _(elegibilidade estrutural — ver semântica acima)_

<!-- integridade:61030daa68490550 -->
