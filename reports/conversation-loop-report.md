# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 822c0c252158 |
| HEAD no instante da geração | 0fb5d6e1927a0766fd4e10eb75362a07aaad90d0 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-24T18:32:55.233Z |
| Lições | 127 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 156 |
| Itens de vocabulário exibidos | 947 |
| Itens cobertos por tarefa posterior | 769 |
| Cobertura bruta | 81.2 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 486 |
| **Cobertura relevante** (portão ≥ 76 %) | **88.9 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 29 refs |
| Reutilização média por item | 1.96 |
| Itens sem cobertura | 178 |
| Tarefas da fase Pós-Conversa | 586 |
| Média Pós-Conversa por conversa | 3.76 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build |
| l2 @ M1 tarefas pós-conversa | 3 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.

## Núcleo saturado (fora do denominador)

- char:hao — 545 exposições ao longo dos 127 planos
- chunk:nihao — 396 exposições ao longo dos 127 planos
- char:bu — 269 exposições ao longo dos 127 planos
- char:shi — 268 exposições ao longo dos 127 planos
- chunk:wohenhao — 219 exposições ao longo dos 127 planos
- char:ma_question — 210 exposições ao longo dos 127 planos
- char:yi — 189 exposições ao longo dos 127 planos
- chunk:nijiaoshenme — 160 exposições ao longo dos 127 planos
- char:zai — 136 exposições ao longo dos 127 planos
- chunk:wojiao — 112 exposições ao longo dos 127 planos
- chunk:qingzaishuoyibian — 112 exposições ao longo dos 127 planos
- chunk:xiexie — 110 exposições ao longo dos 127 planos
- char:na_that — 107 exposições ao longo dos 127 planos
- char:ri — 99 exposições ao longo dos 127 planos
- chunk:zaijian — 92 exposições ao longo dos 127 planos
- char:shui — 83 exposições ao longo dos 127 planos
- chunk:nihaoma — 82 exposições ao longo dos 127 planos
- char:na_which — 71 exposições ao longo dos 127 planos
- char:er — 60 exposições ao longo dos 127 planos
- chunk:nashirenm — 56 exposições ao longo dos 127 planos
- char:shan — 54 exposições ao longo dos 127 planos
- char:san — 51 exposições ao longo dos 127 planos
- char:ba8 — 48 exposições ao longo dos 127 planos
- char:li_inside — 46 exposições ao longo dos 127 planos
- chunk:tingbudong — 45 exposições ao longo dos 127 planos
- chunk:bukeqi — 44 exposições ao longo dos 127 planos
- chunk:wohuishuoyidian — 42 exposições ao longo dos 127 planos
- chunk:zheshishenme — 42 exposições ao longo dos 127 planos
- chunk:wature — 42 exposições ao longo dos 127 planos

## Itens de prioridade sem cobertura

