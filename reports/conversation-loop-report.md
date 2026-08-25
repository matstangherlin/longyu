# Relatório do Conversation Vocabulary Loop (plano real)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | e0c42e03d924 |
| HEAD no instante da geração | 72971a75d4a9d04722f0ee2dd05a9120df807785 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T08:46:22.341Z |
| Lições | 127 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Conversas analisadas (nos planos reais) | 142 |
| Itens de vocabulário exibidos | 920 |
| Itens cobertos por tarefa posterior | 736 |
| Cobertura bruta | 80.0 % |
| **Itens de prioridade** (novo · resposta · pouco exposto) | 507 |
| **Cobertura relevante** (portão ≥ 76 %) | **83.8 %** |
| Itens do núcleo saturado (≥ 40 exposições no curso) | 30 refs |
| Reutilização média por item | 1.96 |
| Itens sem cobertura | 184 |
| Tarefas da fase Pós-Conversa | 555 |
| Média Pós-Conversa por conversa | 3.91 |
| Modalidades usadas nas derivadas | audio_discrimination, comprehend, conversation_repair, dialogue_choice, fill_blank, free_production, image_choice, listen_select, odd_one_out, recognize, sentence_build |
| l2 @ M1 tarefas pós-conversa | 3 |

> **Cobertura relevante** é o indicador que o portão cobra. Cobertura bruta trata
> `你好` e `我会说一点中文` como o mesmo problema; o primeiro já foi praticado no curso
> inteiro e o segundo apareceu duas vezes. Itens do núcleo saturado saem do
> denominador de propósito: forçá-los de volta seria repetir `谢谢` sem fim.

## Núcleo saturado (fora do denominador)

- char:ni — 570 exposições ao longo dos 127 planos
- char:hao — 507 exposições ao longo dos 127 planos
- chunk:nihao — 359 exposições ao longo dos 127 planos
- char:shi — 245 exposições ao longo dos 127 planos
- char:bu — 242 exposições ao longo dos 127 planos
- chunk:nijiaoshenme — 219 exposições ao longo dos 127 planos
- chunk:wohenhao — 205 exposições ao longo dos 127 planos
- char:ma_question — 204 exposições ao longo dos 127 planos
- char:yi — 171 exposições ao longo dos 127 planos
- char:zai — 115 exposições ao longo dos 127 planos
- chunk:qingzaishuoyibian — 114 exposições ao longo dos 127 planos
- char:na_that — 109 exposições ao longo dos 127 planos
- chunk:wojiao — 103 exposições ao longo dos 127 planos
- char:ri — 99 exposições ao longo dos 127 planos
- chunk:xiexie — 95 exposições ao longo dos 127 planos
- char:zhe — 95 exposições ao longo dos 127 planos
- chunk:nihaoma — 77 exposições ao longo dos 127 planos
- chunk:zaijian — 73 exposições ao longo dos 127 planos
- char:na_which — 73 exposições ao longo dos 127 planos
- char:shui — 67 exposições ao longo dos 127 planos
- char:shan — 55 exposições ao longo dos 127 planos
- chunk:nashirenm — 55 exposições ao longo dos 127 planos
- char:yao — 54 exposições ao longo dos 127 planos
- char:li_inside — 54 exposições ao longo dos 127 planos
- char:er — 51 exposições ao longo dos 127 planos
- char:san — 47 exposições ao longo dos 127 planos
- chunk:wature — 42 exposições ao longo dos 127 planos
- chunk:bukeqi — 42 exposições ao longo dos 127 planos
- chunk:wohuishuoyidian — 41 exposições ao longo dos 127 planos
- char:ba8 — 41 exposições ao longo dos 127 planos

## Itens de prioridade sem cobertura

