# Conversation coherence audit

Cenas: 48.

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

### loja-1

- NPC_UTTERANCE: 你好。你要什么？
- MEANING: Olá. O que você quer?
- PROMPT: Aponte o item. Diga que quer este.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: 我要这个
- NEXT_TURN: 这个？好。十。
- REPAIR: 这个吗？
- speechAct: ask_order → place_order (reask_order)
- CLASS: ANSWER_TOO_NARROW

### loja-2

- NPC_UTTERANCE: 十。
- MEANING: Dez.
- PROMPT: Quanto o vendedor cobrou?
- EXPECTED_RESPONSE: 10
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 多少钱？十。
- speechAct: tell_price → acknowledge (clarify)
- CLASS: OK

### loja-3

- NPC_UTTERANCE: 要吗？
- MEANING: Você quer?
- PROMPT: O preço está na etiqueta. Aceitar, achar caro ou desistir são decisões reais — nenhuma é «erro».
- EXPECTED_RESPONSE: 好
- ACCEPTS: (none)
- NEXT_TURN: 好。谢谢！
- REPAIR: 要吗？
- speechAct: ask_order → accept_offer (clarify)
- CLASS: OK

## comprar-itens

- intent: buy-items
- ending: 谢谢！再见！
- last interaction: choose_reply

### comprar-1

- NPC_UTTERANCE: 你好。你要什么？
- MEANING: Olá. O que você quer?
- PROMPT: Você quer os sapatos. Mesmo frame 我要 + item.
- EXPECTED_RESPONSE: 我要这双鞋
- ACCEPTS: 我要这双鞋 | 我要这个
- NEXT_TURN: 这个？好。
- REPAIR: 这个吗？
- speechAct: ask_order → place_order (reask_order)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### comprar-2

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Pergunte o preço, falando ou escrevendo, sem alternativas.
- EXPECTED_RESPONSE: 多少钱？
- ACCEPTS: 多少钱？ | 多少钱 | 这个多少钱？ | 这个多少钱
- NEXT_TURN: 二十八。
- REPAIR: 多少钱？
- speechAct: confirm_item → ask_price (clarify)
- CLASS: OK

### comprar-3

- NPC_UTTERANCE: 二十八。
- MEANING: Vinte e oito.
- PROMPT: Quanto o vendedor cobrou?
- EXPECTED_RESPONSE: 28
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 多少钱？二十八。
- speechAct: tell_price → acknowledge (clarify)
- CLASS: OK

### comprar-4

- NPC_UTTERANCE: 要吗？
- MEANING: Você quer?
- PROMPT: O preço cabe. Aceite.
- EXPECTED_RESPONSE: 好
- ACCEPTS: (none)
- NEXT_TURN: 微信支付？
- REPAIR: 好吗？
- speechAct: ask_order → accept_offer (clarify)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### comprar-5

- NPC_UTTERANCE: 微信支付？
- MEANING: WeChat Pay?
- PROMPT: Você prefere cartão. Pergunte.
- EXPECTED_RESPONSE: 可以刷卡吗？
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 现金吗？
- speechAct: ask_payment → ask_card (clarify)
- CLASS: ANSWER_TOO_NARROW

## revisao-restaurante

- intent: restaurant-review
- ending: 谢谢！再见！
- last interaction: produce_reply

### rest-2

- NPC_UTTERANCE: 你好！
- MEANING: Olá!
- PROMPT: Peça apontando para o prato.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: 我要这个
- NEXT_TURN: 这个，好。你想喝茶吗？
- REPAIR: 你要什么？
- speechAct: ask_order → place_order (reask_order)
- CLASS: ANSWER_TOO_NARROW

### rest-4

- NPC_UTTERANCE: 你想喝茶吗？
- MEANING: Quer beber chá?
- PROMPT: Aceite o chá.
- EXPECTED_RESPONSE: 我想喝茶
- ACCEPTS: 我想喝茶 | 我要一杯茶
- NEXT_TURN: 茶，好。
- REPAIR: 茶？
- speechAct: ask_order → accept_offer (clarify)
- CLASS: OK

