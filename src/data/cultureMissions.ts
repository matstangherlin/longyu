/**
 * Culture missions for every published CultureItem.
 * Flagship missions carry story + dialogue. Short missions still require
 * context, two tasks, feedback, and a memory target.
 */

import { CULTURE_ITEMS, getCultureItem, type CultureItem } from "./culture";
import {
  CULTURE_FLAGSHIP_ITEM_IDS,
  CULTURE_MISSION_XP,
  loc,
  type CultureChoiceOption,
  type CultureLocaleText,
  type CultureMemoryTarget,
  type CultureMission,
  type CultureMissionStep,
  type CultureReviewVariant,
} from "./cultureQuest";
import { cultureRouteForItem } from "./cultureQuest";

const FLAGSHIP = new Set<string>(CULTURE_FLAGSHIP_ITEM_IDS);

function itemOrThrow(id: string): CultureItem {
  const item = getCultureItem(id);
  if (!item) throw new Error(`CultureItem missing: ${id}`);
  return item;
}

function miniChoices(item: CultureItem, mayVary = Boolean(item.variabilityPt)): CultureChoiceOption[] {
  return item.miniCheck.options.map((option) => {
    const preferred = option.id === item.miniCheck.correctOptionId;
    return {
      id: option.id,
      label: loc(option.labelPt, option.labelEn),
      preferred,
      mayVary: preferred ? false : mayVary,
      feedback: preferred
        ? loc(item.miniCheck.explanationPt, item.miniCheck.explanationEn)
        : loc(
            `Essa escolha pode funcionar em alguns contextos, mas é mais arriscada. ${item.miniCheck.explanationPt}`,
            `That choice can work in some contexts, but it is riskier. ${item.miniCheck.explanationEn}`
          ),
    };
  });
}

function memoryFromItem(
  item: CultureItem,
  concept: CultureLocaleText,
  extraPrompt?: CultureLocaleText,
  extraVariants?: Partial<Record<"story" | "sequence", CultureReviewVariant>>
): CultureMemoryTarget {
  const choices = miniChoices(item);
  const preferred = choices.find((row) => row.preferred) ?? choices[1];
  const distractors = choices.filter((row) => !row.preferred).map((row) => row.label);
  return {
    id: `${item.id}-core`,
    cultureItemId: item.id,
    concept,
    prompt: extraPrompt ?? loc(item.miniCheck.promptPt, item.miniCheck.promptEn),
    options: choices,
    distractors,
    reviewVariants: [
      {
        kind: "scenario_choice",
        prompt: extraPrompt ?? loc(item.miniCheck.promptPt, item.miniCheck.promptEn),
        options: choices,
      },
      extraVariants?.story ?? {
        kind: "story_error",
        prompt: loc(
          `Numa história curta, alguém faz o contrário de: “${concept.pt}”. O que falhou?`,
          `In a short story, someone does the opposite of: “${concept.en}”. What went wrong?`
        ),
        options: [
          {
            id: "a",
            label: loc("Nada: o gesto é obrigatório em qualquer casa da China.", "Nothing: the gesture is mandatory in every home in China."),
            preferred: false,
            feedback: loc("Não transforme o conceito numa regra absoluta.", "Do not turn the concept into an absolute rule."),
            mayVary: true,
          },
          {
            id: "b",
            label: preferred?.label ?? loc("A leitura contextual mais segura.", "The safer contextual reading."),
            preferred: true,
            feedback: loc(item.miniCheck.explanationPt, item.miniCheck.explanationEn),
          },
          {
            id: "c",
            label: loc("Ignorar o contexto e copiar um guia de viagem.", "Ignore the context and copy a travel-guide rule."),
            preferred: false,
            feedback: loc("Guias genéricos apagam região, geração e formalidade.", "Generic guides erase region, generation, and formality."),
          },
        ],
      },
      extraVariants?.sequence ?? {
        kind: "sequence",
        prompt: loc("Ordene: perceber o contexto → decidir com cuidado → agradecer.", "Order: notice the context → decide carefully → thank them."),
        sequence: [
          { id: "notice", label: loc("Observar o ambiente e o convite", "Notice the setting and the invitation") },
          { id: "decide", label: loc("Escolher um gesto adequado, não uma regra absoluta", "Choose a fitting gesture, not an absolute rule") },
          { id: "thanks", label: loc("Agradecer com 谢谢 quando couber", "Say 谢谢 when it fits") },
        ],
        sequenceCorrect: ["notice", "decide", "thanks"],
      },
    ],
  };
}

function summaryStep(item: CultureItem): CultureMissionStep {
  return {
    id: `${item.id}-summary`,
    kind: "culture_summary",
    scored: false,
    prompt: loc("O que você leva daqui", "What you take from this"),
    body: loc(item.practicePt, item.practiceEn),
  };
}

function recallStep(target: CultureMemoryTarget): CultureMissionStep {
  return {
    id: `${target.cultureItemId}-recall`,
    kind: "culture_recall",
    scored: true,
    memoryTargetId: target.id,
    prompt: target.prompt,
    options: target.options,
  };
}

function shortMission(
  itemId: string,
  extras: {
    difficulty?: 1 | 2 | 3;
    concept: CultureLocaleText;
    second: CultureMissionStep;
    extraStory?: CultureMissionStep[];
    takeaways: CultureLocaleText[];
    visual?: CultureMissionStep["visual"];
  }
): CultureMission {
  const item = itemOrThrow(itemId);
  const routeId = cultureRouteForItem(itemId)?.id ?? "everyday-china";
  const memory = memoryFromItem(item, extras.concept);
  const steps: CultureMissionStep[] = [
    {
      id: `${itemId}-context`,
      kind: "story",
      scored: false,
      prompt: loc(item.situationPt, item.situationEn),
      visual: extras.visual,
      beats: [
        { id: `${itemId}-notice`, speaker: "narrator", text: loc(item.noticePt, item.noticeEn) },
      ],
    },
    ...(extras.extraStory ?? []),
    {
      id: `${itemId}-choice`,
      kind: "scenario_choice",
      scored: true,
      prompt: loc(item.miniCheck.promptPt, item.miniCheck.promptEn),
      options: miniChoices(item),
    },
    extras.second,
    recallStep(memory),
    summaryStep(item),
  ];
  return {
    id: itemId,
    cultureItemId: itemId,
    titlePt: item.titlePt,
    titleEn: item.titleEn,
    routeId,
    difficulty: extras.difficulty ?? 1,
    estimatedMinutes: item.estimatedMinutes,
    flagship: FLAGSHIP.has(itemId),
    steps,
    memoryTargets: [memory],
    reward: { xp: CULTURE_MISSION_XP },
    takeaways: extras.takeaways,
  };
}

