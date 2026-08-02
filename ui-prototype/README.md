# Longyu · Protótipos UI/UX

Protótipos clicáveis (HTML + CSS + JS puros, sem build) com propostas de
redesign para as páginas mais sobrecarregadas do Longyu.

## Versões

| Arquivo | Direção de arte | Tom |
| --- | --- | --- |
| `index.html` | Fiel aos tokens atuais (`clay`) — cards, busca, destaques, accordions | Evolução segura |
| `v2.html` | **Tinta & papel** — identidade editorial que foge do "padrão de IA" | Nova identidade |
| `v3.html` | **Estilo Duolingo** — verde, botões de pressão, nós de caminho, mascote, gamificação | Referência de app popular |
| **`v4.html`** | **Duolingo em vermelho** — mesmo estilo do v3, com o vermelho da marca Longyu | Marca + referência popular |

## Como ver

Abra o arquivo desejado no navegador (duplo clique). Nada precisa de instalação.

## Navegação do protótipo

- **Toolbar no topo**: alterna entre as páginas e o modo **Telefone / Desktop**.
- A página/modo ficam na URL (`#mais/desktop`), então dá para compartilhar um
  link direto para qualquer tela.
- Tudo é clicável: abas, cartões, accordions, busca.

## v4 — Duolingo em vermelho (polido e ampliado)

Idêntico ao v3 na essência (Duolingo), porém **reescrito e expandido** com a cor
da marca:

- Primário **vermelho #F2543F** (gradiente) com escuro **#D63E28** e claro
  **#FFDCD3**; fundo quente **#FFF9F5**; secundário roxo **#A968F5**.
- **5 telas** (era 3): **Jornada**, **Lição (quiz interativo)**, **Praticar**,
  **Ligas** e **Mais** — todas em mobile e as principais em desktop.
- **Quiz de lição funcional**: escolha de resposta com feedback (verde = acerto,
  vermelho com "shake" = erro), **corações que se perdem**, barra de progresso
  que enche, botão CONTINUAR ao acertar e TENTAR DE NOVO ao errar. Reseta ao
  reentrar na lição.
- **Banner festivo** com confete animado, balão do mascote e botão CONTINUAR.
- **Caminho de nós** com badges de check, nó atual com anel pulsante e baú com
  brilhos.
- Cabeçalho com sino de notificações, pílulas de XP/racha/gemas.
- Liga com pódio e linha "Você" destacada.
- Micro-interações: hover/active em cards e botões, botões com "borda de pressão"
  e brilho superior.

## v3 — Estilo Duolingo

Replica a linguagem visual do Duolingo aplicada ao Longyu:

- **Verde #58CC02** como cor de ação + botões com "borda de pressão" (borda inferior grossa escura; ao clicar, afunda).
- **Cards brancos** com borda grossa #E5E5E5 (borda inferior mais grossa) — o padrão de botão/card do Duolingo.
- **Cabeçalho gamificado**: mascote, XP com gema, racha com chama, gemas.
- **Caminho de nós circulares** (feita = verde com estrela, atual = grande com glow, futura = cinza com cadeado, marco = baú dourado).
- **Banner "Continue"** com mascote + balão + botão verde gigante.
- **Mascote dragãozinho** (SVG) — versão do "corujinha" para o Longyu.
- **Fonte Nunito** (arredondada e grossa) + hanzi em Noto Serif SC.
- Paleta secundária: azul #1CB0F6, vermelho #FF4B4B, laranja #FF9600, dourado #FFC800.

A página Mais mantém as mesmas melhorias (busca, destaques com estado, accordions,
toggle NOVO/HOJE) só que com o vocabulário visual do Duolingo.

## v2 — "Tinta & papel" (menor cara de IA)

Mudança completa de direção de arte para fugir do visual genérico de IA:

| Anti-padrão "de IA" | Substituição no v2 |
| --- | --- |
| Emojis como ícones | Glifos hanzi (字, 声, 语, 读, 听…) como ícones |
| Cards arredondados iguais em grade perfeita | Papel com cantos leves, layouts variados, assimetria |
| Pills / segmented controls arredondados | Chips "ingresso" retos, toggle estilo carimbo |
| Sombra difusa ao redor do card | Sombra offset dura (papel sobre papel) + linhas finas de tinta |
| Fonte sans genérica em tudo | Títulos em serif (Noto Serif SC), rótulos em caps espaçadas |
| Fundo cinza-bege neutro | Papel creme com granulado + vermelho cinábrio (tinta de selo) |
| Grade perfeita e simétrica | Hierarquia editorial: numeração 壹贰叁, seções com régua fina |

Detalhes da identidade:
- **Sinetes 印章**: quadrados vermelhos com hanzi branco (续, 复, 日…) com leve rotação — marca registrada do design.
- **Texto vertical**: colunas de hanzi (车站, 每日) como marcas d'água decorativas.
- **Timeline de lições**: pontos de tinta (jade = feita, cinábrio = atual, pontilhado = futura).
- **Stats sem caixas**: números serifados separados por linhas finas.
- **Busca**: input só com underline, estilo "escrever no papel".

## Páginas (em ambas as versões)

| Página | O que mostra |
| --- | --- |
| **Jornada** | Home com cabeçalho contextual, CTA “Continuar”, revisão secundária, unidade atual com caminho focado e missão do dia. |
| **Mais** ⭐ | Redesign da página mais poluída do app — busca, cartão “Continuar”, 3 destaques com estado real e lista compacta em accordions. Botão **NOVO / HOJE** compara com a versão atual (20 cards de igual peso). |
| **Praticar** | Hub de habilidades com destaques por progresso e o restante em listas por objetivo (ouvir/falar, ler/escrever). |

## Problemas identificados na página “Mais” atual

- **20 cards de igual peso** em 3 seções (`Aprender 8`, `Motivação 5`, `Conta 7`) → paralisia de decisão.
- **Sem busca** — o usuário precisa ler tudo para achar uma área.
- **Sem prioridade** — “Revisão com 4 pendências” e “Loja” competem visualmente com “Dados locais”.
- **Duplicação** — vários itens já estão na barra inferior / flyouts (Praticar, Perfil…).
- **Hierarquia plana** — tudo com mesmo ícone neutro e mesmo tamanho de card.

## Nota técnica

O granulado de papel do v2 usa um SVG em `data-URI`. Alguns ambientes de preview
bloqueiam data-URIs em `background-image`; por isso o `.paper` tem fallback de
gradientes puros (funciona em qualquer lugar). Em navegador normal o granulado
aparece.

## Tokens

- v1: segue `src/index.css` (tema clay).
- v2: paleta própria — papel `#F4EDDF`, tinta `#26221B`, cinábrio `#A63D2F`,
  jade `#3E6B52`, dourado `#9A7726`.
4. **Lista compacta em accordions** (“Tudo em um lugar”): linhas densas com
   descrição e estado, agrupadas em *Estudar / Motivação / Conta e sistema*,
   sem o peso visual de 20 cards grandes.
5. **Menos repetição**: Praticar sai do card e fica como seção colapsada; o resto
   da navegação segue a barra inferior.

## Tokens usados

Segue os tokens do app (`src/index.css`, tema `clay`): fundo `#F7F6F3`,
superfície `#FFFFFF`, texto `#2F3437`, acento `#B9412E`, dourado `#8A5A17`,
verde `#2F855A`, fontes Inter + Noto Serif SC (hanzi).
