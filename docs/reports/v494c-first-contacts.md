# V4.9.4C — Primeiros contatos: o encontro inteiro

Remessa pedagógica. O objetivo era uma capacidade: *"eu consigo conhecer alguém
em mandarim e sustentar uma primeira conversa curta."*

## O que a auditoria encontrou

A Fase 0 mudou a remessa. **Quase tudo o que o enunciado propunha adicionar já
existia** — e adicionar de novo teria sido exatamente a duplicação que ele
proíbe.

| Conceito | Existe? | Onde é **ensinado** | Ação |
|---|---|---|---|
| 你好 · 早上好 | sim | l2, p1-o-que-e-pinyin | recall |
| 我叫 · 你叫什么？ | sim | l2, p1-primeira-conversa, l9, l9-qual-nome | recall |
| 你好吗 · 我很好 · 你呢？ | sim | l3, l9-tudo-bem | recall |
| 谢谢 · 没关系 | sim | l4, p1-qingwen-cortesia | recall |
| 再见 · 明天见 · 晚安 | sim | p1-ate-logo | recall |
| **你是哪国人？** | sim — chunk `nishinaiguoren` + cena `de-onde-sou` | **l10** | recall |
| **我是巴西人** | sim — chunk `wature` | **l9, l10** + 8 outras lições | recall |
| **认识你很高兴** | sim — chunk `renshinihengaoxing` | **l10, l12, l13, l30** | recall |
| **我也是** | só no léxico (`chunks.ts:188`) | **nenhuma lição** | **aquisição** |
| 中国 | sim — chunk `zhongguo` | — | não tocado |
| 国 · 也 · 巴 · 西 | sim — `characters.ts` | — | recall |

### As premissas que não se sustentaram

**P0.1 (lacuna de origem) está errada.** `你是哪国人？` e `我是巴西人` são
ensinados em l10, com cena dedicada (`de-onde-sou`), árvore de decisão e reparo
de erro. Não há lacuna de origem — há uma lacuna de *posição*: origem só chega
na posição 23 da Jornada, e o bloco de primeiros contatos termina na 13.

Isso confirma, aliás, que a Wave 2 acertou ao **excluir** origem do
`FIRST_CONTACTS_ARC`: naquele bloco ela de fato não existe.

**P0.2 (prazer em conhecer) está errada como aquisição.** `认识你很高兴` já é
ensinado em l10 e reaparece em l12, l13 e l30. A remessa sugeria a ordem
`很高兴认识你`; a canônica do curso é a outra, e ambas são corretas — adicionar
a variante criaria léxico redundante sem ganho comunicativo. Não foi adicionada.

### As lacunas reais

1. **`我也是` é órfão.** Está em `chunks.ts` e não é ensinado em lição nenhuma.
2. **Nenhuma cena encadeia nome + origem + cortesia num único encontro.** As
   peças existem separadas (l2, l9, l10); a sequência — que é o que a vida cobra
   — nunca era pedida.
