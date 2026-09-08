# Conversation coherence audit

Cenas: 47.

## primeiro-cumprimento

- intent: greet
- ending: 你好！
- last interaction: choose_meaning

### primeiro-cumprimento-3

- NPC_UTTERANCE: 你？
- MEANING: Você?
- PROMPT: Mei olha para você no pátio. Como você cumprimenta?
- EXPECTED_RESPONSE: 你好
- ACCEPTS: (none)
- NEXT_TURN: 好！
- REPAIR: 你好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### primeiro-cumprimento-6

- NPC_UTTERANCE: 好！
- MEANING: Bem!
- PROMPT: Neste cumprimento, o que 你好 quer dizer?
- EXPECTED_RESPONSE: Olá.
- ACCEPTS: (none)
- NEXT_TURN: 你好！
- REPAIR: 你好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## perguntando-se-esta-bem

- intent: ask-wellbeing
- ending: 我很好。
- last interaction: choose_meaning

### perguntando-se-esta-bem-3

- NPC_UTTERANCE: 你好吗？
- MEANING: Tudo bem?
- PROMPT: Mei pergunta de volta. Como você responde que está bem?
- EXPECTED_RESPONSE: 我很好
- ACCEPTS: (none)
- NEXT_TURN: 我很好。
- REPAIR: 我很好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### perguntando-se-esta-bem-6

- NPC_UTTERANCE: 我很好。
- MEANING: Estou bem.
- PROMPT: O que 我很好 comunica nesta conversa?
- EXPECTED_RESPONSE: Estou bem.
- ACCEPTS: (none)
- NEXT_TURN: 我很好。
- REPAIR: 你好吗？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## agradecendo

- intent: thank
- ending: 谢谢。
- last interaction: choose_meaning

### agradecendo-3

- NPC_UTTERANCE: 谢谢？
- MEANING: Obrigado(a)?
- PROMPT: Mei agradece no caixa. Qual resposta educada combina?
- EXPECTED_RESPONSE: 不客气
- ACCEPTS: (none)
- NEXT_TURN: 谢谢。
- REPAIR: 不客气？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### agradecendo-6

- NPC_UTTERANCE: 谢谢。
- MEANING: Obrigado(a).
- PROMPT: O que 谢谢 expressa?
- EXPECTED_RESPONSE: Obrigado(a).
- ACCEPTS: (none)
- NEXT_TURN: 谢谢。
- REPAIR: 谢谢？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## despedida

- intent: farewell
- ending: 再见。
- last interaction: choose_meaning

### despedida-3

- NPC_UTTERANCE: 再见？
- MEANING: Até logo?
- PROMPT: Mei precisa sair. Como você encerra a conversa?
- EXPECTED_RESPONSE: 再见
- ACCEPTS: (none)
- NEXT_TURN: 再见。
- REPAIR: 再见？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### despedida-6

- NPC_UTTERANCE: 再见。
- MEANING: Até logo.
- PROMPT: Qual é o sentido de 再见 na rua?
- EXPECTED_RESPONSE: Até logo.
- ACCEPTS: (none)
- NEXT_TURN: 再见。
- REPAIR: 再见？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## me-apresentando

- intent: introduce-self
- ending: 你好。
- last interaction: choose_meaning

### me-apresentando-3

- NPC_UTTERANCE: 你？
- MEANING: Você?
- PROMPT: Apresente-se para Mei: meu nome é Matheus.
- EXPECTED_RESPONSE: 我叫Matheus
- ACCEPTS: (none)
- NEXT_TURN: 你好，Matheus！
- REPAIR: 我叫Matheus？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### me-apresentando-6

- NPC_UTTERANCE: 你好，Matheus！
- MEANING: Olá, Matheus!
- PROMPT: O que 我叫Matheus comunica?
- EXPECTED_RESPONSE: Meu nome é Matheus.
- ACCEPTS: (none)
- NEXT_TURN: 你好。
- REPAIR: 我叫Matheus。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## revisao-cumprimento-completo

- intent: greet-review
- ending: 再见。
- last interaction: choose_reply

### revisao-cumprimento-completo-3

- NPC_UTTERANCE: 你好吗？
- MEANING: Tudo bem?
- PROMPT: Mei pergunta como você está. Responda positivamente.
- EXPECTED_RESPONSE: 我很好
- ACCEPTS: (none)
- NEXT_TURN: 我很好，谢谢。
- REPAIR: 我很好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### revisao-cumprimento-completo-6

- NPC_UTTERANCE: 我很好，谢谢。
- MEANING: Estou bem, obrigado(a).
- PROMPT: O que Mei disse com 我很好，谢谢?
- EXPECTED_RESPONSE: Estou bem, obrigado(a).
- ACCEPTS: (none)
- NEXT_TURN: 再见？
- REPAIR: 谢谢？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### revisao-cumprimento-completo-9

- NPC_UTTERANCE: 再见？
- MEANING: Até logo?
- PROMPT: A conversa terminou. Como você se despede?
- EXPECTED_RESPONSE: 再见
- ACCEPTS: (none)
- NEXT_TURN: 再见。
- REPAIR: 再见？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## pedir-repeticao

- intent: ask-repeat
- ending: 请再说一遍。
- last interaction: choose_meaning

### pedir-repeticao-2

- NPC_UTTERANCE: 我听不懂。
- MEANING: Não entendi.
- PROMPT: Mei não entendeu. O que ela pede com educação?
- EXPECTED_RESPONSE: 请再说一遍
- ACCEPTS: (none)
- NEXT_TURN: 你好吗？
- REPAIR: 请再说一遍？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### pedir-repeticao-7

- NPC_UTTERANCE: 我叫Matheus。
- MEANING: Meu nome é Matheus.
- PROMPT: Depois da repetição, o que Matheus acrescenta?
- EXPECTED_RESPONSE: Meu nome é Matheus.
- ACCEPTS: (none)
- NEXT_TURN: 请再说一遍。
- REPAIR: 我听不懂。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## cortesia-loja

- intent: polite-question
- ending: 你好！
- last interaction: choose_reply

### cortesia-loja-3

- NPC_UTTERANCE: 请问，你好吗？
- MEANING: Com licença, tudo bem?
- PROMPT: O que 请问，你好吗？ faz na loja?
- EXPECTED_RESPONSE: Pergunta tudo bem com cortesia.
- ACCEPTS: (none)
- NEXT_TURN: 你好吗？
- REPAIR: 请问，你好吗？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### cortesia-loja-6

