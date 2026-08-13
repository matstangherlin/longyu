# Curriculum audit — L1–L20 (PED-024)

_Gerado por `scripts/report-curriculum-l1-l20.mjs` · 2026-08-13_

Auditoria das primeiras 20 lições do plano real (`lessonRoundStepsFor`).
Métricas lexicais = **oportunidades pedagógicas** (PED-022/025), não distractores de UI.

## Resumo

| # | Lição | Objetivo (curto) | Novo | Recuperado | Estrutura | Situação | Top 3 |
|---|-------|------------------|-----:|-----------:|-----------|----------|-------|
| 1 | `p1-o-que-e-mandarim` | Mandarim é a forma padrão do chinês falado. No Longyu, você começa por frases úteis antes de estudar explicações longas. | 3 | 0 | estrutura/prática comunicativa no plano | fundação do sistema | 你好×3, 你×1, 好×1 |
| 2 | `p1-o-que-e-pinyin` | Pinyin escreve o som do mandarim com letras latinas. 你好 aparece como nǐ hǎo para você saber como começar a falar. | 0 | 3 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 你好×3, 你×1, 好×1 |
| 3 | `p1-o-que-e-tom` | Em mandarim, o contorno da voz faz parte da palavra. Comece só ouvindo dois tons bem diferentes — depois entram os quatro contornos. | 3 | 0 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 妈×4, 妈妈×3, 马×2 |
| 4 | `p1-o-que-e-hanzi` | Hànzì são os caracteres usados no chinês escrito. Eles não funcionam como o alfabeto português: cada caractere pode representar uma ideia, uma palavra, parte de | 4 | 1 | estrutura/prática comunicativa no plano | reconhecimento e montagem de hànzì | 木×4, 森×1, 水×1 |
| 5 | `p1-primeiros-hanzi` | Agora você monta caracteres simples como 木, 口 e 日 com fragmentos pequenos — sem composições ainda. Cada traço encaixa como um quebra-cabeça visual. | 3 | 2 | estrutura/prática comunicativa no plano | reconhecimento e montagem de hànzì | 木×2, 人×2, 口×1 |
| 6 | `p1-engine-2-lab` | Laboratório de exercícios | 11 | 4 | estrutura/prática comunicativa no plano | interação social (cumprimento / cortesia) | 你×3, 不客气×3, 谢谢×3 |
| 7 | `l1` | Mandarim é a língua chinesa padrão. Aqui você começa pelo som e por frases úteis — sem listas frias de exercício. | 4 | 8 | estrutura/prática comunicativa no plano | fundação do sistema | 你好×4, 妈×3, 你×2 |
| 8 | `l2` | 你 significa você — e traz a ideia de pessoa 亻 ao lado de 好. Você já viu 人 antes. | 0 | 10 | estrutura/prática comunicativa no plano | fundação do sistema | 你好×3, 你×2, 我很好×2 |
| 9 | `l3` | Tudo bem? | 2 | 12 | estrutura/prática comunicativa no plano | fundação do sistema | 我很好×3, 你好吗×2, 好×2 |
| 10 | `l1-rev` | Vamos usar o que você já viu numa conversa curta. | 7 | 8 | estrutura/prática comunicativa no plano | revisão do módulo | 你×6, 好×6, 你好吗×5 |
| 11 | `l4` | 不 é bù (4º tom), mas antes de outra sílaba de 4º tom ele sobe para bú. Por isso 不客气 soa “bú kèqi”, mesmo 不 sozinho sendo bù. | 0 | 14 | estrutura/prática comunicativa no plano | fundação do sistema | 谢谢×3, 不客气×2, 我很好×2 |
| 12 | `p1-ate-logo` | Até logo | 0 | 9 | estrutura/prática comunicativa no plano | interação social (cumprimento / cortesia) | 再见×4, 见×3, 再×2 |
| 13 | `p1-primeira-conversa` | Você e Mei vão usar tudo o que você aprendeu: cumprimento, pergunta, resposta, agradecimento e despedida. | 0 | 11 | estrutura/prática comunicativa no plano | interação social (cumprimento / cortesia) | 你好×3, 你×2, 好×2 |
| 14 | `p1-qingwen-cortesia` | Com licença | 1 | 9 | estrutura/prática comunicativa no plano | interação social (cumprimento / cortesia) | 你×4, 你好吗×3, 你呢×3 |
| 15 | `l2-rev` | Vamos usar o que você já viu numa conversa. | 0 | 17 | estrutura/prática comunicativa no plano | revisão do módulo | 你好×5, 谢谢×4, 好×4 |
| 16 | `p2-ma-primeiro-tom` | O 1º tom fica alto e constante. Em 妈 mā, pense em uma linha reta no alto. | 0 | 5 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 妈×3, 山×1, 你好吗×1 |
| 17 | `p2-ma-segundo-tom` | O 2º tom sobe, como uma pergunta curta em português. Ouça má e acompanhe a subida. | 0 | 2 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 妈×3, 麻×2 |
| 18 | `p2-ma-terceiro-tom` | O 3º tom faz um vale: desce e depois volta a subir. 马 mǎ é o exemplo clássico. | 0 | 2 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 妈×3, 马×2 |
| 19 | `p2-ma-quarto-tom` | O 4º tom cai rápido, como um comando curto. 骂 mà usa essa queda forte. | 1 | 1 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 妈×3, 骂×2 |
| 20 | `p2-comparar-tom-1-4` | Compare: mā fica alto e reto; mà cai rápido. O contraste ajuda seu ouvido a decidir. | 0 | 6 | estrutura/prática comunicativa no plano | discriminação / produção de tom | 妈×4, 谢×2, 谢谢×1 |

