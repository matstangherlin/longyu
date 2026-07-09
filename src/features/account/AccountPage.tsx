import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DOMAIN_META, type DomainTrack } from "../../data/domains";
import { ALL_LESSONS, FOUNDATION_LESSON_IDS, JOURNEY, type Lesson } from "../../data/journey";
import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { engineInsights, type EngineInsight } from "../../lib/engineIntelligence";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { useStore, type AuthMode, type LearningAccount, type PlacementLevel, type PlacementResult, type RewardHistoryEntry } from "../../lib/store";
import type { SRSItem } from "../../lib/srs";
import { Button, Card, HubCard, Pill, ProgressBar } from "../../components/ui/primitives";
import { HubContentCard, HubHeader, HubPage } from "../../components/layout/HubLayout";
import { BetaBadge } from "../../components/feedback/BetaBadge";
import { ACHIEVEMENTS } from "../../data/achievements";
import { useAchievementSnapshot } from "../../components/achievements/AchievementsWatcher";
import { Mascot } from "../../components/brand/Mascot";
import { BrandWordmark } from "../../components/layout/Brand";
import { GlossText } from "../../components/hanzi/GlossText";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { playSoundFx } from "../../lib/soundFx";
import { KeyboardShortcutHint, ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import {
  cancelSubscription,
  getSubscription,
  isBillingPortalAvailable,
  openBillingPortal,
  subscriptionStateFor,
  type ServerSubscriptionSnapshot,
  type SubscriptionState,
} from "../../services/subscriptionService";
import { restoreCloudSessionIfPresent, syncAuthSessionProgress } from "../../services/cloudSyncCoordinator";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";
import { useCloudSignIn } from "../../hooks/useCloudSignIn";
import { CloudLoginForm } from "../../components/auth/CloudLoginForm";
import { canRegisterWithCredentials } from "../../lib/authForm";
import { activeLearningRepository } from "../../lib/repositories/learningRepository";
import { validateProgressSnapshot } from "../../lib/progressSnapshot";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { buildPrivacyExportBundle, requestAccountDeletion } from "../../services/privacyService";
import {
  createAccount as createAuthAccount,
} from "../../services/authService";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { useIsPro } from "../../lib/proAccess";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconChevron,
  IconFlame,
  IconGear,
  IconHanzi,
  IconLibrary,
  IconRefresh,
  IconShield,
  IconSound,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUser,
} from "../../components/ui/Icon";

type Experience = "zero" | "words" | "studied" | "phrases" | "advanced";
type QuizDifficulty = 1 | 2 | 3 | 4;
type QuizLayer = "supported" | "reduced" | "noHelp" | "sentenceReasoning" | "soundSpeech" | "production";
type AssessmentTier = "A" | "B" | "C" | "D" | "E";
type EssentialPlacementItem =
  | "mandarim"
  | "pinyin"
  | "tom"
  | "hanzi"
  | "你好"
  | "谢谢"
  | "我"
  | "你"
  | "好"
  | "再见";
type OnboardingStep =
  | "welcome"
  | "source"
  | "reason"
  | "level"
  | "quiz"
  | "result"
  | "name"
  | "account";

// Categorias do diagnóstico: cada pergunta testa uma competência diferente,
// para o teste parecer um mapeamento real do aluno, não um quiz solto.
type QuizCategory = "meaning" | "sound" | "tone" | "hanzi" | "sentence" | "context" | "speaking";

const CATEGORY_LABEL: Record<QuizCategory, string> = {
  meaning: "Significado",
  sound: "Som e pinyin",
  tone: "Tons",
  hanzi: "Hànzì",
  sentence: "Frases",
  context: "Uso em contexto",
  speaking: "Som e fala",
};

const CATEGORY_DIFFICULTY: Record<QuizCategory, QuizDifficulty> = {
  meaning: 1,
  sound: 1,
  tone: 2,
  sentence: 2,
  hanzi: 3,
  context: 3,
  speaking: 3,
};

const ESSENTIAL_PLACEMENT_ITEMS: Record<EssentialPlacementItem, string> = {
  mandarim: "mandarim",
  pinyin: "pinyin",
  tom: "tom",
  hanzi: "hànzì",
  "你好": "你好",
  "谢谢": "谢谢",
  "我": "我",
  "你": "你",
  "好": "好",
  "再见": "再见",
};

const QUIZ_DIFFICULTY_LABEL: Record<QuizDifficulty, string> = {
  1: "Base",
  2: "Fase atual",
  3: "Sondagem",
  4: "Avancada",
};

interface Choice<T extends string = string> {
  id: T;
  icon: string;
  label: string;
  desc?: string;
}

interface QuizQuestion {
  id: string;
  skill: QuizCategory;
  category: QuizCategory;
  layer: QuizLayer;
  prompt: string;
  stimulus?: string;
  detail?: string;
  audioText?: string;
  allowHints?: boolean;
  hasHint: boolean;
  noHint: boolean;
  essential?: boolean;
  essentialItem?: EssentialPlacementItem;
  withClue?: boolean;
  tier?: AssessmentTier;
  difficulty?: QuizDifficulty;
  unlockWeight: number;
  answer: string;
  options: string[];
}

interface QuizCategoryStat {
  total: number;
  correct: number;
  correctWithoutHint: number;
  correctWithHint: number;
  hints: number;
  score: number;
}

interface QuizTierStat {
  total: number;
  correct: number;
  correctWithoutHint: number;
  hints: number;
}

interface PlacementAnalysis {
  placement: Omit<PlacementResult, "score" | "takenAt">;
  score: number;
  questionsAnswered: number;
  correctWithoutHint: number;
  correctWithHint: number;
  wrong: number;
  weightedScore: number;
  weightedPossible: number;
  weightedAccuracy: number;
  noHintAccuracy: number;
  adjustedCorrect: number;
  decisiveQuestions: number;
  decisiveCorrect: number;
  decisiveAccuracy: number;
  tierSummary: Record<AssessmentTier, QuizTierStat>;
  hintCount: number;
  categoriesCorrect: string[];
  categoriesWeak: string[];
  essentialMissed: string[];
  essentialHinted: string[];
  advancedProbes: number;
  advancedMisses: number;
  advancedCorrect: number;
  resultMessage: string;
  skippedLessonIds: string[];
  foundationLessonIdsRequired: string[];
  foundationProofs: { lessonId: string; label: string; proven: boolean }[];
  decisionReasons: string[];
  consistency: "Alta" | "Média" | "Baixa";
  strengths: string[];
  reinforcements: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "name",
  "source",
  "reason",
  "level",
  "quiz",
  "result",
  "account",
];

const SOURCE_OPTIONS: Choice[] = [
  { id: "appstore", icon: "📱", label: "Loja de aplicativos" },
  { id: "friends", icon: "🤝", label: "Indicação de amigos" },
  { id: "social", icon: "📷", label: "Redes sociais" },
  { id: "youtube", icon: "▶", label: "YouTube" },
  { id: "search", icon: "🔎", label: "Busca no Google" },
  { id: "other", icon: "✦", label: "Outro" },
];

const REASON_OPTIONS: Choice[] = [
  { id: "travel", icon: "✈", label: "Preparar uma viagem" },
  { id: "study", icon: "📚", label: "Apoiar meus estudos" },
  { id: "habit", icon: "🧠", label: "Usar melhor meu tempo" },
  { id: "career", icon: "💼", label: "Crescer na carreira" },
  { id: "people", icon: "🤝", label: "Conversar com pessoas" },
  { id: "hanzi", icon: "Hàn", label: "Ler caracteres chineses" },
];

const EXPERIENCE_OPTIONS: Choice<Experience>[] = [
  { id: "zero", icon: "▂", label: "Nunca estudei mandarim.", desc: "Você começa pela base essencial, mesmo se fizer o teste rápido." },
  { id: "words", icon: "▂▅", label: "Sei algumas palavras.", desc: "Reconheço coisas como olá, obrigado ou alguns números." },
  { id: "studied", icon: "▂▅▇", label: "Já estudei o básico.", desc: "Vi pinyin, tons ou frases curtas, mas ainda preciso consolidar." },
  { id: "phrases", icon: "▂▅▇", label: "Consigo ler pinyin e frases simples.", desc: "Entendo frases simples sem glossário completo." },
  { id: "advanced", icon: "▂▅▇█", label: "Já sei hànzì e tons básicos.", desc: "Quero provar leitura, áudio, tons, hànzì e produção." },
];

const quizQuestion = (
  id: string,
  category: QuizCategory,
  layer: QuizLayer,
  prompt: string,
  answer: string,
  options: string[],
  extra: Partial<Omit<QuizQuestion, "id" | "category" | "layer" | "prompt" | "answer" | "options">> = {}
): QuizQuestion => {
  const hasHint = extra.hasHint ?? Boolean(extra.allowHints || extra.withClue || layer === "supported" || layer === "reduced");
  const noHint = extra.noHint ?? !hasHint;
  return {
    id,
    skill: extra.skill ?? category,
    category,
    layer,
    prompt,
    answer,
    options,
    hasHint,
    noHint,
    unlockWeight: extra.unlockWeight ?? defaultUnlockWeight(layer, hasHint, extra.essential, extra.difficulty),
    ...extra,
  };
};

function defaultUnlockWeight(
  layer: QuizLayer,
  hasHint: boolean,
  essential?: boolean,
  difficulty?: QuizDifficulty
): number {
  if (hasHint) return essential ? 0.35 : 0.25;
  const difficultyWeight = difficulty === 4 ? 1.35 : difficulty === 3 ? 1.15 : 1;
  const layerWeight = layer === "production" ? 1.25 : layer === "soundSpeech" ? 1.2 : 1;
  return Number((difficultyWeight * layerWeight * (essential ? 1.1 : 1)).toFixed(2));
}

const SUPPORTED_QUESTIONS: QuizQuestion[] = [
  quizQuestion("warm-nihao-meaning", "meaning", "supported", "O que significa esta saudação?", "Olá", ["Olá", "Obrigado(a)", "Não", "Tchau"], {
    stimulus: "你好",
    detail: "pinyin: nǐ hǎo",
    allowHints: true,
    difficulty: 1,
    essential: true,
    essentialItem: "你好",
    withClue: true,
  }),
  quizQuestion("warm-xiexie-meaning", "meaning", "supported", "O que significa esta frase?", "Obrigado(a).", ["Obrigado(a).", "De nada.", "Até logo.", "Tudo bem?"], {
    stimulus: "谢谢",
    detail: "pinyin: xièxie",
    allowHints: true,
    difficulty: 1,
    essential: true,
    essentialItem: "谢谢",
    withClue: true,
  }),
  quizQuestion("warm-nihao-pinyin", "sound", "supported", "Qual pinyin combina com esta frase?", "nǐ hǎo", ["nǐ hǎo", "xièxie", "bù", "wǒ"], {
    stimulus: "你好",
    detail: "pinyin escreve o som com letras latinas",
    allowHints: true,
    difficulty: 1,
    essential: true,
    essentialItem: "pinyin",
    withClue: true,
  }),
  quizQuestion("warm-thanks-context", "context", "supported", "Alguém te ajuda. O que combina dizer?", "谢谢", ["谢谢", "你好", "再见", "不客气"], {
    allowHints: true,
    difficulty: 1,
    withClue: true,
  }),
];

