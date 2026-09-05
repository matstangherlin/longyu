import type { LessonCapsule, LessonCapsuleLocalizedContent } from "./lessonCapsules";
import { FOUNDATION_TARGET_IDS } from "./pedagogicalSpine";

/**
 * V4.9.3 — as cinco aulas da fundação.
 *
 * Até aqui o Longyu tinha a máquina de ensinar e quase nenhuma aula. O aluno
 * novo caía direto em exercícios e a primeira experiência era de prova, não de
 * aula. Estas cinco cápsulas invertem isso: antes de qualquer cobrança, o
 * dragão explica o que é a língua, como se escreve o som dela, o que o som
 * carrega, como se escreve a língua, e como essa escrita é montada.
 *
 * Três regras guiaram a autoria, e as três aparecem no texto:
 *
 * 1. **Nada de material desconhecido, nem nos distratores.** Toda alternativa
 *    de microcheck está no idioma da instrução ou já foi mostrada na tela
 *    imediatamente acima. Um distrator em chinês que o aluno nunca viu
 *    transformaria a verificação de compreensão numa adivinhação — o defeito
 *    que a Parte N1 chama de surpresa.
 *
 * 2. **O microcheck não pune.** Errar aqui não tira ponto, não move SRS e não
 *    mexe em mastery: significa que a explicação não pegou, e a resposta do
 *    dragão reensina em uma frase. Quem erra precisa de mais aula, não de
 *    menos pontos.
 *
 * 3. **A aula termina entregando o aluno a uma prática.** O último segmento
 *    diz o que vem a seguir e por quê. Sem isso a aula vira vídeo institucional
 *    e o Longyu vira curso passivo — exatamente o que a Parte I proíbe.
 *
 * PT e EN não são tradução literal um do outro: as explicações usam a
 * intuição de cada idioma. O que não muda em hipótese alguma é o chinês, os
 * knowledge targets e o que conta como concluir — a Parte T.
 */

const F = FOUNDATION_TARGET_IDS;

/** Cada aula fica entre 1 e 3 minutos: a Parte I pede aula curta, não palestra. */
const MINUTE = 60;

// ── F1 — O que é mandarim? ────────────────────────────────────────────────

const mandarimPt: LessonCapsuleLocalizedContent = {
  title: "O que é mandarim?",
  objective: "Entender o que você está aprendendo antes de ser perguntado sobre isso.",
  transcript: [
    "Bem-vindo. Antes de responder qualquer coisa, quero te mostrar como o mandarim funciona.",
    "Mandarim é uma língua falada — na China e em comunidades chinesas pelo mundo todo. É a língua materna de mais gente do que qualquer outra.",
    "Escute: 你好. Isso significa Olá.",
    "Repare que há três coisas aqui, e elas são diferentes entre si. 你好 é a escrita, chamada hànzì. nǐ hǎo mostra como se pronuncia, e chama-se pinyin. Olá é o significado.",
    "Você não precisa acertar nada ainda. Só precisa saber que, daqui em diante, sempre que aparecer um mandarim novo, essas três camadas vão estar lá.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "Antes de qualquer pergunta",
      body: "Bem-vindo. Antes de responder qualquer coisa, quero te mostrar como o mandarim funciona.",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "O que é mandarim",
      body: "Mandarim é uma língua falada — na China e em comunidades chinesas pelo mundo todo. É a língua materna de mais gente do que qualquer outra no planeta.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "Ouça primeiro",
      body: "Toque para ouvir. Não tente decorar; só escute como soa.",
      hanzi: "你好",
      audioText: "你好",
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Três coisas, não uma",
      body: "你好 é a escrita, chamada hànzì. nǐ hǎo mostra a pronúncia, e chama-se pinyin. Olá é o significado. Sempre que aparecer mandarim novo, essas três camadas vão estar lá.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Olá",
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Só para confirmar",
      body: "Isto não vale ponto. É só para eu saber se ficou claro.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      check: {
        prompt: "O que 你好 significa?",
        // Os distratores são palavras em português: nada aqui exige um
        // chinês que o aluno ainda não viu.
        options: ["Olá", "Obrigado", "Até logo"],
        correctIndex: 0,
        scaffold: "A resposta está na tela anterior — e continua aqui em cima.",
        afterCorrect: "Isso. 你好 é Olá. Você acabou de aprender sua primeira palavra em mandarim.",
        afterWrong: "Ainda não. 你好 é Olá — está escrito bem aí em cima, junto com o som nǐ hǎo.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Agora é sua vez",
      body: "Você já sabe o que vai aprender e já ouviu sua primeira palavra. Agora vamos treinar reconhecer 你好 quando ele aparecer.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Olá",
    },
  ],
};

