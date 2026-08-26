/**
 * V4.6 — pass-specific steps that keep each topic faithful to its title.
 *
 * TM-005: four passes must differ cognitively. Lexical repetition is wanted;
 * mechanical copies of the same session are a hard fail.
 */

import type { Lesson, LessonStep } from "./journey";
import { getLesson } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { withEquivalentAccepts } from "./masteryLoop";
import { conversationSceneStepFromId } from "./conversationScenes";
import { topicMasterySpecFor } from "./topicMasterySpecs";
import { makeReverseRecall } from "./exerciseFeasibility";
import { buildersForCharacter } from "./hanziBuilder";

function intro(title: string, body: string): LessonStep {
  return { kind: "intro", title, body };
}

function listenSelect(
  title: string,
  audioText: string,
  options: string[],
  correctAnswer: string,
  explanation?: string
): LessonStep {
  return { kind: "listen_select", title, audioText, options, correctAnswer, explanation };
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

function transferNihao(title: string, situationPt: string): LessonStep {
  return makeReverseRecall(title, situationPt, "你好", ["你好", "你好！", "你好。"]);
}

function conversationScene(sceneId: string): LessonStep {
  const scene = conversationSceneStepFromId(sceneId);
  if (!scene) {
    throw new Error(`conversation_scene desconhecida: ${sceneId}`);
  }
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

const AUTHORED_BONUS: Record<string, Record<MasteryPass, LessonStep[]>> = {
  "p1-o-que-e-mandarim": {
    1: [
      intro(
        "Língua, não alfabeto",
        "Mandarim é uma língua falada — a variedade padrão do chinês moderno que o Longyu ensina. A escrita vem depois: agora você ouve uma frase real."
      ),
      listenSelect("Primeiro som real", "你好", ["你好", "谢谢", "再见"], "你好", "Isso é mandarim falado: 你好."),
    ],
    2: [
      match(
        "Quatro camadas",
        "O mesmo cumprimento em quatro camadas. Combine cada uma.",
        [
          { left: "som que você ouviu", right: "你好 falado", leftType: "pt", rightType: "hanzi" },
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
        "nǐ hǎo no papel é pinyin — representação do som, não a fala."
      ),
    ],
    3: [
      contextualChoice(
        "Alguém cumprimenta",
        "Uma pessoa olha para você e diz 你好. O que você faz?",
        "你好",
        ["你好", "谢谢", "一", "木"],
        "A resposta natural é devolver o cumprimento."
      ),
      reverseRecall("Responda de memória", "Cumprimente de volta, sem ler a tradução.", "你好", ["你好", "你好！"]),
      withEquivalentAccepts({
        kind: "free_production",
        title: "Sem alternativas",
        situationPt: "A pessoa à sua frente espera um cumprimento. Diga em mandarim.",
        correctAnswer: "你好",
        answer: "你好",
        accepts: ["你好", "你好！", "你好。"],
        productionAssist: "guided",
        helpMode: "disabled",
        isNoHint: true,
      }),
      sentenceBuild("Monte o cumprimento", "Monte a frase que você ouviu.", ["你", "好"], ["好", "你", "谢"], "你好 é fala útil, não um exercício de alfabeto."),
    ],
    4: [
      conversationScene("primeiro-cumprimento"),
      match(
        "Prove as camadas",
        "Na conversa que você acabou de fazer, o que é cada coisa?",
        [
          { left: "o que você ouviu", right: "mandarim falado", leftType: "pt", rightType: "pt" },
          { left: "nǐ hǎo", right: "pinyin", leftType: "pinyin", rightType: "pt" },
          { left: "你好", right: "hànzì", leftType: "hanzi", rightType: "pt" },
          { left: "Olá", right: "significado", leftType: "pt", rightType: "pt" },
        ],
        "Você acabou de usar as quatro camadas na prática."
      ),
      transferNihao("Situação nova", "Você entra numa sala e a pessoa levanta a cabeça. Cumprimente."),
    ],
  },
  "p1-o-que-e-pinyin": {
    1: [
      intro(
        "Para que existe o pinyin",
        "Pinyin escreve a pronúncia do mandarim com letras latinas. Não substitui 你好: mostra como falar nǐ hǎo."
      ),
      listenSelect("Áudio ↔ pinyin", "你好", ["你好", "谢谢", "再见"], "你好", "Você ouviu o som; nǐ hǎo é o mapa desse som."),
    ],
    2: [
      dialogue(
        "Duas sílabas",
        "Em nǐ hǎo, quantas sílabas você lê?",
        "duas: nǐ e hǎo",
        ["duas: nǐ e hǎo", "uma letra só", "quatro tons sem som", "a tradução Olá"],
        "Sílabas do pinyin: inicial + final. nǐ / hǎo bastam neste nível."
      ),
      match(
        "Áudio e escrita do som",
        "Ligue o pinyin ao hànzì que você já ouviu.",
        [
          { left: "nǐ hǎo", right: "你好", leftType: "pinyin", rightType: "hanzi" },
          { left: "nǐ", right: "你", leftType: "pinyin", rightType: "hanzi" },
          { left: "hǎo", right: "好", leftType: "pinyin", rightType: "hanzi" },
        ],
        "Pinyin aponta o som; hànzì é a forma escrita."
      ),
    ],
    3: [
      dialogue(
        "Marcas de tom",
        "O que o acento em nǐ e hǎo indica?",
        "o tom da sílaba",
        ["o tom da sílaba", "a tradução", "o número da lição", "que a palavra é formal"],
        "As marcas de tom no pinyin são o mapa do contorno — sem elas o som fica ambíguo."
      ),
      reverseRecall("Leia o som", "Alguém escreveu nǐ hǎo. Diga a frase em mandarim.", "你好", ["你好", "你好！"]),
    ],
    4: [
      contextualChoice(
        "Ferramenta, não destino",
        "Você vê nǐ hǎo numa placa de aula. Para que serve?",
        "guiar a pronúncia de 你好",
        ["guiar a pronúncia de 你好", "substituir hànzì para sempre", "traduzir para inglês", "marcar pontos"],
        "Pinyin é ponte. Depois você consegue dizer 你好 com menos mapa."
      ),
      reverseRecall(
        "Sem o mapa inteiro",
        "A pessoa à sua frente espera um cumprimento. Fale, mesmo sem ver o pinyin completo.",
        "你好",
        ["你好", "你好！"]
      ),
      conversationScene("primeiro-cumprimento"),
    ],
  },
  "p1-o-que-e-tom": {
    1: [
      intro(
        "A curva é a palavra",
        "Em mandarim o contorno da voz não é emoção: faz parte da palavra. Ouça só a diferença entre reta e vale."
      ),
    ],
    2: [
      listenSelect(
        "Reta ou vale de novo",
        "马",
        ["妈", "马"],
        "马",
        "mǎ desce e volta (3º); mā fica reta no alto (1º)."
      ),
      dialogue(
        "O que mudou?",
        "mā e mǎ usam as mesmas letras. O que as torna palavras diferentes?",
        "o contorno da voz",
        ["o contorno da voz", "o tamanho da letra", "a tradução em inglês", "o hànzì decorativo"],
        "Tom = curva. Discriminar vem antes de produzir."
      ),
    ],
    3: [
      dialogue(
        "Qual tom é o vale?",
        "Você ouve o 3º tom (vale). Qual palavra de ma é o vale?",
        "马",
        ["马", "妈", "麻", "骂"],
        "马 (mǎ) é o vale: desce e volta."
      ),
    ],
    4: [
      intro(
        "Tons que você já usa",
        "你好 são dois 3º tons; juntos você ouve ní hǎo. O tom não mora só no drill de ma."
      ),
      listenSelect("你好 de ouvido", "你好", ["你好", "谢谢", "妈"], "你好", "Leve o contorno para um chunk conhecido."),
      contextualChoice(
        "Na rua",
        "Você vai cumprimentar. Qual curva você precisa acertar em 你好?",
        "os tons das sílabas",
        ["os tons das sílabas", "só o volume", "só o hànzì", "a tradução Olá"],
        "Sem o contorno, 你好 não soa 你好."
      ),
    ],
  },
  "p1-o-que-e-hanzi": {
    1: [
      intro(
        "Sistema de escrita",
        "Hànzì são os caracteres do chinês escrito. Pinyin mostra o som (nǐ hǎo); hànzì mostra a forma: 你好."
      ),
      dialogue(
        "O que é um caractere?",
        "Em 你好, 你 é...",
        "um caractere (peça escrita)",
        ["um caractere (peça escrita)", "o pinyin inteiro", "a tradução", "um tom"],
        "Caractere ≠ automaticamente uma palavra inteira."
      ),
    ],
    2: [
      dialogue(
        "Peça e palavra",
        "你好 tem dois caracteres. Isso significa duas palavras?",
        "não necessariamente — juntos formam uma palavra",
        ["não necessariamente — juntos formam uma palavra", "sim, sempre duas palavras", "não tem hànzì aqui", "só pinyin conta"],
        "你 + 好 = uma palavra de cumprimento."
      ),
      match(
        "Peças de 你好",
        "Combine caractere e papel na palavra.",
        [
          { left: "你", right: "primeira peça de 你好", leftType: "hanzi", rightType: "pt" },
          { left: "好", right: "segunda peça de 你好", leftType: "hanzi", rightType: "pt" },
        ],
        "Componentes básicos: duas peças, uma palavra."
      ),
    ],
    3: [
      sentenceBuild("Monte 你好", "Monte a palavra com os caracteres.", ["你", "好"], ["好", "你", "木", "人"], "Reconhecer e montar."),
    ],
    4: [
      listenSelect("Leia com menos pinyin", "你好", ["你好", "木", "人"], "你好", "O áudio aponta; o hànzì é o que você lê."),
      contextualChoice(
        "Na mensagem",
        "Chega uma mensagem só com 你好, sem pinyin. O que é?",
        "o cumprimento que você já fala",
        ["o cumprimento que você já fala", "um número", "pinyin", "um tom isolado"],
        "Contexto conhecido, scaffold menor."
      ),
    ],
  },
};

function firstHanziFromLesson(lesson: Lesson | undefined, allowGreeting: boolean): string | null {
  if (!lesson) return null;
  for (const step of lesson.steps) {
    const blob = [step.hanzi, step.audioText, step.text, step.correctAnswer, step.answer].filter(Boolean).join("");
    const found = blob.match(/[\u3400-\u9fff]+/);
    if (!found) continue;
    const hanzi = found[0].slice(0, 4);
    if (hanzi === "你好" && !allowGreeting) continue;
    return hanzi;
  }
  return null;
}

const GREETING_TOPIC_RE =
  /mandarim|pinyin|hànzì|hanzi|tom|nihao|olá|cumpriment|engine-2|primeiros-hanzi|l2\b/i;

function topicAllowsGreetingFallback(lesson: Lesson): boolean {
  return GREETING_TOPIC_RE.test(`${lesson.id} ${lesson.title}`);
}

function uniqueOptions(preferred: string, extras: string[]): string[] {
  const out: string[] = [];
  for (const item of [preferred, ...extras]) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out.slice(0, 4);
}

function conceptualBonus(lesson: Lesson, pass: MasteryPass, spec: ReturnType<typeof topicMasterySpecFor>): LessonStep[] {
  const promise = spec?.promise ?? lesson.title;
  const objective = spec?.passObjectives[pass] ?? promise;
  if (pass === 1) {
    return [
      intro("O que este tema ensina", promise),
      dialogue(
        "Promessa do tema",
        `O que "${lesson.title}" quer que você consiga fazer?`,
        objective,
        [objective, "Decorar 你好 em qualquer aula", "Ignorar o título", "Só ganhar XP"],
        promise
      ),
    ];
  }
  if (pass === 2) {
    return [
      dialogue(
        "Distinguir",
        spec?.mustRecognize[0] ?? `O que não é o foco de ${lesson.title}?`,
        spec?.commonMisconceptions[0] ?? "Decorar 你好 em qualquer aula",
        [
          spec?.commonMisconceptions[0] ?? "Decorar 你好 em qualquer aula",
          spec?.mustUnderstand[0] ?? promise,
          spec?.mustRecognize[0] ?? objective,
          "Ganhar estrelas",
        ],
        spec?.mustRecognize[0]
      ),
    ];
  }
  if (pass === 3) {
    return [
      dialogue(
        "Aplicar",
        spec?.mustProduce[0] ?? `Como você usa o que ${lesson.title} ensinou?`,
        spec?.mustProduce[0] ?? objective,
        [
          spec?.mustProduce[0] ?? objective,
          "Repetir a mesma sessão de reconhecimento",
          "Trocar o tema por 你好",
          "Pular para o próximo nó",
        ],
        spec?.mustProduce[0]
      ),
    ];
  }
  return [
    contextualChoice(
      "Situação nova",
      spec?.passObjectives[4] ?? `Use o que ${lesson.title} ensinou numa situação um pouco nova.`,
      spec?.mustTransfer[0] ?? objective,
      [
        spec?.mustTransfer[0] ?? objective,
        "Repetir só o drill inicial",
        "Substituir o tema por 你好",
        "Ignorar o contexto",
      ],
      spec?.mustTransfer[0]
    ),
  ];
}

function genericFidelityBonus(lesson: Lesson, pass: MasteryPass): LessonStep[] {
  const spec = topicMasterySpecFor(lesson);
  const fromSpec = spec?.canonicalExamples.find((item) => /[\u3400-\u9fff]/.test(item));
  const fromLesson = firstHanziFromLesson(lesson, topicAllowsGreetingFallback(lesson));
  let hanzi = fromSpec ?? fromLesson ?? "";
  if (hanzi === "你好" && !topicAllowsGreetingFallback(lesson)) {
    hanzi = fromLesson && fromLesson !== "你好" ? fromLesson : "";
  }
  if (!hanzi) return conceptualBonus(lesson, pass, spec);
  const distractors = uniqueOptions(hanzi, topicAllowsGreetingFallback(lesson) ? ["谢谢", "一", "人"] : ["一", "人", "木"]);
  if (pass === 1) {
    return [
      intro("O que este tema ensina", spec?.promise ?? lesson.title),
      listenSelect("Ouça o núcleo", hanzi, distractors, hanzi),
    ];
  }
  if (pass === 2) {
    return [
      dialogue(
        "Reconhecer de verdade",
        spec?.passObjectives[2] ?? `Qual opção é o núcleo de ${lesson.title}?`,
        hanzi,
        distractors,
        spec?.mustRecognize[0]
      ),
    ];
  }
  if (pass === 3) {
    const produceText = `${spec?.mustProduce[0] ?? ""} ${spec?.passObjectives[3] ?? ""} ${lesson.title}`;
    if (/montar|monte|caractere/i.test(produceText) && [...hanzi].length === 1) {
      const builder =
        buildersForCharacter(hanzi).find((item) => item.mode === "fragments") ?? buildersForCharacter(hanzi)[0];
      if (builder) {
        return [
          {
            kind: "hanzi_build",
            title: "Monte o caractere",
            builderId: builder.id,
            prompt: builder.promptPt,
            sourceMeaning: builder.meaningPt,
            correctAnswer: builder.character,
            explanation: builder.explanationPt,
          },
        ];
      }
    }
    const parts = [...hanzi];
    const bank = uniqueOptions(parts.join(""), [...parts, "一", "人"]);
    return [
      sentenceBuild(
        "Monte o núcleo",
        spec?.passObjectives[3] ?? "Monte o que este tema ensina.",
        parts,
        [...parts, ...bank.filter((item) => !parts.includes(item))]
      ),
    ];
  }
  return [
    contextualChoice(
      "Situação nova",
      spec?.passObjectives[4] ?? `Use o que ${lesson.title} ensinou.`,
      hanzi,
      distractors,
      spec?.mustTransfer[0]
    ),
  ];
}

export function topicMasteryBonusStepsFor(lessonId: string, pass: MasteryPass): LessonStep[] {
  const authored = AUTHORED_BONUS[lessonId]?.[pass];
  if (authored) return authored;
  const lesson = getLesson(lessonId);
  if (!lesson || lesson.isReview || lesson.reviewMasteryMode) return [];
  return genericFidelityBonus(lesson, pass);
}

export function hasAuthoredTopicMasteryBonus(lessonId: string): boolean {
  return Boolean(AUTHORED_BONUS[lessonId]);
}
