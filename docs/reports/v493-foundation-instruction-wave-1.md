# V4.9.3 — Foundation Instruction Wave 1

Relatório da remessa. Os números foram medidos pelos gates, não estimados;
onde algo não foi feito, está dito que não foi feito.

## A missão

> A primeira experiência do usuário precisa parecer "estão me ensinando
> mandarim" e não "estão testando se eu já sei mandarim".

Até aqui o Longyu tinha a máquina de ensinar e quase nenhuma aula. Um aluno
novo caía direto em exercícios: a primeira coisa que acontecia com ele era uma
pergunta. Agora a primeira coisa é o dragão dizendo *"antes de responder
qualquer coisa, quero te mostrar como o mandarim funciona"*.

## Métricas

| Métrica | Valor | Meta |
| --- | --- | --- |
| `coreInstructionSlots` | 5 | 5 |
| `foundationCapsules` | 5 | 5 |
| `animatedCapsulesReady` | 5 | 5 |
| `videoScriptsPt` | 5 | 5 |
| `videoScriptsEn` | 5 | 5 |
| `productionVideoAssetsPt` | 0 | 0 até existir arquivo |
| `productionVideoAssetsEn` | 0 | 0 até existir arquivo |
| `first20SessionsAudited` | 20 | 20 |
| `surpriseGradedTasks` | **0** | 0 |
| `firstInstructionAfterFirstGrade` | **0** | 0 |
| `foundationUnknownTargets` | **0** | 0 |
| `foundationCognitiveLoadViolations` | **0** | 0 |
| `presentationParityViolations` | **0** | 0 |
| `ptEnTargetParity` | 5/5 | 5/5 |
| `firstMeaningfulWinSession` | 1 | o quanto antes |
| `firstMeaningfulWinMinutesEstimate` | ~2,5 min | ≤ ~3 min |

`firstMeaningfulWinMinutesEstimate` é a aula de 1,5 min mais o primeiro
reconhecimento guiado de 你好 na sessão 1. É estimativa declarada: sem
telemetria de uso real, ninguém sabe quanto tempo um humano leva.

## As cinco aulas

| # | aula | slot | posição | alvos |
| --- | --- | --- | --- | --- |
| F1 | O que é mandarim? | `instruction:foundation:mandarin` | antes de `p1-o-que-e-mandarim` | mandarim, cumprimento, 你好 |
| F2 | O que é Pinyin? | `instruction:foundation:pinyin` | antes de `p1-o-que-e-pinyin` | pinyin |
| F3 | O que são tons? | `instruction:foundation:tone` | antes de `p1-o-que-e-tom` | tom, 1º–4º |
| F4 | O que é hànzì? | `instruction:foundation:hanzi` | antes de `p1-o-que-e-hanzi` | hànzì |
| F5 | Como os hànzì são construídos? | `instruction:foundation:hanzi-components` | antes de `p1-primeiros-hanzi` | componentes |

A auditoria sessão a sessão está em
[`v493-first20-teaching-experience.md`](./v493-first20-teaching-experience.md).

## Decisões que valem registro

**A identidade pedagógica não vem do catálogo.** A V4.9.2B deu ao catálogo
runtime um poder pequeno de propósito, e ele continua pequeno. O que mudou é
que agora existe um lugar canônico — o `CoreInstructionSlot` — onde mora o que
o catálogo não pode tocar: onde a aula entra, o que ela ensina, o que conta
como concluí-la. O catálogo ganhou o `presentationOverrides`, que carrega
exclusivamente mídia. A ausência dos outros campos é a garantia: não é uma
regra que alguém precisa lembrar de checar, é uma forma que não permite
expressar o proibido. Além disso o parser recusa explicitamente `topicId`,
alvos, prioridade e prerequisite dentro de um override, e recusa publicar
cápsula com id de slot canônico — recusar em silêncio seria pior, o autor
acharia que funcionou.

