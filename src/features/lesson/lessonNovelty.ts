/**
 * Novidade cognitiva das lições.
 *
 * O motor já impede a MESMA resposta exata mais de 2 vezes
 * (underAnswerRepeatCap, em lessonTasks). Este módulo amplia a ideia:
 * exercícios diferentes ainda podem cobrar cognitivamente a mesma coisa
 * (escolher o significado de 木 e depois "dialogar" sobre 木 com a mesma
 * pergunta). Aqui cada passo ganha chaves semânticas multi-dimensão
 * (char:/chunk:/phrase:/meaning:/intent:/visual:/scene:/action:) e um
 * PERFIL COGNITIVO (estímulo, resposta, família, escopo, ajuda, mistura com
 * conteúdo antigo). Repetir uma chave além do limite só é aceitável quando
 * há transformação cognitiva real entre as ocorrências.
 */

import type { LessonStep } from "../../data/journey";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import { resolveVisualConcept } from "../../data/visualVocabulary";

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()？！。，、]/g;

function cleanHanzi(value: string | undefined): string {
  return (value ?? "").replace(PUNCT_RE, "").trim();
}

function containsCjk(value: string | undefined): boolean {
  return Boolean(value && CJK_RE.test(value));
}

function norm(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));
const chunkByCleanHanzi = new Map(CHUNKS.map((chunk) => [cleanHanzi(chunk.hanzi), chunk]));

/**
 * Intenção comunicativa dos chunks do corpus. Duas atividades sobre chunks
 * diferentes ainda podem cobrar a MESMA intenção (你好 e 你好吗 cumprimentam);
 * o limite de intenção captura isso.
 */
export const CHUNK_INTENTS: Record<string, string> = {
  nihao: "greet",
  zaoshanghao: "greet",
  wanshanghao: "greet",
  nihaoma: "ask-wellbeing",
  nine: "ask-wellbeing",
  zenmeyang: "ask-wellbeing",
  wohenhao: "state-wellbeing",
  jintianhenhao: "state-wellbeing",
  xiexie: "thank",
  bukeqi: "respond-thanks",
  duibuqi: "apologize",
  meiguanxi: "respond-apology",
  zaijian: "farewell",
  wanan: "farewell",
  mingtianjian: "plan-tomorrow",
  qingwen: "polite-question",
  qingwen_nihaoma: "polite-question",
  qingzuo: "invite-in",
  qingjin: "invite-in",
  wojiao: "introduce-self",
  woshixuesheng: "introduce-self",
  nijiaoshenme: "ask-name",
  wature: "state-origin",
  nishinaiguoren: "ask-origin",
  renshinihengaoxing: "pleased-to-meet",
  wobuhui: "cannot-speak",
  wohuishuoyidian: "can-speak-little",
  tingbudong: "not-understand",
  qingzaishuoyibian: "request-repeat",
  nihuishuoyingyuma: "ask-language",
  womenzouba: "suggest-go",
  dengyixia: "request-wait",
  zheshishenme: "ask-what",
  zheshishui: "identify-object",
  nashirenm: "identify-person",
  zheshibaba: "introduce-family",
  zheshimama: "introduce-family",
  zaina: "ask-where",
  huochezhanzainali: "ask-where",
  shenmeshihou: "ask-when",
  duoshaoqian: "ask-price",
  zhegeduoshaoqian: "ask-price",
  piaoduoshaoqian: "ask-price",
  woyao: "order-item",
  woyaomifan: "order-item",
  woxianghe: "order-drink",
  taiguile: "complain-price",
  pianyiyidian: "negotiate-price",
  haochi: "praise-food",
  woele: "state-hunger",
  womenchifanba: "suggest-eat",
  buyaola: "customize-order",
  maidan: "ask-bill",
  fuwuyuan: "call-waiter",
  haode: "agree",
  meiwenti: "agree",
  taihaole: "celebrate",
  woyeshi: "agree",
  wozhidao: "state-knowledge",
  wobuzhidao: "state-knowledge",
  woxihuan: "state-preference",
  wozaixuezhongwen: "state-activity",
  woquxuexiao: "state-activity",
  wozuochuzuche: "state-activity",
  woyousangepengyou: "state-friends",
};

