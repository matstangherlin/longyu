# V4.6 — Topic Mastery Path

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 8043a11ab298 |
| HEAD no instante da geração | a94c1ce23a5f1583cb4b8891c666fc9ac0354a2b |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T18:41:20.866Z |
| Lições | 127 |


Semântica (TM-015): **ACQUIRED** = `completedLessons` (primeira exposição válida; SRS/achievements/analytics).
**MASTERED** = `lessonMasteryById.level >= 4` (path complete da Jornada). Unlock usa MASTERED, não ACQUIRED.

Energia (TM-018): uma carga por pass, chave `consume:lesson:{id}:pass:{n}:{day}`. Não cobra por exercício nem no reload da mesma pass.
XP (TM-019): `lesson:{id}:pass:{n}:xp` na primeira vez; prática menor e diária; bônus único 4/4.
Estrelas (TM-017): qualidade, não o anel 4/4.

## Resumo

| Métrica | Valor |
|---------|------:|
| Nós totais | 127 |
| Temas 4-pass | 113 |
| Exceções (review/checkpoint) | 14 |
| Specs autoradas | 33 |
| Sessões estimadas | 466 |
| Horas estimadas | 21.2 |
| Média de passos/pass | 8.3 |

## Primeira vitória (sessão + minutos)

Métricas antigas por `lessonIndex` continuam em `reports/first-communicative-win.md`. Aqui a unidade é a **pass** (4 por tema de ensino).

| Métrica | Sessão | Minutos até o início | Onde |
|---------|------:|---------------------:|------|
| timeToFirstInteraction | 1 | 0.0 | O que é mandarim? M1 |
| timeToFirstConversation | 4 | 8.4 | O que é mandarim? M4 |
| timeToFirstIndependentProduction | 3 | 5.2 | O que é mandarim? M3 |
| timeToFirstTransfer | 4 | 8.4 | O que é mandarim? M4 |

## Exceções

