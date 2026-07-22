import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DOMAIN_META, type DomainTrack } from "../../data/domains";
import { ALL_LESSONS, FOUNDATION_LESSON_IDS, JOURNEY, type Lesson } from "../../data/journey";
import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { engineInsights, type EngineInsight } from "../../lib/engineIntelligence";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import {
  useStore,
  type AuthMode,
  type CloudSyncState,
  type LearningAccount,
  type PlacementLevel,
  type PlacementResult,
  type RewardHistoryEntry,
} from "../../lib/store";
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
import { ProfileDetailsFields } from "../../components/auth/ProfileDetailsFields";
import { FriendsProfileCard } from "../../components/social/FriendsProfileCard";
import { canRegisterWithCredentials } from "../../lib/authForm";
import { activeLearningRepository } from "../../lib/repositories/learningRepository";
import { validateProgressSnapshot } from "../../lib/progressSnapshot";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { buildPrivacyExportBundle, requestAccountDeletion } from "../../services/privacyService";
import {
  createAccount as createAuthAccount,
} from "../../services/authService";
import type { ProfileDetails } from "../../services/profileTypes";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { useIsPro } from "../../lib/proAccess";
import { isDevPreviewAllowed } from "../../lib/entitlements";
import { subscriptionGrantsPro } from "../../services/entitlementService";
import { EconomyExplainer } from "../../components/economy/EconomyExplainer";
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
  quizQuestion("adv-zhongguo-pinyin", "sound", "noHelp", "Sem dica: qual é o pin…34278 tokens truncated…de começar sua jornada, preciso saber como te chamar." />
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
  birthDate,
  country,
  marketingOptIn,
  signupSource,
  hideSignupSource,
  error,
  onEmail,
  onPassword,
  onPasswordConfirm,
  onBirthDate,
  onCountry,
  onMarketingOptIn,
  onSignupSource,
  onSubmit,
  onSkip,
  disabled,
}: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;
  country: string;
  marketingOptIn: boolean;
  signupSource: string;
  hideSignupSource?: boolean;
  error: string | null;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onPasswordConfirm: (value: string) => void;
  onBirthDate: (value: string) => void;
  onCountry: (value: string) => void;
  onMarketingOptIn: (value: boolean) => void;
  onSignupSource: (value: string) => void;
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

        <div className="mt-3">
          <ProfileDetailsFields
            birthDate={birthDate}
            country={country}
            marketingOptIn={marketingOptIn}
            signupSource={signupSource}
            onBirthDate={onBirthDate}
            onCountry={onCountry}
            onMarketingOptIn={onMarketingOptIn}
            onSignupSource={onSignupSource}
            showSignupSource={!hideSignupSource}
          />
        </div>

        <p className="mt-3 text-xs leading-5 text-ink-faint">
          {cloudBackend
            ? "Nome, país e preferências ficam no seu perfil na nuvem. A senha autentica com o Supabase e não é salva neste aparelho."
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