const MEANING_CHOICE_KINDS = new Set(["comprehend", "flashcard"]);
const ASSEMBLY_KINDS = new Set(["sentence_build", "translation_build", "produce"]);

// Alvo hànzì principal do passo (o que ele cobra, não o que ele mostra).
function primaryHanziTarget(step: LessonStep): string {
  switch (step.kind) {
    case "recognize":
    case "decompose":
      return cleanHanzi(step.charId ? charById.get(step.charId)?.hanzi : "");
    case "tone":
    case "comprehend":
      return cleanHanzi(step.hanzi);
    case "listen":
      return cleanHanzi(step.text);
    case "listen_select":
      return cleanHanzi(step.correctAnswer ?? step.audioText);
    case "sentence_build":
    case "translation_build":
    case "hanzi_build":
      return cleanHanzi(step.correctAnswer ?? step.targetParts?.join(""));
    case "produce":
      return cleanHanzi(step.target?.join(""));
    case "fill_blank":
      return cleanHanzi(step.correctAnswer ?? `${step.sentenceBefore ?? ""}${step.blankAnswer ?? ""}${step.sentenceAfter ?? ""}`);
    case "dialogue_choice":
      return containsCjk(step.correctAnswer ?? step.answer) ? cleanHanzi(step.correctAnswer ?? step.answer) : "";
    case "conversation_scene":
      return cleanHanzi(step.correctAnswer ?? step.checkpoint?.correctAnswer);
    case "image_choice":
      return cleanHanzi(step.targetHanzi);
    case "flashcard": {
      const chunk = CHUNKS.find((candidate) => candidate.id === step.chunkId);
      return cleanHanzi(chunk?.hanzi);
    }
    default:
      return "";
  }
}

/**
 * Chaves semânticas de um passo — o que ele cobra cognitivamente.
 * Um passo pode (e deve) retornar várias chaves.
 */
export function semanticTargetKeys(step: LessonStep): string[] {
  const keys = new Set<string>();
  const answer = step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer;

  const hanziTarget = primaryHanziTarget(step);
  if (hanziTarget) {
    const glyphs = [...hanziTarget];
    if (glyphs.length === 1) {
      keys.add(`char:${hanziTarget}`);
    } else {
      keys.add(`phrase:${hanziTarget}`);
      const chunk = chunkByCleanHanzi.get(hanziTarget);
      if (chunk) {
        keys.add(`chunk:${hanziTarget}`);
        const intent = CHUNK_INTENTS[chunk.id];
        if (intent) keys.add(`intent:${intent}`);
      }
    }
  }

  // Escolha de significado: mesma tradução cobrada = mesmo alvo.
  if (
    answer &&
    !containsCjk(answer) &&
    (MEANING_CHOICE_KINDS.has(step.kind) || (step.kind === "image_choice" && step.imageChoiceMode === "choose_meaning"))
  ) {
    keys.add(`meaning:${norm(answer)}`);
    keys.add("intent:identify-concept");
  }

  if (step.kind === "image_choice") {
    const conceptId = step.imageId ?? step.iconId;
    const concept = resolveVisualConcept(conceptId);
    if (concept) {
      keys.add(`visual:${concept.id}`);
      keys.add(`char:${concept.hanzi}`);
    }
  }

  if (step.kind === "conversation_scene") {
    if (step.sceneId) keys.add(`scene:${step.sceneId}`);
    if (step.sceneIntent) keys.add(`intent:${step.sceneIntent}`);
  }

  if (step.kind === "hanzi_build") keys.add("action:assemble-hanzi");
  if (ASSEMBLY_KINDS.has(step.kind)) keys.add("action:assemble-phrase");
  if (step.kind === "write") keys.add("action:write");

  return [...keys];
}

// ————————————————————————————————————————————————————————————————
// Perfil cognitivo e transformações.
// ————————————————————————————————————————————————————————————————

export type CognitiveStimulus = "image" | "audio" | "hanzi" | "meaning" | "situation";
export type CognitiveResponse = "meaning" | "hanzi" | "pinyin" | "image" | "assembly" | "text" | "tone" | "match";
export type CognitiveScope = "char" | "word" | "phrase" | "conversation";