### rest-7

- NPC_UTTERANCE: 很好吃！
- MEANING: Muito gostoso!
- PROMPT: O que Matheus achou da comida?
- EXPECTED_RESPONSE: Muito gostosa.
- ACCEPTS: (none)
- NEXT_TURN: 买单
- REPAIR: 好吃，很好吃。
- speechAct: ask_wellbeing → praise_food (clarify)
- CLASS: ANSWER_TOO_NARROW

### rest-9

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Peça a conta.
- EXPECTED_RESPONSE: 买单
- ACCEPTS: 买单 | 买单。 | 买单谢谢
- NEXT_TURN: 谢谢！再见！
- REPAIR: 买单？
- speechAct: confirm_order → request_bill (confirm_bill)
- CLASS: OK

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

### mercado-1

- NPC_UTTERANCE: 你好。你要什么？
- MEANING: Olá. O que você quer?
- PROMPT: Aponte o item. Diga que quer este.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: 我要这个
- NEXT_TURN: 这个？好。
- REPAIR: 这个吗？
- speechAct: ask_order → place_order (reask_order)
- CLASS: ANSWER_TOO_NARROW

### mercado-2

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Pergunte o preço. Fale ou escreva, sem alternativas.
- EXPECTED_RESPONSE: 多少钱？
- ACCEPTS: 多少钱？ | 多少钱 | 这个多少钱？ | 这个多少钱
- NEXT_TURN: 二十八。
- REPAIR: 多少钱？
- speechAct: confirm_item → ask_price (clarify)
- CLASS: OK

### mercado-3

- NPC_UTTERANCE: 二十八。
- MEANING: Vinte e oito.
- PROMPT: Quanto o vendedor cobrou?
- EXPECTED_RESPONSE: 28
- ACCEPTS: (none)
- NEXT_TURN: 太贵了。
- REPAIR: 多少钱？二十八。
- speechAct: tell_price → acknowledge (clarify)
- CLASS: OK

### mercado-4

- NPC_UTTERANCE: 二十八。要吗？
- MEANING: Vinte e oito. Você quer?
- PROMPT: Banca com preço falado. Aceitar, negociar ou desistir são decisões reais.
- EXPECTED_RESPONSE: 太贵了
- ACCEPTS: (none)
- NEXT_TURN: 太贵了？
- REPAIR: 要吗？
- speechAct: ask_order → refuse_offer (clarify)
- CLASS: OK

### mercado-5

- NPC_UTTERANCE: 太贵了？
- MEANING: Caro demais?
- PROMPT: Peça um pouco mais barato. Fale ou escreva.
- EXPECTED_RESPONSE: 便宜一点
- ACCEPTS: 便宜一点 | 便宜一点 | 便宜一点。
- NEXT_TURN: 好，十八。
- REPAIR: 便宜一点？
- speechAct: confirm_price → request_discount (clarify)
- CLASS: OK

### mercado-qty

- NPC_UTTERANCE: 我要两个？
- MEANING: Quero dois?
- PROMPT: Confirme a quantidade: dois.
- EXPECTED_RESPONSE: 我要两个
- ACCEPTS: (none)
- NEXT_TURN: 我要两个，好。
- REPAIR: 我要两个？
- speechAct: ask_order → place_order (confirm_quantity)
- CLASS: ANSWER_TOO_NARROW

### mercado-pay

- NPC_UTTERANCE: 微信支付？
- MEANING: WeChat Pay?
- PROMPT: O caixa pergunta o método. Cartão e dinheiro continuam perguntas úteis.
- EXPECTED_RESPONSE: 可以刷卡吗？
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 现金吗？
- speechAct: ask_payment → ask_card (clarify)
- CLASS: ANSWER_TOO_NARROW

