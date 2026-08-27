# First 20 sessions — human-review pack

Pacote de auditoria rápida dos primeiros passos reais (5 temas × 4 passes).
Classifica apenas. **Não altera conteúdo automaticamente.** Corrigir só P0/P1 comprovado.

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | fb7ac3c5d18a |
| HEAD no instante da geração | de3cfbfb28af16756fa074f4ed0fc0a3c28e7f40 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-27T22:05:16.120Z |
| Lições | 20 |

## Como usar

1. Abrir o QA Fast Path em Deploy Preview (`/qa`).
2. Percorrer M1–M4 de cada tema abaixo.
3. Registrar PASS humano só com evidência de dispositivo — automação não preenche.

## Sessões

### Sessão 1 — O que é mandarim? · M1/4

- topic: `p1-o-que-e-mandarim`
- pass: 1
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Uma língua falada |  |  |  |  |  |  | OK |
| 2 | listen |  | 你好 | nǐ hǎo | Olá | 你好 |  |  | OK |
| 3 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 | explanation | OK |
| 4 | comprehend |  | 你好 | nǐ hǎo | Olá |  | Olá |  | OK |
| 5 | dialogue_choice | Mandarim, neste tema, é principalmente… | uma língua falada |  |  |  | uma língua falada | explanation | OK |
| 6 | dialogue_choice | 你好 nesta aula serve para… | mostrar a língua de verdade |  |  |  | mostrar a língua de verdade | explanation | OK |

### Sessão 2 — O que é mandarim? · M2/4

- topic: `p1-o-que-e-mandarim`
- pass: 2
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Quatro camadas |  |  |  |  |  |  | OK |
| 2 | match_pairs | O mesmo 你好 em quatro camadas. |  |  |  |  |  | explanation | OK |
| 3 | dialogue_choice | Qual destes não é mandarim falado? | nǐ hǎo escrito no papel |  |  |  | nǐ hǎo escrito no papel | explanation | OK |
| 4 | dialogue_choice | 你好 no papel é… | escrita (hànzì) |  |  |  | escrita (hànzì) | explanation | OK |
| 5 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 | explanation | OK |
| 6 | dialogue_choice | O Longyu ensina… | mandarim, a variedade padrão do chinês moderno |  |  |  | mandarim, a variedade padrão do chinês moderno |  | OK |

### Sessão 3 — O que é mandarim? · M3/4

- topic: `p1-o-que-e-mandarim`
- pass: 3
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Use a língua |  |  |  |  |  |  | OK |
| 2 | contextual_choice | Uma pessoa olha para você e diz 你好. O que você faz na língua falada? | 你好 |  |  |  | 你好 | explanation | OK |
| 3 | reverse_recall | Recupere o mandarim | 你好 |  | 你好 |  | 你好 |  | OK |
| 4 | free_production | Mandarim sem alternativas | 你好 |  | 你好 |  | 你好 | disabled | OK |
| 5 | sentence_build | Monte a frase falada em mandarim que você já ouviu. | 你好 |  |  |  | 你好 |  | OK |
| 6 | dialogue_choice | Quando alguém diz 你好, a intenção é… | cumprimentar |  |  |  | cumprimentar | explanation | OK |

### Sessão 4 — O que é mandarim? · M4/4

- topic: `p1-o-que-e-mandarim`
- pass: 4
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | conversation_scene | Primeiro cumprimento |  |  |  |  |  |  | OK |
| 2 | match_pairs | Na conversa que você acabou de fazer, o que é cada coisa? |  |  |  |  |  | explanation | OK |
| 3 | reverse_recall | Situação nova | 你好 |  | 你好 |  | 你好 |  | OK |
| 4 | dialogue_choice | No Longyu, mandarim é… | a língua falada padrão que você acabou de usar |  |  |  | a língua falada padrão que você acabou de usar |  | OK |
| 5 | contextual_choice | Alguém escreve nǐ hǎo num caderno. Isso é mandarim falado? | não — é pinyin, o mapa do som |  |  |  | não — é pinyin, o mapa do som |  | OK |

### Sessão 5 — O que é pinyin? · M1/4

