/**
 * Ponte LEX-036/037: vocabulary packets → diálogos com troca de frases.
 *
 * Os packets já declaram questions/answers/conversationIntents, mas o runtime
 * só consumia core/support/productive. Aqui:
 * 1) packets cujo vocabulário toca o foco da lição;
 * 2) intents preferidos (com alias para o catálogo autoral);
 * 3) cena V2 de fallback: NPC pergunta, aluno responde (choose_reply).
 */

import { CHARACTERS } from "./characters";
import { CHUNKS, chunkById } from "./chunks";
import {
  PAIR_LIN_MEI,
  sceneV2,
  type ConversationSceneStep,
  type ConversationSetting,
} from "./conversationScenes";
import {
  VOCABULARY_PACKETS_V37,
  type VocabularyPacketIdV37,
  type VocabularyPacketV37,
} from "./vocabularyPacketsV37";

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const PUNCT_RE = /[　-〿！？。，、,.!?\s:;"'()]/g;

/** Intent do packet → intents do catálogo autoral (score / seleção). */
const PACKET_INTENT_TO_SCENE: Record<string, readonly string[]> = {
  greet: ["greet", "greet-review", "ask-wellbeing"],
  farewell: ["farewell"],
  "ask-wellbeing": ["ask-wellbeing"],
  thank: ["thank"],
  apologize: ["thank", "polite-question"],
  "polite-question": ["polite-question", "thank"],
  "introduce-self": ["introduce-self", "classroom-intro", "meet-friend"],
  "ask-name": ["ask-name"],
  "ask-origin": ["ask-origin"],
  "ask-repeat": ["ask-repeat", "ask-slow-repeat", "repair-not-understood"],
  "cannot-speak": ["cannot-speak", "repair-not-understood"],
  "ask-help": ["ask-help"],
  "ask-what": ["ask-what-object", "point-nature"],
  "ask-where": ["ask-where", "ask-car-where"],
  "ask-location": ["ask-where", "ask-car-where"],
  "ask-route": ["ask-where", "ask-car-where"],
  identify_family: ["identify-person", "home-chat"],
  ask_siblings: ["identify-person", "home-chat"],
  describe_family: ["identify-person", "home-chat"],
  "order-food": ["order-menu", "restaurant-review", "ask-tea", "ask-water"],
  "order-drink": ["ask-tea", "ask-water", "order-menu"],
  "ask-bill": ["restaurant-review", "order-menu"],
  "ask-price": ["shop-chat", "buy-items", "ask-quantity"],
  buy: ["buy-items", "shop-chat"],
  bargain: ["shop-chat", "buy-items"],
  pay: ["shop-chat", "buy-items"],
  "ask-time": ["ask-time"],
  "tell-time": ["ask-time"],
  numbers: ["numbers-review", "ask-quantity"],
  routine: ["work-routine", "plan-tomorrow"],
  study: ["study", "classroom-intro", "show-book"],
  work: ["work-routine"],
  hotel: ["hotel"],
  health: ["health", "ask-help"],
  weather: ["weather"],
  "plan-tomorrow": ["plan-tomorrow"],
  transport: ["taxi", "ask-car-where"],
  "transport-taxi": ["taxi"],
  "transport-metro": ["ask-where"],
  "buy-ticket": ["ask-where", "buy-items"],
  airport: ["ask-help", "cannot-speak"],
  survival: ["ask-help", "cannot-speak", "ask-repeat"],
  preference: ["shop-chat"],
  "small-talk": ["home-chat", "meet-friend"],
  "go-place": ["ask-where"],
  "tech-help": ["ask-help"],
  acknowledge: ["thank", "greet"],
  agree: ["thank"],
};

const PACKET_SETTING: Partial<Record<VocabularyPacketIdV37, ConversationSetting>> = {
  greetings: "school",
  courtesy: "shop",
  introductions: "classroom",
  communication_repair: "street",
  repair: "street",
  basic_questions: "park",
  family: "home",
  food: "shop",
  food_drink: "shop",
  restaurant: "shop",
  shopping: "shop",
  time: "classroom",
  daily_routine: "home",
  routine: "home",
  study: "classroom",
  work: "street",
  hotel: "street",
  airport: "street",
  payment: "shop",
  directions: "street",
  weather: "park",
  social: "park",
  preferences: "shop",
  plans: "park",
  emergency: "street",
  health: "street",
  technology: "home",
  numbers_dates: "shop",
  survival: "street",
  city: "street",
  transport: "street",
};

const SEED_DISTRACTORS = ["你好", "谢谢", "再见", "我不知道", "不客气", "好的"];

function cleanHanzi(value: string): string {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
}

function stripEllipsis(value: string): string {
  return String(value ?? "")
    .replace(/[…⋯]+/g, "")
    .replace(/\.{2,}/g, "")
    .trim();
}

function displayHanzi(value: string): string {
  return String(value ?? "")
    .replace(/[…⋯]+/g, "")
    .replace(/\.{2,}/g, "")
    .replace(/，$/, "")
    .trim();
}

interface ResolvedPhrase {
  hanzi: string;
  pinyin: string;
  pt: string;
  ref?: string;
}

function pinyinFromChars(hanzi: string): string {
  return [...cleanHanzi(hanzi)]
    .map((ch) => CHARACTERS.find((c) => c.hanzi === ch)?.pinyin ?? "")
    .filter(Boolean)
    .join(" ");
}

function resolvePhrase(raw: string, preferredRefs?: readonly string[]): ResolvedPhrase | null {
  const text = String(raw ?? "").trim();
  if (!text || !CJK_RE.test(text)) return null;

  const preferred = preferredRefs ?? [];
  const candidates = preferred.length
    ? preferred.map((ref) => (ref.startsWith("chunk:") ? chunkById[ref.slice(6)] : undefined)).filter(Boolean)
    : CHUNKS;

  const cleaned = cleanHanzi(text);
  const stem = cleanHanzi(stripEllipsis(text));

  const scoreMatch = (chunkHanzi: string): number => {
    const chunkClean = cleanHanzi(chunkHanzi);
    if (!chunkClean) return 0;
    if (chunkClean === cleaned || chunkClean === stem) return 100;
    if (stem && chunkClean.startsWith(stem)) return 80;
    if (cleaned.length >= 2 && chunkClean.endsWith(cleaned)) return 70;
    if (cleaned.length >= 2 && chunkClean.includes(cleaned)) return 60;
    return 0;
  };

  let best: ResolvedPhrase | null = null;
  let bestScore = 0;
  const pools = [candidates.length ? candidates : [], CHUNKS];
  for (const pool of pools) {
    for (const chunk of pool) {
      if (!chunk) continue;
      const score = scoreMatch(chunk.hanzi);
      if (score > bestScore) {
        bestScore = score;
        best = {
          hanzi: displayHanzi(chunk.hanzi),
          pinyin: chunk.pinyin,
          pt: chunk.meaningPt,
          ref: `chunk:${chunk.id}`,
        };
      }
    }
    if (bestScore >= 80) break;
  }
  if (best) return best;

  const hanzi = displayHanzi(text);
  if (!cleanHanzi(hanzi)) return null;
  return {
    hanzi,
    pinyin: pinyinFromChars(hanzi),
    pt: hanzi,
  };
}

function packetRefs(packet: VocabularyPacketV37): string[] {
  return [...packet.core, ...packet.support, ...packet.productive, ...packet.receptive];
}

/** Packets cujo vocabulário intersecta o foco (e opcionalmente a revisão). */
export function matchVocabularyPacketsForRefs(
  focusRefs: ReadonlySet<string>,
  reviewRefs: ReadonlySet<string> = new Set()
): VocabularyPacketV37[] {
  const scored = VOCABULARY_PACKETS_V37.map((packet) => {
    const refs = packetRefs(packet);
    const focusHits = refs.filter((ref) => focusRefs.has(ref)).length;
    const reviewHits = refs.filter((ref) => reviewRefs.has(ref)).length;
    const qaReady = packet.questions.length > 0 && packet.answers.length > 0 ? 1 : 0;
    return { packet, focusHits, reviewHits, qaReady };
  })
    .filter((row) => row.focusHits > 0)
    .sort((a, b) => {
      if (b.focusHits !== a.focusHits) return b.focusHits - a.focusHits;
      if (b.qaReady !== a.qaReady) return b.qaReady - a.qaReady;
      return b.reviewHits - a.reviewHits;
    });
  return scored.map((row) => row.packet);
}

/** Intents do catálogo autoral preferidos pelos packets da lição. */
export function preferredSceneIntentsForPackets(packets: readonly VocabularyPacketV37[]): Set<string> {
  const out = new Set<string>();
  for (const packet of packets) {
    for (const intent of packet.conversationIntents) {
      out.add(intent);
      for (const mapped of PACKET_INTENT_TO_SCENE[intent] ?? []) out.add(mapped);
    }
  }
  return out;
}

export function preferredSceneIntentsForRefs(
  focusRefs: ReadonlySet<string>,
  reviewRefs: ReadonlySet<string> = new Set()
): Set<string> {
  return preferredSceneIntentsForPackets(matchVocabularyPacketsForRefs(focusRefs, reviewRefs));
}

function uniqueOptions(correct: string, extras: readonly string[], allowedGlyphs?: ReadonlySet<string>): string[] {
  const glyphOk = (value: string) => {
    if (!allowedGlyphs) return true;
    const chars = [...cleanHanzi(value)].filter((ch) => CJK_RE.test(ch));
    return chars.length > 0 && chars.every((ch) => allowedGlyphs.has(ch));
  };
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const key = cleanHanzi(value).toLocaleLowerCase("zh-CN");
    if (!key || seen.has(key) || !glyphOk(value)) return;
    seen.add(key);
    out.push(value);
  };
  push(correct);
  for (const extra of extras) push(extra);
  for (const seed of SEED_DISTRACTORS) {
    if (out.length >= 4) break;
    push(seed);
  }
  return out.slice(0, 4);
}

