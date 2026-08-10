# Expansão pedagógica do Longyu

> Documento de direção. As ondas 1, 2 e 3 já estão no código; as demais estão
> descritas aqui para não se perderem e para que cada uma entre sabendo onde
> encaixa. Os números de cada onda saem dos relatórios em `reports/`, gerados
> pelos portões — não são estimativas.

---

## 1. O diagnóstico

A impressão de "raso" não vem da arquitetura — vem do **catálogo de motores**.

O que já existia antes desta expansão:

- um construtor de plano adaptativo real (`buildLessonPracticePlan`) que monta
  cada rodada por estágio, pontua candidatos, penaliza repetição e exige
  **transformação cognitiva** para repetir um alvo (`lessonNovelty.ts`);
- SRS por domínio separado (som, significado, forma, uso, pinyin, fala);
- 38 cenas de conversa V2 com ramificação, reparo de erro e um **loop de
  vocabulário** que obriga o que apareceu na conversa a voltar depois;
- HanziBuilder, exercícios de imagem, tons, microleitura.

Ou seja: a máquina de variar já existia. O que faltava eram **modalidades para
ela variar entre**. Com 21 tipos de exercício, e a maioria sendo alguma forma
de "escolha a alternativa", o plano rodava bem mas soava igual.

A regra que orienta toda a expansão:

> Nenhum motor existe só para divertir. Toda atividade alimenta progresso, SRS,
> domínio de vocabulário, tons, compreensão, fala ou hànzì.

E o objetivo não é "mais exercícios" — é **o mesmo conteúdo reaparecendo em
situações diferentes**:

```
aprende 茶 → ouve 茶 → distingue de 咖啡 → completa 我要一杯茶
   → pede chá numa conversa → ouve o garçom → fala a frase → reencontra no SRS
```

---

## 2. Onda 1 — implementada

Quatro motores novos, ligados ao construtor de plano, ao SRS, à remediação
imediata e à fase pós-conversa. Nenhum currículo novo foi escrito: os 122
planos existentes passaram a ter modalidades novas.

| Motor | `StepKind` | O que cobra | Onde entra |
|---|---|---|---|
| 👂 Par mínimo | `audio_discrimination` | Ouvido puro: "iguais ou diferentes?" | reconhecimento, consolidação, pós-conversa |
| ✍️ Ditado | `dictation` | Som → escrita (blocos / pinyin / hànzì) | montagem, consolidação, pós-conversa |
| 🧠 Qual não pertence | `odd_one_out` | Sentido e categoria | reconhecimento, consolidação, pós-conversa |
| 🕵️ Qual frase funciona | `spot_error` | Estrutura e intenção | uso, consolidação |

### Como o conteúdo é gerado

`src/data/perceptionDrills.ts`. A regra é: **nada inventa vocabulário**.

- **Pares mínimos** são *derivados* do corpus. Tons saem do agrupamento de
  `CHARACTERS` por `toneless` (妈/麻/马/骂 e outros 23 grupos); contrastes de
  inicial e final saem de grupos confundíveis para quem fala português
  (`zh×j`, `ch×q`, `sh×x`, `s×sh`, `n×l`, `-an×-ang`, `-en×-eng`, `-in×-ing`,
  `u×ü`…). 69 pares hoje, sem curadoria manual.
- **Grupos semânticos** saem dos `VocabDomain` do corpus — três palavras de um
  domínio + um intruso de outro, com pares próximos demais (comida×bebida,
  pessoa×família) explicitamente barrados.
- **Frases de estrutura** são curadas à mão, porque não dá para gerar mandarim
  errado com segurança. Cada uma é um erro **real** de quem fala português:
  `我是水` por `我要水`, `我有二十岁` por `我二十岁`, `我不有钱` por `我没有钱`,
  `我们去明天` por `我们明天去`, classificador ausente, `吗` fora do fim.

Tudo é liberado por **glifos já vistos** (currículo percorrido + progresso do
aluno): um drill nunca cobra caractere que o aluno não encontrou.

### O que foi corrigido no caminho

Duas regressões pedagógicas antigas apareceram quando o plano ganhou
modalidades e foram consertadas:

- **A fase pós-conversa podia empilhar a mesma modalidade.** Para atingir o
  mínimo de tarefas, o seletor percorria a lista de tipos sempre do início e
  preenchia com três múltiplas escolhas seguidas sobre palavras diferentes.
  Agora só repete um `kind` depois de esgotar as modalidades novas.
