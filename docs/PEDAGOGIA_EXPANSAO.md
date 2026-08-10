# Expansão pedagógica do Longyu

> Documento de direção. A onda 1 já está no código; as demais estão descritas
> aqui para não se perderem e para que cada uma entre sabendo onde encaixa.

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

## 3. Ondas seguintes

### Onda 2 — beta inicial

| Motor | Ideia | Nota de implementação |
|---|---|---|
| 🔨 Hanzi Forge (evolução) | 女+子→好, 木+木→林, 日+月→明; depois radical, fonético, família, estrutura | `hanziBuilder.ts` já existe — falta a camada de *famílias* e a leitura de estrutura |
| 🏙️ Explore China | Uma ilustração de cena gera dezenas de tarefas: toque em 茶 → onde estão os 筷子 → encontre algo de comer → peça arroz | Estende `image_choice` para *hotspots* numa cena única |
| 🎤 Shadowing | Áudio + palavras acompanhando + gravação; nota de palavras, ritmo, pronúncia, tons | Começa simples com reconhecimento de fala + timing |
| 🔊 Audio Memory / Quem disse? | Sequência de áudios ou conversa curta; depois, perguntas de memória | Reaproveita o áudio das cenas |
| 🎧 Real World Listening | Mesmo áudio em 4 níveis: claro, natural, rua, hardcore | O nível "imersão" do ditado já é o primeiro degrau |

### Onda 3 — recurso grande, pós-beta

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

### Onda 4 — depois

Tone Trace (desenhar o contorno do tom com o dedo), Hanzi Draw (escrita à mão
avaliando forma → número de traços → direção → ordem → proporção), conversação
aberta com IA, geração adaptativa controlada de situações.

---

## 4. Longyu Arcade

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

## 5. Personalização adaptativa

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

## 6. Sistema de variantes

Cada lição com três experiências (Tentativa A / Revisão B / Revisão C) — mesma
habilidade, caminho diferente. 122 lições × 3 = 366 combinações **sem escrever
366 currículos**.

Isto é uma extensão natural do que já roda: `buildLessonPracticePlan` já monta
a rodada a partir de candidatos. Falta declarar o *perfil de variante* e passá-lo
como contexto. A onda 1 é o pré-requisito: sem motores suficientes, três
variantes seriam a mesma coisa três vezes.

---

## 7. Surpresas e missão diária

Nem toda atividade precisa estar no mapa: ⚡ desafio relâmpago, 🕵️ pista
encontrada, 🎧 escuta surpresa, 🔥 combo de tons, 🐉 desafio Longyu.

E a missão diária deixa de ser "complete 3 lições":

```
🎧 acerte 8 exercícios de escuta   🎤 fale 5 frases
🐉 complete 1 Hanzi Forge          🔥 faça combo x10 no Blitz
```

---

## 8. Arquitetura alvo

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

## 9. Expansão internacional

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
