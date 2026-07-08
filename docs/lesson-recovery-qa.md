# QA interno: licao, erro, revisao imediata e recuperacao de 3 estrelas

Este roteiro valida se a revisao imediata usa somente erros da tentativa atual, se o exercicio de recuperacao corresponde ao erro real e se a terceira estrela so volta quando todos os erros da tentativa forem corrigidos na revisao.

## Regras invariantes

- Licao perfeita: finaliza com 3 estrelas.
- Licao com qualquer erro avaliativo: finaliza com no maximo 2 estrelas.
- Se a licao termina com erro, a revisao imediata aparece ao final.
- Se todos os erros da tentativa atual forem corrigidos na revisao imediata, `lessonStarsById[lessonId]` deve virar 3.
- Se qualquer item da revisao imediata for respondido errado, a licao permanece com 2 estrelas.
- Se o aluno sair sem revisar, a licao permanece com 2 estrelas.
- A proxima licao so libera quando a anterior tiver 3 estrelas.
- A revisao imediata nao pode puxar erro antigo aleatorio.
- A revisao imediata nao pode mostrar gabarito antes da resposta.
- Recompensas de conclusao, bau, missao, Qi e XP nao podem duplicar ao recuperar a terceira estrela.

## Helper em desenvolvimento

Em ambiente `npm run dev`, com uma licao aberta, use no console:

```js
window.__longyuLessonRecoveryQa.summary()
window.__longyuLessonRecoveryQa.scenarios
window.__longyuLessonRecoveryQa.snapshot()
```

O resumo esperado apos errar uma tentativa deve mostrar:

- `currentAttemptErrorCount` maior que 0.
- `remainingCurrentErrorCount` igual ao numero de erros ainda nao corrigidos.
- `duplicateRecentErrorKeys` vazio.
- `canRecoverThreeStarsNow` apenas quando todos os erros atuais tiverem sido corrigidos.

## Cenarios por tipo

### match_pairs

1. Erre um par especifico, por exemplo `木 -> pessoa`.
2. Termine a licao.
3. Abra a revisao imediata.

Esperado:

- O erro salvo contem `pairLeft: "木"`, resposta esperada `arvore / madeira`, resposta do aluno `pessoa` e pinyin `mù`.
- A revisao pergunta somente `O que significa 木?`.
- As opcoes incluem a resposta correta e o erro do aluno.
- A revisao nao mostra a tabela inteira de pares.

### sentence_build

1. Monte a frase com ordem errada.
2. Termine a licao e inicie a revisao.

Esperado:

- A revisao usa a mesma frase-alvo.
- As pecas aparecem novamente embaralhadas.
- A explicacao aparece somente depois da resposta.
- Um erro na revisao mantem 2 estrelas.

### translation_build

1. Monte a traducao errada.
2. Revise ao final.

Esperado:

- A revisao mantem o mesmo texto-fonte e o mesmo objetivo de traducao.
- A resposta final nao aparece preenchida antes da escolha das pecas.
- Acertar de primeira marca o erro como corrigido.

### fill_blank

1. Escolha um distrator na lacuna.
2. Revise ao final.

Esperado:

- A mesma lacuna, ou lacuna equivalente com o mesmo alvo, aparece.
- O item correto e os distratores sao opcoes curtas.
- O feedback mostra a frase correta so depois da resposta.

### dialogue_choice

1. Escolha uma resposta incorreta em dialogo.
2. Revise ao final.

Esperado:

- A revisao cobra a mesma decisao comunicativa.
- As opcoes incluem a resposta correta original.
- A explicacao aparece depois da resposta.

### listen_select

1. Escolha a opcao errada apos ouvir.
2. Revise ao final.

Esperado:

- A revisao toca novamente o audio.
- Hanzi, pinyin e resposta correta nao aparecem antes da escolha.
- O feedback revela a forma correta depois da resposta.

### tone

1. Escolha o tom errado.
2. Revise ao final.

Esperado:

- A revisao pergunta o mesmo tom.
- O pinyin com acento aparece somente no feedback.
- As opcoes sao tons, nao significados soltos.

### tone_pair

1. Erre um par de tom/audio.
2. Revise ao final.

Esperado:

- A revisao continua ligada ao mesmo item sonoro.
- Nao expor pinyin antes da resposta.
- Se o erro veio de pareamento, nao transformar em lista gigante.

### hanzi_build

1. Monte o hanzi errado.
2. Revise ao final.

Esperado:

- Se houver builder visual, revisar o mesmo caractere/componentes.
- Sem builder, usar montagem por pecas, reconhecimento ou significado do mesmo caractere.
- O alvo nao vira pergunta de significado aleatoria.

### recognize

1. Escolha significado errado para um caractere.
2. Revise ao final.

Esperado:

- A revisao mostra o mesmo caractere.
- A pergunta cobra o mesmo significado.
- Pinyin real pode aparecer no feedback, nao como substituto de traducao.

### decompose

O passo `decompose` atual e instrucional e nao gera erro avaliativo. Para virar cenario de recuperacao, primeiro e preciso criar uma variante avaliativa que chame `onMistake`.

### pinyin

1. Erre uma pergunta cujo objetivo seja pinyin/acento/tom.
2. Revise ao final.

Esperado:

- A revisao cobra pinyin do mesmo hanzi/item.
- Pinyin numerico nao aparece no modo normal.
- A resposta correta nao aparece antes da escolha.

## Persistencia

1. Termine uma licao com erro e escolha revisar depois.
2. Recarregue a pagina.
3. Volte para a licao ou para revisao de erros.

Esperado:

- A licao continua com 2 estrelas.
- O erro nao duplica em `recentActivityErrors`.
- Ao corrigir os erros da tentativa recuperavel, a licao sobe para 3 estrelas.
- A proxima licao passa a liberar depois de `lessonStarsById[lessonId] === 3`.