- **A resposta principal da cena voltava por sorte.** O retorno em tarefa
  *contextual* (montar, responder à situação, completar, escrever o que ouviu)
  agora é garantido, não um efeito colateral da ordenação por score.

### Efeito medido

| Métrica | Antes | Depois |
|---|---:|---:|
| Lições com pelo menos um motor novo | 0 | 114 / 122 |
| Profundidade média (`validate:exercise-depth`) | 91 | 92 |
| Lições abaixo do score recomendado | 2 | 0 |
| Repetições com transformação cognitiva | 85 % | 86 % |

Portão novo: `npm run validate:perception-drills`, dentro de `validate:beta`.
Ele confere que cada par mínimo contrasta o que diz contrastar, que grupos e
frases são bem formados, que todo passo gerado passa em `validateExercise` e
que nenhum motor sumiu do plano real.

---

## 3. Onda 2 — implementada

A onda 1 resolveu **variedade**. O que continuava fraco era o outro eixo:

```
percepção + compreensão + construção   →  forte
produção independente + transferência  →  ainda apoiado em alternativas
```

Praticamente toda tarefa terminava em *escolher* ou *ordenar peças que o app
entregou*. Três motores novos tiram o apoio.

| Motor | `StepKind` | O que cobra | Onde entra |
|---|---|---|---|
| ✍️ Produção livre | `free_production` | Situação em pt-BR → frase inteira, sem banco e sem alternativas | uso, consolidação, pós-conversa |
| 🔀 Transferência | `transfer_task` | Mesma estrutura, combinação que o currículo **nunca** mostrou | consolidação, pós-conversa |
| 🩹 Reparo | `conversation_repair` | Continuar depois do mal-entendido: repetir, simplificar, pedir de novo | uso, consolidação, pós-conversa |

### Como o conteúdo é gerado

`src/data/productionTasks.ts`, mesma regra de ouro do módulo de percepção:
**nada inventa vocabulário.**

- **Frames de frase** (11) são curados, e cada um tem **âncora real no
  currículo**: `我要 ___` ancora em 我要这个, `___在哪里？` em 火车站在哪里？,
  `我有 N 个 ___` em 我有三个朋友. É a âncora que autoriza cobrar a estrutura.
- **As peças** saem de `vocabulary.ts` pelo id — hànzì e pinyin nunca são
  escritos à mão no frame. Só o enunciado em português é curado, porque não dá
  para gerar situação comunicativa a partir de tabela de frequência.
- **A partição produção × transferência é automática.** Monta-se a frase; se
  ela já existe em `chunks.ts`, `vocabulary.ts` ou em qualquer passo autoral,
  é **produção** (produzir do zero o que antes vinha montado). Se não existe,
  é **transferência**. 58 tarefas hoje: 14 de produção, 44 inéditas.
- **Frases irmãs**: 我想喝茶 e 我要茶 pedem a mesma coisa no balcão. Um frame
  declara `alsoAcceptFrameIds` e as duas contam como certas. O app não pune o
  aluno por ter produzido outra frase correta.
- **Reparo** é um banco curado de situações com direção explícita: quem não
  entendeu quem. Se o personagem não entendeu, repetir e simplificar resolvem
  e *pedir para ele repetir* é o movimento errado; se foi o aluno que não
  entendeu, é o contrário. O distrator é sempre o movimento certo da outra
  direção — nenhum absurdo.

### A tela é definida pelo que ela não tem

Nenhum banco de peças, nenhuma alternativa, nenhum hànzì no enunciado, nenhum
modelo antes da resposta. Digitar ou falar (o reconhecimento de fala já
existia na prática de pronúncia); pinyin com ou sem acento é aceito.
`validateExercise` **bloqueia** o passo que oferecer opção, banco ou alvo em
peças — produção com alternativa é reconhecimento com outro nome.

O reparo tem duas fases porque são duas falhas diferentes: escolher o
movimento errado e não conseguir dizer o movimento certo.

### Correção de um efeito colateral

Os motores novos pontuam alto (produção + frase real) e começaram a **expulsar
do plano** exercícios que a lição precisava: o único visual, o segundo
HanziBuilder, a cena de conversa, o jogo de estrutura. Três consertos, todos
válidos independentemente desta onda:

- **cobertura garantida agora é protegida.** `ensureCoverage` colocava o
  exercício e o passo seguinte o derrubava; a garantia valia até a próxima
  chamada. Agora o que entra por garantia estreita (visual, HanziBuilder,
  cena, variante) não é candidato a substituição nem ao corte final.
- **cota rotativa dos motores de percepção.** Par mínimo, ditado, intruso e
  estrutura pontuam menos que produção; sem reserva, o de maior score levava
  todas as vagas. A rotação por lição dá ~30 lições a cada um. Mesma correção
  para os três jogos semânticos: pedir "algum `meaning_`" fazia o de maior
  score vencer sempre, e `meaning_spot_error` tinha praticamente sumido.
- **guarda de trio alinhada ao portão.** O gerador olhava só as duas últimas
  ocorrências de uma chave; `validate:lesson-novelty` varre **todos** os trios.
  Passavam quatro escolhas de significado seguidas quando duas diferiam no
  escopo. Agora o gerador varre igual ao portão.

### O loop pós-conversa — o ponto que estava travado

Era o dado mais incômodo do diagnóstico: a onda 1 deixou o pós-conversa muito
mais variado, e mesmo assim a cobertura ficou parada em ~68 %. Mais
modalidades não fecham o loop sozinhas.

Duas causas reais, as duas consertadas:

1. **A fase gastava as vagas nos itens mais bem pontuados.** A seleção ordenava
   candidatos por score e nunca perguntava se o item já tinha tarefa — havia
   até um `usedRefs` calculado e nunca lido. Agora existe um passe que dá a
   **primeira** tarefa a cada item ainda descoberto antes de qualquer segunda.
2. **Não havia prioridade declarada.** Agora há: resposta principal da cena,
   item novo e item que o aluno errou ganham um passe dedicado de fechamento,
   sempre por uma modalidade que a fase ainda não usou na lição.

E o indicador mudou, porque o antigo media a coisa errada. Cobertura bruta
trata `你好` e `我会说一点中文` como o mesmo problema, e não são: o primeiro
aparece em **576** passos ao longo do curso, o segundo em 21. Exigir 100 % do
bruto empurraria o app a repetir `谢谢` sem fim — o oposto de consolidar.

O portão agora cobra **cobertura relevante**: item novo, resposta principal da
cena, ou item de baixa exposição. Fica fora só o **núcleo saturado** — 19 refs
com 40+ exposições no curso inteiro, listados no relatório para auditoria.

### Efeito medido

| Métrica | Onda 1 | Onda 2 |
|---|---:|---:|
| Lições com transferência | 0 | 108 / 122 |
| Lições com produção livre | 0 | 70 / 122 |
| Lições com reparo conversacional | 0 | 25 / 122 |
| Frases inéditas cobradas no plano real | 0 | 22 |
| Cobertura do loop (bruta) | 67,6 % | 78,3 % |
| **Cobertura relevante** (portão ≥ 76 %) | — | **80,2 %** |
| Reutilização média por item | 1,91 | 2,19 |
| Itens sem cobertura | 243 | 151 |
| Profundidade média (`validate:exercise-depth`) | 92 | 95 |
| Lições abaixo do portão de profundidade | 0 | 0 |

Duas ressalvas honestas sobre a tabela:

- **A média de profundidade não é comparável ponto a ponto.** A rubrica ganhou
  um eixo que não existia (produção sem apoio e transferência, com peso
  deliberadamente pequeno: +6 e +4 no máximo). Parte da subida de 92 → 95 é
  tarefa nova, parte é o eixo novo. As lições que o diagnóstico citou como
  rasas subiram de verdade — 你好 tons 73 → 80, comparar 1º e 4º tom 72 → 82,
  六七八 74 → 84 — e todas ganharam produção e transferência no plano.
- **O reparo só existe a partir do meio do curso**, e isso é proposital: não dá
  para pedir que o aluno peça repetição antes de a jornada ensinar
  请再说一遍 / 我听不懂. 25 lições é o teto real do currículo atual, não uma
  meta frouxa.

Portão novo: `npm run validate:production-transfer`, dentro de `validate:beta`.
Ele confere que produção livre não tem apoio nenhum, que **cada alvo de
transferência não existe no currículo** (chunk, microfrase ou passo autoral),
que o reparo oferece estratégias distintas e coerentes, que nenhum motor cobra
glifo que a jornada ainda não apresentou, e que os três aparecem no plano real
de uma fração mínima das lições — motor declarado que nunca roda não conta.

