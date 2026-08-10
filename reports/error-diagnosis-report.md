# Relatório de diagnóstico de erro

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | beab91b29bf152f3c194f1f13f0ad17139d4eaf4 |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-10T17:16:57.595Z |
| Lições | 122 |
| Hash da Jornada | a3cf7cc2ff44 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Causas na taxonomia | 15 |
| Eixos pedagógicos | 5 |
| Modalidades de remediação | 9 |
| Casos curados auditados | 19 |
| Causas distintas observadas | 13 |
| Maior concentração numa causa | 16% |
| Lições que mudam de plano com a fraqueza | 109 / 122 |
| Lições que renovam o conteúdo na mesma variante | 107 / 122 |
| Casos de resposta não reconhecida auditados | 8 |
| Peso de um palpite fraco vs. padrão claro | 0.25× |

> Uma causa só é aceita quando a resposta DADA sustenta o padrão — o formato
> do exercício não decide mais o motivo do erro. Por isso o mesmo exercício
> com respostas erradas diferentes produz causas diferentes, e é isso que
> permite devolver o item pelo motor que ataca o problema.

## Taxonomia

| Causa | Eixo | Remediação | Variante | O que o aluno lê |
|-------|------|------------|----------|------------------|
| Tom | som | tone_contrast | C | O som estava certo — o que mudou foi o tom. |
| Homófono | som | audio_discrimination | C | Você ouviu certo. O hànzì tem o mesmo som, mas outro sentido. |
| Grafia do pinyin | som | dictation | C | O som estava quase certo; a grafia do pinyin saiu diferente. |
| Escuta | som | dictation | C | O áudio ainda não chegou inteiro. Ouça de novo antes de escrever. |
| Hànzì parecido | forma | hanzi_form | C | Esse hànzì se parece com o certo, mas o componente muda o sentido. |
| Ordem da frase | estrutura | slot_order | B | As palavras estavam certas. A ordem mudou. |
| Peça faltando | estrutura | fill_gap | B | Faltou uma peça na frase. |
| Peça sobrando | estrutura | spot_error | B | Sobrou uma peça na frase. |
| Partícula | estrutura | fill_gap | B | A partícula é que mudou — pequena, mas carrega a gramática. |
| Classificador | estrutura | fill_gap | B | O classificador não combinou com o que você estava contando. |
| Escolha da palavra | sentido | meaning_pair | C | A estrutura estava certa; a palavra no buraco é que era outra. |
| Significado | sentido | meaning_pair | C | A ligação entre a forma e o significado ainda não está firme. |
| Objetivo da fala | sentido | goal_production | B | A frase está correta — mas não é o que a situação pedia. |
| Sem resposta | nenhum | meaning_pair | B | Ficou sem resposta. Vamos passar por isso de novo. |
| Não classificado | nenhum | meaning_pair | B | Vale rever este ponto em outro formato. |

## Casos curados

| Caso | Esperado | Respondido | Causa | Confiança |
|------|----------|------------|-------|-----------|
| produção livre com as peças certas fora de ordem | 我要茶 | 我茶要 | word_order | high |
| produção livre com o item errado no buraco | 我要茶 | 我要水 | lexical_choice | medium |
| pinyin de mesma base, tom trocado | mǎi | mài | tone | high |
| pinyin de mesma base, 3º × 4º tom | shuǐ | shuì | tone | high |
| grafia do pinyin fora de tarefa de áudio | péng | pén | pinyin_spelling | medium |
| ditado com desvio sem padrão de forma | 谢谢 | 你好 | listening | medium |
| pergunta de tom | 3º tom | 2º tom | tone | high |
| montagem de frase com peças invertidas | 我是巴西人 | 我巴西人是 | word_order | high |
| tradução montada fora de ordem | eu quero chá | chá quero eu | word_order | high |
| partícula 了 omitida | 我回家了 | 我回家 | particle | high |
| partícula 吗 sobrando | 你好 | 你好吗 | particle | high |
| classificador 个 omitido | 我有一个朋友 | 我有一朋友 | classifier | high |
| peça de conteúdo faltando | 我今天去银行 | 我去银行 | omission | high |
| peça de conteúdo sobrando | 我去银行 | 我今天去银行 | intrusion | high |
| hànzì que divide componente | 木 | 林 | grapheme | high |
| significado trocado em resposta em português | obrigado | de nada | meaning | medium |
| frase válida do corpus que não cumpre o objetivo | 我要茶 | 谢谢 | communicative | medium |
| sem resposta | 我要茶 | (vazio) | no_answer | high |
| placeholder de resposta ausente | 我要茶 | Resposta incorreta | no_answer | high |

## Resposta que o motor não explica

O corpus nunca vai enumerar todas as frases certas do mandarim. Quando a
resposta é uma tentativa bem formada e o diagnóstico sai com confiança
baixa, o aluno vê "não reconheci essa forma" e a tentativa **não** conta
como erro: sem perda de estrela, sem SRS e sem entrar no perfil de fraqueza.
Fica registrada para auditoria e para o corpus crescer.

| Caso | Respondido | Causa | Confiança | Resultado |
|------|------------|-------|-----------|-----------|
| frase válida fora do corpus | 我想喝一点茶 | lexical_choice | low | não reconhecida |
| outra construção válida fora do corpus | 我明天想去一个银行 | intrusion | low | não reconhecida |
| item trocado no buraco | 我要水 | lexical_choice | medium | erro |
| ordem trocada | 我茶要 | word_order | high | erro |
| partícula omitida | 我回家 | particle | high | erro |
| frase do corpus fora do objetivo | 谢谢 | communicative | medium | erro |
| sem resposta | (vazio) | no_answer | high | erro |
| rabisco em letras latinas | asdfgh | meaning | medium | erro |

## Formato da correção por causa

| Caso | Causa | Formato escolhido |
|------|-------|-------------------|
| tom errado dentro de montagem de frase | tone | listen |
| ordem trocada em produção livre | word_order | build |
| causa de som sem material de áudio | tone | choice |
| erro sem diagnóstico (registro anterior à onda 4) | (sem) | choice |

## Falhas

Nenhum.

<!-- integridade:e303f67b95129e71 -->