const mandarimEn: LessonCapsuleLocalizedContent = {
  title: "What is Mandarin?",
  objective: "Understand what you are learning before anyone asks you about it.",
  transcript: [
    "Welcome. Before you answer anything, I want to show you how Mandarin works.",
    "Mandarin is a spoken language — in China and in Chinese communities around the world. More people speak it as a first language than any other.",
    "Listen: 你好. It means Hello.",
    "Notice there are three different things here. 你好 is the writing, called hànzì. nǐ hǎo shows how it sounds, and it is called pinyin. Hello is the meaning.",
    "You do not have to get anything right yet. You just need to know that from here on, every new piece of Mandarin will have those three layers.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "Before any question",
      body: "Welcome. Before you answer anything, I want to show you how Mandarin works.",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "What Mandarin is",
      body: "Mandarin is a spoken language — in China and in Chinese communities around the world. More people speak it as a first language than any other on Earth.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "Listen first",
      body: "Tap to listen. Don't try to memorise it; just hear how it sounds.",
      hanzi: "你好",
      audioText: "你好",
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Three things, not one",
      body: "你好 is the writing, called hànzì. nǐ hǎo shows the pronunciation, and it is called pinyin. Hello is the meaning. Every new piece of Mandarin will carry those three layers.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Hello",
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Just to be sure",
      body: "This is not scored. I only want to know whether that landed.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      check: {
        prompt: "What does 你好 mean?",
        options: ["Hello", "Thank you", "Goodbye"],
        correctIndex: 0,
        scaffold: "The answer is on the screen before this one — and still up there.",
        afterCorrect: "That's it. 你好 is Hello. You have just learned your first word in Mandarin.",
        afterWrong: "Not quite. 你好 is Hello — it's right up there, next to the sound nǐ hǎo.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Your turn now",
      body: "You know what you're learning, and you've heard your first word. Now let's practise recognising 你好 when it shows up.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Hello",
    },
  ],
};

export const FOUNDATION_MANDARIN_CAPSULE: LessonCapsule = {
  id: "capsule:foundation:mandarin:v1",
  topicId: "p1-o-que-e-mandarim",
  mediaType: "ANIMATED_CAPSULE",
  durationSeconds: 1.5 * MINUTE,
  completionRule: "VIEW_ALL_SEGMENTS",
  knowledgeTargets: [F.mandarin, F.greetingIntent, F.nihao],
  localized: { "pt-BR": mandarimPt, en: mandarimEn },
};

// ── F2 — O que é Pinyin? ──────────────────────────────────────────────────