## Por lição (detalhe)

### 1. `p1-o-que-e-mandarim` — O que é mandarim?

- **Review:** não
- **Objetivo:** Mandarim é a forma padrão do chinês falado. No Longyu, você começa por frases úteis antes de estudar explicações longas.
- **Vocabulário introduzido (tokens novos no curso até aqui):** 你好 · 你 · 好
- **Vocabulário recuperado (já visto):** —
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** fundação do sistema
- **Novidade (PED-025):** lexical=2, estrutural=2, modalidade=0, recuperação=1
- **SRS / revisão no plano:** steps gerados com recuperação=1; reviewItems=chunk:nihao
- **Top 3 repetidos:** 你好 (3) · 你 (1) · 好 (1)
- **Passos no plano:** 6

### 2. `p1-o-que-e-pinyin` — O que é pinyin?

- **Review:** não
- **Objetivo:** Pinyin escreve o som do mandarim com letras latinas. 你好 aparece como nǐ hǎo para você saber como começar a falar.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 你好 · 你 · 好
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=0, estrutural=3, modalidade=0, recuperação=3
- **SRS / revisão no plano:** steps gerados com recuperação=3; reviewItems=chunk:nihao
- **Top 3 repetidos:** 你好 (3) · 你 (1) · 好 (1)
- **Passos no plano:** 7

### 3. `p1-o-que-e-tom` — O que é tom?

- **Review:** não
- **Objetivo:** Em mandarim, o contorno da voz faz parte da palavra. Comece só ouvindo dois tons bem diferentes — depois entram os quatro contornos.
- **Vocabulário introduzido (tokens novos no curso até aqui):** 妈 · 马 · 妈妈
- **Vocabulário recuperado (já visto):** —
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=3, estrutural=3, modalidade=1, recuperação=4
- **SRS / revisão no plano:** steps gerados com recuperação=4; reviewItems=char:ma2
- **Top 3 repetidos:** 妈 (4) · 妈妈 (3) · 马 (2)
- **Passos no plano:** 11

### 4. `p1-o-que-e-hanzi` — O que é hànzì?

- **Review:** não
- **Objetivo:** Hànzì são os caracteres usados no chinês escrito. Eles não funcionam como o alfabeto português: cada caractere pode representar uma ideia, uma palavra, parte de
- **Vocabulário introduzido (tokens novos no curso até aqui):** 木 · 森 · 水 · 日
- **Vocabulário recuperado (já visto):** 妈
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** reconhecimento e montagem de hànzì
- **Novidade (PED-025):** lexical=4, estrutural=4, modalidade=2, recuperação=1
- **SRS / revisão no plano:** steps gerados com recuperação=1; reviewItems=char:mu, char:ri, char:yue, char:ren, char:kou, char:shan, char:shui, char:lin, char:sen, char:ming
- **Top 3 repetidos:** 木 (4) · 森 (1) · 水 (1)
- **Passos no plano:** 11

