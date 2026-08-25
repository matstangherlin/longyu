# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | d68d8346874a |
| HEAD no instante da geração | cfb504b6f79ddeb5e39257ec550afdf0d0939ea5 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T00:25:23.144Z |
| Lições | 127 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 144 |
| Itens de vocabulário exibidos | 926 |
| Itens cobertos por tarefa posterior | 741 |
| Cobertura bruta | 80.0 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 503 |
| **Cobertura relevante** (portão ≥ 76 %) | **83.3 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 32 refs |
| Reutilização média por item | 1.93 |
| Itens sem cobertura | 185 |
| Tarefas da fase Pós-Conversa | 555 |
| Média Pós-Conversa por conversa | 3.85 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build |
| l2 @ M1 tarefas pós-conversa | 3 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.

## Núcleo saturado (fora do denominador)

- char:hao — 511 exposições ao longo dos 127 planos
- char:ni — 503 exposições ao longo dos 127 planos
- chunk:nihao — 363 exposições ao longo dos 127 planos
- char:bu — 246 exposições ao longo dos 127 planos
- char:shi — 245 exposições ao longo dos 127 planos
- chunk:wohenhao — 205 exposições ao longo dos 127 planos
- char:ma_question — 205 exposições ao longo dos 127 planos
- char:yi — 197 exposições ao longo dos 127 planos
- chunk:nijiaoshenme — 153 exposições ao longo dos 127 planos
- char:zai — 146 exposições ao longo dos 127 planos
- chunk:qingzaishuoyibian — 115 exposições ao longo dos 127 planos
- char:na_that — 109 exposições ao longo dos 127 planos
- chunk:wojiao — 106 exposições ao longo dos 127 planos
- char:ri — 101 exposições ao longo dos 127 planos
- chunk:xiexie — 100 exposições ao longo dos 127 planos
- char:zhe — 96 exposições ao longo dos 127 planos
- chunk:nihaoma — 78 exposições ao longo dos 127 planos
- chunk:zaijian — 77 exposições ao longo dos 127 planos
- char:na_which — 76 exposições ao longo dos 127 planos
- char:shui — 66 exposições ao longo dos 127 planos
- char:li_inside — 57 exposições ao longo dos 127 planos
- char:shan — 56 exposições ao longo dos 127 planos
- chunk:nashirenm — 55 exposições ao longo dos 127 planos
- char:yao — 55 exposições ao longo dos 127 planos
- char:you — 55 exposições ao longo dos 127 planos
- char:er — 51 exposições ao longo dos 127 planos
- char:san — 49 exposições ao longo dos 127 planos
- chunk:wohuishuoyidian — 42 exposições ao longo dos 127 planos
- char:ba8 — 41 exposições ao longo dos 127 planos
- chunk:bukeqi — 41 exposições ao longo dos 127 planos
- chunk:tingbudong — 40 exposições ao longo dos 127 planos
- chunk:wature — 40 exposições ao longo dos 127 planos

## Itens de prioridade sem cobertura

