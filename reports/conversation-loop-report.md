# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 7f4a081846d3 |
| HEAD no instante da geração | a5cb1f1f3a880ecb3645d8851e48925611589575 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-08T23:06:48.741Z |
| Lições | 127 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 136 |
| Itens de vocabulário exibidos | 927 |
| Itens cobertos por tarefa posterior | 743 |
| Cobertura bruta | 80.2 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 547 |
| **Cobertura relevante** (portão ≥ 76 %) | **82.3 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 31 refs |
| Reutilização média por item | 2.02 |
| Itens sem cobertura | 184 |
| Tarefas da fase Pós-Conversa | 542 |
| Média Pós-Conversa por conversa | 3.99 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build, write |
| l2 @ M1 tarefas pós-conversa | 2 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.

## Núcleo saturado (fora do denominador)

- char:ni — 518 exposições ao longo dos 127 planos
- char:hao — 480 exposições ao longo dos 127 planos
- chunk:nihao — 336 exposições ao longo dos 127 planos
- char:shi — 252 exposições ao longo dos 127 planos
- char:bu — 233 exposições ao longo dos 127 planos
- char:yi — 209 exposições ao longo dos 127 planos
- chunk:nijiaoshenme — 208 exposições ao longo dos 127 planos
- char:ma_question — 181 exposições ao longo dos 127 planos
- chunk:wohenhao — 178 exposições ao longo dos 127 planos
- chunk:qingzaishuoyibian — 133 exposições ao longo dos 127 planos
- char:zai — 127 exposições ao longo dos 127 planos
- char:zhe — 114 exposições ao longo dos 127 planos
- chunk:xiexie — 104 exposições ao longo dos 127 planos
- char:na_that — 103 exposições ao longo dos 127 planos
- chunk:wojiao — 99 exposições ao longo dos 127 planos
- char:ri — 96 exposições ao longo dos 127 planos
- chunk:zaijian — 81 exposições ao longo dos 127 planos
- chunk:nihaoma — 77 exposições ao longo dos 127 planos
- char:na_which — 71 exposições ao longo dos 127 planos
- char:shui — 63 exposições ao longo dos 127 planos
- char:dian_point — 57 exposições ao longo dos 127 planos
- char:li_inside — 55 exposições ao longo dos 127 planos
- chunk:nashirenm — 53 exposições ao longo dos 127 planos
- char:yao — 53 exposições ao longo dos 127 planos
- char:shan — 52 exposições ao longo dos 127 planos
- chunk:wohuishuoyidian — 47 exposições ao longo dos 127 planos
- char:san — 47 exposições ao longo dos 127 planos
- chunk:bukeqi — 46 exposições ao longo dos 127 planos
- chunk:wature — 45 exposições ao longo dos 127 planos
- chunk:zaina — 45 exposições ao longo dos 127 planos
- chunk:woshixuesheng — 40 exposições ao longo dos 127 planos

## Itens de prioridade sem cobertura