### 5. `p1-primeiros-hanzi` — Montando primeiros hànzì

- **Review:** não
- **Objetivo:** Agora você monta caracteres simples como 木, 口 e 日 com fragmentos pequenos — sem composições ainda. Cada traço encaixa como um quebra-cabeça visual.
- **Vocabulário introduzido (tokens novos no curso até aqui):** 人 · 口 · 山
- **Vocabulário recuperado (já visto):** 木 · 日
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** reconhecimento e montagem de hànzì
- **Novidade (PED-025):** lexical=3, estrutural=3, modalidade=1, recuperação=3
- **SRS / revisão no plano:** steps gerados com recuperação=3; reviewItems=char:mu, char:ren, char:kou, char:ri, char:yue, char:shan, char:shui, char:huo, char:da, char:xiao
- **Top 3 repetidos:** 木 (2) · 人 (2) · 口 (1)
- **Passos no plano:** 10

### 6. `p1-engine-2-lab` — Laboratório de exercícios

- **Review:** não
- **Objetivo:** Laboratório de exercícios
- **Vocabulário introduzido (tokens novos no curso até aqui):** 你好吗 · 吗 · 不客气 · 谢谢 · 谢 · 再见 · 再 · 见 · 不 · 气 · 客
- **Vocabulário recuperado (já visto):** 你好 · 妈 · 你 · 好
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** interação social (cumprimento / cortesia)
- **Novidade (PED-025):** lexical=5, estrutural=9, modalidade=3, recuperação=4
- **SRS / revisão no plano:** steps gerados com recuperação=4; reviewItems=chunk:nihao, chunk:xiexie, chunk:zaijian, chunk:bukeqi, char:ni, char:hao, char:ma_question, char:nv, char:zi
- **Top 3 repetidos:** 你 (3) · 不客气 (3) · 谢谢 (3)
- **Passos no plano:** 14

### 7. `l1` — Mandarim, pinyin e tom

- **Review:** não
- **Objetivo:** Mandarim é a língua chinesa padrão. Aqui você começa pelo som e por frases úteis — sem listas frias de exercício.
- **Vocabulário introduzido (tokens novos no curso até aqui):** 我很好 · 明天见 · 明 · 天
- **Vocabulário recuperado (já visto):** 妈 · 你好 · 你 · 好 · 再见 · 再 · 见 · 马
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** fundação do sistema
- **Novidade (PED-025):** lexical=2, estrutural=6, modalidade=3, recuperação=8
- **SRS / revisão no plano:** steps gerados com recuperação=8; reviewItems=chunk:nihao, char:ma2
- **Top 3 repetidos:** 你好 (4) · 妈 (3) · 你 (2)
- **Passos no plano:** 16

### 8. `l2` — Olá

- **Review:** não
- **Objetivo:** 你 significa você — e traz a ideia de pessoa 亻 ao lado de 好. Você já viu 人 antes.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 你好 · 你 · 好 · 我很好 · 明天见 · 再见 · 再 · 见 · 明 · 天
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** fundação do sistema
- **Novidade (PED-025):** lexical=0, estrutural=4, modalidade=2, recuperação=6
- **SRS / revisão no plano:** steps gerados com recuperação=6; reviewItems=chunk:nihao, char:ni, char:hao
- **Top 3 repetidos:** 你好 (3) · 你 (2) · 我很好 (2)
- **Passos no plano:** 13

### 9. `l3` — Tudo bem?

- **Review:** não
- **Objetivo:** Tudo bem?
- **Vocabulário introduzido (tokens novos no curso até aqui):** 我 · 很
- **Vocabulário recuperado (já visto):** 你好吗 · 我很好 · 好 · 你 · 吗 · 你好 · 明天见 · 再见 · 再 · 见 · 明 · 天
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** fundação do sistema
- **Novidade (PED-025):** lexical=1, estrutural=7, modalidade=2, recuperação=7
- **SRS / revisão no plano:** steps gerados com recuperação=7; reviewItems=chunk:nihaoma, chunk:wohenhao, chunk:nine
- **Top 3 repetidos:** 我很好 (3) · 你好吗 (2) · 好 (2)
- **Passos no plano:** 13