function matchStep(id: string, pairs: CultureMissionStep["matchPairs"]): CultureMissionStep {
  return {
    id,
    kind: "match",
    scored: true,
    prompt: loc("Una cada situação à leitura mais segura.", "Match each situation to the safer reading."),
    matchPairs: pairs,
  };
}

function sequenceStep(id: string, prompt: CultureLocaleText, items: { id: string; pt: string; en: string }[], correct: string[]): CultureMissionStep {
  return {
    id,
    kind: "sequence",
    scored: true,
    prompt,
    sequence: items.map((row) => ({ id: row.id, label: loc(row.pt, row.en) })),
    sequenceCorrect: correct,
  };
}

const visitingHome = ((): CultureMission => {
  const item = itemOrThrow("visiting-home");
  const memory = memoryFromItem(
    item,
    loc(
      "Na entrada, observar o costume da casa e esperar o convite é a leitura mais segura.",
      "At the entrance, noticing the household custom and waiting for an invitation is the safer reading."
    )
  );
  return {
    id: "visiting-home",
    cultureItemId: "visiting-home",
    titlePt: "Jantar na casa de Mei",
    titleEn: "Dinner at Mei's home",
    routeId: "home-visits",
    difficulty: 2,
    estimatedMinutes: 5,
    flagship: true,
    takeaways: [
      loc("Espere 请进 / 请坐 antes de circular.", "Wait for 请进 / 请坐 before walking further in."),
      loc("Sapatos: siga o que você vê na entrada.", "Shoes: follow what you see at the door."),
      loc("Não visite cômodos sem convite.", "Do not tour rooms uninvited."),
    ],
    reward: { xp: CULTURE_MISSION_XP, sealIds: ["visitor-ready"] },
    memoryTargets: [memory],
    steps: [
      {
        id: "vh-story-1",
        kind: "story",
        scored: false,
        prompt: loc("Você foi convidado para jantar na casa de Mei.", "You were invited to dinner at Mei's home."),
        beats: [
          {
            id: "vh-door",
            speaker: "mei",
            hanzi: "欢迎！请进！",
            pinyin: "Huānyíng! Qǐng jìn!",
            text: loc("Mei está na porta e te recebe.", "Mei is at the door and welcomes you."),
            visual: "door-shoes",
          },
          {
            id: "vh-shoes",
            speaker: "narrator",
            text: loc(
              "Você entra e percebe um móvel cheio de sapatos perto da porta.",
              "You step in and notice a cabinet full of shoes by the door."
            ),
            visual: "door-shoes",
          },
        ],
      },
      {
        id: "vh-shoes-choice",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("O que você faz?", "What do you do?"),
        visual: "door-shoes",
        options: [
          {
            id: "a",
            label: loc("Entra normalmente sem observar.", "Walk in as usual without noticing."),
            preferred: false,
            feedback: loc(
              "Pode funcionar em algumas casas, mas você deixou de perceber um sinal importante na entrada.",
              "That can work in some homes, but you missed an important cue at the entrance."
            ),
            mayVary: true,
          },
          {
            id: "b",
            label: loc("Olha o que as outras pessoas fazem e segue o costume da casa.", "Look at what others do and follow the household custom."),
            preferred: true,
            feedback: loc(
              "Isso. O costume pode variar entre famílias. Observar o ambiente é a opção mais segura.",
              "Yes. The custom can vary between families. Noticing the setting is the safer option."
            ),
          },
          {
            id: "c",
            label: loc("Pergunta se pode conhecer os outros cômodos.", "Ask if you can look around the other rooms."),
            preferred: false,
            feedback: loc(
              "Circular a casa sem convite pode soar invasivo. Espere 请进 / 请坐 e o lugar que Mei oferecer.",
              "Touring the home uninvited can feel intrusive. Wait for 请进 / 请坐 and the place Mei offers."
            ),
          },
        ],
      },
      {
        id: "vh-tea-story",
        kind: "story",
        scored: false,
        beats: [
          {
            id: "vh-tea-1",
            speaker: "mei",
            hanzi: "喝茶吗？",
            pinyin: "Hē chá ma?",
            text: loc("Mei oferece chá. Você recusa com educação.", "Mei offers tea. You decline politely."),
          },
          {
            id: "vh-tea-2",
            speaker: "mei",
            hanzi: "喝一点吧。",
            pinyin: "Hē yīdiǎn ba.",
            text: loc("Ela oferece novamente.", "She offers again."),
          },
        ],
      },
      {
        id: "vh-tea-choice",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("O que essa segunda oferta pode significar?", "What can this second offer mean?"),
        options: [
          {
            id: "a",
            label: loc("É uma ordem. Recusar agora seria ofensa grave.", "It is an order. Refusing now would be a serious insult."),
            preferred: false,
            feedback: loc(
              "A insistência pode ser hospitalidade, não uma ordem. Recusar com 谢谢 e uma razão curta continua possível.",
              "The extra offer can be hospitality, not a command. Declining with 谢谢 and a short reason is still possible."
            ),
            mayVary: true,
          },
          {
            id: "b",
            label: loc("Pode ser 客气: um ritual de cuidado. Agradecer e aceitar ou recusar com uma razão curta.", "It may be 客气: a care ritual. Thank her, then accept or decline with a short reason."),
            preferred: true,
            feedback: loc(
              "A leitura mais segura é hospitalidade contextual — não uma regra de três recusas.",
              "The safer reading is contextual hospitality — not a three-refusal rule."
            ),
          },
          {
            id: "c",
            label: loc("É um teste. Você deve recusar três vezes sempre.", "It is a test. You must always refuse three times."),
            preferred: false,
            feedback: loc("Não existe uma lei de três recusas. A dose de 客气 muda com intimidade e formalidade.", "There is no three-refusal law. The dose of 客气 changes with closeness and formality."),
            mayVary: true,
          },
        ],
      },
      {
        id: "vh-dialogue",
        kind: "dialogue_choice",
        scored: true,
        prompt: loc("Como você responde?", "How do you reply?"),
        beats: [
          {
            id: "vh-drink",
            speaker: "mei",
            hanzi: "喝一点吧。",
            pinyin: "Hē yīdiǎn ba.",
            text: loc("Mei espera a sua reação.", "Mei waits for your reaction."),
          },
        ],
        options: [
          {
            id: "a",
            label: loc("谢谢！(aceitar um pouco)", "谢谢！(accept a little)"),
            preferred: true,
            feedback: loc("Aceitar com 谢谢 fecha o gesto de hospitalidade sem drama.", "Accepting with 谢谢 closes the hospitality gesture without drama."),
          },
          {
            id: "b",
            label: loc("谢谢，我不用。Já bebi água.", "谢谢，我不用. I already drank water."),
            preferred: true,
            feedback: loc("Recusar com 谢谢 e uma razão curta também é adequado.", "Declining with 谢谢 and a short reason is also suitable."),
          },
          {
            id: "c",
            label: loc("Não, para de oferecer.", "No, stop offering."),
            preferred: false,
            feedback: loc("O tom seco trata a 客气 como pressão. Um recusa curta e educada basta.", "A blunt tone treats 客气 as pressure. A short polite decline is enough."),
          },
        ],
      },
      {
        id: "vh-sit",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Mei diz 请坐. Qual leitura é mais segura?", "Mei says 请坐. Which reading is safer?"),
        options: miniChoices(item),
      },
      recallStep(memory),
      summaryStep(item),
    ],
  };
})();