### O que a onda 2 deliberadamente não fez

O diagnóstico pedia produção sem alternativas, transferência, reparo e loop —
não mais dez minigames. Nenhum motor novo foi criado além desses três, e nenhum
currículo novo foi escrito.

---

## 4. Onda 3 — implementada

A onda 2 tirou o apoio: sem banco, sem alternativas. Mas ainda restava um
apoio invisível — **o alvo combinado**. Toda produção era "diga *esta* frase
sem ajuda", e o app conferia contra ela. Isso treina montar; não treina
escolher o que dizer. Escolher é metade de falar.

Duas mudanças, uma consequência da outra.

### 4.1 Objetivo comunicativo em vez de frase esperada

Cada estrutura agora declara **o que ela faz**, não só como ela é:

```
request_item      我要X · 我想喝X · 我想吃X
ask_location      X在哪里？ · 请问，X在哪里？
buy_item          我要买X · 我想买X
ask_price · state_preference · state_destination · offer_item
refuse_drink · refuse_food · count_possession
```

O que conta como certo passa a ser decidido pelo par **(objetivo, conteúdo)**,
não pela estrutura. Pedimos "diga que quer beber chá": 我想喝茶 vale, e 我要茶
vale igual — as duas pedem chá no balcão. Antes a segunda levava errado.

Isso substituiu uma lista manual de pares (`alsoAcceptFrameIds`) que precisava
ser lembrada a cada estrutura nova. Agora uma estrutura entra no conjunto de
respostas certas só por declarar o objetivo.

A quantidade entra na chave junto com a peça: "diga que tem 3 amigos" não
aceita 我有五个朋友 — mesmo objetivo, conteúdo diferente.

Três estruturas novas existem justamente para dar ao objetivo mais de uma
realização: 请问，X在哪里？ (pergunta educada), 我想买X e 我想吃X. Hoje **34 das
72 tarefas** aceitam pelo menos uma frase irmã, e a correção mostra as outras
("isto também valia") — o aluno descobre que havia mais de um jeito certo,
em vez de só levar um check.

### 4.2 Produção aberta: objetivo sem alvo

O enunciado dá a situação e o objetivo. O conteúdo é escolha do aluno:

> Você senta no restaurante e o garçom vem até a mesa. Peça alguma coisa para
> comer ou beber.

Não há resposta esperada. Qualquer realização daquele objetivo que o aluno já
tenha condições de escrever conta — **17 frases diferentes** cumprem essa
situação hoje. E continua verificável: o conjunto de respostas sai inteiro dos
frames, então nada aqui aceita mandarim que o app não saiba que é correto.

Oito objetivos têm situação aberta. Contar ficou de fora de propósito: o
enunciado teria que dizer o número, e o alvo voltaria a ser único.

Uma produção aberta só é oferecida quando existem **pelo menos três** respostas
possíveis com o vocabulário que o aluno já viu. Com uma ou duas, "diga o que
quiser" é alvo único disfarçado — e o portão reprova.

### Efeito medido

| Métrica | Onda 2 | Onda 3 |
|---|---:|---:|
| Estruturas de frase | 11 | 14 |
| Objetivos comunicativos | — | 10 |
| Tarefas que aceitam frase irmã | 8 (par manual) | 34 |
| Lições com produção aberta | 0 | 41 / 122 |
| Objetivos abertos no plano real | 0 | 7 |
| Lições com produção livre | 70 / 122 | 71 / 122 |
| Lições com transferência | 108 / 122 | 110 / 122 |
| Profundidade média | 95 | 96 |
| Cobertura relevante do loop | 80,2 % | 81,0 % |

O portão `validate:production-transfer` ganhou duas regras: **objetivo com mais
de uma estrutura precisa aceitar as duas frases** (senão o objetivo é
decorativo) e **produção aberta precisa de 3+ respostas certas**, com o gate de
glifos aplicado a *todas* elas — qualquer uma é uma frase que o aluno pode
legitimamente escolher escrever.

### 4.3 Conversa sem apoio

