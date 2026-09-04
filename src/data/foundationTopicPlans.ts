/**
 * V4.6.1 — authored session plans for conceptual foundation topics.
 *
 * These replace the generic planner output so "O que é pinyin?" actually
 * teaches pinyin (not four 你好 drills). Keep sessions short: one intro,
 * then interaction. No lecture walls.
 */

import type { LessonStep } from "./journey";
import { conversationSceneStepFromId } from "./conversationScenes";
import { withEquivalentAccepts } from "./masteryLoop";
import type { MasteryPass } from "./masteryLoop";
import { isConceptFoundationTopic } from "./topicMastery";
import { makeReverseRecall } from "./exerciseFeasibility";
import { FOUNDATION_TARGET_IDS, knowledgeTargetIdsForStep, withPedagogicalEvidence, type PedagogicalRung } from "./pedagogicalSpine";

function intro(title: string, body: string): LessonStep {
  return { kind: "intro", title, body };
}

function listen(text: string, pinyin: string, pt: string): LessonStep {
  return { kind: "listen", text, pinyin, pt };
}

function listenSelect(
  title: string,
  audioText: string,
  options: string[],
  correctAnswer: string,
  explanation?: string,
  prompt = "Toque no que ouviu."
): LessonStep {
  return {
    kind: "listen_select",
    title,
    prompt,
    audioText,
    slowAudioText: audioText,
    options,
    correctAnswer,
    explanation,
  };
}

function dialogue(
  title: string,
  dialoguePrompt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "dialogue_choice",
    title,
    speaker: "Situação",
    dialoguePrompt,
    options,
    correctAnswer,
    explanation,
  };
}

function match(
  title: string,
  prompt: string,
  pairs: NonNullable<LessonStep["pairs"]>,
  explanation?: string
): LessonStep {
  return { kind: "match_pairs", title, prompt, pairs, explanation };
}

function sentenceBuild(
  title: string,
  prompt: string,
  target: string[],
  bank: string[],
  explanation?: string
): LessonStep {
  return { kind: "sentence_build", title, prompt, target, bank, explanation, correctAnswer: target.join("") };
}

function hanziBuild(builderId: string, title: string, prompt: string, answer: string, meaning: string): LessonStep {
  return {
    kind: "hanzi_build",
    builderId,
    title,
    prompt,
    correctAnswer: answer,
    targetHanzi: answer,
    targetMeaningPt: meaning,
  };
}

function reverseRecall(title: string, situationPt: string, answer: string, accepts?: string[]): LessonStep {
  return makeReverseRecall(title, situationPt, answer, accepts);
}

function contextualChoice(
  title: string,
  situationPt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "contextual_choice",
    title,
    situationPt,
    dialoguePrompt: situationPt,
    correctAnswer,
    options,
    explanation,
    speaker: "Situação",
  };
}

function toneStep(
  hanzi: string,
  pinyin: string,
  t: 1 | 2 | 3 | 4,
  assist: "guided" | "quiz" = "guided",
  toneChoices?: Array<1 | 2 | 3 | 4>
): LessonStep {
  return { kind: "tone", hanzi, pinyin, tone: t, assist, ...(toneChoices ? { toneChoices } : {}) };
}

function comprehend(hanzi: string, pinyin: string, answer: string, options: string[]): LessonStep {
  return { kind: "comprehend", hanzi, pinyin, answer, options };
}

function conversationScene(sceneId: string): LessonStep {
  const scene = conversationSceneStepFromId(sceneId);
  if (!scene) throw new Error(`conversation_scene desconhecida: ${sceneId}`);
  return {
    kind: "conversation_scene",
    title: scene.title,
    sceneId: scene.sceneId,
    setting: scene.setting,
    characters: scene.characters,
    lines: scene.lines,
    checkpoint: scene.checkpoint,
    nodes: scene.nodes,
    entryNodeId: scene.entryNodeId,
    sceneIntent: scene.intent,
    learnedRefs: scene.learnedRefs,
    newRefs: scene.newRefs,
  };
}