const hostInsistence = ((): CultureMission => {
  const item = itemOrThrow("host-insistence");
  const memory = memoryFromItem(
    item,
    loc(
      "Uma segunda oferta de comida ou chá pode ser hospitalidade (客气), não uma ordem.",
      "A second offer of food or tea can be hospitality (客气), not an order."
    )
  );
  return {
    id: "host-insistence",
    cultureItemId: "host-insistence",
    titlePt: "Quando o anfitrião insiste",
    titleEn: "When the host insists",
    routeId: "home-visits",
    difficulty: 2,
    estimatedMinutes: 5,
    flagship: true,
    takeaways: [
      loc("Insistência extra pode ser cuidado, não desrespeito ao 'não'.", "An extra offer can be care, not disrespect for your no."),
      loc("Aceite com 谢谢 ou recuse com uma razão curta.", "Accept with 谢谢 or decline with a short reason."),
      loc("Em contextos formais a insistência costuma ser menor.", "In formal settings insistence is often lighter."),
    ],
    reward: { xp: CULTURE_MISSION_XP, sealIds: ["visitor-ready"] },
    memoryTargets: [memory],
    steps: [
      {
        id: "hi-story",
        kind: "story",
        scored: false,
        prompt: loc("Mei coloca mais comida no seu prato.", "Mei puts more food on your plate."),
        beats: [
          {
            id: "hi-1",
            speaker: "mei",
            hanzi: "再吃一点吧！",
            pinyin: "Zài chī yīdiǎn ba!",
            text: loc("Você já disse que está satisfeito. Mei oferece de novo.", "You already said you are full. Mei offers again."),
          },
        ],
      },
      {
        id: "hi-read",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Como interpretar?", "How should you read this?"),
        options: miniChoices(item),
      },
      {
        id: "hi-dialogue",
        kind: "dialogue_choice",
        scored: true,
        prompt: loc("Escolha uma resposta educada.", "Choose a polite reply."),
        beats: [
          {
            id: "hi-wang",
            speaker: "wang",
            hanzi: "再吃一点吧！",
            pinyin: "Zài chī yīdiǎn ba!",
            text: loc("Wang também insiste um pouco — hospitalidade de mesa, não um interrogatório.", "Wang also insists a little — table hospitality, not an interrogation."),
          },
        ],
        options: [
          {
            id: "a",
            label: loc("谢谢，我吃饱了。", "谢谢，我吃饱了。"),
            preferred: true,
            feedback: loc(
              "A insistência pode ser hospitalidade; isso não significa que toda recusa precise ser ignorada.",
              "The insistence can be hospitality; that does not mean every refusal must be ignored."
            ),
          },
          {
            id: "b",
            label: loc("不要了，谢谢。", "不要了，谢谢。"),
            preferred: true,
            feedback: loc("不要了 já aparece na missão de restaurante. Aqui fecha o gesto com educação.", "不要了 already appears in the restaurant mission. Here it closes the gesture politely."),
          },
          {
            id: "c",
            label: loc("Para. Eu disse não.", "Stop. I said no."),
            preferred: false,
            feedback: loc("O conteúdo do 'não' pode estar certo; o tom trata a 客气 como ataque.", "The 'no' may be fair; the tone treats 客气 as an attack."),
          },
        ],
      },
      {
        id: "hi-vary",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("A insistência é igual em qualquer mesa?", "Is insistence the same at every table?"),
        options: [
          {
            id: "a",
            label: loc("Sim: recusar sempre ofende.", "Yes: refusing always offends."),
            preferred: false,
            feedback: loc("A dose muda com intimidade, geração e formalidade.", "The dose changes with closeness, generation, and formality."),
            mayVary: true,
          },
          {
            id: "b",
            label: loc("Não. Com desconhecidos ou em contextos formais a insistência tende a ser menor.", "No. With strangers or in formal settings insistence is often lighter."),
            preferred: true,
            feedback: loc("Pode variar. Amigos próximos às vezes são mais diretos e menos rituais.", "It can vary. Close friends may be more direct and less ritual."),
            mayVary: true,
          },
          {
            id: "c",
            label: loc("A regra é recusar três vezes em silêncio.", "The rule is to refuse three times in silence."),
            preferred: false,
            feedback: loc("Não há uma lei de três recusas neste pacote.", "There is no three-refusal law in this pack."),
          },
        ],
      },
      recallStep(memory),
      summaryStep(item),
    ],
  };
})();