const pinyinPt: LessonCapsuleLocalizedContent = {
  title: "O que é Pinyin?",
  objective: "Entender que pinyin escreve o som do mandarim, e não o significado.",
  transcript: [
    "Você já ouviu 你好. Agora quero te mostrar a ferramenta que vai te ajudar a pronunciar tudo o que vier depois.",
    "O mandarim se escreve com hànzì, e o hànzì não diz como se pronuncia. Então existe o pinyin: letras latinas que registram o som.",
    "你好 se pronuncia nǐ hǎo. As letras são as mesmas que você já usa para ler; o que muda é o valor de algumas delas, e as marquinhas em cima das vogais.",
    "Cuidado com uma confusão comum: pinyin não é tradução. A tradução de 你好 é Olá. nǐ hǎo não é a tradução — é o som.",
    "Pinyin é um mapa. Ele te leva à pronúncia; ele não é o lugar.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "A ferramenta da pronúncia",
      body: "Você já ouviu 你好. Agora quero te mostrar a ferramenta que vai te ajudar a pronunciar tudo o que vier depois.",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "Por que o pinyin existe",
      body: "O mandarim se escreve com hànzì, e olhar para um hànzì não diz como pronunciá-lo. O pinyin resolve isso: letras latinas que registram o som.",
      hanzi: "你好",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "O mesmo 你好, agora com o som escrito",
      body: "Ouça e acompanhe as letras. As marquinhas em cima das vogais fazem parte do som — você vai entendê-las na próxima aula.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      audioText: "你好",
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Pinyin não é tradução",
      body: "Esta é a confusão mais comum de quem começa. A tradução de 你好 é Olá. nǐ hǎo não traduz nada — mostra como soa. Pinyin é um mapa: leva você à pronúncia, mas não é o lugar.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Olá",
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Só para confirmar",
      body: "Isto não vale ponto.",
      hanzi: "你好",
      check: {
        prompt: "Qual destes é o pinyin de 你好?",
        // As três alternativas já apareceram nesta aula: nenhuma exige
        // conhecimento novo, e a escolha é entre camadas, que é o ponto.
        options: ["nǐ hǎo", "Olá", "你好"],
        correctIndex: 0,
        scaffold: "Pinyin é o som. Olá é o significado. 你好 é a escrita.",
        afterCorrect: "Exato. nǐ hǎo é o som; Olá é o significado; 你好 é a escrita.",
        afterWrong: "Quase. Olá é o significado e 你好 é a escrita — o pinyin, o som, é nǐ hǎo.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Vamos treinar o ouvido",
      body: "Agora que você sabe o que o pinyin faz, vale praticar ler algumas sílabas em voz alta e comparar com o áudio.",
      pinyin: "nǐ hǎo",
    },
  ],
};

const pinyinEn: LessonCapsuleLocalizedContent = {
  title: "What is Pinyin?",
  objective: "Understand that pinyin writes the sound of Mandarin, not its meaning.",
  transcript: [
    "You have heard 你好. Now let me show you the tool that will help you pronounce everything that comes next.",
    "Mandarin is written with hànzì, and a hànzì does not tell you how to say it. So pinyin exists: Latin letters that record the sound.",
    "你好 is pronounced nǐ hǎo. The letters are the ones you already read; what changes is the value of a few of them, and the small marks above the vowels.",
    "Watch out for a common mix-up: pinyin is not a translation. The translation of 你好 is Hello. nǐ hǎo is not the translation — it is the sound.",
    "Pinyin is a map. It takes you to the pronunciation; it is not the place.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "The pronunciation tool",
      body: "You have heard 你好. Now let me show you the tool that will help you pronounce everything that comes next.",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "Why pinyin exists",
      body: "Mandarin is written with hànzì, and looking at a hànzì does not tell you how to say it. Pinyin fixes that: Latin letters that record the sound.",
      hanzi: "你好",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "The same 你好, with the sound written down",
      body: "Listen and follow the letters. The marks above the vowels are part of the sound — the next lesson explains them.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      audioText: "你好",
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Pinyin is not a translation",
      body: "This is the most common beginner mix-up. The translation of 你好 is Hello. nǐ hǎo translates nothing — it shows how it sounds. Pinyin is a map: it takes you to the pronunciation, but it is not the place.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Hello",
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Just to be sure",
      body: "This is not scored.",
      hanzi: "你好",
      check: {
        prompt: "Which of these is the pinyin for 你好?",
        options: ["nǐ hǎo", "Hello", "你好"],
        correctIndex: 0,
        scaffold: "Pinyin is the sound. Hello is the meaning. 你好 is the writing.",
        afterCorrect: "Exactly. nǐ hǎo is the sound; Hello is the meaning; 你好 is the writing.",
        afterWrong: "Close. Hello is the meaning and 你好 is the writing — the pinyin, the sound, is nǐ hǎo.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Let's train your ear",
      body: "Now that you know what pinyin does, it's worth reading a few syllables out loud and comparing them with the audio.",
      pinyin: "nǐ hǎo",
    },
  ],
};

