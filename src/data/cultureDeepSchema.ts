/**
 * RC2.3.13E — Culture content model V2 (optional depth sections).
 * RC2.3.13F — expands FLAGSHIP_DEEP set and path taxonomy wiring.
 * FLAGSHIP_DEEP uses most fields; ordinary items may omit many.
 * Does not replace CultureItem authority — overlays / validates depth.
 */

import { CULTURE_13F_FLAGSHIP_DEEP } from "./culture13fNewItems";

export const CULTURE_V2_PATH_IDS = [
  "vida_cotidiana",
  "etiqueta_relacoes",
  "comida_mesa",
  "familia",
  "escola_universidade",
  "trabalho",
  "cidades_transporte",
  "china_digital",
  "festivais",
  "historia_simbolos",
  "china_contemporanea",
  "diferencas_regionais",
] as const;

export type CultureV2PathId = (typeof CULTURE_V2_PATH_IDS)[number];

export const CULTURE_CONTEXT_TAGS = [
  "TABLE",
  "FAMILY",
  "WORK",
  "DIGITAL",
  "TRANSPORT",
  "FESTIVAL",
  "HISTORY",
  "REGIONAL",
  "SOCIAL",
] as const;

export type CultureContextTag = (typeof CULTURE_CONTEXT_TAGS)[number];

export type CultureDepthLevel = "brief" | "standard" | "FLAGSHIP_DEEP";

export type CultureDeepSections = {
  scene?: { pt: string; en: string };
  context?: { pt: string; en: string };
  culturalLogic?: { pt: string; en: string };
  brazilComparison?: { pt: string; en: string };
  practicalBehavior?: { pt: string; en: string };
  language?: { pt: string; en: string; targetIds?: readonly string[] };
  listenNote?: { pt: string; en: string };
  decision?: {
    promptPt: string;
    promptEn: string;
    options: readonly {
      id: string;
      labelPt: string;
      labelEn: string;
      quality: "preferred" | "acceptable" | "context_dependent";
      explainPt: string;
      explainEn: string;
    }[];
  };
  useIt?: { pt: string; en: string };
};

export type CultureDeepNode = {
  itemId: string;
  pathId: CultureV2PathId;
  depth: CultureDepthLevel;
  regionTags?: readonly string[];
  generationTags?: readonly ("young" | "older" | "traditional" | "contemporary")[];
  contextTags?: readonly CultureContextTag[];
  sections: CultureDeepSections;
  /** Absolute stereotype phrases flagged for human review (not auto-censored). */
  stereotypeReviewFlags?: readonly string[];
  sourceRequired: boolean;
};