const sharedDishes = ((): CultureMission => {
  const item = itemOrThrow("shared-dishes");
  const memory = memoryFromItem(
    item,
    loc(
      "Em refeições coletivas, pratos podem ficar no centro para o grupo servir um pouco de cada.",
      "At group meals, dishes may stay in the centre for everyone to take a little of each."
    )
  );
  return {
    id: "shared-dishes",
    cultureItemId: "shared-dishes",
    titlePt: "Pratos no centro da mesa",
    titleEn: "Dishes in the middle of the table",
    routeId: "table-food",
    difficulty: 2,
    estimatedMinutes: 5,
    flagship: true,
    takeaways: [
      loc("Vários pratos no centro costumam ser para compartilhar.", "Several dishes in the centre are often for sharing."),
      loc("Porções pequenas; 谢谢 se colocarem comida no seu prato.", "Small portions; 谢谢 if food is placed on your plate."),
      loc("Hotpot, almoço individual e banquetes não seguem o mesmo ritmo.", "Hotpot, a solo lunch, and banquets do not follow the same rhythm."),
    ],
    reward: { xp: CULTURE_MISSION_XP, sealIds: ["chinese-table"] },
    memoryTargets: [memory],
    steps: [
      {
        id: "sd-story",
        kind: "story",
        scored: false,
        prompt: loc("Você almoça com Mei e Wang.", "You are having lunch with Mei and Wang."),
        visual: "shared-table",
        beats: [
          {
            id: "sd-1",
            speaker: "narrator",
            text: loc("Vários pratos chegam ao centro da mesa. Ninguém pediu um prato só seu.", "Several dishes arrive in the middle of the table. Nobody ordered a plate just for you."),
            visual: "shared-table",
          },
        ],
      },
      {
        id: "sd-read",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("O que isso sugere?", "What does this suggest?"),
        visual: "shared-table",
        options: miniChoices(item),
      },
      {
        id: "sd-serve",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Wang coloca um pouco no seu prato. Qual gesto fecha o momento?", "Wang puts a little on your plate. Which gesture closes the moment?"),
        options: [
          {
            id: "a",
            label: loc("Devolver a comida na hora, em silêncio.", "Put the food back immediately, in silence."),
            preferred: false,
            feedback: loc("Servir o convidado pode ser hospitalidade. Se não puder comer, diga cedo e com educação.", "Serving a guest can be hospitality. If you cannot eat it, say so early and politely."),
          },
          {
            id: "b",
            label: loc("谢谢. Se não puder comer algo, avise cedo.", "谢谢. If you cannot eat something, say so early."),
            preferred: true,
            feedback: loc("China Daily descreve o anfitrião servir o convidado como polidez — não como obrigação de esvaziar o prato.", "China Daily describes a host serving a guest as politeness — not a duty to empty the plate."),
          },
          {
            id: "c",
            label: loc("Esvaziar todos os pratos comunitários agora.", "Empty every communal dish right now."),
            preferred: false,
            feedback: loc("Compartilhar não é uma regra de esvaziar tudo.", "Sharing is not a rule to empty everything."),
          },
        ],
      },
      {
        id: "sd-dialogue",
        kind: "dialogue_choice",
        scored: true,
        prompt: loc("Mei pergunta se está bom. Como responder com o mandarim que você já viu?", "Mei asks if it is good. How do you reply with Mandarin you already know?"),
        beats: [
          {
            id: "sd-mei",
            speaker: "mei",
            hanzi: "好吃吗？",
            pinyin: "Hǎochī ma?",
            text: loc("Ela aponta um prato no centro.", "She points to a dish in the centre."),
          },
        ],
        options: [
          {
            id: "a",
            label: loc("好吃！", "好吃！"),
            preferred: true,
            feedback: loc("好吃 já está na Jornada. Aqui fecha o momento de mesa compartilhada.", "好吃 is already in the Journey. Here it closes the shared-table moment."),
          },
          {
            id: "b",
            label: loc("谢谢，我要这个。", "谢谢，我要这个。"),
            preferred: true,
            feedback: loc("我要 + 这个 também já aparece no restaurante da Jornada.", "我要 + 这个 also already appears in the Journey restaurant."),
          },
          {
            id: "c",
            label: loc("Pedir um prato só seu sem olhar o grupo.", "Order a plate just for yourself without looking at the group."),
            preferred: false,
            feedback: loc("Pode existir prato individual — mas nesta mesa o sinal é coletivo.", "Individual plates exist — but at this table the cue is communal."),
            mayVary: true,
          },
        ],
      },
      recallStep(memory),
      summaryStep(item),
    ],
  };
})();