- NPC_UTTERANCE: 你好吗？
- MEANING: Tudo bem?
- PROMPT: Mei pergunta de volta no balcão. Como você responde?
- EXPECTED_RESPONSE: 我很好
- ACCEPTS: (none)
- NEXT_TURN: 你好！
- REPAIR: 我很好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## de-onde-sou

- intent: ask-origin
- ending: 我是巴西人。
- last interaction: choose_reply

### de-onde-sou-3

- NPC_UTTERANCE: 你是哪国人？
- MEANING: De que país você é?
- PROMPT: O que Mei pergunta com 你是哪国人？
- EXPECTED_RESPONSE: De que país você é?
- ACCEPTS: (none)
- NEXT_TURN: 你是哪国人？
- REPAIR: 你是哪国人？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### de-onde-sou-6

- NPC_UTTERANCE: 你是哪国人？
- MEANING: De que país você é?
- PROMPT: Agora Matheus pergunta a Mei. Como Mei responde que é brasileira?
- EXPECTED_RESPONSE: 我是巴西人
- ACCEPTS: (none)
- NEXT_TURN: 我是巴西人。
- REPAIR: 我是巴西人？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## conhecer-alguem

- intent: meet-someone
- ending: 再见！
- last interaction: choose_reply

### conhecer-alguem-3

- NPC_UTTERANCE: 你叫什么？
- MEANING: Como você se chama?
- PROMPT: Wang acabou de dizer o nome dele e pergunta o seu. Como você responde?
- EXPECTED_RESPONSE: 我叫Matheus
- ACCEPTS: (none)
- NEXT_TURN: 你好吗？
- REPAIR: 你叫什么？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### conhecer-alguem-6

- NPC_UTTERANCE: 你好吗？
- MEANING: Tudo bem?
- PROMPT: Responda que está bem E devolva a pergunta para Wang.
- EXPECTED_RESPONSE: 我很好，你呢？
- ACCEPTS: (none)
- NEXT_TURN: 我很好，谢谢。
- REPAIR: 你好吗？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### conhecer-alguem-10

- NPC_UTTERANCE: 你是哪国人？
- MEANING: De que país você é?
- PROMPT: Wang quer saber de onde você é.
- EXPECTED_RESPONSE: 我是巴西人
- ACCEPTS: (none)
- NEXT_TURN: 认识你很高兴。
- REPAIR: 你是哪国人？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### conhecer-alguem-13

- NPC_UTTERANCE: 认识你很高兴。
- MEANING: Prazer em conhecer você.
- PROMPT: Wang diz que é um prazer conhecer você. Como você diz que sente o mesmo?
- EXPECTED_RESPONSE: 我也是
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 认识你很高兴。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### conhecer-alguem-16

- NPC_UTTERANCE: 再见！
- MEANING: Até logo!
- PROMPT: O encontro terminou. Como você se despede?
- EXPECTED_RESPONSE: 再见
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 再见？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## nao-entendi-reparo

- intent: repair-not-understood
- ending: 请再说一遍。
- last interaction: choose_meaning

### nao-entendi-reparo-3

- NPC_UTTERANCE: 我听不懂。
- MEANING: Não entendi.
- PROMPT: Matheus não entendeu no parque. O que ele pede para reparar a conversa?
- EXPECTED_RESPONSE: 请再说一遍
- ACCEPTS: (none)
- NEXT_TURN: 你好吗？
- REPAIR: 请再说一遍？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### nao-entendi-reparo-7

- NPC_UTTERANCE: 我不会说中文。
- MEANING: Não sei falar chinês.
- PROMPT: O que Matheus esclarece com 我不会说中文?
- EXPECTED_RESPONSE: Não sei falar chinês.
- ACCEPTS: (none)
- NEXT_TURN: 请再说一遍。
- REPAIR: 我不会说中文？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### nao-entendi-reparo-9

- NPC_UTTERANCE: 请再说一遍。
- MEANING: Por favor, fale de novo.
- PROMPT: Qual frase pede para a outra pessoa repetir?
- EXPECTED_RESPONSE: Por favor, fale de novo.
- ACCEPTS: (none)
- NEXT_TURN: 请再说一遍。
- REPAIR: 我听不懂。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## nao-falo-chinês

- intent: cannot-speak
- ending: 你好！
- last interaction: choose_reply

### nao-falo-chinês-3

- NPC_UTTERANCE: 我不会说中文。
- MEANING: Não sei falar chinês.
- PROMPT: O que Matheus comunica com 我不会说中文?
- EXPECTED_RESPONSE: Não sei falar chinês.
- ACCEPTS: (none)
- NEXT_TURN: 我不会说中文。
- REPAIR: 我不会说中文？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### nao-falo-chinês-5

- NPC_UTTERANCE: 你好吗？
- MEANING: Tudo bem?
- PROMPT: A conversa ainda está difícil. Qual frase protege seu limite?
- EXPECTED_RESPONSE: 我不会说中文
- ACCEPTS: (none)
- NEXT_TURN: 你好！
- REPAIR: 我不会说中文？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## como-se-chama

- intent: ask-name
- ending: 你好，Matheus！
- last interaction: order_reply

### como-se-chama-3

- NPC_UTTERANCE: 我叫Matheus。
- MEANING: Meu nome é Matheus.
- PROMPT: O que Matheus responde com 我叫Matheus?
- EXPECTED_RESPONSE: Meu nome é Matheus.
- ACCEPTS: (none)
- NEXT_TURN: 我叫Matheus。
- REPAIR: 我叫Matheus？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### como-se-chama-5

- NPC_UTTERANCE: 你叫什么？
- MEANING: Como você se chama?
- PROMPT: Responda à pergunta com o nome Matheus.
- EXPECTED_RESPONSE: 我叫Matheus
- ACCEPTS: (none)
- NEXT_TURN: 你好，Matheus！
- REPAIR: 你叫什么？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## pedir-agua

- intent: ask-water
- ending: 再见！
- last interaction: choose_reply

### agua-3

- NPC_UTTERANCE: 你好！
- MEANING: Olá! Pode pedir.
- PROMPT: Peça água: eu quero água.
- EXPECTED_RESPONSE: 我要水
- ACCEPTS: (none)
- NEXT_TURN: 水。
- REPAIR: 请再说一遍。我要这个？水？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### agua-6

- NPC_UTTERANCE: 水。
- MEANING: Aqui está a água.
- PROMPT: Wang te entrega a água. O que você diz?
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 不客气！再见！
- REPAIR: 请再说一遍。谢谢？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### agua-9

