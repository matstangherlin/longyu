/**
 * Taxonomia dos eventos de aprendizagem (RC1.5, P7).
 *
 * Um contador só vale se o nome dele descreve o que aconteceu de verdade. Até
 * a RC1.4 a /fala chamava `recordDailyTask("phrasesSpoken")` quando o aluno
 * clicava "Já sabia" num flashcard — ninguém falou, ninguém abriu o microfone,
 * e mesmo assim a medalha dizia "Fale 50 frases em voz alta" e o painel dizia
 * que a pessoa produzia fala. Métrica mentirosa é pior que métrica ausente:
 * ela sustenta decisão adaptativa errada e promessa de marketing falsa.
 *
 * Este arquivo é o inventário: evento, o que significa, o que o dispara, de
 * onde vem. O gate `validate:learning-event-semantics` cobra que a lista aqui
 * cubra todas as chaves diárias do store e que nada emita `phrasesSpoken` sem
 * passar pelo contrato de tentativa de fala.
 */

import type { FeatureCapabilityId } from "../product/featureTruth";

export interface LearningEventSpec {
  readonly id: string;
  /** O que este número afirma sobre o aluno. */
  readonly meaning: string;
  /** O que precisa acontecer para incrementar. */
  readonly trigger: string;
  /** Telas que emitem. */
  readonly surfaces: readonly string[];
  /** Capacidade que dá direito de emitir. */
  readonly capability: FeatureCapabilityId;
  /**
   * Só incrementa por `recordSpeechAttempt` com captura real de voz.
   * `recordDailyTask` não alcança estes eventos — o tipo não deixa.
   */
  readonly requiresSpeechAttempt?: boolean;
  /** Semântica anterior à RC1.5, preservada em snapshot antigo. */
  readonly legacySemantics?: string;
}

export const LEARNING_EVENTS = {
  audioHeard: {
    id: "audioHeard",
    meaning: "Áudio em mandarim realmente reproduzido para o aluno.",
    trigger: "SpeakButton/TTS conclui a reprodução, ou sessão de imersão é concluída.",
    surfaces: ["SpeakButton", "SomPage", "PinyinLabPage", "ImmersionPage"],
    capability: "tts_playback",
  },
  phrasesReviewed: {
    id: "phrasesReviewed",
    meaning: "Frase útil revisada — flashcard de chunk, passo de história, autoavaliação de SRS.",
    trigger: "O aluno julga um chunk na /fala ou responde um passo de frase na imersão.",
    surfaces: ["FalaPage", "ImmersionPage"],
    capability: "phrase_chunk_training",
    legacySemantics:
      "Antes da RC1.5 estes incrementos caíam em `phrasesSpoken`. O número antigo não foi convertido: snapshots anteriores começam com phrasesReviewed = 0.",
  },
  phrasesSpoken: {
    id: "phrasesSpoken",
    meaning: "Tentativa REAL de fala: microfone aberto e voz efetivamente capturada.",
    trigger:
      "`recordSpeechAttempt` com `captured: true` — sessão de reconhecimento que devolveu transcrição não vazia.",
    surfaces: ["PronunciationPractice"],
    capability: "speech_recognition",
    requiresSpeechAttempt: true,
    legacySemantics:
      "Antes da RC1.5 o contador também somava autoavaliação de flashcard e resposta digitada. Os valores antigos permanecem como estão e não são lidos como fala comprovada.",
  },
  reviewsDone: {
    id: "reviewsDone",
    meaning: "Item de revisão efetivamente resolvido.",
    trigger: "Conclusão de uma atividade na fila de revisão ou na revisão pós-lição.",
    surfaces: ["RevisaoPage", "LessonPlayer"],
    capability: "review_remediation",
  },
  hanziDecomposed: {
    id: "hanziDecomposed",
    meaning: "Caractere decomposto ou montado pelo aluno.",
    trigger: "Decomposição concluída ou HanziBuilder aceito.",
    surfaces: ["HanziPage"],
    capability: "hanzi_lab",
  },
  microtextsRead: {
    id: "microtextsRead",
    meaning: "Microtexto lido até o fim.",
    trigger: "Conclusão de leitura na /leitura ou passo de microtexto na imersão.",
    surfaces: ["LeituraPage", "ImmersionPage"],
    capability: "immersion_audio",
  },
  errorsCorrected: {
    id: "errorsCorrected",
    meaning: "Erro registrado que o aluno voltou e acertou.",
    trigger: "Acerto de item que estava na lista de erros pendentes.",
    surfaces: ["RevisaoPage", "LessonPlayer"],
    capability: "review_remediation",
  },
  threeStarLessons: {
    id: "threeStarLessons",
    meaning: "Lição concluída com 3 estrelas hoje.",
    trigger: "Conclusão idempotente de lição com pontuação máxima.",
    surfaces: ["LessonPlayer"],
    capability: "journey_learning",
  },
  tonesTrained: {
    id: "tonesTrained",
    meaning: "Tom acertado em tarefa de percepção ou contraste.",
    trigger: "Acerto em passo tonal de lição, Pinyin Lab ou Tone Trainer.",
    surfaces: ["LessonPlayer", "PinyinLabPage", "ToneTrainer"],
    capability: "tone_contrast_training",
  },
} as const satisfies Record<string, LearningEventSpec>;

export type LearningEventId = keyof typeof LEARNING_EVENTS;

const EVENTS: Record<LearningEventId, LearningEventSpec> = LEARNING_EVENTS;

export function learningEvent(id: LearningEventId): LearningEventSpec {
  return EVENTS[id];
}

/** Eventos que exigem tentativa real de fala — nunca alcançáveis por clique. */
export const SPEECH_ATTEMPT_EVENTS: readonly LearningEventId[] = (
  Object.keys(EVENTS) as LearningEventId[]
).filter((id) => EVENTS[id].requiresSpeechAttempt);

/**
 * O que não conta como tentativa de fala (P5.1).
 *
 * A lista existe para ser lida por quem for mexer nisso depois, e para o gate
 * poder citar a regra pelo nome quando recusar uma mudança.
 */
export const NOT_A_SPEECH_ATTEMPT = [
  "clicar SpeakButton",
  "ouvir TTS",
  "mostrar significado",
  'clicar "Já sabia"',
  'clicar "Ainda não"',
  "montar frase digitando",
  "selecionar opção",
  "replay de áudio",
] as const;
