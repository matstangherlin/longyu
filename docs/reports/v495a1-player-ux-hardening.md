# V4.9.5A.1 — Player UX hardening

Base: `main` em `06f04ea958f15837703fc84e704603c9e3b47941` (V4.9.5A).

Remessa de QA de uso real. Nenhum currículo novo, nenhum motor novo. A regra é
uma só: **a modalidade prometida na tela precisa ser a modalidade real da
tarefa.**

## Os três atritos, reproduzidos

| Reportado | O que estava acontecendo | Causa |
|---|---|---|
| Cena "não falo chinês" só aceita digitar | `produce_reply` e o reparo de conversa renderizavam um `<textarea>` próprio | `FreeAnswerField` — o campo com microfone — morava dentro de `steps.tsx` e a cena não tinha como usá-lo |
| "Ouça a abertura" não tem o que ouvir | `audio_to_action` declara `audioText` e caía em `StepDialogueChoice`, que nunca toca áudio | roteamento: o kind auditivo estava no grupo dos diálogos |
| Retângulo claro em volta da árvore | o SVG traz o fundo da ilustração desenhado como caminho | traço VTracer: a placa de canvas virou parte do arquivo |

## P0 — voz em toda produção aberta

`FreeAnswerField` saiu de `steps.tsx` para `src/features/lesson/FreeAnswerField.tsx`
e passou a servir **todas** as telas de produção aberta:

| Superfície | antes | depois |
|---|---|---|
| `produce_reply` (cena) | textarea próprio, sem voz | campo compartilhado |
| reparo de conversa (`RepairBeatPanel`) | textarea próprio, sem voz | campo compartilhado |
| passo `write` | textarea próprio, sem voz | campo compartilhado |
| `free_production` / `transfer_task` / `reverse_recall` | já usava | inalterado |
| `dictation` | textarea próprio | **mantido de propósito**: ali transcrever É a tarefa |

Nenhum componente concorrente, nenhum motor STT novo. Continuam valendo o mesmo
reconhecimento (`recognizeOnce`, `zh-CN`), a mesma normalização e o mesmo
`evaluateLearnerResponse` para hànzì, pinyin e fala — uma resposta certa é certa
pelos três caminhos.

Os contratos que o campo carrega, todos já existentes e agora universais:

- a fala **propõe** quando já existe texto (`free-answer-transcript`), em vez de
  sobrescrever;
- nada é enviado sozinho a partir de uma transcrição;
- sem `SpeechRecognition`, o exercício continua inteiro por texto;
- permissão negada mostra um aviso curto, sem modal e sem beco sem saída;
- alvo de toque de 44 px e nome acessível ("Falar" / "Ouvindo… toque para parar").

Uma correção de produto saiu do E2E: `isRecognitionAvailable()` exigia apenas
que a chave existisse em `window`. Um navegador que expõe `SpeechRecognition`
com valor indefinido ganhava um microfone na tela que só sabia falhar ao ser
tocado. Agora o teste é pelo construtor.

## P1 — escuta que exige escuta

`audio_to_action` (35 passos) tem `audioText` em todos, opções em hànzì em
todos, e **zero** affordance de áudio: nem autoplay, nem repetição. A copy
dizia "Ouça e escolha a ação/imagem correspondente" numa tela com quatro botões
de texto.

- roteado para `StepListenSelect` — áudio grande, versão lenta, repetição livre,
  sem revelar o alvo, e ainda com o modo visual de fallback quando não há TTS;
- copy passou a "Ouça e toque no que você ouviu" (PT e EN nos dois overlays).

A auditoria repo-wide encontrou mais dois casos, e nenhum outro:

| Achado | Onde | Ação |
|---|---|---|
| `NO_AUDIO_AFFORDANCE` | `audio_to_action` (35 passos, 2 geradores + completion) | corrigido |
| `WRONG_RESPONSE_MODALITY` / `VAGUE_COPY` | mesma copy "ação/imagem" | corrigido |
| `TARGET_LEAK` | título "你好 de ouvido" numa tarefa de escuta (2 lições) | corrigido → "O cumprimento de ouvido" |
| `VAGUE_COPY` | objetivo de pass "Reconhecer … **por áudio/imagem**" com resposta em texto | corrigido (38 entradas de overlay) |
| `OK` | `listen_select`, `dictation`, `audio_discrimination`, `image_choice` (modo escuta), `map_direction` | já cumpriam |
| exceção | `p1-o-que-e-hanzi` mostra 你好 junto do som | registrada com motivo: a cápsula ensina que escrita e som são camadas da mesma coisa |

## P2 — "Conversa inteira" preservada

Auditada e protegida por gate, com as propriedades que a fizeram funcionar:

| propriedade | como está | garantido por |
|---|---|---|
| `contextualGoal` | `situationPt`: "Do início ao fim: cumprimente, responda que está bem e se despeça." | falha se a situação sumir |
| `multiItemRecall` | `你好，我很好，再见` — três estruturas | falha se a resposta deixar de juntar mais de uma |
| `productiveAnswer` | `reverse_recall` sem `options` | falha se virar múltipla escolha |
| `transfer` | `isNoHint`, banco de peças só como AJUDA | falha se a dica chegar pronta |
| `postAnswerModel` | modelo depois da resposta (`StepFreeProduction`) | falha se sair do renderer de produção |