- NPC_UTTERANCE: 不客气！再见！
- MEANING: De nada! Até logo!
- PROMPT: Responda à despedida.
- EXPECTED_RESPONSE: 再见
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 请再说一遍。再见？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## pedir-cha

- intent: ask-tea
- ending: 不客气！
- last interaction: choose_meaning

### cha-3

- NPC_UTTERANCE: 你想喝茶吗？
- MEANING: Você quer beber chá?
- PROMPT: Responda: quero beber chá.
- EXPECTED_RESPONSE: 我想喝茶
- ACCEPTS: (none)
- NEXT_TURN: 这是什么？
- REPAIR: 什么？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### cha-6

- NPC_UTTERANCE: 这是什么？
- MEANING: O que é isto?
- PROMPT: O que Mei perguntou ao mostrar a xícara?
- EXPECTED_RESPONSE: O que é isto?
- ACCEPTS: (none)
- NEXT_TURN: 不客气！
- REPAIR: 这是什么？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## perguntar-quantidade

- intent: ask-quantity
- ending: 不客气！
- last interaction: choose_reply

### qtd-3

- NPC_UTTERANCE: 三？
- MEANING: Três?
- PROMPT: Você quer três. Como responde?
- EXPECTED_RESPONSE: 我要三
- ACCEPTS: (none)
- NEXT_TURN: 多少钱？
- REPAIR: 什么？三？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### qtd-6

- NPC_UTTERANCE: 多少钱？
- MEANING: Quanto custa?
- PROMPT: O que Matheus perguntou?
- EXPECTED_RESPONSE: Quanto custa?
- ACCEPTS: (none)
- NEXT_TURN: 太贵了。谢谢。
- REPAIR: 多少钱？三？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### qtd-8

- NPC_UTTERANCE: 三。
- MEANING: Três.
- PROMPT: Você achou caro. Como reage?
- EXPECTED_RESPONSE: 太贵了
- ACCEPTS: (none)
- NEXT_TURN: 不客气！
- REPAIR: 什么？太贵了？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## identificar-pessoa

- intent: identify-person
- ending: 谢谢！
- last interaction: produce_reply

### pessoa-1

- NPC_UTTERANCE: 你好！你是学生吗？
- MEANING: Olá! Você é estudante?
- PROMPT: Você é estudante. Responda e devolva a pergunta.
- EXPECTED_RESPONSE: 我是学生。你呢？
- ACCEPTS: 我是学生。你呢？ | 是，我是学生。你呢？
- NEXT_TURN: 我也是。这是你妈妈吗？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT

### pessoa-2

- NPC_UTTERANCE: 我也是。这是你妈妈吗？
- MEANING: Eu também. Esta é sua mãe?
- PROMPT: Mei aponta para sua mãe na foto. Apresente sua mãe.
- EXPECTED_RESPONSE: 这是我妈妈。
- ACCEPTS: 这是我妈妈。 | 是，这是我妈妈。
- NEXT_TURN: 你妈妈好吗？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR

### pessoa-3

- NPC_UTTERANCE: 你妈妈好吗？
- MEANING: Sua mãe está bem?
- PROMPT: Sua mãe está bem. Responda falando dela, sem repetir a relação familiar.
- EXPECTED_RESPONSE: 她很好。
- ACCEPTS: 她很好。
- NEXT_TURN: 这是你朋友吗？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### pessoa-4

- NPC_UTTERANCE: 这是你朋友吗？
- MEANING: Este é seu amigo?
- PROMPT: Em outra foto está Wang, seu amigo. Apresente seu amigo.
- EXPECTED_RESPONSE: 这是我朋友。
- ACCEPTS: 这是我朋友。
- NEXT_TURN: 他是学生吗？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### pessoa-5

- NPC_UTTERANCE: 他是学生吗？
- MEANING: Ele é estudante?
- PROMPT: Wang é estudante. Responda falando dele, sem repetir o nome.
- EXPECTED_RESPONSE: 他是学生。
- ACCEPTS: 他是学生。 | 是，他是学生。
- NEXT_TURN: 谢谢！
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR

## encontrar-amigo

- intent: meet-friend
- ending: 很好！我们走吧！
- last interaction: choose_reply

### amigo-3

- NPC_UTTERANCE: 我很好！
- MEANING: Estou bem!
- PROMPT: Como Matheus está?
- EXPECTED_RESPONSE: Estou bem.
- ACCEPTS: (none)
- NEXT_TURN: 朋友！
- REPAIR: 我很好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### amigo-6

- NPC_UTTERANCE: 朋友！
- MEANING: Amigo!
- PROMPT: Convide Mei para irem juntos.
- EXPECTED_RESPONSE: 我们走吧
- ACCEPTS: (none)
- NEXT_TURN: 很好！我们走吧！
- REPAIR: 什么？我们走吧？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## onde-esta

- intent: ask-where
- ending: 不客气！
- last interaction: choose_meaning

### onde-3

- NPC_UTTERANCE: 山？
- MEANING: A montanha?
- PROMPT: Pergunte onde fica a montanha.
- EXPECTED_RESPONSE: 山在哪里？
- ACCEPTS: (none)
- NEXT_TURN: 那是人吗？
- REPAIR: 请问，山在哪里？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### onde-6

- NPC_UTTERANCE: 那是人吗？
- MEANING: Aquilo é uma pessoa?
- PROMPT: O que Matheus perguntou ao olhar para a trilha?
- EXPECTED_RESPONSE: Aquilo é uma pessoa?
- ACCEPTS: (none)
- NEXT_TURN: 谢谢！
- REPAIR: 那是人吗？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## apontar-natureza

- intent: point-nature
- ending: 那是月。
- last interaction: choose_reply

### natureza-2

- NPC_UTTERANCE: 这是什么？
- MEANING: O que é isto?
- PROMPT: Responda que isto é 木.
- EXPECTED_RESPONSE: 这是木
- ACCEPTS: (none)
- NEXT_TURN: 那是日吗？
- REPAIR: 不是。木。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### natureza-5

- NPC_UTTERANCE: 那是日吗？
- MEANING: Aquilo é o sol?
- PROMPT: O que Mei perguntou?
- EXPECTED_RESPONSE: Aquilo é o sol?
- ACCEPTS: (none)
- NEXT_TURN: 月？
- REPAIR: 日，不是月。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### natureza-8

- NPC_UTTERANCE: 月？
- MEANING: Lua?
- PROMPT: Agora aponte para a lua.
- EXPECTED_RESPONSE: 那是月
- ACCEPTS: (none)
- NEXT_TURN: 那是月。
- REPAIR: 不是。月。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## sala-de-aula