const PLANS: Record<string, Record<MasteryPass, LessonStep[]>> = {
  "p1-o-que-e-mandarim": {
    1: [
      intro(
        "Uma língua falada",
        "Mandarim é uma língua — a variedade padrão do chinês moderno que o Longyu ensina. Primeiro você vai ouvir um cumprimento; depois verá como som, escrita e significado se conectam."
      ),
      listen("你好", "nǐ hǎo", "Olá"),
      comprehend("你好", "nǐ hǎo", "Olá", ["Olá", "um número", "um nome", "uma pergunta"]),
      dialogue(
        "O som é a língua",
        "O que você acabou de ouvir em 你好?",
        "mandarim falado",
        ["mandarim falado", "uma tradução", "um alfabeto", "um desenho"],
        "O áudio é mandarim falado; pinyin, hànzì e tradução são camadas de apoio."
      ),
      dialogue(
        "Fala × escrita",
        "Mandarim, neste tema, é principalmente…",
        "uma língua falada",
        ["uma língua falada", "só um alfabeto latino", "só um conjunto de desenhos", "a tradução Olá"],
        "Você ouviu a língua. Pinyin e hànzì são outras camadas."
      ),
      dialogue(
        "O exemplo não é o tema",
        "你好 nesta aula serve para…",
        "mostrar a língua de verdade",
        ["mostrar a língua de verdade", "substituir o tema ‘o que é mandarim’", "ensinar só pinyin", "ensinar só hànzì"],
        "你好 é um exemplo da língua, não o título inteiro."
      ),
    ],
    2: [
      intro(
        "Quatro camadas",
        "O mesmo cumprimento aparece em quatro camadas: fala, pinyin, hànzì e tradução. Separe-as."
      ),
      match(
        "Combine as camadas",
        "O mesmo 你好 em quatro camadas.",
        [
          { left: "som que você ouviu", right: "mandarim falado", leftType: "pt", rightType: "pt" },
          { left: "nǐ hǎo", right: "pinyin (som escrito)", leftType: "pinyin", rightType: "pt" },
          { left: "你好", right: "hànzì (escrita)", leftType: "hanzi", rightType: "pt" },
          { left: "Olá", right: "tradução", leftType: "pt", rightType: "pt" },
        ],
        "Fala ≠ pinyin ≠ hànzì ≠ tradução."
      ),
      dialogue(
        "O que não é a língua falada",
        "Qual destes não é mandarim falado?",
        "nǐ hǎo escrito no papel",
        ["nǐ hǎo escrito no papel", "a voz dizendo 你好", "cumprimentar de ouvido", "a fala 你好"],
        "nǐ hǎo no papel é pinyin — mapa do som, não a fala."
      ),
      dialogue(
        "Hànzì também não é a fala",
        "你好 no papel é…",
        "escrita (hànzì)",
        ["escrita (hànzì)", "a língua falada", "a tradução", "um tom isolado"],
        "A forma escrita e a língua falada são camadas diferentes."
      ),
      listenSelect("Ouça de novo a língua", "你好", ["你好", "你", "好"], "你好", "Volte ao som: isso é mandarim."),
      dialogue(
        "Longyu ensina qual variedade?",
        "O Longyu ensina…",
        "mandarim, a variedade padrão do chinês moderno",
        [
          "mandarim, a variedade padrão do chinês moderno",
          "só pinyin como língua",
          "só hànzì sem som",
          "português com letras chinesas",
        ]
      ),
    ],
    3: [
      intro("Use a língua", "Agora recupere o cumprimento com menos apoio. O tema continua sendo a língua falada."),
      contextualChoice(
        "Use o mandarim falado",
        "Uma pessoa olha para você e diz 你好. O que você faz na língua falada?",
        "你好",
        ["你好", "ficar em silêncio", "Olá em português", "nǐ hǎo no papel"],
        "A resposta natural é devolver o mandarim falado."
      ),
      reverseRecall(
        "Recupere o mandarim",
        "Cumprimente de volta em mandarim, sem ler a tradução.",
        "你好",
        ["你好", "你好！"]
      ),
      withEquivalentAccepts({
        kind: "free_production",
        title: "Mandarim sem alternativas",
        situationPt: "A pessoa à sua frente espera um cumprimento. Diga em mandarim.",
        correctAnswer: "你好",
        answer: "你好",
        accepts: ["你好", "你好！", "你好。"],
        productionAssist: "guided",
        helpMode: "disabled",
        isNoHint: true,
      }),
      sentenceBuild(
        "Monte o mandarim que você fala",
        "Monte a frase falada em mandarim que você já ouviu.",
        ["你", "好"],
        ["好", "你", "？"]
      ),
      dialogue(
        "Som e intenção",
        "Quando alguém diz 你好, a intenção é…",
        "cumprimentar",
        ["cumprimentar", "pedir a conta", "soletrar pinyin", "traduzir para português"],
        "Língua falada carrega intenção, não só um som solto."
      ),
    ],
    4: [
      conversationScene("primeiro-cumprimento"),
      match(
        "Prove as quatro camadas",
        "Na conversa que você acabou de fazer, o que é cada coisa?",
        [
          { left: "o que você ouviu e falou", right: "mandarim falado", leftType: "pt", rightType: "pt" },
          { left: "nǐ hǎo", right: "pinyin", leftType: "pinyin", rightType: "pt" },
          { left: "你好", right: "hànzì", leftType: "hanzi", rightType: "pt" },
          { left: "Olá", right: "significado", leftType: "pt", rightType: "pt" },
        ],
        "Você usou as quatro camadas na prática."
      ),
      reverseRecall("Situação nova", "Você entra numa sala e a pessoa levanta a cabeça. Cumprimente em mandarim.", "你好", [
        "你好",
        "你好！",
      ]),
      dialogue(
        "O que é mandarim?",
        "No Longyu, mandarim é…",
        "a língua falada padrão que você acabou de usar",
        [
          "a língua falada padrão que você acabou de usar",
          "o alfabeto nǐ hǎo",
          "só os caracteres 你好",
          "a palavra Olá em português",
        ]
      ),
      contextualChoice(
        "Classifique de novo",
        "Alguém escreve nǐ hǎo num caderno. Isso é mandarim falado?",
        "não — é pinyin, o mapa do som",
        ["não — é pinyin, o mapa do som", "sim, é a língua falada", "é a tradução", "é um tom isolado"]
      ),
    ],
  },
  "p1-o-que-e-pinyin": {
    1: [
      intro(
        "Para que o pinyin existe",
        "Pinyin é um sistema de romanização: letras latinas que representam a pronúncia do mandarim. Não é tradução, não é hànzì e não é a língua. É o guia do som."
      ),
      listen("你好", "nǐ hǎo", "Olá"),
      dialogue(
        "Pinyin não traduz",
        "nǐ hǎo é…",
        "a pronúncia escrita, não a tradução",
        ["a pronúncia escrita, não a tradução", "a palavra Olá em português", "o hànzì 你好", "a língua mandarim inteira"],
        "Olá é significado. nǐ hǎo é pinyin."
      ),
      match(
        "Três linhas, três papéis",
        "Combine cada linha ao papel certo.",
        [
          { left: "你好", right: "hànzì (escrita)", leftType: "hanzi", rightType: "pt" },
          { left: "nǐ hǎo", right: "pinyin (pronúncia)", leftType: "pinyin", rightType: "pt" },
          { left: "Olá", right: "tradução", leftType: "pt", rightType: "pt" },
        ],
        "Áudio = mandarim falado. Pinyin só mapeia esse som."
      ),
      listenSelect(
        "Áudio → pinyin",
        "你好",
        ["nǐ hǎo", "nǐ", "hǎo"],
        "nǐ hǎo",
        "Você ouviu o mandarim; nǐ hǎo é o pinyin desse som.",
        "Qual pinyin escreve o que você ouviu?"
      ),
      dialogue(
        "Qual linha é pinyin?",
        "Qual destas linhas é pinyin?",
        "nǐ hǎo",
        ["nǐ hǎo", "你好", "Olá", "a voz falando"],
        "Letras latinas com marcas de tom = pinyin."
      ),
      dialogue(
        "Para que serve",
        "Pinyin serve principalmente para…",
        "guiar a pronúncia",
        ["guiar a pronúncia", "substituir hànzì para sempre", "traduzir para português", "ser a língua mandarim"],
        "É uma ponte para falar e ouvir."
      ),
    ],
    2: [
      intro(
        "Sílabas",
        "nǐ hǎo tem duas sílabas: nǐ e hǎo. No nível deste tema, basta ver inicial + final: n+i, h+ao. As letras nem sempre soam como no português."
      ),
      dialogue(
        "Duas sílabas",
        "Em nǐ hǎo, quantas sílabas o pinyin mostra?",
        "duas: nǐ e hǎo",
        ["duas: nǐ e hǎo", "uma letra só", "quatro traduções", "o hànzì inteiro"],
        "Cada sílaba do pinyin é um bloco de som."
      ),
      match(
        "Sílaba ↔ caractere",
        "Ligue cada sílaba do pinyin ao hànzì.",
        [
          { left: "nǐ", right: "你", leftType: "pinyin", rightType: "hanzi" },
          { left: "hǎo", right: "好", leftType: "pinyin", rightType: "hanzi" },
        ],
        "O pinyin recorta o som; o hànzì recorta a forma."
      ),
      listenSelect(
        "Ouça a primeira sílaba",
        "你",
        ["nǐ", "hǎo", "Olá"],
        "nǐ",
        "A primeira sílaba de nǐ hǎo é nǐ.",
        "Qual pinyin é esta sílaba?"
      ),
      listenSelect(
        "Ouça a segunda sílaba",
        "好",
        ["hǎo", "nǐ", "nǐ hǎo"],
        "hǎo",
        "h + ao forma hǎo. Não leia como se fosse português.",
        "Qual pinyin é esta sílaba?"
      ),
      dialogue(
        "Não é português",
        "Em hǎo, o h do pinyin…",
        "marca um som soprado, não o h mudo do português",
        [
          "marca um som soprado, não o h mudo do português",
          "é a tradução de ‘olá’",
          "é o hànzì 好",
          "não representa pronúncia",
        ]
      ),
      dialogue(
        "Pinyin × tradução",
        "Qual opção é pinyin, não tradução?",
        "nǐ",
        ["nǐ", "Olá", "você (só em português)", "a palavra ‘bom’"],
        "Se está em letras latinas com tom, é pinyin."
      ),
    ],
    3: [
      intro(
        "Marcas de tom",
        "No pinyin, as marcas ˉ ´ ˇ ` indicam o contorno da voz. Aqui a pergunta é: como o pinyin REGISTRA o tom — não dominar os quatro tons (isso vem nos temas de tom)."
      ),
      dialogue(
        "O que a marca faz",
        "O acento em nǐ e hǎo indica…",
        "o contorno tonal da sílaba",
        ["o contorno tonal da sílaba", "a tradução", "o número da lição", "que a palavra é formal"],
        "Sem a marca, o mapa do som fica ambíguo."
      ),
      match(
        "Marca e papel",
        "Combine o sinal ao que ele faz no pinyin.",
        [
          { left: "ˇ em nǐ", right: "marca o tom da sílaba", leftType: "pt", rightType: "pt" },
          { left: "nǐ hǎo sem marcas", right: "pinyin incompleto", leftType: "pinyin", rightType: "pt" },
        ],
        "ˉ ´ ˇ ` são o registro do tom no pinyin."
      ),
      listenSelect(
        "Ouça e escolha o pinyin com tom",
        "你好",
        ["nǐ hǎo", "ni hao", "ní hào"],
        "nǐ hǎo",
        "As marcas ˇ em nǐ e hǎo são o mapa do 3º tom.",
        "Qual pinyin registra o tom que você ouviu?"
      ),
      dialogue(
        "Qual marca você vê",
        "Em nǐ, a marca ˇ diz…",
        "o tom (contorno) dessa sílaba",
        ["o tom (contorno) dessa sílaba", "que se traduz ‘você’", "que é hànzì", "que não se pronuncia"],
      ),
      reverseRecall(
        "Leia o pinyin",
        "Alguém escreveu nǐ hǎo. Diga a frase em mandarim — o pinyin é o guia.",
        "你好",
        ["你好", "你好！"]
      ),
    ],
    4: [
      intro(
        "Usar e soltar",
        "Use o pinyin como ferramenta. Depois retire parte do mapa e prove que você ainda reconhece o som e a fala."
      ),
      contextualChoice(
        "Ferramenta, não destino",
        "Você vê nǐ hǎo numa placa de aula. Para que serve?",
        "guiar a pronúncia de 你好",
        ["guiar a pronúncia de 你好", "substituir hànzì para sempre", "traduzir para inglês", "ser a língua mandarim"]
      ),
      match(
        "Ainda o mapa",
        "Ligue cada sílaba do pinyin ao hànzì, sem a tradução no meio.",
        [
          { left: "nǐ", right: "你", leftType: "pinyin", rightType: "hanzi" },
          { left: "hǎo", right: "好", leftType: "pinyin", rightType: "hanzi" },
        ],
        "Pinyin aponta o som; hànzì é a forma."
      ),
      listenSelect(
        "Agora sem o pinyin nas opções",
        "你好",
        ["你好", "你", "好"],
        "你好",
        "O áudio é a língua; você reconhece sem ler nǐ hǎo."
      ),
      reverseRecall(
        "Sem o mapa inteiro",
        "A pessoa espera um cumprimento. Fale, mesmo sem ver o pinyin.",
        "你好",
        ["你好", "你好！"]
      ),
      dialogue(
        "O que as marcas indicam?",
        "No pinyin, ˉ ´ ˇ ` indicam…",
        "o tom da sílaba",
        ["o tom da sílaba", "a tradução", "o hànzì", "pontuação portuguesa"]
      ),
      dialogue(
        "Diferença de hànzì",
        "Qual é pinyin e qual é hànzì?",
        "nǐ hǎo é pinyin; 你好 é hànzì",
        ["nǐ hǎo é pinyin; 你好 é hànzì", "os dois são tradução", "os dois são a língua falada", "hànzì é só tom"],
      ),
    ],
  },
  "p1-o-que-e-tom": {
    1: [
      intro(
        "A curva faz parte da palavra",
        "Em mandarim o contorno da voz não é emoção nem volume: faz parte da palavra. Ouça só a diferença entre reta alta e vale."
      ),
      toneStep("妈", "mā", 1, "guided", [1, 3]),
      toneStep("马", "mǎ", 3, "guided", [1, 3]),
      listenSelect(
        "Qual ficou reto?",
        "妈",
        ["妈", "马"],
        "妈",
        "mā fica alto e reto. Esse contorno se chama 1º tom."
      ),
      listenSelect(
        "Agora encontre o vale",
        "马",
        ["妈", "马"],
        "马",
        "mǎ faz o vale do 3º tom. Na fala natural, esse vale pode ficar mais baixo e curto."
      ),
      dialogue(
        "O que é um tom?",
        "Em mandarim, tom é…",
        "o contorno da voz que faz parte da palavra",
        [
          "o contorno da voz que faz parte da palavra",
          "só o volume",
          "a tradução em português",
          "o número da lição",
        ]
      ),
      dialogue(
        "Não é só um número",
        "Quando dizemos ‘3º tom’, estamos falando de…",
        "um contorno (um vale na voz)",
        ["um contorno (um vale na voz)", "um ranking de dificuldade", "uma estrela", "um hànzì extra"],
      ),
    ],
    2: [
      intro("Duas curvas novas", "Você já conhece a reta e o vale. Agora ouça uma curva que sobe e outra que cai."),
      toneStep("麻", "má", 2, "guided", [1, 2]),
      toneStep("骂", "mà", 4, "guided", [2, 4]),
      listenSelect("Qual curva sobe?", "麻", ["麻", "骂"], "麻", "má sobe: é o 2º tom."),
      listenSelect("Qual curva cai?", "骂", ["麻", "骂"], "骂", "mà cai: é o 4º tom."),
      dialogue(
        "1º × 2º",
        "Qual comparação está correta?",
        "1º fica reto; 2º sobe",
        ["1º fica reto; 2º sobe", "1º sobe; 2º cai", "os dois fazem vale", "os dois são neutros"]
      ),
      dialogue(
        "3º × 4º",
        "Qual comparação está correta?",
        "3º faz o vale; 4º cai",
        ["3º faz o vale; 4º cai", "3º fica reto; 4º sobe", "os dois sobem", "os dois são volume"]
      ),
    ],
    3: [
      intro("Reconheça os quatro", "Agora as quatro curvas já foram apresentadas. Ouça primeiro; depois associe contorno, número e marca."),
      toneStep("妈", "mā", 1, "quiz", [1, 2, 3, 4]),
      toneStep("麻", "má", 2, "quiz", [1, 2, 3, 4]),
      toneStep("马", "mǎ", 3, "quiz", [1, 2, 3, 4]),
      toneStep("骂", "mà", 4, "quiz", [1, 2, 3, 4]),
      intro("Mapa das marcas", "No pinyin: ˉ marca o 1º tom, ´ marca o 2º, ˇ marca o 3º e ` marca o 4º."),
      dialogue(
        "Marca e tom",
        "Qual mapa está correto?",
        "ˉ = 1º · ´ = 2º · ˇ = 3º · ` = 4º",
        [
          "ˉ = 1º · ´ = 2º · ˇ = 3º · ` = 4º",
          "ˉ = 4º · ´ = 3º · ˇ = 2º · ` = 1º",
          "todas as marcas são volume",
          "a marca substitui o hànzì",
        ]
      ),
    ],
    4: [
      intro(
        "Tons em palavras reais",
        "Leve as quatro curvas para palavras conhecidas. Em fala natural, 你好 é escrito nǐ hǎo e costuma soar ní hǎo."
      ),
      listenSelect("你好 de ouvido", "你好", ["你好", "妈", "马"], "你好", "Leve o contorno para um chunk conhecido."),
      toneStep("好", "hǎo", 3, "quiz", [1, 2, 3, 4]),
      toneStep("骂", "mà", 4, "quiz", [1, 2, 3, 4]),
      dialogue(
        "Produção com contorno",
        "Para dizer 你好, o que precisa viajar junto com as sílabas?",
        "os contornos dos tons",
        ["os contornos dos tons", "só o volume", "uma tradução visível", "um número sem som"]
      ),
      listen("你好", "nǐ hǎo", "Olá — ouça o contorno, não só as letras"),
      reverseRecall("Diga com o contorno", "Cumprimente. O tom faz parte da palavra.", "你好", ["你好", "你好！"]),
    ],
  },
  "p1-o-que-e-hanzi": {
    1: [
      intro(
        "Sistema de escrita",
        "Hànzì são os caracteres do chinês escrito. Pinyin mostra o som (nǐ hǎo); hànzì mostra a forma: 你好. Um caractere tem forma, som e função — e não é automaticamente uma palavra inteira."
      ),
      listen("你好", "nǐ hǎo", "Olá"),
      dialogue(
        "O que é um caractere?",
        "Em 你好, 你 é…",
        "um caractere (peça escrita)",
        ["um caractere (peça escrita)", "o pinyin inteiro", "a tradução", "um tom"],
        "Caractere ≠ automaticamente uma palavra inteira."
      ),
      dialogue(
        "Reconheça 好",
        "Em 你好, qual caractere é 好?",
        "好",
        ["好", "你", "你好"]
      ),
      match(
        "Forma e papel",
        "Combine o hànzì ao que ele é.",
        [
          { left: "你", right: "caractere (forma escrita)", leftType: "hanzi", rightType: "pt" },
          { left: "nǐ", right: "pinyin (som)", leftType: "pinyin", rightType: "pt" },
        ]
      ),
      listenSelect("Veja e ouça 你好", "你好", ["你好", "你", "好"], "你好", "A forma escrita e o som andam juntos, mas não são a mesma camada."),
      dialogue(
        "Hànzì não é pinyin",
        "Qual linha é hànzì?",
        "你好",
        ["你好", "nǐ hǎo", "Olá", "a voz falando"]
      ),
    ],
    2: [
      intro(
        "Caractere × palavra",
        "你好 tem dois caracteres e é uma palavra. Caracteres têm componentes que ajudam a reconhecer a forma."
      ),
      dialogue(
        "Peça e palavra",
        "你好 tem dois caracteres. Isso significa duas palavras?",
        "não necessariamente — juntos formam uma palavra",
        ["não necessariamente — juntos formam uma palavra", "sim, sempre duas palavras", "não tem hànzì aqui", "só pinyin conta"]
      ),
      match(
        "Peças de 你好",
        "Combine caractere e papel na palavra.",
        [
          { left: "你", right: "primeira peça de 你好", leftType: "hanzi", rightType: "pt" },
          { left: "好", right: "segunda peça de 你好", leftType: "hanzi", rightType: "pt" },
        ],
        "Duas peças escritas, uma palavra."
      ),
      dialogue(
        "Componentes",
        "Reconhecer hànzì fica mais fácil quando você…",
        "nota as peças/componentes da forma",
        ["nota as peças/componentes da forma", "ignora a forma e lê só Olá", "trata pinyin como hànzì", "conta os tons"]
      ),
      dialogue(
        "Forma, som, função",
        "Um caractere como 你 tem…",
        "forma escrita, um som, e uma função na palavra",
        ["forma escrita, um som, e uma função na palavra", "só tradução", "só tom", "só pinyin"]
      ),
      match(
        "Camadas de novo",
        "Separe escrita e som.",
        [
          { left: "你好", right: "hànzì", leftType: "hanzi", rightType: "pt" },
          { left: "nǐ hǎo", right: "pinyin", leftType: "pinyin", rightType: "pt" },
        ]
      ),
    ],
    3: [
      intro("Reconhecer e montar", "Agora você monta a palavra a partir dos caracteres — a prova de que viu as peças."),
      sentenceBuild("Monte 你好", "Monte a palavra com os caracteres.", ["你", "好"], ["好", "你", "？"]),
      dialogue("Qual é o primeiro caractere?", "O primeiro caractere (peça escrita) de 你好 é…", "你", ["你", "好", "你好"]),
      dialogue("Qual é o segundo caractere?", "O segundo caractere (peça escrita) de 你好 é…", "好", ["好", "你", "你好"]),
      dialogue(
        "Quais dois caracteres?",
        "A palavra de cumprimento em hànzì. Quais dois caracteres?",
        "你好",
        ["你好", "你", "好", "nǐ hǎo"]
      ),
      listenSelect("Reconheça no áudio", "你好", ["你好", "你", "好"], "你好"),
    ],
    4: [
      intro("Menos pinyin", "Uma mensagem chega só com 你好. Você reconhece a escrita no contexto, sem depender do mapa nǐ hǎo."),
      listenSelect(
        "Leia o hànzì com menos pinyin",
        "你好",
        ["你好", "你", "好"],
        "你好",
        "A forma escrita continua sendo hànzì, mesmo sem nǐ hǎo na tela."
      ),
      contextualChoice(
        "Na mensagem",
        "Chega uma mensagem só com o hànzì 你好, sem pinyin. O que é?",
        "o cumprimento que você já fala",
        ["o cumprimento que você já fala", "um número", "pinyin", "um tom isolado"]
      ),
      dialogue(
        "Caractere ainda é caractere",
        "Se o pinyin some, 你 e 好 continuam sendo…",
        "caracteres do sistema de escrita",
        ["caracteres do sistema de escrita", "só tom", "só tradução", "o alfabeto latino"]
      ),
      dialogue(
        "Sem o mapa",
        "Se o pinyin some, o hànzì 你好 ainda…",
        "é a forma escrita da palavra que você conhece",
        ["é a forma escrita da palavra que você conhece", "deixa de existir", "vira tradução", "vira só tom"]
      ),
      dialogue(
        "Qual hànzì na tela?",
        "Alguém acena. Qual hànzì você leria na tela?",
        "你好",
        ["你好", "你", "好", "nǐ hǎo"]
      ),
      match(
        "Prova final",
        "Hànzì × pinyin × sentido.",
        [
          { left: "你好", right: "escrita", leftType: "hanzi", rightType: "pt" },
          { left: "nǐ hǎo", right: "pinyin", leftType: "pinyin", rightType: "pt" },
          { left: "Olá", right: "significado", leftType: "pt", rightType: "pt" },
        ]
      ),
    ],
  },
  "p1-primeiros-hanzi": {
    1: [
      intro("Peças visuais, não desenhos aleatórios", "Você vai observar a forma, ouvir o som e conhecer o sentido antes de montar cada hànzì. Comece com 木: tronco, copa e galhos."),
      listen("木", "mù", "árvore / madeira"),
      intro("Note a forma de 木", "O traço vertical lembra o tronco; os traços laterais lembram galhos. Agora monte com o modelo guiando você."),
      hanziBuild("hb-mu-fragments", "Monte 木 com apoio", "Encaixe os traços da árvore.", "木", "árvore / madeira"),
      listen("人", "rén", "pessoa"),
      intro("Note a forma de 人", "Dois traços apoiados formam 人. Veja o modelo antes de montar."),
      hanziBuild("hb-ren-fragments", "Monte 人 com apoio", "Encaixe os dois traços de pessoa.", "人", "pessoa"),
    ],
    2: [
      intro("Contornos simples", "Agora você reconhece e monta dois contornos já apresentados: 口, uma boca aberta, e 日, sol ou dia."),
      listen("口", "kǒu", "boca"),
      intro("Note 口", "Quatro lados fecham a forma de uma boca. Observe antes de montar."),
      hanziBuild("hb-kou-fragments", "Monte 口", "Feche o contorno da boca.", "口", "boca"),
      listen("日", "rì", "sol / dia"),
      intro("Note 日", "日 é um contorno com uma linha no meio. Monte depois de observar."),
      hanziBuild("hb-ri-fragments", "Monte 日", "Monte o hànzì de sol e dia.", "日", "sol / dia"),
      match("Reconheça as formas", "Ligue somente itens que você acabou de aprender.", [
        { left: "口", right: "boca", leftType: "hanzi", rightType: "pt" },
        { left: "日", right: "sol / dia", leftType: "hanzi", rightType: "pt" },
      ]),
    ],
    3: [
      intro("Formas da natureza", "Você vai observar 月 e 山 antes de recuperar e montar as formas com menos ajuda."),
      hanziBuild("hb-mu-fragments", "Recupere 木", "Monte novamente o hànzì de árvore, agora com menos apoio.", "木", "árvore / madeira"),
      listen("月", "yuè", "lua / mês"),
      intro("Note 月", "O contorno estreito e os dois traços internos diferenciam 月 de 日."),
      hanziBuild("hb-yue-fragments", "Monte 月", "Monte o hànzì de lua e mês.", "月", "lua / mês"),
      listen("山", "shān", "montanha"),
      intro("Note 山", "Três picos sobre uma base formam 山."),
      hanziBuild("hb-shan-fragments", "Monte 山", "Monte os três picos da montanha.", "山", "montanha"),
      match("Diferencie sem surpresa", "Ligue cada forma ao sentido já apresentado.", [
        { left: "月", right: "lua / mês", leftType: "hanzi", rightType: "pt" },
        { left: "山", right: "montanha", leftType: "hanzi", rightType: "pt" },
        { left: "日", right: "sol / dia", leftType: "hanzi", rightType: "pt" },
      ]),
    ],
    4: [
      intro("Transfira a lógica visual", "Observe quatro formas novas uma a uma. Cada montagem vem somente depois de som, significado e pista visual."),
      listen("水", "shuǐ", "água"),
      intro("Note 水", "Um traço central e gotas laterais organizam a forma de 水."),
      hanziBuild("hb-shui-fragments", "Monte 水", "Monte o hànzì de água.", "水", "água"),
      listen("火", "huǒ", "fogo"),
      intro("Note 火", "As faíscas e as duas pernas da chama organizam 火."),
      hanziBuild("hb-huo-fragments", "Monte 火", "Monte o hànzì de fogo.", "火", "fogo"),
      listen("大", "dà", "grande"),
      intro("Note 大", "Um traço horizontal e dois traços abertos lembram uma pessoa com os braços bem abertos."),
      hanziBuild("hb-da-fragments", "Monte 大", "Abra os braços da forma grande.", "大", "grande"),
      listen("小", "xiǎo", "pequeno"),
      intro("Note 小", "Um traço central com dois pontos menores organiza a forma de 小."),
      hanziBuild("hb-xiao-fragments", "Monte 小", "Monte a forma pequena.", "小", "pequeno"),
      match("Feche o primeiro mapa visual", "Ligue apenas as formas ensinadas nesta sessão.", [
        { left: "水", right: "água", leftType: "hanzi", rightType: "pt" },
        { left: "火", right: "fogo", leftType: "hanzi", rightType: "pt" },
        { left: "大", right: "grande", leftType: "hanzi", rightType: "pt" },
        { left: "小", right: "pequeno", leftType: "hanzi", rightType: "pt" },
      ]),
    ],
  },
};