const giftReceiving = ((): CultureMission => {
  const item = itemOrThrow("gift-receiving");
  const memory = memoryFromItem(
    item,
    loc(
      "Em trocas um pouco formais, duas mãos ao receber marcam cuidado — não uma lei para cada copo entre amigos.",
      "In slightly formal exchanges, two hands when receiving mark care — not a law for every glass among friends."
    )
  );
  return {
    id: "gift-receiving",
    cultureItemId: "gift-receiving",
    titlePt: "Receber algo com as duas mãos",
    titleEn: "Receiving something with both hands",
    routeId: "home-visits",
    difficulty: 2,
    estimatedMinutes: 5,
    flagship: true,
    takeaways: [
      loc("Duas mãos em presentes e documentos formais.", "Two hands for gifts and formal documents."),
      loc("Abrir na hora não é regra única.", "Opening on the spot is not a single rule."),
      loc("Entre amigos jovens o gesto pode ser mais solto.", "Among young friends the gesture may be looser."),
    ],
    reward: { xp: CULTURE_MISSION_XP, sealIds: ["gift-sense"] },
    memoryTargets: [memory],
    steps: [
      {
        id: "gr-story",
        kind: "story",
        scored: false,
        visual: "gift-hands",
        beats: [
          {
            id: "gr-1",
            speaker: "mei",
            text: loc("Mei te entrega um pacote pequeno ao chegar, com as duas mãos.", "Mei hands you a small package as you arrive, with both hands."),
            visual: "gift-hands",
          },
        ],
      },
      {
        id: "gr-choice",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Qual gesto é mais adequado nesta visita um pouco formal?", "Which gesture is more suitable on this slightly formal visit?"),
        options: miniChoices(item),
      },
      {
        id: "gr-open",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Ela não diz para abrir. O que fazer?", "She does not say to open it. What now?"),
        options: [
          {
            id: "a",
            label: loc("Rasgar o papel na hora, obrigatoriamente.", "Tear the paper open immediately, as a duty."),
            preferred: false,
            feedback: loc("Abrir na hora não é obrigatório nem proibido de forma absoluta.", "Opening on the spot is neither an absolute duty nor an absolute ban."),
            mayVary: true,
          },
          {
            id: "b",
            label: loc("Receber com as duas mãos, 谢谢, e esperar uma dica antes de abrir.", "Receive with both hands, say 谢谢, and wait for a cue before opening."),
            preferred: true,
            feedback: loc("Se pedirem para abrir, abra com calma. Se não pedirem, guardar também é aceitável.", "If they ask you to open it, open it calmly. If they do not, putting it aside is also acceptable."),
            mayVary: true,
          },
          {
            id: "c",
            label: loc("Recusar três vezes em silêncio e sair.", "Refuse three times in silence and leave."),
            preferred: false,
            feedback: loc("O pacote já foi oferecido. Recusar em silêncio some com o cuidado do gesto.", "The gift was already offered. A silent refusal erases the care of the gesture."),
          },
        ],
      },
      {
        id: "gr-dialogue",
        kind: "dialogue_choice",
        scored: true,
        prompt: loc("Como agradecer?", "How do you thank her?"),
        beats: [
          {
            id: "gr-mei",
            speaker: "mei",
            hanzi: "给你。",
            pinyin: "Gěi nǐ.",
            text: loc("O pacote continua nas suas mãos.", "The package is still in your hands."),
          },
        ],
        options: [
          {
            id: "a",
            label: loc("谢谢。", "谢谢。"),
            preferred: true,
            feedback: loc("谢谢 fecha o recebimento. 不客气 pode vir na resposta de Mei.", "谢谢 closes the receiving. 不客气 may come in Mei's reply."),
          },
          {
            id: "b",
            label: loc("Pegar com uma mão olhando o celular.", "Take it with one hand while looking at your phone."),
            preferred: false,
            feedback: loc("Uma mão + celular, em visita formal, parece pressa.", "One hand plus a phone, on a formal visit, looks rushed."),
          },
          {
            id: "c",
            label: loc("Não dizer nada e guardar o presente no bolso imediatamente.", "Say nothing and pocket the gift immediately."),
            preferred: false,
            feedback: loc("O silêncio apaga o reconhecimento do cuidado.", "Silence erases recognition of the care."),
          },
        ],
      },
      recallStep(memory),
      summaryStep(item),
    ],
  };
})();

const digitalPay = ((): CultureMission => {
  const item = itemOrThrow("digital-pay");
  const memory = memoryFromItem(
    item,
    loc(
      "Muitos caixas esperam pagamento móvel (QR). Cartão e 现金 ainda existem — pergunte.",
      "Many tills expect mobile pay (QR). Cards and 现金 still exist — ask."
    )
  );
  return {
    id: "digital-pay",
    cultureItemId: "digital-pay",
    titlePt: "Pagar com o celular",
    titleEn: "Paying with a phone",
    routeId: "everyday-china",
    difficulty: 2,
    estimatedMinutes: 4,
    flagship: true,
    takeaways: [
      loc("QR na mesa ou no caixa é um sinal de pagamento móvel.", "A QR code on the table or till signals mobile pay."),
      loc("微信支付 / 支付宝 não são o único app possível por lei.", "微信支付 / 支付宝 are not a single legally mandatory app."),
      loc("可以刷卡吗？ e 现金 continuam úteis.", "可以刷卡吗？ and 现金 remain useful."),
    ],
    reward: { xp: CULTURE_MISSION_XP, sealIds: ["urban-china"] },
    memoryTargets: [memory],
    steps: [
      {
        id: "dp-story",
        kind: "story",
        scored: false,
        visual: "qr-till",
        beats: [
          {
            id: "dp-1",
            speaker: "narrator",
            text: loc("Você chegou no caixa e não vê uma bandeja de cartão como no Brasil. Há um QR.", "You reach the till and do not see a card tray like in Brazil. There is a QR code."),
            visual: "qr-till",
          },
        ],
      },
      {
        id: "dp-read",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Qual leitura é mais útil?", "Which reading is more useful?"),
        options: miniChoices(item),
      },
      {
        id: "dp-dialogue",
        kind: "dialogue_choice",
        scored: true,
        prompt: loc("O caixa espera. O que você pode perguntar?", "The cashier waits. What can you ask?"),
        beats: [
          {
            id: "dp-lin",
            speaker: "wang",
            hanzi: "微信还是支付宝？",
            pinyin: "Wēixìn háishì Zhīfùbǎo?",
            text: loc("Wang pede o QR ao lado. O caixa olha para você.", "Wang asks for the QR beside you. The cashier looks at you."),
          },
        ],
        options: [
          {
            id: "a",
            label: loc("可以刷卡吗？", "可以刷卡吗？"),
            preferred: true,
            feedback: loc("Perguntar por cartão é útil quando o QR não é o seu meio.", "Asking about a card is useful when QR is not your method."),
          },
          {
            id: "b",
            label: loc("现金可以吗？", "现金可以吗？"),
            preferred: true,
            feedback: loc("现金 ainda é uma pergunta possível. Nem todo caixa aceita o mesmo método.", "现金 is still a possible question. Not every till accepts the same method."),
          },
          {
            id: "c",
            label: loc("Empurrar um cartão sem perguntar e falar alto.", "Push a card without asking and speak loudly."),
            preferred: false,
            feedback: loc("O gesto padrão em muitos lugares é o celular. Perguntar evita atrito.", "The default gesture in many places is the phone. Asking avoids friction."),
          },
        ],
      },
      {
        id: "dp-vary",
        kind: "scenario_choice",
        scored: true,
        prompt: loc("Pagamento móvel é igual em todo lugar?", "Is mobile pay the same everywhere?"),
        options: [
          {
            id: "a",
            label: loc("Sim: cartão e dinheiro foram proibidos no país inteiro.", "Yes: cards and cash were banned nationwide."),
            preferred: false,
            feedback: loc("O banco central documenta volume móvel alto — não uma proibição dos outros meios.", "The central bank documents high mobile volume — not a ban on other means."),
          },
          {
            id: "b",
            label: loc("Cidades grandes e mercados de rua não têm a mesma cobertura. Turistas encontram mais exceções.", "Large cities and street markets do not have the same coverage. Tourists meet more exceptions."),
            preferred: true,
            feedback: loc("Pode variar por lugar, idade e tipo de loja.", "It can vary by place, age, and type of shop."),
            mayVary: true,
          },
          {
            id: "c",
            label: loc("O QR é só decoração.", "The QR code is only decoration."),
            preferred: false,
            feedback: loc("Na vida cotidiana o QR costuma ser o caminho do pagamento.", "In daily life the QR is often the payment path."),
          },
        ],
      },
      recallStep(memory),
      summaryStep(item),
    ],
  };
})();