A escada de variantes (`guided → assisted → independent → audio_first`) já
existia, mas no topo dela a cena **continuava entregando alternativas**. O
aluno "avançava" e continuava reconhecendo — o nível era rótulo.

Nos dois níveis mais altos a interação agora perde as opções e vira produção:
o aluno escreve a própria fala no meio da conversa (`produce_reply`). As
realizações irmãs do mesmo objetivo entram como aceitas, então responder certo
de outro jeito não derruba a conversa.

A conversão é conservadora de propósito — só acontece quando é justo cobrar:

- resposta curta (até 6 hànzì) e só em hànzì;
- **ramo de erro presente**. Sem ele, uma produção falha travaria a cena; com
  ele, o personagem reage e a conversa continua, que é o comportamento que
  interessa treinar.

Para o aluno veterano, isso dá **153 falas sem apoio em 106 lições**. Nada
disso é conteúdo novo: são as mesmas 38 cenas, cobradas de um jeito mais duro
quando o aluno já as viu o bastante.

| Métrica | Antes | Agora |
|---|---:|---:|
| Falas de conversa sem alternativas | 0 | 153 |
| Lições com conversa sem apoio | 0 | 106 / 122 |

### O que continua faltando

- **Reparo cedo.** Continua em ~20 lições porque a jornada só ensina
  请再说一遍 / 我听不懂 depois da metade. Subir isso é decisão de currículo,
  não de motor.
- **Falha em sequência.** A conversa já sobrevive a um erro; ainda não existe a
  conversa que degrada progressivamente e exige duas ou três recuperações
  encadeadas.
- **Produção fora dos frames.** O aluno só pode ser avaliado no que o catálogo
  sabe conferir. Sair disso exige avaliação de mandarim livre — outro problema.

---

## 5. Ondas seguintes

### Onda 3 — beta inicial

| Motor | Ideia | Nota de implementação |
|---|---|---|
| 🔨 Hanzi Forge (evolução) | 女+子→好, 木+木→林, 日+月→明; depois radical, fonético, família, estrutura | `hanziBuilder.ts` já existe — falta a camada de *famílias* e a leitura de estrutura |
| 🏙️ Explore China | Uma ilustração de cena gera dezenas de tarefas: toque em 茶 → onde estão os 筷子 → encontre algo de comer → peça arroz | Estende `image_choice` para *hotspots* numa cena única |
| 🎤 Shadowing | Áudio + palavras acompanhando + gravação; nota de palavras, ritmo, pronúncia, tons | Começa simples com reconhecimento de fala + timing |
| 🔊 Audio Memory / Quem disse? | Sequência de áudios ou conversa curta; depois, perguntas de memória | Reaproveita o áudio das cenas |
| 🎧 Real World Listening | Mesmo áudio em 4 níveis: claro, natural, rua, hardcore | O nível "imersão" do ditado já é o primeiro degrau |

### Onda 4 — recurso grande, pós-beta

- **Story Mode** — personagens recorrentes, temporada 1 "Primeira viagem à
  China": aeroporto → metrô → hotel → restaurante → mercado → fazer um amigo →
  perdido em Pequim → estação. Vocabulário antigo volta por narrativa.
- **Vida na China** — simulação, não narrativa. O objetivo é **completar uma
  missão**, não acertar perguntas: cumprimentar → pedir o cardápio → pedir
  comida → quantidade → entender o preço → agradecer. Se o aluno erra, o NPC
  responde `不好意思，你说什么？` e ele precisa se recuperar. Saber continuar
  quando a comunicação falha faz parte de aprender a língua.
- **WeChat Simulator** — conversa por mensagens, com áudio e imagem; amigo,
  professor, colega, chefe, hotel, grupo da faculdade.
- **Longyu Calls** — telefone, sem hànzì na tela. Remove as pistas visuais.
- **Detetive Longyu** — depoimentos curtos em mandarim e perguntas de dedução.
  Ensina sem parecer exercício.

### Onda 5 — depois

Tone Trace (desenhar o contorno do tom com o dedo), Hanzi Draw (escrita à mão
avaliando forma → número de traços → direção → ordem → proporção), conversação
aberta com IA, geração adaptativa controlada de situações.

---

## 6. Longyu Arcade

Jogos que usam **somente o que o aluno já desbloqueou** — nunca um jogo
separado do curso.