function glyphsFromRefs(refs: Iterable<string>): Set<string> {
  const glyphs = new Set<string>();
  for (const ref of refs) {
    if (ref.startsWith("chunk:")) {
      const chunk = chunkById[ref.slice("chunk:".length)];
      if (!chunk) continue;
      for (const ch of cleanHanzi(chunk.hanzi)) {
        if (CJK_RE.test(ch)) glyphs.add(ch);
      }
    } else if (ref.startsWith("char:")) {
      const char = CHARACTERS.find((item) => item.id === ref.slice("char:".length));
      if (char?.hanzi && CJK_RE.test(char.hanzi)) glyphs.add(char.hanzi);
    }
  }
  return glyphs;
}

function phraseGlyphsKnown(phrase: ResolvedPhrase, glyphs: ReadonlySet<string>): boolean {
  const chars = [...cleanHanzi(phrase.hanzi)].filter((ch) => CJK_RE.test(ch));
  return chars.length > 0 && chars.every((ch) => glyphs.has(ch));
}

function primarySceneIntent(packet: VocabularyPacketV37): string {
  const first = packet.conversationIntents[0];
  if (!first) return `packet-${packet.id}`;
  const mapped = PACKET_INTENT_TO_SCENE[first];
  return mapped?.[0] ?? first;
}