- intent: classroom-intro
- ending: 谢谢！
- last interaction: produce_reply

### aula-1

- NPC_UTTERANCE: 你好！你叫什么？
- MEANING: Olá! Como você se chama?
- PROMPT: Nesta conversa, você é Lin. Responda com seu nome.
- EXPECTED_RESPONSE: 我叫Lin。
- ACCEPTS: 我叫Lin。
- NEXT_TURN: 你是哪国人？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### aula-2

- NPC_UTTERANCE: 你是哪国人？
- MEANING: De que país você é?
- PROMPT: Você é brasileiro. Responda e devolva a pergunta.
- EXPECTED_RESPONSE: 我是巴西人。你呢？
- ACCEPTS: 我是巴西人。你呢？
- NEXT_TURN: 我是中国人。你是学生吗？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, ANSWER_TOO_NARROW

### aula-3

- NPC_UTTERANCE: 我是中国人。你是学生吗？
- MEANING: Sou chinês. Você é estudante?
- PROMPT: Você é estudante. Responda à pergunta.
- EXPECTED_RESPONSE: 我是学生。
- ACCEPTS: 我是学生。 | 是，我是学生。
- NEXT_TURN: 我也是。你学习什么？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT

### aula-4

- NPC_UTTERANCE: 我也是。你学习什么？
- MEANING: Eu também. O que você estuda?
- PROMPT: Diga que você estuda chinês.
- EXPECTED_RESPONSE: 我学习中文。
- ACCEPTS: 我学习中文。 | 我在学中文。
- NEXT_TURN: 认识你很高兴。
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR

### aula-5

- NPC_UTTERANCE: 认识你很高兴。
- MEANING: Prazer em conhecer você.
- PROMPT: Diga que o prazer é recíproco.
- EXPECTED_RESPONSE: 我也是。
- ACCEPTS: 我也是。
- NEXT_TURN: 谢谢！
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, ANSWER_TOO_NARROW

## pedir-ajuda

- intent: ask-help
- ending: 不客气！
- last interaction: choose_reply

### ajuda-3

- NPC_UTTERANCE: 我听不懂。
- MEANING: Não entendi.
- PROMPT: O que Matheus disse?
- EXPECTED_RESPONSE: Não entendi.
- ACCEPTS: (none)
- NEXT_TURN: 我会说一点中文。
- REPAIR: 我听不懂？请问？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### ajuda-6

- NPC_UTTERANCE: 我会说一点中文。
- MEANING: Eu falo um pouco de chinês.
- PROMPT: Mei vai te ajudar. O que você diz?
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 不客气！
- REPAIR: 什么？谢谢？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## fale-de-novo

- intent: ask-slow-repeat
- ending: 我很好。
- last interaction: choose_reply

### devagar-2

- NPC_UTTERANCE: 我会说一点中文。
- MEANING: Eu falo um pouco de chinês.
- PROMPT: Peça para o professor falar de novo.
- EXPECTED_RESPONSE: 请再说一遍
- ACCEPTS: (none)
- NEXT_TURN: 你叫什么？
- REPAIR: 请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: GENERIC_REPAIR, QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### devagar-5

- NPC_UTTERANCE: 你叫什么？
- MEANING: Como você se chama?
- PROMPT: Agora responda com seu nome: meu nome é Matheus.
- EXPECTED_RESPONSE: 我叫Matheus
- ACCEPTS: (none)
- NEXT_TURN: 很好！
- REPAIR: 请再说一遍。我叫Matheus？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### devagar-8

- NPC_UTTERANCE: 很好！
- MEANING: Muito bem!
- PROMPT: Diga que você está bem.
- EXPECTED_RESPONSE: 我很好
- ACCEPTS: (none)
- NEXT_TURN: 我很好。
- REPAIR: 我很好？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## encontro-amanha

- intent: plan-tomorrow
- ending: 明天见！
- last interaction: produce_reply

### amanha-1

- NPC_UTTERANCE: 你好！
- MEANING: Olá!
- PROMPT: Mei cumprimenta você na rua. Responda ao olá.
- EXPECTED_RESPONSE: 你好
- ACCEPTS: 你好 | 你好。 | 你好！
- NEXT_TURN: 好。
- REPAIR: 你好？
- speechAct: greet → greet (reask)
- CLASS: OK

### amanha-2

- NPC_UTTERANCE: 明天见？
- MEANING: Até amanhã?
- PROMPT: Mei confirma o encontro. Combine o plano de amanhã.
- EXPECTED_RESPONSE: 明天见
- ACCEPTS: 明天见 | 明天见。 | 明天见！
- NEXT_TURN: 好！明天见。
- REPAIR: 明天见？
- speechAct: confirm_plan → confirm_plan (reask)
- CLASS: OK

### amanha-3

- NPC_UTTERANCE: 再见！
- MEANING: Até logo!
- PROMPT: O plano está combinado. Despeça-se agora.
- EXPECTED_RESPONSE: 再见
- ACCEPTS: 再见 | 再见。 | 再见！
- NEXT_TURN: 明天见！
- REPAIR: 再见？
- speechAct: farewell → farewell (reask)
- CLASS: OK

## o-que-e-isto

- intent: ask-what-object
- ending: 谢谢！
- last interaction: choose_reply

### isto-3

- NPC_UTTERANCE: 这是什么？
- MEANING: O que é isto?
- PROMPT: O que Matheus perguntou?
- EXPECTED_RESPONSE: O que é isto?
- ACCEPTS: (none)
- NEXT_TURN: 我想喝茶。
- REPAIR: 这是什么？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### isto-6

- NPC_UTTERANCE: 我想喝茶。
- MEANING: Quero beber chá.
- PROMPT: Você quer chá, não água. Como diz isso?
- EXPECTED_RESPONSE: 我想喝茶
- ACCEPTS: (none)
- NEXT_TURN: 谢谢！
- REPAIR: 这是水。茶？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## conversa-em-casa

- intent: home-chat
- ending: 很好！
- last interaction: choose_meaning

### casa-2

- NPC_UTTERANCE: 我很好。
- MEANING: Estou bem.
- PROMPT: Devolva a pergunta: e você?
- EXPECTED_RESPONSE: 你呢？
- ACCEPTS: (none)
- NEXT_TURN: 我很好。
- REPAIR: 你呢？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### casa-5