3. **Quatro cenas estão órfãs**, definidas e nunca usadas:
   `revisao-cumprimento-completo` (justamente a intitulada "Primeira conversa
   completa"), `sala-de-aula`, `fale-de-novo`, `conversa-em-casa`. Registrado
   aqui; não corrigido nesta remessa.

## O que foi feito

### Novo léxico: 1 unidade

Só `我也是` — contra as 3–6 do orçamento da P1. Ele entra em l10, logo depois
de `认识你很高兴`, no ponto em que é mais útil: a resposta curta que devolve a
cortesia. `认识你很高兴 → 我也是` é a troca padrão de quem acabou de se
apresentar. Nenhum novo hànzì foi introduzido (P1.5).

Ordem audio-first preservada (P1.4): `listen` → `comp` (reconhecer sentido) →
`dialogue` (usar) → cena (produzir em contexto).

### Nova cena: `conhecer-alguem`

"Conhecendo alguém pela primeira vez" — 13 falas, 5 intervenções, papel
`module_review`.

O interlocutor é **Wang**, não Mei: quem treinou origem com Mei em l10 precisa
provar que reconhece a *função* da pergunta, não a posição dela num diálogo
decorado (P0.6). Toda intervenção errada volta ao nó anterior com a fala
repetida em `confused` — erro tratável, nenhum branch morto, nenhum nó
inalcançável.

Cobre os oito itens da métrica da P2: cumprimento, pergunta pelo nome, nome,
`你呢？`, país, resposta sobre si, cortesia, despedida.

`learnedRefs`: 11 chunks, todos já ensinados. `newRefs`: `chunk:woyeshi`.

### Produção sem andaime (P0.7)

Passo `write` no fim de l10: sem alternativas para eliminar, o aluno escreve a
apresentação inteira. `requiredTerms` cobra as duas funções (nome e origem) sem
exigir pontuação exata; `accepts` aceita as ordens que um falante usaria.

### Posição na Jornada

A cena mora em **l12**, não em l10. Duas razões, ambas do próprio currículo:
l10 já gasta sua única vaga de cena com `de-onde-sou`, que *ensina* origem (o
validador impõe no máximo uma cena por lição); e l12 é a lição que monta
`我 + 是 + 人`, exatamente as peças que este encontro põe em uso.

SRS: `chunk:woyeshi` entra em `libraryItems` e `reviewItems` de l10.

### Cobertura PT/EN

Nenhuma copy de interface nova foi criada — a cena usa os campos `pt` já
existentes do formato de cena e o conteúdo chinês é canônico. `validate:i18n` e
`test:i18n` passam.

## Hash da Jornada

| | |
|---|---|
| antes | `d6435e721702` |
| depois | `d47933a8c7dd` |

Regenerado por `npm run generate:backend-contracts` (nunca à mão). O diff dos
contratos contém **apenas** as duas linhas de fingerprint.

## Gate novo: learnedRefs precisa ser verdade

A mutação nº 1 do enunciado ("exigir antes de ensinar") **não morria**. Mover um
chunk de `newRefs` para `learnedRefs` e apagar a lição que o ensinava passava
por `validate:conversation-scenes`, `teach-before-test`, `lexical-progression` e
`conversation-vocabulary-srs` sem acordar nada. `learnedRefs` é uma afirmação —
"isto o aluno já sabe ao chegar aqui" — e ninguém conferia se era verdadeira.

A checagem nova percorre as lições em ordem acumulando o que foi declarado e
exige que cada `learnedRefs` de uma cena autoral tenha sido declarado até ali.

**Ela estreou encontrando 9 casos anteriores a esta remessa**, listados em
`KNOWN_DEBT` no validador:

| Lição / cena | Refs exigidos sem ensino |
|---|---|
| l11-falo-pouco / falar-de-estudo | char:na_which, char:li_inside, char:zai |
| l25 / onde-esta | chunk:nashirenm |
| l26b / pedir-cardapio | chunk:taiguile, chunk:la |
| p6-rotina-trabalho / rotina-e-trabalho | char:dian_point |
| p6-china-cidades-2 / no-aeroporto | char:zai, char:na_that, char:li_inside |
| p6-china-ruas / pegar-taxi | char:qu_go, char:na_which, char:li_inside |
| p6-saude / nao-me-sinto-bem | char:zai, char:na_that, char:li_inside |
| p6-clima / como-esta-o-tempo | char:tai_too |
| p6-survival-mandarin / checkin-hotel | char:de, char:zai, char:na_that, char:li_inside |

A lista existe para não travar a cadeia por dívida que não é desta remessa, sem
esconder a dívida e sem deixá-la crescer: caso **novo** falha, e entrada que
deixar de violar também falha, para a lista não apodrecer. Verifiquei as três
direções.

## Mutações

| # | Mutação | Resultado |
|---|---|---|
| 1 | Exigir `我也是` sem ensinar nem declarar | **morta** pelo gate novo |
| 2 | Remover uma fala da cena | **morta** — `validate:conversation-scenes` (3 nós inalcançáveis) |
| 3 | Branch inalcançável (nó órfão) | **morta** — `validate:conversation-scenes` |
| 4 | Tirar o vocabulário novo do SRS (só `reviewItems`) | **não morreu** — ver abaixo |
| 5 | Tornar a produção final guiada | não executada — ver abaixo |
| 6 | Duplicar cumprimento (`listen("你好")` extra) | **não morreu** — ver abaixo |
| 7 | Quebrar só a versão EN | **morta** — `test:i18n` |
| 8 | Alterar a Jornada sem atualizar o fingerprint | **morta** — os 4 gates de backend |

### O que não morreu, e por quê

**Mutação 4.** Remover o chunk só de `reviewItems`, mantendo-o em
`libraryItems`, não é pego. Removê-lo dos **dois** é a mutação 1, que morre.
Ou seja: a cobertura existe, mas a fronteira exata entre `libraryItems` e
`reviewItems` não é vigiada. Fica registrado, não foi "resolvido" com um gate
improvisado.

**Mutação 6.** Um `listen("你好")` a mais não é pego por `lesson-novelty` nem
por `lexical-progression` — e provavelmente não deveria ser: um passo de recall
é legítimo, e os gates não têm como distinguir recall de reensino olhando um
passo isolado. A mutação, como a escrevi, era fraca demais para o que pretendia
testar (duplicar uma *lição* inteira, não um passo).

**Mutação 5.** Não executada: a produção final é um passo `write` com
`requiredTerms`, e "torná-la completamente guiada" significaria trocá-la por
outro tipo de passo — o que testa o autor, não o portão.

## Gates executados

```
validate:corpus                        OK      validate:lexical-progression      OK
validate:lessons                       OK      validate:lesson-novelty           OK
validate:lesson-options                OK      validate:exercise-depth           OK
validate:teach-before-test             OK      test:cognitive-budget             OK
validate:teach-before-test:journey     OK      validate:transfer-integrity       OK
validate:conversation-scenes           OK      validate:early-transfer-ladder    OK
validate:conversation-vocabulary       OK      validate:first-communicative-win  OK
validate:conversation-vocabulary-srs   OK      validate:acquisition-momentum     OK
validate:conversation-loop             OK      validate:pedagogy-wave-one        OK
validate:conversation-pedagogy         OK      validate:i18n · test:i18n         OK
test:v478-hosted-gate                  OK      test:backend-contract             OK
test:v489-production-preflight         OK      validate:backend-ready            OK
```

## Métrica de sucesso (P2)

Ao fim de l12 o aluno faz um encontro de 8 turnos com cumprimento, nome,
pergunta pelo nome, `你呢？`, país, resposta sobre si, cortesia e despedida —
com **uma** unidade lexical nova em todo o percurso. É a definição de "maior
capacidade comunicativa por unidade de conteúdo".