const TARGETS_BY_FOUNDATION_LESSON: Record<string, string[]> = {
  "p1-o-que-e-mandarim": [FOUNDATION_TARGET_IDS.mandarin, FOUNDATION_TARGET_IDS.nihao, FOUNDATION_TARGET_IDS.greetingIntent],
  "p1-o-que-e-pinyin": [FOUNDATION_TARGET_IDS.pinyin, FOUNDATION_TARGET_IDS.nihao],
  "p1-o-que-e-tom": [FOUNDATION_TARGET_IDS.tone],
  "p1-o-que-e-hanzi": [FOUNDATION_TARGET_IDS.hanzi, FOUNDATION_TARGET_IDS.ni, FOUNDATION_TARGET_IDS.hao],
  "p1-primeiros-hanzi": [FOUNDATION_TARGET_IDS.components],
};

const GRADED_KINDS = new Set([
  "tone", "comprehend", "recognize", "match_pairs", "listen_select", "sentence_build", "translation_build",
  "fill_blank", "dialogue_choice", "conversation_scene", "hanzi_build", "contextual_choice", "reverse_recall",
  "free_production", "transfer_task", "conversation_repair",
]);

function rungFor(step: LessonStep, pass: MasteryPass, index: number): PedagogicalRung {
  if (step.kind === "intro") return index === 0 ? "ORIENT" : "NOTICE";
  if (step.kind === "listen") return pass === 1 ? "NOTICE" : "EXPOSE";
  if (step.kind === "flashcard") return "EXPOSE";
  if (step.kind === "hanzi_build" || step.kind === "sentence_build") return "ASSEMBLY";
  if (step.kind === "free_production" || step.kind === "produce") return "PRODUCTION";
  if (step.kind === "transfer_task" || step.kind === "conversation_scene") return "TRANSFER";
  if (step.kind === "reverse_recall" || pass >= 3) return "RECALL";
  if (pass === 1 || step.assist === "guided") return "GUIDED_RECOGNITION";
  return "DISCRIMINATION";
}

