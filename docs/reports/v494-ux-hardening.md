# V4.9.4 — UX hardening: ofensiva, Hanzi Builder e áudio

Remessa de UX + pedagogia + integração. Sem onda nova de conteúdo.

O objetivo declarado: **a dificuldade percebida deve vir do mandarim, não da
interface**. O que segue é o que a auditoria encontrou antes de mexer em
qualquer coisa — inclusive onde a suspeita da remessa estava certa, onde estava
incompleta, e onde o código já fazia a coisa certa e o problema era outro.

---

## P0.1 — Recuperar ofensiva estudando normalmente

### O que já funcionava

A lógica pura de recuperação existia e estava correta: `computeStudyStreak`
enxergava a janela aberta e devolvia `ofensiva anterior + 1`. A regra "estudar
recupera" não precisava ser inventada.

### Os dois defeitos reais

**1. Refazer uma lição concluída não contava como estudo.**
`completeLesson` chamava `recordStudyDay` dentro de `if (!wasComplete)`. Ou
seja: só a PRIMEIRA conclusão de cada lição contava. Quem voltava para revisar
o que já tinha feito — o comportamento mais comum de quem estuda todo dia —
não registrava dia de estudo nenhum, e portanto não recuperava. Este é,
provavelmente, o "ignorei o banner, fui estudar e não recuperou" do relato.

O efeito ia além da recuperação: a ofensiva diária inteira não subia nesse
caso. O anúncio social continua só na primeira vez; o registro de estudo saiu
do `if`.

**2. O sync ressuscitava uma janela já consumida.**
`pendingStreakRecovery: local ?? remote ?? null` e o merge de `streakRecovery`
tratavam "nulo" como "ausente". O aparelho que recuperava ficava com nulo, e
perdia para o valor antigo ainda guardado na nuvem: bastava sair e entrar na
conta para a janela voltar e a mesma ofensiva ser recuperada de novo.

A correção não é um `if` no merge — é um dado que faltava. `streakRecoveredOn`
marca o dia em que a recuperação foi consumida. Só avança, então sobrevive ao
merge e desempata: o lado que recuperou sempre vence.

### A mudança de regra que a remessa pediu

O caso 5 do enunciado ("responde somente uma pergunta → não recupera")
conflitava com o código: a Revisão chama `recordStudyDay` **a cada item
corrigido**, e a recuperação morava lá dentro. Responder uma pergunta devolvia
a ofensiva inteira.

A recuperação saiu de `computeStudyStreak` e virou `applyStreakRecovery`,
chamada só em evento de conclusão, por uma única ação de store
(`completeStudySession`) que atende as duas rotas — Jornada e Revisão. Não são
duas regras paralelas.

Consequência desenhada de propósito: quem responde uma pergunta e sai recomeça
em 1 **e a janela continua aberta** — ele ainda recupera se concluir depois no
mesmo dia. Se a janela fechasse ali, a regra puniria quem começou a estudar.

### O CTA

Deixou de ser uma porta única para `/revisao` e passou a dizer o que é preciso
fazer (`Conclua uma revisão ou uma atividade da Jornada`), com duas rotas:
`Fazer revisão` e `Continuar Jornada`. Dispensar o banner **não** fecha a
janela — quem toca em "Agora não" e vai estudar recupera igual. A confirmação
("Ofensiva recuperada!") é uma faixa curta, não outro modal: a recuperação
acontece na tela de conclusão, e um modal ali seria uma interrupção para dar
uma boa notícia.

A copy antiga prometia "faça um exercício agora e ela volta" — passou a ser
falsa com a nova regra, e foi corrigida nos dois idiomas.

---

## P0.2 — Remoção de peças no Hanzi Builder

### O que já funcionava (e não foi "consertado")

- A remoção existia: tocar na peça colocada a devolvia.
- O `aria-label` já dizia "devolver peça".
- **Peças repetidas já se comportavam corretamente.** 森 = 木 + 木 + 木 tem três
  peças de glifo idêntico com ids distintos, e a remoção é por identidade.
  Remover uma nunca removeu todas. Isso virou **teste**, não correção.
- Os alvos de toque das peças colocadas já tinham 48px.

### O que faltava

Discoverability, exatamente como o enunciado diagnosticou: nada na tela dizia
que dava para tirar. Foram adicionados:

- um **×** visível em cada peça colocada (`aria-hidden` — o botão já se anuncia);
- **Desfazer**, que tira a última peça (o gesto que o polegar quer, e que não
  tinha alvo);
- **Limpar** aparece com 2+ peças (com 1 peça, Desfazer já faz o mesmo);
- uma frase de orientação que some quando o aluno começa a montar;
- indicador de progresso — **"2 de 3 peças"** só quando a bandeja já entrega a
  conta (sem distratores). Com distratores, a quantidade de peças certas é o
  enigma, e anunciá-la transformaria o exercício em contagem: nesse caso
  mostra só quantas foram colocadas.