const FOUNDATION_CHECK_QUESTIONS: QuizQuestion[] = [
  quizQuestion(
    "foundation-what-is-mandarin",
    "context",
    "noHelp",
    "Sem dica: no Longyu, o que chamamos de mandarim?",
    "A forma padrão do chinês falado",
    ["A forma padrão do chinês falado", "Um alfabeto chinês", "Uma tradução em português", "Um tipo de hànzì"],
    { difficulty: 2, essential: true, essentialItem: "mandarim", unlockWeight: 1.05 }
  ),
  quizQuestion(
    "foundation-pinyin-role",
    "sound",
    "noHelp",
    "Sem dica: para que serve o pinyin?",
    "Mostrar o som com letras latinas",
    ["Mostrar o som com letras latinas", "Substituir hànzì para sempre", "Traduzir palavras para português", "Marcar plural"],
    { difficulty: 2, essential: true, essentialItem: "pinyin", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-tone-role",
    "tone",
    "noHelp",
    "Sem dica: em mandarim, mudar o tom pode...",
    "mudar a palavra",
    ["mudar a palavra", "apagar o hànzì", "criar plural", "virar tradução"],
    { difficulty: 2, essential: true, essentialItem: "tom", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-hanzi-role",
    "hanzi",
    "noHelp",
    "Sem dica: o que é hànzì?",
    "Caractere chinês usado na escrita",
    ["Caractere chinês usado na escrita", "Pinyin com acento", "Som gravado", "Tradução literal"],
    { difficulty: 2, essential: true, essentialItem: "hanzi", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-pinyin-vs-hanzi",
    "hanzi",
    "noHelp",
    "Sem dica: qual diferença está correta?",
    "Pinyin guia o som; hànzì é o caractere",
    ["Pinyin guia o som; hànzì é o caractere", "Pinyin é o caractere; hànzì é áudio", "Pinyin é português; hànzì é tom", "Pinyin e hànzì são a mesma coisa"],
    { difficulty: 3, essential: true, essentialItem: "hanzi", unlockWeight: 1.2 }
  ),
];

const REDUCED_HELP_QUESTIONS: QuizQuestion[] = [
  quizQuestion("core-bu-meaning", "meaning", "reduced", "O que significa este caractere?", "não", ["eu", "não", "três", "bom"], {
    stimulus: "不",
    allowHints: true,
    difficulty: 2,
    essential: true,
  }),
  quizQuestion("core-hao-meaning", "meaning", "reduced", "O que significa este caractere?", "bom; bem", ["bom; bem", "mãe", "casa", "obrigado"], {
    stimulus: "好",
    allowHints: true,
    difficulty: 2,
    essential: true,
    essentialItem: "好",
  }),
  quizQuestion("core-xiexie-pinyin", "sound", "reduced", "Qual é o pinyin correto?", "xièxie", ["xièxie", "nǐ hǎo", "zàijiàn", "hǎo"], {
    stimulus: "谢谢",
    allowHints: true,
    difficulty: 2,
    essential: true,
    essentialItem: "谢谢",
  }),
  quizQuestion("core-third-tone", "tone", "reduced", "Qual sílaba está no 3º tom (a voz desce e depois sobe)?", "mǎ", ["mā", "má", "mǎ", "mà"], {
    difficulty: 2,
    essential: true,
    essentialItem: "tom",
  }),
  quizQuestion("core-wo-hanzi", "hanzi", "reduced", "Qual caractere significa eu?", "我", ["我", "你", "好", "不"], {
    allowHints: true,
    difficulty: 2,
    essential: true,
    essentialItem: "我",
  }),
];

const NO_HELP_QUESTIONS: QuizQuestion[] = [
  quizQuestion("nohelp-nihao-pinyin", "sound", "noHelp", "Sem dica: qual é o pinyin de 你好?", "nǐ hǎo", ["nǐ hǎo", "xièxie", "bú kèqi", "wǒ"], {
    stimulus: "你好",
    difficulty: 3,
    essential: true,
    essentialItem: "你好",
  }),
  quizQuestion("nohelp-xiexie-tone", "tone", "noHelp", "Sem dica: qual é o tom da primeira sílaba de 谢谢?", "4º tom", ["1º tom", "2º tom", "3º tom", "4º tom"], {
    stimulus: "谢谢",
    difficulty: 3,
    essential: true,
    essentialItem: "tom",
  }),
  quizQuestion("nohelp-san-meaning", "meaning", "noHelp", "Sem dica: o que significa 三?", "três", ["três", "dez", "pessoa", "sol"], {
    stimulus: "三",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("nohelp-san-hanzi", "hanzi", "noHelp", "Sem dica: qual hànzì significa três?", "三", ["三", "二", "十", "人"], {
    difficulty: 3,
    essential: true,
    essentialItem: "hanzi",
  }),
  quizQuestion("nohelp-ni-meaning", "meaning", "noHelp", "Sem dica: o que significa 你?", "você", ["você", "eu", "bom; bem", "não"], {
    stimulus: "你",
    difficulty: 3,
    essential: true,
    essentialItem: "你",
  }),
  quizQuestion("nohelp-nihaoma-sentence", "sentence", "noHelp", "Sem dica: escolha o significado da pergunta.", "Tudo bem?", ["Tudo bem?", "Obrigado(a).", "Até logo.", "Meu nome é..."], {
    stimulus: "你好吗？",
    difficulty: 3,
    essential: true,
    essentialItem: "你好",
  }),
  quizQuestion("nohelp-zaijian-pinyin", "sound", "noHelp", "Sem dica: qual é o pinyin de 再见?", "zàijiàn", ["zàijiàn", "xièxie", "nǐ hǎo", "bú kèqi"], {
    stimulus: "再见",
    difficulty: 3,
    essential: true,
    essentialItem: "再见",
  }),
];

const PHRASE_REASONING_QUESTIONS: QuizQuestion[] = [
  quizQuestion("phrase-brazilian", "sentence", "sentenceReasoning", "Entenda pelo contexto: 我是巴西人", "Sou brasileiro.", ["Meu nome é Ana.", "Sou brasileiro.", "Eu quero água.", "Não entendi."], {
    stimulus: "我是巴西人",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("phrase-dont-understand", "context", "sentenceReasoning", "Você não entendeu o que ouviu. O que combina dizer?", "我听不懂", ["我听不懂", "谢谢", "我很好", "再见"], {
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("phrase-cannot-speak", "sentence", "sentenceReasoning", "Sem dica: escolha o significado da frase.", "Não falo chinês.", ["Eu falo chinês.", "Não falo chinês.", "Eu estudo chinês.", "Gosto de chinês."], {
    stimulus: "我不会说中文",
    difficulty: 4,
  }),
  quizQuestion("phrase-repeat", "context", "sentenceReasoning", "Você quer pedir para a pessoa repetir. O que combina dizer?", "请再说一遍", ["请再说一遍", "谢谢", "我很好", "再见"], {
    difficulty: 4,
  }),
  quizQuestion("phrase-price-clue", "sentence", "sentenceReasoning", "Com pista: escolha o significado da frase.", "Quanto custa este?", ["Quanto custa este?", "Que horas são?", "Onde fica?", "Eu quero água."], {
    stimulus: "这个多少钱？",
    allowHints: true,
    withClue: true,
    difficulty: 4,
  }),
];

const SOUND_SPEECH_QUESTIONS: QuizQuestion[] = [
  quizQuestion("audio-ma1-tone", "tone", "soundSpeech", "Ouça 妈 e escolha o tom que você ouviu.", "1º tom", ["1º tom", "2º tom", "3º tom", "4º tom"], {
    audioText: "妈",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("audio-ma3-tone", "tone", "soundSpeech", "Ouça 马 e escolha o tom que você ouviu.", "3º tom", ["1º tom", "2º tom", "3º tom", "4º tom"], {
    audioText: "马",
    difficulty: 4,
  }),
  quizQuestion("audio-xiexie-phrase", "sound", "soundSpeech", "Ouça e escolha a frase que foi dita.", "谢谢", ["谢谢", "你好", "再见", "不客气"], {
    audioText: "谢谢",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("speech-nihao-self", "speaking", "soundSpeech", "Repita em voz alta 你好. Como ficou?", "Consegui repetir com tom parecido", ["Consegui repetir com tom parecido", "Reconheci, mas não consegui repetir", "Não reconheci o som"], {
    audioText: "你好",
    difficulty: 3,
    tier: "A",
  }),
];

const PRODUCTION_QUESTIONS: QuizQuestion[] = [
  quizQuestion("prod-nihao-build", "sentence", "production", "Monte a frase para dizer olá.", "你好", ["你好", "好你", "谢谢", "再见"], {
    audioText: "你好",
    difficulty: 3,
    essential: true,
    tier: "E",
  }),
  quizQuestion("prod-thanks-build", "context", "production", "Alguém te ajuda. Monte a resposta adequada.", "谢谢", ["谢谢", "不客气", "你好", "再见"], {
    audioText: "谢谢",
    difficulty: 3,
    essential: true,
    tier: "E",
  }),
  quizQuestion("prod-woshi-gap", "sentence", "production", "Complete a frase: 我__巴西人", "是", ["是", "不", "好", "吗"], {
    difficulty: 4,
    tier: "E",
  }),
  quizQuestion("prod-question-ma", "sentence", "production", "Complete a pergunta: 你好吗__", "？", ["？", "。", "不", "是"], {
    difficulty: 4,
    tier: "E",
  }),
];

const ADVANCED_HANZI_QUESTIONS: QuizQuestion[] = [
  quizQuestion("adv-ming-meaning", "hanzi", "noHelp", "Sem dica: 明 junta sol e lua. O que significa?", "claro; brilhante", ["escuro", "claro; brilhante", "floresta", "descanso"], {
    stimulus: "明",
    difficulty: 4,
  }),
  quizQuestion("adv-ma-phonetic", "hanzi", "noHelp", "Sem dica: em 妈, qual peça dá a pista de som?", "马", ["女", "马", "妈", "口"], {
    stimulus: "妈",
    difficulty: 4,
  }),
  quizQuestion("adv-lin-meaning", "hanzi", "noHelp", "Sem dica: o que significa 林?", "bosque; floresta", ["montanha", "bosque; floresta", "rio", "fogo"], {
    stimulus: "林",
    difficulty: 4,
  }),
  quizQuestion("adv-zhongguo-pinyin", "sound", "noHelp", "Sem dica: qual é o pinyin de 中国?", "Zhōngguó", ["Zhōngguó", "Rìběn", "Běijīng", "Hànyǔ"], {
    stimulus: "中国",
    difficulty: 4,
  }),
  quizQuestion("adv-nice-meet", "sentence", "sentenceReasoning", "Sem dica: o que significa 认识你很高兴?", "Prazer em conhecer você.", ["Prazer em conhecer você.", "Eu quero este.", "Não falo chinês.", "Quanto custa?"], {
    stimulus: "认识你很高兴",
    difficulty: 4,
  }),
];

const QUIZ_BY_LEVEL: Record<Experience, QuizQuestion[]> = {
  zero: [
    ...SUPPORTED_QUESTIONS,
    ...FOUNDATION_CHECK_QUESTIONS,
    ...REDUCED_HELP_QUESTIONS.slice(0, 3),
    ...NO_HELP_QUESTIONS.slice(0, 2),
    PHRASE_REASONING_QUESTIONS[0],
    SOUND_SPEECH_QUESTIONS[0],
    PRODUCTION_QUESTIONS[0],
    ...REDUCED_HELP_QUESTIONS.slice(3),
    ...NO_HELP_QUESTIONS.slice(2),
    ...PHRASE_REASONING_QUESTIONS.slice(1, 3),
    ...SOUND_SPEECH_QUESTIONS.slice(1, 3),
    ...PRODUCTION_QUESTIONS.slice(1, 2),
    ADVANCED_HANZI_QUESTIONS[0],
  ],
  words: [
    ...SUPPORTED_QUESTIONS.slice(0, 2),
    ...FOUNDATION_CHECK_QUESTIONS,
    ...REDUCED_HELP_QUESTIONS,
    ...NO_HELP_QUESTIONS,
    PRODUCTION_QUESTIONS[0],
    ...SOUND_SPEECH_QUESTIONS.slice(0, 3),
    ...PRODUCTION_QUESTIONS.slice(1, 2),
    ...PHRASE_REASONING_QUESTIONS,
    ...ADVANCED_HANZI_QUESTIONS.slice(0, 2),
  ],
  studied: [
    ...FOUNDATION_CHECK_QUESTIONS,
    ...REDUCED_HELP_QUESTIONS.slice(1),
    ...NO_HELP_QUESTIONS,
    ...PHRASE_REASONING_QUESTIONS.slice(0, 2),
    ...SOUND_SPEECH_QUESTIONS.slice(0, 2),
    ...PRODUCTION_QUESTIONS.slice(0, 3),
    ...PHRASE_REASONING_QUESTIONS.slice(2),
    ...SOUND_SPEECH_QUESTIONS.slice(2),
    ...ADVANCED_HANZI_QUESTIONS.slice(0, 4),
  ],
  phrases: [
    ...FOUNDATION_CHECK_QUESTIONS,
    ...REDUCED_HELP_QUESTIONS.slice(2),
    ...NO_HELP_QUESTIONS,
    ...PHRASE_REASONING_QUESTIONS,
    ...SOUND_SPEECH_QUESTIONS,
    ...PRODUCTION_QUESTIONS,
    ...ADVANCED_HANZI_QUESTIONS.slice(0, 4),
  ],
  advanced: [
    ...FOUNDATION_CHECK_QUESTIONS,
    ...REDUCED_HELP_QUESTIONS.slice(2),
    ...NO_HELP_QUESTIONS,
    ...PHRASE_REASONING_QUESTIONS,
    ...SOUND_SPEECH_QUESTIONS,
    ...PRODUCTION_QUESTIONS,
    ...ADVANCED_HANZI_QUESTIONS,
  ],
};

const MIN_QUIZ_QUESTIONS = 16;
const BASE_QUIZ_LENGTH: Record<Experience, number> = {
  zero: 16,
  words: 18,
  studied: 20,
  phrases: 22,
  advanced: 24,
};
const MAX_QUIZ_LENGTH: Record<Experience, number> = {
  zero: 22,
  words: 24,
  studied: 28,
  phrases: 30,
  advanced: 32,
};

const FOUNDATION_PROOF_LABELS: Record<string, string> = {
  "p1-o-que-e-mandarim": "mandarim como língua",
  "p1-o-que-e-pinyin": "pinyin como guia de som",
  "p1-o-que-e-tom": "tom como parte do significado",
  "p1-o-que-e-hanzi": "hànzì como escrita chinesa",
  "p1-engine-2-lab": "laboratório inicial de exercícios",
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "aluno";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "L";
}

function experienceScore(level: Experience): number {
  const score: Record<Experience, number> = {
    zero: 0,
    words: 1,
    studied: 2,
    phrases: 3,
    advanced: 4,
  };
  return score[level];
}

// Validação de alternativas (rule 6): descarta perguntas sem resposta, com a
// resposta fora das opções, com alternativas duplicadas ou com poucas opções.
// As perguntas estáticas já são válidas; isto é rede de segurança para edições
// futuras e mantém os índices estáveis (filtro determinístico por nível).
function normalizeQuizOption(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/[.。\s]+$/, "");
}

function isValidQuizQuestion(question: QuizQuestion): boolean {
  if (!question.answer?.trim()) return false;
  if (!question.skill || !question.category || !question.difficulty) return false;
  if (question.unlockWeight <= 0) return false;
  if (question.hasHint === question.noHint) return false;
  const options = question.options ?? [];
  if (options.length < 2) return false;
  if (options.some((option) => !option?.trim())) return false;
  const normalized = options.map(normalizeQuizOption);
  if (new Set(normalized).size !== normalized.length) return false;
  return normalized.includes(normalizeQuizOption(question.answer));
}

function adaptiveQuizSet(
  declaredLevel: Experience,
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>
): QuizQuestion[] {
  const all = QUIZ_BY_LEVEL[declaredLevel].filter(isValidQuizQuestion);
  const answeredCount = Object.keys(answers).length;
  const baseLength = Math.min(all.length, Math.max(MIN_QUIZ_QUESTIONS, BASE_QUIZ_LENGTH[declaredLevel]));
  const maxLength = Math.min(all.length, MAX_QUIZ_LENGTH[declaredLevel]);

  if (answeredCount < baseLength) return all.slice(0, baseLength);

  const currentLength = Math.min(maxLength, Math.max(baseLength, answeredCount));
  const currentQuestions = all.slice(0, currentLength);
  const metrics = scoreQuiz(currentQuestions, answers, hintedQuestions, declaredLevel);

  if (currentLength >= maxLength) return currentQuestions;
  if (shouldExtendQuiz(declaredLevel, metrics)) {
    return all.slice(0, currentLength + 1);
  }
  return currentQuestions;
}

function shouldExtendQuiz(declaredLevel: Experience, metrics: PlacementAnalysis): boolean {
  if (metrics.questionsAnswered < MIN_QUIZ_QUESTIONS) return true;
  if (metrics.essentialMissed.length > 0 || metrics.essentialHinted.length > 0) return false;
  if (declaredLevel === "zero" && (metrics.wrong >= 3 || metrics.noHintAccuracy < 0.78)) return false;
  if (metrics.hintCount >= 3 || metrics.wrong >= 4) return false;
  if (metrics.wrong >= 2 && metrics.noHintAccuracy < 0.75) return false;
  if (metrics.noHintAccuracy >= 0.78 && metrics.weightedAccuracy >= 0.72) return true;
  if (declaredLevel !== "zero" && metrics.correctWithoutHint >= 10 && metrics.categoriesWeak.length <= 2) return true;
  return false;
}

function quizDifficulty(question: QuizQuestion, declaredLevel: Experience): QuizDifficulty {
  if (question.difficulty) return question.difficulty;
  const liftedByDeclaredLevel = Math.min(1, experienceScore(declaredLevel));
  return clampDifficulty(CATEGORY_DIFFICULTY[question.category] + liftedByDeclaredLevel);
}

function isAdvancedProbe(question: QuizQuestion, declaredLevel: Experience): boolean {
  return quizDifficulty(question, declaredLevel) > experienceScore(declaredLevel) + 1;
}

function clampDifficulty(value: number): QuizDifficulty {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

function quizLayerLabel(question: QuizQuestion): string {
  const tier = assessmentTier(question);
  if (question.withClue) return "Com pista";
  if (tier === "A") return "Nível A · aquecimento";
  if (tier === "B") return "Nível B · sem ajuda";
  if (tier === "C") return "Nível C · frase nova";
  if (tier === "D") return "Nível D · áudio/tom";
  return "Nível E · produção guiada";
}

function assessmentTier(question: QuizQuestion): AssessmentTier {
  if (question.tier) return question.tier;
  if (question.layer === "supported" || question.layer === "reduced" || question.allowHints || question.withClue) return "A";
  if (question.layer === "production") return "E";
  if (question.layer === "soundSpeech" || question.category === "tone") return "D";
  if (question.layer === "sentenceReasoning" || question.category === "sentence" || question.category === "context") return "C";
  return "B";
}

function isStrongAssessment(question: QuizQuestion): boolean {
  return assessmentTier(question) !== "A";
}

function cleanStrongCategoryAnswer(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>,
  categories: QuizCategory[]
): boolean {
  return questions.some((question, index) => {
    if (!categories.includes(question.category) || !isStrongAssessment(question)) return false;
    return answers[index] === question.answer && !hintedQuestions[index];
  });
}

function cleanStrongAudioAnswer(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>
): boolean {
  return questions.some((question, index) => {
    if (!question.audioText || !isStrongAssessment(question)) return false;
    return answers[index] === question.answer && !hintedQuestions[index];
  });
}

function cleanQuestionAnswer(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>,
  questionId: string
): boolean {
  const index = questions.findIndex((question) => question.id === questionId);
  if (index < 0) return false;
  return answers[index] === questions[index].answer && !hintedQuestions[index];
}

function hasCleanTier(tierSummary: Record<AssessmentTier, QuizTierStat>, tier: AssessmentTier): boolean {
  return tierSummary[tier].correctWithoutHint > 0;
}

function firstRequiredFoundation(allowedFoundationLessonIds: string[]): string | undefined {
  const allowed = new Set(allowedFoundationLessonIds);
  return FOUNDATION_LESSON_IDS.find((lessonId) => !allowed.has(lessonId));
}

function foundationProofRows(proofByLessonId: Record<string, boolean>) {
  return FOUNDATION_LESSON_IDS.map((lessonId) => ({
    lessonId,
    label: FOUNDATION_PROOF_LABELS[lessonId] ?? lessonTitle(lessonId),
    proven: Boolean(proofByLessonId[lessonId]),
  }));
}

function analyzePlacement(
  declaredLevel: Experience,
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>
): PlacementAnalysis {
  const declaredScore = experienceScore(declaredLevel);
  const base = scoreQuiz(questions, answers, hintedQuestions, declaredLevel);
  const stats = categoryStats(questions, answers, hintedQuestions, declaredLevel);
  const noFundamentalErrors = base.essentialMissed.length === 0 && base.essentialHinted.length === 0;
  const hasMeaning = cleanStrongCategoryAnswer(questions, answers, hintedQuestions, ["meaning"]);
  const hasPinyin = cleanStrongCategoryAnswer(questions, answers, hintedQuestions, ["sound"]);
  const hasTone = cleanStrongCategoryAnswer(questions, answers, hintedQuestions, ["tone"]);
  const hasHanzi = cleanStrongCategoryAnswer(questions, answers, hintedQuestions, ["hanzi"]);
  const hasPhrase = cleanStrongCategoryAnswer(questions, answers, hintedQuestions, ["sentence", "context"]);
  const hasAudioOrTone = hasCleanTier(base.tierSummary, "D");
  const hasAudio = cleanStrongAudioAnswer(questions, answers, hintedQuestions);
  const hasProduction = hasCleanTier(base.tierSummary, "E");
  const hasStrongSpread = hasCleanTier(base.tierSummary, "B") && hasCleanTier(base.tierSummary, "C") && hasAudioOrTone && hasProduction;
  const hasRequiredSpread = hasMeaning && hasPinyin && hasTone && hasHanzi && hasPhrase && hasAudio && hasProduction;
  const hasAdvancedProof = hasRequiredSpread && hasAudio;
  const foundationProofByLessonId: Record<string, boolean> = {
    "p1-o-que-e-mandarim": cleanQuestionAnswer(questions, answers, hintedQuestions, "foundation-what-is-mandarin"),
    "p1-o-que-e-pinyin":
      cleanQuestionAnswer(questions, answers, hintedQuestions, "foundation-pinyin-role") &&
      cleanQuestionAnswer(questions, answers, hintedQuestions, "foundation-pinyin-vs-hanzi") &&
      hasPinyin,
    "p1-o-que-e-tom":
      cleanQuestionAnswer(questions, answers, hintedQuestions, "foundation-tone-role") &&
      hasTone,
    "p1-o-que-e-hanzi":
      cleanQuestionAnswer(questions, answers, hintedQuestions, "foundation-hanzi-role") &&
      cleanQuestionAnswer(questions, answers, hintedQuestions, "foundation-pinyin-vs-hanzi") &&
      hasHanzi,
    "p1-engine-2-lab":
      noFundamentalErrors &&
      hasMeaning &&
      hasPhrase &&
      hasProduction &&
      base.decisiveAccuracy >= 0.75,
  };
  const allowedFoundationLessonIds =
    declaredLevel === "zero"
      ? []
      : FOUNDATION_LESSON_IDS.filter((lessonId) => foundationProofByLessonId[lessonId]);
  const requiredFoundationLessonId = firstRequiredFoundation(allowedFoundationLessonIds);
  const manyHints = base.hintCount >= 3 || (base.questionsAnswered > 0 && base.hintCount / base.questionsAnswered > 0.22);
  const consistentSkip =
    noFundamentalErrors &&
    hasRequiredSpread &&
    hasStrongSpread &&
    base.decisiveAccuracy >= 0.85 &&
    base.noHintAccuracy >= 0.78 &&
    !manyHints;
  const excellentSkip =
    consistentSkip &&
    (declaredLevel !== "advanced" || hasAdvancedProof) &&
    base.decisiveAccuracy >= 0.9 &&
    base.noHintAccuracy >= 0.9 &&
    base.weightedAccuracy >= 0.8 &&
    base.advancedMisses === 0 &&
    base.hintCount === 0;
  const largeSkipAllowed =
    excellentSkip &&
    base.questionsAnswered >= 20 &&
    base.decisiveAccuracy > 0.9 &&
    hasAdvancedProof &&
    noFundamentalErrors;

  let level: PlacementLevel = "inicio";
  let label = "Primeiro contato";
  let targetLessonId = "p1-o-que-e-mandarim";
  let resultMessage = "Você vai começar do início para construir a base.";
  let canSkipContent = false;
  let maxSkipLessons = 0;

  if (declaredLevel === "zero") {
    level = excellentSkip ? "sobrevivencia" : "inicio";
    label = excellentSkip ? "Base compacta obrigatória" : "Primeiro contato";
    targetLessonId = "p1-o-que-e-mandarim";
    canSkipContent = false;
    resultMessage = excellentSkip
      ? "Você foi bem no teste rápido, mas marcou que nunca estudou mandarim. As aulas fundamentais continuam obrigatórias."
      : "Você vai começar pelos fundamentos: mandarim, pinyin, tom, hànzì e primeiros sons.";
  } else if (base.questionsAnswered < MIN_QUIZ_QUESTIONS || base.correctWithoutHint <= 4 || base.decisiveAccuracy < 0.45) {
    level = "inicio";
    resultMessage = "O teste ainda não mostrou evidência suficiente sem ajuda. Vamos construir a base com calma.";
  } else if (!hasPinyin || !hasTone || manyHints || !noFundamentalErrors) {
    level = "sobrevivencia";
    label = "Base guiada";
    targetLessonId = "l1";
    resultMessage = "Você reconheceu algumas palavras, mas ainda precisa revisar pinyin, tons e hànzì antes de pular.";
  } else if (!hasPhrase || !hasHanzi || !hasProduction || base.decisiveAccuracy < 0.72) {
    level = "tons";
    label = "Som e tons";
    targetLessonId = "l1";
    resultMessage = "Você demonstrou parte da base, mas ainda precisa firmar tons, pinyin, frases e hànzì básico.";
  } else if (consistentSkip) {
    if (declaredLevel === "words") {
      level = "tons";
      label = excellentSkip ? "Primeira fase compacta" : "Tons e ritmo";
      targetLessonId = "l5";
      canSkipContent = true;
      maxSkipLessons = 4;
      resultMessage = "Você demonstrou base suficiente para avançar um trecho da primeira fase, mantendo os fundamentos obrigatórios.";
    } else if (declaredLevel === "studied") {
      level = excellentSkip ? "frases" : "tons";
      label = excellentSkip ? "Um módulo adiante" : "Som e tons";
      targetLessonId = excellentSkip ? "l5" : "l1";
      canSkipContent = excellentSkip;
      maxSkipLessons = excellentSkip ? 4 : 0;
      resultMessage = excellentSkip
        ? "Você foi bem nos níveis decisivos e pode pular um módulo inicial, sem remover os fundamentos."
        : "Você já estudou um pouco, mas o teste ainda recomenda consolidar a base.";
    } else if (declaredLevel === "phrases") {
      level = largeSkipAllowed ? "frases" : "tons";
      label = largeSkipAllowed ? "Frases iniciais" : "Som e tons";
      targetLessonId = largeSkipAllowed ? "l14" : "l5";
      canSkipContent = true;
      maxSkipLessons = largeSkipAllowed ? 12 : 4;
      resultMessage = largeSkipAllowed
        ? "Você confirmou leitura, áudio, tons e produção em 20+ perguntas; o pulo maior foi liberado com cautela."
        : "Você lê algumas frases, mas o pulo ficou limitado porque pular dois módulos exige 20 perguntas e mais de 90%.";
    } else {
      if (!hasAdvancedProof) {
        level = "tons";
        label = "Base forte, pulo limitado";
        targetLessonId = "l1";
        canSkipContent = false;
        resultMessage = "Você foi bem em parte do teste, mas para pular fases precisa provar significado, pinyin, tom, hànzì, frase, áudio e produção sem dica.";
      } else {
        level = largeSkipAllowed ? "hanzi" : "frases";
        label = largeSkipAllowed ? "Hànzì lógico" : "Frases com hànzì básico";
        targetLessonId = largeSkipAllowed ? "l19" : "l5";
        canSkipContent = true;
        maxSkipLessons = largeSkipAllowed ? Number.POSITIVE_INFINITY : 4;
        resultMessage = largeSkipAllowed
          ? "Você confirmou significado, pinyin, tom, frase, áudio e produção sem dicas; parte da trilha pode ser pulada com segurança."
          : "Você tem base forte, mas o pulo grande exige 20 perguntas, mais de 90%, áudio/frase fortes e nenhum erro essencial.";
      }
    }
  } else {
    level = "sobrevivencia";
    label = "Base guiada";
    targetLessonId = "l1";
    resultMessage = "Você reconheceu algumas palavras, mas só respostas fortes em B, C, D e E liberam pulo de conteúdo.";
  }

  const desiredTargetLessonId = targetLessonId;
  if (requiredFoundationLessonId) {
    const blockedAt = lessonTitle(requiredFoundationLessonId);
    canSkipContent = false;
    maxSkipLessons = 0;
    targetLessonId = requiredFoundationLessonId;
    level = declaredLevel === "zero" ? "inicio" : "sobrevivencia";
    label = allowedFoundationLessonIds.length > 0 ? "Fundamentos seletivos" : "Base guiada";
    resultMessage =
      declaredLevel === "zero"
        ? "Como você declarou que nunca estudou mandarim, vamos começar pelos fundamentos mesmo quando algumas respostas saem corretas."
        : `${resultMessage} Antes de qualquer pulo maior, vamos passar por "${blockedAt}", porque fundamentos só são pulados com prova sem dica.`;
  }

  const foundationLessonIdsRequired = FOUNDATION_LESSON_IDS.filter(
    (lessonId) => !allowedFoundationLessonIds.includes(lessonId)
  );
  const skippedLessonIds = authorizedSkippedLessons(
    targetLessonId,
    canSkipContent,
    allowedFoundationLessonIds,
    maxSkipLessons
  );
  const decisionReasons = placementDecisionReasons({
    declaredLevel,
    base,
    desiredTargetLessonId,
    targetLessonId,
    allowedFoundationLessonIds,
    foundationLessonIdsRequired,
    canSkipContent,
    hasAdvancedProof,
    hasRequiredSpread,
    manyHints,
  });
  const placement: Omit<PlacementResult, "score" | "takenAt"> = {
    level,
    label,
    targetLessonId,
    skippedLessonIds,
    foundationLessonIdsRequired,
  };

  const performanceBand = base.noHintAccuracy < 0.45 ? 0 : base.noHintAccuracy < 0.7 ? 1 : base.noHintAccuracy < 0.85 ? 2 : 3;
  const consistencyGap = Math.abs(performanceBand - declaredScore);
  const consistency: PlacementAnalysis["consistency"] = consistencyGap === 0 ? "Alta" : consistencyGap === 1 ? "Média" : "Baixa";

  return {
    ...base,
    placement,
    consistency,
    resultMessage,
    skippedLessonIds,
    foundationLessonIdsRequired,
    foundationProofs: foundationProofRows(foundationProofByLessonId),
    decisionReasons,
    strengths: placementStrengths(stats),
    reinforcements: placementReinforcements(stats, base.hintCount),
  };
}

function categoryStats(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>,
  declaredLevel: Experience
): Record<QuizCategory, QuizCategoryStat> {
  const initial: Record<QuizCategory, QuizCategoryStat> = {
    meaning: emptyCategoryStat(),
    sound: emptyCategoryStat(),
    tone: emptyCategoryStat(),
    hanzi: emptyCategoryStat(),
    sentence: emptyCategoryStat(),
    context: emptyCategoryStat(),
    speaking: emptyCategoryStat(),
  };

  questions.forEach((question, index) => {
    if (!Object.prototype.hasOwnProperty.call(answers, index)) return;
    const stat = initial[question.category];
    stat.total += 1;
    const hinted = Boolean(hintedQuestions[index]);
    const correct = answers[index] === question.answer;
    if (hinted) stat.hints += 1;
    if (correct) {
      stat.correct += 1;
      if (hinted) stat.correctWithHint += 1;
      else stat.correctWithoutHint += 1;
      stat.score += quizPoint(question, hinted, declaredLevel);
    }
  });

  return initial;
}

function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>,
  declaredLevel: Experience
): PlacementAnalysis {
  const answered = questions
    .map((question, index) => ({ question, index, answer: answers[index], hinted: Boolean(hintedQuestions[index]) }))
    .filter((item) => Object.prototype.hasOwnProperty.call(answers, item.index));
  const questionsAnswered = answered.length;
  let correctWithoutHint = 0;
  let correctWithHint = 0;
  let weightedScore = 0;
  let weightedPossible = 0;
  const essentialMissed: string[] = [];
  const essentialHinted: string[] = [];
  const advancedProbes = answered.filter(({ question }) => isAdvancedProbe(question, declaredLevel));
  let advancedCorrect = 0;

  for (const { question, answer, hinted } of answered) {
    const correct = answer === question.answer;
    weightedPossible += question.unlockWeight;
    if (correct) {
      weightedScore += quizPoint(question, hinted, declaredLevel);
      if (hinted) correctWithHint += 1;
      else correctWithoutHint += 1;
      if (isAdvancedProbe(question, declaredLevel)) advancedCorrect += 1;
      if (question.essential && hinted) essentialHinted.push(essentialLabelForQuestion(question));
    } else if (question.essential) {
      essentialMissed.push(essentialLabelForQuestion(question));
    }
  }

  const uniqueEssentialMissed = [...new Set(essentialMissed)];
  const uniqueEssentialHinted = [...new Set(essentialHinted)];

  const wrong = questionsAnswered - correctWithoutHint - correctWithHint;
  const stats = categoryStats(questions, answers, hintedQuestions, declaredLevel);
  const tierSummary = tierStats(questions, answers, hintedQuestions);
  const decisiveQuestions = (["B", "C", "D", "E"] as AssessmentTier[]).reduce(
    (sum, tier) => sum + tierSummary[tier].total,
    0
  );
  const decisiveCorrect = (["B", "C", "D", "E"] as AssessmentTier[]).reduce(
    (sum, tier) => sum + tierSummary[tier].correctWithoutHint,
    0
  );
  const categoriesCorrect = Object.entries(stats)
    .filter(([, stat]) => categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  const categoriesWeak = Object.entries(stats)
    .filter(([, stat]) => stat.total > 0 && !categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  const weightedAccuracy = weightedPossible > 0 ? weightedScore / weightedPossible : 0;
  const noHintAccuracy = questionsAnswered > 0 ? correctWithoutHint / questionsAnswered : 0;
  const decisiveAccuracy = decisiveQuestions > 0 ? decisiveCorrect / decisiveQuestions : 0;
  const advancedMisses = advancedProbes.length - advancedCorrect;

  return {
    placement: { level: "inicio", label: "Primeiro contato", targetLessonId: "p1-o-que-e-mandarim" },
    score: Math.round(weightedAccuracy * 100),
    questionsAnswered,
    correctWithoutHint,
    correctWithHint,
    wrong,
    weightedScore,
    weightedPossible,
    weightedAccuracy,
    noHintAccuracy,
    adjustedCorrect: Math.round(weightedScore),
    decisiveQuestions,
    decisiveCorrect,
    decisiveAccuracy,
    tierSummary,
    hintCount: Object.values(hintedQuestions).filter(Boolean).length,
    categoriesCorrect,
    categoriesWeak,
    essentialMissed: uniqueEssentialMissed,
    essentialHinted: uniqueEssentialHinted,
    advancedProbes: advancedProbes.length,
    advancedMisses,
    advancedCorrect,
    resultMessage: "",
    skippedLessonIds: [],
    foundationLessonIdsRequired: [...FOUNDATION_LESSON_IDS],
    foundationProofs: FOUNDATION_LESSON_IDS.map((lessonId) => ({
      lessonId,
      label: FOUNDATION_PROOF_LABELS[lessonId] ?? lessonTitle(lessonId),
      proven: false,
    })),
    decisionReasons: [],
    consistency: "Baixa",
    strengths: [],
    reinforcements: [],
  };
}

function quizPoint(question: QuizQuestion, hinted: boolean, declaredLevel: Experience): number {
  const tier = assessmentTier(question);
  const weight = question.unlockWeight;
  if (tier === "A" || question.hasHint) return hinted ? Math.min(0.1, weight * 0.25) : Math.min(weight, 0.35);
  if (hinted) return 0;
  if (question.category === "speaking") return Math.min(weight, 0.55);
  if (question.withClue && isAdvancedProbe(question, declaredLevel)) return Math.min(weight, 0.75);
  return weight;
}

function emptyCategoryStat(): QuizCategoryStat {
  return { total: 0, correct: 0, correctWithoutHint: 0, correctWithHint: 0, hints: 0, score: 0 };
}

function emptyTierStat(): QuizTierStat {
  return { total: 0, correct: 0, correctWithoutHint: 0, hints: 0 };
}

function emptyTierSummary(): Record<AssessmentTier, QuizTierStat> {
  return {
    A: emptyTierStat(),
    B: emptyTierStat(),
    C: emptyTierStat(),
    D: emptyTierStat(),
    E: emptyTierStat(),
  };
}

function tierStats(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  hintedQuestions: Record<number, boolean>
): Record<AssessmentTier, QuizTierStat> {
  const summary = emptyTierSummary();
  questions.forEach((question, index) => {
    if (!Object.prototype.hasOwnProperty.call(answers, index)) return;
    const tier = assessmentTier(question);
    const stat = summary[tier];
    const hinted = Boolean(hintedQuestions[index]);
    const correct = answers[index] === question.answer;
    stat.total += 1;
    if (hinted) stat.hints += 1;
    if (!correct) return;
    stat.correct += 1;
    if (!hinted) stat.correctWithoutHint += 1;
  });
  return summary;
}

function essentialLabelForQuestion(question: QuizQuestion): string {
  return question.essentialItem ? ESSENTIAL_PLACEMENT_ITEMS[question.essentialItem] : question.id;
}

function categoryMastered(stat: QuizCategoryStat): boolean {
  return stat.total > 0 && stat.correctWithoutHint > 0 && stat.correct === stat.total && stat.hints === 0;
}

function placementDecisionReasons({
  declaredLevel,
  base,
  desiredTargetLessonId,
  targetLessonId,
  allowedFoundationLessonIds,
  foundationLessonIdsRequired,
  canSkipContent,
  hasAdvancedProof,
  hasRequiredSpread,
  manyHints,
}: {
  declaredLevel: Experience;
  base: PlacementAnalysis;
  desiredTargetLessonId: string;
  targetLessonId: string;
  allowedFoundationLessonIds: string[];
  foundationLessonIdsRequired: string[];
  canSkipContent: boolean;
  hasAdvancedProof: boolean;
  hasRequiredSpread: boolean;
  manyHints: boolean;
}): string[] {
  const reasons: string[] = [];
  reasons.push(`Nível declarado: ${declaredLevelLabel(declaredLevel)}.`);
  reasons.push(
    `${base.decisiveCorrect}/${base.decisiveQuestions} respostas decisivas (camadas B-E) foram corretas sem dica.`
  );
  if (base.correctWithHint > 0 || base.hintCount > 0) {
    reasons.push("Acertos com dica entraram como sondagem e ensino, com peso baixo para pular conteúdo.");
  }
  if (declaredLevel === "zero") {
    reasons.push("Quem declara nunca ter estudado não pula os fundamentos no primeiro acesso.");
  } else if (foundationLessonIdsRequired.length > 0) {
    reasons.push(
      `Fundamentos ainda obrigatórios: ${foundationLessonIdsRequired.map(lessonTitle).join(", ")}.`
    );
  } else {
    reasons.push("Os fundamentos foram comprovados sem dica.");
  }
  if (desiredTargetLessonId !== targetLessonId) {
    reasons.push(`O pulo maior foi travado antes de "${lessonTitle(targetLessonId)}".`);
  } else if (canSkipContent) {
    reasons.push(`Pulo de conteúdo limitado e autorizado até "${lessonTitle(targetLessonId)}".`);
  } else {
    reasons.push("Sem evidência suficiente para pular conteúdo além do que foi comprovado.");
  }
  if (manyHints) reasons.push("Uso alto de dicas reduziu o teto de posicionamento.");
  if (declaredLevel === "advanced" && !hasAdvancedProof) {
    reasons.push("Avançado precisa provar significado, pinyin, tom, hànzì, frase, áudio e produção sem dica.");
  } else if (!hasRequiredSpread) {
    reasons.push("Pulo maior exige cobertura sem dica em significado, pinyin, tom, hànzì, frase, áudio e produção.");
  }
  if (allowedFoundationLessonIds.length > 0 && foundationLessonIdsRequired.length > 0) {
    reasons.push(`${allowedFoundationLessonIds.length} fundamento(s) comprovado(s) foram respeitados.`);
  }
  return [...new Set(reasons)].slice(0, 7);
}

function authorizedSkippedLessons(
  targetLessonId: string,
  canSkipContent: boolean,
  allowedFoundationLessonIds: string[],
  maxSkipLessons = Number.POSITIVE_INFINITY
): string[] {
  if (!canSkipContent && allowedFoundationLessonIds.length === 0) return [];
  const targetIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === targetLessonId);
  if (targetIndex <= 0) return [];
  const allowedFoundation = new Set(allowedFoundationLessonIds);
  const skipped: string[] = [];
  let contentSkipped = 0;

  for (const lesson of ALL_LESSONS.slice(0, targetIndex)) {
    if (lesson.premium) continue;
    const isFoundation = FOUNDATION_LESSON_IDS.includes(lesson.id);
    if (isFoundation) {
      if (allowedFoundation.has(lesson.id)) skipped.push(lesson.id);
      continue;
    }
    if (!canSkipContent || contentSkipped >= maxSkipLessons) continue;
    skipped.push(lesson.id);
    contentSkipped += 1;
  }

  return skipped;
}

function placementStrengths(stats: Record<QuizCategory, QuizCategoryStat>): string[] {
  const strengths = Object.entries(stats)
    .filter(([, stat]) => categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  return strengths.length ? strengths.slice(0, 3) : ["Disposição para testar e aprender"];
}

function placementReinforcements(
  stats: Record<QuizCategory, QuizCategoryStat>,
  hintCount: number
): string[] {
  const reinforcements = Object.entries(stats)
    .filter(([, stat]) => stat.total > 0 && !categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  if (hintCount >= 3) reinforcements.unshift("Responder sem depender de dicas");
  return [...new Set(reinforcements)].slice(0, 4);
}

function declaredLevelLabel(level: Experience): string {
  const labels: Record<Experience, string> = {
    zero: "Nunca estudei",
    words: "Algumas palavras",
    studied: "Já estudei o básico",
    phrases: "Leio pinyin e frases simples",
    advanced: "Hànzì e tons básicos",
  };
  return labels[level];
}

function levelCopy(level: PlacementLevel): string {
  const copy: Record<PlacementLevel, string> = {
    inicio: "Você está começando do zero. Vamos construir som, fala e reconhecimento com calma.",
    sobrevivencia: "Você já teve algum contato com o mandarim. Vamos firmar sons, cortesia e primeiras respostas antes de avançar.",
    tons: "Você reconhece o básico. Agora o foco é afinar tons e ritmo para evitar lacunas.",
    frases: "Você já acompanha frases curtas, mas ainda deve revisar tons e hànzì básicos.",
    hanzi: "Você mostrou base forte. Vamos liberar fases iniciais e manter revisão essencial no caminho.",
  };
  return copy[level];
}

// Onde o aluno entra na jornada (fase + módulo), para o resultado explicar o
// ponto de partida em vez de só citar uma lição.
function entryPointForLesson(lessonId: string): { phaseTitle: string; unitTitle: string } | undefined {
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      if (unit.lessons.some((lesson) => lesson.id === lessonId)) {
        return { phaseTitle: phase.title, unitTitle: unit.title };
      }
    }
  }
  return undefined;
}

// Próximas lições (gratuitas) a partir do ponto de entrada — o caminho recomendado.
function recommendedFrom(targetLessonId: string, count = 3): Lesson[] {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === targetLessonId);
  if (index < 0) return [];
  return ALL_LESSONS.slice(index).filter((lesson) => !lesson.premium).slice(0, count);
}

function lessonTitle(lessonId: string): string {
  return ALL_LESSONS.find((lesson) => lesson.id === lessonId)?.title ?? lessonId;
}

function lessonsByIds(ids: readonly string[]): Array<(typeof ALL_LESSONS)[number]> {
  const lessons: Array<(typeof ALL_LESSONS)[number]> = [];
  for (const id of ids) {
    const lesson = ALL_LESSONS.find((candidate) => candidate.id === id);
    if (lesson) lessons.push(lesson);
  }
  return lessons;
}

type AccountStatusTone = "muted" | "accent" | "good" | "gold";
type AccountStateId = "local_profile" | "cloud_pending" | "account_synced";
// Estado/segurança da assinatura vivem em lib/subscription (fonte única, pronta
// para o backend). Aqui só reusamos o tipo para os rótulos de UI abaixo.
type ProStateId = SubscriptionState;

// Como o perfil comunica o estado da conta (rótulos variam se o backend Supabase estiver ativo).
function getAccountStatus(authMode: AuthMode): {
  label: string;
  tone: AccountStatusTone;
  blurb: string;
  state: AccountStateId;
} {
  const cloudBackend = isSupabaseBackendEnabled();

  if (authMode === "local") {
    return {
      label: "Conta local",
      tone: "accent",
      state: "local_profile",
      blurb: cloudBackend
        ? "Conta só neste dispositivo. Crie uma conta com email para salvar o progresso na nuvem."
        : "Conta local neste dispositivo. Seu progresso pode ser perdido se limpar o navegador.",
    };
  }

  if (authMode === "cloud_pending") {
    return cloudBackend
      ? {
          label: "Entrar na conta",
          tone: "accent",
          state: "cloud_pending",
          blurb: "Seu email já está registrado. Entre com a senha para ativar o salvamento automático na nuvem.",
        }
      : {
          label: "Sincronização em breve",
          tone: "accent",
          state: "cloud_pending",
          blurb: "Seu perfil está salvo neste dispositivo. Em breve será possível sincronizar a conta.",
        };
  }

  return {
    label: "Conta na nuvem",
    tone: "good",
    state: "account_synced",
    blurb: "Sessão ativa. Seu progresso é salvo automaticamente na sua conta.",
  };
}

import { getAccountFreeBenefitLines, getAccountProBenefitLines } from "../../data/planFeatures";

const PRO_STATUS: Record<ProStateId, { label: string; tone: AccountStatusTone; blurb: string }> = {
  not_subscriber: {
    label: "Gratuito",
    tone: "muted",
    blurb: "Você está usando o Longyu gratuito. O Longyu Pro ficará disponível no lançamento.",
  },
  local_preview: {
    label: "Longyu Pro",
    tone: "gold",
    blurb: "Recursos do Longyu Pro liberados.",
  },
  real_active: {
    label: "Longyu Pro ativo",
    tone: "accent",
    blurb: "Assinatura ativa.",
  },
  real_canceled: {
    label: "Pro cancelado",
    tone: "accent",
    blurb: "Assinatura cancelada.",
  },
  real_expired: {
    label: "Pro expirado",
    tone: "muted",
    blurb: "Assinatura expirada.",
  },
};

// Enquanto contas antigas não têm authMode, derivamos pelo email (defensivo).
const ACCOUNT_PRO_BENEFITS = getAccountProBenefitLines();

function accountAuthMode(account?: LearningAccount): AuthMode {
  return account?.authMode ?? (account?.email ? "cloud_pending" : "local");
}

export function AccountPage() {
  const navigate = useNavigate();
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const completedLessons = useStore((s) => s.completedLessons);
  const points = useStore((s) => s.points);
  const xpTotal = useStore((s) => s.xpTotal);
  const xpToday = useStore((s) => s.getTodayXp());
  const weeklyXp = useStore((s) => s.getWeeklyXp());
  const dailyEnergy = useStore((s) => s.getActiveDailyEnergy());
  const dragonPearls = useStore((s) => s.dragonPearls);
  const streakShields = useStore((s) => s.streakShields);
  const streak = useStore((s) => s.streak);
  const longestStreak = useStore((s) => s.longestStreak);
  const learnedChars = useStore((s) => s.learnedChars);
  const learnedChunks = useStore((s) => s.learnedChunks);
  const srs = useStore((s) => s.srs);
  const today = useStore((s) => s.today);
  const dailyTasks = useStore((s) => s.dailyTasks);
  const chests = useStore((s) => s.chests);
  const medals = useStore((s) => s.medals ?? []);
  const rewardHistory = useStore((s) => s.rewardHistory);
  /** Preview local — alimenta o estado da assinatura (subscriptionStateFor). */
  const isPremium = useStore((s) => s.isPremium);
  /** Pro efetivo (servidor OU preview) — usado para exibir benefícios ativos. */
  const isProEffective = useIsPro();
  const placement = useStore((s) => s.placement);
  const createAccount = useStore((s) => s.createAccount);
  const createCloudAccountDraft = useStore((s) => s.createCloudAccountDraft);
  const finishLocalOnboarding = useStore((s) => s.finishLocalOnboarding);
  const attachEmailToLocalAccount = useStore((s) => s.attachEmailToLocalAccount);
  const syncAccountWithCloudAuth = useStore((s) => s.syncAccountWithCloudAuth);
  const endCloudSession = useStore((s) => s.endCloudSession);
  const setServerEntitlement = useStore((s) => s.setServerEntitlement);
  const switchAccount = useStore((s) => s.switchAccount);
  const { signOut: signOutCloud, canSignOut } = useCloudSignOut();
  const { signIn: signInCloud } = useCloudSignIn();
  const claimReward = useStore((s) => s.claimReward);
  const soundEffects = useStore((s) => s.soundEffects);

  const accountList = useMemo(
    () => Object.values(accounts ?? {}).sort((a, b) => b.updatedAt - a.updatedAt),
    [accounts]
  );
  const achievementSnapshot = useAchievementSnapshot();
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked ?? {});
  // Resumo de conquistas: desbloqueadas recentes primeiro, depois as mais próximas.
  const achievementSummary = useMemo(() => {
    const views = ACHIEVEMENTS.map((def) => {
      const { current, target } = def.progress(achievementSnapshot);
      return { def, current, target, unlockedAt: achievementsUnlocked[def.id] };
    });
    const unlockedViews = views
      .filter((view) => view.unlockedAt)
      .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));
    const lockedViews = views
      .filter((view) => !view.unlockedAt)
      .sort((a, b) => b.current / b.target - a.current / a.target);
    return {
      total: views.length,
      unlockedCount: unlockedViews.length,
      highlights: [...unlockedViews, ...lockedViews].slice(0, 4),
    };
  }, [achievementSnapshot, achievementsUnlocked]);
  const activeAccount = accounts?.[currentAccountId] ?? accountList[0];
  const accountToolsRef = useRef<HTMLDivElement>(null);
  const accountProfileRef = useRef<HTMLElement>(null);
  const proAccountRef = useRef<HTMLElement>(null);
  const securityAccountRef = useRef<HTMLElement>(null);
  const dataAccountRef = useRef<HTMLElement>(null);
  const signOutAccountRef = useRef<HTMLElement>(null);
  // Alvo do card "Perfil" no hub: as estatísticas detalhadas mais abaixo.
  const profileDetailsRef = useRef<HTMLElement>(null);
  const mobileProfileRef = useRef<HTMLElement>(null);

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [source, setSource] = useState<string>();
  const [reason, setReason] = useState<string>();
  const [experience, setExperience] = useState<Experience>();
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPicked, setQuizPicked] = useState<string>();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hintedQuestions, setHintedQuestions] = useState<Record<number, boolean>>({});
  const [finalChoice, setFinalChoice] = useState<"recommended" | "scratch">();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [isFinishingOnboarding, setIsFinishingOnboarding] = useState(false);
  const [showCloudPrompt, setShowCloudPrompt] = useState(false);
  const [reportPaywallOpen, setReportPaywallOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [cancelPlanNotice, setCancelPlanNotice] = useState<string | null>(null);
  const [serverSubscription, setServerSubscription] = useState<ServerSubscriptionSnapshot | null>(null);

  useEffect(() => {
    const mode = accountAuthMode(accounts?.[currentAccountId] ?? accountList[0]);
    if (!isSupabaseBackendEnabled() || mode !== "cloud") {
      setServerSubscription(null);
      return;
    }
    void getSubscription().then((result) => setServerSubscription(result.data ?? null));
  }, [accounts, currentAccountId, accountList]);

  const declaredExperience = experience ?? "zero";
  const quizSet = adaptiveQuizSet(declaredExperience, answers, hintedQuestions);
  const placementAnalysis = analyzePlacement(declaredExperience, quizSet, answers, hintedQuestions);
  const onboardingRewardQi = 20 + Math.round(placementAnalysis.weightedScore * 3);
  const recommendedResult: PlacementResult = {
    ...placementAnalysis.placement,
    score: placementAnalysis.score,
    questionsAnswered: placementAnalysis.questionsAnswered,
    correctWithoutHint: placementAnalysis.correctWithoutHint,
    correctWithHint: placementAnalysis.correctWithHint,
    wrong: placementAnalysis.wrong,
    hintsUsed: placementAnalysis.hintCount,
    categoriesCorrect: placementAnalysis.categoriesCorrect,
    categoriesWeak: placementAnalysis.categoriesWeak,
    takenAt: Date.now(),
  };
  const scratchResult: PlacementResult = {
    level: "inicio",
    label: "Primeiro contato",
    // "Começar do zero" aponta para a primeira lição de todas, então nenhuma
    // atividade é marcada como concluída — o aluno realmente começa do início.
    targetLessonId: ALL_LESSONS[0]?.id ?? "l1",
    skippedLessonIds: [],
    foundationLessonIdsRequired: [...FOUNDATION_LESSON_IDS],
    score: 0,
    questionsAnswered: placementAnalysis.questionsAnswered,
    correctWithoutHint: placementAnalysis.correctWithoutHint,
    correctWithHint: placementAnalysis.correctWithHint,
    wrong: placementAnalysis.wrong,
    hintsUsed: placementAnalysis.hintCount,
    categoriesCorrect: placementAnalysis.categoriesCorrect,
    categoriesWeak: placementAnalysis.categoriesWeak,
    takenAt: recommendedResult.takenAt,
  };
  const result = finalChoice === "scratch" ? scratchResult : recommendedResult;
  const recommendedTargetLesson = ALL_LESSONS.find((lesson) => lesson.id === recommendedResult.targetLessonId);
  const skippedLessons = finalChoice === "scratch" ? [] : placementAnalysis.skippedLessonIds;
  const recommendedEntryPoint = entryPointForLesson(recommendedResult.targetLessonId);
  const dashboard = useMemo(
    () => buildProfileDashboard({
      completedLessons,
      points,
      xpTotal,
      xpToday,
      weeklyXp,
      charges: dailyEnergy.charges,
      maxCharges: dailyEnergy.maxCharges,
      isPremium: isProEffective,
      dragonPearls,
      streakShields,
      streak,
      longestStreak,
      learnedChars,
      learnedChunks,
      srs,
      today,
      dailyTasks,
      rewardHistory,
    }),
    [
      completedLessons,
      dailyEnergy.charges,
      dailyEnergy.maxCharges,
      dailyTasks,
      dragonPearls,
      isProEffective,
      learnedChars,
      learnedChunks,
      longestStreak,
      points,
      rewardHistory,
      srs,
      streak,
      streakShields,
      today,
      weeklyXp,
      xpToday,
      xpTotal,
    ]
  );
  const closedChestCount = (chests.small ?? 0) + (chests.dragon ?? 0) + (chests.monthly ?? 0);
  const todayMinutes = today.som + today.fala + today.hanzi + today.leitura;
  const placementTargetLesson = placement ? ALL_LESSONS.find((lesson) => lesson.id === placement.targetLessonId) : undefined;

  function nextStep() {
    if (step === "level") {
      playSoundFx("tap", soundEffects);
      setAnswers({});
      setHintedQuestions({});
      setQuizIndex(0);
      setQuizPicked(undefined);
      setFinalChoice(undefined);
      setStep("quiz");
      return;
    }

    const current = ONBOARDING_STEPS.indexOf(step);
    const next = ONBOARDING_STEPS[current + 1];
    if (next) {
      playSoundFx("tap", soundEffects);
      setStep(next);
    }
  }

  function prevStep() {
    const current = ONBOARDING_STEPS.indexOf(step);
    const previous = ONBOARDING_STEPS[current - 1];
    if (previous) setStep(previous);
  }

  function finishQuizQuestion() {
    if (!quizPicked) return;
    playSoundFx("tap", soundEffects);
    const nextAnswers = { ...answers, [quizIndex]: quizPicked };
    const nextQuizSet = adaptiveQuizSet(declaredExperience, nextAnswers, hintedQuestions);
    setAnswers(nextAnswers);
    setQuizPicked(undefined);
    if (quizIndex + 1 >= nextQuizSet.length) setStep("result");
    else setQuizIndex((index) => index + 1);
  }

  function chooseFinalPlacement(choice: "recommended" | "scratch") {
    setFinalChoice(choice);
    playSoundFx("tap", soundEffects);
    setStep("account");
  }

  function markQuizHintUsed(index: number) {
    setHintedQuestions((current) => current[index] ? current : { ...current, [index]: true });
  }

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    if (isFinishingOnboarding || name.trim().length < 2) return;
    if (!canRegisterWithCredentials(email, password, passwordConfirm)) {
      setAccountError(
        isSupabaseBackendEnabled()
          ? "Preencha email, senha e confirmação para criar sua conta."
          : "Preencha email, senha e confirmação para preparar uma conta agora."
      );
      return;
    }
    setIsFinishingOnboarding(true);
    if (isSupabaseBackendEnabled()) {
      const authResult = await createAuthAccount(email, password, firstName(name));
      if (authResult.status === "error") {
        setAccountError(authResult.message);
        setIsFinishingOnboarding(false);
        return;
      }
      createCloudAccountDraft(firstName(name), email, result);
      if (authResult.status === "ok") {
        syncAccountWithCloudAuth(email);
        const syncResult = await syncAuthSessionProgress();
        if (syncResult.ok) setAccountNotice("Conta criada e progresso sincronizado na nuvem.");
      }
      claimOnboardingReward();
      playSoundFx("lessonComplete", soundEffects);
      navigate("/");
      return;
    }
    // Autenticação real virá no backend. A senha é validada só em memória (nunca
    // persistida): passamos apenas nome + email; o placement é aplicado na store.
    createCloudAccountDraft(firstName(name), email, result);
    claimOnboardingReward();
    playSoundFx("lessonComplete", soundEffects);
    navigate("/");
  }

  function handleSkipAccount() {
    if (isFinishingOnboarding || name.trim().length < 2) return;
    setIsFinishingOnboarding(true);
    // Conta é opcional: segue como perfil local neste dispositivo, com o nome informado.
    finishLocalOnboarding(firstName(name), result);
    claimOnboardingReward();
    playSoundFx("lessonComplete", soundEffects);
    navigate("/");
  }

  async function handleAttachEmail(event: FormEvent) {
    event.preventDefault();
    if (!canRegisterWithCredentials(email, password, passwordConfirm)) {
      setAccountError(
        isSupabaseBackendEnabled()
          ? "Use um email válido e uma senha de pelo menos 6 caracteres."
          : "Use um email válido e uma senha de pelo menos 6 caracteres para preparar a conta (a senha não é salva)."
      );
      return;
    }
    const accountName = activeAccount?.name ?? "Aluno Longyu";
    if (isSupabaseBackendEnabled()) {
      const authResult = await createAuthAccount(email, password, accountName);
      if (authResult.status === "error") {
        setAccountError(authResult.message);
        return;
      }
      attachEmailToLocalAccount(email);
      if (authResult.status === "ok") {
        syncAccountWithCloudAuth(email);
        const syncResult = await syncAuthSessionProgress();
        setAccountNotice(
          syncResult.ok
            ? `${authResult.message} Progresso sincronizado na nuvem.`
            : `${authResult.message} Seu progresso continua neste dispositivo até você migrar.`
        );
      } else {
        setAccountNotice(authResult.message);
      }
    } else {
      // Senha descartada: só o email é anexado, e o perfil passa a "cloud_pending".
      attachEmailToLocalAccount(email);
      setAccountNotice("Conta preparada neste dispositivo. Em breve será possível sincronizar seu progresso.");
    }
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setAccountError(null);
    setShowCloudPrompt(false);
  }

  function claimOnboardingReward() {
    claimReward({
      id: "onboarding:welcome:qi",
      type: "qi",
      amount: onboardingRewardQi,
      source: "Boas-vindas ao Longyu",
    });
  }

  function handleCreateProfile(event: FormEvent) {
    event.preventDefault();
    if (newProfileName.trim().length < 2) return;
    createAccount(newProfileName);
    setNewProfileName("");
    navigate("/conta");
  }

  function openCreateAccountPreparation() {
    setShowCloudPrompt(true);
    setAccountNotice(
      isSupabaseBackendEnabled()
        ? "Crie sua conta com email e senha. O progresso passa a salvar na nuvem automaticamente."
        : "Este fluxo prepara sua conta neste dispositivo. Nada é enviado e nenhuma senha é salva."
    );
    accountToolsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function downloadLocalProgress(kind: "export" | "backup") {
    const snapshot = activeLearningRepository().exportSnapshot();
    const validation = validateProgressSnapshot(snapshot);
    if (!validation.ok) {
      setDataNotice("Nenhum perfil local encontrado para exportar.");
      return;
    }

    const payload = { kind, ...snapshot };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date(snapshot.exportedAt).toISOString().slice(0, 10);
    link.href = url;
    link.download = `longyu-${kind === "backup" ? "backup" : "progresso"}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDataNotice(
      kind === "backup"
        ? "Backup local gerado como arquivo JSON neste dispositivo."
        : "Exportação de progresso gerada como arquivo JSON neste dispositivo."
    );
  }

  async function downloadPrivacyBundle() {
    const bundle = await buildPrivacyExportBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `longyu-lgpd-${bundle.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDataNotice("Pacote LGPD exportado como JSON neste dispositivo.");
  }

  async function handleRequestAccountDeletion() {
    const result = await requestAccountDeletion();
    setDataNotice(result.message);
    if (result.ok) {
      endCloudSession();
      setServerEntitlement(false);
    }
  }

  async function handleCloudSignIn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const form = event ? new FormData(event.currentTarget) : null;
    const formEmail = String(form?.get("email") ?? email).trim();
    const formPassword = String(form?.get("password") ?? password);
    setEmail(formEmail);
    setPassword(formPassword);
    setAccountError(null);
    const result = await signInCloud(formEmail, formPassword);
    if (!result.ok) {
      setAccountError(result.message);
      return;
    }
    setAccountNotice(result.message);
    setPassword("");
    setAccountError(null);
  }

  async function handleCloudSignOut() {
    const notice = await signOutCloud();
    if (notice) setAccountNotice(notice);
  }

  function handleEraseLocalData() {
    setDataNotice("Apagar dados locais exigirá confirmação segura. Nenhum dado foi apagado agora.");
  }

  // Gerenciar/cancelar passam pela interface lib/subscription. Sem backend, ela
  // só devolve uma mensagem informativa e NUNCA altera isPremium nem finge
  // pagamento/cancelamento.
  function handleManageSubscription() {
    void openBillingPortal().then((result) => {
      setCancelPlanNotice(result.message);
      if (result.data?.url) window.location.assign(result.data.url);
    });
  }

  function handleCancelPlan() {
    void cancelSubscription().then((result) => {
      setCancelPlanNotice(result.message);
      if (result.data?.url) window.location.assign(result.data.url);
    });
  }

  if (!accountSetupComplete) {
    return (
      <OnboardingShell
        step={step}
        canGoBack={step !== "welcome"}
        onBack={prevStep}
        footer={step === "account" || step === "welcome" || step === "result" ? undefined : (
          <OnboardingFooter
            disabled={!canContinue(step, { source, reason, experience, quizPicked, name })}
            label={footerLabel(step)}
            onClick={() => {
              if (step === "quiz") finishQuizQuestion();
              else nextStep();
            }}
          />
        )}
      >
        {step === "welcome" && (
          <WelcomeStep onStart={() => setStep("name")} />
        )}

        {step === "source" && (
          <QuestionStep
            prompt="Como você conheceu o Longyu?"
            choices={SOURCE_OPTIONS}
            value={source}
            onPick={setSource}
          />
        )}

        {step === "reason" && (
          <QuestionStep
            prompt="Por que você quer aprender mandarim?"
            choices={REASON_OPTIONS}
            value={reason}
            onPick={setReason}
          />
        )}

        {step === "level" && (
          <QuestionStep
            prompt="Quanto mandarim você já sabe?"
            choices={EXPERIENCE_OPTIONS}
            value={experience}
            onPick={setExperience}
          />
        )}

        {step === "quiz" && (
          <QuizStep
            index={quizIndex}
            total={quizSet.length}
            question={quizSet[quizIndex]}
            declaredLevel={experience ?? "zero"}
            picked={quizPicked}
            onPick={setQuizPicked}
            onSubmit={finishQuizQuestion}
            onUseHint={() => markQuizHintUsed(quizIndex)}
          />
        )}

        {step === "result" && (
          <PlacementResultStep
            result={recommendedResult}
            targetLesson={recommendedTargetLesson}
            entryPoint={recommendedEntryPoint}
            analysis={placementAnalysis}
            declaredLevel={experience ?? "zero"}
            rewardQi={onboardingRewardQi}
            skippedCount={skippedLessons.length}
            recommendedLessons={recommendedFrom(recommendedResult.targetLessonId)}
            onFollowRecommended={() => chooseFinalPlacement("recommended")}
            onStartScratch={() => chooseFinalPlacement("scratch")}
          />
        )}

        {step === "name" && (
          <NameStep
            name={name}
            onName={(value) => {
              setName(value);
              setAccountError(null);
            }}
          />
        )}

        {step === "account" && (
          <OptionalAccountStep
            name={name}
            email={email}
            password={password}
            passwordConfirm={passwordConfirm}
            error={accountError}
            onEmail={(value) => {
              setEmail(value);
              setAccountError(null);
            }}
            onPassword={(value) => {
              setPassword(value);
              setAccountError(null);
            }}
            onPasswordConfirm={(value) => {
              setPasswordConfirm(value);
              setAccountError(null);
            }}
            onSubmit={handleCreateAccount}
            onSkip={handleSkipAccount}
            disabled={isFinishingOnboarding}
          />
        )}
      </OnboardingShell>
    );
  }

  const authMode = accountAuthMode(activeAccount);
  const status = getAccountStatus(authMode);

  useEffect(() => {
    if (activeAccount?.email && authMode === "cloud_pending" && !email) {
      setEmail(activeAccount.email);
    }
  }, [activeAccount?.email, authMode, email]);

  useEffect(() => {
    if (!isSupabaseBackendEnabled() || authMode !== "cloud_pending") return;
    void restoreCloudSessionIfPresent().then((result) => {
      if (result.ok) {
        setAccountNotice("Sessão restaurada. Seu progresso sincroniza automaticamente na nuvem.");
      }
    });
  }, [authMode]);
  const proState = subscriptionStateFor(isPremium, serverSubscription);
  const proStatus = PRO_STATUS[proState];
  const canAttachEmail = canRegisterWithCredentials(email, password, passwordConfirm);
  const mobileMenuSections: MobileMenuSectionData[] = [
    {
      title: "Conta",
      items: [
        {
          title: "Perfil",
          desc: status.label,
          icon: IconUser,
          badge: status.state === "local_profile" ? "Local" : undefined,
          onClick: () => accountProfileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        },
        {
          title: "Pro",
          desc: proStatus.label,
          icon: IconStar,
          badge: proState === "local_preview" ? "Pro" : undefined,
          featured: proState === "not_subscriber",
          onClick: () => proAccountRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        },
        {
          title: "Progresso",
          desc: "XP, tempo e repertório.",
          icon: IconTarget,
          onClick: () => mobileProfileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        },
        {
          title: "Segurança",
          desc: "Conta e assinatura.",
          icon: IconShield,
          onClick: () => securityAccountRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        },
        {
          title: "Dados",
          desc: "Exportar, backup e perfis.",
          icon: IconBook,
          onClick: () => dataAccountRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        },
        {
          title: "Sair",
          desc: canSignOut ? "Encerrar sessão na nuvem." : "Sem sessão ativa.",
          icon: IconRefresh,
          onClick: () => {
            if (canSignOut) void handleCloudSignOut();
            else signOutAccountRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          },
        },
      ],
    },
    {
      title: "Praticar",
      items: [
        {
          title: "Pinyin Lab",
          desc: "Som, acento e tons.",
          icon: IconSound,
          badge: isProEffective ? "Pro" : "Cargas",
          featured: true,
          onClick: () => navigate("/pinyin"),
        },
        {
          title: "Revisão",
          desc: "Erros recentes e SRS.",
          icon: IconRefresh,
          onClick: () => navigate("/revisao"),
        },
      ],
    },
  ];
  const mobileStats = [
    { label: "XP hoje", value: xpToday, icon: <IconTarget width={18} height={18} /> },
    { label: "Tempo hoje", value: formatMinutes(todayMinutes), icon: <IconFlame width={18} height={18} /> },
    { label: "Lições", value: completedLessons.length, icon: <IconCheck width={18} height={18} /> },
    { label: "Caracteres", value: learnedChars.length, icon: <IconHanzi width={18} height={18} /> },
    { label: "Chunks", value: learnedChunks.length, icon: <IconChat width={18} height={18} /> },
  ];

  return (
    <HubPage className="space-y-5">
      {canSignOut && (
        <div className="flex flex-col gap-3 rounded-2xl border border-good/25 bg-good-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Pill tone="good">Conta ativa na nuvem</Pill>
            <p className="mt-1 text-sm text-ink-soft">Seu progresso salva automaticamente — não precisa sincronizar manualmente.</p>
          </div>
          <Button variant="outline" className="border-wrong/30 text-wrong hover:bg-wrong-soft" onClick={() => void handleCloudSignOut()}>
            Sair da conta
          </Button>
        </div>
      )}

      {!canSignOut && authMode === "cloud_pending" && isSupabaseBackendEnabled() && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft/80 to-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Pill tone="accent">Entrar na conta</Pill>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">
              Você saiu da sessão na nuvem. Entre com email e senha para continuar sincronizando.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/login")}>
            Ir para login
          </Button>
        </div>
      )}

      <div className="hidden lg:block">
        <HubHeader
          eyebrow="Perfil"
          title={`Olá, ${firstName(activeAccount?.name ?? "aluno")}`}
          desc="Ritmo, recompensas e preferências."
          badge={<BetaBadge />}
        />
      </div>

      <div className="space-y-4 lg:hidden">
        <MobileProfileCard
          name={activeAccount?.name ?? "Aluno Longyu"}
          email={activeAccount?.email}
          authLabel={status.label}
          authTone={status.tone}
          proLabel={proState === "not_subscriber" ? undefined : proStatus.label}
          proTone={proStatus.tone}
          isPremium={isProEffective}
          streak={streak}
          xpTotal={xpTotal}
          points={points}
          charges={dailyEnergy.charges}
          maxCharges={dailyEnergy.maxCharges}
          onCreateAccount={openCreateAccountPreparation}
          onPro={() => navigate("/pro")}
          showCreateAccount={authMode === "local"}
          showPro={!isProEffective}
          showSignOut={canSignOut}
          onSignOut={() => void handleCloudSignOut()}
        />

        {mobileMenuSections.map((section) => (
          <MobileMenuSection key={section.title} title={section.title} items={section.items} />
        ))}

        <section ref={mobileProfileRef} className="scroll-mt-4">
          <MobileStats stats={mobileStats} />
        </section>
      </div>

      <HubContentCard
        className="hidden overflow-hidden p-0 lg:block"
        title={activeAccount?.name ?? "Aluno Longyu"}
        desc={activeAccount?.email || "Conta local neste dispositivo."}
        meta={
          <>
            <Pill tone={status.tone}>{status.label}</Pill>
            <BetaBadge />
            {proState !== "not_subscriber" && <Pill tone={proStatus.tone}>{proStatus.label}</Pill>}
            <Pill tone={streak > 0 ? "accent" : "muted"}>
              <IconFlame width={13} height={13} /> {dayLabel(streak)}
            </Pill>
          </>
        }
      >
        <div className="grid gap-5 p-3.5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-surface-2 sm:mx-0">
              <Mascot size={88} variant={streak > 0 ? "celebrate" : "wave"} />
              <span className="absolute -bottom-2 -right-2 rounded-full border border-accent-soft bg-accent px-2.5 py-1 text-xs font-semibold text-white">
                {initials(activeAccount?.name ?? "Longyu")}
              </span>
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-sm leading-6 text-ink-soft">{status.blurb}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {authMode === "local" && (
                  <Button size="sm" onClick={openCreateAccountPreparation}>
                    {isSupabaseBackendEnabled() ? "Criar conta" : "Preparar conta com email"}{" "}
                    <IconChevron width={18} height={18} />
                  </Button>
                )}
                {authMode === "cloud_pending" && isSupabaseBackendEnabled() && (
                  <Button size="sm" variant="soft" onClick={() => navigate("/login")}>
                    Entrar na conta
                  </Button>
                )}
                {authMode === "cloud_pending" && !isSupabaseBackendEnabled() && (
                  <Button size="sm" variant="soft" disabled title="Disponível quando a sincronização estiver ativa">
                    Sincronização em breve
                  </Button>
                )}
                {authMode === "cloud" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-wrong/30 font-semibold text-wrong hover:bg-wrong-soft"
                    onClick={() => void handleCloudSignOut()}
                  >
                    Sair da conta
                  </Button>
                )}
                <Button size="sm" variant="soft" onClick={() => navigate("/")}>
                  Ir para jornada <IconChevron width={18} height={18} />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-2.5">
            <ProfilePulse label="Qi" value={points} icon={<IconStar width={18} height={18} />} />
            <ProfilePulse label="Pérolas" value={dragonPearls} icon={<IconStar width={18} height={18} />} />
            <ProfilePulse label="Escudos" value={streakShields} icon={<IconShield width={18} height={18} />} />
          </div>
        </div>
      </HubContentCard>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section ref={accountProfileRef} className="scroll-mt-4">
          <AccountProfileStateCard
            account={activeAccount}
            status={status}
            authMode={authMode}
            levelLabel={placement?.label ?? "Primeiro contato"}
            streak={streak}
            xpTotal={xpTotal}
            points={points}
            notice={accountNotice ?? dataNotice}
            onCreateAccount={openCreateAccountPreparation}
            onExportProgress={() => downloadLocalProgress("export")}
            onBackupLocal={() => downloadLocalProgress("backup")}
            onEraseLocalData={handleEraseLocalData}
          />
        </section>
        <section ref={proAccountRef} className="scroll-mt-4">
          <ProSubscriptionCard
            proState={proState}
            serverSubscription={serverSubscription}
            notice={cancelPlanNotice}
            onKnowPro={() => navigate("/pro")}
            onManageSubscription={handleManageSubscription}
            onCancelPlan={handleCancelPlan}
          />
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section ref={securityAccountRef} className="scroll-mt-4">
          <AccountSecurityCard authMode={authMode} status={status} />
        </section>
        <section ref={dataAccountRef} className="scroll-mt-4">
          <AccountDataCard
            authMode={authMode}
            accountCount={accountList.length}
            updatedAt={activeAccount?.updatedAt}
            notice={dataNotice}
            onExportProgress={() => downloadLocalProgress("export")}
            onBackupLocal={() => downloadLocalProgress("backup")}
            onEraseLocalData={handleEraseLocalData}
            onExportPrivacyBundle={() => void downloadPrivacyBundle()}
            onRequestAccountDeletion={() => void handleRequestAccountDeletion()}
            showCloudPrivacyActions={authMode === "cloud" && isSupabaseBackendEnabled()}
          />
        </section>
      </section>

      <section ref={signOutAccountRef} className="scroll-mt-4">
        <AccountSignOutCard
          authMode={authMode}
          canSignOut={canSignOut}
          onSignOut={() => void handleCloudSignOut()}
        />
      </section>

      {/* Hub Meu: tudo o que saiu da bottom nav mobile vive aqui em cards
          grandes — Loja, Missões, Ligas, Pro e as preferências. */}
      <section className="hidden lg:block">
        <div className="mb-3">
          <h2 className="font-serif text-xl font-semibold text-ink">Atalhos</h2>
          <p className="mt-1 text-sm text-ink-soft">Só o que não precisa ficar na navegação principal.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          <HubCard
            title="Perfil"
            desc="Estatísticas, conquistas e histórico."
            icon={IconUser}
            onClick={() => profileDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
          <HubCard
            title="Conquistas"
            desc={`${achievementSummary.unlockedCount}/${achievementSummary.total} desbloqueadas.`}
            icon={IconTrophy}
            onClick={() => navigate("/conquistas")}
          />
          <HubCard
            title="Medalhas"
            desc={medals.length > 0 ? `${medals.length} na coleção mensal.` : "Coleção mensal de medalhas."}
            icon={IconStar}
            onClick={() => navigate("/missoes#medalhas")}
          />
          <HubCard
            title="Baús"
            desc={closedChestCount > 0 ? `${closedChestCount} pronto(s) para abrir.` : "Inventário de baús."}
            icon={IconShield}
            onClick={() => navigate("/loja#baus")}
          />
          <HubCard
            title="Loja"
            desc={`Baús, cargas e escudos. Saldo: ${points} Qi.`}
            icon={IconStar}
            featured
            onClick={() => navigate("/loja")}
          />
          <HubCard
            title="Missões"
            desc="Diárias, semanais e a medalha do mês."
            icon={IconTarget}
            onClick={() => navigate("/missoes")}
          />
          <HubCard
            title="Ligas"
            desc="Ranking semanal local por XP."
            icon={IconTrophy}
            onClick={() => navigate("/ligas")}
          />
          <HubCard
            title="Longyu Pro"
            desc={
              proState === "local_preview" || proState === "real_active"
                ? "Longyu Pro ativo."
                : "Estude sem limites com o Pro."
            }
            icon={IconStar}
            featured={proState === "not_subscriber"}
            onClick={() => navigate("/pro")}
          />
          <HubCard
            title="Ajustes"
            desc="Central de configurações."
            icon={IconGear}
            onClick={() => navigate("/config")}
          />
          <HubCard
            title="Sons"
            desc="Efeitos, áudio e voz."
            icon={IconSound}
            onClick={() => navigate("/config#sons")}
          />
          <HubCard
            title="Exibição do mandarim"
            desc="Hànzì, pinyin e tradução."
            icon={IconHanzi}
            onClick={() => navigate("/config#exibicao")}
          />
          <HubCard
            title="Dados locais"
            desc="Perfis e progresso neste aparelho."
            icon={IconLibrary}
            onClick={() => navigate("/config#dados")}
          />
        </div>
      </section>

      <section ref={profileDetailsRef} className="hidden grid-cols-2 gap-2 scroll-mt-4 sm:gap-3 lg:grid lg:grid-cols-4">
        {dashboard.stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </section>

      <section className="hidden gap-4 lg:grid lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">Progresso por motor</h2>
              <p className="mt-1 text-sm text-ink-soft">Treine o motor certo para destravar o próximo salto.</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="muted">{dashboard.totalProgress}% geral</Pill>
              <Button size="sm" variant="outline" disabled={isProEffective} onClick={() => setReportPaywallOpen(true)}>
                {isProEffective ? "Relatórios em breve" : "Relatório avançado"}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.engines.map((engine) => (
              <EngineProfileCard
                key={engine.track}
                insight={engine}
                learnedChars={learnedChars.length}
                learnedChunks={learnedChunks.length}
                textsRead={dashboard.textsRead}
                onTrain={() => navigate(engine.href)}
              />
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <IconShield width={22} height={22} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">
                {placement ? placement.label : "Nivelamento ainda não feito"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {placement ? levelCopy(placement.level) : "Faça o teste para o Longyu sugerir onde você deve começar."}
                {placement && placementTargetLesson ? ` Próxima lição sugerida: ${placementTargetLesson.title}.` : ""}
              </p>
              <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">Jornada concluída</span>
                  <span className="text-ink-faint">{completedLessons.length}/{ALL_LESSONS.length}</span>
                </div>
                <ProgressBar value={completedLessons.length} max={ALL_LESSONS.length} className="mt-3" />
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="hidden gap-4 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">Conquistas</h2>
              <p className="mt-1 text-sm text-ink-soft">Medalhas da sua jornada — recentes e as mais próximas.</p>
            </div>
            <Pill tone={achievementSummary.unlockedCount > 0 ? "accent" : "muted"}>
              {achievementSummary.unlockedCount}/{achievementSummary.total}
            </Pill>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {achievementSummary.highlights.map(({ def, current, target, unlockedAt }) => (
              <div
                key={def.id}
                className={[
                  "flex items-center gap-3 rounded-2xl border p-3.5 shadow-card transition",
                  unlockedAt ? "border-accent-soft bg-surface" : "border-line bg-surface-2/70",
                ].join(" ")}
              >
                <span
                  className={[
                    "hanzi flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl",
                    unlockedAt ? "bg-accent text-white" : "bg-surface text-ink-faint grayscale",
                  ].join(" ")}
                >
                  {def.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{def.title}</div>
                  {unlockedAt ? (
                    <div className="truncate text-xs text-[rgb(var(--good))]">Desbloqueada</div>
                  ) : (
                    <ProgressBar value={current} max={target} className="mt-1.5" />
                  )}
                </div>
                {!unlockedAt && (
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">{current}/{target}</span>
                )}
              </div>
            ))}
          </div>
          <Button variant="soft" className="mt-3 w-full sm:w-auto" onClick={() => navigate("/conquistas")}>
            Ver todas as conquistas <IconChevron width={16} height={16} />
          </Button>
        </div>

        <div className="space-y-4">
          <section className="rounded-[24px] border border-line bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold text-ink">Histórico recente</h2>
              <IconRefresh width={19} height={19} className="text-ink-faint" />
            </div>
            <div className="space-y-2">
              {dashboard.history.map((item) => (
                <HistoryRow key={item.label} {...item} />
              ))}
            </div>
          </section>
        </div>
      </section>

      <div ref={accountToolsRef}>
        <Card className="overflow-hidden border-line/80 p-0 shadow-card">
          <div className="border-b border-line/70 bg-surface-2/60 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Pill tone={status.tone}>{status.label}</Pill>
                <h2 className="mt-2 font-serif text-xl font-semibold text-ink">
                  {authMode === "local"
                    ? isSupabaseBackendEnabled()
                      ? "Criar conta na nuvem"
                      : "Preparar conta"
                    : authMode === "cloud_pending"
                      ? "Entrar na conta"
                      : "Conta conectada"}
                </h2>
                <p className="mt-1 max-w-lg text-sm leading-6 text-ink-soft">
                  {authMode === "local"
                    ? isSupabaseBackendEnabled()
                      ? "Crie sua conta com email e senha. O progresso sincroniza automaticamente."
                      : "Prepare um email para a futura sincronização neste dispositivo."
                    : authMode === "cloud_pending"
                      ? "Use o mesmo email e senha da sua conta Longyu."
                      : "Seu progresso salva automaticamente na nuvem."}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <IconShield width={22} height={22} />
              </span>
            </div>
            {accountNotice && (
              <p className="mt-4 rounded-xl border border-accent/20 bg-accent-soft/70 px-4 py-3 text-sm font-medium text-accent">
                {accountNotice}
              </p>
            )}
          </div>

          <div className="px-5 py-5 sm:px-6">
          {authMode === "local" && (
            <form onSubmit={handleAttachEmail} className="mt-4 grid gap-3 sm:max-w-2xl">
              {showCloudPrompt && isSupabaseBackendEnabled() && (
                <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
                  Após criar a conta, seu progresso passa a salvar na nuvem automaticamente.
                </p>
              )}
              {showCloudPrompt && !isSupabaseBackendEnabled() && (
                <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
                  Este modo prepara seu email neste dispositivo. Nada é enviado e a senha não é salva.
                </p>
              )}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Nome</span>
                <input
                  value={activeAccount?.name ?? "Aluno Longyu"}
                  readOnly
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAccountError(null);
                  }}
                  placeholder="voce@email.com"
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setAccountError(null);
                    }}
                    placeholder="Mínimo de 6 caracteres"
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Confirmar</span>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) => {
                      setPasswordConfirm(event.target.value);
                      setAccountError(null);
                    }}
                    placeholder="Repita a senha"
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Idioma nativo</span>
                  <input
                    value="Português (Brasil)"
                    readOnly
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Idioma alvo</span>
                  <input
                    value="Mandarim"
                    readOnly
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none"
                  />
                </label>
              </div>
              <p className="text-xs leading-5 text-ink-faint">
                {isSupabaseBackendEnabled()
                  ? "A senha é usada só para autenticar com o Supabase e não fica salva neste aparelho."
                  : "A senha é validada apenas nesta tela e não é salva."}
              </p>
              {accountError && (
                <p className="rounded-xl bg-wrong-soft px-3 py-2 text-sm font-medium text-wrong">{accountError}</p>
              )}
              <Button type="submit" disabled={!canAttachEmail} className="w-full sm:w-auto">
                {isSupabaseBackendEnabled() ? "Criar conta" : "Preparar conta com email"}
              </Button>
            </form>
          )}

          {authMode === "cloud_pending" && isSupabaseBackendEnabled() && (
            <div className="mx-auto max-w-md">
              <CloudLoginForm
                email={email}
                password={password}
                error={accountError}
                onEmail={(value) => {
                  setEmail(value);
                  setAccountError(null);
                }}
                onPassword={(value) => {
                  setPassword(value);
                  setAccountError(null);
                }}
                onSubmit={(event) => void handleCloudSignIn(event)}
              />
              <p className="mt-4 text-center text-xs text-ink-faint">
                Ou acesse{" "}
                <button
                  type="button"
                  className="font-semibold text-accent hover:underline"
                  onClick={() => navigate("/login")}
                >
                  /login
                </button>{" "}
                para entrar direto, sem tutorial.
              </p>
            </div>
          )}

          {authMode === "cloud_pending" && !isSupabaseBackendEnabled() && (
            <div className="mt-4 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-soft">
              Sincronização em breve. Seu perfil continua salvo neste dispositivo.
            </div>
          )}

          {authMode === "cloud" && (
            <div className="rounded-2xl border border-good/25 bg-good-soft px-4 py-4 text-sm font-medium text-ink">
              Progresso sincronizado automaticamente com sua conta na nuvem.
            </div>
          )}
          </div>
        </Card>
      </div>

      <div>
        <Card className="border-line/80 p-5 sm:p-6">
          <h3 className="font-serif text-lg font-semibold text-ink">Perfis neste dispositivo</h3>
          <p className="mt-1 text-sm text-ink-soft">Cada perfil guarda progresso local separado.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <form className="flex-1" onSubmit={handleCreateProfile} id="longyu-local-account-form">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Novo perfil neste dispositivo
                </span>
                <input
                  value={newProfileName}
                  onChange={(event) => setNewProfileName(event.target.value)}
                  placeholder="Nome do aluno"
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
                />
              </label>
            </form>
            <Button onClick={handleCreateProfile} disabled={newProfileName.trim().length < 2}>
              Criar perfil local
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            {accountList.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                active={account.id === currentAccountId}
                onClick={() => switchAccount(account.id)}
              />
            ))}
          </div>
        </Card>
      </div>
      <ProPaywall open={reportPaywallOpen} kind="reports" onClose={() => setReportPaywallOpen(false)} />
    </HubPage>
  );
}

function canContinue(
  step: OnboardingStep,
  data: {
    source?: string;
    reason?: string;
    experience?: Experience;
    quizPicked?: string;
    name: string;
  }
): boolean {
  if (step === "welcome") return true;
  if (step === "source") return Boolean(data.source);
  if (step === "reason") return Boolean(data.reason);
  if (step === "level") return Boolean(data.experience);
  if (step === "quiz") return Boolean(data.quizPicked);
  if (step === "result") return true;
  if (step === "name") return data.name.trim().length >= 2;
  return false;
}

function footerLabel(step: OnboardingStep): string {
  if (step === "quiz") return "Responder";
  if (step === "name") return "Continuar";
  return "Continuar";
}

function canCreateOptionalAccount(email: string, password: string, passwordConfirm: string): boolean {
  return canRegisterWithCredentials(email, password, passwordConfirm);
}

function AccountProfileStateCard({
  account,
  status,
  authMode,
  levelLabel,
  streak,
  xpTotal,
  points,
  notice,
  onCreateAccount,
  onExportProgress,
  onBackupLocal,
  onEraseLocalData,
}: {
  account?: LearningAccount;
  status: { label: string; tone: AccountStatusTone; blurb: string; state: AccountStateId };
  authMode: AuthMode;
  levelLabel: string;
  streak: number;
  xpTotal: number;
  points: number;
  notice?: string | null;
  onCreateAccount: () => void;
  onExportProgress: () => void;
  onBackupLocal: () => void;
  onEraseLocalData: () => void;
}) {
  const cloudBackend = isSupabaseBackendEnabled();
  const isLocal = authMode === "local";
  const createLabel =
    authMode === "cloud"
      ? "Conta na nuvem ativa"
      : authMode === "cloud_pending" && cloudBackend
        ? "Entrar na conta"
        : cloudBackend
          ? "Criar conta com email"
          : "Criar conta com email depois";

  return (
    <Card className="h-full rounded-xl border-line/70 p-3.5 shadow-none sm:p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Pill tone={status.tone}>{status.label}</Pill>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">Perfil</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {status.blurb}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconUser width={22} height={22} />
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <ProfileDetailStat label="Nome" value={account?.name ?? "Aluno Longyu"} />
        <ProfileDetailStat label="Email" value={account?.email || "Conta local neste dispositivo."} />
        <ProfileDetailStat label="Status da conta" value={status.label} />
        <ProfileDetailStat label="Nível atual" value={levelLabel} />
        <ProfileDetailStat label="Dias de sequência" value={String(streak)} />
        <ProfileDetailStat label="XP" value={String(xpTotal)} />
        <ProfileDetailStat label="Qi" value={String(points)} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button variant={isLocal ? "primary" : "outline"} onClick={onCreateAccount} disabled={authMode === "cloud"}>
          {createLabel}
        </Button>
        <Button variant="outline" onClick={onExportProgress}>
          Exportar progresso
        </Button>
        <Button variant="outline" onClick={onBackupLocal}>
          Fazer backup local
        </Button>
        <Button variant="outline" onClick={onEraseLocalData}>
          Apagar dados locais
        </Button>
      </div>

      {notice && (
        <p className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {notice}
        </p>
      )}
    </Card>
  );
}

function ProfileDetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface-2 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-ink" title={value}>{value}</div>
    </div>
  );
}