function annotateFoundationPlan(lessonId: string, pass: MasteryPass, steps: LessonStep[]): LessonStep[] {
  const targets = TARGETS_BY_FOUNDATION_LESSON[lessonId] ?? [];
  return steps.map((step, index) => {
    const serialized = [step.title, step.body, step.prompt, step.dialoguePrompt, step.explanation, step.pinyin, ...(step.options ?? [])]
      .filter(Boolean)
      .join(" ");
    const toneTargets = lessonId === "p1-o-que-e-tom"
      ? ([1, 2, 3, 4] as const)
          .filter((tone) => {
            // Only the explicit tone-mark glyph counts here. Accented vowels also
            // occur naturally in Portuguese prose and caused false target matches.
            const markPattern = tone === 1 ? "ˉ" : tone === 2 ? "´" : tone === 3 ? "ˇ" : "`";
            return step.tone === tone || step.toneChoices?.includes(tone) || new RegExp(`${tone}(?:º|st|nd|rd|th)?\\s*(?:tom|tone)|${markPattern}`, "iu").test(serialized);
          })
          .map((tone) => FOUNDATION_TARGET_IDS[`tone${tone}` as "tone1" | "tone2" | "tone3" | "tone4"])
      : [];
    return withPedagogicalEvidence(step, {
      rung: rungFor(step, pass, index),
      knowledgeTargetIds: knowledgeTargetIdsForStep(step, [...targets, ...toneTargets]),
      exposureStrength: step.kind === "listen" || (step.kind === "tone" && step.assist === "guided") ? "MULTIMODAL" : step.kind === "intro" ? "ORIENTATION" : "GUIDED_PRACTICE",
      primaryDifficulty: step.kind === "listen" || step.kind === "tone" ? "SOUND" : step.kind.includes("hanzi") || step.kind === "recognize" ? "FORM" : step.kind.includes("production") || step.kind === "reverse_recall" ? "PRODUCTION" : "MEANING",
      hiddenSkillRequirements: [],
      distractorSafety: step.options?.length ? (pass === 1 ? "CONTROLLED_UNKNOWN" : "KNOWN_TARGET") : "NOT_APPLICABLE",
      graded: GRADED_KINDS.has(step.kind) && !(step.kind === "tone" && step.assist === "guided"),
    });
  });
}

export function foundationAuthoredPlanFor(lessonId: string, pass: MasteryPass): LessonStep[] | null {
  const plan = PLANS[lessonId]?.[pass];
  return plan ? annotateFoundationPlan(lessonId, pass, plan) : null;
}

export function hasFoundationAuthoredPlan(lessonId: string): boolean {
  return Boolean(PLANS[lessonId]);
}

export function conceptFoundationLessonIds(): string[] {
  return Object.keys(PLANS).filter((id) => isConceptFoundationTopic(id));
}
