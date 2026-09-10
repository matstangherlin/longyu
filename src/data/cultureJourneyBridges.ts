/**
 * Journey Culture Bridges — micro touchpoints derived from lesson.cultureItemId.
 * Not inserted into journey.ts (fingerprint stays stable). LessonPlayer injects them.
 */

import { CULTURE_INELIGIBLE_UNITS } from "./cultureDistribution";
import { loc, type CultureChoiceOption, type CultureLocaleText, type CultureStoryBeat } from "./cultureQuest";
import { JOURNEY, type StepKind } from "./journey";

export type CultureBridgeTaskKind = "scenario" | "dialogue" | "sequence" | "visual_choice" | "identify_mistake";

export type CultureJourneyBridge = {
  lessonId: string;
  cultureItemId: string;
  cultureConceptId: string;
  placement: "mid" | "end";
  teachTitle: CultureLocaleText;
  explanation: CultureLocaleText;
  rememberPrompt: CultureLocaleText;
  taskKind: CultureBridgeTaskKind;
  prompt: CultureLocaleText;
  options?: CultureChoiceOption[];
  sequence?: { id: string; label: CultureLocaleText }[];
  sequenceCorrect?: string[];
  visual?: CultureStoryBeat["visual"];
  beats?: CultureStoryBeat[];
};

const BRIDGE_BLOCKED: ReadonlySet<StepKind> = new Set([
  "conversation_scene",
  "listen_select",
  "listen",
  "tone",
  "tone_pair",
  "audio_discrimination",
  "hanzi_build",
  "hanzi_evolution",
  "decompose",
  "produce",
  "free_production",
  "dictation",
]);

function choice(
  id: string,
  label: CultureLocaleText,
  preferred: boolean,
  feedback: CultureLocaleText,
  reaction?: CultureStoryBeat
): CultureChoiceOption {
  return { id, label, preferred, feedback, reaction };
}

function meiOk(id: string, text: CultureLocaleText): CultureStoryBeat {
  return { id, speaker: "mei", hanzi: "好。", pinyin: "Hǎo.", text };
}