### 10. `l1-rev` — Revisão do módulo

- **Review:** sim
- **Objetivo:** Vamos usar o que você já viu numa conversa curta.
- **Vocabulário introduzido (tokens novos no curso até aqui):** 麻 · 你呢 · 很好 · 呢 · 请再 · 说一 · 遍
- **Vocabulário recuperado (já visto):** 你好 · 你 · 好 · 我很好 · 你好吗 · 我 · 很 · 吗
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** revisão do módulo
- **Novidade (PED-025):** lexical=4, estrutural=12, modalidade=3, recuperação=9
- **SRS / revisão no plano:** steps gerados com recuperação=9; reviewItems=chunk:nihao, char:ni, char:hao, chunk:nihaoma, chunk:wohenhao, char:wo, char:hen_very, char:ma_question
- **Top 3 repetidos:** 你 (6) · 好 (6) · 你好吗 (5)
- **Passos no plano:** 21

### 11. `l4` — Obrigado

- **Review:** não
- **Objetivo:** 不 é bù (4º tom), mas antes de outra sílaba de 4º tom ele sobe para bú. Por isso 不客气 soa “bú kèqi”, mesmo 不 sozinho sendo bù.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 谢谢 · 不客气 · 谢 · 不 · 客 · 气 · 我很好 · 你好 · 你好吗 · 再见 · 我 · 很
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** fundação do sistema
- **Novidade (PED-025):** lexical=0, estrutural=8, modalidade=1, recuperação=8
- **SRS / revisão no plano:** steps gerados com recuperação=8; reviewItems=chunk:xiexie, chunk:bukeqi
- **Top 3 repetidos:** 谢谢 (3) · 不客气 (2) · 我很好 (2)
- **Passos no plano:** 14

### 12. `p1-ate-logo` — Até logo

- **Review:** não
- **Objetivo:** Até logo
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 再见 · 再 · 见 · 你好 · 我很好 · 明天见 · 明 · 天 · 妈
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** interação social (cumprimento / cortesia)
- **Novidade (PED-025):** lexical=0, estrutural=7, modalidade=2, recuperação=7
- **SRS / revisão no plano:** steps gerados com recuperação=7; reviewItems=chunk:zaijian
- **Top 3 repetidos:** 再见 (4) · 见 (3) · 再 (2)
- **Passos no plano:** 11

### 13. `p1-primeira-conversa` — Primeira conversa

- **Review:** não
- **Objetivo:** Você e Mei vão usar tudo o que você aprendeu: cumprimento, pergunta, resposta, agradecimento e despedida.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 你好 · 再 · 见 · 你 · 好 · 我很好 · 你好吗 · 谢谢 · 再见 · 我 · 很
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** interação social (cumprimento / cortesia)
- **Novidade (PED-025):** lexical=0, estrutural=5, modalidade=2, recuperação=6
- **SRS / revisão no plano:** steps gerados com recuperação=6; reviewItems=chunk:nihao, chunk:nihaoma, chunk:wohenhao, chunk:xiexie, chunk:zaijian
- **Top 3 repetidos:** 你好 (3) · 你 (2) · 好 (2)
- **Passos no plano:** 11

### 14. `p1-qingwen-cortesia` — Com licença

- **Review:** não
- **Objetivo:** Com licença
- **Vocabulário introduzido (tokens novos no curso até aqui):** 请问
- **Vocabulário recuperado (já visto):** 你好吗 · 你 · 好 · 吗 · 你好 · 你呢 · 我很好 · 很好 · 呢
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** interação social (cumprimento / cortesia)
- **Novidade (PED-025):** lexical=1, estrutural=4, modalidade=2, recuperação=5
- **SRS / revisão no plano:** steps gerados com recuperação=5; reviewItems=chunk:qingwen, chunk:nihaoma
- **Top 3 repetidos:** 你 (4) · 你好吗 (3) · 你呢 (3)
- **Passos no plano:** 10