| Jogo | Treina |
|---|---|
| Mandarin Blitz | velocidade (60 s alternando áudio→palavra, imagem→hànzì, hànzì→significado, frase→lacuna, tom→número) |
| Tone Rush | tons |
| Hanzi Forge | hànzì |
| Dragon Dictation | escuta |
| Radical Match | componentes |
| Memory Audio | listening |
| Sound Twins | discriminação auditiva |
| Sentence Rush / Spot the Error | gramática e estrutura |
| Number Rush · Clock Challenge · Classifier Hunt | números, horários, classificadores |

Todos alimentam XP, SRS e ligas — senão viram distração.

---

## 7. Personalização adaptativa

Mais importante do que criar cinquenta jogos. Detectado que o aluno erra
听 / 说 / 看 / 想, a sessão seguinte **não** mostra quatro flashcards:

```
听 → Detetive      说 → Shadowing      看 → Story Mode     想 → Ditado
听 → Audio Memory  看 → Sentence Lab   说 → Vida na China
```

O mesmo conhecimento volta por modalidades diferentes. Boa parte da máquina já
existe (`recentErrors` entra no plano, o SRS separa domínios); falta a camada
que escolhe **modalidade por tipo de erro**, e não só item por urgência.

---

## 8. Sistema de variantes

**Implementado na onda 1** — esta seção descrevia o sistema como pendente e
ficou desatualizada; o que segue é o que a `main` faz hoje.

Cada lição tem três experiências (Tentativa A / Revisão B / Revisão C): mesma
habilidade, caminho diferente. 122 lições × 3 = 366 combinações **sem escrever
366 currículos**.

`practiceVariantForAttempt` mapeia tentativa 0 → A, 1 → B, 2 → C e 3 volta
para A; `buildLessonPracticePlan` recebe o perfil como contexto e monta a
rodada a partir dele. Não é um rótulo em cima da mesma lição:
`validate:pedagogy-wave-one` compara as assinaturas das três rodadas e exige
**rotação real** em pelo menos 65 % das lições (hoje: 118/122) e prática nova
em pelo menos 75 % (hoje: 122/122).

A onda 2 entrou na rotação: o deslocamento por variante faz A, B e C cobrarem
**frases inéditas diferentes** na transferência — sem isso, refazer a lição
repetia a mesma frase e o motor viraria mais uma coisa decorada.

---

## 9. Surpresas e missão diária

Nem toda atividade precisa estar no mapa: ⚡ desafio relâmpago, 🕵️ pista
encontrada, 🎧 escuta surpresa, 🔥 combo de tons, 🐉 desafio Longyu.

E a missão diária deixa de ser "complete 3 lições":

```
🎧 acerte 8 exercícios de escuta   🎤 fale 5 frases
🐉 complete 1 Hanzi Forge          🔥 faça combo x10 no Blitz
```

---

## 10. Arquitetura alvo

```
LONGYU
├── 🗺️ Jornada        lições · conversas · revisões · desafios finais
├── 🎭 Histórias      primeira viagem · vida universitária · trabalho · cotidiano
├── 🇨🇳 Vida na China  aeroporto · hotel · restaurante · metrô · mercado
├── 🎮 Arcade         Blitz · Tone Rush · Hanzi Forge · Dragon Dictation
├── 🎧 Imersão        natural · rua · conversas · ligações
├── 🧪 Laboratórios   som · pinyin · tons · hànzì · fala
└── 🧠 Para você      SRS · meus erros · missão diária · treino adaptativo
```

A diferença estratégica: o Longyu deixa de parecer "um curso com gamificação"
e passa a parecer um **ecossistema para aprender mandarim**.

---

## 11. Expansão internacional

Sequência: **PT-BR → ES → EN**, depois **ID → TH → FR/DE**.

Uma única localização em espanhol abre México, Argentina, Colômbia, Espanha e
praticamente toda a América Latina; o inglês abre EUA e o mercado global. Não
vale gastar energia com dez idiomas enquanto produto e retenção ainda estão
sendo validados.

**Consequência técnica que vale registrar agora:** o corpus é explicitamente
pt-BR (`meaningPt`, `notePt`, `literalPt`, glosas, explicações dos motores). A
primeira localização vai exigir separar *conteúdo pedagógico* de *idioma da
explicação* — e quanto mais motores forem escritos com o texto embutido, mais
cara essa separação fica. Vale prever a chave de tradução antes da onda 3.