### mercado-thanks

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Agradeça e feche a compra.
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: 谢谢 | 谢谢。 | 谢谢！
- NEXT_TURN: 不客气！再见！
- REPAIR: 谢谢。
- speechAct: thank → acknowledge_thanks (clarify)
- CLASS: OK

## imersao-estacao

- intent: immersion-station
- ending: 再见！
- last interaction: choose_reply

### estacao-1

- NPC_UTTERANCE: 你好。
- MEANING: Olá.
- PROMPT: Pergunte onde fica a estação de metrô, falando ou escrevendo, sem alternativas.
- EXPECTED_RESPONSE: 地铁站在哪里？
- ACCEPTS: 地铁站在哪里？ | 地铁站在哪里 | 请问，地铁站在哪里？ | 请问地铁站在哪里？ | 火车站在哪里？ | 火车站在哪里
- NEXT_TURN: 一直走。左转。
- REPAIR: 地铁站吗？
- speechAct: greet → ask_location (reask)
- CLASS: OK

### estacao-fast

- NPC_UTTERANCE: 一直走。左转。
- MEANING: Siga em frente. Vire à esquerda.
- PROMPT: A pessoa falou rápido. Peça para repetir ou para ir mais devagar — as duas ajudam.
- EXPECTED_RESPONSE: 请再说一遍
- ACCEPTS: (none)
- NEXT_TURN: 好，谢谢！
- REPAIR: 左边？
- speechAct: tell_direction → ask_route (repeat)
- CLASS: ANSWER_TOO_NARROW

### estacao-sign

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Você saiu da rua e precisa entrar. Seguir a placa ou perguntar são os dois caminhos.
- EXPECTED_RESPONSE: 入口
- ACCEPTS: (none)
- NEXT_TURN: 你好。
- REPAIR: 入口？
- speechAct: tell_location → acknowledge (clarify)
- CLASS: OK

### estacao-ticket

- NPC_UTTERANCE: 你好。
- MEANING: Olá.
- PROMPT: Na bilheteria, pergunte o preço da passagem, sem alternativas.
- EXPECTED_RESPONSE: 票多少钱？
- ACCEPTS: 票多少钱？ | 票多少钱 | 多少钱？ | 多少钱
- NEXT_TURN: 十。
- REPAIR: 十？
- speechAct: greet → ask_price (clarify)
- CLASS: OK

### estacao-buy

- NPC_UTTERANCE: 这个？
- MEANING: Este?
- PROMPT: Compre apontando, sem alternativas.
- EXPECTED_RESPONSE: 我要这个
- ACCEPTS: 我要这个 | 我要这个。 | 我要票 | 我要票。
- NEXT_TURN: 票。
- REPAIR: 这个？
- speechAct: ask_order → place_order (reask_order)
- CLASS: OK

### estacao-ticket-hand

- NPC_UTTERANCE: 票。
- MEANING: A passagem.
- PROMPT: Receba a passagem e encerre.
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 不客气！再见！
- REPAIR: 再见。
- speechAct: confirm_item → thank (clarify)
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
- ending: 好的！
- last interaction: produce_reply

### cardapio-2

- NPC_UTTERANCE: 你好，请问几位？
- MEANING: Olá, com licença, quantas pessoas?
- PROMPT: Vocês são duas pessoas. Responda ao funcionário.
- EXPECTED_RESPONSE: 两位
- ACCEPTS: 两位 | 两个人
- NEXT_TURN: 两位，好。请坐。
- REPAIR: 两位吗？
- speechAct: ask_party_size → tell_party_size (confirm_quantity)
- CLASS: OK

### cardapio-3

- NPC_UTTERANCE: 你要菜单吗？
- MEANING: Você quer o cardápio?
- PROMPT: Peça o cardápio com o padrão que você já usa para pedir.
- EXPECTED_RESPONSE: 我要菜单
- ACCEPTS: 我要菜单 | 菜单
- NEXT_TURN: 菜单，好。
- REPAIR: 菜单？
- speechAct: offer_menu → request_menu (clarify)
- CLASS: OK