### 15. `l2-rev` — Revisão do módulo

- **Review:** sim
- **Objetivo:** Vamos usar o que você já viu numa conversa.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 你好 · 谢谢 · 谢 · 你 · 好 · 我 · 我很好 · 你好吗 · 再见 · 妈 · 不客气 · 麻
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** revisão do módulo
- **Novidade (PED-025):** lexical=0, estrutural=15, modalidade=3, recuperação=15
- **SRS / revisão no plano:** steps gerados com recuperação=15; reviewItems=chunk:nihao, chunk:nihaoma, chunk:wohenhao, chunk:xiexie, chunk:zaijian, char:wo, char:hen_very, char:hao, char:ni, char:ma_question, char:xie, char:zai_again, char:jian_see, chunk:bukeqi, char:bu, char:ke_guest, char:qi_air
- **Top 3 repetidos:** 你好 (5) · 谢谢 (4) · 好 (4)
- **Passos no plano:** 22

### 16. `p2-ma-primeiro-tom` — 1º tom com ma

- **Review:** não
- **Objetivo:** O 1º tom fica alto e constante. Em 妈 mā, pense em uma linha reta no alto.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 妈 · 山 · 你好吗 · 你好 · 吗
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=0, estrutural=4, modalidade=2, recuperação=3
- **SRS / revisão no plano:** steps gerados com recuperação=3; reviewItems=char:ma2, char:shan
- **Top 3 repetidos:** 妈 (3) · 山 (1) · 你好吗 (1)
- **Passos no plano:** 8

### 17. `p2-ma-segundo-tom` — 2º tom com ma

- **Review:** não
- **Objetivo:** O 2º tom sobe, como uma pergunta curta em português. Ouça má e acompanhe a subida.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 麻 · 妈
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=0, estrutural=5, modalidade=1, recuperação=4
- **SRS / revisão no plano:** steps gerados com recuperação=4; reviewItems=char:ma2
- **Top 3 repetidos:** 妈 (3) · 麻 (2)
- **Passos no plano:** 8

### 18. `p2-ma-terceiro-tom` — 3º tom com ma

- **Review:** não
- **Objetivo:** O 3º tom faz um vale: desce e depois volta a subir. 马 mǎ é o exemplo clássico.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 马 · 妈
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=0, estrutural=5, modalidade=1, recuperação=4
- **SRS / revisão no plano:** steps gerados com recuperação=4; reviewItems=char:ma2
- **Top 3 repetidos:** 妈 (3) · 马 (2)
- **Passos no plano:** 8

### 19. `p2-ma-quarto-tom` — 4º tom com ma

- **Review:** não
- **Objetivo:** O 4º tom cai rápido, como um comando curto. 骂 mà usa essa queda forte.
- **Vocabulário introduzido (tokens novos no curso até aqui):** 骂
- **Vocabulário recuperado (já visto):** 妈
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=1, estrutural=5, modalidade=1, recuperação=3
- **SRS / revisão no plano:** steps gerados com recuperação=3; reviewItems=char:ma2
- **Top 3 repetidos:** 妈 (3) · 骂 (2)
- **Passos no plano:** 8

### 20. `p2-comparar-tom-1-4` — Comparar 1º e 4º tom

- **Review:** não
- **Objetivo:** Compare: mā fica alto e reto; mà cai rápido. O contraste ajuda seu ouvido a decidir.
- **Vocabulário introduzido (tokens novos no curso até aqui):** —
- **Vocabulário recuperado (já visto):** 谢谢 · 妈 · 再见 · 再 · 见 · 谢
- **Estrutura / foco:** estrutura/prática comunicativa no plano
- **Situação comunicativa:** discriminação / produção de tom
- **Novidade (PED-025):** lexical=0, estrutural=5, modalidade=1, recuperação=7
- **SRS / revisão no plano:** steps gerados com recuperação=7; reviewItems=char:ma2, char:xie, chunk:zaijian
- **Top 3 repetidos:** 妈 (4) · 谢 (2) · 谢谢 (1)
- **Passos no plano:** 10
