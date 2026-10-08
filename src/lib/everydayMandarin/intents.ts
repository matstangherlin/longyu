/**
 * RC2.3.2 — Everyday Intent contract (first-class communicative purpose).
 * Regex permanece como fallback; o motor prefere metadata estrutural.
 */

export type EverydayIntent =
  | "GREET"
  | "INTRODUCE_SELF"
  | "ASK_NAME"
  | "ASK_HOW_ARE_YOU"
  | "RESPOND_STATE"
  | "THANK"
  | "APOLOGIZE"
  | "SAY_GOODBYE"
  | "ASK_WHAT"
  | "IDENTIFY_OBJECT"
  | "REQUEST_ITEM"
  | "ORDER_FOOD"
  | "ORDER_DRINK"
  | "ASK_PRICE"
  | "BUY"
  | "ASK_WHERE"
  | "GIVE_LOCATION"
  | "ASK_DIRECTION"
  | "GIVE_DIRECTION"
  | "TAKE_TRANSPORT"
  | "CHECK_IN"
  | "ASK_FOR_HELP"
  | "EXPRESS_NEED"
  | "EXPRESS_WANT"
  | "EXPRESS_LIKE"
  | "TALK_FAMILY"
  | "TALK_ROUTINE"
  | "TALK_TIME"
  | "HEALTH_BASIC"
  | "SOCIAL_POLITENESS"
  | "METALINGUISTIC"
  | "UNKNOWN";

export type RealWorldDomain =
  | "SOCIAL"
  | "FOOD"
  | "SHOPPING"
  | "TRANSPORT"
  | "LOCATION"
  | "HOTEL"
  | "HEALTH"
  | "PERSONAL"
  | "FOUNDATION"
  | "OTHER";

export type ContextRole = "TARGET" | "CONTEXTUAL_REUSE" | "NPC_PROMPT" | "SCAFFOLD";

export type LearnerAgency = "RECOGNIZE" | "CHOOSE" | "COMPLETE" | "PRODUCE" | "SPEAK" | "TRANSFER";

export type InteractionPurpose =
  | "ASSOCIATE"
  | "DISCRIMINATE"
  | "COMPREHEND"
  | "RESPOND"
  | "REQUEST"
  | "CONVERSE"
  | "TRANSFER";

export interface CommunicativeMetadata {
  everydayIntent: EverydayIntent;
  realWorldDomain: RealWorldDomain;
  contextRole: ContextRole;
  learnerAgency: LearnerAgency;
  interactionPurpose: InteractionPurpose;
  humanContext?: string;
}

const INTENT_HINTS: Array<{ intent: EverydayIntent; re: RegExp; domain: RealWorldDomain }> = [
  { intent: "GREET", re: /cumpriment|olá|bom dia|encontra alguém|你好(?!吗)/i, domain: "SOCIAL" },
  { intent: "ASK_HOW_ARE_YOU", re: /como (você )?está|tudo bem|你好吗/i, domain: "SOCIAL" },
  { intent: "RESPOND_STATE", re: /está bem|estou bem|我很好|responda/i, domain: "SOCIAL" },
  { intent: "THANK", re: /agradec|obrigad|谢谢/i, domain: "SOCIAL" },
  { intent: "APOLOGIZE", re: /desculpa|perdón|对不起/i, domain: "SOCIAL" },
  { intent: "SAY_GOODBYE", re: /despedida|até logo|adeus|再见|明天见/i, domain: "SOCIAL" },
  { intent: "ORDER_DRINK", re: /pedir (chá|água|café)|com sede|我要(茶|水|咖啡)/i, domain: "FOOD" },
  { intent: "ORDER_FOOD", re: /pedir comida|restaurante|我要饭|点菜/i, domain: "FOOD" },
  { intent: "ASK_PRICE", re: /preço|quanto custa|多少钱/i, domain: "SHOPPING" },
  { intent: "BUY", re: /comprar|supermercado|我要这个/i, domain: "SHOPPING" },
  { intent: "ASK_WHERE", re: /onde fica|em que lugar|在哪里/i, domain: "LOCATION" },
  { intent: "GIVE_DIRECTION", re: /esquerda|direita|em frente|往左|往右/i, domain: "LOCATION" },
  { intent: "TAKE_TRANSPORT", re: /metr[oô]|ônibus|táxi|trem|地铁|公交|出租车/i, domain: "TRANSPORT" },
  { intent: "CHECK_IN", re: /hotel|quarto|chegou ao hotel|酒店|房间/i, domain: "HOTEL" },
  { intent: "HEALTH_BASIC", re: /hospital|médico|dor|医院|医生/i, domain: "HEALTH" },
  { intent: "ASK_FOR_HELP", re: /preciso de ajuda|帮帮我|帮助/i, domain: "SOCIAL" },
  { intent: "TALK_FAMILY", re: /família|pai|mãe|家|爸爸|妈妈/i, domain: "PERSONAL" },
  { intent: "IDENTIFY_OBJECT", re: /o que (é|você )?vê|qual (imagem|objeto)|这是什么/i, domain: "OTHER" },
  { intent: "METALINGUISTIC", re: /o que é (mandarim|pinyin|tom|hànzì|hanzi)|alfabeto|tradução correta/i, domain: "FOUNDATION" },
];

export function inferEverydayIntentFromText(blob: string): CommunicativeMetadata {
  for (const row of INTENT_HINTS) {
    if (row.re.test(blob)) {
      return {
        everydayIntent: row.intent,
        realWorldDomain: row.domain,
        contextRole: row.intent === "METALINGUISTIC" ? "SCAFFOLD" : "TARGET",
        learnerAgency: /produ|fale|responda|monte|diga/i.test(blob) ? "PRODUCE" : "CHOOSE",
        interactionPurpose:
          row.intent === "METALINGUISTIC"
            ? "ASSOCIATE"
            : /transfer|nova situação/i.test(blob)
              ? "TRANSFER"
              : "RESPOND",
        humanContext: blob.slice(0, 120),
      };
    }
  }
  return {
    everydayIntent: "UNKNOWN",
    realWorldDomain: "OTHER",
    contextRole: "TARGET",
    learnerAgency: "CHOOSE",
    interactionPurpose: "COMPREHEND",
  };
}

export function intentIsCommunicative(intent: EverydayIntent): boolean {
  return intent !== "METALINGUISTIC" && intent !== "UNKNOWN";
}