- l9-qual-nome:chunk:nishinaiguoren (22 exposições no curso)
- l10:chunk:woshixuesheng (34 exposições no curso)
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng (34 exposições no curso)
- l11-falo-pouco:chunk:nishixueshengma (6 exposições no curso)
- l11-falo-pouco:chunk:nixuexishenme (6 exposições no curso)
- l12:chunk:nishixueshengma (6 exposições no curso)
- l12:chunk:nixuexishenme (6 exposições no curso)
- l12:chunk:nishinaiguoren (22 exposições no curso)
- l13-dialogo-ola:chunk:nishixueshengma (6 exposições no curso)
- l13-dialogo-ola:chunk:nixuexishenme (6 exposições no curso)
- l13-dialogo-ola:chunk:zenmeyang (12 exposições no curso)
- p3-ordem-das-palavras:chunk:woshixuesheng (34 exposições no curso)
- l5-rev:chunk:nishixueshengma (6 exposições no curso)
- l5-rev:chunk:nixuexishenme (6 exposições no curso)
- l14-char-rev:chunk:zheshishenme (36 exposições no curso)
- l15:chunk:zheshishenme (36 exposições no curso)
- l6-rev:chunk:zenmeyang (12 exposições no curso)
- l16:chunk:zheshishenme (36 exposições no curso)
- l17:chunk:zheshishenme (36 exposições no curso)
- p5-mu-mu-lin:chunk:zheshishenme (36 exposições no curso)
- p5-mu-mu-mu-sen:chunk:zheshishenme (36 exposições no curso)
- p5-ri-yue-ming:chunk:zheshishenme (36 exposições no curso)
- p5-ren-mu-xiu:chunk:zheshishenme (36 exposições no curso)
- p5-nv-zi-hao:chunk:nishixueshengma (6 exposições no curso)
- p5-nv-zi-hao:chunk:nixuexishenme (6 exposições no curso)
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
- l19-logica-rev:chunk:nishixueshengma (6 exposições no curso)
- l19-logica-rev:chunk:nixuexishenme (6 exposições no curso)
- l19:chunk:zheshishenme (36 exposições no curso)
- l20:chunk:zheshishenme (36 exposições no curso)
- l8-rev:char:liu (14 exposições no curso)
- l8-rev:char:shi10 (23 exposições no curso)
- l8-rev:char:si (18 exposições no curso)
- l21:chunk:zheshishenme (36 exposições no curso)
- l22:chunk:nishinaiguoren (22 exposições no curso)
- l23:chunk:nishinaiguoren (22 exposições no curso)
- l9-rev:chunk:nishinaiguoren (22 exposições no curso)
- l24:chunk:zenmeyang (12 exposições no curso)
- l25:chunk:qingwen (31 exposições no curso)
- l26b:char:shi10 (23 exposições no curso)
- l26b:chunk:duoshaoqian (28 exposições no curso)
- l26b:chunk:fuwuyuan (1 exposições no curso)
- l26b:chunk:taiguile (11 exposições no curso)
- l26b:chunk:woele (2 exposições no curso)
- l26b:chunk:womenchifanba (1 exposições no curso)
- l26b:chunk:woyaocai (1 exposições no curso)
- l26b:chunk:woyaoyibeicha (5 exposições no curso)
- l27:chunk:qingwen (31 exposições no curso)
- l28:chunk:zheshishenme (36 exposições no curso)
- p6-rotina-trabalho:chunk:nijidianshangban (1 exposições no curso)
- p6-rotina-trabalho:chunk:nizuoshenmegongzuo (1 exposições no curso)
- …mais 22.

## Itens sem cobertura (bruto)

- l9-tudo-bem:chunk:qingzaishuoyibian
- l9-qual-nome:chunk:nishinaiguoren
- l9-qual-nome:chunk:qingzaishuoyibian
- l10:chunk:woshixuesheng
- p3-wobuhui-shuo-zhongwen:chunk:wojiao
- p3-qing-zai-shuo-yibian:chunk:woshixuesheng
- l11-falo-pouco:chunk:nishixueshengma
- l11-falo-pouco:chunk:nixuexishenme
- l11-falo-pouco:chunk:qingzaishuoyibian
- l12:chunk:nishixueshengma
- l12:chunk:nixuexishenme
- l12:chunk:wohenhao
- l12:chunk:xiexie
- l12:chunk:zaijian
- l12:chunk:nishinaiguoren
- l13:chunk:qingzaishuoyibian
- l13-dialogo-ola:chunk:nishixueshengma
- l13-dialogo-ola:chunk:nixuexishenme
- l13-dialogo-ola:chunk:qingzaishuoyibian
- l13-dialogo-ola:chunk:zaijian
- l13-dialogo-ola:chunk:zenmeyang
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
- l19-logica-luz:char:shan
- …mais 104.

<!-- integridade:5eb4a6f3b5d826e4 -->