export interface CognitiveProfile {
  stimulus: CognitiveStimulus;
  response: CognitiveResponse;
  /** 0 apresentação · 1 reconhecimento · 2 produção · 3 uso em situação · 4 conversa. */
  familyRank: 0 | 1 | 2 | 3 | 4;
  scope: CognitiveScope;
  guided: boolean;
  mixesOld: boolean;
}

const PINYIN_TONE_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu;

function scopeOf(step: LessonStep): CognitiveScope {
  if (step.kind === "conversation_scene") return "conversation";
  const target = primaryHanziTarget(step);
  const length = [...target].length;
  if (length <= 1) return "char";
  if (length === 2) return "word";
  return "phrase";
}

function stimulusOf(step: LessonStep): CognitiveStimulus {
  if (step.kind === "image_choice") {
    if (step.imageChoiceMode === "listen_and_choose_image") return "audio";
    if (step.imageChoiceMode === "choose_image") return "hanzi";
    return "image";
  }
  if (step.kind === "listen" || step.kind === "listen_select" || step.kind === "tone" || step.kind === "tone_pair") {
    return "audio";
  }
  if (step.kind === "produce" || step.kind === "translation_build" || step.kind === "write") return "meaning";
  if (step.kind === "dialogue_choice" || step.kind === "conversation_scene") return "situation";
  return "hanzi";
}

function responseOf(step: LessonStep): CognitiveResponse {
  if (step.kind === "tone") return "tone";
  if (step.kind === "match_pairs" || step.kind === "tone_pair") return "match";
  if (step.kind === "hanzi_build" || ASSEMBLY_KINDS.has(step.kind) || step.kind === "fill_blank") return "assembly";
  if (step.kind === "write") return "text";
  if (step.kind === "image_choice") {
    if (step.imageChoiceMode === "choose_image" || step.imageChoiceMode === "listen_and_choose_image") return "image";
    if (step.imageChoiceMode === "choose_pinyin") return "pinyin";
    if (step.imageChoiceMode === "choose_meaning") return "meaning";
    return "hanzi";
  }
  const answer = step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer ?? "";
  if (containsCjk(answer)) return "hanzi";
  if (PINYIN_TONE_MARK_RE.test(answer)) return "pinyin";
  return "meaning";
}

function familyRankOf(step: LessonStep): CognitiveProfile["familyRank"] {
  switch (step.kind) {
    case "intro":
    case "flashcard":
    case "listen":
    case "hanzi_evolution":
    case "microread":
      return 0;
    case "recognize":
    case "decompose":
    case "comprehend":
    case "listen_select":
    case "tone":
    case "tone_pair":
    case "match_pairs":
    case "image_choice":
      return 1;
    case "produce":
    case "sentence_build":
    case "translation_build":
    case "hanzi_build":
    case "fill_blank":
    case "write":
      return 2;
    case "dialogue_choice":
      return 3;
    case "conversation_scene":
      return 4;
    default:
      return 1;
  }
}

export function cognitiveProfile(step: LessonStep): CognitiveProfile {
  return {
    stimulus: stimulusOf(step),
    response: responseOf(step),
    familyRank: familyRankOf(step),
    scope: scopeOf(step),
    guided: step.assist === "guided" || step.helpMode === "progressive" || step.kind === "flashcard",
    mixesOld:
      step.kind === "match_pairs" ||
      step.kind === "tone_pair" ||
      (step.reusesPreviousVocabulary?.length ?? 0) > 0,
  };
}

function questionTextOf(step: LessonStep): string {
  return norm(
    [step.hanzi, step.dialoguePrompt, step.prompt, step.promptPt, step.audioText, step.text]
      .filter(Boolean)
      .join(" ")
  );
}

function answerTextOf(step: LessonStep): string {
  return norm(cleanHanzi(step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer) || (step.correctAnswer ?? step.answer ?? ""));
}

const SAME_QUESTION_KINDS = new Set(["comprehend", "dialogue_choice"]);