### cardapio-4

- NPC_UTTERANCE: 你要什么？
- MEANING: O que você quer?
- PROMPT: Peça arroz.
- EXPECTED_RESPONSE: 我要米饭
- ACCEPTS: 我要米饭 | 我想吃米饭 | 我要饭
- NEXT_TURN: 米饭，好。
- REPAIR: 你要什么？
- speechAct: ask_order → place_order (reask_order)
- CLASS: OK

### cardapio-5

- NPC_UTTERANCE: 你要茶吗？
- MEANING: Você quer chá?
- PROMPT: Aceite o chá.
- EXPECTED_RESPONSE: 我要一杯茶
- ACCEPTS: 我要一杯茶 | 我想喝茶
- NEXT_TURN: 好。
- REPAIR: 茶？
- speechAct: ask_order → accept_offer (clarify)
- CLASS: OK

### cardapio-6

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Vocês terminaram. Peça a conta, sem alternativas.
- EXPECTED_RESPONSE: 买单
- ACCEPTS: 买单 | 买单。 | 买单谢谢
- NEXT_TURN: 好的！
- REPAIR: 买单？
- speechAct: confirm_order → request_bill (confirm_bill)
- CLASS: OK

## imersao-restaurante

- intent: immersion-restaurant
- ending: 再见！
- last interaction: produce_reply

### ir-2

- NPC_UTTERANCE: 请问几位？
- MEANING: Com licença, quantas pessoas?
- PROMPT: Vocês são duas pessoas. Uma pessoa também é um caminho real.
- EXPECTED_RESPONSE: 两位
- ACCEPTS: 两位 | 两个人
- NEXT_TURN: 两位，好。请坐。
- REPAIR: 一位，好。请坐。
- speechAct: ask_party_size → tell_party_size (confirm_quantity)
- CLASS: OK

### ir-3

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Chame o atendimento.
- EXPECTED_RESPONSE: 服务员
- ACCEPTS: 服务员 | 服务员！
- NEXT_TURN: 你好。
- REPAIR: 服务员？
- speechAct: greet → get_attention (clarify)
- CLASS: OK

### ir-4

- NPC_UTTERANCE: 你要菜单吗？
- MEANING: Você quer o cardápio?
- PROMPT: Peça o cardápio.
- EXPECTED_RESPONSE: 我要菜单
- ACCEPTS: 我要菜单 | 菜单
- NEXT_TURN: 菜单，好。
- REPAIR: 菜单？
- speechAct: offer_menu → request_menu (clarify)
- CLASS: OK

### ir-5

- NPC_UTTERANCE: 你要什么？
- MEANING: O que você quer?
- PROMPT: Peça arroz.
- EXPECTED_RESPONSE: 我要米饭
- ACCEPTS: 我要米饭 | 我想吃米饭 | 我要饭
- NEXT_TURN: 米饭，好。
- REPAIR: 你要什么？
- speechAct: ask_order → place_order (reask_order)
- CLASS: OK

### ir-6

- NPC_UTTERANCE: 你要茶吗？
- MEANING: Você quer chá?
- PROMPT: Aceite o chá, ou recuse se não quiser mais.
- EXPECTED_RESPONSE: 我要一杯茶
- ACCEPTS: 我要一杯茶 | 我想喝茶
- NEXT_TURN: 茶，好。
- REPAIR: 好，不要了。
- speechAct: ask_order → accept_offer (clarify)
- CLASS: OK

### ir-8

- NPC_UTTERANCE: 好吃吗？
- MEANING: Está gostoso?
- PROMPT: A comida está boa. Responda.
- EXPECTED_RESPONSE: 很好吃
- ACCEPTS: 很好吃
- NEXT_TURN: 好吃，好。
- REPAIR: 好吃吗？
- speechAct: ask_wellbeing → praise_food (clarify)
- CLASS: OK

