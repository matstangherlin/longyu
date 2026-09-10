# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 10137ebc54b1 |
| HEAD no instante da geração | 370e13591b8a808bffca60844eee70f66ac61a4e |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-10T01:33:10.031Z |
| Lições | 128 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 134 |
| Itens de vocabulário exibidos | 954 |
| Itens cobertos por tarefa posterior | 741 |
| Cobertura bruta | 77.7 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 530 |
| **Cobertura relevante** (portão ≥ 76 %) | **81.1 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 31 refs |
| Reutilização média por item | 1.94 |
| Itens sem cobertura | 213 |
| Tarefas da fase Pós-Conversa | 543 |
| Média Pós-Conversa por conversa | 4.05 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, dictation, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build, write |
| l2 @ M1 tarefas pós-conversa | 2 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.

## Núcleo saturado (fora do denominador)

- char:ni — 517 exposições ao longo dos 128 planos
- char:hao — 488 exposições ao longo dos 128 planos
- chunk:nihao — 352 exposições ao longo dos 128 planos
- char:bu — 249 exposições ao longo dos 128 planos
- char:shi — 228 exposições ao longo dos 128 planos
- char:ma_question — 210 exposições ao longo dos 128 planos
- chunk:nijiaoshenme — 207 exposições ao longo dos 128 planos
- char:yi — 204 exposições ao longo dos 128 planos
- chunk:wohenhao — 170 exposições ao longo dos 128 planos
- chunk:qingzaishuoyibian — 131 exposições ao longo dos 128 planos
- chunk:xiexie — 107 exposições ao longo dos 128 planos
- char:zai — 107 exposições ao longo dos 128 planos
- char:zhe — 102 exposições ao longo dos 128 planos
- chunk:wojiao — 95 exposições ao longo dos 128 planos
- char:na_that — 94 exposições ao longo dos 128 planos
- char:ri — 91 exposições ao longo dos 128 planos
- chunk:nihaoma — 90 exposições ao longo dos 128 planos
- chunk:zaijian — 87 exposições ao longo dos 128 planos
- char:shui — 65 exposições ao longo dos 128 planos
- char:yao — 59 exposições ao longo dos 128 planos
- chunk:bukeqi — 56 exposições ao longo dos 128 planos
- char:dian_point — 51 exposições ao longo dos 128 planos
- char:shan — 50 exposições ao longo dos 128 planos
- chunk:nashirenm — 49 exposições ao longo dos 128 planos
- char:er — 48 exposições ao longo dos 128 planos
- chunk:pengyou — 44 exposições ao longo dos 128 planos
- chunk:wohuishuoyidian — 43 exposições ao longo dos 128 planos
- chunk:zheshishenme — 43 exposições ao longo dos 128 planos
- char:ba8 — 43 exposições ao longo dos 128 planos
- char:san — 41 exposições ao longo dos 128 planos
- char:cha_tea — 40 exposições ao longo dos 128 planos

## Itens de prioridade sem cobertura

- l10:chunk:woshixuesheng (30 exposições no curso)
- l12:chunk:zenmeyang (7 exposições no curso)
- l12:chunk:nishixueshengma (11 exposições no curso)
- l12:chunk:nixuexishenme (9 exposições no curso)
- l13:chunk:nishinaiguoren (21 exposições no curso)
- l13:chunk:woshixuesheng (30 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (11 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (9 exposições no curso)
- l13-dialogo-ola:chunk:zenmeyang (7 exposições no curso)
- l13-dialogo-nome:chunk:nine (13 exposições no curso)
- l13-dialogo-nome:chunk:nishinaiguoren (21 exposições no curso)
- l13-dialogo-nome:chunk:nishixueshengma (11 exposições no curso)
- l13-dialogo-nome:chunk:nixuexishenme (9 exposições no curso)
- l13-dialogo-nome:chunk:renshinihengaoxing (7 exposições no curso)
- l13-dialogo-nome:chunk:wature (45 exposições no curso)
- l13-dialogo-nome:chunk:woyeshi (7 exposições no curso)
- p3-ordem-das-palavras:chunk:woshixuesheng (30 exposições no curso)
- p3-nomes-da-frase:chunk:woshixuesheng (30 exposições no curso)
- l5-rev:chunk:nishinaiguoren (21 exposições no curso)
- l5-rev:chunk:nishixueshengma (11 exposições no curso)
- l5-rev:chunk:nixuexishenme (9 exposições no curso)
- l5-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l5-rev:chunk:wature (45 exposições no curso)
- p4-char-shi:chunk:nishinaiguoren (21 exposições no curso)
- l6-rev:chunk:nishinaiguoren (21 exposições no curso)
- l6-rev:chunk:nishixueshengma (11 exposições no curso)
- l6-rev:chunk:nixuexishenme (9 exposições no curso)
- l6-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l6-rev:chunk:woyeshi (7 exposições no curso)
- l7-rev:chunk:nishinaiguoren (21 exposições no curso)
- l7-rev:chunk:nishixueshengma (11 exposições no curso)
- l7-rev:chunk:nixuexishenme (9 exposições no curso)
- l7-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l7-rev:chunk:woyeshi (7 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishinaiguoren (21 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishixueshengma (11 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nixuexishenme (9 exposições no curso)
- p4-checkpoint-fundamentos:chunk:renshinihengaoxing (7 exposições no curso)
- p4-checkpoint-fundamentos:chunk:woyeshi (7 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishui (14 exposições no curso)
- l19-logica-ma:chunk:zheshishui (14 exposições no curso)
- l8-rev:char:liu (15 exposições no curso)
- l8-rev:char:shi10 (35 exposições no curso)
- l8-rev:char:si (18 exposições no curso)
- l22:chunk:nishinaiguoren (21 exposições no curso)
- l23:chunk:nishinaiguoren (21 exposições no curso)
- l9-rev:chunk:nishinaiguoren (21 exposições no curso)
- l24:char:sheng (37 exposições no curso)
- l24:char:xue (88 exposições no curso)
- l24:chunk:nine (13 exposições no curso)
- l24:chunk:nishixueshengma (11 exposições no curso)
- l24:chunk:woshixuesheng (30 exposições no curso)
- l24:chunk:woyeshi (7 exposições no curso)
- l25:chunk:qingwen (32 exposições no curso)
- l26:chunk:zheshishui (14 exposições no curso)
- l26b:chunk:caidan (3 exposições no curso)
- l26b:chunk:qingwenjiwei (5 exposições no curso)
- l26b:chunk:qingzuo (6 exposições no curso)
- l26b:chunk:woyaocai (2 exposições no curso)
- l26b:chunk:woyaocaidan (2 exposições no curso)
- …mais 40.

## Itens sem cobertura (bruto)

- l9-tudo-bem:chunk:wojiao
- l10:chunk:woshixuesheng
- l12:chunk:zenmeyang
- l12:chunk:nishixueshengma
- l12:chunk:nixuexishenme
- l13:chunk:nishinaiguoren
- l13:chunk:woshixuesheng
- l13-dialogo-ola:chunk:nishixueshengma
- l13-dialogo-ola:chunk:nixuexishenme
- l13-dialogo-ola:chunk:qingzaishuoyibian
- l13-dialogo-ola:chunk:zaijian
- l13-dialogo-ola:chunk:zenmeyang
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
- p4-char-shi:chunk:nishinaiguoren
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
- p5-ren-ren-cong:char:shan
- …mais 133.

<!-- integridade:a73eb93ca99d72bd -->
