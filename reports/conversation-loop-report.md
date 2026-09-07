# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | e36445e08156 |
| HEAD no instante da geração | b873149cd8c695be532080fa4385298f031bed5c |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-07T16:56:13.122Z |
| Lições | 127 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 138 |
| Itens de vocabulário exibidos | 960 |
| Itens cobertos por tarefa posterior | 759 |
| Cobertura bruta | 79.1 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 552 |
| **Cobertura relevante** (portão ≥ 76 %) | **81.3 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 31 refs |
| Reutilização média por item | 1.98 |
| Itens sem cobertura | 201 |
| Tarefas da fase Pós-Conversa | 557 |
| Média Pós-Conversa por conversa | 4.04 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build, write |
| l2 @ M1 tarefas pós-conversa | 2 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.

## Núcleo saturado (fora do denominador)

- char:ni — 521 exposições ao longo dos 127 planos
- char:hao — 494 exposições ao longo dos 127 planos
- chunk:nihao — 347 exposições ao longo dos 127 planos
- char:shi — 259 exposições ao longo dos 127 planos
- char:bu — 240 exposições ao longo dos 127 planos
- char:yi — 215 exposições ao longo dos 127 planos
- chunk:nijiaoshenme — 213 exposições ao longo dos 127 planos
- chunk:wohenhao — 194 exposições ao longo dos 127 planos
- char:ma_question — 185 exposições ao longo dos 127 planos
- chunk:qingzaishuoyibian — 138 exposições ao longo dos 127 planos
- char:zai — 127 exposições ao longo dos 127 planos
- chunk:xiexie — 108 exposições ao longo dos 127 planos
- char:na_that — 108 exposições ao longo dos 127 planos
- char:zhe — 108 exposições ao longo dos 127 planos
- char:ri — 99 exposições ao longo dos 127 planos
- chunk:wojiao — 98 exposições ao longo dos 127 planos
- chunk:zaijian — 80 exposições ao longo dos 127 planos
- chunk:nihaoma — 77 exposições ao longo dos 127 planos
- char:na_which — 69 exposições ao longo dos 127 planos
- char:shui — 61 exposições ao longo dos 127 planos
- char:shan — 55 exposições ao longo dos 127 planos
- chunk:nashirenm — 55 exposições ao longo dos 127 planos
- char:li_inside — 54 exposições ao longo dos 127 planos
- chunk:wohuishuoyidian — 49 exposições ao longo dos 127 planos
- char:er — 49 exposições ao longo dos 127 planos
- chunk:wature — 46 exposições ao longo dos 127 planos
- chunk:woshixuesheng — 45 exposições ao longo dos 127 planos
- char:yao — 45 exposições ao longo dos 127 planos
- char:san — 43 exposições ao longo dos 127 planos
- chunk:bukeqi — 43 exposições ao longo dos 127 planos
- chunk:zaina — 41 exposições ao longo dos 127 planos

## Itens de prioridade sem cobertura

- l9-qual-nome:chunk:nishinaiguoren (24 exposições no curso)
- l12:chunk:zenmeyang (11 exposições no curso)
- l12:chunk:nishixueshengma (13 exposições no curso)
- l12:chunk:nixuexishenme (11 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (13 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (11 exposições no curso)
- l13-dialogo-nome:chunk:nine (13 exposições no curso)
- l13-dialogo-nome:chunk:nishinaiguoren (24 exposições no curso)
- l13-dialogo-nome:chunk:nishixueshengma (13 exposições no curso)
- l13-dialogo-nome:chunk:nixuexishenme (11 exposições no curso)
- l13-dialogo-nome:chunk:renshinihengaoxing (7 exposições no curso)
- l13-dialogo-nome:chunk:wature (46 exposições no curso)
- l13-dialogo-nome:chunk:woyeshi (12 exposições no curso)
- l5-rev:chunk:nishinaiguoren (24 exposições no curso)
- l5-rev:chunk:nishixueshengma (13 exposições no curso)
- l5-rev:chunk:nixuexishenme (11 exposições no curso)
- l5-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l5-rev:chunk:wature (46 exposições no curso)
- l14-char-rev:chunk:zheshishenme (36 exposições no curso)
- l15:chunk:zheshishenme (36 exposições no curso)
- l6-rev:chunk:nishinaiguoren (24 exposições no curso)
- l6-rev:chunk:nishixueshengma (13 exposições no curso)
- l6-rev:chunk:nixuexishenme (11 exposições no curso)
- l6-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l6-rev:chunk:woyeshi (12 exposições no curso)
- l16:chunk:zheshishenme (36 exposições no curso)
- l17:chunk:zheshishenme (36 exposições no curso)
- l7-rev:chunk:nishinaiguoren (24 exposições no curso)
- l7-rev:chunk:nishixueshengma (13 exposições no curso)
- l7-rev:chunk:nixuexishenme (11 exposições no curso)
- l7-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l7-rev:chunk:woyeshi (12 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishinaiguoren (24 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishixueshengma (13 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nixuexishenme (11 exposições no curso)
- p4-checkpoint-fundamentos:chunk:renshinihengaoxing (7 exposições no curso)
- p4-checkpoint-fundamentos:chunk:woyeshi (12 exposições no curso)
- p5-mu-mu-lin:chunk:zheshishenme (36 exposições no curso)
- p5-mu-mu-mu-sen:chunk:zheshishenme (36 exposições no curso)
- p5-ri-yue-ming:chunk:zheshishenme (36 exposições no curso)
- p5-ren-mu-xiu:chunk:zheshishenme (36 exposições no curso)
- p5-nv-zi-hao:chunk:nishixueshengma (13 exposições no curso)
- p5-nv-zi-hao:chunk:nixuexishenme (11 exposições no curso)
- p5-ren-ren-cong:chunk:zheshishenme (36 exposições no curso)
- p5-ren-ren-ren-zhong:chunk:zheshishenme (36 exposições no curso)
- p5-nv-ma-mae:chunk:zheshishenme (36 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishenme (36 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishui (12 exposições no curso)
- l19-logica-madeira:chunk:zheshishenme (36 exposições no curso)
- l19-logica-luz:chunk:zheshishenme (36 exposições no curso)
- l19-logica-pessoas:chunk:zheshishenme (36 exposições no curso)
- l19-logica-ma:chunk:zheshishenme (36 exposições no curso)
- l19-logica-ma:chunk:zheshishui (12 exposições no curso)
- l19-logica-rev:chunk:nishixueshengma (13 exposições no curso)
- l19-logica-rev:chunk:nixuexishenme (11 exposições no curso)
- l19:chunk:zheshishenme (36 exposições no curso)
- l20:chunk:zheshishenme (36 exposições no curso)
- l8-rev:char:liu (14 exposições no curso)
- l8-rev:char:shi10 (22 exposições no curso)
- l8-rev:char:si (18 exposições no curso)
- …mais 43.

## Itens sem cobertura (bruto)

- l9-tudo-bem:chunk:wojiao
- l9-qual-nome:chunk:nishinaiguoren
- l10:chunk:woshixuesheng
- p3-wobuhui-shuo-zhongwen:chunk:wojiao
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng
- l12:chunk:zenmeyang
- l12:chunk:nishixueshengma
- l12:chunk:nixuexishenme
- l13:chunk:wojiao
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
- p5-ren-mu-xiu:chunk:zheshishenme
- …mais 121.

<!-- integridade:4abfd315107c70c6 -->