- l9-qual-nome:chunk:nishinaiguoren (20 exposições no curso)
- l10:chunk:woshixuesheng (35 exposições no curso)
- p3-wohenhao:chunk:zenmeyang (19 exposições no curso)
- p3-qing-zai-shuo-yibian:chunk:nishinaiguoren (20 exposições no curso)
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng (35 exposições no curso)
- l11-falo-pouco:chunk:nishixueshengma (6 exposições no curso)
- l11-falo-pouco:chunk:nixuexishenme (6 exposições no curso)
- l12:chunk:nishixueshengma (6 exposições no curso)
- l12:chunk:nixuexishenme (6 exposições no curso)
- l12:chunk:nishinaiguoren (20 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (6 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (6 exposições no curso)
- l13-dialogo-ola:chunk:zenmeyang (19 exposições no curso)
- p3-ordem-das-palavras:chunk:nishinaiguoren (20 exposições no curso)
- p3-ordem-das-palavras:chunk:woshixuesheng (35 exposições no curso)
- l5-rev:chunk:nishixueshengma (6 exposições no curso)
- l5-rev:chunk:nixuexishenme (6 exposições no curso)
- l6-rev:chunk:zenmeyang (19 exposições no curso)
- p5-nv-zi-hao:chunk:nishixueshengma (6 exposições no curso)
- p5-nv-zi-hao:chunk:nixuexishenme (6 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishui (20 exposições no curso)
- l19-logica-ma:chunk:zheshishui (20 exposições no curso)
- l19-logica-rev:chunk:nishixueshengma (6 exposições no curso)
- l19-logica-rev:chunk:nixuexishenme (6 exposições no curso)
- l8-rev:char:liu (14 exposições no curso)
- l8-rev:char:shi10 (23 exposições no curso)
- l8-rev:char:si (21 exposições no curso)
- l22:chunk:nishinaiguoren (20 exposições no curso)
- l23:chunk:nishinaiguoren (20 exposições no curso)
- l9-rev:chunk:nishinaiguoren (20 exposições no curso)
- l24:chunk:zenmeyang (19 exposições no curso)
- l25:chunk:qingwen (30 exposições no curso)
- l27:chunk:qingwen (30 exposições no curso)
- p6-rotina-trabalho:chunk:nijidianshangban (1 exposições no curso)
- p6-rotina-trabalho:chunk:nizuoshenmegongzuo (1 exposições no curso)
- p6-rotina-trabalho:chunk:wozaigongsishangban (1 exposições no curso)
- p6-cidade-lugares:chunk:qingwen (30 exposições no curso)
- p6-china-cidades:chunk:qingwen (30 exposições no curso)
- p6-china-cidades-2:chunk:qingwen (30 exposições no curso)
- p6-china-cidades-2:chunk:woyao (12 exposições no curso)
- p6-china-ruas:chunk:yinhangzainali (4 exposições no curso)
- p6-china-ruas:char:shi10 (23 exposições no curso)
- p6-china-ruas:chunk:woyaoqujiudian (2 exposições no curso)
- p6-horarios:chunk:xiawusandian (1 exposições no curso)
- p6-clima:chunk:zenmeyang (19 exposições no curso)
- p6-direcoes:chunk:qingwen (30 exposições no curso)
- p6-survival-mandarin:chunk:zhegeduoshaoqian (8 exposições no curso)
- p6-survival-mandarin:chunk:woyaoqujiudian (2 exposições no curso)
- l29:chunk:zhegeduoshaoqian (8 exposições no curso)
- l29:chunk:zheshishui (20 exposições no curso)
- p7-imersao-mercado:chunk:zhegeduoshaoqian (8 exposições no curso)
- p7-imersao-estacao:chunk:qingwen (30 exposições no curso)
- p7-imersao-estacao:chunk:taiguile (14 exposições no curso)
- p7-imersao-casa-amigo:chunk:zhegeduoshaoqian (8 exposições no curso)

## Itens sem cobertura (bruto)

- p2-numeros-1-5:chunk:qingzaishuoyibian
- l9-tudo-bem:chunk:qingzaishuoyibian
- l9-qual-nome:chunk:nishinaiguoren
- l9-qual-nome:chunk:qingzaishuoyibian
- l10:chunk:woshixuesheng
- p3-wohenhao:chunk:qingzaishuoyibian
- p3-wohenhao:chunk:zenmeyang
- p3-wobuhui-shuo-zhongwen:chunk:wojiao
- p3-qing-zai-shuo-yibian:chunk:nishinaiguoren
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng
- l11:chunk:wojiao
- l11-falo-pouco:chunk:nishixueshengma
- l11-falo-pouco:chunk:nixuexishenme
- l11-falo-pouco:chunk:qingzaishuoyibian
- l12:chunk:nishixueshengma
- l12:chunk:nixuexishenme
- l12:chunk:wohenhao
- l12:chunk:nishinaiguoren
- l13:chunk:qingzaishuoyibian
- l13-dialogo-ola:chunk:nishixueshengma
- l13-dialogo-ola:chunk:nixuexishenme
- l13-dialogo-ola:chunk:qingzaishuoyibian
- l13-dialogo-ola:chunk:zaijian
- l13-dialogo-ola:chunk:zenmeyang
- p3-ordem-das-palavras:chunk:nishinaiguoren
- p3-ordem-das-palavras:chunk:woshixuesheng
- p3-nomes-da-frase:chunk:qingzaishuoyibian
- l5-rev:chunk:nishixueshengma
- l5-rev:chunk:nixuexishenme
- l5-rev:chunk:qingzaishuoyibian
- l5-rev:chunk:wohenhao
- l5-rev:chunk:xiexie
- l5-rev:chunk:zaijian
- l14:chunk:wohuishuoyidian
- p4-num-123:chunk:wohuishuoyidian
- p4-num-45:chunk:wohuishuoyidian
- p4-char-ren:chunk:wohuishuoyidian
- p4-char-kou:chunk:wohuishuoyidian
- p4-char-yue:chunk:wohuishuoyidian
- p4-char-shan:chunk:qingzaishuoyibian
- p4-char-xiao:chunk:qingzaishuoyibian
- p4-char-zhong:chunk:qingzaishuoyibian
- p4-char-bu:chunk:qingzaishuoyibian
- p4-char-shi:chunk:qingzaishuoyibian
- p4-char-wo:chunk:qingzaishuoyibian
- p4-char-ni:chunk:qingzaishuoyibian
- l14-numeros-visuais:chunk:qingzaishuoyibian
- l14-frase-minima:char:shan
- l14-char-rev:char:shan
- l14-char-rev:chunk:zheshishenme
- l15:char:shan
- l15:chunk:zheshishenme
- l6-rev:chunk:zenmeyang
- l16:char:shan
- l16:chunk:zheshishenme
- l17:char:shan
- l17:chunk:zheshishenme
- l18:chunk:qingzaishuoyibian
- p5-mu-mu-lin:char:shan
- p5-mu-mu-lin:chunk:zheshishenme
- p5-mu-mu-mu-sen:char:shan
- p5-mu-mu-mu-sen:chunk:zheshishenme
- p5-ri-yue-ming:char:shan
- p5-ri-yue-ming:chunk:zheshishenme
- p5-ren-mu-xiu:chunk:zheshishenme
- p5-nv-zi-hao:chunk:nishixueshengma
- p5-nv-zi-hao:chunk:nixuexishenme
- p5-nv-zi-hao:chunk:qingzaishuoyibian
- p5-nv-zi-hao:chunk:wohenhao
- p5-nv-zi-hao:chunk:xiexie
- p5-nv-zi-hao:chunk:zaijian
- p5-ren-ren-cong:char:shan
- p5-ren-ren-cong:chunk:zheshishenme
- p5-ren-ren-ren-zhong:char:shan
- p5-ren-ren-ren-zhong:chunk:zheshishenme
- p5-nv-ma-mae:char:shan
- p5-nv-ma-mae:chunk:zheshishenme
- p5-kou-ma-pergunta:chunk:zheshishenme
- p5-kou-ma-pergunta:chunk:zheshishui
- l19-logica-madeira:char:shan
- …mais 98.

<!-- integridade:3870b3a53f612f0f -->