export const FOUNDATION_PINYIN_CAPSULE: LessonCapsule = {
  id: "capsule:foundation:pinyin:v1",
  topicId: "p1-o-que-e-pinyin",
  mediaType: "ANIMATED_CAPSULE",
  durationSeconds: 1.5 * MINUTE,
  completionRule: "VIEW_ALL_SEGMENTS",
  knowledgeTargets: [F.pinyin],
  localized: { "pt-BR": pinyinPt, en: pinyinEn },
};

// ── F3 — O que são tons? ──────────────────────────────────────────────────
//
// A Parte E1 pede progressão em vez de despejo: 1º × 3º, depois 2º × 4º,
// depois o mapa. Isso acontece em segmentos desta mesma cápsula, e não numa
// segunda aula — o aluno recebe dois contornos de cada vez sem sair da aula.
//
// As sílabas de exemplo são vogais soltas, de propósito. Usar mā/má/mǎ/mà com
// significado exigiria quatro palavras que o aluno nunca viu, e a aula sobre
// movimento do som viraria uma aula de vocabulário escondida.

const tonePt: LessonCapsuleLocalizedContent = {
  title: "O que são tons?",
  objective: "Ouvir que o movimento do som muda a palavra, e reconhecer as quatro marcas.",
  transcript: [
    "Em português, subir ou descer a voz muda a intenção: você fala igual, mas pergunta ou afirma. Em mandarim isso vai mais longe: o movimento da voz muda a palavra.",
    "Vamos com dois de cada vez. O primeiro tom é alto e reto, e a marca é uma barrinha: ā. O terceiro desce e volta, e a marca tem forma de vale: ǎ.",
    "Você já viu essa marca. Em nǐ hǎo há dois acentos em forma de vale — as duas sílabas são terceiro tom.",
    "Agora os outros dois. O segundo sobe, como quem pergunta: á. O quarto cai, firme, como quem dá uma ordem curta: à.",
    "Não precisa saber o que essas sílabas significam. Repare só no movimento — é ele que você vai treinar.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "A voz que muda a palavra",
      body: "Em português, subir ou descer a voz muda a intenção: a mesma frase vira pergunta ou afirmação. Em mandarim isso vai mais longe.",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "O movimento faz parte da palavra",
      body: "Em mandarim, mudar o movimento da voz não muda só o tom da conversa: muda a palavra. Por isso cada sílaba vem com uma marca que diz como a voz se move.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "Primeiro os dois mais distantes: 1º e 3º",
      body: "O primeiro tom é alto e reto — a voz não sobe nem desce. O terceiro desce e volta. São os dois mais fáceis de separar, por isso começam juntos.",
      pinyin: "ā  ·  ǎ",
      toneContour: 1,
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Você já viu essa marca",
      body: "Olhe de novo para nǐ hǎo. Os dois acentos têm forma de vale: as duas sílabas são terceiro tom. Você já vinha usando tom desde a primeira aula, sem saber o nome.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      toneContour: 3,
    },
    {
      id: "compare",
      kind: "COMPARE",
      title: "Agora os outros dois: 2º e 4º",
      body: "O segundo sobe, como quem faz uma pergunta curta. O quarto cai, firme, como quem dá uma ordem. Não tente decorar significados — repare no movimento.",
      pinyin: "á  ·  à",
      toneContour: 2,
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Só para confirmar",
      body: "Isto não vale ponto.",
      check: {
        prompt: "Qual marca indica o tom que SOBE?",
        options: ["á", "ā", "ǎ"],
        correctIndex: 0,
        scaffold: "Barrinha reta é alto e reto. Vale é desce e volta. Subindo é o que sobe.",
        afterCorrect: "Isso. O acento que sobe da esquerda para a direita é o segundo tom.",
        afterWrong: "Ainda não. ā é alto e reto e ǎ desce e volta — o que sobe é á.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Ouvir é o que treina",
      body: "Tom não se aprende olhando, se aprende ouvindo. Vamos começar separando o 1º do 3º, que são os mais distantes entre si.",
      toneContour: 1,
    },
  ],
};