### ir-9

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Terminaram. Peça a conta falando ou escrevendo, sem banco de palavras.
- EXPECTED_RESPONSE: 买单
- ACCEPTS: 买单 | 买单。 | 买单谢谢
- NEXT_TURN: 再见！
- REPAIR: 买单？
- speechAct: confirm_order → request_bill (confirm_bill)
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
- NEXT_TURN: 上班？好。
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
- ending: 不客气。
- last interaction: choose_reply

### hotel-reserve

- NPC_UTTERANCE: 有预订吗？
- MEANING: Tem reserva?
- PROMPT: Você chegou com reserva. Informe isso, falando ou escrevendo, sem alternativas.
- EXPECTED_RESPONSE: 我有预订
- ACCEPTS: 我有预订 | 我有预订。 | 有预订 | 有预订。
- NEXT_TURN: 请给我护照。
- REPAIR: 预订？
- speechAct: ask_reservation → confirm_reservation (confirm_reservation)
- CLASS: OK

### hotel-passport

- NPC_UTTERANCE: 请给我护照。
- MEANING: Por favor, me dê o passaporte.
- PROMPT: A recepção pediu o documento. Mostre o passaporte, sem alternativas.
- EXPECTED_RESPONSE: 这是我的护照
- ACCEPTS: 这是我的护照 | 这是我的护照。 | 护照 | 护照。
- NEXT_TURN: 住几晚？
- REPAIR: 护照？
- speechAct: request_document → present_document (confirm_document)
- CLASS: QUESTION_NOT_USING_PREVIOUS_CONTEXT

### hotel-nights

- NPC_UTTERANCE: 住几晚？
- MEANING: Quantas noites?
- PROMPT: A recepcionista pergunta quantas noites. Você fica duas.
- EXPECTED_RESPONSE: 两晚
- ACCEPTS: 两晚 | 两晚。 | 两晚
- NEXT_TURN: 三零五。
- REPAIR: 两晚吗？
- speechAct: ask_nights → tell_nights (confirm_nights)
- CLASS: OK

### hotel-room

- NPC_UTTERANCE: 三零五。
- MEANING: Trezentos e cinco — falado dígito a dígito.
- PROMPT: Ouça o número do quarto. Qual número você ouviu?
- EXPECTED_RESPONSE: 305
- ACCEPTS: (none)
- NEXT_TURN: 这是房卡。
- REPAIR: 三零五吗？
- speechAct: tell_room_number → acknowledge (confirm_room)
- CLASS: OK

### hotel-card

- NPC_UTTERANCE: 这是房卡。
- MEANING: Este é o cartão do quarto.
- PROMPT: O que você recebeu?
- EXPECTED_RESPONSE: O cartão do quarto
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 房卡？
- speechAct: confirm_item → acknowledge (clarify)
- CLASS: ANSWER_TOO_NARROW

### hotel-where

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Você não encontra o quarto. Pergunte onde ele fica, sem alternativas.
- EXPECTED_RESPONSE: 我的房间在哪里？
- ACCEPTS: 我的房间在哪里？ | 我的房间在哪里 | 房间在哪里？ | 房间在哪里
- NEXT_TURN: 在那里。
- REPAIR: 房间？
- speechAct: acknowledge → ask_room_location (confirm_room)
- CLASS: OK

### hotel-point

- NPC_UTTERANCE: 在那里。
- MEANING: Lá.
- PROMPT: Pergunte uma necessidade simples: Wi-Fi ou banheiro. As duas servem.
- EXPECTED_RESPONSE: 有Wi-Fi吗？
- ACCEPTS: (none)
- NEXT_TURN: 有。
- REPAIR: Wi-Fi？
- speechAct: tell_location → ask_wifi (clarify)
- CLASS: ANSWER_TOO_NARROW

### hotel-wifi-yes

- NPC_UTTERANCE: 有。
- MEANING: Tem.
- PROMPT: A recepcionista confirmou. Encerre com educação.
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 不客气。
- REPAIR: 再见。
- speechAct: acknowledge → thank (clarify)
- CLASS: OK