Ela é referência, não template: a matriz do P4 continua mostrando percepção,
escuta, discriminação, recall, produção e conversa lado a lado.

## P3 — assets realmente transparentes

Auditados os **87** conceitos com `backgroundStyle: "transparent"` (37 SVG,
50 raster).

- **37 de 37 SVGs** tinham placa de fundo. As 20 primeiras com retângulo
  perfeito, as outras 17 com a borda superior orgânica — o mesmo fundo, formas
  diferentes. Total removido: **38 placas + 56 regiões** de fundo (o bloco
  branco entre as pernas do cavalo, o céu atrás do prédio, etc.).
- **50 de 50 rasters** já eram transparentes de verdade (alpha presente, cantos
  vazados). Nada a fazer.
- Nenhum CSS mascarando nada: a correção é no arquivo.

O que sai é decidido por um teste de silhueta: um caminho só é removido quando
tirá-lo **não muda os pixels do sujeito**. Fundo revela transparência; um brilho
do objeto revelaria a cor de baixo. Foi assim que o sol do céu (mesmo
verde-oliva do chão) e o cubo cinza do "pequeno" continuaram no lugar.

QA visual em `docs/screenshots/v495a1/`: as 37 ilustrações sobre fundo escuro e
sobre fundo claro, sem quadrado.

## Gates

| gate | o que passa a impedir |
|---|---|
| `validate:listening-affordance` (novo) | kind auditivo sem estímulo; renderer sem replay manual; alvo escrito na pergunta; copy prometendo imagem/ação com resposta em texto |
| `validate:modality-contract` (novo) | produção aberta sem o campo compartilhado; "Conversa inteira" virando escolha; gera `reports/modality-contract.md` |
| `validate:visual-assets` (estendido) | placa de canvas no SVG (qualquer cor cobrindo a tela, cor clara em faixa de borda) e raster "transparent" sem alpha ou com os 4 cantos opacos |
| `test:player-ux` (estendido) | microfone ausente do campo aberto; fala sobrescrevendo texto; cena com campo próprio |

A regra VIS-006 anterior conhecia quatro cores mint e não via nenhuma das 37
placas.

## Mutações

| # | Mutação | Resultado |
|---|---|---|
| 1 | remover o microfone do `produce_reply` | **morta** — `test:player-ux` |
| 2 | fazer a fala sobrescrever texto já digitado | **morta** — `test:player-ux` |
| 3 | quebrar a avaliação da resposta correta | **morta** — `test:learner-response` |
| 4 | remover o replay de um listening | **morta** — `validate:listening-affordance` |
| 4b | devolver `audio_to_action` ao renderer de diálogo | **morta** — `validate:listening-affordance` |
| 5 | mostrar o hànzì-alvo antes de uma questão auditiva | **morta** — `validate:listening-affordance` |
| 6 | copy "escolha a imagem" com resposta em texto | **morta** — `validate:listening-affordance` |
| 7 | `<rect>` opaco full-canvas em SVG transparent | **morta** — `validate:visual-assets` |
| 7b | faixa clara de largura inteira (o bug real) | **morta** — `validate:visual-assets` |
| 8 | raster transparent sem alpha | coberta pelo gate; não havia caso real para mutar no catálogo |
| extra | produção aberta sem o campo compartilhado | **morta** — `validate:modality-contract` |
| extra | "Conversa inteira" virando múltipla escolha | **morta** — `validate:modality-contract` |

Uma mutação **sobreviveu** na primeira tentativa e vale registrar: tirar
**apenas um** dos dois botões de áudio do `StepListenSelect` não derruba o gate
— e não deveria mesmo, porque o outro ainda dá repetição. Tirar os dois derruba.

## E2E

`e2e/v495a1-player-ux.spec.ts`, 10 cenários em Chromium (desktop e 390×844),
sobre o componente real montado em `/qa/conversation-scene` — a fixture usa o
passo da própria Jornada, não uma cópia:

1. cena de produção mostra campo e microfone · 2. hànzì digitado · 3. pinyin
digitado · 4. fala em `zh-CN` sem envio automático · 5. transcrição não apaga o
texto · 6. permissão negada mantém a tarefa digitável · 7. navegador sem speech
continua completo · 8. 390×844 com alvo de 44 px e sem sobreposição ·
9. nome acessível no botão de voz · 10. tarefa auditiva com repetição livre.

Os 6 cenários da V4.9.4 (`production-multimodal-input`) seguem passando.

## Contratos

| | |
|---|---|
| fingerprint antes | `e36445e08156` |
| fingerprint depois | `f08cf7574ac3` |

A Jornada mudou de propósito, e só nisto: dois títulos de exercício que
entregavam a resposta da própria tarefa de escuta (`foundationTopicPlans.ts` e
`topicMasteryBonus.ts`, ambos em `CURRICULUM_SOURCES`). Contratos regerados por
`npm run generate:backend-contracts`.

Nada de V4.9.6, nada de currículo novo, nada de Speech V5, nada de monetização.