const toneEn: LessonCapsuleLocalizedContent = {
  title: "What are tones?",
  objective: "Hear that the movement of the voice changes the word, and recognise the four marks.",
  transcript: [
    "In English, raising or dropping your voice changes your intent: the same words become a question or a statement. In Mandarin it goes further: the movement of the voice changes the word itself.",
    "Two at a time. The first tone is high and flat, and its mark is a bar: ā. The third dips down and comes back, and its mark looks like a valley: ǎ.",
    "You have seen that mark already. In nǐ hǎo there are two valley marks — both syllables are third tone.",
    "Now the other two. The second rises, like a short question: á. The fourth falls, firmly, like a short command: à.",
    "You do not need to know what these syllables mean. Just watch the movement — that is what you will practise.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "The voice that changes the word",
      body: "In English, raising or dropping your voice changes your intent: the same words become a question or a statement. In Mandarin it goes further.",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "Movement is part of the word",
      body: "In Mandarin, changing how your voice moves doesn't just change the mood — it changes the word. That is why every syllable carries a mark telling you how the voice moves.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "The two farthest apart first: 1st and 3rd",
      body: "The first tone is high and flat — the voice neither rises nor falls. The third dips and returns. They are the easiest pair to tell apart, which is why they come first.",
      pinyin: "ā  ·  ǎ",
      toneContour: 1,
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "You have seen this mark before",
      body: "Look at nǐ hǎo again. Both marks are valleys: both syllables are third tone. You have been using tone since your very first lesson, without knowing its name.",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      toneContour: 3,
    },
    {
      id: "compare",
      kind: "COMPARE",
      title: "Now the other two: 2nd and 4th",
      body: "The second rises, like a short question. The fourth falls, firmly, like a command. Don't try to memorise meanings — watch the movement.",
      pinyin: "á  ·  à",
      toneContour: 2,
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Just to be sure",
      body: "This is not scored.",
      check: {
        prompt: "Which mark shows the tone that RISES?",
        options: ["á", "ā", "ǎ"],
        correctIndex: 0,
        scaffold: "A flat bar is high and level. A valley dips and returns. Rising is the one that goes up.",
        afterCorrect: "That's it. The mark that climbs left to right is the second tone.",
        afterWrong: "Not yet. ā is high and flat and ǎ dips and returns — the rising one is á.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Listening is what trains it",
      body: "Tone isn't learned by looking, it's learned by listening. Let's start by telling the 1st from the 3rd, the two that are farthest apart.",
      toneContour: 1,
    },
  ],
};

export const FOUNDATION_TONE_CAPSULE: LessonCapsule = {
  id: "capsule:foundation:tone:v1",
  topicId: "p1-o-que-e-tom",
  mediaType: "ANIMATED_CAPSULE",
  durationSeconds: 2.5 * MINUTE,
  completionRule: "VIEW_ALL_SEGMENTS",
  knowledgeTargets: [F.tone, F.tone1, F.tone2, F.tone3, F.tone4],
  localized: { "pt-BR": tonePt, en: toneEn },
};

// ── F4 — O que é Hànzì? ───────────────────────────────────────────────────

