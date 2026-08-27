import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import { Mascot } from "../../components/brand/Mascot";
import { BrandWordmark } from "../../components/layout/Brand";
import { GlossText } from "../../components/hanzi/GlossText";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { IconCheck, IconChevron } from "../../components/ui/Icon";
import { ProfileDetailsFields } from "../../components/auth/ProfileDetailsFields";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { KeyboardShortcutHint, ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { canRegisterWithCredentials } from "../../lib/authForm";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../../lib/auth/localAuthPolicy";
import { confirmEmailPath, storePendingConfirmEmail } from "../../lib/authRedirect";
import { getCloudUserId } from "../../lib/auth/cloudSession";
import { canEnterJourney, resolveSessionAudience } from "../../lib/auth/sessionAudience";
import { finalizeOnboardingPath } from "../../lib/auth/publicRoutes";
import { createAccount as createAuthAccount } from "../../services/authService";
import { completeAuthenticatedOnboarding } from "../../services/postAuthOnboarding";
import { trackFunnelEvent } from "../../services/funnelEvents";
import { LAUNCH_COUNTRY_CODE } from "../../lib/i18n/identity";
import {
  CATEGORY_LABEL,
  appendPendingAnswer,
  assessmentTier,
  chooseNextQuestion,
  createPendingPlacement,
  evaluatePlacementEvidence,
  quizDifficulty,
  readPendingPlacement,
  shouldStopPlacement,
  writePendingPlacement,
  type Experience,
  type PlacementAnalysis,
  type QuizQuestion,
} from "../../lib/placement";
import { ALL_LESSONS, JOURNEY } from "../../data/journey";

type FunnelStep = "welcome" | "goal" | "level" | "quiz" | "result" | "account";

const GOAL_OPTIONS = [
  { id: "travel", icon: "✈", label: "Preparar uma viagem" },
  { id: "study", icon: "📚", label: "Apoiar meus estudos" },
  { id: "habit", icon: "🧠", label: "Usar melhor meu tempo" },
  { id: "career", icon: "💼", label: "Crescer na carreira" },
  { id: "people", icon: "🤝", label: "Conversar com pessoas" },
  { id: "hanzi", icon: "字", label: "Ler caracteres chineses" },
];

const EXPERIENCE_OPTIONS: Array<{ id: Experience; icon: string; label: string; desc: string }> = [
  { id: "zero", icon: "▂", label: "Nunca estudei mandarim.", desc: "Você começa pela base essencial, mesmo se fizer o teste rápido." },
  { id: "words", icon: "▂▅", label: "Sei algumas palavras.", desc: "Reconheço coisas como olá, obrigado ou alguns números." },
  { id: "studied", icon: "▂▅▇", label: "Já estudei o básico.", desc: "Vi pinyin, tons ou frases curtas, mas ainda preciso consolidar." },
  { id: "phrases", icon: "▂▅▇", label: "Consigo ler pinyin e frases simples.", desc: "Entendo frases simples sem glossário completo." },
  { id: "advanced", icon: "▂▅▇█", label: "Já sei hànzì e tons básicos.", desc: "Quero provar leitura, áudio, tons, hànzì e produção." },
];

const STEPS: FunnelStep[] = ["welcome", "goal", "level", "quiz", "result", "account"];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "aluno";
}

function containsCjkText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function quizLayerLabel(question: QuizQuestion): string {
  if (question.withClue) return "Com pista";
  const tier = assessmentTier(question);
  if (tier === "A") return "Com apoio";
  if (tier === "E") return "Produção guiada";
  if (tier === "D") return "Áudio e tom";
  if (tier === "C") return "Frase nova";
  return "Sem ajuda";
}

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

function lessonTitle(lessonId: string): string {
  return ALL_LESSONS.find((lesson) => lesson.id === lessonId)?.title ?? lessonId;
}