**A aula de tons não virou uma sexta cápsula.** A Parte E1 pede progressão, e
progressão cabe em segmentos: 1º × 3º, depois 2º × 4º, depois o mapa, dentro da
mesma aula. Os exemplos são vogais soltas — usar mā/má/mǎ/mà com significado
exigiria quatro palavras que o aluno nunca viu, e a aula sobre movimento do som
viraria uma aula de vocabulário escondida.

**O gate mudou a colocação da aula de componentes, não o contrário.** Eu tinha
posto a F5 no meio do tópico para poder usar 人 e 木 como "já conhecidos". O
`validate:first20-instruction-order` reprovou na primeira execução:
`concept:hanzi-components` é cobrado já no primeiro passe. A regra é que a aula
venha antes e APRESENTE o que precisa — foi o que ela passou a fazer. Os
distratores do microcheck também mudaram: usavam 口 e 日, que naquele ponto o
aluno ainda não viu.

**Ordenação não bastava.** Descobri quebrando o gate de propósito que apagar a
aula de "O que é mandarim?" inteira continuava passando: o plano autorado expõe
你好 inline antes de cobrar, e nenhuma surpresa aparecia. Mas "exposto numa tela
do exercício" é exatamente o que esta remessa deixa de aceitar como ensino.
Agora todo tópico da fundação precisa ser ABERTO por uma aula.

**Os pacotes de produção são gerados da própria aula.** Um roteiro escrito à
parte começa igual ao da animação e diverge no primeiro ajuste de copy; meses
depois ninguém lembra qual dos dois é o certo. Gerando, o roteiro é a aula, e
`validate:foundation-packs` reprova se alguém mexer na cápsula sem regerar.

**O registry não deixa fingir.** `videoAssetPt` e `videoAssetEn` são derivados
dos assets realmente cadastrados — o campo não é escrevível. É a única forma de
a Parte K1 valer de verdade. `qaPt` e `qaEn` ficam em `NOT_PROMOTED` pelo mesmo
motivo: QA físico é coisa que uma pessoa faz num aparelho.

## O que o e2e pegou

O cenário 11 encontrou um defeito que nenhum validador acharia: concluir uma
aula da fundação não marcava nada. `LessonCapsulePage` procurava o node em
`JOURNEY_NODES`, e os slots não moram lá. Na prática a trilha nunca mostraria
"Feito" e o handoff do dragão nunca apareceria para ninguém.

## Gates

Sete entradas novas na cadeia `validate:beta`:

`validate:core-instruction-slots`, `validate:foundation-capsules`,
`validate:capsule-presentation-parity`, `validate:foundation-locale-parity`,
`validate:first20-instruction-order`, `validate:foundation-packs`, e as sete
recusas novas dentro de `validate:lesson-catalog`.

Onze mutações verificadas nas duas direções: campo proibido em override, id
reservado, voz no idioma errado, aula depois da cobrança, aula apagada, alvo
inexistente, hànzì divergente entre PT e EN, microcheck sem reensino, aula sem
o degrau NOTICE, aula de nove minutos, resposta certa em posição diferente
entre idiomas — e a deriva entre cápsula e pacote de produção.

## Evidências

Treze capturas em `docs/screenshots/v493/`, geradas por
`npx playwright test --project=screenshots -g "V4.9.3"`.

## O que NÃO foi feito

- **Nenhum vídeo gravado.** `productionVideoAssets = 0`, e os requisitos de
  cada aula estão em `docs/content/foundation-wave-1/*/media-requirements.md`.
  Quando os arquivos existirem, publicar é subir um JSON — sem rebuild e sem
  mudar id de currículo.
- **HLS continua declarado sem implementação**, pela mesma razão da V4.9.2B.
- **QA físico não foi promovido.** Nenhuma automação verde promove QA em
  aparelho real.
- **Nada da wave 2.** Sem temas de viagem, compras ou qualquer conteúdo fora
  da fundação.