- topic: `p1-o-que-e-pinyin`
- pass: 1
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Para que o pinyin existe |  |  |  |  |  |  | OK |
| 2 | dialogue_choice | nǐ hǎo é… | a pronúncia escrita, não a tradução |  |  |  | a pronúncia escrita, não a tradução | explanation | OK |
| 3 | match_pairs | Combine cada linha ao papel certo. |  |  |  |  |  | explanation | OK |
| 4 | listen_select | Qual pinyin escreve o que você ouviu? | nǐ hǎo |  |  | 你好 | nǐ hǎo | explanation | OK |
| 5 | dialogue_choice | Qual destas linhas é pinyin? | nǐ hǎo |  |  |  | nǐ hǎo | explanation | OK |
| 6 | dialogue_choice | Pinyin serve principalmente para… | guiar a pronúncia |  |  |  | guiar a pronúncia | explanation | OK |

### Sessão 6 — O que é pinyin? · M2/4

- topic: `p1-o-que-e-pinyin`
- pass: 2
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Sílabas |  |  |  |  |  |  | OK |
| 2 | dialogue_choice | Em nǐ hǎo, quantas sílabas o pinyin mostra? | duas: nǐ e hǎo |  |  |  | duas: nǐ e hǎo | explanation | OK |
| 3 | match_pairs | Ligue cada sílaba do pinyin ao hànzì. |  |  |  |  |  | explanation | OK |
| 4 | listen_select | Qual pinyin é esta sílaba? | nǐ |  |  | 你 | nǐ | explanation | OK |
| 5 | listen_select | Qual pinyin é esta sílaba? | hǎo |  |  | 好 | hǎo | explanation | OK |
| 6 | dialogue_choice | Em hǎo, o h do pinyin… | marca um som soprado, não o h mudo do português |  |  |  | marca um som soprado, não o h mudo do português |  | OK |
| 7 | dialogue_choice | Qual opção é pinyin, não tradução? | nǐ |  |  |  | nǐ | explanation | OK |

### Sessão 7 — O que é pinyin? · M3/4

- topic: `p1-o-que-e-pinyin`
- pass: 3
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Marcas de tom |  |  |  |  |  |  | OK |
| 2 | dialogue_choice | O acento em nǐ e hǎo indica… | o contorno tonal da sílaba |  |  |  | o contorno tonal da sílaba | explanation | OK |
| 3 | match_pairs | Combine o sinal ao que ele faz no pinyin. |  |  |  |  |  | explanation | OK |
| 4 | listen_select | Qual pinyin registra o tom que você ouviu? | nǐ hǎo |  |  | 你好 | nǐ hǎo | explanation | OK |
| 5 | dialogue_choice | Em nǐ, a marca ˇ diz… | o tom (contorno) dessa sílaba |  |  |  | o tom (contorno) dessa sílaba |  | OK |
| 6 | reverse_recall | Leia o pinyin | 你好 |  | 你好 |  | 你好 |  | OK |

### Sessão 8 — O que é pinyin? · M4/4