const hanziPt: LessonCapsuleLocalizedContent = {
  title: "O que é hànzì?",
  objective: "Separar escrita, som, tom e significado num mesmo caractere.",
  transcript: [
    "Você já viu 你好 escrito. Essa escrita tem nome: hànzì.",
    "Um hànzì não é uma letra. Uma letra sozinha não quer dizer nada; um hànzì normalmente carrega um sentido inteiro.",
    "Veja 木. Ele se pronuncia mù e quer dizer árvore, ou madeira. Repare no desenho: um tronco no meio, galhos abrindo para os lados.",
    "São quatro coisas ao mesmo tempo: 木 é a escrita, mù é o som, o acento que cai é o tom, e árvore é o significado.",
    "Nenhuma delas dá para adivinhar a partir das outras. É por isso que você vai encontrar sempre as quatro juntas.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "A escrita tem nome",
      body: "Você já viu 你好 escrito. Essa escrita tem nome: hànzì. Agora vale entender o que um hànzì é.",
      hanzi: "你好",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "Um hànzì não é uma letra",
      body: "Uma letra sozinha não quer dizer nada — o P de porta não significa porta. Um hànzì é diferente: normalmente ele já carrega um sentido inteiro sozinho.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "Um caractere inteiro: 木",
      body: "Ouça e olhe o desenho: um tronco no meio, galhos abrindo para os lados. Muitos hànzì começaram como imagens.",
      hanzi: "木",
      pinyin: "mù",
      meaning: "árvore / madeira",
      audioText: "木",
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Quatro coisas ao mesmo tempo",
      body: "木 é a escrita. mù é o som. O acento que cai é o tom. Árvore é o significado. Nenhuma delas dá para adivinhar a partir das outras — por isso elas vêm sempre juntas.",
      hanzi: "木",
      pinyin: "mù",
      meaning: "árvore / madeira",
      toneContour: 4,
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Só para confirmar",
      body: "Isto não vale ponto.",
      hanzi: "木",
      pinyin: "mù",
      check: {
        prompt: "O que 木 quer dizer?",
        options: ["Árvore, madeira", "Água", "Pessoa"],
        correctIndex: 0,
        scaffold: "Está logo acima, junto com o som mù.",
        afterCorrect: "Isso. 木 é árvore ou madeira — e o desenho lembra o tronco com galhos.",
        afterWrong: "Ainda não. 木 é árvore, ou madeira. Olhe o tronco no meio e os galhos abrindo.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Vamos olhar de perto",
      body: "Agora que você sabe o que um hànzì é, vale praticar reconhecer as formas — porque é a forma que diferencia um caractere do outro.",
      hanzi: "木",
    },
  ],
};

const hanziEn: LessonCapsuleLocalizedContent = {
  title: "What is hànzì?",
  objective: "Tell writing, sound, tone and meaning apart within one character.",
  transcript: [
    "You have seen 你好 written down. That writing has a name: hànzì.",
    "A hànzì is not a letter. A letter on its own means nothing; a hànzì usually carries a whole meaning by itself.",
    "Look at 木. It is pronounced mù and it means tree, or wood. Look at the shape: a trunk down the middle, branches opening out to the sides.",
    "That is four things at once: 木 is the writing, mù is the sound, the falling mark is the tone, and tree is the meaning.",
    "None of them can be guessed from the others. That is why you will always meet all four together.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "The writing has a name",
      body: "You have seen 你好 written down. That writing has a name: hànzì. Now it's worth understanding what a hànzì is.",
      hanzi: "你好",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "A hànzì is not a letter",
      body: "A letter on its own means nothing — the T in tree doesn't mean tree. A hànzì is different: it usually carries a whole meaning by itself.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "A whole character: 木",
      body: "Listen, and look at the shape: a trunk down the middle, branches opening to the sides. Many hànzì began as pictures.",
      hanzi: "木",
      pinyin: "mù",
      meaning: "tree / wood",
      audioText: "木",
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Four things at once",
      body: "木 is the writing. mù is the sound. The falling mark is the tone. Tree is the meaning. None can be guessed from the others — that is why they always appear together.",
      hanzi: "木",
      pinyin: "mù",
      meaning: "tree / wood",
      toneContour: 4,
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Just to be sure",
      body: "This is not scored.",
      hanzi: "木",
      pinyin: "mù",
      check: {
        prompt: "What does 木 mean?",
        options: ["Tree, wood", "Water", "Person"],
        correctIndex: 0,
        scaffold: "It's just above, next to the sound mù.",
        afterCorrect: "That's it. 木 is tree or wood — and the shape recalls a trunk with branches.",
        afterWrong: "Not yet. 木 is tree, or wood. Look at the trunk in the middle and the branches opening out.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Let's look closely",
      body: "Now that you know what a hànzì is, it's worth practising the shapes — because shape is what tells one character from another.",
      hanzi: "木",
    },
  ],
};

