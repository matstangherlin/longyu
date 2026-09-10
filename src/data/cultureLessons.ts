/**
 * V4.9.8A.1 — Canonical Culture Lessons for the standard LessonPlayer.
 */

import { CULTURE_ITEMS, getCultureItem, type CultureItem } from "./culture";
import {
  CULTURE_JOURNEY_PLACEMENT,
  cultureLessonIdForItem,
  type CultureLessonTrack,
} from "./cultureNative";
import type { Lesson, LessonStep } from "./journey";
import type { PedagogicalStepEvidence } from "./pedagogicalSpine";
import type { VisualConceptId } from "./visualVocabulary";

export const CULTURE_NATIVE_GLOSS_EN: Record<string, string> = {};

function t(pt: string, en: string): string {
  if (pt) CULTURE_NATIVE_GLOSS_EN[pt] = en;
  return pt;
}

type CultureRole = "teach" | "guided_application" | "independent_application" | "recall";

function evidence(conceptId: string, role: CultureRole, graded: boolean): PedagogicalStepEvidence {
  const rung =
    role === "teach"
      ? "ORIENT"
      : role === "recall"
        ? "RECALL"
        : role === "guided_application"
          ? "GUIDED_RECOGNITION"
          : "TRANSFER";
  return {
    rung,
    knowledgeTargetIds: [conceptId],
    graded,
    domain: "culture",
    role,
    conceptId,
  };
}

function intro(title: string, body: string, conceptId: string): LessonStep {
  return {
    kind: "intro",
    title,
    body,
    pedagogicalEvidence: evidence(conceptId, "teach", false),
  };
}

function contextual(
  title: string,
  situation: string,
  correct: string,
  options: string[],
  explanation: string,
  conceptId: string,
  role: CultureRole
): LessonStep {
  return {
    kind: "contextual_choice",
    title,
    situationPt: situation,
    dialoguePrompt: situation,
    correctAnswer: correct,
    options,
    explanation,
    speaker: t("Situação", "Situation"),
    pedagogicalEvidence: evidence(conceptId, role, true),
  };
}

function fill(
  title: string,
  prompt: string,
  before: string,
  blank: string,
  after: string,
  bank: string[],
  explanation: string,
  conceptId: string,
  role: CultureRole
): LessonStep {
  return {
    kind: "fill_blank",
    title,
    prompt,
    sentenceBefore: before,
    blankAnswer: blank,
    sentenceAfter: after,
    bank,
    correctAnswer: `${before}${blank}${after}`,
    explanation,
    pedagogicalEvidence: evidence(conceptId, role, true),
  };
}

function pairs(
  title: string,
  body: string,
  rows: Array<{ left: string; right: string }>,
  explanation: string,
  conceptId: string,
  role: CultureRole
): LessonStep {
  return {
    kind: "match_pairs",
    title,
    body,
    pairs: rows.map((row) => ({ ...row, leftType: "pt", rightType: "pt" })),
    explanation,
    pedagogicalEvidence: evidence(conceptId, role, true),
  };
}

function spot(
  title: string,
  prompt: string,
  correct: string,
  options: string[],
  explanation: string,
  conceptId: string,
  role: CultureRole
): LessonStep {
  return {
    kind: "spot_error",
    title,
    prompt,
    correctAnswer: correct,
    options,
    explanation,
    pedagogicalEvidence: evidence(conceptId, role, true),
  };
}

function dialogue(
  title: string,
  prompt: string,
  correct: string,
  options: string[],
  explanation: string,
  conceptId: string,
  role: CultureRole,
  speaker = t("Mei", "Mei")
): LessonStep {
  return {
    kind: "dialogue_choice",
    title,
    speaker,
    dialoguePrompt: prompt,
    correctAnswer: correct,
    options,
    explanation,
    pedagogicalEvidence: evidence(conceptId, role, true),
  };
}

function image(
  imageId: VisualConceptId,
  promptPt: string,
  answer: string,
  options: string[],
  explanation: string,
  conceptId: string,
  role: CultureRole
): LessonStep {
  return {
    kind: "image_choice",
    imageChoiceMode: "choose_image",
    imageId,
    promptPt,
    imageOptions: options,
    correctImageId: answer,
    explanation,
    pedagogicalEvidence: evidence(conceptId, role, true),
  };
}

function miniRecall(item: CultureItem, conceptId: string): LessonStep {
  const correct = item.miniCheck.options.find((option) => option.id === item.miniCheck.correctOptionId);
  return contextual(
    t("Lembra o contexto", "Recall the context"),
    t(item.miniCheck.promptPt, item.miniCheck.promptEn),
    t(correct?.labelPt ?? "", correct?.labelEn ?? ""),
    item.miniCheck.options.map((option) => t(option.labelPt, option.labelEn)),
    t(item.miniCheck.explanationPt, item.miniCheck.explanationEn),
    conceptId,
    "recall"
  );
}