| Lição | Tipo | Passes | Motivo |
|-------|------|-------:|--------|
| Revisão do módulo (`l1-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l2-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l3-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l4-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l5-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão de reconhecimento (`l14-char-rev`) | review_mastery | 1 | Checkpoint de Review Mastery: uma sessão com níveis próprios (Recall→Transfer). Path complete = ACQUIRED, não 4/4 de ensino. |
| Revisão do módulo (`l6-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l7-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Checkpoint dos fundamentos (`p4-checkpoint-fundamentos`) | review_mastery | 1 | Checkpoint de Review Mastery: uma sessão com níveis próprios (Recall→Transfer). Path complete = ACQUIRED, não 4/4 de ensino. |
| Revisão de peças (`l19-logica-rev`) | review_mastery | 1 | Checkpoint de Review Mastery: uma sessão com níveis próprios (Recall→Transfer). Path complete = ACQUIRED, não 4/4 de ensino. |
| Revisão do módulo (`l8-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l9-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |
| Revisão do módulo (`l10-rev`) | review_mastery | 1 | Checkpoint de Review Mastery: uma sessão com níveis próprios (Recall→Transfer). Path complete = ACQUIRED, não 4/4 de ensino. |
| Revisão do módulo (`l11-rev`) | review | 1 | Revisão/checkpoint de módulo: uma sessão de consolidação. Path complete = ACQUIRED. Estrelas medem qualidade, não o 4/4. |

## Primeiros 30 temas

| Tema | M1 | M2 | M3 | M4 |
|------|----|----|----|----|
| O que é mandarim? | Ouvir mandarim de verdade e entender que é uma língua falada (não um alfabeto). | Distinguir mandarim falado, pinyin, hànzì e tradução sem virar aula teórica. | Recuperar 你好 e relacionar som ↔ intenção com menos apoio. | Provar a diferença som / pinyin / hànzì / sentido numa microconversa nova. |
| O que é pinyin? | Ver que pinyin escreve o som: 你好 se lê nǐ hǎo, com áudio. | Notar a sílaba (nǐ / hǎo) e ligar áudio ↔ pinyin. | Reconhecer marcas de tom e recuperar o som sem traduzir. | Usar pinyin para pronunciar e depois falar com menos pinyin à vista. |
| O que é tom? | Ouvir o contorno: a curva da voz faz parte da palavra. | Discriminar tons contrastantes (reta × vale) sem aula longa. | Identificar o tom e começar a reproduzir o contorno. | Aplicar o tom em 你好, um chunk que você já usa. |
| O que é hànzì? | Ver hànzì como sistema de escrita, começando por 你 e 好. | Separar caractere de palavra e notar peças básicas. | Reconhecer e montar 你好 a partir das peças. | Ler 你好 em contexto conhecido com menos pinyin. |
| Montando primeiros hànzì | Ver as peças dos primeiros hànzì. | Distinguir caracteres parecidos pelas peças. | Montar o caractere sem copiar um modelo completo. | Reconhecer o caractere montado numa palavra já ouvida. |
| Laboratório de exercícios | Descobrir como cada tipo de exercício do laboratório funciona. | Distinguir ouvir × escolher × montar neste laboratório. | Completar as tarefas do laboratório com menos explicação. | Aplicar o mesmo motor a um item já conhecido. |
| Mandarim, pinyin e tom | Descobrir os itens de Mandarim, pinyin e tom com áudio e sentido. | Reconhecer e distinguir os itens de Mandarim, pinyin e tom por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Mandarim, pinyin e tom. | Usar Mandarim, pinyin e tom numa micro-situação nova. |
| Olá | Descobrir os itens de Olá com áudio e sentido. | Reconhecer e distinguir os itens de Olá por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Olá. | Usar Olá numa micro-situação nova. |
| Tudo bem? | Descobrir os itens de Tudo bem? com áudio e sentido. | Reconhecer e distinguir os itens de Tudo bem? por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Tudo bem?. | Usar Tudo bem? numa micro-situação nova. |
| Obrigado | Descobrir os itens de Obrigado com áudio e sentido. | Reconhecer e distinguir os itens de Obrigado por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Obrigado. | Usar Obrigado numa micro-situação nova. |
| Até logo | Descobrir os itens de Até logo com áudio e sentido. | Reconhecer e distinguir os itens de Até logo por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Até logo. | Usar Até logo numa micro-situação nova. |
| Primeira conversa | Descobrir os itens de Primeira conversa com áudio e sentido. | Reconhecer e distinguir os itens de Primeira conversa por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Primeira conversa. | Usar Primeira conversa numa micro-situação nova. |
| Com licença | Descobrir os itens de Com licença com áudio e sentido. | Reconhecer e distinguir os itens de Com licença por áudio/imagem. | Nomear, pedir ou responder com o núcleo de Com licença. | Usar Com licença numa micro-situação nova. |
| 1º tom com ma | Ouvir a reta alta do 1º tom. | Discriminar 1º tom dos outros contornos de ma. | Identificar mā sem ver a resposta. | Reconhecer 1º tom numa palavra já usada. |
| 2º tom com ma | Ouvir a subida do 2º tom. | Discriminar 2º × outros tons de ma. | Identificar má. | Levar o 2º tom a uma sílaba conhecida. |
| 我很好 — Estou bem | Descobrir 我很好 como 'estou bem'. | Distinguir 我很好 de 你好 / 谢谢. | Produzir 我很好 ao responder. | Encaixar 我很好 num mini-diálogo. |
| 3º tom com ma | Ouvir o vale do 3º tom. | Discriminar 3º × 1º (reta × vale). | Identificar mǎ. | Ouvir o 3º tom em 你好. |
| 4º tom com ma | Ouvir a queda do 4º tom. | Discriminar 4º × 1º. | Identificar mà. | Reconhecer 4º tom fora do drill de ma. |
| Tons em 你好 | Ouvir 你好 como palavra, não duas sílabas isoladas. | Discriminar o contorno real (sandhi) do dicionário. | Identificar/reproduzir o contorno de 你好. | Dizer 你好 numa situação breve com o tom certo. |
| Comparar 1º e 4º tom | Ouvir o par 1º × 4º lado a lado. | Discriminar os dois com distratores próximos. | Identificar qual tom soou sem ver o pinyin primeiro. | Levar o contraste a uma palavra já usada. |
| Comparar 2º e 3º tom | Ouvir 2º × 3º como duas curvas diferentes. | Discriminar subida × vale. | Identificar o tom ouvido. | Aplicar o contraste em 你 / 好. |
| Tons em 谢谢 | Ouvir 谢谢 e ligar ao agradecimento. | Discriminar 谢谢 de 你好 pelo som. | Reconhecer/produzir 谢谢. | Agradecer numa micro-situação nova. |
| Quatro tons | Descobrir de ouvido o que Quatro tons está ensinando. | Discriminar os sons de Quatro tons com pares próximos. | Identificar/produzir o contorno de Quatro tons. | Levar o som de Quatro tons a um chunk conhecido. |
| Treino guiado | Descobrir de ouvido o que Treino guiado está ensinando. | Discriminar os sons de Treino guiado com pares próximos. | Identificar/produzir o contorno de Treino guiado. | Levar o som de Treino guiado a um chunk conhecido. |
| A sílaba yao | Descobrir de ouvido o que A sílaba yao está ensinando. | Discriminar os sons de A sílaba yao com pares próximos. | Identificar/produzir o contorno de A sílaba yao. | Levar o som de A sílaba yao a um chunk conhecido. |
| Tons em 好 e 谢 | Descobrir de ouvido o que Tons em 好 e 谢 está ensinando. | Discriminar os sons de Tons em 好 e 谢 com pares próximos. | Identificar/produzir o contorno de Tons em 好 e 谢. | Levar o som de Tons em 好 e 谢 a um chunk conhecido. |
| Compare tons | Descobrir de ouvido o que Compare tons está ensinando. | Discriminar os sons de Compare tons com pares próximos. | Identificar/produzir o contorno de Compare tons. | Levar o som de Compare tons a um chunk conhecido. |
| A sílaba shi | Descobrir de ouvido o que A sílaba shi está ensinando. | Discriminar os sons de A sílaba shi com pares próximos. | Identificar/produzir o contorno de A sílaba shi. | Levar o som de A sílaba shi a um chunk conhecido. |
| Sons que brasileiros confundem | Descobrir de ouvido o que Sons que brasileiros confundem está ensinando. | Discriminar os sons de Sons que brasileiros confundem com pares próximos. | Identificar/produzir o contorno de Sons que brasileiros confundem. | Levar o som de Sons que brasileiros confundem a um chunk conhecido. |
| Números por som | Descobrir de ouvido o que Números por som está ensinando. | Discriminar os sons de Números por som com pares próximos. | Identificar/produzir o contorno de Números por som. | Levar o som de Números por som a um chunk conhecido. |

## Avisos

Nenhum.

## Falhas

Nenhuma.

<!-- integridade:af063652d4074cf5 -->
