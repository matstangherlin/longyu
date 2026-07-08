# Longyu (龙语) — Blueprint do Produto

> _"Pare de ver desenhos. Comece a ver lógica."_
> Um app pessoal para aprender mandarim de verdade — calmo como o Notion por fora, treinador sério por dentro.

Versão 2.0 · pt-BR · documento-vivo (incrementa a pesquisa inicial)

---

## 1. Tese central

A maioria dos cursos de mandarim falha porque **joga centenas de caracteres na sua cara** logo no começo. O Longyu inverte isso. A ordem de aquisição é:

**Som → Fala em blocos → Caracteres em camadas → Leitura guiada.**

Por que essa ordem importa especificamente no mandarim:

- O mandarim depende de **4 tons** no pinyin, mas a fala real tem _tone sandhi_ e variação por contexto. Treinar sílaba isolada (`mā má mǎ mà`) ajuda, mas **não basta** — o treino precisa subir rápido para pares, palavras e frases curtas.
- Os itens mais frequentes (的, 是, 不, 我, 有, 在...) são em grande parte **partículas, pronomes e peças gramaticais**. Eles fazem sentido em microfrases, **não em flashcards soltos**.
- O léxico moderno é cheio de **palavras dissilábicas** (chunks), não de caracteres isolados.
- Caracteres **não são desenhos arbitrários**: a maioria dos frequentes é fono-semântica. Dá para **desmontar** em componentes — não decorar 500 figurinhas.

**Ajuste-chave em relação ao plano original:** não deixamos os caracteres totalmente de fora até tarde. A **escrita à mão** fica para depois, mas o **reconhecimento visual leve** começa cedo (20–30 caracteres super frequentes já na fase de sobrevivência). Isso bate com o HSK 3.0, que separa explicitamente _reconhecer_ de _escrever_.

---

## 2. As 4 competências + SRS

O produto não é uma trilha linear única. São quatro competências rodando juntas, costuradas por repetição espaçada.

| Competência | Para que existe | Como funciona |
|---|---|---|
| **Som** | Fixar pinyin, iniciais, finais, tons, sandhi | Pares mínimos, imitação, contraste tonal, _shadowing_ de áudio |
| **Fala útil** | Transformar vocabulário em uso real | Chunks de sobrevivência, substituição de slots, roleplay |
| **Hànzì** | Tirar o medo visual dos caracteres | Reconhecimento antes da escrita, decomposição em componentes, famílias |
| **Leitura** | Construir autonomia real | Microtextos graduados com áudio e toque-para-traduzir |

**SRS (repetição espaçada)** corre por cima de tudo: palavra, frase e caractere voltam no momento de quase-esquecer (SM-2 simplificado / Leitner). A retenção é separada por **som, significado, forma e uso**, porque saber reconhecer não é o mesmo que conseguir produzir.

### Fluxo de uma lição (inverte o "olha o caractere e decora")

```
ouvir / imitar  →  compreender  →  produzir guiado  →  SÓ ENTÃO ver o hànzì  →  amarrar em microleitura
```

O aluno primeiro entende **som e uso**; depois reconhece **forma**; só por último se cobra na **escrita**.

---

## 3. Roadmap pedagógico (as 7 fases)

| Fase | Foco | Meta realista |
|---|---|---|
| 1 · Entender o sistema | Hànzì, pinyin, tons, teclado, radicais, SVO | Parar de ver "desenhos aleatórios" |
| 2 · Pronúncia | Iniciais, finais, 4 tons, ouvido | Distinguir e imitar tons com segurança |
| 3 · Sobrevivência | Chunks úteis + reconhecimento leve de 20–30 hanzi | 250–400 palavras de alto uso em contexto |
| 4 · Primeiros caracteres | Reconhecimento sem pressão de caligrafia | Ler microfrases e rótulos simples |
| 5 · Construção lógica | Radicais, componentes, famílias semânticas/fonéticas | "Como o caractere foi montado" |
| 6 · Conversação | Família, comida, trabalho, viagem, compras | Conversar ~5 min |
| 7 · Leitura expandida | Textos graduados com áudio e glossário | Ler histórias curtas sem travar |

Marcos de caracteres: **150–250 reconhecidos → 500–800 → 1500+**. Referência: ~3.500 caracteres frequentes cobrem a maioria do material comum. Marcos intermediários são bons — só não confundir com "fluência total".

---

## 4. Design system

**Princípio:** aprender uma escrita nova já gera carga cognitiva. A interface precisa de **calma visual** — muito branco quente, tipografia forte, pouco ruído, hanzi com respiro. Vermelho é **acento** (ação, acerto, foco, CTA), nunca fundo inteiro.