function ProSubscriptionCard({
  proState,
  serverSubscription,
  notice,
  onKnowPro,
  onManageSubscription,
  onCancelPlan,
}: {
  proState: ProStateId;
  serverSubscription: ServerSubscriptionSnapshot | null;
  notice?: string | null;
  onKnowPro: () => void;
  onManageSubscription: () => void;
  onCancelPlan: () => void;
}) {
  const meta = PRO_STATUS[proState];
  const metaBlurb =
    proState === "not_subscriber" && isSupabaseBackendEnabled()
      ? "Plano gratuito. Assine o Longyu Pro quando quiser desbloquear tudo."
      : meta.blurb;
  const isFree = proState === "not_subscriber";
  const isLocalPreview = proState === "local_preview";
  const hasRealSubscription = Boolean(serverSubscription);
  const canManage = hasRealSubscription && isBillingPortalAvailable();
  const canCancel = proState === "real_active" && hasRealSubscription && isBillingPortalAvailable();
  const planName = serverSubscription?.planName ?? (isLocalPreview ? "Longyu Pro" : "Gratuito");
  const benefits = isFree ? getAccountFreeBenefitLines(isSupabaseBackendEnabled()) : ACCOUNT_PRO_BENEFITS;
  const nextBilling =
    serverSubscription?.nextBillingAt
      ? formatAccountDate(serverSubscription.nextBillingAt)
      : proState === "real_active"
        ? "Assinatura ativa"
        : "Nenhuma cobrança";

  return (
    <Card className="h-full overflow-hidden rounded-xl border-line/70 p-3.5 shadow-none sm:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pill tone={meta.tone}>{meta.label}</Pill>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">Plano</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{metaBlurb}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B7791F]/12 text-gold">
          <IconStar width={24} height={24} fill="currentColor" />
        </span>
      </div>

      <div className="mt-5 grid gap-2 rounded-2xl border border-line bg-surface-2 p-3 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Plano</div>
          <div className="mt-1 font-semibold text-ink">{planName}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Status</div>
          <div className="mt-1 font-semibold text-ink">{meta.label}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Próxima cobrança</div>
          <div className="mt-1 font-semibold text-ink">{nextBilling}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        {benefits.map((benefit) => (
          <div key={benefit} className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-ink-soft">
            <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      {isFree ? (
        <div className="mt-5">
          <Button className="w-full sm:w-auto" onClick={onKnowPro}>
            Ver Longyu Pro
          </Button>
          <p className="mt-3 text-xs leading-5 text-ink-faint">
            {isSupabaseBackendEnabled()
              ? "Assine o Pro com pagamento seguro quando estiver pronto para desbloquear tudo."
              : "Checkout em configuração. A assinatura será liberada assim que o pagamento seguro estiver ativo."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Button variant="soft" onClick={onKnowPro}>
              Ver Pro
            </Button>
            <Button
              variant="outline"
              onClick={onManageSubscription}
              title={canManage ? "Abrir portal de cobrança" : "Disponível quando a assinatura estiver ativa"}
            >
              Gerenciar plano
            </Button>
            <Button
              variant="outline"
              onClick={onCancelPlan}
              title={canCancel ? "Abrir portal de cobrança" : "Disponível quando a assinatura estiver ativa"}
            >
              Cancelar plano
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-faint">
            {isLocalPreview
              ? "Recursos do Longyu Pro liberados nesta conta."
              : "Quando o pagamento real estiver ativo, você poderá gerenciar ou cancelar sua assinatura por aqui."}
          </p>
        </>
      )}
      {notice && (
        <p className="mt-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm font-medium text-ink-soft">
          {notice}
        </p>
      )}
    </Card>
  );
}

function AccountSecurityCard({
  authMode,
  status,
}: {
  authMode: AuthMode;
  status: { label: string; tone: AccountStatusTone; blurb: string };
}) {
  const cloudBackend = isSupabaseBackendEnabled();
  const cloudLine =
    authMode === "cloud"
      ? "Ativa — progresso sincronizado automaticamente"
      : cloudBackend
        ? "Disponível — entre na conta para ativar"
        : "Em breve, com sincronização segura";
  const subscriptionLine = cloudBackend
    ? "Disponível via Stripe (configure as chaves para ativar)"
    : "Em breve, com pagamento seguro";

  return (
    <Card className="h-full rounded-xl border-line/70 p-3.5 shadow-none sm:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pill tone={status.tone}>{status.label}</Pill>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">Segurança</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {authMode === "cloud"
              ? "Sua sessão é autenticada com Supabase. Senhas e tokens não ficam salvos neste aparelho."
              : cloudBackend
                ? "Crie uma conta com email e senha. A autenticação é feita de forma segura pelo Supabase."
                : "Por enquanto, o Longyu usa um perfil local. Senhas e dados de pagamento não são salvos."}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconShield width={22} height={22} />
        </span>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        <SecurityLine
          label="Conta local"
          value={authMode === "cloud" ? "Espelho neste dispositivo" : "Progresso neste dispositivo"}
        />
        <SecurityLine label="Conta em nuvem" value={cloudLine} />
        <SecurityLine label="Assinatura" value={subscriptionLine} />
      </div>
    </Card>
  );
}

function AccountDataCard({
  authMode,
  accountCount,
  updatedAt,
  notice,
  onExportProgress,
  onBackupLocal,
  onEraseLocalData,
  onExportPrivacyBundle,
  onRequestAccountDeletion,
  showCloudPrivacyActions,
}: {
  authMode: AuthMode;
  accountCount: number;
  updatedAt?: number;
  notice?: string | null;
  onExportProgress: () => void;
  onBackupLocal: () => void;
  onEraseLocalData: () => void;
  onExportPrivacyBundle: () => void;
  onRequestAccountDeletion: () => void;
  showCloudPrivacyActions: boolean;
}) {
  const cloudBackend = isSupabaseBackendEnabled();
  const desc =
    authMode === "cloud"
      ? "Seu progresso também está na nuvem. Exporte uma cópia local se quiser guardar um backup."
      : cloudBackend
        ? "Exporte ou faça backup do progresso local. Com conta na nuvem, o app sincroniza automaticamente."
        : "Exporte ou faça backup do progresso enquanto a sincronização em nuvem não está disponível.";

  return (
    <Card className="h-full rounded-xl border-line/70 p-3.5 shadow-none sm:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pill tone={authMode === "cloud" ? "good" : "muted"}>{authMode === "cloud" ? "Nuvem + local" : "Local"}</Pill>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">Dados</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{desc}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconBook width={22} height={22} />
        </span>
      </div>

      <div className="mt-5 grid gap-2 rounded-2xl border border-line bg-surface-2 p-3 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Perfis locais</div>
          <div className="mt-1 font-semibold text-ink">{accountCount}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Atualizado</div>
          <div className="mt-1 font-semibold text-ink">{formatAccountDate(updatedAt)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Button variant="outline" onClick={onExportProgress}>
          Exportar progresso
        </Button>
        <Button variant="outline" onClick={onBackupLocal}>
          Fazer backup local
        </Button>
        <Button variant="outline" onClick={onEraseLocalData}>
          Apagar dados locais
        </Button>
      </div>

      {showCloudPrivacyActions && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onExportPrivacyBundle}>
            Exportar pacote LGPD
          </Button>
          <Button variant="outline" onClick={onRequestAccountDeletion}>
            Excluir conta na nuvem
          </Button>
        </div>
      )}

      {notice && (
        <p className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {notice}
        </p>
      )}
    </Card>
  );
}

function AccountSignOutCard({
  authMode,
  canSignOut,
  onSignOut,
}: {
  authMode: AuthMode;
  canSignOut: boolean;
  onSignOut: () => void;
}) {
  return (
    <Card className="border-wrong/20 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Pill tone={canSignOut ? "good" : "muted"}>Sessão</Pill>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">Sair da conta</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {canSignOut
              ? "Encerra a sessão neste dispositivo. Seu progresso continua salvo na nuvem."
              : authMode === "cloud_pending"
                ? "Entre na conta para ativar a sessão na nuvem."
                : "Perfil local — não há sessão remota para encerrar."}
          </p>
        </div>
        <Button
          variant="outline"
          className={canSignOut ? "border-wrong/30 font-semibold text-wrong hover:bg-wrong-soft" : ""}
          disabled={!canSignOut}
          onClick={onSignOut}
        >
          {canSignOut ? "Sair da conta" : "Sem sessão ativa"}
        </Button>
      </div>
    </Card>
  );
}

function SecurityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <span className="font-medium text-ink">{label}</span>
      <span className="text-right text-ink-soft">{value}</span>
    </div>
  );
}