/**
 * Houve transformação cognitiva real entre dois passos que cobram o mesmo
 * alvo? Válidas: reconhecimento→produção, imagem→hànzì, hànzì→áudio,
 * palavra→frase, frase→conversa, guiada→sem ajuda, significado→aplicação,
 * item isolado→combinação com conteúdo antigo (qualquer mudança de dimensão
 * do perfil). Não conta: reordenar opções, trocar título, trocar comprehend
 * por dialogue_choice mantendo a pergunta, ou repetir a resposta com outra
 * moldura.
 */
export function cognitiveTransformation(previous: LessonStep, candidate: LessonStep): boolean {
  const sameAnswer = Boolean(answerTextOf(previous)) && answerTextOf(previous) === answerTextOf(candidate);
  const sameQuestion = Boolean(questionTextOf(previous)) && questionTextOf(previous) === questionTextOf(candidate);

  // Mesma pergunta e mesma resposta: só mudou ordem de opções/título.
  if (sameAnswer && sameQuestion) return false;
  // comprehend ⇄ dialogue_choice com a mesma pergunta não é transformação.
  if (
    SAME_QUESTION_KINDS.has(previous.kind) &&
    SAME_QUESTION_KINDS.has(candidate.kind) &&
    (sameQuestion || sameAnswer)
  ) {
    return false;
  }

  const before = cognitiveProfile(previous);
  const after = cognitiveProfile(candidate);

  // Mesma resposta com outra moldura: nenhuma dimensão cognitiva mudou.
  if (
    sameAnswer &&
    before.stimulus === after.stimulus &&
    before.response === after.response &&
    before.scope === after.scope &&
    before.familyRank === after.familyRank
  ) {
    return false;
  }

  return (
    before.familyRank !== after.familyRank || // reconhecimento→produção, significado→aplicação, frase→conversa
    before.stimulus !== after.stimulus || // imagem→hànzì, hànzì→áudio
    before.response !== after.response ||
    before.scope !== after.scope || // palavra→frase
    before.guided !== after.guided || // resposta guiada→sem ajuda
    before.mixesOld !== after.mixesOld // item isolado→combinação com conteúdo antigo
  );
}

// ————————————————————————————————————————————————————————————————
// Limites por chave semântica.
// ————————————————————————————————————————————————————————————————

/**
 * Lição comum: resposta exata ≤2 (underAnswerRepeatCap, preservado),
 * hànzì central ≤3, frase completa ≤2, intenção ≤2, imagem ≤1, cena ≤1.
 * Acima do limite, cada ocorrência extra precisa de transformação cognitiva;
 * revisões ganham +1 de folga (podem repetir mais, com transformação).
 */
export function semanticCapForKey(key: string, isReview: boolean): number | null {
  const slack = isReview ? 1 : 0;
  if (key.startsWith("char:")) return 3 + slack;
  if (key.startsWith("chunk:") || key.startsWith("phrase:")) return 2 + slack;
  if (key.startsWith("intent:")) return 2 + slack;
  if (key.startsWith("visual:")) return 1 + slack;
  if (key.startsWith("scene:")) return 1;
  if (key.startsWith("meaning:")) return 2 + slack;
  return null; // action:* não tem teto próprio (coberto pelos caps de tipo do motor)
}

/** Teto absoluto: mesmo com transformação, uma chave não domina a lição. */
export function semanticHardCeilingForKey(key: string, isReview: boolean): number | null {
  const cap = semanticCapForKey(key, isReview);
  if (cap == null) return null;
  if (key.startsWith("scene:")) return cap;
  return cap + (isReview ? 4 : 3);
}

/**
 * Moldura/contexto do passo — dois exercícios na MESMA moldura (mesma
 * pergunta de diálogo, mesma frase de lacuna, mesmo cenário de cena) contam
 * como "mesmo contexto" para a pontuação.
 */
export function semanticContextKey(step: LessonStep): string | null {
  if (step.kind === "conversation_scene") return step.setting ? `setting:${step.setting}` : null;
  if (step.kind === "dialogue_choice") {
    const frame = norm(step.dialoguePrompt ?? step.prompt);
    return frame ? `frame:${frame}` : null;
  }
  if (step.kind === "fill_blank") {
    const frame = norm(`${step.sentenceBefore ?? ""}_${step.sentenceAfter ?? ""}`);
    return frame && frame !== "_" ? `frame:${frame}` : null;
  }
  return null;
}