const metroQr = ((): CultureMission => {
  const item = itemOrThrow("metro-qr");
  const memory = memoryFromItem(
    item,
    loc(
      "No metrô, o cuidado é o fluxo: deixar descer, código pronto, não parar na porta.",
      "On the metro, the care is for flow: let people off, have the code ready, do not stop in the doorway."
    )
  );
  return {
    id: "metro-qr",
    cultureItemId: "metro-qr",
    titlePt: "Metrô e espaço público",
    titleEn: "Metro and public space",
    routeId: "everyday-china",
    difficulty: 2,
    estimatedMinutes: 4,
    flagship: true,
    takeaways: [
      loc("Deixe as pessoas descerem antes de entrar.", "Let people off before you enter."),
      loc("Tenha o QR ou cartão pronto.", "Have the QR or card ready."),
      loc("入口 / 出口 ajudam a ler o espaço.", "入口 / 出口 help you read the space."),
    ],
    reward: { xp: CULTURE_MISSION_XP, sealIds: ["urban-china"] },
    memoryTargets: [memory],
    steps: [
      {
        id: "mq-story",
        kind: "story",
        scored: false,
        visual: "metro-door",
        beats: [
          {
            id: "mq-1",
            speaker: "narrator",
            text: loc("Hora do rush. A porta do metrô abre e você está na frente.", "Rush hour. The metro door opens and you are in front."),
            visual: "metro-door",
          },
        ],
      },
      {
        id: "mq-choice",
        kind: "scenario_choice",
        scored: true,
        visual: "metro-door",
        prompt: loc("Qual hábito ajuda o fluxo?", "Which habit helps the flow?"),
        options: miniChoices(item),
      },
      {
        id: "mq-dialogue",
        kind: "dialogue_choice",
        scored: true,
        prompt: loc("Você precisa da estação. Qual pergunta já estudada cabe?", "You need the station. Which already-studied question fits?"),
        beats: [
          {
            id: "mq-lin",
            speaker: "lin",
            text: loc("Há uma placa: 入口. Um funcionário está ao lado.", "There is a sign: 入口. A staff member is beside it."),
          },
        ],
        options: [
          {
            id: "a",
            label: loc("请问，地铁站在哪里？", "请问，地铁站在哪里？"),
            preferred: true,
            feedback: loc("请问 + 地铁站在哪里？ é sobrevivência urbana, não uma aula nova de vocabulário.", "请问 + 地铁站在哪里？ is urban survival, not a new vocabulary lesson."),
          },
          {
            id: "b",
            label: loc("我坐地铁。", "我坐地铁。"),
            preferred: true,
            feedback: loc("Declarar o meio de transporte também é útil quando alguém pergunta o seu plano.", "Stating the transport mode is also useful when someone asks your plan."),
          },
          {
            id: "c",
            label: loc("Parar na catraca para montar o app.", "Stop at the gate to set up the app."),
            preferred: false,
            feedback: loc("O código pronto evita bloquear a fila. Isso é densidade urbana, não etiqueta imperial.", "A ready code avoids blocking the queue. That is urban density, not imperial etiquette."),
          },
        ],
      },
      sequenceStep(
        "mq-seq",
        loc("Ordene o fluxo na porta.", "Order the flow at the door."),
        [
          { id: "off", pt: "Deixar as pessoas descerem", en: "Let people get off" },
          { id: "in", pt: "Entrar com o código já pronto", en: "Enter with the code already ready" },
          { id: "move", pt: "Sair da porta e não olhar o mapa ali", en: "Move away from the door and do not check the map there" },
        ],
        ["off", "in", "move"]
      ),
      recallStep(memory),
      summaryStep(item),
    ],
  };
})();

const chopsticksRest = shortMission("chopsticks-rest", {
  difficulty: 2,
  visual: "chopsticks-table",
  concept: loc(
    "Pousar os hashis na horizontal é a pausa usual. Espetar no arroz lembra incenso funerário para muita gente.",
    "Resting chopsticks horizontally is the usual pause. Standing them in rice recalls funeral incense for many people."
  ),
  extraStory: [
    {
      id: "cr-table",
      kind: "story",
      scored: false,
      visual: "chopsticks-table",
      prompt: loc("Você pausa no meio da refeição.", "You pause mid-meal."),
      beats: [
        {
          id: "cr-v",
          speaker: "narrator",
          text: loc("Há uma tigela de arroz, um prato e um descanso. Onde os hashis ficam menos adequados?", "There is a rice bowl, a plate, and a rest. Where do the chopsticks look least suitable?"),
          visual: "chopsticks-table",
        },
      ],
    },
  ],
  second: {
    id: "chopsticks-rest-visual",
    kind: "scenario_choice",
    scored: true,
    visual: "chopsticks-table",
    prompt: loc("Onde você deixaria os hashis?", "Where would you leave the chopsticks?"),
    options: [
      {
        id: "a",
        label: loc("Espetados no meio da tigela de arroz.", "Stuck upright in the rice bowl."),
        preferred: false,
        feedback: loc(
          "Esse gesto visualmente se aproxima de oferendas. Não é lei — é associação cultural que chama atenção.",
          "That gesture visually recalls offerings. It is not a law — it is a cultural association that stands out."
        ),
      },
      {
        id: "b",
        label: loc("Na horizontal, no prato ou no descanso.", "Horizontally, on the plate or the rest."),
        preferred: true,
        feedback: loc("A horizontal é o descanso usual numa refeição comum.", "Horizontal rest is the usual pause at an ordinary meal."),
      },
      {
        id: "c",
        label: loc("Na boca de outra pessoa, para 'compartilhar'.", "Into someone else's mouth, to 'share'."),
        preferred: false,
        feedback: loc("Passar hashis usados na boca de alguém não é o mesmo que servir com hospitalidade.", "Passing used chopsticks into someone's mouth is not the same as serving with hospitality."),
      },
    ],
  },
  takeaways: [
    loc("Horizontal no prato ou no descanso.", "Horizontal on the plate or rest."),
    loc("O par em pé no arroz chama atenção em mesas formais e familiares.", "Upright in rice stands out at formal and family tables."),
    loc("Reações ainda dependem de formalidade e geração.", "Reactions still depend on formality and generation."),
  ],
});