> Nota cultural: vermelho = sorte/energia em contextos chineses; **branco puro** carrega luto. Por isso usamos **branco quente / off-white** como base e vermelho controlado — não um app "metade vermelho metade branco".

Dois temas trocáveis em runtime (contraste ≥ 4.5:1, WCAG 2.2):

| token | Notion Clay | China Modern |
|---|---|---|
| Fundo | `#F7F6F3` | `#FFF9F7` |
| Superfície | `#FFFFFF` | `#FFFFFF` |
| Texto | `#2F3437` | `#2B2B2B` |
| Borda | `#E9E5DF` | `#EFE4E1` |
| Vermelho ação | `#B9412E` | `#B42318` |
| Vermelho forte | `#8F3122` | `#7A1F1A` |

Tipografia: **Noto Serif SC** para hanzi e títulos de display (igual às telas de inspiração), **Inter** para UI. Layout: barra superior fina, progresso discreto, cards com radius suave, **sidebar no desktop / tab bar no mobile**.

### Métricas adultas (não XP infantil)

Tons distinguidos com acerto · minutos falando em voz alta · chunks recuperados sem pista · caracteres reconhecidos em contexto · microtextos lidos sem _lookup_ · dias consecutivos com prática distribuída.

---

## 5. Conteúdo e corpus

`first-5000.pdf` é a **espinha dorsal da ordem de introdução** (frequência), **não um currículo de cartões secos**. Uso inteligente: se 的, 是, 不, 我, 有, 在 aparecem cedo, o app gera **microfrases** (我是…, 我不…, 有没有…, 在这里, 这是…), não "memorize este caractere".

Três camadas de organização do conteúdo:

1. **Função e sobrevivência** — pronomes, negação, existência, localização, cópula, pergunta, números, tempo.
2. **Famílias semânticas / situações** — comida, família, rotina, dinheiro, deslocamento, trabalho, digital.
3. **Famílias gráficas** — água (氵), pessoa (亻), boca (口), coração (忄), mão (扌), madeira (木), fala (讠), fogo (火).

O mesmo item serve para **fala, leitura e lógica visual** ao mesmo tempo.

---

## 6. Arquitetura técnica

- **Web + app ao mesmo tempo:** PWA responsiva e instalável (webview). Desktop = sidebar; mobile = tab bar.
- **Stack:** Vite + React + TypeScript + Tailwind (tokens via CSS variables) + React Router + Zustand (persistência em `localStorage`) + vite-plugin-pwa.
- **Áudio ("escutar"):** **Web Speech API** (`speechSynthesis`, voz `zh-CN`) encapsulada em `lib/tts.ts`. Custo zero, sem chave. **Trocável** por Google Cloud TTS / Azure no futuro sem mexer nas telas.
- **Sem backend no MVP:** todo o progresso/SRS vive no dispositivo. Sync na nuvem fica para depois.
- **Deploy:** build estático → `Dockerfile` servindo os assets (compatível com o Cloud Run atual).

### Modelo de dados (resumo)

`Character`, `Component/Radical`, `Chunk`, `Phase`, `Lesson`, `MicroText`, `Tone/MinimalPair`, `SRSItem`, `Progress`. Detalhe em `src/data/types.ts`.

---

## 7. Escopo do MVP

| Módulo | Entra no MVP | Fica para depois |
|---|---|---|
| Som | Treinador de tons, pares mínimos, referência pinyin | Avaliação de pitch por IA |
| Fala | ~30 chunks essenciais com áudio + quiz | Trilhas temáticas amplas |
| Hànzì | Reconhecimento + decomposição (休, 林, 明...) | Caligrafia / ordem de traços |
| Leitura | Microtextos com toque-para-traduzir | Biblioteca grande |
| SRS | Revisão por domínio (som/significado/forma/uso) | Skill-tracing sofisticado |
| Conversa | — | Roleplay com IA |

Ordem de construção = ordem de **valor pedagógico**: áudio → chunks → revisão → caracteres → leitura. Não "o que fica bonito primeiro".

---

## 8. Próximas rodadas

Reconhecimento de fala e feedback visual de _pitch_ · caligrafia e ordem de traços · conversa longa com IA · biblioteca de leitura graduada · TTS premium · backend + sincronização entre dispositivos · currículo completo das 7 fases · importação do corpus de 5.000 com glosas pt-BR.

---

_Resumo direto: nascer como um Notion calmo por fora e um treinador de mandarim muito sério por dentro. Vermelho como acento, branco quente como base, **som como fundação**, palavras em chunks como núcleo, hànzì como sistema desmontável, leitura graduada como prova real de progresso._