type ExtraSteps = (item: CultureItem, conceptId: string) => LessonStep[];

const EXTRAS: Record<string, ExtraSteps> = {
  "greetings-nihao": (_item, conceptId) => [
    pairs(
      t("O que 你好 faz", "What 你好 does"),
      t("Combine o sinal com a leitura mais segura.", "Match the cue with the safer reading."),
      [
        { left: t("Você vê a mesma colega todo dia", "You see the same colleague every day"), right: t("um aceno ou 你好 curto basta", "a nod or a short 你好 is enough") },
        { left: t("Primeiro encontro formal", "A first formal meeting"), right: t("你好 abre; depois vem o nome", "你好 opens; then the name") },
        { left: t("Já conversaram ontem", "You already talked yesterday"), right: t("não precisa recomeçar do zero", "no need to start from scratch") },
      ],
      t("你好 abre o contato. Não é um interrogatório nem um ritual obrigatório a cada passagem.", "你好 opens contact. It is not an interrogation or a required ritual every time you pass."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Complete a leitura", "Complete the reading"),
      t("No corredor do escritório, a primeira fala costuma ser curta.", "In the office corridor, the first line is usually short."),
      t("Um ", "A "),
      t("olá breve", "brief hello"),
      t(" é suficiente; não transforme isso em entrevista.", " is enough; do not turn it into an interview."),
      [t("olá breve", "brief hello"), t("discurso longo", "long speech"), t("silêncio absoluto", "total silence")],
      t("A função é reconhecer a pessoa, não preencher um formulário.", "The job is to acknowledge the person, not fill a form."),
      conceptId,
      "independent_application"
    ),
  ],
  "thanks-keqi": (_item, conceptId) => [
    pairs(
      t("Agradecer e responder", "Thank and reply"),
      t("Combine a fala com o papel.", "Match the line with its role."),
      [
        { left: "谢谢", right: t("reconhece o favor", "acknowledges the favor") },
        { left: "不客气", right: t("fecha o ciclo com educação", "closes the cycle politely") },
        { left: t("repetir 谢谢 cinco vezes", "repeat 谢谢 five times"), right: t("pode soar pesado", "can sound heavy") },
      ],
      t("谢谢 marca o recebimento. 不客气 devolve o equilíbrio. Não é um teste de gratidão infinita.", "谢谢 marks receipt. 不客气 restores balance. It is not an infinite-gratitude test."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("O ciclo do agradecimento", "The thanks cycle"),
      t("Você disse 谢谢 e ouviu 不客气.", "You said 谢谢 and heard 不客气."),
      t("Isso costuma ", "That usually "),
      t("encerrar o gesto", "close the gesture"),
      t(", não pedir outro discurso.", ", not ask for another speech."),
      [t("encerrar o gesto", "close the gesture"), t("exigir um presente", "demand a gift"), t("marcar ofensa", "mark an insult")],
      t("O par 谢谢 / 不客气 funciona como fecho, não como cobrança.", "The 谢谢 / 不客气 pair works as a close, not a demand."),
      conceptId,
      "independent_application"
    ),
  ],
  "qingwen-ask": (_item, conceptId) => [
    fill(
      t("Como abrir a pergunta", "How to open the question"),
      t("Você vai perguntar o caminho a um desconhecido.", "You are about to ask a stranger for the way."),
      t("Comece com ", "Start with "),
      t("请问", "请问"),
      t(" e só depois o pedido.", " and only then the request."),
      ["请问", "你好吗", "买单"],
      t("请问 avisa que você vai ocupar o tempo de alguém. Não substitui o conteúdo da pergunta.", "请问 signals you will take someone's time. It does not replace the question."),
      conceptId,
      "guided_application"
    ),
    pairs(
      t("Abrir × perguntar", "Open × ask"),
      t("Cada peça tem um papel.", "Each piece has a role."),
      [
        { left: "请问", right: t("pede licença para perguntar", "asks leave to ask") },
        { left: "地铁站怎么走？", right: t("é o conteúdo do pedido", "is the content of the request") },
        { left: t("gritar 喂", "shouting 喂"), right: t("soará brusco com desconhecidos", "will sound brusque with strangers") },
      ],
      t("Cortesia na abertura, clareza no pedido. Não misture os dois papéis.", "Politeness in the opening, clarity in the request. Do not mix the two roles."),
      conceptId,
      "independent_application"
    ),
  ],
  "family-terms": (_item, conceptId) => [
    pairs(
      t("Quem é quem", "Who is who"),
      t("Combine a fala com a leitura.", "Match the line with the reading."),
      [
        { left: "这是我妈妈", right: t("apresenta a mãe", "introduces mother") },
        { left: "这是我爸爸", right: t("apresenta o pai", "introduces father") },
        { left: t("apontar sem falar", "pointing without speaking"), right: t("pode parecer seco", "can seem blunt") },
      ],
      t("A apresentação familiar é um rótulo curto, não uma biografia.", "A family introduction is a short label, not a biography."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Na apresentação", "In the introduction"),
      t("Alguém diz 这是我妈妈.", "Someone says 这是我妈妈."),
      t("A leitura mais útil é ", "The most useful reading is "),
      t("identificar o parentesco", "identifying the kinship"),
      t(", não inventar uma hierarquia rígida.", ", not inventing a rigid hierarchy."),
      [t("identificar o parentesco", "identifying the kinship"), t("calcular a herança", "calculating inheritance"), t("ignorar a pessoa", "ignoring the person")],
      t("O termo localiza a relação. O resto vem do contexto.", "The term locates the relation. The rest comes from context."),
      conceptId,
      "independent_application"
    ),
  ],
  "teacher-title": (_item, conceptId) => [
    fill(
      t("Como chamar o professor", "How to address the teacher"),
      t("Você vai parar o professor no corredor da escola.", "You are about to stop the teacher in a school corridor."),
      t("O tratamento mais seguro é ", "The safer address is "),
      t("老师", "老师"),
      t(".", "."),
      ["老师", "喂", t("o primeiro nome só", "first name only")],
      t("老师 marca o papel. Não é um elogio nem uma ordem.", "老师 marks the role. It is not praise or a command."),
      conceptId,
      "guided_application"
    ),
    pairs(
      t("Papel e tratamento", "Role and address"),
      t("Combine o contexto com a forma.", "Match the context with the form."),
      [
        { left: t("corredor da escola", "school corridor"), right: t("老师 é o padrão seguro", "老师 is the safe default") },
        { left: t("amigo da mesma idade fora da aula", "same-age friend outside class"), right: t("o nome pode bastar", "the name may suffice") },
        { left: t("interromper no meio da fala", "cutting them off mid-sentence"), right: t("espere um intervalo", "wait for a gap") },
      ],
      t("O título segue o papel institucional. Fora dele, o contexto manda.", "The title follows the institutional role. Outside it, context leads."),
      conceptId,
      "independent_application"
    ),
  ],
  "gift-receiving": (item, conceptId) => [
    intro(
      t("Jantar na casa de Mei", "Dinner at Mei's"),
      t("Mei entrega um pacote com as duas mãos. Você observa o gesto antes de falar.", "Mei holds out a package with both hands. You watch the gesture before speaking."),
      conceptId
    ),
    dialogue(
      t("Agora é a sua vez", "Now it's your turn"),
      t("Mei oferece o pacote. O que você faz?", "Mei offers the package. What do you do?"),
      t("Receber com as duas mãos e dizer 谢谢", "Receive with both hands and say 谢谢"),
      [
        t("Receber com as duas mãos e dizer 谢谢", "Receive with both hands and say 谢谢"),
        t("Pegar com uma mão sem olhar", "Grab it with one hand without looking"),
        t("Recusar três vezes em silêncio", "Refuse three times in silence"),
      ],
      t("As duas mãos reconhecem o cuidado. 谢谢 fecha o gesto. Não é uma regra de recusas.", "Both hands acknowledge the care. 谢谢 closes the gesture. It is not a refusal rule."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("O gesto do recebimento", "The receiving gesture"),
      t("Numa visita um pouco formal, alguém entrega um pacote.", "On a slightly formal visit, someone hands you a package."),
      t("O gesto mais adequado é receber ", "The more suitable gesture is to receive "),
      t("com as duas mãos", "with both hands"),
      t(".", "."),
      [t("com as duas mãos", "with both hands"), t("com o pé", "with your foot"), t("sem olhar", "without looking")],
      t(item.practicePt, item.practiceEn),
      conceptId,
      "independent_application"
    ),
  ],
  "four-and-eight": (_item, conceptId) => [
    pairs(
      t("Som, não magia", "Sound, not magic"),
      t("Combine o número com a leitura mais segura.", "Match the number with the safer reading."),
      [
        { left: t("andar sem 4", "floor without 4"), right: t("evita o som de 'morte' em alguns prédios", "avoids the sound of “death” in some buildings") },
        { left: t("888", "888"), right: t("pode ser marketing de 'sorte'", "can be “luck” marketing") },
        { left: t("todo 8 é sagrado", "every 8 is sacred"), right: t("exagero: é costume, não lei", "overreach: custom, not law") },
      ],
      t("4 e 8 carregam associações sonoras em alguns contextos. Não transforme isso em superstição obrigatória.", "4 and 8 carry sound associations in some contexts. Do not turn that into required superstition."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Ler o número", "Reading the number"),
      t("Você viu um preço 888 e um andar sem 4.", "You saw a price 888 and a floor without 4."),
      t("A leitura mais segura é ", "The safer reading is "),
      t("costume comercial e predial", "commercial and building custom"),
      t(", não magia.", ", not magic."),
      [t("costume comercial e predial", "commercial and building custom"), t("ordem religiosa", "religious order"), t("erro de impressão sempre", "always a print error")],
      t("O som explica o costume. O contexto decide se ele vale nesta loja ou neste prédio.", "Sound explains the custom. Context decides whether it applies in this shop or building."),
      conceptId,
      "independent_application"
    ),
  ],
  "spring-festival": (_item, conceptId) => [
    pairs(
      t("O que é estável no 春节", "What is stable about 春节"),
      t("Combine o sinal com a leitura.", "Match the cue with the reading."),
      [
        { left: t("colega volta para casa", "a colleague goes home"), right: t("reunião familiar é o núcleo", "family reunion is the core") },
        { left: t("datas exatas iguais em todo o país", "identical dates everywhere"), right: t("o calendário lunar muda o dia", "the lunar calendar moves the day") },
        { left: t("obrigação de gastar uma fortuna", "a duty to spend a fortune"), right: t("exagero: o gesto varia", "overreach: the gesture varies") },
      ],
      t("A reunião familiar é o núcleo mais estável. O resto varia por região e geração.", "Family reunion is the most stable core. The rest varies by region and generation."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Quando alguém fala em 春节", "When someone mentions 春节"),
      t("Um colega diz que vai para casa no 春节.", "A colleague says they are going home for 春节."),
      t("A leitura mais segura é ", "The safer reading is "),
      t("reunião familiar", "family reunion"),
      t(", não um feriado genérico qualquer.", ", not just any generic holiday."),
      [t("reunião familiar", "family reunion"), t("só fogos de artifício", "only fireworks"), t("feriado obrigatório de compras", "mandatory shopping holiday")],
      t("Perguntar se a pessoa volta para casa é mais útil do que recitar uma lista de costumes.", "Asking whether they go home is more useful than reciting a custom list."),
      conceptId,
      "independent_application"
    ),
  ],
  "mid-autumn": (_item, conceptId) => [
    fill(
      t("O que é estável no 中秋", "What is stable about Mid-Autumn"),
      t("Alguém menciona 中秋节.", "Someone mentions 中秋节."),
      t("O núcleo mais estável é ", "The most stable core is "),
      t("lua cheia e reunião", "the full moon and gathering"),
      t(".", "."),
      [t("lua cheia e reunião", "the full moon and gathering"), t("obrigação de bolo caro", "a duty to buy expensive cake"), t("proibição de trabalhar", "a ban on working")],
      t("Lua e reunião são o núcleo. Presentes e bolos variam.", "Moon and gathering are the core. Gifts and cakes vary."),
      conceptId,
      "guided_application"
    ),
    pairs(
      t("Núcleo e variação", "Core and variation"),
      t("Separe o estável do que muda.", "Separate the stable from what changes."),
      [
        { left: t("lua cheia", "full moon"), right: t("marca o calendário", "marks the calendar") },
        { left: t("bolos e marcas", "cakes and brands"), right: t("variam por região e renda", "vary by region and income") },
        { left: t("obrigação de recitar um poema", "a duty to recite a poem"), right: t("não é regra cotidiana", "is not an everyday rule") },
      ],
      t("Não transforme marketing de bolo em lei cultural.", "Do not turn cake marketing into cultural law."),
      conceptId,
      "independent_application"
    ),
  ],
  qingming: (_item, conceptId) => [
    pairs(
      t("Qingming no calendário", "Qingming on the calendar"),
      t("Combine o sinal com a leitura.", "Match the cue with the reading."),
      [
        { left: t("aparece no calendário", "it appears on the calendar"), right: t("lembrança e visita a túmulos em muitas famílias", "remembrance and grave visits in many families") },
        { left: t("festa de rua obrigatória", "a mandatory street festival"), right: t("não é o núcleo", "is not the core") },
        { left: t("proibição de falar de trabalho", "a ban on talking about work"), right: t("exagero", "overreach") },
      ],
      t("A lembrança ancestral é o núcleo mais estável. A forma do dia varia.", "Ancestral remembrance is the most stable core. The shape of the day varies."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Quando Qingming aparece", "When Qingming appears"),
      t("Qingming aparece no calendário.", "Qingming appears on the calendar."),
      t("A leitura que cabe melhor é ", "The reading that fits better is "),
      t("lembrança familiar", "family remembrance"),
      t(".", "."),
      [t("lembrança familiar", "family remembrance"), t("carnaval", "carnival"), t("feriado só de compras", "shopping-only holiday")],
      t("Perguntar se a pessoa visita a família é mais seguro do que assumir um ritual único.", "Asking whether they visit family is safer than assuming a single ritual."),
      conceptId,
      "independent_application"
    ),
  ],
  "dragon-boat": (_item, conceptId) => [
    fill(
      t("O núcleo do Dragon Boat", "The Dragon Boat core"),
      t("Alguém menciona o festival das barcas-dragão.", "Someone mentions the dragon-boat festival."),
      t("O par mais estável é ", "The most stable pair is "),
      t("barcos e zongzi", "boats and zongzi"),
      t(".", "."),
      [t("barcos e zongzi", "boats and zongzi"), t("obrigação de competir", "a duty to compete"), t("feriado só urbano", "an urban-only holiday")],
      t("Corrida e arroz glutinoso são o núcleo visível. Quem compete ou come o quê varia.", "Racing and sticky rice are the visible core. Who competes or eats what varies."),
      conceptId,
      "guided_application"
    ),
    pairs(
      t("Sinal e leitura", "Cue and reading"),
      t("Combine o que você vê com o que isso costuma marcar.", "Match what you see with what it usually marks."),
      [
        { left: t("barcas-dragão", "dragon boats"), right: t("corrida ritual em muitas cidades", "ritual racing in many cities") },
        { left: t("zongzi", "zongzi"), right: t("comida associada ao dia", "food associated with the day") },
        { left: t("todo mundo rema", "everyone rows"), right: t("exagero: muitos só assistem", "overreach: many only watch") },
      ],
      t("O festival é reconhecível sem virar obrigação atlética.", "The festival is recognizable without becoming an athletic duty."),
      conceptId,
      "independent_application"
    ),
  ],
  "host-insistence": (item, conceptId) => [
    intro(
      t("Mei oferece chá de novo", "Mei offers tea again"),
      t("Você já disse que está bem. Mei segura o bule e pergunta outra vez: 再喝一点吧！", "You already said you are fine. Mei holds the teapot and asks again: 再喝一点吧！"),
      conceptId
    ),
    intro(
      t("Como isso pode soar", "How this can sound"),
      t("Lin: 谢谢，我喝过了。 Mei: 好。 Uma segunda oferta pode ser hospitalidade, não uma ordem.", "Lin: 谢谢，我喝过了。 Mei: 好。 A second offer can be hospitality, not a command."),
      conceptId
    ),
    dialogue(
      t("Agora é a sua vez", "Now it's your turn"),
      t("再喝一点吧！", "再喝一点吧！"),
      t("谢谢，我喝过了。", "谢谢，我喝过了。"),
      [
        t("谢谢，我喝过了。", "谢谢，我喝过了。"),
        t("Não. Pare agora.", "No. Stop now."),
        t("Silêncio até ela desistir", "Silence until she gives up"),
      ],
      t("Agradecer e dar uma razão curta lê a insistência como 客气. Recusar com educação também é possível.", "Thanking and giving a short reason reads the insistence as 客气. A polite decline is also possible."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Ler a segunda oferta", "Reading the second offer"),
      t("Mei oferece chá novamente.", "Mei offers tea again."),
      t("A interpretação mais segura é ", "The safer interpretation is "),
      t("hospitalidade", "hospitality"),
      t(", não uma ordem.", ", not a command."),
      [t("hospitalidade", "hospitality"), t("uma ordem", "a command"), t("um teste de três recusas", "a three-refusal test")],
      t(item.whyPt, item.whyEn),
      conceptId,
      "independent_application"
    ),
  ],
  "shared-dishes": (item, conceptId) => [
    intro(
      t("Jantar na mesa de Mei", "Dinner at Mei's table"),
      t("Vários pratos chegam ao centro. Ninguém pediu um prato só para você.", "Several dishes arrive in the centre. Nobody ordered a plate just for you."),
      conceptId
    ),
    image(
      "rice",
      t("Qual imagem combina com uma refeição compartilhada?", "Which image fits a shared meal?"),
      "rice",
      ["rice", "taxi", "metro"],
      t("Arroz e pratos no centro marcam a mesa coletiva. Táxi e metrô são outro domínio.", "Rice and centre dishes mark the shared table. Taxi and metro are another domain."),
      conceptId,
      "guided_application"
    ),
    contextual(
      t("O que costuma acontecer", "What usually happens"),
      t("Em uma refeição coletiva, os pratos costumam ficar ______.", "At a group meal, the dishes are usually ______."),
      t("no centro da mesa", "in the centre of the table"),
      [
        t("no centro da mesa", "in the centre of the table"),
        t("escondidos", "hidden"),
        t("apenas com o anfitrião", "only with the host"),
      ],
      t(item.summaryPt, item.summaryEn),
      conceptId,
      "independent_application"
    ),
    pairs(
      t("Mesa coletiva", "Shared table"),
      t("Combine o sinal com a leitura.", "Match the cue with the reading."),
      [
        { left: t("pratos no centro", "dishes in the centre"), right: t("todos compartilham", "everyone shares") },
        { left: t("alguém põe comida no seu prato", "someone puts food on your plate"), right: t("pode ser hospitalidade", "can be hospitality") },
        { left: t("recusar com educação", "declining politely"), right: t("também é possível", "is also possible") },
      ],
      t("Compartilhar não apaga o direito de recusar um pouco.", "Sharing does not erase the right to decline a little."),
      conceptId,
      "independent_application"
    ),
    dialogue(
      t("Mei oferece mais um pouco", "Mei offers a little more"),
      t("再吃一点吧！", "再吃一点吧！"),
      t("谢谢，我吃饱了。", "谢谢，我吃饱了。"),
      [
        t("谢谢，我吃饱了。", "谢谢，我吃饱了。"),
        t("Não como comida de ninguém.", "I eat nobody's food."),
        t("Ficar em silêncio olhando o prato", "Stay silent staring at the plate"),
      ],
      t("谢谢 + uma razão curta lê a oferta como hospitalidade.", "谢谢 + a short reason reads the offer as hospitality."),
      conceptId,
      "guided_application"
    ),
  ],
  "chopsticks-rest": (item, conceptId) => [
    image(
      "eat",
      t("Onde os hashis descansam com mais cuidado?", "Where do chopsticks rest more carefully?"),
      "eat",
      ["eat", "rice", "noodles"],
      t("Apoiar ao lado do prato é mais seguro do que fincar no arroz.", "Resting beside the plate is safer than standing them in the rice."),
      conceptId,
      "guided_application"
    ),
    spot(
      t("Onde está o problema?", "Where is the problem?"),
      t("Wang finca os hashis no meio do arroz e vai ao banheiro.", "Wang stands the chopsticks in the rice and goes to the bathroom."),
      t("Hashis fincados no arroz lembram oferenda fúnebre em muitos contextos.", "Chopsticks standing in rice recall a funeral offering in many contexts."),
      [
        t("Hashis fincados no arroz lembram oferenda fúnebre em muitos contextos.", "Chopsticks standing in rice recall a funeral offering in many contexts."),
        t("Ir ao banheiro durante a refeição é o erro cultural.", "Leaving for the bathroom during the meal is the cultural error."),
      ],
      t("O problema é o gesto dos hashis, não o fato de se levantar.", "The problem is the chopstick gesture, not standing up."),
      conceptId,
      "independent_application"
    ),
    fill(
      t("Onde apoiar", "Where to rest them"),
      t("Você precisa soltar os hashis por um momento.", "You need to put the chopsticks down for a moment."),
      t("É mais adequado apoiá-los ", "It is more suitable to rest them "),
      t("ao lado do prato", "beside the plate"),
      t(".", "."),
      [t("ao lado do prato", "beside the plate"), t("no meio do arroz", "in the middle of the rice"), t("no chão", "on the floor")],
      t(item.practicePt, item.practiceEn),
      conceptId,
      "independent_application"
    ),
  ],
  "digital-pay": (item, conceptId) => [
    intro(
      t("No caixa", "At the till"),
      t("O caixa aponta para um QR. Ninguém pergunta se você tem dinheiro vivo.", "The cashier points at a QR code. Nobody asks if you have cash."),
      conceptId
    ),
    pairs(
      t("O que o QR faz", "What the QR does"),
      t("Combine o sinal com a ação.", "Match the cue with the action."),
      [
        { left: t("QR no caixa", "QR at the till"), right: t("pagamento móvel", "mobile payment") },
        { left: t("carteira só com notas", "a wallet with only notes"), right: t("pode não ser a primeira opção", "may not be the first option") },
        { left: t("pedir para assinar um cheque", "asking to sign a cheque"), right: t("é outro mundo", "is another world") },
      ],
      t("O telefone paga. Notas ainda existem, mas o fluxo padrão em muita loja é o QR.", "The phone pays. Notes still exist, but the default flow in many shops is the QR."),
      conceptId,
      "guided_application"
    ),
    dialogue(
      t("O caixa espera", "The cashier waits"),
      t("O caixa aponta o QR. O que você faz?", "The cashier points at the QR. What do you do?"),
      t("Abrir o app de pagamento e alinhar a câmera", "Open the payment app and line up the camera"),
      [
        t("Abrir o app de pagamento e alinhar a câmera", "Open the payment app and line up the camera"),
        t("Deixar o telefone na mesa e esperar", "Leave the phone on the table and wait"),
        t("Pedir para parcelar em 12 vezes", "Ask to pay in 12 instalments"),
      ],
      t(item.practicePt, item.practiceEn),
      conceptId,
      "independent_application"
    ),
  ],
  "metro-qr": (item, conceptId) => [
    image(
      "metro",
      t("Qual imagem é o metrô?", "Which image is the metro?"),
      "metro",
      ["metro", "taxi", "rice"],
      t("O metrô é o espaço público desta lição. Táxi e arroz são outros mundos.", "The metro is this lesson's public space. Taxi and rice are other worlds."),
      conceptId,
      "guided_application"
    ),
    spot(
      t("Onde está o problema?", "Where is the problem?"),
      t("Wang entra no metrô e para exatamente na porta para procurar o mapa.", "Wang enters the metro and stops right in the doorway to look for the map."),
      t("Parar na porta bloqueia quem entra e sai.", "Stopping in the doorway blocks people entering and leaving."),
      [
        t("Parar na porta bloqueia quem entra e sai.", "Stopping in the doorway blocks people entering and leaving."),
        t("Procurar o mapa no telefone é proibido.", "Looking at a map on the phone is forbidden."),
      ],
      t("O mapa pode esperar um passo para dentro. A porta é um fluxo, não uma mesa de estudo.", "The map can wait one step inside. The door is a flow, not a study desk."),
      conceptId,
      "independent_application"
    ),
    dialogue(
      t("Na catraca", "At the gate"),
      t("A catraca espera o QR. O que você faz?", "The gate waits for the QR. What do you do?"),
      t("Abrir o código e passar sem parar na porta", "Open the code and go through without stopping in the doorway"),
      [
        t("Abrir o código e passar sem parar na porta", "Open the code and go through without stopping in the doorway"),
        t("Parar na catraca para achar o hotel no mapa", "Stop at the gate to find the hotel on the map"),
        t("Empurrar a pessoa da frente", "Push the person in front"),
      ],
      t(item.practicePt, item.practiceEn),
      conceptId,
      "guided_application"
    ),
  ],
  "office-hours": (_item, conceptId) => [
    pairs(
      t("Ritmo urbano", "Urban rhythm"),
      t("Combine o horário com a leitura mais segura.", "Match the hour with the safer reading."),
      [
        { left: t("almoço perto do meio-dia", "lunch around noon"), right: t("muita loja fecha um intervalo", "many shops close for a break") },
        { left: t("noite cedo num escritório", "early evening at an office"), right: t("ainda pode haver expediente", "there may still be work hours") },
        { left: t("chegar sem combinar às 23h", "arriving unannounced at 23:00"), right: t("pode ser invasivo", "can be intrusive") },
      ],
      t("Horário de trabalho e refeição organizam a cidade. Não é um relógio universal.", "Work and meal times organise the city. It is not a universal clock."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Antes de aparecer", "Before you show up"),
      t("Você quer resolver algo num escritório.", "You want to get something done at an office."),
      t("É mais seguro ", "It is safer to "),
      t("confirmar o horário", "confirm the hours"),
      t(" do que assumir que está aberto.", " than assume it is open."),
      [t("confirmar o horário", "confirm the hours"), t("ir à meia-noite", "go at midnight"), t("ignorar o almoço", "ignore lunch")],
      t("Um recado ou uma pergunta 现在方便吗? evita a porta fechada.", "A message or 现在方便吗? avoids the closed door."),
      conceptId,
      "independent_application"
    ),
  ],
  "bargaining-context": (item, conceptId) => [
    intro(
      t("Na loja", "In the shop"),
      t("Há uma etiqueta com preço. O vendedor está atrás do caixa. Ninguém começou a pechinchar.", "There is a price tag. The seller is behind the till. Nobody has started bargaining."),
      conceptId
    ),
    pairs(
      t("Onde o preço vive", "Where the price lives"),
      t("Combine o lugar com a leitura.", "Match the place with the reading."),
      [
        { left: t("loja de rede", "chain store"), right: t("preço geralmente fixo", "price usually fixed") },
        { left: t("banca / contexto negociável", "stall / negotiable context"), right: t("negociação pode acontecer", "negotiation may happen") },
        { left: t("QR no caixa", "QR at the till"), right: t("pagamento móvel", "mobile payment") },
      ],
      t("Pechinchar não é a primeira estratégia em preço marcado. No mercado, o contexto muda.", "Bargaining is not the first move on a marked price. In a market, the context changes."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Preço marcado", "Marked price"),
      t("Em uma loja de preço fixo, pechinchar não precisa ser a primeira estratégia.", "In a fixed-price shop, bargaining does not need to be the first strategy."),
      t("Em uma loja de preço fixo, ", "In a fixed-price shop, "),
      t("pechinchar", "bargaining"),
      t(" não precisa ser a primeira estratégia.", " does not need to be the first strategy."),
      [t("pechinchar", "bargaining"), t("pagar", "paying"), t("agradecer", "thanking")],
      t(item.noticePt, item.noticeEn),
      conceptId,
      "independent_application"
    ),
    dialogue(
      t("O vendedor espera", "The seller waits"),
      t("O preço está na etiqueta. O que você faz?", "The price is on the tag. What do you do?"),
      t("Pagar o valor marcado se estiver ok", "Pay the marked amount if it is ok"),
      [
        t("Pagar o valor marcado se estiver ok", "Pay the marked amount if it is ok"),
        t("Exigir metade do preço na hora", "Demand half the price at once"),
        t("Sair sem falar", "Leave without speaking"),
      ],
      t("Aceitar o preço marcado é válido. Pechinchar é uma opção de contexto, não um dever.", "Accepting the marked price is valid. Bargaining is a context option, not a duty."),
      conceptId,
      "independent_application"
    ),
  ],
  "visiting-home": (item, conceptId) => [
    intro(
      t("Você chega", "You arrive"),
      t("A porta está aberta. Ninguém disse ainda 请进. Você observa os sapatos na entrada.", "The door is open. Nobody has said 请进 yet. You look at the shoes at the entrance."),
      conceptId
    ),
    dialogue(
      t("Mei na porta", "Mei at the door"),
      t("请进！", "请进！"),
      t("Tirar os sapatos se houver chinelos e entrar", "Take off your shoes if slippers are there and go in"),
      [
        t("Tirar os sapatos se houver chinelos e entrar", "Take off your shoes if slippers are there and go in"),
        t("Circular a casa inteira logo", "Walk the whole house at once"),
        t("Sentar na cama do quarto", "Sit on the bedroom bed"),
      ],
      t("Observe o anfitrião: sapatos, chinelos, onde sentar. A casa não é um convite automático para circular.", "Watch the host: shoes, slippers, where to sit. The house is not an automatic invitation to wander."),
      conceptId,
      "guided_application"
    ),
    fill(
      t("Antes de circular", "Before you wander"),
      t("Em uma visita, antes de circular pela casa, é mais seguro observar o anfitrião.", "On a visit, before walking around the house, it is safer to observe the host."),
      t("Antes de circular pela casa, é mais seguro ", "Before walking around the house, it is safer to "),
      t("observar", "observe"),
      t(" o comportamento do anfitrião.", " the host's behaviour."),
      [t("observar", "observe"), t("ignorar", "ignore"), t("filmar", "film")],
      t(item.noticePt, item.noticeEn),
      conceptId,
      "independent_application"
    ),
    spot(
      t("Onde está o problema?", "Where is the problem?"),
      t("Lin entra, ignora os chinelos na porta e vai direto ao sofá com os sapatos da rua.", "Lin comes in, ignores the slippers at the door, and goes straight to the sofa in street shoes."),
      t("Os sapatos da rua na sala ignoram o sinal da entrada.", "Street shoes in the living room ignore the entrance cue."),
      [
        t("Os sapatos da rua na sala ignoram o sinal da entrada.", "Street shoes in the living room ignore the entrance cue."),
        t("Sentar no sofá é sempre ofensivo.", "Sitting on the sofa is always offensive."),
      ],
      t("O sinal está na entrada. O sofá em si não é o erro.", "The cue is at the entrance. The sofa itself is not the error."),
      conceptId,
      "independent_application"
    ),
  ],
};

function teachSteps(item: CultureItem, conceptId: string): LessonStep[] {
  return [
    intro(t(item.titlePt, item.titleEn), t(item.summaryPt, item.summaryEn), conceptId),
    intro(
      t("Como ler o contexto", "How to read the context"),
      t(item.noticePt, item.noticeEn),
      conceptId
    ),
    intro(
      t("Por que isso importa", "Why this matters"),
      t(item.whyPt, item.whyEn),
      conceptId
    ),
  ];
}

function buildCultureLesson(item: CultureItem, track: CultureLessonTrack): Lesson {
  const conceptId = `${item.id}-core`;
  const extras = EXTRAS[item.id]?.(item, conceptId) ?? [];
  const steps = [...teachSteps(item, conceptId), ...extras, miniRecall(item, conceptId)];
  return {
    id: cultureLessonIdForItem(item.id),
    title: t(item.titlePt, item.titleEn),
    skill: "leitura",
    lessonDomain: "culture",
    cultureItemId: item.id,
    cultureConceptIds: [conceptId],
    cultureRouteId: track,
    cultureMemoryTargets: [conceptId],
    cultureSources: item.sources,
    estimatedMinutes: Math.max(3, item.estimatedMinutes),
    rewardQi: 2,
    steps,
  };
}

export const CULTURE_NATIVE_LESSONS: Lesson[] = CULTURE_JOURNEY_PLACEMENT.map((row) => {
  const item = getCultureItem(row.itemId) ?? CULTURE_ITEMS.find((entry) => entry.id === row.itemId);
  if (!item) throw new Error(`CultureItem missing for native lesson: ${row.itemId}`);
  return buildCultureLesson(item, row.track);
});

export function getCultureNativeLesson(id: string | undefined | null): Lesson | undefined {
  if (!id) return undefined;
  return CULTURE_NATIVE_LESSONS.find((lesson) => lesson.id === id);
}

export function getCultureNativeLessonForItem(itemId: string | undefined | null): Lesson | undefined {
  if (!itemId) return undefined;
  return getCultureNativeLesson(cultureLessonIdForItem(itemId));
}