- NPC_UTTERANCE: 我很好。
- MEANING: Estou bem.
- PROMPT: O que 你呢 fez na conversa?
- EXPECTED_RESPONSE: Devolveu a pergunta: e você?
- ACCEPTS: (none)
- NEXT_TURN: 很好！
- REPAIR: 你呢？我很好。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## conversa-na-loja

- intent: shop-chat
- ending: 不客气！再见！
- last interaction: choose_reply

### loja-3

- NPC_UTTERANCE: 这是什么？
- MEANING: O que é isto?
- PROMPT: O que Wang perguntou sobre o item?
- EXPECTED_RESPONSE: O que é isto?
- ACCEPTS: (none)
- NEXT_TURN: 不贵。
- REPAIR: 这是什么？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### loja-5

- NPC_UTTERANCE: 多少钱？
- MEANING: Quanto custa?
- PROMPT: O que Matheus perguntou?
- EXPECTED_RESPONSE: Quanto custa?
- ACCEPTS: (none)
- NEXT_TURN: 太贵了？
- REPAIR: 多少钱？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### loja-8

- NPC_UTTERANCE: 太贵了？
- MEANING: Caro demais?
- PROMPT: Se ainda achou caro, como diz isso?
- EXPECTED_RESPONSE: 太贵了
- ACCEPTS: (none)
- NEXT_TURN: 不客气！再见！
- REPAIR: 太贵了？
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## comprar-itens

- intent: buy-items
- ending: 谢谢！再见！
- last interaction: choose_meaning

### comprar-2

- NPC_UTTERANCE: 我很好！请问，我想喝茶。
- MEANING: Estou bem! Com licença, eu quero beber chá.
- PROMPT: O que Matheus disse que quer?
- EXPECTED_RESPONSE: Beber chá.
- ACCEPTS: (none)
- NEXT_TURN: 太贵了！
- REPAIR: 请再说一遍：茶。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### comprar-5

- NPC_UTTERANCE: 太贵了！
- MEANING: Caro demais!
- PROMPT: Wang fez preço alto. Qual frase abre uma negociação?
- EXPECTED_RESPONSE: 太贵了
- ACCEPTS: (none)
- NEXT_TURN: 我要这个。
- REPAIR: 不是。贵，太贵了。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### comprar-8

- NPC_UTTERANCE: 我要这个。
- MEANING: Eu quero este.
- PROMPT: Monte: eu quero este.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: (none)
- NEXT_TURN: 不，我要这个。
- REPAIR: 请再说一遍：我要这个。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### comprar-11

- NPC_UTTERANCE: 不，我要这个。
- MEANING: Não, eu quero este.
- PROMPT: Matheus aceitou três itens?
- EXPECTED_RESPONSE: Não, ele quer este.
- ACCEPTS: (none)
- NEXT_TURN: 谢谢！再见！
- REPAIR: 不，三？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## revisao-restaurante

- intent: restaurant-review
- ending: 谢谢！再见！
- last interaction: choose_meaning

### rest-2

- NPC_UTTERANCE: 你好！
- MEANING: Olá! O que você quer?
- PROMPT: Peça apontando para o prato.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: (none)
- NEXT_TURN: 我想喝茶。
- REPAIR: 请再说一遍：我要这个。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### rest-4

- NPC_UTTERANCE: 好！你想喝茶吗？
- MEANING: Está bem! Quer beber chá?
- PROMPT: Aceite o chá.
- EXPECTED_RESPONSE: 我想喝茶
- ACCEPTS: (none)
- NEXT_TURN: 好吃吗？
- REPAIR: 茶。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### rest-7

- NPC_UTTERANCE: 很好吃！
- MEANING: Muito gostoso!
- PROMPT: O que Matheus achou da comida?
- EXPECTED_RESPONSE: Muito gostosa.
- ACCEPTS: (none)
- NEXT_TURN: 十。
- REPAIR: 好吃，很好吃。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### rest-10

- NPC_UTTERANCE: 十。
- MEANING: Dez.
- PROMPT: Qual foi o preço?
- EXPECTED_RESPONSE: Dez.
- ACCEPTS: (none)
- NEXT_TURN: 谢谢！再见！
- REPAIR: 十。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## revisao-numeros

- intent: numbers-review
- ending: 很好！
- last interaction: choose_reply

### num-2

- NPC_UTTERANCE: 四，五，六。
- MEANING: Quatro, cinco, seis.
- PROMPT: Qual número vem depois de 六?
- EXPECTED_RESPONSE: 七
- ACCEPTS: (none)
- NEXT_TURN: 七，八，九，十。
- REPAIR: 不是。六，七。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### num-4

- NPC_UTTERANCE: 七，八，九，十！
- MEANING: Sete, oito, nove, dez!
- PROMPT: Que sequência o professor completou?
- EXPECTED_RESPONSE: 7, 8, 9, 10
- ACCEPTS: (none)
- NEXT_TURN: 你有三个朋友吗？
- REPAIR: 七，八，九，十。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### num-6

- NPC_UTTERANCE: 你有三个朋友吗？
- MEANING: Você tem três amigos?
- PROMPT: Responda: tenho três amigos.
- EXPECTED_RESPONSE: 我有三个朋友
- ACCEPTS: (none)
- NEXT_TURN: 三个朋友，很好！
- REPAIR: 三，朋友。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### num-9

- NPC_UTTERANCE: 很好！你好吗？
- MEANING: Muito bem! Tudo bem?
- PROMPT: Responda que você está bem.
- EXPECTED_RESPONSE: 我很好
- ACCEPTS: (none)
- NEXT_TURN: 很好！
- REPAIR: 你好吗？我很好。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## revisao-hanzi-natureza

- intent: hanzi-nature-review
- ending: 很好！
- last interaction: choose_reply

### hanzi-3

- NPC_UTTERANCE: 这是木。
- MEANING: Isto é madeira/árvore.
- PROMPT: Duas árvores 木 + 木 formam qual caractere?
- EXPECTED_RESPONSE: 林
- ACCEPTS: (none)
- NEXT_TURN: 林，很好！
- REPAIR: 不是。木，木，林。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### hanzi-6

- NPC_UTTERANCE: 三木是什么？
- MEANING: Três árvores formam o quê?
- PROMPT: Três 木 formam qual caractere?
- EXPECTED_RESPONSE: 森
- ACCEPTS: (none)
- NEXT_TURN: 这是山吗？
- REPAIR: 木，木，木，森。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### hanzi-9