- topic: `p1-o-que-e-pinyin`
- pass: 4
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Usar e soltar |  |  |  |  |  |  | OK |
| 2 | contextual_choice | Você vê nǐ hǎo numa placa de aula. Para que serve? | guiar a pronúncia de 你好 |  |  |  | guiar a pronúncia de 你好 |  | OK |
| 3 | match_pairs | Ligue cada sílaba do pinyin ao hànzì, sem a tradução no meio. |  |  |  |  |  | explanation | OK |
| 4 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 | explanation | OK |
| 5 | reverse_recall | Sem o mapa inteiro | 你好 |  | 你好 |  | 你好 |  | OK |
| 6 | dialogue_choice | No pinyin, ˉ ´ ˇ ` indicam… | o tom da sílaba |  |  |  | o tom da sílaba |  | OK |
| 7 | dialogue_choice | Qual é pinyin e qual é hànzì? | nǐ hǎo é pinyin; 你好 é hànzì |  |  |  | nǐ hǎo é pinyin; 你好 é hànzì |  | OK |

### Sessão 9 — O que é tom? · M1/4

- topic: `p1-o-que-e-tom`
- pass: 1
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | A curva faz parte da palavra |  |  |  |  |  |  | OK |
| 2 | tone |  | 妈 | mā |  |  |  | guided | OK |
| 3 | tone |  | 马 | mǎ |  |  |  | guided | OK |
| 4 | listen_select | Toque no que ouviu. | 马 |  |  | 马 | 马 | explanation | OK |
| 5 | dialogue_choice | Em mandarim, tom é… | o contorno da voz que faz parte da palavra |  |  |  | o contorno da voz que faz parte da palavra |  | OK |
| 6 | dialogue_choice | Quando dizemos ‘3º tom’, estamos falando de… | um contorno (um vale na voz) |  |  |  | um contorno (um vale na voz) |  | OK |

### Sessão 10 — O que é tom? · M2/4

- topic: `p1-o-que-e-tom`
- pass: 2
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Ouça a diferença |  |  |  |  |  |  | OK |
| 2 | listen_select | Toque no que ouviu. | 马 |  |  | 马 | 马 | explanation | OK |
| 3 | listen_select | Toque no que ouviu. | 妈 |  |  | 妈 | 妈 | explanation | OK |
| 4 | dialogue_choice | mā e mǎ usam as mesmas letras. O que as torna palavras diferentes? | o contorno da voz |  |  |  | o contorno da voz |  | OK |
| 5 | match_pairs | Combine o contorno à palavra (só duas). |  |  |  |  |  | explanation | OK |
| 6 | tone |  | 妈 | mā |  |  |  | quiz | OK |

### Sessão 11 — O que é tom? · M3/4

- topic: `p1-o-que-e-tom`
- pass: 3
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Identifique o contorno |  |  |  |  |  |  | OK |
| 2 | tone |  | 马 | mǎ |  |  |  | quiz | OK |
| 3 | dialogue_choice | Você ouve o 3º tom (vale). Qual palavra de ma é o vale? | 马 |  |  |  | 马 | explanation | OK |
| 4 | dialogue_choice | Para ‘dizer o tom’, você precisa… | fazer o contorno com a voz, não só apontar um número |  |  |  | fazer o contorno com a voz, não só apontar um número |  | OK |
| 5 | listen_select | Toque no que ouviu. | 妈 |  |  | 妈 | 妈 |  | OK |
| 6 | contextual_choice | Alguém pede para você repetir o vale. Qual curva é essa? | desce e volta (3º tom) |  |  |  | desce e volta (3º tom) |  | OK |

### Sessão 12 — O que é tom? · M4/4

- topic: `p1-o-que-e-tom`
- pass: 4
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | O tom numa palavra real |  |  |  |  |  |  | OK |
| 2 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 | explanation | OK |
| 3 | dialogue_choice | Em 你好, o que você precisa acertar além das letras? | o contorno das sílabas |  |  |  | o contorno das sílabas |  | OK |
| 4 | contextual_choice | Você vai cumprimentar. Qual fenômeno da voz está dentro de 你好? | os tons (contornos) das sílabas |  |  |  | os tons (contornos) das sílabas |  | OK |
| 5 | listen |  | 你好 | nǐ hǎo | Olá — ouça o contorno, não só as letras | 你好 |  |  | OK |
| 6 | reverse_recall | Diga com o contorno | 你好 |  | 你好 |  | 你好 |  | OK |

### Sessão 13 — O que é hànzì? · M1/4

- topic: `p1-o-que-e-hanzi`
- pass: 1
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Sistema de escrita |  |  |  |  |  |  | OK |
| 2 | dialogue_choice | Em 你好, 你 é… | um caractere (peça escrita) |  |  |  | um caractere (peça escrita) | explanation | OK |
| 3 | dialogue_choice | Em 你好, qual caractere é 好? | 好 |  |  |  | 好 |  | OK |
| 4 | match_pairs | Combine o hànzì ao que ele é. |  |  |  |  |  |  | OK |
| 5 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 | explanation | OK |
| 6 | dialogue_choice | Qual linha é hànzì? | 你好 |  |  |  | 你好 |  | OK |

### Sessão 14 — O que é hànzì? · M2/4

- topic: `p1-o-que-e-hanzi`
- pass: 2
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Caractere × palavra |  |  |  |  |  |  | OK |
| 2 | dialogue_choice | 你好 tem dois caracteres. Isso significa duas palavras? | não necessariamente — juntos formam uma palavra |  |  |  | não necessariamente — juntos formam uma palavra |  | OK |
| 3 | match_pairs | Combine caractere e papel na palavra. |  |  |  |  |  | explanation | OK |
| 4 | dialogue_choice | Reconhecer hànzì fica mais fácil quando você… | nota as peças/componentes da forma |  |  |  | nota as peças/componentes da forma |  | OK |
| 5 | dialogue_choice | Um caractere como 你 tem… | forma escrita, um som, e uma função na palavra |  |  |  | forma escrita, um som, e uma função na palavra |  | OK |
| 6 | match_pairs | Separe escrita e som. |  |  |  |  |  |  | OK |

### Sessão 15 — O que é hànzì? · M3/4

- topic: `p1-o-que-e-hanzi`
- pass: 3
- estimated time: ~2 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Reconhecer e montar |  |  |  |  |  |  | OK |
| 2 | sentence_build | Monte a palavra com os caracteres. | 你好 |  |  |  | 你好 |  | OK |
| 3 | dialogue_choice | O primeiro caractere (peça escrita) de 你好 é… | 你 |  |  |  | 你 |  | OK |
| 4 | dialogue_choice | O segundo caractere (peça escrita) de 你好 é… | 好 |  |  |  | 好 |  | OK |
| 5 | dialogue_choice | A palavra de cumprimento em hànzì. Quais dois caracteres? | 你好 |  |  |  | 你好 |  | OK |
| 6 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 |  | OK |

### Sessão 16 — O que é hànzì? · M4/4

- topic: `p1-o-que-e-hanzi`
- pass: 4
- estimated time: ~3 min
- source: foundationAuthoredPlan

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Menos pinyin |  |  |  |  |  |  | OK |
| 2 | listen_select | Toque no que ouviu. | 你好 |  |  | 你好 | 你好 | explanation | OK |
| 3 | contextual_choice | Chega uma mensagem só com o hànzì 你好, sem pinyin. O que é? | o cumprimento que você já fala |  |  |  | o cumprimento que você já fala |  | OK |
| 4 | dialogue_choice | Se o pinyin some, 你 e 好 continuam sendo… | caracteres do sistema de escrita |  |  |  | caracteres do sistema de escrita |  | OK |
| 5 | dialogue_choice | Se o pinyin some, o hànzì 你好 ainda… | é a forma escrita da palavra que você conhece |  |  |  | é a forma escrita da palavra que você conhece |  | OK |
| 6 | dialogue_choice | Alguém acena. Qual hànzì você leria na tela? | 你好 |  |  |  | 你好 |  | OK |
| 7 | match_pairs | Hànzì × pinyin × sentido. |  |  |  |  |  |  | OK |

### Sessão 17 — Montando primeiros hànzì · M1/4

- topic: `p1-primeiros-hanzi`
- pass: 1
- estimated time: ~6 min
- source: journey.steps (referência; planner pode variar)

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Monte peça por peça |  |  |  |  |  |  | OK |
| 2 | listen |  | 木 | mù | árvore — o hànzì que você vai montar | 木 |  |  | OK |
| 3 | image_choice | O que você vê na foto? | 木 | mù | árvore |  |  | explanation | OK |
| 4 | hanzi_build | Encaixe os traços da árvore. | 木 |  |  |  | 木 | explanation | OK |
| 5 | image_choice | Qual hànzì significa pessoa? | 人 | rén | pessoa |  | 人 | explanation | OK |
| 6 | hanzi_build | Monte o hànzì de pessoa. | 人 |  |  |  | 人 | explanation | OK |
| 7 | recognize |  |  |  |  |  |  |  | OK |
| 8 | hanzi_build | Monte o hànzì de boca. | 口 |  |  |  | 口 | explanation | OK |
| 9 | recognize |  |  |  |  |  |  |  | OK |
| 10 | hanzi_build | Monte o hànzì de sol. | 日 |  |  |  | 日 | explanation | OK |
| 11 | image_choice | Ouça e escolha a imagem certa. | 山 | shān | montanha |  |  | explanation | OK |
| 12 | hanzi_build | Encaixe os traços da montanha. | 山 |  |  |  | 山 | explanation | OK |
| 13 | match_pairs | Feche o mapa |  |  |  |  |  | explanation | OK |

### Sessão 18 — Montando primeiros hànzì · M2/4

- topic: `p1-primeiros-hanzi`
- pass: 2
- estimated time: ~6 min
- source: journey.steps (referência; planner pode variar)

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Monte peça por peça |  |  |  |  |  |  | OK |
| 2 | listen |  | 木 | mù | árvore — o hànzì que você vai montar | 木 |  |  | OK |
| 3 | image_choice | O que você vê na foto? | 木 | mù | árvore |  |  | explanation | OK |
| 4 | hanzi_build | Encaixe os traços da árvore. | 木 |  |  |  | 木 | explanation | OK |
| 5 | image_choice | Qual hànzì significa pessoa? | 人 | rén | pessoa |  | 人 | explanation | OK |
| 6 | hanzi_build | Monte o hànzì de pessoa. | 人 |  |  |  | 人 | explanation | OK |
| 7 | recognize |  |  |  |  |  |  |  | OK |
| 8 | hanzi_build | Monte o hànzì de boca. | 口 |  |  |  | 口 | explanation | OK |
| 9 | recognize |  |  |  |  |  |  |  | OK |
| 10 | hanzi_build | Monte o hànzì de sol. | 日 |  |  |  | 日 | explanation | OK |
| 11 | image_choice | Ouça e escolha a imagem certa. | 山 | shān | montanha |  |  | explanation | OK |
| 12 | hanzi_build | Encaixe os traços da montanha. | 山 |  |  |  | 山 | explanation | OK |
| 13 | match_pairs | Feche o mapa |  |  |  |  |  | explanation | OK |

### Sessão 19 — Montando primeiros hànzì · M3/4

- topic: `p1-primeiros-hanzi`
- pass: 3
- estimated time: ~6 min
- source: journey.steps (referência; planner pode variar)

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Monte peça por peça |  |  |  |  |  |  | OK |
| 2 | listen |  | 木 | mù | árvore — o hànzì que você vai montar | 木 |  |  | OK |
| 3 | image_choice | O que você vê na foto? | 木 | mù | árvore |  |  | explanation | OK |
| 4 | hanzi_build | Encaixe os traços da árvore. | 木 |  |  |  | 木 | explanation | OK |
| 5 | image_choice | Qual hànzì significa pessoa? | 人 | rén | pessoa |  | 人 | explanation | OK |
| 6 | hanzi_build | Monte o hànzì de pessoa. | 人 |  |  |  | 人 | explanation | OK |
| 7 | recognize |  |  |  |  |  |  |  | OK |
| 8 | hanzi_build | Monte o hànzì de boca. | 口 |  |  |  | 口 | explanation | OK |
| 9 | recognize |  |  |  |  |  |  |  | OK |
| 10 | hanzi_build | Monte o hànzì de sol. | 日 |  |  |  | 日 | explanation | OK |
| 11 | image_choice | Ouça e escolha a imagem certa. | 山 | shān | montanha |  |  | explanation | OK |
| 12 | hanzi_build | Encaixe os traços da montanha. | 山 |  |  |  | 山 | explanation | OK |
| 13 | match_pairs | Feche o mapa |  |  |  |  |  | explanation | OK |

### Sessão 20 — Montando primeiros hànzì · M4/4

- topic: `p1-primeiros-hanzi`
- pass: 4
- estimated time: ~6 min
- source: journey.steps (referência; planner pode variar)

| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | intro | Monte peça por peça |  |  |  |  |  |  | OK |
| 2 | listen |  | 木 | mù | árvore — o hànzì que você vai montar | 木 |  |  | OK |
| 3 | image_choice | O que você vê na foto? | 木 | mù | árvore |  |  | explanation | OK |
| 4 | hanzi_build | Encaixe os traços da árvore. | 木 |  |  |  | 木 | explanation | OK |
| 5 | image_choice | Qual hànzì significa pessoa? | 人 | rén | pessoa |  | 人 | explanation | OK |
| 6 | hanzi_build | Monte o hànzì de pessoa. | 人 |  |  |  | 人 | explanation | OK |
| 7 | recognize |  |  |  |  |  |  |  | OK |
| 8 | hanzi_build | Monte o hànzì de boca. | 口 |  |  |  | 口 | explanation | OK |
| 9 | recognize |  |  |  |  |  |  |  | OK |
| 10 | hanzi_build | Monte o hànzì de sol. | 日 |  |  |  | 日 | explanation | OK |
| 11 | image_choice | Ouça e escolha a imagem certa. | 山 | shān | montanha |  |  | explanation | OK |
| 12 | hanzi_build | Encaixe os traços da montanha. | 山 |  |  |  | 山 | explanation | OK |
| 13 | match_pairs | Feche o mapa |  |  |  |  |  | explanation | OK |

## Classificação automática (não é correção)

Nenhum P0_CANDIDATE estrutural nas 20 sessões (faltando resposta, opções repetidas).

P1/P2 (instrução ambígua, copy, visual) exigem humano. Não promover V5 pedagógica daqui.

<!-- integridade:18825a21f0384e60 -->