function formatAccountDate(timestamp?: number): string {
  if (!timestamp) return "Ainda não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

interface DashboardInput {
  completedLessons: string[];
  points: number;
  xpTotal: number;
  xpToday: number;
  weeklyXp: number;
  charges: number;
  maxCharges: number;
  isPremium: boolean;
  dragonPearls: number;
  streakShields: number;
  streak: number;
  longestStreak: number;
  learnedChars: string[];
  learnedChunks: string[];
  srs: Record<string, SRSItem>;
  today: Record<DomainTrack, number>;
  dailyTasks: { microtextsRead: number };
  rewardHistory: RewardHistoryEntry[];
}

interface StatTileData {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}

interface HistoryData {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
}

function buildProfileDashboard(input: DashboardInput) {
  const completedSet = new Set(input.completedLessons);
  const completedLessonData = ALL_LESSONS.filter((lesson) => completedSet.has(lesson.id));
  const lessonMinutes = completedLessonData.reduce((sum, lesson) => sum + (lesson.estimatedMinutes ?? 5), 0);
  const srsItems = Object.values(input.srs);
  const totalReviewEvents = srsItems.reduce((sum, item) => sum + item.reps + item.lapses, 0);
  const todayMinutes = input.today.som + input.today.fala + input.today.hanzi + input.today.leitura;
  const totalMinutes = lessonMinutes + totalReviewEvents;
  const totalProgress = Math.round((input.completedLessons.length / Math.max(1, ALL_LESSONS.length)) * 100);
  const textsRead = Math.max(
    input.dailyTasks.microtextsRead,
    completedLessonData.filter((lesson) => lesson.steps.some((step) => step.kind === "microread")).length
  );
  const engines = engineInsights(input.completedLessons, input.srs);
  const latestLesson = input.completedLessons.length
    ? ALL_LESSONS.find((lesson) => lesson.id === input.completedLessons[input.completedLessons.length - 1])
    : undefined;
  const sortedRewards = [...input.rewardHistory].sort((a, b) => b.claimedAt - a.claimedAt);
  const latestMission = sortedRewards.find((reward) => reward.id.startsWith("mission:"));
  const latestReward = sortedRewards[0];
  const latestReviewed = [...srsItems]
    .filter((item) => item.reps + item.lapses > 0)
    .sort((a, b) => (b.reviewedAt ?? b.createdAt) - (a.reviewedAt ?? a.createdAt))[0];

  const stats: StatTileData[] = [
    {
      label: "XP total",
      value: input.xpTotal,
      detail: "progresso de estudo",
      icon: <IconStar width={18} height={18} />,
    },
    {
      label: "XP hoje",
      value: input.xpToday,
      detail: `${input.weeklyXp} XP na semana`,
      icon: <IconTarget width={18} height={18} />,
    },
    {
      label: "Progresso total",
      value: `${totalProgress}%`,
      detail: `${input.completedLessons.length}/${ALL_LESSONS.length} lições`,
      icon: <IconTarget width={18} height={18} />,
    },
    { label: "Qi", value: input.points, detail: "moeda da Loja", icon: <IconStar width={18} height={18} /> },
    {
      label: "Cargas do Dragão",
      value: input.isPremium ? "∞" : `${input.charges}/${input.maxCharges}`,
      detail: input.isPremium ? "Pro: ilimitadas" : "bateria diária",
      icon: <IconShield width={18} height={18} />,
    },
    { label: "Pérolas", value: input.dragonPearls, detail: "precisão alta", icon: <IconStar width={18} height={18} /> },
    { label: "Escudos", value: input.streakShields, detail: "proteção de sequência", icon: <IconShield width={18} height={18} /> },
    { label: "Sequência atual", value: dayLabel(input.streak), detail: "ritmo ativo", icon: <IconFlame width={18} height={18} /> },
    { label: "Maior sequência", value: dayLabel(input.longestStreak), detail: "recorde pessoal", icon: <IconFlame width={18} height={18} /> },
    { label: "Tempo total", value: formatMinutes(totalMinutes), detail: "lições + revisões", icon: <IconTarget width={18} height={18} /> },
    { label: "Tempo hoje", value: formatMinutes(todayMinutes), detail: "nos quatro motores", icon: <IconCheck width={18} height={18} /> },
    { label: "Lições concluídas", value: input.completedLessons.length, detail: "na jornada", icon: <IconCheck width={18} height={18} /> },
    { label: "Revisões feitas", value: totalReviewEvents, detail: "domínios SRS", icon: <IconRefresh width={18} height={18} /> },
    { label: "Caracteres aprendidos", value: input.learnedChars.length, detail: "formas no SRS", icon: <IconHanzi width={18} height={18} /> },
    { label: "Chunks aprendidos", value: input.learnedChunks.length, detail: "frases úteis", icon: <IconChat width={18} height={18} /> },
    { label: "Textos lidos", value: textsRead, detail: "microleituras", icon: <IconBook width={18} height={18} /> },
  ];

  const history: HistoryData[] = [
    {
      label: "Última lição concluída",
      value: latestLesson?.title ?? "Nenhuma lição concluída",
      meta: latestLesson ? skillLabel(latestLesson.skill) : "Comece pela jornada",
      icon: <IconCheck width={18} height={18} />,
    },
    {
      label: "Última missão resgatada",
      value: latestMission?.source ?? "Nenhuma missão resgatada",
      meta: latestMission ? formatDate(latestMission.claimedAt) : "Abra Missões de hoje",
      icon: <IconTarget width={18} height={18} />,
    },
    {
      label: "Último item revisado",
      value: latestReviewed ? itemLabel(latestReviewed) : "Nenhum item revisado",
      meta: latestReviewed ? reviewMeta(latestReviewed) : "A revisão aparece após estudar",
      icon: <IconRefresh width={18} height={18} />,
    },
    {
      label: "Recompensa recente",
      value: latestReward ? rewardLabel(latestReward) : "Sem recompensas ainda",
      meta: latestReward ? latestReward.source : "Conclua uma lição para ganhar Qi",
      icon: <IconStar width={18} height={18} />,
    },
  ];

  return {
    stats,
    engines,
    history,
    textsRead,
    totalProgress,
  };
}

function skillLabel(skill: string): string {
  const labels: Record<string, string> = {
    som: "Som",
    fala: "Fala",
    hanzi: "Hànzì",
    leitura: "Leitura",
    sistema: "Sistema",
  };
  return labels[skill] ?? "Jornada";
}

function dayLabel(days: number): string {
  return days === 1 ? "1 dia" : `${days} dias`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

function rewardLabel(reward: RewardHistoryEntry): string {
  if (reward.type === "qi") return `+${reward.amount} Qi`;
  if (reward.type === "dragonPearl") return `${reward.amount} ${reward.amount === 1 ? "pérola" : "pérolas"}`;
  if (reward.type === "streakShield") return `${reward.amount} ${reward.amount === 1 ? "escudo" : "escudos"}`;
  return reward.source;
}

function itemLabel(item: Pick<SRSItem, "type" | "itemId">): string {
  if (item.type === "char") {
    const char = charById[item.itemId];
    return char ? `${char.hanzi} · ${char.meaningPt}` : item.itemId;
  }
  const chunk = chunkById[item.itemId];
  return chunk ? `${chunk.hanzi} · ${chunk.meaningPt}` : item.itemId;
}

function reviewMeta(item: SRSItem): string {
  const domain = item.reviewDomain ? ` · ${item.reviewDomain}` : "";
  return `${item.reps + item.lapses} revisões${domain}`;
}

function OnboardingShell({
  step,
  canGoBack,
  onBack,
  footer,
  children,
}: {
  step: OnboardingStep;
  canGoBack: boolean;
  onBack: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const index = ONBOARDING_STEPS.indexOf(step);
  const progress = Math.max(1, index + 1);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 pb-6">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink-faint transition hover:bg-surface-2 disabled:opacity-30"
          aria-label="Voltar"
        >
          ←
        </button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(progress / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>
        <BrandWordmark className="text-lg" />
      </header>

      <div className="flex flex-1 flex-col justify-start pt-4 sm:pt-10">{children}</div>

      {footer && <div className="pt-8">{footer}</div>}
    </div>
  );
}

function OnboardingFooter({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="lg" disabled={disabled} onClick={onClick} className="w-full">
      {label} <IconChevron width={18} height={18} />
    </Button>
  );
}

function MascotPrompt({ prompt }: { prompt: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <Mascot size={80} className="shrink-0" />
      <div className="relative rounded-2xl border border-line bg-surface px-4 py-3 text-base font-medium text-ink shadow-card">
        <span className="absolute -left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-line bg-surface" />
        {prompt}
      </div>
    </div>
  );
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-2">
      <div className="flex justify-center">
        <Mascot size={224} variant="celebrate" />
      </div>
      <div className="text-center md:text-left">
        <BrandWordmark className="mx-auto block text-3xl md:mx-0" />
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Mandarim com som, fala, hànzì e leitura no ponto certo.
        </h1>
        <p className="mt-3 text-ink-soft">
          Primeiro o Longyu descobre seu nível. Só depois cria sua conta e salva a jornada.
        </p>
        <Button size="lg" onClick={onStart} className="mt-6 w-full md:w-auto">
          Começar <IconChevron width={18} height={18} />
        </Button>
      </div>
    </div>
  );
}

function SignalBars({ level, active }: { level: number; active: boolean }) {
  return (
    <span className="flex items-end gap-[3px]" style={{ height: 22 }}>
      {[1, 2, 3, 4].map((i) => {
        const on = i <= level;
        return (
          <span
            key={i}
            className={[
              "w-[5px] rounded-[2px]",
              on ? (active ? "bg-white" : "bg-accent") : active ? "bg-white/40" : "bg-line",
            ].join(" ")}
            style={{ height: 5 + i * 4 }}
          />
        );
      })}
    </span>
  );
}

function QuestionStep<T extends string>({
  prompt,
  choices,
  value,
  onPick,
}: {
  prompt: string;
  choices: Choice<T>[];
  value?: T | string;
  onPick: (id: T) => void;
}) {
  return (
    <div>
      <MascotPrompt prompt={prompt} />
      <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const active = value === choice.id;
          const barLevel = /^[▂▅▇█]+$/.test(choice.icon) ? choice.icon.length : 0;
          return (
            <button
              key={choice.id}
              onClick={() => onPick(choice.id)}
              className={[
                "group flex min-h-[76px] items-center gap-4 rounded-2xl border px-5 py-4 text-left shadow-card transition active:scale-[.99]",
                active
                  ? "border-accent bg-accent-soft ring-1 ring-accent"
                  : "border-line bg-surface hover:-translate-y-0.5 hover:shadow-lift",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold transition",
                  active
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-ink-soft group-hover:bg-accent-soft group-hover:text-accent",
                ].join(" ")}
              >
                {barLevel ? <SignalBars level={barLevel} active={active} /> : choice.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{choice.label}</span>
                {choice.desc && <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{choice.desc}</span>}
              </span>
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                  active ? "border-accent bg-accent text-white" : "border-line text-transparent",
                ].join(" ")}
              >
                <IconCheck width={15} height={15} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function containsCjkText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function QuizText({
  value,
  onUseHint,
  className = "",
  allowHints = false,
}: {
  value: string;
  onUseHint: () => void;
  className?: string;
  allowHints?: boolean;
}) {
  if (!containsCjkText(value)) return <span className={className}>{formatPinyinForDisplay(value)}</span>;
  if (!allowHints) return <GlossText examMode text={value} className={className} />;

  return (
    <GlossText text={value} speakOnClick={false} onHintOpen={onUseHint} className={className} />
  );
}

function QuizStep({
  index,
  total,
  question,
  declaredLevel,
  picked,
  onPick,
  onSubmit,
  onUseHint,
}: {
  index: number;
  total: number;
  question: QuizQuestion;
  declaredLevel: Experience;
  picked?: string;
  onPick: (answer: string) => void;
  onSubmit: () => void;
  onUseHint: () => void;
}) {
  const difficulty = quizDifficulty(question, declaredLevel);
  const advancedProbe = isAdvancedProbe(question, declaredLevel);
  const allowHints = question.hasHint === true;
  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: question.options.length,
    hasSelection: Boolean(picked),
    onSelectOption: (optionIndex) => {
      const option = question.options[optionIndex];
      if (option) onPick(option);
    },
    onSubmit,
  });

  return (
    <div>
      <MascotPrompt prompt={`Teste obrigatório - pergunta ${index + 1} de ${total}`} />
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={[
                "h-1.5 rounded-full transition-all",
                i < index ? "w-6 bg-accent" : i === index ? "w-8 bg-accent" : "w-6 bg-line",
              ].join(" ")}
            />
          ))}
        </div>
        <div className="mb-5 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {CATEGORY_LABEL[question.category]}
            </span>
            <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {QUIZ_DIFFICULTY_LABEL[difficulty]}
            </span>
            {advancedProbe && (
              <span className="inline-block rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Não punitiva
              </span>
            )}
            <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {quizLayerLabel(question)}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">{question.prompt}</h1>
          {question.audioText && (
            <div className="mt-4 flex justify-center">
              <SpeakButton text={question.audioText} size="lg" />
            </div>
          )}
          {question.stimulus && (
            <div className="mt-4 rounded-[24px] border border-line bg-surface-2 px-4 py-5 shadow-card">
              <QuizText value={question.stimulus} onUseHint={onUseHint} allowHints={allowHints} className="text-5xl font-semibold text-ink" />
            </div>
          )}
          {question.detail && allowHints && (
            <div className="mt-3 font-serif text-lg text-ink-soft">
              <QuizText value={question.detail} onUseHint={onUseHint} allowHints={allowHints} />
            </div>
          )}
          <p className="mx-auto mt-3 max-w-sm text-xs font-medium text-ink-faint">
            {allowHints ? "Esta pergunta permite pista; usar ajuda reduz a pontuação." : "Sem ajuda nesta pergunta: toque e hover não revelam pinyin nem significado."}
          </p>
          <KeyboardShortcutHint />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => {
            const active = picked === option;
            const shortcut = shortcutKeyForIndex(optionIndex);
            return (
              <button
                key={option}
                onClick={() => onPick(option)}
                aria-label={`Opção ${shortcut}: ${option}`}
                className={[
                  "relative rounded-2xl border px-5 py-4 text-left font-medium shadow-card transition active:scale-[.99]",
                  active
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line bg-surface text-ink hover:bg-surface-2",
                ].join(" ")}
              >
                <ShortcutBadge className="absolute right-3 top-3">{shortcut}</ShortcutBadge>
                <QuizText value={option} onUseHint={onUseHint} allowHints={allowHints} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlacementResultStep({
  result,
  targetLesson,
  entryPoint,
  analysis,
  declaredLevel,
  rewardQi,
  skippedCount,
  recommendedLessons,
  onFollowRecommended,
  onStartScratch,
}: {
  result: PlacementResult;
  targetLesson?: Lesson;
  entryPoint?: { phaseTitle: string; unitTitle: string };
  analysis: PlacementAnalysis;
  declaredLevel: Experience;
  rewardQi: number;
  skippedCount: number;
  recommendedLessons: Lesson[];
  onFollowRecommended: () => void;
  onStartScratch: () => void;
}) {
  const requiredFoundationLessons = lessonsByIds(analysis.foundationLessonIdsRequired);
  return (
    <div>
      <MascotPrompt prompt="Pronto. Encontrei um ponto de partida cuidadoso para você." />
      <Card className="mx-auto max-w-2xl p-6 shadow-lift sm:p-7">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Seu ponto de partida
          </div>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
            {result.label}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink-soft">
            {analysis.resultMessage || levelCopy(result.level)}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-ink">
            Você começou na {entryPoint?.phaseTitle ?? "Fase inicial"}
            {entryPoint?.unitTitle ? ` · ${entryPoint.unitTitle}` : ""}.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <ResultStat label="Sem dica" value={analysis.correctWithoutHint + "/" + analysis.questionsAnswered} detail={Math.round(analysis.noHintAccuracy * 100) + "%"} />
          <ResultStat label="B-E sem ajuda" value={analysis.decisiveCorrect + "/" + analysis.decisiveQuestions} detail={Math.round(analysis.decisiveAccuracy * 100) + "%"} />
          <ResultStat label="Com dica" value={analysis.correctWithHint} detail="valem menos" />
          <ResultStat label="Erros" value={analysis.wrong} detail="0 ponto" />
          <ResultStat label="Dicas" value={analysis.hintCount} detail="usadas" />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ResultStat label="Nivel declarado" value={declaredLevelLabel(declaredLevel)} detail="teto aplicado" />
          <ResultStat label="Consistencia" value={analysis.consistency} detail={`${Math.round(analysis.weightedAccuracy * 100)}% ponderado`} />
        </div>

        {analysis.advancedProbes > 0 && (
          <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-6 text-ink-soft">
            Sondagens avançadas: {analysis.advancedCorrect}/{analysis.advancedProbes}. Erros muito acima do nível declarado ajudam a posicionar, mas não derrubam sua entrada.
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Por quê?</div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            O teste contou mais as respostas sem dica. Acertos com pista ajudaram a orientar o ensino, mas não liberaram pulo sozinhos.
            {analysis.reinforcements.length > 0 ? ` Você acertou ${analysis.strengths.join(", ").toLowerCase()}, mas precisa reforçar ${analysis.reinforcements.join(", ").toLowerCase()}.` : " Você demonstrou equilíbrio nas áreas principais."}
          </p>
          {analysis.decisionReasons.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm leading-5 text-ink-soft">
              {analysis.decisionReasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs font-medium text-ink-faint">
            Você pode refazer o teste depois, quando quiser reposicionar sua jornada.
          </p>
        </div>

        {(analysis.essentialMissed.length > 0 || analysis.essentialHinted.length > 0) && (
          <div className="mt-3 rounded-2xl border border-accent-soft bg-accent-soft/50 px-4 py-3 text-sm leading-6 text-accent">
            Item essencial errado ou acertado com dica não conta como domínio total. Por isso o pulo foi limitado.
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Pontos fortes</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.strengths.map((item) => <Pill key={item} tone="good">{item}</Pill>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Pontos a reforçar</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.reinforcements.map((item) => <Pill key={item} tone="accent">{item}</Pill>)}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-surface-2 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Prova dos fundamentos
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.foundationProofs.map((proof) => (
              <Pill key={proof.lessonId} tone={proof.proven ? "good" : "muted"}>
                {proof.proven ? "provou" : "revisar"} · {proof.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Entrada recomendada</div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {entryPoint?.unitTitle ?? targetLesson?.title ?? "Início da jornada"}
            </div>
            {entryPoint && <div className="text-xs text-ink-soft">{entryPoint.phaseTitle}</div>}
          </div>
          <div className="rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Lições liberadas</div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {skippedCount} {skippedCount === 1 ? "lição anterior" : "lições anteriores"}
            </div>
            <div className="text-xs text-ink-soft">Sem pular revisão essencial de forma agressiva.</div>
          </div>
        </div>

        {analysis.foundationLessonIdsRequired.length > 0 && (
          <div className="mt-4 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm leading-6 text-ink-soft">
            <div className="font-semibold text-ink">Aulas que não foram puladas</div>
            <div className="mt-2 grid gap-1.5">
              {requiredFoundationLessons.map((lesson) => (
                <div key={lesson.id} className="rounded-xl bg-surface px-3 py-2">
                  {lesson.title}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">
              Elas não foram marcadas como concluídas pelo teste porque exigem prova sem dica.
            </p>
          </div>
        )}

        {targetLesson && (
          <div className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft/60 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              Lição recomendada
            </div>
            <div className="mt-1 font-serif text-lg font-semibold text-ink">{targetLesson.title}</div>
          </div>
        )}

        {recommendedLessons.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Próximas lições
            </div>
            <div className="space-y-2">
              {recommendedLessons.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-accent shadow-card">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink">{lesson.title}</span>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-faint">
                    {skillLabel(lesson.skill)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-accent-soft px-4 py-3 text-center text-sm font-medium text-accent">
          +{rewardQi} Qi de boas-vindas pelo diagnóstico
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button size="lg" className="w-full" onClick={onFollowRecommended}>
            Seguir daqui
          </Button>
          <Button size="lg" variant="outline" className="w-full" onClick={onStartScratch}>
            Começar do zero
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ResultStat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-3 py-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
      <div className="text-[11px] text-ink-faint">{detail}</div>
    </div>
  );
}

function NameStep({
  name,
  onName,
}: {
  name: string;
  onName: (value: string) => void;
}) {
  const valid = name.trim().length >= 2;

  return (
    <div>
      <MascotPrompt prompt="Antes de começar sua jornada, preciso saber como te chamar." />
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-semibold text-ink">Como devemos te chamar?</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Vamos usar seu nome para personalizar sua jornada no Longyu.
        </p>
        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Primeiro nome</span>
          <input
            value={name}
            onChange={(event) => onName(event.target.value)}
            placeholder="Ex.: Matheus"
            className="mt-1 h-[52px] w-full rounded-2xl border border-line bg-surface px-4 text-lg text-ink outline-none transition focus:ring-2 focus:ring-accent/25"
            autoFocus
          />
        </label>
        <p className={["mt-2 text-xs font-medium", valid ? "text-[rgb(var(--good))]" : "text-ink-faint"].join(" ")}>
          {valid ? "Perfeito. Vamos usar esse nome no seu Longyu." : "Digite pelo menos 2 caracteres para continuar."}
        </p>
      </div>
    </div>
  );
}

function OptionalAccountStep({
  name,
  email,
  password,
  passwordConfirm,
  error,
  onEmail,
  onPassword,
  onPasswordConfirm,
  onSubmit,
  onSkip,
  disabled,
}: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  error: string | null;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onPasswordConfirm: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSkip: () => void;
  disabled: boolean;
}) {
  const canCreate = canCreateOptionalAccount(email, password, passwordConfirm);
  const cloudBackend = isSupabaseBackendEnabled();

  return (
    <div>
      <MascotPrompt
        prompt={
          cloudBackend
            ? `Tudo pronto, ${firstName(name)}. Quer criar sua conta na nuvem?`
            : `Tudo pronto, ${firstName(name)}. Agora você escolhe se quer preparar uma conta.`
        }
      />
      <form onSubmit={onSubmit} className="mx-auto max-w-xl rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          {cloudBackend ? "Conta na nuvem" : "Conta opcional"}
        </div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
          {cloudBackend ? "Criar sua conta?" : "Preparar uma conta?"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {cloudBackend
            ? "Crie com email e senha. Seu progresso passa a salvar na nuvem automaticamente — sem sincronização manual."
            : "Você pode preparar um email agora. Por enquanto, o app salva só um rascunho local para sincronização futura."}
        </p>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            placeholder="voce@email.com"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            placeholder="Mínimo de 6 caracteres"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Confirmar senha</span>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(event) => onPasswordConfirm(event.target.value)}
            placeholder="Repita a senha"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Idioma nativo</span>
            <input
              value="Português (Brasil)"
              readOnly
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Idioma alvo</span>
            <input
              value="Mandarim"
              readOnly
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none"
            />
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-ink-faint">
          {cloudBackend
            ? "A senha autentica com o Supabase e não fica salva neste aparelho."
            : "A senha é validada apenas nesta tela e não é salva. Data de nascimento não é solicitada."}
        </p>
        {(email || password || passwordConfirm) && !canCreate && (
          <p className="mt-2 text-xs font-medium text-ink-faint">
            {cloudBackend
              ? "Use um email válido e uma senha com pelo menos 6 caracteres. Para seguir sem conta, toque em “Deixar para depois”."
              : "Para preparar conta agora, use um email válido e uma senha com pelo menos 6 caracteres. Para seguir sem isso, toque em “Deixar para depois”."}
          </p>
        )}
        {error && <p className="mt-3 rounded-xl bg-wrong-soft px-3 py-2 text-sm font-medium text-wrong">{error}</p>}

        <Button type="submit" size="lg" disabled={disabled || !canCreate} className="mt-5 w-full">
          {disabled ? "Criando conta..." : cloudBackend ? "Criar conta" : "Preparar conta (mock local)"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={disabled} onClick={onSkip} className="mt-3 w-full">
          {disabled ? "Preparando sua jornada..." : "Deixar para depois"}
        </Button>
      </form>
    </div>
  );
}

type MobileMenuItem = {
  title: string;
  desc: string;
  icon: typeof IconStar;
  badge?: string;
  featured?: boolean;
  onClick: () => void;
};

type MobileMenuSectionData = {
  title: string;
  items: MobileMenuItem[];
};

function MobileProfileCard({
  name,
  email,
  authLabel,
  authTone,
  proLabel,
  proTone,
  isPremium,
  streak,
  xpTotal,
  points,
  charges,
  maxCharges,
  showCreateAccount,
  showPro,
  showSignOut,
  onCreateAccount,
  onPro,
  onSignOut,
}: {
  name: string;
  email?: string;
  authLabel: string;
  authTone: AccountStatusTone;
  proLabel?: string;
  proTone?: AccountStatusTone;
  isPremium: boolean;
  streak: number;
  xpTotal: number;
  points: number;
  charges: number;
  maxCharges: number;
  showCreateAccount: boolean;
  showPro: boolean;
  showSignOut?: boolean;
  onCreateAccount: () => void;
  onPro: () => void;
  onSignOut?: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-accent-soft bg-[linear-gradient(135deg,rgb(var(--surface)),rgb(var(--surface-2)))] p-4 shadow-lift">
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] border border-line bg-surface shadow-card">
          <Mascot size={70} variant={streak > 0 ? "celebrate" : "wave"} />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
            {initials(name)}
          </span>
        </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={authTone}>{authLabel}</Pill>
            {proLabel && <Pill tone={proTone ?? "gold"}>{proLabel}</Pill>}
            </div>
          <h1 className="mt-2 truncate font-serif text-2xl font-semibold leading-tight text-ink">{name}</h1>
          <p className="truncate text-xs text-ink-faint">{email || "Conta local neste dispositivo."}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <MobileProfileMetric label="Seq." value={String(streak)} icon={<IconFlame width={16} height={16} />} />
        <MobileProfileMetric label="XP" value={String(xpTotal)} icon={<IconTarget width={16} height={16} />} />
        <MobileProfileMetric label="Qi" value={String(points)} icon={<IconStar width={16} height={16} />} />
        <MobileProfileMetric
          label="Cargas"
          value={isPremium ? "∞" : `${charges}/${maxCharges}`}
          icon={<IconShield width={16} height={16} />}
        />
      </div>

      {(showCreateAccount || showPro || showSignOut) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {showCreateAccount && (
            <Button size="sm" className="w-full" onClick={onCreateAccount}>
              Criar conta com email
            </Button>
          )}
          {showPro && (
            <Button size="sm" variant="soft" className="w-full" onClick={onPro}>
              Ver Pro
            </Button>
          )}
          {showSignOut && onSignOut && (
            <Button
              size="sm"
              variant="outline"
              className="w-full border-wrong/30 font-semibold text-wrong sm:col-span-2"
              onClick={onSignOut}
            >
              Sair da conta
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function MobileProfileMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-2 py-2 text-center shadow-card">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </div>
      <div className="mt-1 truncate font-serif text-lg font-semibold leading-none text-ink">{value}</div>
      <div className="mt-0.5 truncate text-[10px] font-medium text-ink-faint">{label}</div>
    </div>
  );
}

function MobileMenuSection({ title, items }: MobileMenuSectionData) {
  return (
    <section>
      <h2 className="mb-2 font-serif text-lg font-semibold text-ink">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className={[
                "relative flex min-h-[100px] flex-col items-start rounded-xl border p-3 text-left shadow-none transition active:scale-[.99]",
                item.featured
                  ? "border-accent/35 bg-accent-soft/25"
                  : "border-line/70 bg-surface",
              ].join(" ")}
            >
              {item.badge && (
                <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {item.badge}
                </span>
              )}
              <span className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.featured ? "bg-accent text-white" : "bg-accent-soft text-accent"].join(" ")}>
                <Icon width={17} height={17} />
              </span>
              <span className="mt-2.5 block text-sm font-semibold leading-tight text-ink">{item.title}</span>
              <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{item.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MobileStats({ stats }: { stats: { label: string; value: string | number; icon: ReactNode }[] }) {
  return (
    <section>
      <h2 className="mb-2 font-serif text-lg font-semibold text-ink">Estatísticas</h2>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line/70 bg-surface p-3 shadow-none">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-faint">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                {stat.icon}
              </span>
              {stat.label}
            </div>
            <div className="mt-2 font-serif text-xl font-semibold leading-none text-ink">{stat.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilePulse({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-line bg-surface-2 px-3 py-4 text-center shadow-card">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-accent shadow-card">
        {icon}
      </div>
      <div className="mt-2 font-serif text-2xl font-semibold text-ink">{value}</div>
      <div className="text-[11px] font-medium text-ink-faint">{label}</div>
    </div>
  );
}

function StatTile({ icon, label, value, detail }: StatTileData) {
  return (
    <div className="rounded-[24px] border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</span>
        {label}
      </div>
      <div className="mt-4 font-serif text-3xl font-semibold leading-none text-ink">{value}</div>
      <div className="mt-2 text-xs leading-5 text-ink-soft">{detail}</div>
    </div>
  );
}

function EngineProfileCard({
  insight,
  learnedChars,
  learnedChunks,
  textsRead,
  onTrain,
}: {
  insight: EngineInsight;
  learnedChars: number;
  learnedChunks: number;
  textsRead: number;
  onTrain: () => void;
}) {
  const meta = DOMAIN_META[insight.track];
  const Icon = meta.icon;
  const recommendation = engineRecommendation(insight, { learnedChars, learnedChunks, textsRead });

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${meta.color}1a`, color: meta.color }}>
            <Icon width={22} height={22} />
          </span>
          <div>
            <h3 className="font-serif text-lg font-semibold text-ink">{meta.label}</h3>
            <p className="text-xs text-ink-faint">{engineLevel(insight.percent)}</p>
          </div>
        </div>
        <div className="text-right font-serif text-2xl font-semibold text-ink">{insight.percent}%</div>
      </div>

      <ProgressBar value={insight.percent} className="mt-4" />
      <p className="mt-3 min-h-[42px] text-sm leading-6 text-ink-soft">{recommendation}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-faint">
          {insight.completedLessons}/{insight.totalLessons} lições
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-faint">
          {insight.reviewedItems} domínios
        </span>
        {insight.dueItems > 0 && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
            {insight.dueItems} para revisar
          </span>
        )}
      </div>

      <Button className="mt-4 w-full" variant={insight.locked ? "outline" : "soft"} onClick={onTrain}>
        {insight.actionLabel} <IconChevron width={17} height={17} />
      </Button>
    </article>
  );
}

function HistoryRow({ icon, label, value, meta }: HistoryData) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-2 px-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-ink">{value}</div>
        <div className="mt-0.5 truncate text-xs text-ink-soft">{meta}</div>
      </div>
    </div>
  );
}

function engineLevel(percent: number): string {
  if (percent >= 80) return "Nível 4 · Autonomia";
  if (percent >= 60) return "Nível 3 · Consolidação";
  if (percent >= 35) return "Nível 2 · Construção";
  if (percent > 0) return "Nível 1 · Base ativa";
  return "Nível 0 · Primeiro contato";
}

function engineRecommendation(
  insight: EngineInsight,
  counts: { learnedChars: number; learnedChunks: number; textsRead: number }
): string {
  if (insight.locked) return insight.recommendation;
  if (insight.dueItems > 0) return insight.recommendation;
  if (insight.track === "som") return "Você está formando o ouvido. Treine 5 tons hoje.";
  if (insight.track === "fala") return counts.learnedChunks > 0
    ? `Fale 5 chunks para ganhar confiança. Você já ativou ${counts.learnedChunks}.`
    : "Fale 5 chunks para ganhar confiança.";
  if (insight.track === "hanzi") return `Você já reconhece ${counts.learnedChars} ${counts.learnedChars === 1 ? "caractere" : "caracteres"}.`;
  return counts.textsRead > 0
    ? `Você já leu ${counts.textsRead} ${counts.textsRead === 1 ? "microtexto" : "microtextos"}. Leia 1 hoje para reforçar.`
    : "Leia 1 microtexto para reforçar.";
}

function AccountRow({
  account,
  active,
  onClick,
}: {
  account: LearningAccount;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <div
        className={[
          "flex items-center justify-between rounded-2xl border px-4 py-3 transition",
          active ? "border-accent bg-accent-soft/70" : "border-line bg-surface-2 hover:bg-surface",
        ].join(" ")}
      >
        <div>
          <div className="font-medium text-ink">{account.name}</div>
          <div className="text-xs text-ink-faint">
            {account.completedLessons.length} lições · {account.points} Qi · {Object.keys(account.srs).length} revisões
          </div>
        </div>
        {active && <span className="text-xs font-semibold text-accent">ativa</span>}
      </div>
    </button>
  );
}