- NPC_UTTERANCE: 这是山吗？
- MEANING: Isto é uma montanha?
- PROMPT: O que Mei perguntou?
- EXPECTED_RESPONSE: Se isto é uma montanha.
- ACCEPTS: (none)
- NEXT_TURN: 很好！
- REPAIR: 山。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### hanzi-11

- NPC_UTTERANCE: 日，月，明。
- MEANING: Sol, lua, claro.
- PROMPT: 日 + 月 formam qual caractere?
- EXPECTED_RESPONSE: 明
- ACCEPTS: (none)
- NEXT_TURN: 很好！
- REPAIR: 日，月，明。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## imersao-mercado

- intent: immersion-market
- ending: 不客气！再见！
- last interaction: choose_reply

### mercado-2

- NPC_UTTERANCE: 我很好！请问，我想喝茶。
- MEANING: Estou bem! Com licença, quero beber chá.
- PROMPT: O que Matheus procura no mercado?
- EXPECTED_RESPONSE: Chá.
- ACCEPTS: (none)
- NEXT_TURN: 好，三。
- REPAIR: 茶。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### mercado-4

- NPC_UTTERANCE: 有！你要三吗？
- MEANING: Tem! Você quer três?
- PROMPT: Você quer três unidades.
- EXPECTED_RESPONSE: 我要三
- ACCEPTS: (none)
- NEXT_TURN: 好，三。
- REPAIR: 三。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### mercado-7

- NPC_UTTERANCE: 多少钱？
- MEANING: Quanto custa?
- PROMPT: O que Matheus perguntou?
- EXPECTED_RESPONSE: O preço.
- ACCEPTS: (none)
- NEXT_TURN: 好，好！不贵。
- REPAIR: 多少钱，钱。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### mercado-9

- NPC_UTTERANCE: 十。
- MEANING: Dez.
- PROMPT: Escolha uma estratégia: negociar ou pagar cheio.
- EXPECTED_RESPONSE: 太贵了
- ACCEPTS: (none)
- NEXT_TURN: 太好了！
- REPAIR: 好，十。谢谢！
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### mercado-12

- NPC_UTTERANCE: 我要这个。
- MEANING: Eu quero este.
- PROMPT: Monte a compra: eu quero este.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: (none)
- NEXT_TURN: 谢谢！
- REPAIR: 请再说一遍：我要这个。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### mercado-14

- NPC_UTTERANCE: 好！
- MEANING: Fechado!
- PROMPT: Agradeça antes de sair.
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 谢谢。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## imersao-estacao

- intent: immersion-station
- ending: 再见！
- last interaction: choose_reply

### estacao-1

- NPC_UTTERANCE: 请问，火车站在哪里？
- MEANING: Com licença, onde fica a estação de trem?
- PROMPT: O que Matheus está procurando?
- EXPECTED_RESPONSE: A estação de trem.
- ACCEPTS: (none)
- NEXT_TURN: 好，谢谢！
- REPAIR: 火车站。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### estacao-3

- NPC_UTTERANCE: 那是火车站。在那里。
- MEANING: Aquilo é a estação de trem. Fica ali.
- PROMPT: O que Wang respondeu?
- EXPECTED_RESPONSE: Fica ali.
- ACCEPTS: (none)
- NEXT_TURN: 不客气。
- REPAIR: 那是人吗？不！在那里。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### estacao-7

- NPC_UTTERANCE: 请问，票多少钱？
- MEANING: Com licença, quanto custa a passagem?
- PROMPT: Agora Matheus pergunta sobre o quê?
- EXPECTED_RESPONSE: O preço da passagem.
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 票，多少钱。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### estacao-10

- NPC_UTTERANCE: 我要这个。
- MEANING: Eu quero este.
- PROMPT: Compre apontando: eu quero este.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: (none)
- NEXT_TURN: 好，等一下。
- REPAIR: 请再说一遍：我要这个。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### estacao-12

- NPC_UTTERANCE: 好，等一下。
- MEANING: Está bem, espere um pouco.
- PROMPT: O que Wang pediu?
- EXPECTED_RESPONSE: Espere um pouco.
- ACCEPTS: (none)
- NEXT_TURN: 票。
- REPAIR: 等一下。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### estacao-14

- NPC_UTTERANCE: 票。
- MEANING: A passagem.
- PROMPT: Receba a passagem com educação; ou saia sem agradecer.
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 不客气！再见！
- REPAIR: 再见。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## imersao-casa-amigo

- intent: immersion-visit
- ending: 再见！
- last interaction: choose_reply

### visita-3

- NPC_UTTERANCE: 这是我妈妈。
- MEANING: Esta é minha mãe.
- PROMPT: Cumprimente a mãe de Mei com uma frase natural.
- EXPECTED_RESPONSE: 认识你很高兴
- ACCEPTS: (none)
- NEXT_TURN: 这是我爸爸。
- REPAIR: 我妈妈。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### visita-6

- NPC_UTTERANCE: 这是我爸爸。
- MEANING: Este é meu pai.
- PROMPT: Quem Mei apresentou agora?
- EXPECTED_RESPONSE: O pai dela.
- ACCEPTS: (none)
- NEXT_TURN: 我想喝茶。
- REPAIR: 爸爸。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### visita-8

- NPC_UTTERANCE: 你想喝茶吗？
- MEANING: Você quer beber chá?
- PROMPT: Escolha um caminho: aceitar o chá ou recusar com educação.
- EXPECTED_RESPONSE: 我想喝茶
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 不，谢谢。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### visita-11

- NPC_UTTERANCE: 好，这是茶。
- MEANING: Certo, isto é chá.
- PROMPT: O que Mei trouxe?
- EXPECTED_RESPONSE: Chá.
- ACCEPTS: (none)
- NEXT_TURN: 我很好！
- REPAIR: 茶。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### visita-13

- NPC_UTTERANCE: 你好吗？
- MEANING: Tudo bem?
- PROMPT: Responda que está bem.
- EXPECTED_RESPONSE: 我很好
- ACCEPTS: (none)
- NEXT_TURN: 很好！明天见？
- REPAIR: 你好吗？我很好。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### visita-16

- NPC_UTTERANCE: 很好！明天见？
- MEANING: Que bom! Até amanhã?
- PROMPT: Confirme o encontro de amanhã.
- EXPECTED_RESPONSE: 明天见
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 明天见。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## comentar-ceu

- intent: comment-sky
- ending: 再见！
- last interaction: choose_meaning

### ceu-2

- NPC_UTTERANCE: 那是天？
- MEANING: Aquilo é o céu?
- PROMPT: Confirme apontando o céu.
- EXPECTED_RESPONSE: 那是天
- ACCEPTS: (none)
- NEXT_TURN: 今天很好！
- REPAIR: 天。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