export const FOUNDATION_HANZI_CAPSULE: LessonCapsule = {
  id: "capsule:foundation:hanzi:v1",
  topicId: "p1-o-que-e-hanzi",
  mediaType: "ANIMATED_CAPSULE",
  durationSeconds: 2 * MINUTE,
  completionRule: "VIEW_ALL_SEGMENTS",
  knowledgeTargets: [F.hanzi],
  localized: { "pt-BR": hanziPt, en: hanziEn },
};

// ── F5 — Como construímos os primeiros hànzì? ─────────────────────────────
//
// Esta aula entra ENTRE PASSES do tópico, não antes dele, e a razão é o
// próprio conteúdo: ela ensina composição com 人 + 木 = 休, e 人 e 木 são
// ensinados nos dois primeiros passes deste mesmo tópico. Antes disso, o
// exemplo seria feito de peças que o aluno nunca viu.

const componentsPt: LessonCapsuleLocalizedContent = {
  title: "Como os hànzì são construídos?",
  objective: "Ver que caracteres são feitos de partes reutilizáveis, e usar isso para lembrar.",
  transcript: [
    "Você já montou alguns hànzì: 木, árvore, e 人, pessoa. Agora quero te mostrar por que montar é o jeito certo de aprender.",
    "Muitos hànzì não são desenhos únicos: são combinações de partes menores, e essas partes se repetem.",
    "Veja 休. À esquerda está 人, pessoa. À direita está 木, árvore. Uma pessoa ao lado de uma árvore: 休 quer dizer descansar.",
    "Você não precisa decorar 休 agora. O que importa é o que acabou de acontecer: você leu um caractere novo enxergando duas peças que já conhecia.",
    "É assim que a escrita chinesa deixa de ser milhares de desenhos soltos e vira um sistema.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "Por que montar, e não copiar",
      body: "Você já montou 木, árvore, e 人, pessoa. Agora quero te mostrar por que montar é o jeito certo de aprender hànzì.",
      hanzi: "木 人",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "Caracteres são feitos de peças",
      body: "Muitos hànzì não são desenhos únicos. São combinações de partes menores — e essas partes se repetem de caractere para caractere.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "Duas peças que você já conhece",
      body: "À esquerda 人, pessoa. À direita 木, árvore. Juntas formam 休: uma pessoa ao lado de uma árvore, descansando.",
      hanzi: "休",
      pinyin: "xiū",
      meaning: "descansar",
      audioText: "休",
      components: [
        { glyph: "人", label: "pessoa" },
        { glyph: "木", label: "árvore" },
      ],
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Veja o que você acabou de fazer",
      body: "Você leu um caractere que nunca tinha visto, enxergando duas peças que já conhecia. Não precisa decorar 休 agora — precisa perceber que dá para fazer isso.",
      hanzi: "休",
      components: [
        { glyph: "人", label: "pessoa" },
        { glyph: "木", label: "árvore" },
      ],
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Só para confirmar",
      body: "Isto não vale ponto.",
      hanzi: "休",
      check: {
        prompt: "Quais partes formam 休?",
        // As três opções usam só caracteres que este tópico já ensinou.
        options: ["人 e 木", "口 e 日", "木 e 木"],
        correctIndex: 0,
        scaffold: "Olhe o lado esquerdo e o lado direito de 休, separadamente.",
        afterCorrect: "Isso: 人 à esquerda, 木 à direita. Pessoa e árvore, descansando.",
        afterWrong: "Ainda não. Olhe de novo: à esquerda está 人, pessoa; à direita está 木, árvore.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Agora monte você",
      body: "No montador você vai encaixar as peças de cada caractere. Não é caligrafia: é reparar de que partes cada hànzì é feito.",
      hanzi: "休",
    },
  ],
};

