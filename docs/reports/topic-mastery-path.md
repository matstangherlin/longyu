# V4.6 — Topic Mastery Path

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 0ae72f37d693 |
| HEAD no instante da geração | a5928e8814c3f4469e6ca2afcc07d0a5d3c1cdd4 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-04T16:10:51.990Z |
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
| Specs autoradas | 38 |
| Sessões estimadas | 466 |
| Horas estimadas | 21.1 |
| Média de passos/pass | 8.3 |

## Primeira vitória (sessão + minutos)

Métricas antigas por `lessonIndex` continuam em `reports/first-communicative-win.md`. Aqui a unidade é a **pass** (4 por tema de ensino).

| Métrica | Sessão | Minutos até o início | Onde |
|---------|------:|---------------------:|------|
| timeToFirstInteraction | 1 | 0.0 | O que é mandarim? M1 |
| timeToFirstConversation | 4 | 5.7 | O que é mandarim? M4 |
| timeToFirstIndependentProduction | 3 | 3.8 | O que é mandarim? M3 |
| timeToFirstTransfer | 4 | 5.7 | O que é mandarim? M4 |

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
| Olá | Descobrir 你好 como cumprimento. | Reconhecer 你好 e 早上好 de ouvido. | Dizer ou montar o cumprimento. | Usar 你好 numa situação de encontro. |
| Tudo bem? | Descobrir 你好吗？ e 我很好. | Distinguir cumprimento × pergunta × resposta. | Produzir a pergunta ou a resposta. | Trocar ‘tudo bem?’ numa situação nova. |
| Obrigado | Descobrir 谢谢. | Reconhecer 谢谢 e 不客气. | Produzir o agradecimento ou a resposta. | Agradecer numa situação de ajuda. |
| Até logo | Descobrir 再见 como despedida. | Distinguir 再见 de 你好 e 谢谢. | Produzir a despedida. | Encerrar uma conversa curta. |
| Primeira conversa | Rever os atos da primeira conversa. | Ordenar cumprimento, pergunta e despedida. | Produzir os turnos com menos apoio. | Fechar a microconversa numa situação nova. |
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
| Quatro tons | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| Treino guiado | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| A sílaba yao | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| Tons em 好 e 谢 | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| Compare tons | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| A sílaba shi | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| Sons que brasileiros confundem | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |
| Números por som | Ouça e identifique o som-alvo. | Compare dois sons próximos. | Reconheça o contraste em uma palavra ou frase curta. | Perceba e use o contraste em contexto. |

## Avisos

- p1-primeiros-hanzi M4: 14 passos (alvo 6–9)

## Falhas

Nenhuma.

<!-- integridade:411cc072687b1430 -->