### ceu-5

- NPC_UTTERANCE: 今天很好！
- MEANING: Hoje está ótimo!
- PROMPT: O que Mei comentou sobre o dia?
- EXPECTED_RESPONSE: Hoje está ótimo.
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 今天很好。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## esta-e-minha-casa

- intent: show-home
- ending: 再见！
- last interaction: choose_reply

### casa-nova-3

- NPC_UTTERANCE: 这是什么？
- MEANING: O que é isto?
- PROMPT: Mostre sua casa.
- EXPECTED_RESPONSE: 这是我家
- ACCEPTS: (none)
- NEXT_TURN: 好！你回家吗？
- REPAIR: 家。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### casa-nova-6

- NPC_UTTERANCE: 好！你回家吗？
- MEANING: Certo! Você volta para casa?
- PROMPT: Confirme que vai para casa.
- EXPECTED_RESPONSE: 我回家
- ACCEPTS: (none)
- NEXT_TURN: 再见！
- REPAIR: 回家。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## pedir-cardapio

- intent: order-menu
- ending: 好的！没问题！
- last interaction: choose_reply

### cardapio-3

- NPC_UTTERANCE: 你要米饭吗？
- MEANING: Você quer arroz?
- PROMPT: Peça arroz (米饭).
- EXPECTED_RESPONSE: 我要米饭
- ACCEPTS: 我想吃米饭 | 我要饭
- NEXT_TURN: 要辣吗？
- REPAIR: 米饭。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### cardapio-6

- NPC_UTTERANCE: 要辣吗？
- MEANING: Quer picante?
- PROMPT: Peça sem pimenta.
- EXPECTED_RESPONSE: 不要辣
- ACCEPTS: (none)
- NEXT_TURN: 你要茶吗？
- REPAIR: 不要辣。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### cardapio-9

- NPC_UTTERANCE: 你要茶吗？
- MEANING: Você quer chá?
- PROMPT: Peça um copo de chá.
- EXPECTED_RESPONSE: 我要一杯茶
- ACCEPTS: 我想喝水 | 我要水
- NEXT_TURN: 多少钱？
- REPAIR: 茶。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### cardapio-12

- NPC_UTTERANCE: 多少钱？
- MEANING: Quanto custa?
- PROMPT: O que Matheus perguntou?
- EXPECTED_RESPONSE: O preço.
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 多少钱。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### cardapio-15

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Peça a conta.
- EXPECTED_RESPONSE: 买单
- ACCEPTS: (none)
- NEXT_TURN: 好的！没问题！
- REPAIR: 买单。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## mostrar-livro

- intent: show-book
- ending: 不客气！
- last interaction: choose_reply

### livro-3

- NPC_UTTERANCE: 这是什么？
- MEANING: O que é isto?
- PROMPT: Mostre o livro.
- EXPECTED_RESPONSE: 这是书
- ACCEPTS: (none)
- NEXT_TURN: 好！你看书吗？
- REPAIR: 书。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### livro-6

- NPC_UTTERANCE: 好！你看书吗？
- MEANING: Certo! Você lê o livro?
- PROMPT: Diga que você lê.
- EXPECTED_RESPONSE: 我看书
- ACCEPTS: (none)
- NEXT_TURN: 不客气！
- REPAIR: 看书。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## onde-esta-o-carro

- intent: ask-car-where
- ending: 不客气！再见！
- last interaction: choose_reply

### carro-3

- NPC_UTTERANCE: 车在哪里？
- MEANING: Onde está o carro?
- PROMPT: O que Matheus está procurando?
- EXPECTED_RESPONSE: O carro.
- ACCEPTS: (none)
- NEXT_TURN: 票多少钱？
- REPAIR: 车。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### carro-6

- NPC_UTTERANCE: 票多少钱？
- MEANING: Quanto custa o bilhete?
- PROMPT: Peça o bilhete.
- EXPECTED_RESPONSE: 我要票
- ACCEPTS: (none)
- NEXT_TURN: 不客气！再见！
- REPAIR: 票。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: OK

## falar-de-estudo

- intent: study
- ending: 好！谢谢！
- last interaction: choose_reply

### estudo-1

- NPC_UTTERANCE: 你好！你是学生吗？
- MEANING: Olá! Você é estudante?
- PROMPT: Como você responde que é estudante?
- EXPECTED_RESPONSE: 是，我是学生。
- ACCEPTS: (none)
- NEXT_TURN: 你学习什么？
- REPAIR: 请再说一遍：我是学生。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW, UNNATURAL_ENDING

### estudo-4

- NPC_UTTERANCE: 你学习什么？
- MEANING: O que você estuda?
- PROMPT: O que você estuda?
- EXPECTED_RESPONSE: 我学习中文
- ACCEPTS: (none)
- NEXT_TURN: 你在哪里学习？
- REPAIR: 请再说一遍：我学习中文。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW, UNNATURAL_ENDING

### estudo-7

- NPC_UTTERANCE: 你在哪里学习？
- MEANING: Onde você estuda?
- PROMPT: Onde você estuda?
- EXPECTED_RESPONSE: 我在学校学习
- ACCEPTS: (none)
- NEXT_TURN: 好！谢谢！
- REPAIR: 在学校。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW, UNNATURAL_ENDING

## rotina-e-trabalho

- intent: work-routine
- ending: 好。
- last interaction: produce_reply

### rotina-1

- NPC_UTTERANCE: 你几点起床？
- MEANING: A que horas você acorda?
- PROMPT: Você acorda às sete. Diga quando acorda.
- EXPECTED_RESPONSE: 我七点起床
- ACCEPTS: 我七点起床 | 我七点起床。 | 七点起床
- NEXT_TURN: 七点？
- REPAIR: 七点吗？
- speechAct: ask_time → tell_time (confirm_time)
- CLASS: OK

### rotina-2

- NPC_UTTERANCE: 你几点上班？
- MEANING: A que horas você começa o trabalho?
- PROMPT: Você começa às oito. Diga o horário.
- EXPECTED_RESPONSE: 八点
- ACCEPTS: 八点 | 八点。 | 我八点上班 | 我八点上班。 | 八点上班
- NEXT_TURN: 八点见？
- REPAIR: 八点吗？
- speechAct: ask_time → tell_time (confirm_time)
- CLASS: OK

### rotina-3