const componentsEn: LessonCapsuleLocalizedContent = {
  title: "How are hànzì built?",
  objective: "See that characters are made of reusable parts, and use that to remember them.",
  transcript: [
    "You have built a few hànzì already: 木, tree, and 人, person. Now let me show you why building is the right way to learn them.",
    "Many hànzì are not single drawings: they are combinations of smaller parts, and those parts repeat.",
    "Look at 休. On the left is 人, person. On the right is 木, tree. A person beside a tree: 休 means to rest.",
    "You do not have to memorise 休 now. What matters is what just happened: you read a new character by seeing two parts you already knew.",
    "That is how Chinese writing stops being thousands of separate drawings and becomes a system.",
  ].join("\n\n"),
  captions: [],
  segments: [
    {
      id: "orient",
      kind: "ORIENT",
      title: "Why build instead of copy",
      body: "You have already built 木, tree, and 人, person. Now let me show you why building is the right way to learn hànzì.",
      hanzi: "木 人",
    },
    {
      id: "explain",
      kind: "EXPLAIN",
      title: "Characters are made of parts",
      body: "Many hànzì are not single drawings. They are combinations of smaller parts — and those parts repeat from character to character.",
    },
    {
      id: "demonstrate",
      kind: "DEMONSTRATE",
      title: "Two parts you already know",
      body: "On the left, 人, person. On the right, 木, tree. Together they form 休: a person beside a tree, resting.",
      hanzi: "休",
      pinyin: "xiū",
      meaning: "to rest",
      audioText: "休",
      components: [
        { glyph: "人", label: "person" },
        { glyph: "木", label: "tree" },
      ],
    },
    {
      id: "notice",
      kind: "NOTICE",
      title: "Look at what you just did",
      body: "You read a character you had never seen, by spotting two parts you already knew. You don't need to memorise 休 now — you need to notice that this is possible.",
      hanzi: "休",
      components: [
        { glyph: "人", label: "person" },
        { glyph: "木", label: "tree" },
      ],
    },
    {
      id: "micro-check",
      kind: "MICRO_CHECK",
      title: "Just to be sure",
      body: "This is not scored.",
      hanzi: "休",
      check: {
        prompt: "Which parts make up 休?",
        options: ["人 and 木", "口 and 日", "木 and 木"],
        correctIndex: 0,
        scaffold: "Look at the left side and the right side of 休 separately.",
        afterCorrect: "That's it: 人 on the left, 木 on the right. Person and tree, resting.",
        afterWrong: "Not yet. Look again: on the left is 人, person; on the right is 木, tree.",
      },
    },
    {
      id: "transition",
      kind: "TRANSITION_TO_PRACTICE",
      title: "Now you build one",
      body: "In the builder you'll fit the parts of each character together. It isn't calligraphy: it's noticing what each hànzì is made of.",
      hanzi: "休",
    },
  ],
};

export const FOUNDATION_HANZI_COMPONENTS_CAPSULE: LessonCapsule = {
  id: "capsule:foundation:hanzi-components:v1",
  topicId: "p1-primeiros-hanzi",
  mediaType: "ANIMATED_CAPSULE",
  durationSeconds: 2 * MINUTE,
  completionRule: "VIEW_ALL_SEGMENTS",
  knowledgeTargets: [F.components],
  localized: { "pt-BR": componentsPt, en: componentsEn },
};

/** Parte X — a wave 1 em ordem de ensino. */
export const FOUNDATION_WAVE_1_CAPSULES: LessonCapsule[] = [
  FOUNDATION_MANDARIN_CAPSULE,
  FOUNDATION_PINYIN_CAPSULE,
  FOUNDATION_TONE_CAPSULE,
  FOUNDATION_HANZI_CAPSULE,
  FOUNDATION_HANZI_COMPONENTS_CAPSULE,
];