## no-aeroporto

- intent: airport
- ending: 不客气。
- last interaction: choose_reply

### aero-passport

- NPC_UTTERANCE: 护照。
- MEANING: O passaporte.
- PROMPT: O funcionário pediu o documento. Mostre o passaporte, sem alternativas.
- EXPECTED_RESPONSE: 这是我的护照
- ACCEPTS: 这是我的护照 | 这是我的护照。 | 护照 | 护照。
- NEXT_TURN: 好。
- REPAIR: 护照？
- speechAct: request_document → present_document (confirm_document)
- CLASS: OK

### aero-gate

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Você precisa do portão. Pergunte onde fica o portão de embarque, sem alternativas.
- EXPECTED_RESPONSE: 登机口在哪里？
- ACCEPTS: 登机口在哪里？ | 登机口在哪里 | 登机口呢？ | 登机口呢
- NEXT_TURN: 十八号登机口。
- REPAIR: 登机口？
- speechAct: acknowledge → ask_gate (confirm_gate)
- CLASS: OK

### aero-fast

- NPC_UTTERANCE: 十八号登机口。
- MEANING: Portão de embarque número 18.
- PROMPT: A fala foi rápida. Peça para repetir ou para ir mais devagar — as duas mudam a conversa.
- EXPECTED_RESPONSE: 请再说一遍
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 十八？
- speechAct: tell_gate → ask_repeat (repeat)
- CLASS: ANSWER_TOO_NARROW

### aero-number

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Qual é o número do portão?
- EXPECTED_RESPONSE: 18
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 十八吗？
- speechAct: tell_gate → acknowledge (confirm_gate)
- CLASS: OK

### aero-sign

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Qual placa você procura para o embarque?
- EXPECTED_RESPONSE: 登机口
- ACCEPTS: (none)
- NEXT_TURN: 一直走。在那里。
- REPAIR: 登机口？
- speechAct: tell_location → acknowledge (clarify)
- CLASS: OK

### aero-dir

- NPC_UTTERANCE: 一直走。在那里。
- MEANING: Siga em frente. Lá.
- PROMPT: O que o funcionário disse?
- EXPECTED_RESPONSE: Siga em frente. Fica lá.
- ACCEPTS: (none)
- NEXT_TURN: 好。
- REPAIR: 那里？
- speechAct: tell_direction → acknowledge (clarify)
- CLASS: ANSWER_TOO_NARROW

### aero-close

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Você chegou ao portão. Agradeça ou peça ajuda se ainda precisar.
- EXPECTED_RESPONSE: 谢谢
- ACCEPTS: (none)
- NEXT_TURN: 不客气。
- REPAIR: 再见。
- speechAct: acknowledge → thank (clarify)
- CLASS: OK

## pegar-taxi

- intent: taxi
- ending: 谢谢！
- last interaction: produce_reply

### taxi-1

- NPC_UTTERANCE: 你好。去哪里？
- MEANING: Olá. Para onde?
- PROMPT: Diga o destino. Hotel ou Beijing Road — os dois fecham a corrida.
- EXPECTED_RESPONSE: 我要去酒店
- ACCEPTS: 我要去酒店 | 我要去酒店。 | 去酒店 | 去酒店。 | 去北京路 | 去北京路。
- NEXT_TURN: 酒店，好。
- REPAIR: 酒店吗？
- speechAct: ask_location → state_destination (clarify)
- CLASS: OK

### taxi-stop

- NPC_UTTERANCE: 好。
- MEANING: Certo.
- PROMPT: Você chegou. Peça ao motorista para parar aqui, sem alternativas.
- EXPECTED_RESPONSE: 在这里停车
- ACCEPTS: 在这里停车 | 在这里停车。 | 在这里停车。谢谢 | 在这里停车。谢谢！
- NEXT_TURN: 好。
- REPAIR: 这里？
- speechAct: acknowledge → request_stop (clarify)
- CLASS: OK