export interface PacketPhraseExchangeOptions {
  lessonRefs: ReadonlySet<string>;
  knownRefs?: ReadonlySet<string>;
  usedSceneIds?: ReadonlySet<string>;
  /** Índice estável para variar Q/A entre lições. */
  variantIndex?: number;
}

/**
 * Cena V2 de troca de frases a partir de questions[] / answers[] do packet.
 * NPC pergunta; o aluno escolhe a resposta (2 turnos choose_reply).
 */
export function buildPacketPhraseExchangeScene(
  packet: VocabularyPacketV37,
  options: PacketPhraseExchangeOptions
): ConversationSceneStep | null {
  if (packet.questions.length === 0 || packet.answers.length === 0) return null;

  const preferred = packetRefs(packet);
  const poolRefs = new Set([...options.lessonRefs, ...(options.knownRefs ?? [])]);
  const knownGlyphs = glyphsFromRefs(poolRefs);
  const questions = packet.questions
    .map((q) => resolvePhrase(q, preferred))
    .filter((q): q is ResolvedPhrase => Boolean(q) && phraseGlyphsKnown(q, knownGlyphs));
  const answers = packet.answers
    .map((a) => resolvePhrase(a, preferred))
    .filter((a): a is ResolvedPhrase => Boolean(a) && phraseGlyphsKnown(a, knownGlyphs));
  if (questions.length === 0 || answers.length === 0) return null;

  const idx = Math.abs(options.variantIndex ?? 0);
  const q1 = questions[idx % questions.length];
  const q2 = questions[(idx + 1) % questions.length] ?? q1;
  const a1 = answers[idx % answers.length];
  const a2 = answers[(idx + 1) % answers.length] ?? a1;

  const available = (ref: string) => options.lessonRefs.has(ref) || Boolean(options.knownRefs?.has(ref));
  // Foco deve tocar o packet; Q/A podem ser receptivos (NPC) se o core estiver disponível.
  const packetTouch = preferred.filter((ref) => options.lessonRefs.has(ref));
  if (packetTouch.length === 0) return null;

  const phraseRefs = [q1.ref, a1.ref, q2.ref, a2.ref].filter((ref): ref is string => Boolean(ref));
  const learnedRefs = [
    ...new Set([...phraseRefs.filter((ref) => available(ref)), ...packetTouch.filter((ref) => available(ref)).slice(0, 4)]),
  ];
  if (learnedRefs.length === 0) return null;
  if (!learnedRefs.some((ref) => options.lessonRefs.has(ref))) return null;

  const sceneIdBase = `packet-exchange-${packet.id}`;
  let sceneId = sceneIdBase;
  if (options.usedSceneIds?.has(sceneId)) {
    sceneId = `${sceneIdBase}-${(idx % 7) + 2}`;
  }

  const open =
    resolvePhrase("你好", ["chunk:nihao"]) ??
    ({ hanzi: "你好", pinyin: "nǐ hǎo", pt: "Olá." } satisfies ResolvedPhrase);
  const close =
    resolvePhrase("好", preferred) ??
    ({ hanzi: "好！", pinyin: "hǎo!", pt: "Bem!" } satisfies ResolvedPhrase);

  const optionPool = answers.map((item) => item.hanzi);
  const options1 = uniqueOptions(a1.hanzi, optionPool, knownGlyphs);
  const options2 = uniqueOptions(a2.hanzi, [...optionPool, q1.hanzi], knownGlyphs);
  if (options1.length < 2 || options2.length < 2) return null;

  const prefix = sceneId;
  return sceneV2({
    sceneId,
    title: `Troca · ${packet.labelPt}`,
    intent: primarySceneIntent(packet),
    setting: PACKET_SETTING[packet.id] ?? "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: `${prefix}-1`,
    learnedRefs,
    nodes: [
      {
        id: `${prefix}-1`,
        speakerId: "mei",
        hanzi: open.hanzi.includes("！") || open.hanzi.includes("!") ? open.hanzi : `${open.hanzi}！`,
        pinyin: open.pinyin,
        pt: open.pt,
        emotion: "happy",
        nextNodeId: `${prefix}-2`,
      },
      {
        id: `${prefix}-2`,
        speakerId: "mei",
        hanzi: q1.hanzi.endsWith("？") || q1.hanzi.endsWith("?") ? q1.hanzi : `${q1.hanzi}？`,
        pinyin: q1.pinyin,
        pt: q1.pt,
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: `Mei pergunta: ${q1.hanzi}. Como você responde?`,
          options: options1,
          correctAnswer: a1.hanzi,
          correctNextNodeId: `${prefix}-4`,
          wrongNextNodeId: `${prefix}-3`,
          explanation: `${a1.hanzi} responde ${q1.hanzi} neste pacote (${packet.labelPt}).`,
        },
      },
      {
        id: `${prefix}-3`,
        speakerId: "mei",
        hanzi: `${a1.hanzi}？`,
        pinyin: a1.pinyin,
        pt: a1.pt,
        emotion: "confused",
        nextNodeId: `${prefix}-2`,
      },
      {
        id: `${prefix}-4`,
        speakerId: "lin",
        hanzi: a1.hanzi,
        pinyin: a1.pinyin,
        pt: a1.pt,
        emotion: "happy",
        nextNodeId: `${prefix}-5`,
      },
      {
        id: `${prefix}-5`,
        speakerId: "mei",
        hanzi: q2.hanzi.endsWith("？") || q2.hanzi.endsWith("?") ? q2.hanzi : `${q2.hanzi}？`,
        pinyin: q2.pinyin,
        pt: q2.pt,
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: `Agora Mei pergunta: ${q2.hanzi}. Qual frase encaixa?`,
          options: options2,
          correctAnswer: a2.hanzi,
          correctNextNodeId: `${prefix}-7`,
          wrongNextNodeId: `${prefix}-6`,
          explanation: `${a2.hanzi} continua a troca de frases de ${packet.labelPt}.`,
        },
      },
      {
        id: `${prefix}-6`,
        speakerId: "mei",
        hanzi: `${a2.hanzi}？`,
        pinyin: a2.pinyin,
        pt: a2.pt,
        emotion: "confused",
        nextNodeId: `${prefix}-5`,
      },
      {
        id: `${prefix}-7`,
        speakerId: "lin",
        hanzi: a2.hanzi,
        pinyin: a2.pinyin,
        pt: a2.pt,
        emotion: "happy",
        nextNodeId: `${prefix}-8`,
      },
      {
        id: `${prefix}-8`,
        speakerId: "mei",
        hanzi: close.hanzi.endsWith("！") || close.hanzi.endsWith("!") ? close.hanzi : `${close.hanzi}！`,
        pinyin: close.pinyin,
        pt: close.pt,
        emotion: "happy",
      },
    ],
  });
}

/** Até N cenas de packet elegíveis para o pool de seleção da lição. */
export function buildPacketPhraseExchangeCandidates(
  focusRefs: ReadonlySet<string>,
  reviewRefs: ReadonlySet<string>,
  options: Omit<PacketPhraseExchangeOptions, "lessonRefs"> & { limit?: number }
): ConversationSceneStep[] {
  const packets = matchVocabularyPacketsForRefs(focusRefs, reviewRefs).filter(
    (packet) => packet.questions.length > 0 && packet.answers.length > 0
  );
  const lessonRefs = new Set([...focusRefs, ...reviewRefs]);
  const limit = options.limit ?? 3;
  const out: ConversationSceneStep[] = [];
  for (let i = 0; i < packets.length && out.length < limit; i += 1) {
    const scene = buildPacketPhraseExchangeScene(packets[i], {
      lessonRefs,
      knownRefs: options.knownRefs,
      usedSceneIds: options.usedSceneIds,
      variantIndex: (options.variantIndex ?? 0) + i,
    });
    if (scene) out.push(scene);
  }
  return out;
}

export function isPacketExchangeSceneId(sceneId: string | undefined): boolean {
  return Boolean(sceneId?.startsWith("packet-exchange-"));
}