export const CULTURE_JOURNEY_BRIDGES: CultureJourneyBridge[] = [
  {
    lessonId: "l2",
    cultureItemId: "greetings-nihao",
    cultureConceptId: "greetings-nihao-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Cumprimentar de novo a mesma pessoa no mesmo dia não precisa de um 你好 solene. Um aceno, o nome ou um 你好 curto podem bastar.",
      "Greeting the same person again on the same day does not need a formal 你好. A nod, their name, or a short 你好 can be enough."
    ),
    rememberPrompt: loc("Você lembra deste gesto de cumprimento?", "Do you remember this greeting cue?"),
    taskKind: "scenario",
    prompt: loc(
      "Você já disse 你好 de manhã. À tarde cruza a mesma colega no corredor. Qual leitura é mais leve?",
      "You already said 你好 in the morning. In the afternoon you pass the same classmate in the hall. Which reading is lighter?"
    ),
    options: [
      choice(
        "a",
        loc("Parar e repetir 你好 como se fosse o primeiro encontro.", "Stop and repeat 你好 as if it were the first meeting."),
        false,
        loc("Pode soar rígido. Um aceno curto costuma bastar no segundo cruzamento.", "That can feel stiff. A short nod is usually enough on the second pass.")
      ),
      choice(
        "b",
        loc("Um aceno, o nome ou um 你好 curto.", "A nod, their name, or a short 你好."),
        true,
        loc("Isso. A dose do cumprimento muda com o quanto vocês já se viram hoje.", "Yes. The dose of the greeting changes with how often you have already seen each other today.")
      ),
      choice(
        "c",
        loc("Não cumprimentar nunca, para não parecer 客气.", "Never greet at all, so you do not seem 客气."),
        false,
        loc("Ignorar por completo também pode parecer frio. Há um meio-termo.", "Ignoring them entirely can also feel cold. There is a middle path.")
      ),
    ],
  },
  {
    lessonId: "l4",
    cultureItemId: "thanks-keqi",
    cultureConceptId: "thanks-keqi-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "不客气 muitas vezes acolhe o agradecimento e reduz a formalidade. Não significa que o favor foi um erro.",
      "不客气 often accepts the thanks and reduces formality. It does not mean the favour was a mistake."
    ),
    rememberPrompt: loc("Você lembra o que 不客气 costuma fazer numa conversa?", "Do you remember what 不客气 often does in a conversation?"),
    taskKind: "dialogue",
    prompt: loc("Mei ajudou e você disse 谢谢. Ela responde 不客气. Como seguir?", "Mei helped and you said 谢谢. She replies 不客气. How do you continue?"),
    beats: [
      {
        id: "l4-bridge-mei",
        speaker: "mei",
        hanzi: "不客气。",
        pinyin: "Bú kèqì.",
        text: loc("Ela fecha o gesto de ajuda.", "She closes the helping gesture."),
      },
    ],
    options: [
      choice(
        "a",
        loc("Insistir em pagar agora, porque o 不客气 cancelou o favor.", "Insist on paying now, because 不客气 cancelled the favour."),
        false,
        loc("不客气 não cancela o favor. Costuma só baixar a formalidade.", "不客气 does not cancel the favour. It usually just lowers the formality."),
        meiOk("l4-a-rx", loc("Mei parece confusa com a insistência.", "Mei looks confused by the insistence."))
      ),
      choice(
        "b",
        loc("Sorrir e seguir. O agradecimento já foi acolhido.", "Smile and continue. The thanks was already accepted."),
        true,
        loc("Isso. 不客气 fecha o ciclo sem transformar a ajuda numa dívida imediata.", "Yes. 不客气 closes the cycle without turning the help into an instant debt."),
        meiOk("l4-b-rx", loc("Mei segue a conversa normalmente.", "Mei continues the conversation as usual."))
      ),
      choice(
        "c",
        loc("Pedir desculpas por ter agradecido.", "Apologise for having said thanks."),
        false,
        loc("Agradecer não foi um erro. 不客气 não é uma correção.", "Thanking was not a mistake. 不客气 is not a correction."),
        { id: "l4-c-rx", speaker: "mei", hanzi: "没事。", pinyin: "Méi shì.", text: loc("Mei trata o momento como simples.", "Mei treats the moment as simple.") }
      ),
    ],
  },
  {
    lessonId: "p1-qingwen-cortesia",
    cultureItemId: "qingwen-ask",
    cultureConceptId: "qingwen-ask-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Para pedir informação a alguém que você não conhece bem, abrir com 请问 marca o pedido como cortês — não como ordem.",
      "To ask someone you do not know well for information, opening with 请问 marks the request as polite — not as a command."
    ),
    rememberPrompt: loc("Você lembra por que 请问 vem antes da pergunta?", "Do you remember why 请问 comes before the question?"),
    taskKind: "sequence",
    prompt: loc("Ordene o pedido a um desconhecido no corredor.", "Put the request to a stranger in the corridor in order."),
    sequence: [
      { id: "open", label: loc("请问", "请问") },
      { id: "ask", label: loc("Fazer a pergunta", "Ask the question") },
      { id: "thanks", label: loc("谢谢", "谢谢") },
    ],
    sequenceCorrect: ["open", "ask", "thanks"],
  },
  {
    lessonId: "l24",
    cultureItemId: "family-terms",
    cultureConceptId: "family-terms-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Quando alguém diz 这是我妈妈, está apresentando a relação. Um cumprimento curto à mãe é mais adequado do que tratar o nome como se fosse de um colega.",
      "When someone says 这是我妈妈, they are introducing the relationship. A short greeting to the mother is more suitable than treating the name like a classmate's."
    ),
    rememberPrompt: loc("Você lembra o que a apresentação da mãe pede de você?", "Do you remember what introducing someone's mother asks of you?"),
    taskKind: "scenario",
    prompt: loc("Mei diz 这是我妈妈. Qual leitura é mais segura?", "Mei says 这是我妈妈. Which reading is safer?"),
    options: [
      choice(
        "a",
        loc("Usar o primeiro nome dela na hora, como na turma.", "Use her given name at once, as in class."),
        false,
        loc("O papel na casa importa. O primeiro nome pode ser íntimo demais neste primeiro contato.", "The role in the home matters. The given name can feel too intimate on this first contact.")
      ),
      choice(
        "b",
        loc("Cumprimentar de forma curta, reconhecendo que é a mãe dela.", "Give a short greeting, recognising that this is her mother."),
        true,
        loc("A apresentação marca a relação. Um cumprimento curto fecha o momento.", "The introduction marks the relationship. A short greeting closes the moment.")
      ),
      choice(
        "c",
        loc("Não cumprimentar: o nome é só uma tradução de «esta pessoa».", "Do not greet: the name is only a translation of “this person”."),
        false,
        loc("Ignorar a apresentação apaga o cuidado do gesto.", "Ignoring the introduction erases the care of the gesture.")
      ),
    ],
  },
  {
    lessonId: "l26",
    cultureItemId: "host-insistence",
    cultureConceptId: "host-insistence-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Em contexto familiar ou entre conhecidos, uma segunda oferta pode ser hospitalidade — não ordem. Você ainda pode recusar com 谢谢 e uma razão curta.",
      "Among family or acquaintances, a second offer can be hospitality — not an order. You can still decline with 谢谢 and a short reason."
    ),
    rememberPrompt: loc("Você lembra como ler uma segunda oferta à mesa?", "Do you remember how to read a second offer at the table?"),
    taskKind: "dialogue",
    prompt: loc("Mei insiste um pouco. Qual resposta demonstra a ideia?", "Mei insists a little. Which reply shows the idea?"),
    beats: [
      {
        id: "l26-bridge-mei",
        speaker: "mei",
        hanzi: "再吃一点吧！",
        pinyin: "Zài chī yīdiǎn ba!",
        text: loc("Você já disse que está satisfeito.", "You already said you are full."),
      },
    ],
    options: [
      choice(
        "a",
        loc("谢谢，我吃饱了。", "谢谢，我吃饱了。"),
        true,
        loc("Agradecer e explicar fecha a 客气 sem tratar a oferta como ordem.", "Thanking and explaining closes 客气 without treating the offer as an order."),
        meiOk("l26-a-rx", loc("Mei aceita e a conversa segue.", "Mei accepts and the conversation continues."))
      ),
      choice(
        "b",
        loc("不要了，谢谢。", "不要了，谢谢。"),
        true,
        loc("不要了 já aparece nesta aula de restaurante. Aqui fecha o gesto com educação.", "不要了 already appears in this restaurant lesson. Here it closes the gesture politely."),
        meiOk("l26-b-rx", loc("Mei diz 好 e não insiste mais.", "Mei says 好 and does not insist further."))
      ),
      choice(
        "c",
        loc("Para. Eu disse não.", "Stop. I said no."),
        false,
        loc("O «não» pode ser justo; o tom trata a hospitalidade como ataque.", "The “no” may be fair; the tone treats hospitality as an attack."),
        { id: "l26-c-rx", speaker: "mei", hanzi: "好吧。", pinyin: "Hǎo ba.", text: loc("O ar ficou mais seco.", "The mood became drier.") }
      ),
    ],
  },
  {
    lessonId: "l26b",
    cultureItemId: "shared-dishes",
    cultureConceptId: "shared-dishes-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Em muitas refeições coletivas, os pratos podem chegar ao centro da mesa para serem compartilhados. Almoços individuais, hotpot e outros contextos podem variar.",
      "At many group meals, dishes may arrive in the centre of the table to be shared. Solo lunches, hotpot, and other contexts can vary."
    ),
    rememberPrompt: loc("Você lembra como ler uma mesa com vários pratos no centro?", "Do you remember how to read a table with several dishes in the centre?"),
    taskKind: "visual_choice",
    visual: "shared-table",
    prompt: loc(
      "Você está com Mei e vários pratos chegam ao centro. Qual leitura é mais provável?",
      "You are with Mei and several dishes arrive in the centre. Which reading is more likely?"
    ),
    options: [
      choice(
        "a",
        loc("Cada um come só o prato que escolheu, sem compartilhar.", "Each person eats only the dish they ordered, with no sharing."),
        false,
        loc("Nesta mesa o sinal é coletivo. Prato individual existe — mas aqui o centro é para o grupo.", "At this table the cue is communal. Individual plates exist — but here the centre is for the group.")
      ),
      choice(
        "b",
        loc("Os pratos ficam no centro para o grupo servir um pouco de cada.", "The dishes stay in the centre for the group to take a little of each."),
        true,
        loc("Essa é a leitura mais comum nesta cena. Não é uma lei de esvaziar tudo.", "That is the more common reading in this scene. It is not a law to empty everything.")
      ),
      choice(
        "c",
        loc("É obrigatório esvaziar todos os pratos comunitários.", "Everyone must empty every communal dish."),
        false,
        loc("Compartilhar não é uma regra de esvaziar o centro.", "Sharing is not a rule to empty the centre.")
      ),
    ],
  },
  {
    lessonId: "l26c",
    cultureItemId: "chopsticks-rest",
    cultureConceptId: "chopsticks-rest-core",
    placement: "end",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Você terminou de comer e vai apoiar os hashis. Numa pausa comum, a horizontal no prato ou no descanso é a leitura mais segura. Espetar no arroz lembra incenso para muita gente.",
      "You have finished eating and will rest the chopsticks. In an ordinary pause, laying them horizontally on the plate or rest is the safer reading. Standing them in rice recalls incense for many people."
    ),
    rememberPrompt: loc("Você lembra onde pousar os hashis numa pausa normal?", "Do you remember where to rest chopsticks in an ordinary pause?"),
    taskKind: "identify_mistake",
    visual: "chopsticks-table",
    prompt: loc("Qual opção você usaria numa pausa normal?", "Which option would you use in an ordinary pause?"),
    options: [
      choice(
        "a",
        loc("Imagem A: hashis no descanso, na horizontal.", "Image A: chopsticks on the rest, horizontally."),
        true,
        loc("A horizontal é o descanso usual numa refeição comum.", "Horizontal rest is the usual pause at an ordinary meal.")
      ),
      choice(
        "b",
        loc("Imagem B: hashis verticais no meio do arroz.", "Image B: chopsticks standing vertically in the rice."),
        false,
        loc("Esse gesto visualmente se aproxima de oferendas. Não é lei — chama atenção.", "That gesture visually recalls offerings. It is not a law — it stands out.")
      ),
    ],
  },
  {
    lessonId: "l27",
    cultureItemId: "digital-pay",
    cultureConceptId: "digital-pay-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Em muitos caixas, o código QR é o caminho padrão. Dinheiro ainda existe, mas procurar notas primeiro pode atrasar a fila.",
      "At many tills, the QR code is the default path. Cash still exists, but looking for notes first can slow the queue."
    ),
    rememberPrompt: loc("Você lembra o gesto mais comum no caixa?", "Do you remember the more common gesture at the till?"),
    taskKind: "scenario",
    visual: "qr-till",
    prompt: loc("A conta chegou e há um código no balcão. Qual leitura é mais comum?", "The bill arrived and there is a code on the counter. Which reading is more common?"),
    options: [
      choice(
        "a",
        loc("Procurar notas primeiro, porque cartão e QR são exceção.", "Look for notes first, because cards and QR are the exception."),
        false,
        loc("Em muitos lugares o QR é o padrão. Notas ainda servem — mas não são o primeiro reflexo.", "In many places QR is the default. Notes still work — but they are not the first reflex.")
      ),
      choice(
        "b",
        loc("Abrir o app, escanear e esperar a confirmação na tela.", "Open the app, scan, and wait for the on-screen confirmation."),
        true,
        loc("Esse é o ritmo mais comum neste caixa contemporâneo.", "That is the more common rhythm at this contemporary till.")
      ),
      choice(
        "c",
        loc("Deixar o celular na mesa e esperar que o caixa cobre sozinho.", "Leave the phone on the table and wait for the till to charge you by itself."),
        false,
        loc("Alguém ainda precisa escanear ou mostrar o código.", "Someone still needs to scan or show the code.")
      ),
    ],
  },
  {
    lessonId: "p6-rotina-trabalho",
    cultureItemId: "office-hours",
    cultureConceptId: "office-hours-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "你几点上班？ pode ser small talk de rotina entre conhecidos — não uma ficha policial. Você pode responder ou desviar com educação.",
      "你几点上班？ can be routine small talk among acquaintances — not a police form. You can answer or deflect politely."
    ),
    rememberPrompt: loc("Você lembra como ler 你几点上班？ entre conhecidos?", "Do you remember how to read 你几点上班？ among acquaintances?"),
    taskKind: "scenario",
    prompt: loc("Um colega pergunta 你几点上班？ Qual leitura é mais segura?", "A colleague asks 你几点上班？ Which reading is safer?"),
    options: [
      choice(
        "a",
        loc("É uma investigação: você deve o holerite.", "It is an investigation: you owe a payslip."),
        false,
        loc("Rotina pode ser calor, não invasão automática. Você não deve o holerite.", "Routine can be warmth, not an automatic invasion. You do not owe a payslip.")
      ),
      choice(
        "b",
        loc("Pode ser conversa de rotina. Responder ou desviar com educação.", "It can be routine chat. Answer or deflect politely."),
        true,
        loc("Isso. A pergunta marca o dia, não uma auditoria.", "Yes. The question marks the day, not an audit.")
      ),
      choice(
        "c",
        loc("Existe um horário «chinês» único para todo escritório.", "There is a single “Chinese timetable” for every office."),
        false,
        loc("Escritório, escola e plataforma diferem. Não há um horário nacional único.", "Office, school, and platform differ. There is no single national timetable.")
      ),
    ],
  },
  {
    lessonId: "p6-cidade-lugares",
    cultureItemId: "metro-qr",
    cultureConceptId: "metro-qr-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "No metrô, o código no celular costuma ser o passe. Parar na catraca para procurar o app atrasa quem vem atrás.",
      "On the metro, the code on the phone is often the pass. Stopping at the gate to find the app delays the people behind you."
    ),
    rememberPrompt: loc("Você lembra o ritmo na catraca?", "Do you remember the rhythm at the gate?"),
    taskKind: "sequence",
    prompt: loc("Ordene a passagem na catraca.", "Put the gate crossing in order."),
    sequence: [
      { id: "open", label: loc("Abrir o código antes da fila", "Open the code before the queue") },
      { id: "scan", label: loc("Escanear e passar", "Scan and walk through") },
      { id: "move", label: loc("Não parar na catraca", "Do not stop at the gate") },
    ],
    sequenceCorrect: ["open", "scan", "move"],
  },
  {
    lessonId: "p6-compras",
    cultureItemId: "bargaining-context",
    cultureConceptId: "bargaining-context-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Negociar preço pode acontecer em algumas bancas e lojas pequenas. Em supermercado, loja de rede e preço claramente marcado, pechinchar costuma não caber. Olhe o contexto antes de 太贵了.",
      "Bargaining can happen at some stalls and small shops. In a supermarket, a chain store, and a clearly tagged price, haggling usually does not fit. Read the setting before 太贵了."
    ),
    rememberPrompt: loc("Você lembra quando 太贵了 cabe?", "Do you remember when 太贵了 fits?"),
    taskKind: "scenario",
    prompt: loc(
      "Há uma etiqueta clara numa loja de rede. Qual leitura é mais segura?",
      "There is a clear tag in a chain shop. Which reading is safer?"
    ),
    options: [
      choice(
        "a",
        loc("Negociar, porque no mercado chinês sempre se pechincha.", "Haggle, because in the Chinese market people always bargain."),
        false,
        loc("Isso generaliza demais. Preço marcado numa loja de rede não é banca.", "That over-generalises. A tagged chain-shop price is not a stall.")
      ),
      choice(
        "b",
        loc("Pagar o valor da etiqueta, ou desistir com 不要了.", "Pay the tagged amount, or step away with 不要了."),
        true,
        loc("Esse é o caminho usual neste caixa. Negociação depende do estabelecimento.", "That is the usual path at this till. Bargaining depends on the shop.")
      ),
      choice(
        "c",
        loc("O preço na etiqueta é só um convite para começar a pechincha.", "The tagged price is only an invitation to start haggling."),
        false,
        loc("A lei pede o preço visível. Não trata a etiqueta como um jogo.", "The law asks for a visible price. It does not treat the tag as a game.")
      ),
    ],
  },
  {
    lessonId: "p7-imersao-casa-amigo",
    cultureItemId: "visiting-home",
    cultureConceptId: "visiting-home-core",
    placement: "mid",
    teachTitle: loc("Na vida real 🇨🇳", "In real life 🇨🇳"),
    explanation: loc(
      "Na casa de alguém, a porta aberta não significa que toda a casa já está disponível. Observe os sinais do anfitrião antes de circular.",
      "In someone's home, an open door does not mean the whole house is already available. Watch the host's cues before walking further in."
    ),
    rememberPrompt: loc("Você lembra o que fazer quando a porta abre?", "Do you remember what to do when the door opens?"),
    taskKind: "scenario",
    visual: "door-shoes",
    prompt: loc("A porta abriu. Ninguém indicou o sofá. Qual ação demonstra a ideia?", "The door opened. Nobody pointed to the sofa. Which action shows the idea?"),
    options: [
      choice(
        "a",
        loc("Entrar e ir até a cozinha para ajudar.", "Walk in and go to the kitchen to help."),
        false,
        loc("Ajudar pode ser bem-vindo depois. Sem convite, circular a casa ainda é cedo.", "Helping can be welcome later. Without a cue, walking the home is still early.")
      ),
      choice(
        "b",
        loc("Cumprimentar e esperar o próximo sinal para entrar ou sentar.", "Greet them and wait for the next cue to come in or sit."),
        true,
        loc("Isso lê o anfitrião em vez de supor que o espaço já está aberto.", "That reads the host instead of assuming the space is already open.")
      ),
      choice(
        "c",
        loc("Sentar no sofá principal em silêncio.", "Sit on the main sofa in silence."),
        false,
        loc("Escolher o melhor lugar sozinho pode soar invasivo.", "Picking the best seat uninvited can feel intrusive.")
      ),
    ],
  },
];

const byLesson = new Map(CULTURE_JOURNEY_BRIDGES.map((bridge) => [bridge.lessonId, bridge]));

export function cultureBridgeForLesson(lessonId: string): CultureJourneyBridge | undefined {
  return byLesson.get(lessonId);
}

export function isCultureBridgeBlockedKind(kind: StepKind | string): boolean {
  return BRIDGE_BLOCKED.has(kind as StepKind);
}

export function lessonUnitId(lessonId: string): string | undefined {
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      if (unit.lessons.some((lesson) => lesson.id === lessonId)) return unit.id;
    }
  }
  return undefined;
}

export function cultureBridgeUnitIsEligible(lessonId: string): boolean {
  const unitId = lessonUnitId(lessonId);
  if (!unitId) return false;
  return !CULTURE_INELIGIBLE_UNITS[unitId];
}