/** Flagship set: 13E templates + 13F deep expansions. */
const CULTURE_FLAGSHIP_DEEP_13E: readonly CultureDeepNode[] = [
  {
    itemId: "shared-dishes",
    pathId: "comida_mesa",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["broad", "South", "North"],
    contextTags: ["TABLE", "SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "Você janta com quatro colegas chineses. Os pratos chegam ao centro da mesa.",
        en: "You are having dinner with four Chinese colleagues. Dishes arrive in the middle.",
      },
      context: {
        pt: "Em muitos contextos, comer juntos significa compartilhar pratos, não cada um com o seu.",
        en: "In many contexts, dining together means shared dishes, not one plate each.",
      },
      culturalLogic: {
        pt: "Hospitalidade e pertencimento ao grupo aparecem no gesto de servir e partilhar.",
        en: "Hospitality and group belonging show up in serving and sharing.",
      },
      brazilComparison: {
        pt: "No Brasil é comum cada um ter seu prato; na China pode parecer frio não compartilhar.",
        en: "In Brazil individual plates are common; in China not sharing can feel cold.",
      },
      practicalBehavior: {
        pt: "Espere um pouco, sirva os outros antes de se servir demais, e use o lado dos hashi para pegar comida compartilhada.",
        en: "Pause briefly, serve others before taking too much, and use the shared-dish side of chopsticks.",
      },
      language: {
        pt: "Expressões úteis: 一起吃、这个好吃、你先。",
        en: "Useful phrases: 一起吃, 这个好吃, 你先.",
        targetIds: ["yiqi", "haochi", "ni-xian"],
      },
      listenNote: {
        pt: "Ouça o tom acolhedor ao convidar alguém a servir-se.",
        en: "Listen for the warm tone when inviting someone to help themselves.",
      },
      decision: {
        promptPt: "O prato chega. O que você faz primeiro?",
        promptEn: "The dish arrives. What do you do first?",
        options: [
          {
            id: "serve_others",
            labelPt: "Ofereço aos outros e só depois me sirvo",
            labelEn: "Offer to others, then serve myself",
            quality: "preferred",
            explainPt: "Em muitos contextos de mesa compartilhada, servir o grupo primeiro é natural.",
            explainEn: "In many shared-table contexts, serving the group first feels natural.",
          },
          {
            id: "wait_host",
            labelPt: "Espero o anfitrião começar",
            labelEn: "Wait for the host to start",
            quality: "acceptable",
            explainPt: "Também funciona, sobretudo em contextos mais formais.",
            explainEn: "Also fine, especially in more formal settings.",
          },
          {
            id: "fill_own",
            labelPt: "Encho meu prato inteiro de uma vez",
            labelEn: "Fill my plate completely at once",
            quality: "context_dependent",
            explainPt: "Pode parecer pouco atento ao grupo — depende da intimidade e da região.",
            explainEn: "Can seem inattentive to the group — depends on intimacy and region.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 一起吃吧。 — 好，这个好吃！",
        en: "Micro-dialogue: — 一起吃吧. — 好，这个好吃!",
      },
    },
  },
  {
    itemId: "digital-pay",
    pathId: "china_digital",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["urban", "broad"],
    generationTags: ["young", "contemporary"],
    contextTags: ["DIGITAL"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "No caixa, ninguém busca carteira — todos apontam o celular.",
        en: "At checkout, nobody reaches for a wallet — everyone points a phone.",
      },
      context: {
        pt: "WeChat Pay e Alipay concentram pagamentos do dia a dia em muitas cidades.",
        en: "WeChat Pay and Alipay cover everyday payments in many cities.",
      },
      culturalLogic: {
        pt: "A infraestrutura digital virou hábito urbano; dinheiro vivo ainda existe, mas em menor frequência.",
        en: "Digital infrastructure became urban habit; cash still exists, but less often.",
      },
      brazilComparison: {
        pt: "Parece o Pix, porém ainda mais acoplado a apps de mensagem e vida social.",
        en: "Similar to Pix, but more tightly coupled to messaging apps and social life.",
      },
      practicalBehavior: {
        pt: "Tenha QR pronto, confirme o valor na tela, e peça ajuda se o app falhar — há sempre um plano B.",
        en: "Keep a QR ready, confirm the amount on screen, and ask for help if the app fails — there is always a fallback.",
      },
      language: {
        pt: "扫码、微信支付、支付宝。",
        en: "扫码, 微信支付, 支付宝.",
      },
      decision: {
        promptPt: "O vendedor aponta para um QR. O que você faz?",
        promptEn: "The seller points at a QR code. What do you do?",
        options: [
          {
            id: "scan_confirm",
            labelPt: "Escaneio e confirmo o valor antes de pagar",
            labelEn: "Scan and confirm the amount before paying",
            quality: "preferred",
            explainPt: "Confirmar o valor evita erro e é o hábito seguro.",
            explainEn: "Confirming the amount avoids mistakes and is the safe habit.",
          },
          {
            id: "ask_cash",
            labelPt: "Pergunto se aceita dinheiro",
            labelEn: "Ask if cash is accepted",
            quality: "acceptable",
            explainPt: "Aceitável, sobretudo se o digital falhar — pode variar por lugar.",
            explainEn: "Acceptable, especially if digital fails — may vary by place.",
          },
          {
            id: "pay_blind",
            labelPt: "Pago sem olhar o valor",
            labelEn: "Pay without checking the amount",
            quality: "context_dependent",
            explainPt: "Arriscado na maioria dos contextos.",
            explainEn: "Risky in most contexts.",
          },
        ],
      },
    },
  },
  {
    itemId: "family-terms",
    pathId: "familia",
    depth: "FLAGSHIP_DEEP",
    contextTags: ["FAMILY", "SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "Na casa de um amigo, você cumprimenta os pais dele pela primeira vez.",
        en: "At a friend’s home, you greet their parents for the first time.",
      },
      context: {
        pt: "Termos de parentesco e respeito moldam como você se dirige a gerações diferentes.",
        en: "Kinship and respect terms shape how you address different generations.",
      },
      culturalLogic: {
        pt: "Hierarquia familiar e cortesia se cruzam na escolha do vocativo.",
        en: "Family hierarchy and courtesy meet in the choice of address.",
      },
      brazilComparison: {
        pt: "No Brasil “tio/tia” às vezes é carinho amplo; na China o termo certo importa mais no primeiro contato.",
        en: "In Brazil “uncle/aunt” can be broad warmth; in China the right term matters more on first contact.",
      },
      practicalBehavior: {
        pt: "Use o termo que o amigo indicar; na dúvida, um cumprimento educado + sorriso é seguro.",
        en: "Use the term your friend suggests; when unsure, a polite greeting plus a smile is safe.",
      },
      language: {
        pt: "叔叔、阿姨、您好。",
        en: "叔叔, 阿姨, 您好.",
      },
      decision: {
        promptPt: "Você não sabe como chamar a mãe do amigo. O que faz?",
        promptEn: "You do not know how to address your friend’s mother. What do you do?",
        options: [
          {
            id: "ask_friend",
            labelPt: "Pergunto ao amigo qual termo usar",
            labelEn: "Ask your friend which term to use",
            quality: "preferred",
            explainPt: "Pedir orientação evita constrangimento.",
            explainEn: "Asking for guidance avoids awkwardness.",
          },
          {
            id: "nihao",
            labelPt: "Digo 您好 com um sorriso",
            labelEn: "Say 您好 with a smile",
            quality: "acceptable",
            explainPt: "Funciona como abertura educada.",
            explainEn: "Works as a polite opening.",
          },
          {
            id: "first_name",
            labelPt: "Uso o primeiro nome dela",
            labelEn: "Use her given name",
            quality: "context_dependent",
            explainPt: "Pode soar íntimo demais no primeiro encontro.",
            explainEn: "Can feel too familiar on a first meeting.",
          },
        ],
      },
    },
  },
  {
    itemId: "thanks-keqi",
    pathId: "etiqueta_relacoes",
    depth: "FLAGSHIP_DEEP",
    contextTags: ["SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: ["chineses sempre"],
    sections: {
      scene: {
        pt: "Alguém insiste em pagar o café. Você agradece demais — e a pessoa diz 不客气.",
        en: "Someone insists on paying for coffee. You thank them a lot — and they say 不客气.",
      },
      context: {
        pt: "客气 / 不客气 negociam distância social: agradecer demais também pode criar distância.",
        en: "客气 / 不客气 negotiate social distance: over-thanking can also create distance.",
      },
      culturalLogic: {
        pt: "Em muitos contextos, 面子 e reciprocidade importam mais do que a fórmula literal de “obrigado”.",
        en: "In many contexts, 面子 and reciprocity matter more than the literal “thank you” formula.",
      },
      brazilComparison: {
        pt: "No Brasil agradecer várias vezes é educação; na China pode soar 太客气了.",
        en: "In Brazil repeated thanks is polite; in China it can sound 太客气了.",
      },
      practicalBehavior: {
        pt: "Agradeça uma vez com sinceridade; aceite o gesto quando for natural; reciproque depois.",
        en: "Thank once sincerely; accept the gesture when natural; reciprocate later.",
      },
      language: {
        pt: "谢谢、不客气、太客气了。",
        en: "谢谢, 不客气, 太客气了.",
      },
      decision: {
        promptPt: "O colega paga. Você…",
        promptEn: "A colleague pays. You…",
        options: [
          {
            id: "thanks_once",
            labelPt: "Agradeço uma vez e aceito com um sorriso",
            labelEn: "Thank once and accept with a smile",
            quality: "preferred",
            explainPt: "Equilibra cortesia sem alongar 客气.",
            explainEn: "Balances courtesy without stretching 客气.",
          },
          {
            id: "fight_bill",
            labelPt: "Insisto em dividir na hora",
            labelEn: "Insist on splitting immediately",
            quality: "context_dependent",
            explainPt: "Pode ser ok entre amigos íntimos; em outros contextos, melhor reciprocar depois.",
            explainEn: "Fine among close friends; otherwise better to reciprocate later.",
          },
          {
            id: "thanks_five",
            labelPt: "Agradeço cinco vezes seguidas",
            labelEn: "Thank five times in a row",
            quality: "acceptable",
            explainPt: "Entende-se a intenção, mas pode soar excessivamente 客气.",
            explainEn: "The intent is clear, but it can sound overly 客气.",
          },
        ],
      },
    },
  },
  {
    itemId: "metro-qr",
    pathId: "cidades_transporte",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["Beijing", "Shanghai", "Guangzhou", "urban"],
    contextTags: ["TRANSPORT", "DIGITAL"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "Na entrada do metrô, a fila move rápido — cada um mostra um QR no celular.",
        en: "At the metro gate, the line moves fast — everyone shows a QR on their phone.",
      },
      context: {
        pt: "Transporte urbano em grandes cidades combina apps, cartões e códigos QR.",
        en: "Urban transit in large cities combines apps, cards, and QR codes.",
      },
      culturalLogic: {
        pt: "Eficiência e densidade urbana empurram fluxos digitais; varia por cidade.",
        en: "Efficiency and urban density push digital flows; it varies by city.",
      },
      brazilComparison: {
        pt: "Pense no Bilhete Único + app — só que o QR costuma ser o padrão do dia a dia.",
        en: "Think transit card + app — except QR is often the everyday default.",
      },
      practicalBehavior: {
        pt: "Baixe o app da cidade ou use o QR do WeChat/Alipay; tenha bateria; observe o fluxo da catraca.",
        en: "Install the city app or use WeChat/Alipay QR; keep battery; watch the gate flow.",
      },
      language: {
        pt: "地铁、扫码、出口。",
        en: "地铁, 扫码, 出口.",
      },
      decision: {
        promptPt: "O QR não abre a catraca. O que você faz?",
        promptEn: "The QR does not open the gate. What do you do?",
        options: [
          {
            id: "step_aside",
            labelPt: "Saio da fila e peço ajuda no posto",
            labelEn: "Step aside and ask at the booth",
            quality: "preferred",
            explainPt: "Não trava o fluxo — e resolve com calma.",
            explainEn: "Does not block the flow — and solves it calmly.",
          },
          {
            id: "retry",
            labelPt: "Tento de novo duas vezes",
            labelEn: "Try again twice",
            quality: "acceptable",
            explainPt: "Ok se for rápido; depois saia da fila.",
            explainEn: "Fine if quick; then step aside.",
          },
          {
            id: "jump",
            labelPt: "Pulo a catraca atrás de alguém",
            labelEn: "Jump the gate behind someone",
            quality: "context_dependent",
            explainPt: "Não faça — gera conflito e risco.",
            explainEn: "Do not — it creates conflict and risk.",
          },
        ],
      },
    },
  },
];

export const CULTURE_FLAGSHIP_DEEP: readonly CultureDeepNode[] = [
  ...CULTURE_FLAGSHIP_DEEP_13E,
  ...CULTURE_13F_FLAGSHIP_DEEP,
];

export function cultureDeepForItem(itemId: string): CultureDeepNode | undefined {
  return CULTURE_FLAGSHIP_DEEP.find((node) => node.itemId === itemId);
}

/** Existing CULTURE_ROUTES id → V2 path (reuse mapping). */
export const CULTURE_ROUTE_TO_V2_PATH: Record<string, CultureV2PathId> = {
  "first-meetings": "etiqueta_relacoes",
  "home-visits": "familia",
  "table-food": "comida_mesa",
  "everyday-china": "vida_cotidiana",
  festivals: "festivais",
};
