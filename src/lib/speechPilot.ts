/**
 * RC2.3.5 — Speech & Contrast pilot (8 itens representativos).
 *
 * Não espalha fala pelas 134 lições: define o piloto que o owner valida no
 * aparelho antes de qualquer expansão. Cada item usa motores e conteúdo que já
 * existem (Pinyin Lab contrast drill, audio_discrimination da Jornada,
 * SelfComparePractice, PronunciationPractice, cenas de conversa) e declara a
 * escada: OUVIR → IDENTIFICAR → COMPARAR → (contexto) → PRODUZIR → TRANSFERIR.
 * O gate `gate:rc2-3-5-speech` confere que cada contraste existe na biblioteca
 * V2, que o modelo tem áudio canônico e que produção nunca vem antes de percepção.
 */

export type PilotStage = "DISCOVERY" | "PERCEPTION" | "COMPARE" | "CONTEXT" | "PRODUCTION" | "TRANSFER";

export type PilotFallback = "SELF_COMPARE" | "CONTINUE_WITHOUT_SPEAKING" | "ARTICULATION_ONLY";

export interface SpeechPilotItem {
  id: string;
  kind: "tone_contrast" | "initial_contrast" | "final_contrast" | "word_production" | "phrase_production" | "conversation_transfer" | "recognition_fallback" | "self_compare_fallback";
  target: string;
  /** Par da biblioteca V2 (hànzì A+B ordenados), quando é contraste. */
  contrastPair?: readonly [string, string];
  /** Glifos que o aluno precisa já ter visto (autoridade: seenGlyphs da Jornada). */
  prerequisiteGlyphs: readonly string[];
  /** Escada na ordem em que acontece. */
  ladder: readonly PilotStage[];
  /** Onde o aluno encontra o item hoje (superfície existente). */
  surface: string;
  /** Texto com asset canônico usado como modelo. */
  modelAudioText: string;
  fallback: PilotFallback;
  /** Para onde a fala é transferida (cena/lição existente), quando aplicável. */
  transferTo?: string;
}

export const SPEECH_PILOT: readonly SpeechPilotItem[] = [
  {
    id: "pilot:tone:shi-2x4",
    kind: "tone_contrast",
    target: "十 shí × 是 shì",
    contrastPair: ["十", "是"],
    prerequisiteGlyphs: ["十", "是"],
    ladder: ["DISCOVERY", "PERCEPTION", "COMPARE", "CONTEXT", "PRODUCTION", "TRANSFER"],
    surface: "Jornada audio_discrimination (par mínimo) → SelfComparePractice",
    modelAudioText: "是",
    fallback: "SELF_COMPARE",
    transferTo: "l8-shi (我是…)",
  },
  {
    id: "pilot:initial:q-ch",
    kind: "initial_contrast",
    target: "七 qī × 吃 chī",
    contrastPair: ["七", "吃"],
    prerequisiteGlyphs: ["七", "吃"],
    ladder: ["DISCOVERY", "PERCEPTION", "COMPARE", "PRODUCTION"],
    surface: "Jornada audio_discrimination (ch × q)",
    modelAudioText: "吃",
    fallback: "SELF_COMPARE",
  },
  {
    id: "pilot:final:ao-ou",
    kind: "final_contrast",
    target: "号 hào × 后 hòu",
    contrastPair: ["号", "后"],
    prerequisiteGlyphs: ["号", "后"],
    ladder: ["DISCOVERY", "PERCEPTION", "COMPARE", "PRODUCTION"],
    surface: "Jornada audio_discrimination (-ao × -ou)",
    modelAudioText: "后",
    fallback: "SELF_COMPARE",
  },
  {
    id: "pilot:word:xiexie",
    kind: "word_production",
    target: "谢谢",
    prerequisiteGlyphs: ["谢"],
    ladder: ["PERCEPTION", "PRODUCTION"],
    surface: "SelfComparePractice (OUÇA → GRAVE → OUÇA VOCÊ → COMPARE)",
    modelAudioText: "谢谢",
    fallback: "CONTINUE_WITHOUT_SPEAKING",
  },
  {
    id: "pilot:phrase:nihao",
    kind: "phrase_production",
    target: "你好",
    prerequisiteGlyphs: ["你", "好"],
    ladder: ["PERCEPTION", "PRODUCTION", "TRANSFER"],
    surface: "PronunciationPractice (ASR opcional) → SelfComparePractice",
    modelAudioText: "你好",
    fallback: "SELF_COMPARE",
    transferTo: "conversa de saudação da Jornada",
  },
  {
    id: "pilot:transfer:cardapio",
    kind: "conversation_transfer",
    target: "我要米饭",
    prerequisiteGlyphs: ["我", "要", "米", "饭"],
    ladder: ["PERCEPTION", "PRODUCTION", "TRANSFER"],
    surface: "conversation_scene pedir-cardapio",
    modelAudioText: "我要米饭",
    fallback: "CONTINUE_WITHOUT_SPEAKING",
    transferTo: "pedir-cardapio",
  },
  {
    id: "pilot:fallback:recognition",
    kind: "recognition_fallback",
    target: "请问",
    prerequisiteGlyphs: ["请", "问"],
    ladder: ["PERCEPTION", "PRODUCTION"],
    surface: "PronunciationPractice: sem serviço / sem mandarim / 2 falhas → SelfComparePractice",
    modelAudioText: "请问",
    fallback: "SELF_COMPARE",
  },
  {
    id: "pilot:fallback:self-compare",
    kind: "self_compare_fallback",
    target: "再见",
    prerequisiteGlyphs: ["再", "见"],
    ladder: ["PERCEPTION", "PRODUCTION"],
    surface: "SelfComparePractice: microfone negado / sem gravador → Continuar sem falar",
    modelAudioText: "再见",
    fallback: "CONTINUE_WITHOUT_SPEAKING",
  },
];

/** Produção nunca antes de percepção; transferência nunca antes de produção. */
export function pilotLadderIsOrdered(ladder: readonly PilotStage[]): boolean {
  const at = (s: PilotStage) => ladder.indexOf(s);
  if (at("PRODUCTION") >= 0 && (at("PERCEPTION") < 0 || at("PERCEPTION") > at("PRODUCTION"))) return false;
  if (at("TRANSFER") >= 0 && (at("PRODUCTION") < 0 || at("PRODUCTION") > at("TRANSFER"))) return false;
  if (at("DISCOVERY") >= 0 && at("DISCOVERY") !== 0) return false;
  return true;
}
