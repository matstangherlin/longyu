# Relatório de novidade cognitiva das lições

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 822c0c252158 |
| HEAD no instante da geração | 0fb5d6e1927a0766fd4e10eb75362a07aaad90d0 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-24T18:33:41.330Z |
| Lições | 127 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Lições analisadas | 127 |
| Lições com problemas | 0 |
| Pares de repetição semântica | 955 |
| Pares com transformação cognitiva | 798 (84%) |

_Limites por lição comum: resposta exata ≤2 (underAnswerRepeatCap) · hànzì central ≤3 · frase ≤2 · intenção ≤2 · imagem ≤1 · cena ≤1. Acima do limite, cada repetição precisa de transformação cognitiva (revisões têm folga extra)._

## Lições com problemas

Nenhuma — toda repetição semântica acima dos limites traz transformação cognitiva.

## Métricas por lição

| Lição | Passos | Avaliados | Chaves distintas | Repetições | Transformadas | Aplicação real | Chave mais repetida |
|-------|-------:|----------:|-----------------:|-----------:|--------------:|---------------:|---------------------|
| p1-o-que-e-mandarim | 6 | 5 | 6 | 6 | 6 | 2 | phrase:你好 × 3 |
| p1-o-que-e-pinyin | 5 | 4 | 7 | 6 | 6 | 1 | phrase:你好 × 3 |
| p1-o-que-e-tom | 9 | 8 | 9 | 4 | 4 | 2 | char:妈 × 2 |
| p1-o-que-e-hanzi | 11 | 10 | 11 | 3 | 3 | 4 | char:木 × 3 |
| p1-primeiros-hanzi | 11 | 10 | 8 | 8 | 4 | 7 | action:assemble-hanzi × 5 |
| p1-engine-2-lab | 6 | 6 | 13 | 0 | 0 | 4 | — |
| l1 | 10 | 9 | 21 | 4 | 4 | 4 | phrase:你好 × 2 |
| l2 | 15 | 14 | 25 | 14 | 14 | 5 | intent:identify-concept × 4 |
| l3 | 13 | 12 | 26 | 9 | 9 | 8 | phrase:我很好 × 3 |
| l1-rev | 12 | 10 | 17 | 13 | 12 | 6 | phrase:你好 × 4 |
| l4 | 16 | 15 | 30 | 12 | 9 | 8 | phrase:谢谢 × 2 |
| p1-ate-logo | 15 | 14 | 28 | 10 | 10 | 7 | phrase:再见 × 3 |
| p1-primeira-conversa | 10 | 9 | 21 | 5 | 5 | 6 | phrase:你好 × 2 |
| p1-qingwen-cortesia | 15 | 14 | 30 | 12 | 9 | 8 | phrase:你好 × 3 |
| l2-rev | 12 | 10 | 18 | 11 | 11 | 6 | intent:thank × 3 |
| p2-ma-primeiro-tom | 8 | 5 | 5 | 1 | 1 | 2 | char:山 × 2 |
| p2-ma-segundo-tom | 5 | 3 | 1 | 1 | 1 | 1 | char:麻 × 2 |
| p2-ma-terceiro-tom | 5 | 3 | 1 | 1 | 1 | 1 | char:马 × 2 |
| p2-ma-quarto-tom | 7 | 4 | 4 | 4 | 4 | 1 | char:骂 × 2 |
| p2-comparar-tom-1-4 | 6 | 5 | 2 | 1 | 1 | 1 | char:骂 × 2 |
| p2-comparar-tom-2-3 | 6 | 5 | 2 | 0 | 0 | 2 | — |
| l5 | 14 | 13 | 16 | 10 | 10 | 6 | intent:polite-question × 4 |
| l6 | 13 | 12 | 19 | 7 | 7 | 6 | intent:polite-question × 4 |
| l3-rev | 12 | 11 | 22 | 11 | 11 | 7 | intent:polite-question × 4 |
| l7 | 14 | 13 | 26 | 5 | 5 | 7 | phrase:我很好 × 2 |
| l8 | 12 | 11 | 19 | 6 | 6 | 7 | char:好 × 3 |
| l8-compare | 12 | 11 | 17 | 9 | 5 | 7 | char:妈 × 2 |
| l8-shi | 14 | 13 | 22 | 9 | 5 | 7 | char:是 × 2 |
| p2-tons-nihao | 11 | 10 | 16 | 9 | 9 | 7 | phrase:你好 × 3 |
| p2-tons-xiexie | 12 | 11 | 24 | 5 | 5 | 8 | phrase:谢谢 × 2 |
| p2-sons-brasileiros | 16 | 15 | 26 | 13 | 8 | 6 | intent:identify-concept × 4 |
| p2-numeros-1-5 | 15 | 14 | 23 | 9 | 8 | 6 | char:一 × 3 |
| l4-rev | 12 | 11 | 24 | 7 | 7 | 6 | char:妈 × 3 |
| l9 | 18 | 17 | 33 | 14 | 11 | 14 | phrase:我叫Matheus × 3 |
| l9-tudo-bem | 17 | 16 | 37 | 14 | 13 | 11 | intent:ask-wellbeing × 3 |
| l9-qual-nome | 14 | 13 | 32 | 14 | 7 | 11 | phrase:你叫什么 × 3 |
| l10 | 16 | 15 | 32 | 14 | 10 | 11 | intent:ask-origin × 3 |
| p3-wohenhao | 14 | 13 | 25 | 17 | 17 | 10 | intent:greet × 4 |
| p3-wobuhui-shuo-zhongwen | 14 | 13 | 32 | 13 | 12 | 8 | phrase:请再说一遍 × 4 |
| p3-qing-zai-shuo-yibian | 15 | 14 | 36 | 14 | 14 | 11 | phrase:请再说一遍 × 3 |
| l11 | 17 | 16 | 37 | 16 | 14 | 10 | intent:identify-concept × 3 |
| l11-falo-pouco | 19 | 18 | 42 | 15 | 14 | 15 | action:assemble-phrase × 3 |
| l12 | 19 | 18 | 46 | 8 | 6 | 14 | intent:introduce-self × 3 |
| l13 | 18 | 17 | 46 | 10 | 10 | 15 | intent:introduce-self × 4 |
| l13-dialogo-ola | 18 | 17 | 42 | 12 | 10 | 13 | intent:state-wellbeing × 3 |
| l13-dialogo-nome | 17 | 16 | 43 | 8 | 7 | 14 | action:assemble-phrase × 3 |
| p3-ordem-das-palavras | 15 | 14 | 33 | 12 | 5 | 12 | action:assemble-phrase × 3 |
| p3-nomes-da-frase | 10 | 9 | 26 | 4 | 4 | 7 | action:assemble-phrase × 2 |
| l5-rev | 12 | 12 | 25 | 5 | 4 | 5 | intent:identify-concept × 3 |
| l14 | 16 | 15 | 33 | 8 | 7 | 10 | char:人 × 3 |
| p4-num-123 | 15 | 14 | 32 | 7 | 7 | 9 | char:一 × 3 |
| p4-num-45 | 14 | 13 | 29 | 5 | 5 | 8 | char:木 × 2 |
| p4-num-678 | 14 | 14 | 37 | 3 | 3 | 9 | phrase:请再说一遍 × 2 |
| p4-num-910 | 15 | 14 | 39 | 3 | 3 | 10 | phrase:请再说一遍 × 2 |
| p4-char-mu | 15 | 14 | 32 | 6 | 6 | 10 | char:木 × 3 |
| p4-char-ren | 15 | 14 | 30 | 7 | 6 | 10 | char:人 × 2 |
| p4-char-kou | 14 | 13 | 33 | 5 | 4 | 8 | char:口 × 2 |
| p4-char-ri | 15 | 14 | 37 | 6 | 5 | 11 | char:日 × 2 |
| p4-char-yue | 14 | 13 | 31 | 6 | 5 | 8 | char:月 × 2 |
| p4-char-shan | 14 | 13 | 34 | 6 | 5 | 10 | char:山 × 2 |
| p4-char-shui | 15 | 14 | 26 | 16 | 10 | 12 | char:水 × 3 |
| p4-char-tian | 15 | 14 | 33 | 8 | 7 | 11 | char:天 × 2 |
| p4-char-huo | 14 | 13 | 27 | 7 | 3 | 10 | char:水 × 3 |
| p4-char-da | 14 | 13 | 34 | 6 | 5 | 10 | char:大 × 2 |
| p4-char-xiao | 14 | 13 | 35 | 6 | 5 | 9 | char:小 × 2 |
| p4-char-zhong | 14 | 13 | 34 | 6 | 5 | 11 | char:人 × 2 |
| p4-char-bu | 14 | 13 | 34 | 6 | 3 | 9 | phrase:我叫Matheus × 2 |
| p4-char-shi | 15 | 14 | 32 | 9 | 9 | 12 | intent:introduce-self × 4 |
| p4-char-wo | 14 | 13 | 34 | 5 | 5 | 9 | char:我 × 3 |
| p4-char-ni | 14 | 13 | 32 | 7 | 4 | 10 | char:你 × 2 |
| l14-numeros-visuais | 14 | 13 | 25 | 8 | 8 | 8 | action:assemble-phrase × 3 |
| l14-pecas-natureza | 15 | 14 | 31 | 6 | 2 | 11 | char:日 × 2 |
| l14-frase-minima | 19 | 18 | 42 | 9 | 5 | 14 | action:assemble-hanzi × 4 |
| l14-char-rev | 16 | 16 | 28 | 7 | 5 | 10 | char:一 × 3 |
| l15 | 16 | 15 | 28 | 5 | 4 | 9 | char:林 × 3 |
| l6-rev | 12 | 11 | 23 | 6 | 6 | 7 | intent:state-wellbeing × 3 |
| l16 | 16 | 15 | 33 | 1 | 1 | 8 | char:妈 × 2 |
| l17 | 15 | 14 | 26 | 3 | 2 | 10 | char:日 × 2 |
| l18 | 16 | 15 | 33 | 12 | 11 | 12 | intent:introduce-self × 4 |
| l7-rev | 12 | 11 | 25 | 8 | 5 | 8 | intent:identify-concept × 2 |
| p4-checkpoint-fundamentos | 12 | 11 | 24 | 12 | 12 | 6 | phrase:你好 × 3 |
| p5-mu-mu-lin | 15 | 14 | 30 | 4 | 3 | 10 | char:木 × 3 |
| p5-mu-mu-mu-sen | 15 | 14 | 30 | 4 | 3 | 9 | char:木 × 3 |
| p5-ri-yue-ming | 15 | 14 | 27 | 4 | 2 | 9 | char:明 × 3 |
| p5-ren-mu-xiu | 15 | 14 | 29 | 3 | 2 | 8 | char:人 × 2 |
| p5-nv-zi-hao | 15 | 14 | 26 | 8 | 7 | 10 | char:好 × 4 |
| p5-ren-ren-cong | 16 | 15 | 32 | 1 | 1 | 10 | char:人 × 2 |
| p5-ren-ren-ren-zhong | 16 | 15 | 33 | 2 | 2 | 9 | char:人 × 3 |
| p5-nv-ma-mae | 16 | 15 | 29 | 3 | 3 | 8 | char:妈 × 3 |
| p5-kou-ma-pergunta | 14 | 13 | 34 | 2 | 2 | 10 | char:口 × 3 |
| l19-logica-madeira | 16 | 15 | 25 | 4 | 3 | 8 | char:木 × 4 |
| l19-logica-luz | 16 | 15 | 33 | 3 | 2 | 11 | char:日 × 3 |
| l19-logica-pessoas | 16 | 15 | 30 | 2 | 2 | 8 | char:人 × 3 |
| l19-logica-ma | 14 | 13 | 28 | 4 | 4 | 8 | char:妈 × 4 |
| l19-logica-rev | 16 | 15 | 33 | 4 | 3 | 10 | char:林 × 2 |
| l19 | 18 | 17 | 37 | 2 | 2 | 11 | char:一 × 2 |
| l20 | 16 | 15 | 27 | 2 | 2 | 8 | char:六 × 2 |
| l8-rev | 12 | 12 | 26 | 5 | 4 | 5 | intent:identify-concept × 3 |
| l21 | 16 | 15 | 30 | 4 | 4 | 9 | phrase:我们 × 2 |
| l22 | 15 | 14 | 33 | 10 | 9 | 12 | action:assemble-phrase × 4 |
| l23 | 14 | 13 | 29 | 9 | 7 | 10 | intent:introduce-self × 4 |
| l9-rev | 12 | 12 | 24 | 9 | 8 | 10 | action:assemble-phrase × 3 |
| l24 | 19 | 18 | 43 | 6 | 6 | 14 | intent:state-wellbeing × 3 |
| l25 | 19 | 18 | 44 | 9 | 8 | 16 | action:assemble-phrase × 3 |
| l26 | 14 | 13 | 32 | 12 | 12 | 9 | phrase:我喜欢中文 × 3 |
| l26b | 19 | 17 | 34 | 8 | 7 | 15 | action:produce-unaided × 4 |
| l27 | 19 | 18 | 45 | 12 | 11 | 15 | action:produce-unaided × 4 |
| l28 | 19 | 19 | 48 | 7 | 6 | 16 | action:assemble-phrase × 3 |
| p6-rotina-trabalho | 21 | 20 | 44 | 6 | 6 | 14 | phrase:我坐飞机 × 3 |
| p6-cidade-lugares | 18 | 16 | 39 | 7 | 6 | 13 | action:assemble-phrase × 3 |
| p6-china-cidades | 19 | 18 | 43 | 10 | 6 | 14 | action:assemble-phrase × 3 |
| p6-china-cidades-2 | 17 | 16 | 43 | 4 | 4 | 14 | phrase:我坐飞机 × 2 |
| p6-china-ruas | 20 | 19 | 46 | 9 | 8 | 15 | action:assemble-phrase × 3 |
| p6-saude | 17 | 16 | 39 | 5 | 5 | 13 | action:produce-unaided × 3 |
| p6-horarios | 19 | 18 | 40 | 7 | 6 | 15 | action:assemble-phrase × 3 |
| p6-natureza | 19 | 18 | 39 | 7 | 7 | 13 | phrase:下雨了 × 3 |
| p6-clima | 17 | 16 | 37 | 8 | 8 | 11 | intent:state-wellbeing × 3 |
| p6-direcoes | 18 | 17 | 39 | 11 | 10 | 13 | action:assemble-phrase × 3 |
| p6-compras | 19 | 18 | 45 | 10 | 9 | 14 | action:assemble-phrase × 3 |
| p6-survival-mandarin | 19 | 18 | 39 | 6 | 5 | 16 | action:assemble-phrase × 3 |
| l10-rev | 12 | 12 | 29 | 5 | 4 | 7 | action:assemble-phrase × 2 |
| l29 | 19 | 18 | 41 | 8 | 4 | 16 | action:assemble-phrase × 3 |
| l30 | 18 | 17 | 45 | 5 | 4 | 12 | action:assemble-phrase × 3 |
| l11-rev | 12 | 12 | 22 | 8 | 4 | 9 | action:assemble-phrase × 2 |
| p7-imersao-mercado | 31 | 30 | 52 | 22 | 12 | 17 | intent:identify-concept × 3 |
| p7-imersao-estacao | 33 | 31 | 56 | 24 | 17 | 21 | action:assemble-phrase × 3 |
| p7-imersao-casa-amigo | 29 | 28 | 57 | 20 | 17 | 17 | intent:identify-concept × 3 |

---

_Transformações válidas: reconhecimento→produção, imagem→hànzì, hànzì→áudio, palavra→frase, frase→conversa, guiada→sem ajuda, significado→aplicação, item isolado→combinação com conteúdo antigo. Mudar só a ordem das opções, o título ou a moldura da mesma pergunta não conta._

<!-- integridade:b0bb8d54184d4591 -->