export function ComecarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<FunnelStep>("welcome");
  const [goal, setGoal] = useState<string>();
  const [experience, setExperience] = useState<Experience>();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<string>();
  const [hinted, setHinted] = useState(false);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState(LAUNCH_COUNTRY_CODE);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [signupSource, setSignupSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);

  const pending = readPendingPlacement();
  const analysis: PlacementAnalysis | null = useMemo(() => {
    if (!pending?.answers.length || !pending.declaredExperience) return null;
    return evaluatePlacementEvidence(pending.declaredExperience, pending.answers);
  }, [pending?.answers, pending?.declaredExperience, step]);

  useEffect(() => {
    trackFunnelEvent("onboarding_started");
    if (searchParams.get("migrate") === "1") {
      setStep("account");
    }
    void getCloudUserId().then(setCloudUserId);
  }, [searchParams]);

  function startQuiz(level: Experience) {
    const session = createPendingPlacement({ declaredExperience: level, goal: goal ?? null });
    const nextQuestion = chooseNextQuestion(level, [], []);
    if (!nextQuestion) return;
    session.askedQuestionIds = [nextQuestion.id];
    writePendingPlacement(session);
    setAskedIds([nextQuestion.id]);
    setQuestion(nextQuestion);
    setPicked(undefined);
    setHinted(false);
    setStep("quiz");
    trackFunnelEvent("self_assessment_selected", { experience: level });
    trackFunnelEvent("placement_started", { experience: level });
  }

  function answerCurrent() {
    if (!question || !picked || !experience) return;
    const session = readPendingPlacement() ?? createPendingPlacement({ declaredExperience: experience, goal: goal ?? null });
    const nextAsked = askedIds.includes(question.id) ? askedIds : [...askedIds, question.id];
    const updated = appendPendingAnswer(
      session,
      { questionId: question.id, answer: picked, hintUsed: hinted, responseMode: "choice", at: Date.now() },
      nextAsked
    );
    trackFunnelEvent("placement_question_answered", {
      questionId: question.id,
      hintUsed: hinted,
      dimension: question.category,
    });
    if (shouldStopPlacement(experience, updated.answers)) {
      trackFunnelEvent("placement_completed", { questions: updated.answers.length });
      setStep("result");
      return;
    }
    const nextQuestion = chooseNextQuestion(experience, updated.answers, nextAsked);
    if (!nextQuestion) {
      trackFunnelEvent("placement_completed", { questions: updated.answers.length });
      setStep("result");
      return;
    }
    const asked = [...nextAsked, nextQuestion.id];
    writePendingPlacement({ ...updated, askedQuestionIds: asked });
    setAskedIds(asked);
    setQuestion(nextQuestion);
    setPicked(undefined);
    setHinted(false);
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    if (busy || name.trim().length < 2) return;
    if (!canRegisterWithCredentials(email, password, passwordConfirm)) {
      setError("Use um email válido e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    trackFunnelEvent("signup_submitted");
    if (!isSupabaseBackendEnabled()) {
      setError(BACKEND_UNAVAILABLE_MESSAGE);
      setBusy(false);
      return;
    }
    const result = await createAuthAccount(email, password, {
      name: firstName(name),
      birthDate: birthDate.trim() || null,
      country: country.trim() || null,
      signupSource: signupSource.trim() || null,
      marketingOptIn,
      onboardingCompleted: false,
    });
    if (result.status === "error" || result.status === "not_implemented") {
      const infra = /criar a conta agora|conectar ao Longyu|indisponível|failed to fetch|network|timeout|ainda não estão ativas/i;
      setError(infra.test(result.message) ? BACKEND_UNAVAILABLE_MESSAGE : result.message || BACKEND_UNAVAILABLE_MESSAGE);
      setBusy(false);
      return;
    }
    storePendingConfirmEmail(email);
    trackFunnelEvent("email_confirmation_pending");
    navigate(confirmEmailPath(email));
  }

  async function handleAuthenticatedPlacementSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await completeAuthenticatedOnboarding({
      placement: readPendingPlacement(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message || BACKEND_UNAVAILABLE_MESSAGE);
      return;
    }
    navigate("/jornada", { replace: true });
  }

  const index = STEPS.indexOf(step);
  const progress = Math.max(1, index + 1);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh_-_3rem)] w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 pb-4 sm:pb-6">
        <button
          type="button"
          onClick={() => {
            if (step === "welcome") {
              navigate("/");
              return;
            }
            const current = STEPS.indexOf(step);
            const previous = STEPS[current - 1];
            if (previous && previous !== "quiz") setStep(previous);
            if (previous === "level") setStep("level");
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink-faint transition hover:bg-surface-2"
          aria-label="Voltar"
        >
          ←
        </button>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Progresso da configuração"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(progress / STEPS.length) * 100}%` }}
          />
        </div>
        <BrandWordmark className="text-lg" />
      </header>

      <div className="flex flex-1 flex-col justify-start pt-4 sm:pt-8">
        {step === "welcome" && (
          <Welcome
            onStart={() => {
              setStep("goal");
            }}
          />
        )}
        {step === "goal" && (
          <ChoiceGrid
            prompt="Por que você quer aprender mandarim?"
            choices={GOAL_OPTIONS}
            value={goal}
            onPick={(id) => {
              setGoal(id);
              trackFunnelEvent("goal_selected", { goal: id });
            }}
          />
        )}
        {step === "level" && (
          <ChoiceGrid
            prompt="Quanto mandarim você já sabe?"
            choices={EXPERIENCE_OPTIONS}
            value={experience}
            onPick={(id) => setExperience(id as Experience)}
          />
        )}
        {step === "quiz" && question && experience && (
          <QuizCard
            index={Math.max(0, askedIds.indexOf(question.id))}
            total={Math.max(askedIds.length, 1)}
            question={question}
            declaredLevel={experience}
            picked={picked}
            onPick={setPicked}
            onSubmit={answerCurrent}
            onUseHint={() => setHinted(true)}
          />
        )}
        {step === "result" && analysis && (
          <ResultPreview
            analysis={analysis}
            authenticated={Boolean(cloudUserId)}
            busy={busy}
            error={error}
            onContinue={() => {
              trackFunnelEvent("placement_result_viewed");
              if (cloudUserId) {
                void handleAuthenticatedPlacementSave();
                return;
              }
              trackFunnelEvent("signup_started");
              setStep("account");
            }}
          />
        )}
        {step === "account" && (
          <MandatoryAccount
            name={name}
            email={email}
            password={password}
            passwordConfirm={passwordConfirm}
            birthDate={birthDate}
            country={country}
            marketingOptIn={marketingOptIn}
            signupSource={signupSource}
            error={error}
            busy={busy}
            onName={setName}
            onEmail={setEmail}
            onPassword={setPassword}
            onPasswordConfirm={setPasswordConfirm}
            onBirthDate={setBirthDate}
            onCountry={setCountry}
            onMarketingOptIn={setMarketingOptIn}
            onSignupSource={setSignupSource}
            onSubmit={handleSignup}
          />
        )}
      </div>

      {step !== "welcome" && step !== "quiz" && step !== "result" && step !== "account" && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-6">
          <Button
            size="lg"
            className="w-full"
            disabled={step === "goal" ? !goal : !experience}
            onClick={() => {
              if (step === "goal" && goal) setStep("level");
              else if (step === "level" && experience) startQuiz(experience);
            }}
          >
            Continuar <IconChevron width={18} height={18} />
          </Button>
        </div>
      )}
      {step === "quiz" && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-6">
          <Button size="lg" className="w-full" disabled={!picked} onClick={answerCurrent}>
            Confirmar <IconChevron width={18} height={18} />
          </Button>
        </div>
      )}
      {searchParams.get("intent") === "subscribe" ? (
        <p className="sr-only">Depois da conta você volta para o plano Pro.</p>
      ) : null}
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-2">
      <div className="flex justify-center">
        <Mascot size={224} variant="celebrate" />
      </div>
      <div className="text-center md:text-left">
        <BrandWordmark className="mx-auto block text-3xl md:mx-0" />
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Primeiro o Longyu encontra seu ponto de partida.
        </h1>
        <p className="mt-3 text-ink-soft">
          Um teste curto, depois você cria a conta para salvar o resultado. Sem conta local.
        </p>
        <Button size="lg" onClick={onStart} className="mt-6 w-full md:w-auto">
          Começar <IconChevron width={18} height={18} />
        </Button>
      </div>
    </div>
  );
}