Limpar e Desfazer não contam erro nem custam vida.

---

## P0.3–P0.5 — Áudio antes da resposta

`SpeakButton` só era renderizado quando `status === "correct"`. O aluno tinha
de acertar o caractere para poder ouvi-lo — o oposto da ordem que o curso
ensina (som → significado → forma), e um castigo para quem não lembrava do som,
que é justamente quem precisa dele.

O botão passou a existir desde o começo do exercício, com uma decisão explícita
sobre revelação: **o caractere não é mostrado e o rótulo acessível também não o
contém** (`revealText={false}`). A pista é auditiva de propósito — ouvir 森 não
é o mesmo que saber montá-lo.

Dois problemas de robustez apareceram no caminho e foram corrigidos:

- **`isTTSAvailable()` usava `"speechSynthesis" in window`**, que responde "sim"
  para uma propriedade que existe valendo `undefined`. A fala seguia adiante e
  estourava ao chamar `.speak`. Agora a pergunta é "dá para falar?" (o objeto
  existe e `speak` é função), não "o nome está declarado?".
- **`speak()` colapsava `onerror` em `onend`**, então uma falha era silenciosa
  nos dois sentidos: nada tocava e nada era dito. `SpeakOptions` ganhou
  `onerror`, e o botão mostra "Não foi possível reproduzir o áudio. Toque para
  tentar novamente." `interrupted`/`canceled` não contam como falha — são fala
  trocada por outra.

Nenhum segundo motor de TTS foi criado: tudo passa pelo `SpeakButton` e pelo
`speak()` que já existiam. Autoplay continua opcional e respeitando o toggle
global; o botão manual existe sempre.

---

## Cobertura

**`validate:streak-recovery`** — os sete casos do enunciado sobre a lógica pura,
mais idempotência, expiração da janela e os quatro casos de merge local/nuvem.
Inclui asserções de **ligação**: a lógica pode estar perfeita e a ofensiva não
recuperar se ninguém chamar. Prendem `completeLesson`, a conclusão da Revisão,
o `recordStudyDay` fora do `if (!wasComplete)` e o uso de `mergeStreakRecovery`
no sync.

**`e2e/v494-builder-ux.spec.ts`** — 18 cenários no componente real, via a
fixture `/qa/hanzi-builder` (mesmo padrão da fixture de escuta pura já
existente; o laboratório de hànzì não é determinístico porque filtra builders
por pré-requisito, energia e progresso). Cobre os 12 casos de builder e os 8 de
áudio do enunciado. Nenhum cenário fica pulado.

**`e2e/mobile-device.spec.ts`** — dois cenários de toque real (`tap`) nos
projetos `mobile-chrome`/`mobile-safari`.

### Mutação

Todo portão novo foi verificado quebrando o código nas duas direções:

| Mutação | Morta por |
|---|---|
| Recuperação volta para `computeStudyStreak` | "registrar estudo sem concluir não deve restaurar" |
| Remove a trava `streakRecoveredOn` | "janela já consumida hoje não pode pagar de novo" |
| Merge volta ao `local ?? remote` | "sync não pode ressuscitar uma janela já consumida" |
| Merge zeloso demais (mata toda janela) | "janela não consumida deve sobreviver ao sync" |
| `recordStudyDay` volta para dentro do `if (!wasComplete)` | asserção de ligação |
| Revisão deixa de chamar `completeStudySession` | asserção de ligação |
| Remove o indicador × | e2e 3 |
| Remoção por glifo em vez de identidade | e2e 6 |
| Áudio volta a existir só após o acerto | e2e 14 |
| `revealText` volta a revelar o caractere | e2e 16 |

---

## Limites declarados

- **A legenda das peças cita o caractere-alvo.** A `rolePt` de 木 é "base de 林 e
  森", então quem monta 森 lê 森 na bandeja. É conteúdo anterior a esta remessa e
  não é o áudio vazando; está registrado no próprio teste 16, que mede o
  controle de áudio em vez de virar uma asserção ampla sobre autoria de
  componentes. Corrigir isso é decisão de conteúdo, não de UX.
- **Os casos 4 e 5 da ofensiva** (abrir e abandonar; responder uma pergunta) são
  provados pela ausência de chamada, não por um cenário de UI: nenhum dos dois
  caminhos chega a `applyStreakRecovery`, e o que a suíte prova é que sem janela
  aberta nada acontece e que registrar estudo sozinho não recupera.
- A recuperação de ofensiva não virou moeda, compra nem atividade especial, e o
  sistema de ofensiva não foi redesenhado — só a decisão de *quando* recuperar
  mudou de lugar.