function defaultSecond(itemId: string, pairs: NonNullable<CultureMissionStep["matchPairs"]>): CultureMissionStep {
  return matchStep(`${itemId}-match`, pairs);
}

const SHORT_SPECS: Array<{
  id: string;
  concept: CultureLocaleText;
  pairs: NonNullable<CultureMissionStep["matchPairs"]>;
  takeaways: CultureLocaleText[];
  difficulty?: 1 | 2 | 3;
}> = [
  {
    id: "greetings-nihao",
    concept: loc(
      "你好 abre um primeiro contato; entre conhecidos um aceno ou o nome também cabem.",
      "你好 opens a first contact; among people who already know each other a nod or a name also fit."
    ),
    pairs: [
      { id: "p1", left: loc("Primeiro contato no corredor", "First contact in a hallway"), right: loc("你好 é seguro", "你好 is safe") },
      { id: "p2", left: loc("Colega que você vê todo dia", "Colleague you see every day"), right: loc("Aceno, nome ou 你好 curto", "A nod, a name, or a short 你好") },
    ],
    takeaways: [
      loc("你好 não é o único cumprimento possível.", "你好 is not the only possible greeting."),
      loc("Não cumprimentar nunca também não é a leitura.", "Never greeting at all is not the reading either."),
    ],
  },
  {
    id: "thanks-keqi",
    concept: loc(
      "不客气 acolhe o 谢谢 e reduz a formalidade — não cancela o favor nem transforma agradecer em tabu.",
      "不客气 accepts 谢谢 and reduces formality — it does not cancel the favour or make thanking a taboo."
    ),
    pairs: [
      { id: "p1", left: loc("谢谢 num favor pontual", "谢谢 for a one-off favour"), right: loc("Agradecimento adequado", "An appropriate thanks") },
      { id: "p2", left: loc("Resposta 不客气", "The reply 不客气"), right: loc("Reduz a distância, não apaga o obrigado", "Reduces distance, does not erase thanks") },
    ],
    takeaways: [
      loc("Em lojas o par 谢谢 / 不客气 continua padrão.", "In shops the 谢谢 / 不客气 pair remains standard."),
      loc("Entre íntimos a dose de 谢谢 pode ser menor.", "Among close people the dose of 谢谢 may be smaller."),
    ],
  },
  {
    id: "qingwen-ask",
    concept: loc(
      "请问 avisa que vem uma pergunta a um desconhecido. Não é obrigatório entre amigos íntimos.",
      "请问 signals that a question is coming to a stranger. It is not required among close friends."
    ),
    pairs: [
      { id: "p1", left: loc("Desconhecido na estação", "A stranger at the station"), right: loc("Abrir com 请问", "Open with 请问") },
      { id: "p2", left: loc("Amigo ao lado no sofá", "A friend beside you on the sofa"), right: loc("请问 pode desaparecer", "请问 may drop away") },
    ],
    takeaways: [
      loc("请问 + pergunta + 谢谢.", "请问 + question + 谢谢."),
      loc("Quanto mais formal o lugar, mais o 请问 ajuda.", "The more formal the place, the more 请问 helps."),
    ],
  },
  {
    id: "family-terms",
    concept: loc(
      "这是我妈妈 apresenta a relação. Um cumprimento curto à pessoa apresentada é o passo natural.",
      "这是我妈妈 introduces the relationship. A short greeting to the person just introduced is the natural next step."
    ),
    pairs: [
      { id: "p1", left: loc("这是我妈妈", "这是我妈妈"), right: loc("Cumprimentar a mãe, não só traduzir", "Greet the mother, do not only translate") },
      { id: "p2", left: loc("Primeiro nome de um mais velho", "An elder's given name"), right: loc("Pode ser íntimo demais", "Can be too intimate") },
    ],
    takeaways: [
      loc("A casa é um espaço de geração.", "The home is a generational space."),
      loc("Siga o anfitrião na ordem das apresentações.", "Follow the host for the order of introductions."),
    ],
  },
  {
    id: "teacher-title",
    concept: loc(
      "Na escola, 老师 é o título do papel — não um elogio opcional.",
      "At school, 老师 is the role title — not an optional compliment."
    ),
    pairs: [
      { id: "p1", left: loc("Corredor da escola", "School corridor"), right: loc("老师, 请问…?", "老师, 请问…?") },
      { id: "p2", left: loc("Bar com amigos da mesma idade", "A bar with same-age friends"), right: loc("Não carregue o título da sala automaticamente", "Do not carry the classroom title automatically") },
    ],
    takeaways: [
      loc("O primeiro nome pode ser íntimo demais na escola.", "A given name can be too intimate at school."),
      loc("Universidades internacionais podem ser mais informais.", "International universities may be more informal."),
    ],
  },
  {
    id: "four-and-eight",
    concept: loc(
      "四 e 八 carregam associação sonora em alguns preços e presentes — não uma lei nacional.",
      "四 and 八 carry a sound association in some prices and gifts — not a national law."
    ),
    pairs: [
      { id: "p1", left: loc("Preço 888 / andar sem 4", "Price 888 / a floor without 4"), right: loc("Associação fonética possível", "A possible phonetic association") },
      { id: "p2", left: loc("Telefone ou data com 4", "A phone number or date with 4"), right: loc("Não corrija a pessoa", "Do not correct the person") },
    ],
    takeaways: [
      loc("É som, não magia obrigatória.", "It is sound, not mandatory magic."),
      loc("Região e geração mudam o peso do 4 e do 8.", "Region and generation change the weight of 4 and 8."),
    ],
    difficulty: 2,
  },
  {
    id: "spring-festival",
    concept: loc(
      "春节 costuma ser reunião e deslocamento, com práticas que variam por família.",
      "春节 is usually reunion and travel, with practices that vary by family."
    ),
    pairs: [
      { id: "p1", left: loc("Colega volta para casa no 春节", "A colleague goes home for 春节"), right: loc("Reunião e viagem, não um ritual idêntico", "Reunion and travel, not an identical ritual") },
      { id: "p2", left: loc("Menu de cada casa", "Each household's menu"), right: loc("Varia; a reunião é o eixo mais estável", "Varies; reunion is the more stable axis") },
    ],
    takeaways: [
      loc("Deseje um bom 春节 se alguém viaja.", "Wish them a good 春节 if someone is travelling."),
      loc("Não assuma o mesmo prato em cada casa.", "Do not assume the same dish in every home."),
    ],
  },
  {
    id: "mid-autumn",
    concept: loc(
      "中秋节 é feriado oficial ligado a reunião e à lua; os costumes locais mudam.",
      "中秋节 is an official holiday tied to reunion and the moon; local customs change."
    ),
    pairs: [
      { id: "p1", left: loc("Caixa de 月饼", "A box of 月饼"), right: loc("谢谢; gostar do recheio não é obrigatório", "谢谢; you are not required to like the filling") },
      { id: "p2", left: loc("Eixo do feriado", "The holiday's axis"), right: loc("Lua e reunião, não um menu único", "Moon and reunion, not a single menu") },
    ],
    takeaways: [
      loc("O Estado lista o feriado.", "The state lists the holiday."),
      loc("Empresas podem ou não dar caixas.", "Companies may or may not give boxes."),
    ],
  },
  {
    id: "qingming",
    concept: loc(
      "清明节 é sobretudo memória e visitas familiares — não o script barulhento do Ano Novo.",
      "清明节 is mainly remembrance and family visits — not the noisy New Year script."
    ),
    pairs: [
      { id: "p1", left: loc("Colega pede folga em abril", "A colleague asks for leave in April"), right: loc("Tom sóbrio; não peça fotos do túmulo", "A sober tone; do not ask for grave photos") },
      { id: "p2", left: loc("Clima do feriado", "The holiday mood"), right: loc("Memória, não fogos obrigatórios", "Remembrance, not mandatory fireworks") },
    ],
    takeaways: [
      loc("家 volta como lugar de origem.", "家 returns as a place of origin."),
      loc("Práticas urbanas e rurais não coincidem.", "Urban and rural practices do not match."),
    ],
  },
  {
    id: "dragon-boat",
    concept: loc(
      "端午节 é feriado compartilhado, com comidas e histórias que mudam por região.",
      "端午节 is a shared holiday, with foods and stories that change by region."
    ),
    pairs: [
      { id: "p1", left: loc("粽子 em junho", "粽子 in June"), right: loc("Comum, não o único conteúdo do dia", "Common, not the day's only content") },
      { id: "p2", left: loc("Qu Yuan / corridas", "Qu Yuan / races"), right: loc("Tradições regionais, não um herói único nacional", "Regional traditions, not a single national hero") },
    ],
    takeaways: [
      loc("A UNESCO insiste na variação regional.", "UNESCO insists on regional variation."),
      loc("Não assuma que toda cidade tem corrida.", "Do not assume every city has a race."),
    ],
    difficulty: 2,
  },
  {
    id: "office-hours",
    concept: loc(
      "你几点上班？ pode ser small talk de rotina entre conhecidos — não uma ficha policial.",
      "你几点上班？ can be routine small talk among acquaintances — not a police form."
    ),
    pairs: [
      { id: "p1", left: loc("Conhecido pergunta a hora do trabalho", "An acquaintance asks your work time"), right: loc("Responder ou desviar com educação", "Answer or deflect politely") },
      { id: "p2", left: loc("Horário 'chinês' único", "A single 'Chinese timetable'"), right: loc("Não existe; escritório, escola e plataforma diferem", "It does not exist; office, school, and platform differ") },
    ],
    takeaways: [
      loc("Rotina pode ser calor, não invasão automática.", "Routine can be warmth, not an automatic invasion."),
      loc("Você não deve o holerite.", "You do not owe a payslip."),
    ],
  },
];

