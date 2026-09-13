# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 38e70062857d |
| HEAD no instante da geração | cae6f9cb871634b5d37f536e2bd3b1ba6c9b8bb4 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-13T03:27:16.928Z |
| Lições | 134 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 141 |
| Itens de vocabulário exibidos | 993 |
| Itens cobertos por tarefa posterior | 767 |
| Cobertura bruta | 77.2 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 561 |
| **Cobertura relevante** (portão ≥ 76 %) | **80.4 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 30 refs |
| Reutilização média por item | 1.95 |
| Itens sem cobertura | 226 |
| Tarefas da fase Pós-Conversa | 571 |
| Média Pós-Conversa por conversa | 4.05 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, dictation, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build, write |
| l2 @ M1 tarefas pós-conversa | 2 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.
>
> `p7-conversa-cotidiana` e `p7-china-survival` entram no total de conversas
> analisadas, mas ficam fora do mínimo pós-conversa e da cobertura relevante:
> a missão é a prática (recall/transfer), não um loop de ensino de vocabulário.

## Núcleo saturado (fora do denominador)

- char:hao — 512 exposições ao longo dos 134 planos
- chunk:nihao — 363 exposições ao longo dos 134 planos
- char:bu — 275 exposições ao longo dos 134 planos
- char:shi — 241 exposições ao longo dos 134 planos
- char:ma_question — 228 exposições ao longo dos 134 planos
- char:yi — 210 exposições ao longo dos 134 planos
- chunk:nijiaoshenme — 209 exposições ao longo dos 134 planos
- chunk:wohenhao — 170 exposições ao longo dos 134 planos
- chunk:qingzaishuoyibian — 137 exposições ao longo dos 134 planos
- char:zai — 116 exposições ao longo dos 134 planos
- chunk:xiexie — 112 exposições ao longo dos 134 planos
- chunk:nihaoma — 95 exposições ao longo dos 134 planos
- chunk:wojiao — 95 exposições ao longo dos 134 planos
- chunk:zaijian — 93 exposições ao longo dos 134 planos
- char:ri — 91 exposições ao longo dos 134 planos
- char:na_that — 91 exposições ao longo dos 134 planos
- char:yao — 77 exposições ao longo dos 134 planos
- chunk:bukeqi — 75 exposições ao longo dos 134 planos
- char:shui — 71 exposições ao longo dos 134 planos
- char:dian_point — 51 exposições ao longo dos 134 planos
- char:shan — 50 exposições ao longo dos 134 planos
- chunk:zheshishenme — 50 exposições ao longo dos 134 planos
- chunk:nashirenm — 49 exposições ao longo dos 134 planos
- char:san — 49 exposições ao longo dos 134 planos
- char:li_inside — 48 exposições ao longo dos 134 planos
- char:cha_tea — 46 exposições ao longo dos 134 planos
- chunk:pengyou — 44 exposições ao longo dos 134 planos
- chunk:wohuishuoyidian — 43 exposições ao longo dos 134 planos
- char:er — 40 exposições ao longo dos 134 planos
- char:you — 40 exposições ao longo dos 134 planos

## Itens de prioridade sem cobertura

- l10:chunk:woshixuesheng (32 exposições no curso)
- l12:chunk:zenmeyang (8 exposições no curso)
- l12:chunk:nishixueshengma (11 exposições no curso)
- l12:chunk:nixuexishenme (9 exposições no curso)
- l13:chunk:nishinaiguoren (21 exposições no curso)
- l13:chunk:woshixuesheng (32 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (11 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (9 exposições no curso)
- l13-dialogo-ola:chunk:zenmeyang (8 exposições no curso)
- l13-dialogo-nome:chunk:nine (18 exposições no curso)
- l13-dialogo-nome:chunk:nishinaiguoren (21 exposições no curso)
- l13-dialogo-nome:chunk:nishixueshengma (11 exposições no curso)
- l13-dialogo-nome:chunk:nixuexishenme (9 exposições no curso)
- l13-dialogo-nome:chunk:renshinihengaoxing (7 exposições no curso)
- l13-dialogo-nome:chunk:wature (45 exposições no curso)
- l13-dialogo-nome:chunk:woyeshi (9 exposições no curso)
- p3-ordem-das-palavras:chunk:woshixuesheng (32 exposições no curso)
- p3-nomes-da-frase:chunk:woshixuesheng (32 exposições no curso)
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
- l6-rev:chunk:woyeshi (9 exposições no curso)
- l7-rev:chunk:nishinaiguoren (21 exposições no curso)
- l7-rev:chunk:nishixueshengma (11 exposições no curso)
- l7-rev:chunk:nixuexishenme (9 exposições no curso)
- l7-rev:chunk:renshinihengaoxing (7 exposições no curso)
- l7-rev:chunk:woyeshi (9 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishinaiguoren (21 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nishixueshengma (11 exposições no curso)
- p4-checkpoint-fundamentos:chunk:nixuexishenme (9 exposições no curso)
- p4-checkpoint-fundamentos:chunk:renshinihengaoxing (7 exposições no curso)
- p4-checkpoint-fundamentos:chunk:woyeshi (9 exposições no curso)
- p5-kou-ma-pergunta:chunk:zheshishui (16 exposições no curso)
- l19-logica-ma:chunk:zheshishui (16 exposições no curso)
- l8-rev:char:liu (15 exposições no curso)
- l8-rev:char:shi10 (34 exposições no curso)
- l8-rev:char:si (18 exposições no curso)
- l22:chunk:nishinaiguoren (21 exposições no curso)
- l23:chunk:nishinaiguoren (21 exposições no curso)
- l9-rev:chunk:nishinaiguoren (21 exposições no curso)
- l24:char:sheng (42 exposições no curso)
- l24:char:xue (91 exposições no curso)
- l24:chunk:nine (18 exposições no curso)
- l24:chunk:nishixueshengma (11 exposições no curso)
- l24:chunk:woshixuesheng (32 exposições no curso)
- l24:chunk:woyeshi (9 exposições no curso)
- l25:chunk:qingwen (34 exposições no curso)
- l26:chunk:zheshishui (16 exposições no curso)
- l26b:chunk:caidan (6 exposições no curso)
- l26b:chunk:qingwenjiwei (6 exposições no curso)
- l26b:chunk:qingzuo (7 exposições no curso)
- l26b:chunk:woyaocaidan (3 exposições no curso)
- l26b:chunk:woyaomifan (7 exposições no curso)
- …mais 50.

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
- …mais 146.

<!-- integridade:5e423a7e238975a8 -->