function ChoiceGrid<T extends string>({
  prompt,
  choices,
  value,
  onPick,
}: {
  prompt: string;
  choices: Array<{ id: T | string; icon: string; label: string; desc?: string }>;
  value?: string;
  onPick: (id: T) => void;
}) {
  return (
    <div>
      <MascotPrompt prompt={prompt} />
      <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const active = value === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onPick(choice.id as T)}
              aria-pressed={active}
              className={[
                "group flex min-h-[76px] items-center gap-4 rounded-2xl border px-5 py-4 text-left shadow-card transition",
                active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface hover:-translate-y-0.5",
              ].join(" ")}
            >
              <span className={["flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl", active ? "bg-accent text-white" : "bg-surface-2"].join(" ")}>
                {choice.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{choice.label}</span>
                {choice.desc && <span className="mt-0.5 block text-sm text-ink-soft">{choice.desc}</span>}
              </span>
              <span className={["flex h-6 w-6 items-center justify-center rounded-full border", active ? "border-accent bg-accent text-white" : "border-line text-transparent"].join(" ")}>
                <IconCheck width={15} height={15} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
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

function QuizText({ value, onUseHint, allowHints, className = "" }: { value: string; onUseHint: () => void; allowHints: boolean; className?: string }) {
  if (!containsCjkText(value)) return <span className={className}>{formatPinyinForDisplay(value)}</span>;
  if (!allowHints) return <GlossText examMode text={value} className={className} />;
  return <GlossText text={value} speakOnClick={false} onHintOpen={onUseHint} className={className} />;
}

function QuizCard({
  index,
  total: _total,
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
      <MascotPrompt prompt={`Pergunta ${index + 1}`} />
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {CATEGORY_LABEL[question.category]}
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {difficulty === 1 ? "Base" : difficulty === 2 ? "Fase atual" : difficulty === 3 ? "Sondagem" : "Avançada"}
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
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
          <div className="mt-4 rounded-[24px] border border-line bg-surface-2 px-4 py-5">
            <QuizText value={question.stimulus} onUseHint={onUseHint} allowHints={allowHints} className="text-5xl font-semibold text-ink" />
          </div>
        )}
        <p className="mx-auto mt-3 max-w-sm text-xs text-ink-faint">
          {allowHints ? "Acerto com dica ajuda o diagnóstico, mas não prova domínio." : "Sem dica nesta pergunta."}
        </p>
        <KeyboardShortcutHint />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => {
            const active = picked === option;
            const shortcut = shortcutKeyForIndex(optionIndex);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onPick(option)}
                aria-pressed={active}
                className={["relative rounded-2xl border px-5 py-4 text-left font-medium shadow-card", active ? "border-accent bg-accent-soft" : "border-line bg-surface"].join(" ")}
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

function ResultPreview({
  analysis,
  onContinue,
  authenticated = false,
  busy = false,
  error = null,
}: {
  analysis: PlacementAnalysis;
  onContinue: () => void;
  authenticated?: boolean;
  busy?: boolean;
  error?: string | null;
}) {
  const entry = entryPointForLesson(analysis.placement.targetLessonId);
  return (
    <div>
      <MascotPrompt prompt="Encontramos seu ponto de partida." />
      <div className="mx-auto max-w-2xl rounded-[28px] border border-line bg-surface p-6 shadow-lift">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Ponto de partida recomendado</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{analysis.placement.label}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{analysis.resultMessage}</p>
        <p className="mt-2 text-sm font-medium text-ink">
          {entry?.phaseTitle ?? "Jornada"} {entry?.unitTitle ? `· ${entry.unitTitle}` : ""} · {lessonTitle(analysis.placement.targetLessonId)}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label="Confiança da avaliação" value={`${Math.round(analysis.placementConfidence * 100)}%`} />
          <Stat label="Perguntas" value={String(analysis.questionsAnswered)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label="Pontos fortes" value={analysis.strengths.join(", ") || "Vamos descobrir juntos"} />
          <Stat label="Áreas que vamos construir" value={analysis.reinforcements.join(", ") || "Base essencial"} />
        </div>
        {error && (
          <p className="mt-4 rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong">
            {error}
          </p>
        )}
        <Button size="lg" className="mt-6 w-full" onClick={onContinue} data-testid="create-account-cta" disabled={busy}>
          {authenticated
            ? busy
              ? "Salvando..."
              : "Salvar ponto de partida"
            : "Criar minha conta e salvar o resultado"}
        </Button>
        {!authenticated && (
          <Link
            to="/login?next=/jornada"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-accent hover:underline"
          >
            Já tenho uma conta
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function MandatoryAccount({
  name,
  email,
  password,
  passwordConfirm,
  birthDate,
  country,
  marketingOptIn,
  signupSource,
  error,
  busy,
  onName,
  onEmail,
  onPassword,
  onPasswordConfirm,
  onBirthDate,
  onCountry,
  onMarketingOptIn,
  onSignupSource,
  onSubmit,
}: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;
  country: string;
  marketingOptIn: boolean;
  signupSource: string;
  error: string | null;
  busy: boolean;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onPasswordConfirm: (value: string) => void;
  onBirthDate: (value: string) => void;
  onCountry: (value: string) => void;
  onMarketingOptIn: (value: boolean) => void;
  onSignupSource: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const cloud = isSupabaseBackendEnabled();
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Conta obrigatória</div>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Crie sua conta para salvar o resultado</h1>
      <p className="mt-2 text-sm text-ink-soft">
        O teste já está pronto neste dispositivo. Depois da confirmação do email, o Longyu grava o nivelamento na sua conta.
      </p>
      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Nome</span>
        <input value={name} onChange={(event) => onName(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-line px-4" placeholder="Ex.: Matheus" />
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Email</span>
        <input type="email" value={email} onChange={(event) => onEmail(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-line px-4" placeholder="voce@email.com" />
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Senha</span>
        <input type="password" value={password} onChange={(event) => onPassword(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-line px-4" />
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Confirmar senha</span>
        <input type="password" value={passwordConfirm} onChange={(event) => onPasswordConfirm(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-line px-4" />
      </label>
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
          showSignupSource
        />
      </div>
      {error && <p className="mt-3 rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm text-wrong">{error}</p>}
      {!cloud && (
        <p className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-soft">{BACKEND_UNAVAILABLE_MESSAGE}</p>
      )}
      <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || name.trim().length < 2}>
        {busy ? "Criando conta..." : "Criar minha conta e salvar o resultado"}
      </Button>
      <Link to="/login" className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-accent hover:underline">
        Já tenho uma conta
      </Link>
    </form>
  );
}

export function ComecarRoute() {
  const [searchParams] = useSearchParams();
  const redo = searchParams.get("refazer") === "1" || searchParams.get("migrate") === "1";
  const [audience, setAudience] = useState<"pending" | "stay" | "jornada" | "finalize">("pending");

  useEffect(() => {
    let cancelled = false;
    void resolveSessionAudience().then((next) => {
      if (cancelled) return;
      if (canEnterJourney(next)) {
        setAudience("jornada");
        return;
      }
      if (next === "cloud_pending_onboarding" && !redo) {
        setAudience("finalize");
        return;
      }
      setAudience("stay");
    });
    return () => {
      cancelled = true;
    };
  }, [redo]);

  if (audience === "pending") {
    return <div className="min-h-[40vh]" aria-hidden="true" />;
  }
  if (audience === "jornada") {
    return <Navigate to="/jornada" replace />;
  }
  if (audience === "finalize") {
    return <Navigate to={finalizeOnboardingPath()} replace />;
  }
  return <ComecarPage />;
}