- l9-qual-nome:chunk:nishinaiguoren (23 exposições no curso)
- l12:chunk:zenmeyang (16 exposições no curso)
- l12:chunk:nishixueshengma (11 exposições no curso)
- l12:chunk:nixuexishenme (9 exposições no curso)
- l13:chunk:nishinaiguoren (23 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (11 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (9 exposições no curso)
- l13-dialogo-nome:chunk:nine (13 exposições no curso)
- l13-dialogo-nome:chunk:nishinaiguoren (23 exposições no curso)
- l13-dialogo-nome:chunk:nishixueshengma (11 exposições no curso)
- l13-dialogo-nome:chunk:nixuexishenme (9 exposições no curso)
- l13-dialogo-nome:chunk:renshinihengaoxing (7 exposições no curso)
- l13-dialogo-nome:chunk:wature (45 exposições no curso)
- l13-dialogo-nome:chunk:woyeshi (12 exposições no curso)
- l5-rev:chunk:nishinaiguoren (23 exposições no curso)
- l5-rev:chunk:nishixueshengma (11 exposições no curso)
- l5-rev:chunk:nixuexishenme (9 exposições no curso)
- l5-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l5-rev:chunk:wature (45 exposições no curso)
- l14-char-rev:chunk:zheshishenme (38 exposições no curso)
- l15:chunk:zheshishenme (38 exposições no curso)
- l6-rev:chunk:nishinaiguoren (23 exposições no curso)
- l6-rev:chunk:nishixueshengma (11 exposições no curso)
- l6-rev:chunk:nixuexishenme (9 exposições no curso)
- l6-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l6-rev:chunk:woyeshi (12 exposições no curso)
- l16:chunk:zheshishenme (38 exposições no curso)
- l17:chunk:zheshishenme (38 exposições no curso)
- l7-rev:chunk:nishinaiguoren (23 exposições no curso)
- l7-rev:chunk:nishixueshengma (11 exposições no curso)
- l7-rev:chunk:nixuexishenme (9 exposições no curso)
- l7-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l7-rev:chunk:woyeshi (12 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishinaiguoren (23 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishixueshengma (11 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nixuexishenme (9 exposições no curso)
- p4-checkpoint-fundamentos:chunk:renshinihengaoxing (7 exposições no curso)
- p4-checkpoint-fundamentos:chunk:woyeshi (12 exposições no curso)
- p5-mu-mu-lin:chunk:zheshishenme (38 exposições no curso)
- p5-mu-mu-mu-sen:chunk:zheshishenme (38 exposições no curso)
- p5-ri-yue-ming:chunk:zheshishenme (38 exposições no curso)
- p5-ren-mu-xiu:chunk:zheshishenme (38 exposições no curso)
- p5-ren-ren-cong:chunk:zheshishenme (38 exposições no curso)
- p5-ren-ren-ren-zhong:chunk:zheshishenme (38 exposições no curso)
- p5-nv-ma-mae:chunk:zheshishenme (38 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishenme (38 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishui (16 exposições no curso)
- l19-logica-madeira:chunk:zheshishenme (38 exposições no curso)
- l19-logica-luz:chunk:zheshishenme (38 exposições no curso)
- l19-logica-pessoas:chunk:zheshishenme (38 exposições no curso)
- l19-logica-ma:chunk:zheshishenme (38 exposições no curso)
- l19-logica-ma:chunk:zheshishui (16 exposições no curso)
- l19:chunk:zheshishenme (38 exposições no curso)
- l20:chunk:zheshishenme (38 exposições no curso)
- l8-rev:char:liu (14 exposições no curso)
- l8-rev:char:shi10 (16 exposições no curso)
- l8-rev:char:si (18 exposições no curso)
- l21:chunk:zheshishenme (38 exposições no curso)
- l22:chunk:nishinaiguoren (23 exposições no curso)
- l23:chunk:nishinaiguoren (23 exposições no curso)
- …mais 37.

## Itens sem cobertura (bruto)

- l9-tudo-bem:chunk:wojiao
- l9-qual-nome:chunk:nishinaiguoren
- l10:chunk:woshixuesheng
- p3-wobuhui-shuo-zhongwen:chunk:wojiao
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng
- l12:chunk:zenmeyang
- l12:chunk:nishixueshengma
- l12:chunk:nixuexishenme
- l13:chunk:nishinaiguoren
- l13:chunk:woshixuesheng
- l13-dialogo-ola:chunk:nishixueshengma
- l13-dialogo-ola:chunk:nixuexishenme
- l13-dialogo-ola:chunk:qingzaishuoyibian
- l13-dialogo-ola:chunk:xiexie
- l13-dialogo-ola:chunk:zaijian
- l13-dialogo-nome:chunk:nine
- l13-dialogo-nome:chunk:nishinaiguoren
- l13-dialogo-nome:chunk:nishixueshengma
- l13-dialogo-nome:chunk:nixuexishenme
- l13-dialogo-nome:chunk:renshinihengaoxing
- l13-dialogo-nome:chunk:wature
- l13-dialogo-nome:chunk:woyeshi
- p3-ordem-das-palavras:chunk:woshixuesheng
- p3-nomes-da-frase:chunk:woshixuesheng
- l5-rev:chunk:nishinaiguoren
- l5-rev:chunk:nishixueshengma
- l5-rev:chunk:nixuexishenme
- l5-rev:chunk:qingzaishuoyibian
- l5-rev:chunk:renshinihengaoxing
- l5-rev:chunk:wature
- l5-rev:chunk:xiexie
- l14:chunk:wohuishuoyidian
- p4-num-123:chunk:wohuishuoyidian
- p4-num-45:chunk:wohuishuoyidian
- p4-char-mu:chunk:wohuishuoyidian
- p4-char-kou:chunk:wohuishuoyidian
- p4-char-ri:chunk:wohuishuoyidian
- p4-char-yue:chunk:wohuishuoyidian
- p4-char-shan:chunk:wohuishuoyidian
- p4-char-tian:chunk:wohuishuoyidian
- p4-char-da:chunk:wohuishuoyidian
- p4-char-zhong:chunk:wohuishuoyidian
- p4-char-wo:chunk:wohuishuoyidian
- l14-numeros-visuais:chunk:wohuishuoyidian
- l14-frase-minima:char:shan
- l14-char-rev:char:shan
- l14-char-rev:chunk:zheshishenme
- l15:char:shan
- l15:chunk:zheshishenme
- l6-rev:chunk:nishinaiguoren
- l6-rev:chunk:nishixueshengma
- l6-rev:chunk:nixuexishenme
- l6-rev:chunk:qingzaishuoyibian
- l6-rev:chunk:renshinihengaoxing
- l6-rev:chunk:woyeshi
- l6-rev:chunk:xiexie
- l16:char:shan
- l16:chunk:zheshishenme
- l17:char:shan
- l17:chunk:zheshishenme
- l7-rev:chunk:nishinaiguoren
- l7-rev:chunk:nishixueshengma
- l7-rev:chunk:nixuexishenme
- l7-rev:chunk:qingzaishuoyibian
- l7-rev:chunk:renshinihengaoxing
- l7-rev:chunk:woyeshi
- l7-rev:chunk:xiexie
- p4-checkpoint-fundamentos:chunk:nishinaiguoren
- p4-checkpoint-fundamentos:chunk:nishixueshengma
- p4-checkpoint-fundamentos:chunk:nixuexishenme
- p4-checkpoint-fundamentos:chunk:qingzaishuoyibian
- p4-checkpoint-fundamentos:chunk:renshinihengaoxing
- p4-checkpoint-fundamentos:chunk:woyeshi
- p4-checkpoint-fundamentos:chunk:xiexie
- p5-mu-mu-lin:char:shan
- p5-mu-mu-lin:chunk:zheshishenme
- p5-mu-mu-mu-sen:char:shan
- p5-mu-mu-mu-sen:chunk:zheshishenme
- p5-ri-yue-ming:char:shan
- p5-ri-yue-ming:chunk:zheshishenme
- …mais 104.

<!-- integridade:edc02945b2602b99 -->