- NPC_UTTERANCE: 你在哪里工作？
- MEANING: Onde você trabalha?
- PROMPT: Você trabalha numa empresa. Diga onde trabalha.
- EXPECTED_RESPONSE: 我在公司上班
- ACCEPTS: 我在公司上班 | 我在公司上班。
- NEXT_TURN: 公司？好。
- REPAIR: 你在哪里工作？
- speechAct: ask_location → tell_location (reask)
- CLASS: OK

## que-horas-sao

- intent: ask-time
- ending: 好，八点见！
- last interaction: produce_reply

### hora-1

- NPC_UTTERANCE: 现在几点？
- MEANING: Que horas são?
- PROMPT: São oito e meia. Diga as horas.
- EXPECTED_RESPONSE: 八点半
- ACCEPTS: 八点半 | 八点半。 | 现在八点半 | 现在八点半。
- NEXT_TURN: 八点半？好。
- REPAIR: 八点半吗？
- speechAct: ask_time → tell_time (confirm_time)
- CLASS: OK

### hora-2

- NPC_UTTERANCE: 什么时候？
- MEANING: Quando?
- PROMPT: Vocês vão sair agora. Diga quando.
- EXPECTED_RESPONSE: 现在
- ACCEPTS: 现在 | 现在。
- NEXT_TURN: 现在？好。
- REPAIR: 什么？
- speechAct: ask_when → tell_when (clarify)
- CLASS: OK

## nao-me-sinto-bem

- intent: health
- ending: 在那里。
- last interaction: choose_reply

### saude-2

- NPC_UTTERANCE: 我不舒服。
- MEANING: Não me sinto bem.
- PROMPT: O que Matheus disse?
- EXPECTED_RESPONSE: Não me sinto bem.
- ACCEPTS: (none)
- NEXT_TURN: 我头疼。我需要医生。
- REPAIR: 不舒服。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### saude-4

- NPC_UTTERANCE: 头疼？
- MEANING: Dor de cabeça?
- PROMPT: Confirme a dor de cabeça.
- EXPECTED_RESPONSE: 我头疼
- ACCEPTS: (none)
- NEXT_TURN: 医院在哪里？
- REPAIR: 我头疼。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### saude-7

- NPC_UTTERANCE: 医院在哪里？
- MEANING: Onde fica o hospital?
- PROMPT: Peça o hospital.
- EXPECTED_RESPONSE: 医院在哪里？
- ACCEPTS: (none)
- NEXT_TURN: 在那里。
- REPAIR: 医院在哪里？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## como-esta-o-tempo

- intent: weather
- ending: 好。今天天气很好？不太好。
- last interaction: choose_reply

### clima-2

- NPC_UTTERANCE: 今天天气怎么样？
- MEANING: Como está o tempo hoje?
- PROMPT: Está quente. O que você diz?
- EXPECTED_RESPONSE: 今天很热
- ACCEPTS: (none)
- NEXT_TURN: 下雨了？
- REPAIR: 很热。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### clima-5

- NPC_UTTERANCE: 下雨了？
- MEANING: Está chovendo?
- PROMPT: Começou a chover. O que você diz?
- EXPECTED_RESPONSE: 下雨了
- ACCEPTS: (none)
- NEXT_TURN: 好。今天天气很好？不太好。
- REPAIR: 下雨了。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

## checkin-hotel

- intent: hotel
- ending: 有。谢谢！
- last interaction: choose_reply

### hotel-2

- NPC_UTTERANCE: 你好。有预订吗？
- MEANING: Olá. Tem reserva?
- PROMPT: Você tem reserva. O que diz? (também vale entregar o passaporte.)
- EXPECTED_RESPONSE: 我有预订
- ACCEPTS: (none)
- NEXT_TURN: 我的房间在哪里？
- REPAIR: 请给我护照。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### hotel-5

- NPC_UTTERANCE: 我的房间在哪里？
- MEANING: Onde fica o meu quarto?
- PROMPT: O que Matheus perguntou?
- EXPECTED_RESPONSE: Onde fica o meu quarto?
- ACCEPTS: (none)
- NEXT_TURN: 有Wi-Fi吗？
- REPAIR: 房间在哪里？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### hotel-7

- NPC_UTTERANCE: 在那里。
- MEANING: Lá.
- PROMPT: Pergunte se tem Wi-Fi.
- EXPECTED_RESPONSE: 有Wi-Fi吗？
- ACCEPTS: (none)
- NEXT_TURN: 有。谢谢！
- REPAIR: 有Wi-Fi吗？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## no-aeroporto

- intent: airport
- ending: 在那里。谢谢！
- last interaction: choose_reply

### aero-2

- NPC_UTTERANCE: 在那里。这是护照吗？
- MEANING: Lá. Isto é o passaporte?
- PROMPT: Mostre o passaporte.
- EXPECTED_RESPONSE: 这是我的护照
- ACCEPTS: (none)
- NEXT_TURN: 好。登机口在哪里？
- REPAIR: 这是我的护照。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### aero-5

- NPC_UTTERANCE: 好。登机口在哪里？
- MEANING: Certo. Onde fica o portão?
- PROMPT: Pergunte o portão de embarque.
- EXPECTED_RESPONSE: 登机口在哪里？
- ACCEPTS: (none)
- NEXT_TURN: 在那里。谢谢！
- REPAIR: 登机口在哪里？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

## pegar-taxi

- intent: taxi
- ending: 好！
- last interaction: choose_reply

### taxi-2

- NPC_UTTERANCE: 去哪里？
- MEANING: Para onde?
- PROMPT: Indique a Beijing Road (também vale repetir o hotel).
- EXPECTED_RESPONSE: 去北京路
- ACCEPTS: (none)
- NEXT_TURN: 多少钱？
- REPAIR: 好，去酒店。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT, ANSWER_TOO_NARROW

### taxi-4

- NPC_UTTERANCE: 好。多少钱？二十八。
- MEANING: Certo. Quanto custa? Vinte e oito.
- PROMPT: Pergunte o preço.
- EXPECTED_RESPONSE: 多少钱？
- ACCEPTS: (none)
- NEXT_TURN: 二十八。
- REPAIR: 多少钱？请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW

### taxi-7

- NPC_UTTERANCE: 二十八。
- MEANING: Vinte e oito.
- PROMPT: Chegou. Peça para parar aqui.
- EXPECTED_RESPONSE: 在这里停车
- ACCEPTS: (none)
- NEXT_TURN: 好！
- REPAIR: 在这里停车。请再说一遍。
- speechAct: (undeclared) → (undeclared) (no repairType)
- CLASS: ANSWER_TOO_NARROW