const SHORT_MISSIONS: CultureMission[] = SHORT_SPECS.map((spec) =>
  shortMission(spec.id, {
    difficulty: spec.difficulty,
    concept: spec.concept,
    second: defaultSecond(spec.id, spec.pairs),
    takeaways: spec.takeaways,
  })
);

const FLAGSHIP_MISSIONS = [visitingHome, hostInsistence, sharedDishes, giftReceiving, digitalPay, metroQr, chopsticksRest];

export const CULTURE_MISSIONS: CultureMission[] = CULTURE_ITEMS.map((item) => {
  const authored = [...FLAGSHIP_MISSIONS, ...SHORT_MISSIONS].find((mission) => mission.cultureItemId === item.id);
  if (!authored) {
    throw new Error(`Culture mission missing for ${item.id}`);
  }
  return authored;
});

export function getCultureMission(id: string): CultureMission | undefined {
  return CULTURE_MISSIONS.find((mission) => mission.id === id || mission.cultureItemId === id);
}

export function memoryTargetsForItem(itemId: string): CultureMemoryTarget[] {
  return getCultureMission(itemId)?.memoryTargets ?? [];
}

export function allCultureMemoryTargets(): CultureMemoryTarget[] {
  return CULTURE_MISSIONS.flatMap((mission) => mission.memoryTargets);
}

export function cultureMissionStats() {
  const steps = CULTURE_MISSIONS.reduce((sum, mission) => sum + mission.steps.length, 0);
  const storyBeats = CULTURE_MISSIONS.reduce(
    (sum, mission) => sum + mission.steps.reduce((inner, step) => inner + (step.beats?.length ?? 0), 0),
    0
  );
  const memoryTargets = allCultureMemoryTargets().length;
  const flagship = CULTURE_MISSIONS.filter((mission) => mission.flagship).length;
  return { missions: CULTURE_MISSIONS.length, steps, storyBeats, memoryTargets, flagship };
}