- l9-qual-nome:chunk:nishinaiguoren (20 exposições no curso)
- l10:chunk:woshixuesheng (35 exposições no curso)
- p3-qing-zai-shuo-yibian:chunk:nishinaiguoren (20 exposições no curso)
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng (35 exposições no curso)
- l11-falo-pouco:chunk:nishixueshengma (6 exposições no curso)
- l11-falo-pouco:chunk:nixuexishenme (6 exposições no curso)
- l12:chunk:nishixueshengma (6 exposições no curso)
- l12:chunk:nixuexishenme (6 exposições no curso)
- l12:chunk:nishinaiguoren (20 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (6 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (6 exposições no curso)
- l13-dialogo-ola:chunk:zenmeyang (14 exposições no curso)
- p3-ordem-das-palavras:chunk:nishinaiguoren (20 exposições no curso)
- p3-ordem-das-palavras:chunk:woshixuesheng (35 exposições no curso)
- l5-rev:chunk:nishixueshengma (6 exposições no curso)
- l5-rev:chunk:nixuexishenme (6 exposições no curso)
- l14-char-rev:chunk:zheshishenme (35 exposições no curso)
- l15:chunk:zheshishenme (35 exposições no curso)
- l6-rev:chunk:zenmeyang (14 exposições no curso)
- l16:chunk:zheshishenme (35 exposições no curso)
- l17:chunk:zheshishenme (35 exposições no curso)
- p5-mu-mu-lin:chunk:zheshishenme (35 exposições no curso)
- p5-mu-mu-mu-sen:chunk:zheshishenme (35 exposições no curso)
- p5-ri-yue-ming:chunk:zheshishenme (35 exposições no curso)
- p5-ren-mu-xiu:chunk:zheshishenme (35 exposições no curso)
- p5-nv-zi-hao:chunk:nishixueshengma (6 exposições no curso)
- p5-nv-zi-hao:chunk:nixuexishenme (6 exposições no curso)
- p5-ren-ren-cong:chunk:zheshishenme (35 exposições no curso)
- p5-ren-ren-ren-zhong:chunk:zheshishenme (35 exposições no curso)
- p5-nv-ma-mae:chunk:zheshishenme (35 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishenme (35 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishui (12 exposições no curso)
- l19-logica-madeira:chunk:zheshishenme (35 exposições no curso)
- l19-logica-luz:chunk:zheshishenme (35 exposições no curso)
- l19-logica-pessoas:chunk:zheshishenme (35 exposições no curso)
- l19-logica-ma:chunk:zheshishenme (35 exposições no curso)
- l19-logica-ma:chunk:zheshishui (12 exposições no curso)
- l19-logica-rev:chunk:nishixueshengma (6 exposições no curso)
- l19-logica-rev:chunk:nixuexishenme (6 exposições no curso)
- l19:chunk:zheshishenme (35 exposições no curso)
- l20:chunk:zheshishenme (35 exposições no curso)
- l8-rev:char:liu (13 exposições no curso)
- l8-rev:char:shi10 (22 exposições no curso)
- l8-rev:char:si (19 exposições no curso)
- l21:chunk:zheshishenme (35 exposições no curso)
- l22:chunk:nishinaiguoren (20 exposições no curso)
- l23:chunk:nishinaiguoren (20 exposições no curso)
- l9-rev:chunk:nishinaiguoren (20 exposições no curso)
- l24:chunk:zenmeyang (14 exposições no curso)
- l25:chunk:qingwen (30 exposições no curso)
- l26b:char:shi10 (22 exposições no curso)
- l26b:chunk:duoshaoqian (28 exposições no curso)
- l26b:chunk:fuwuyuan (1 exposições no curso)
- l26b:chunk:taiguile (11 exposições no curso)
- l26b:chunk:woele (3 exposições no curso)
- l26b:chunk:womenchifanba (1 exposições no curso)
- l26b:chunk:woyaocai (2 exposições no curso)
- l26b:chunk:woyaoyibeicha (4 exposições no curso)
- l27:chunk:qingwen (30 exposições no curso)
- l28:chunk:zheshishenme (35 exposições no curso)
- …mais 24.

## Itens sem cobertura (bruto)

- l9-tudo-bem:chunk:qingzaishuoyibian
- l9-qual-nome:chunk:nishinaiguoren
- l9-qual-nome:chunk:qingzaishuoyibian
- l10:chunk:woshixuesheng
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
- p4-char-mu:chunk:wohuishuoyidian
- p4-char-kou:chunk:wohuishuoyidian
- p4-char-ri:chunk:wohuishuoyidian
- p4-char-yue:chunk:wohuishuoyidian
- p4-char-shan:chunk:qingzaishuoyibian
- p4-char-tian:chunk:wohuishuoyidian
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
- l19-logica-madeira:chunk:zheshishenme
- …mais 105.

<!-- integridade:1bb77ab74bf9ccfa -->
