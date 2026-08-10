# Relatório de diagnóstico de erro

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 85b5b31d2d1b6c7f2149a9c23fee654047ce9e8a |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-10T14:11:07.843Z |
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

> Uma causa só é aceita quando a resposta DADA sustenta o padrão — o formato
> do exercício não decide mais o motivo do erro. Por isso o mesmo exercício
> com respostas erradas diferentes produz causas diferentes, e é isso que
> permite devolver o item pelo motor que ataca o problema.

## Taxonomia

| Causa | Eixo | Remediação | Variante | O que o aluno lê |
|-------|------|------------|----------|------------------|
| Tom | som | tone_contrast | C | As sílabas estavam certas — o que escorregou foi o tom. |
| Homófono | som | audio_discrimination | C | Você ouviu certo. O hànzì escolhido tem o mesmo som, mas outro sentido. |
| Grafia do pinyin | som | dictation | C | O som estava quase lá; a grafia do pinyin é que saiu diferente. |
| Escuta | som | dictation | C | O áudio ainda não chegou inteiro. Vale ouvir de novo antes de escrever. |
| Hànzì parecido | forma | hanzi_form | C | Esse hànzì se parece com o certo, mas o componente muda o sentido. |
| Ordem da frase | estrutura | slot_order | B | As peças estavam todas certas — faltou a ordem. |
| Peça faltando | estrutura | fill_gap | B | Faltou uma peça na frase. |
| Peça sobrando | estrutura | spot_error | B | Sobrou uma peça na frase. |
| Partícula | estrutura | fill_gap | B | O que mudou foi a partícula — ela é pequena, mas carrega a gramática. |
| Classificador | estrutura | fill_gap | B | O classificador é que não combinou com o que você estava contando. |
| Escolha da palavra | sentido | meaning_pair | C | A estrutura estava certa; o item que entrou no buraco é que era outro. |
| Significado | sentido | meaning_pair | C | A ligação entre a forma e o significado ainda não está firme. |
| Objetivo da fala | sentido | goal_production | B | A frase está correta em mandarim — mas não é isso que a situação pedia. |
| Sem resposta | nenhum | meaning_pair | B | Ficou sem resposta. Não tem problema: vamos passar por isso de novo. |
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

## Formato da correção por causa

| Caso | Causa | Formato escolhido |
|------|-------|-------------------|
| tom errado dentro de montagem de frase | tone | listen |
| ordem trocada em produção livre | word_order | build |
| causa de som sem material de áudio | tone | choice |
| erro sem diagnóstico (registro anterior à onda 4) | (sem) | choice |

## Falhas

Nenhum.

<!-- integridade:b538a2f0ebe263a2 -->
