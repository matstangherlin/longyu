import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import { Mascot } from "../../components/brand/Mascot";
import { BrandWordmark } from "../../components/layout/Brand";
import { playMandarinAudio } from "../../lib/audioPlayback";
import { IconCheck, IconChevron, IconSound } from "../../components/ui/Icon";
import { ProfileDetailsFields } from "../../components/auth/ProfileDetailsFields";
import { PasswordField, PasswordRequirements } from "../../components/auth/PasswordField";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { canRegisterWithCredentials, isValidEmail } from "../../lib/authForm";
import { checkUsername, storePendingUsername, USERNAME_REJECTION_KEY } from "../../lib/username";
import type { MessageKey } from "../../locales/pt-BR";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../../lib/auth/localAuthPolicy";
import { confirmEmailPath, storePendingConfirmEmail } from "../../lib/authRedirect";
import { getCloudUserId } from "../../lib/auth/cloudSession";
import { canEnterJourney, resolveSessionAudience } from "../../lib/auth/sessionAudience";
import { finalizeOnboardingPath } from "../../lib/auth/publicRoutes";
import { createAccount as createAuthAccount } from "../../services/authService";
import { completeAuthenticatedOnboarding } from "../../services/postAuthOnboarding";
import { trackFunnelEvent } from "../../services/funnelEvents";
import { CourseDirectionChip } from "../../components/i18n/CourseDirectionChip";
import { hasCourseDirection } from "../../lib/courseDirectionState";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";
import { localizeLessonTitle } from "../../i18n/overlays/localizeLesson";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import { LAUNCH_COUNTRY_CODE } from "../../lib/i18n/identity";
import { stableOptionPermutation } from "../../lib/stableOptionPermutation";
import {
  appendPendingAnswer,
  MAX_QUIZ_LENGTH,
  chooseNextQuestion,
  createPendingPlacement,
  evaluatePlacementEvidence,
  readPendingPlacement,
  shouldStopPlacement,
  writePendingPlacement,
  type Experience,
  type PlacementAnalysis,
  type QuizCategory,
  type QuizQuestion,
} from "../../lib/placement";
import { isCanonicalOptionId } from "../../lib/placement/optionIdentity";
import {
  localizedPlacementHeading,
  localizedPlacementMessage,
  placementGlossKey,
  placementOptionLabel,
  placementPrompt,
} from "../../lib/placement/uiCopy";
import { ALL_LESSONS, JOURNEY } from "../../data/journey";
import {
  readOnboardingDraft,
  writeOnboardingDraft,
  type DailyGoalMinutes,
  type OnboardingPath,
} from "../../lib/onboardingDraft";

/**
 * RC2.2.17 · AG–AP — UM fluxo de onboarding.
 *
 *   Iniciante:   curso → Teste guiado → meta diária → conta → Jornada
 *   Experiente:  curso → "Já estudo" → meta diária → [Teste de nível | Começar do início] → conta
 *
 * O quiz de placement (motor, evidência, commit no servidor, banco de
 * perguntas) continua intacto; só deixou de ser caminho OBRIGATÓRIO do
 * iniciante. Cada coisa é perguntada uma vez: curso (picker), meta diária
 * (CANONICAL_DAILY_GOAL_STEP) e nível (só para quem escolheu o teste).
 */
type FunnelStep = "welcome" | "dailyGoal" | "placementOffer" | "level" | "quiz" | "result" | "account";

/** RC2.2.17 · AI — a etapa canônica de meta diária deste app. */
export const CANONICAL_DAILY_GOAL_STEP = "dailyGoal" as const;

const DAILY_GOAL_CHOICES: Array<{ minutes: DailyGoalMinutes; labelKey: MessageKey }> = [
  { minutes: 5, labelKey: "onboarding.dailyGoalLight" },
  { minutes: 10, labelKey: "onboarding.dailyGoalSteady" },
  { minutes: 15, labelKey: "onboarding.dailyGoalFocused" },
  { minutes: 20, labelKey: "onboarding.dailyGoalIntense" },
];

/** Quem já estuda escolhe o próprio nível; "do zero" nunca entra no teste. */
const EXPERIENCE_OPTIONS: Array<{ id: Experience; icon: string; labelKey: string; descKey: string }> = [
  { id: "words", icon: "▂▅", labelKey: "onboarding.expWords", descKey: "onboarding.expWordsDesc" },
  { id: "studied", icon: "▂▅▇", labelKey: "onboarding.expStudied", descKey: "onboarding.expStudiedDesc" },
  { id: "phrases", icon: "▂▅▇", labelKey: "onboarding.expPhrases", descKey: "onboarding.expPhrasesDesc" },
  { id: "advanced", icon: "▂▅▇█", labelKey: "onboarding.expAdvanced", descKey: "onboarding.expAdvancedDesc" },
];

function stepsFor(path: OnboardingPath | null, wantsPlacement: boolean): FunnelStep[] {
  if (path === "experienced" && wantsPlacement) return ["welcome", "dailyGoal", "placementOffer", "level", "quiz", "result", "account"];
  if (path === "experienced") return ["welcome", "dailyGoal", "placementOffer", "account"];
  // Iniciante: o Teste guiado (outra rota) fica entre "welcome" e a meta.
  return ["welcome", "dailyGoal", "account"];
}

function firstName(name: string, fallback: string): string {
  return name.trim().split(/\s+/)[0] || fallback;
}

function containsCjkText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function categoryLabel(category: QuizCategory, t: (key: string) => string): string {
  const keys: Record<QuizCategory, string> = {
    meaning: "placement.categoryMeaning",
    sound: "placement.categorySound",
    tone: "placement.categoryTone",
    hanzi: "placement.categoryHanzi",
    sentence: "placement.categorySentence",
    context: "placement.categoryContext",
    speaking: "placement.categorySpeaking",
  };
  return t(keys[category]);
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

function lessonTitle(lessonId: string, locale?: "pt-BR" | "en"): string {
  const title = ALL_LESSONS.find((lesson) => lesson.id === lessonId)?.title ?? lessonId;
  return localizeLessonTitle(title, locale);
}

export function ComecarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // RC2.2.17 · AT — quem terminou o Teste guiado cai direto na meta diária.
  const [draft] = useState(() => readOnboardingDraft());
  const [path, setPath] = useState<OnboardingPath | null>(() => (draft.guidedTryCompleted ? "beginner" : draft.path));
  const [step, setStep] = useState<FunnelStep>(() => (draft.guidedTryCompleted ? "dailyGoal" : "welcome"));
  const [dailyGoal, setDailyGoal] = useState<DailyGoalMinutes | null>(() => draft.dailyGoalMinutes);
  const [wantsPlacement, setWantsPlacement] = useState(false);
  const goal: string | undefined = undefined;
  const [experience, setExperience] = useState<Experience>();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<string>();
  const [hinted, setHinted] = useState(false);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
    if (!nextQuestion) {
      setQuestion(null);
      setStep("quiz");
      return;
    }
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

  /**
   * RC2.2.17 · DX — o áudio da pergunta não tocou por causa do APARELHO:
   * a pergunta sai sem resposta (TECHNICAL_SKIP), nunca conta como erro.
   */
  function skipTechnical() {
    if (!question || !experience) return;
    const session = readPendingPlacement() ?? createPendingPlacement({ declaredExperience: experience, goal: goal ?? null });
    const nextAsked = askedIds.includes(question.id) ? askedIds : [...askedIds, question.id];
    trackFunnelEvent("placement_question_answered", { questionId: question.id, hintUsed: false, dimension: question.category, technicalSkip: true });
    const nextQuestion = chooseNextQuestion(experience, session.answers, nextAsked);
    if (!nextQuestion || shouldStopPlacement(experience, session.answers)) {
      writePendingPlacement({ ...session, askedQuestionIds: nextAsked });
      if (session.answers.length === 0) {
        setStep("placementOffer");
        return;
      }
      setStep("result");
      return;
    }
    const asked = [...nextAsked, nextQuestion.id];
    writePendingPlacement({ ...session, askedQuestionIds: asked });
    setAskedIds(asked);
    setQuestion(nextQuestion);
    setPicked(undefined);
    setHinted(false);
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
    const usernameCheck = checkUsername(username);
    if (!usernameCheck.ok) {
      setError(t(USERNAME_REJECTION_KEY[usernameCheck.reason] as MessageKey));
      return;
    }
    if (!canRegisterWithCredentials(email, password, passwordConfirm)) {
      setError(t("onboarding.invalidEmailPassword"));
      return;
    }
    setBusy(true);
    setError(null);
    trackFunnelEvent("signup_submitted");
    if (!isSupabaseBackendEnabled()) {
      setError(t("errors.backendUnavailable"));
      setBusy(false);
      return;
    }
    const result = await createAuthAccount(email, password, {
      name: firstName(name, t("onboarding.learnerFallback")),
      birthDate: birthDate.trim() || null,
      country: country.trim() || null,
      signupSource: signupSource.trim() || null,
      marketingOptIn,
      onboardingCompleted: false,
    });
    if (result.status === "error" || result.status === "not_implemented") {
      const infra =
        /conectar ao Longyu|indisponível|failed to fetch|network|timeout|ainda não estão ativas|could not reach longyu|real accounts are not active/i;
      const raw = result.message || BACKEND_UNAVAILABLE_MESSAGE;
      setError(infra.test(raw) ? t("errors.backendUnavailable") : localizeUserMessage(raw) || t("onboarding.signupHandoffFailed"));
      setBusy(false);
      return;
    }
    // Username fica pendente neste aparelho e vira "a confirmar" no primeiro
    // login (CODE_READY_AWAITING_CLOUD_APPLY) — nada de "disponível" falso.
    storePendingUsername(usernameCheck.username);
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
      setError(localizeUserMessage(result.message || BACKEND_UNAVAILABLE_MESSAGE) || t("onboarding.signupHandoffFailed"));
      return;
    }
    navigate("/jornada", { replace: true });
  }

  const STEPS = stepsFor(path, wantsPlacement);
  const index = STEPS.indexOf(step);
  const progress = Math.max(1, index + 1);

  function chooseDailyGoal(minutes: DailyGoalMinutes) {
    setDailyGoal(minutes);
    writeOnboardingDraft({ dailyGoalMinutes: minutes });
    trackFunnelEvent("daily_goal_selected", { minutes });
  }

  function afterDailyGoal() {
    if (!dailyGoal) return;
    if (path === "experienced") {
      setStep("placementOffer");
      return;
    }
    goToAccount();
  }

  function goToAccount() {
    if (cloudUserId) {
      void handleAuthenticatedPlacementSave();
      return;
    }
    trackFunnelEvent("signup_started");
    setStep("account");
  }

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
            if (previous === "quiz" || previous === "result") {
              setStep("level");
              return;
            }
            if (previous) setStep(previous);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink-faint transition hover:bg-surface-2"
          aria-label={t("onboarding.back")}
        >
          ←
        </button>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={t("onboarding.progress")}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(progress / STEPS.length) * 100}%` }}
          />
        </div>
        {/*
          Um seletor, e só. O header trazia também o wordmark, que o Welcome
          repetia logo abaixo em tamanho grande: duas marcas na mesma dobra
          pesam o topo sem dizer nada de novo. O Longyu segue no hero, onde
          ele é a primeira coisa que a pessoa lê.
        */}
        {/* RC2.2.14B — a interface segue o sistema e o curso já foi
            escolhido; aqui só se mostra o curso, com "Alterar" discreto. */}
        <CourseDirectionChip next="/comecar" />
      </header>

      <div className="flex flex-1 flex-col justify-start pt-4 sm:pt-8">
        {step === "welcome" && (
          <Welcome
            onBeginner={() => {
              // AN — "Estou começando do zero" → Teste guiado → meta → conta.
              setPath("beginner");
              writeOnboardingDraft({ path: "beginner" });
              trackFunnelEvent("self_assessment_selected", { experience: "zero" });
              navigate("/teste-guiado");
            }}
            onExperienced={() => {
              setPath("experienced");
              writeOnboardingDraft({ path: "experienced" });
              setStep("dailyGoal");
            }}
          />
        )}
        {step === "dailyGoal" && (
          <DailyGoalStep value={dailyGoal} onPick={chooseDailyGoal} />
        )}
        {step === "placementOffer" && (
          <PlacementOffer
            onTakeTest={() => {
              setWantsPlacement(true);
              setStep("level");
            }}
            onStartFromBeginning={() => {
              setWantsPlacement(false);
              goToAccount();
            }}
          />
        )}
        {step === "level" && (
          <ChoiceGrid
            prompt={t("onboarding.experiencePrompt")}
            choices={EXPERIENCE_OPTIONS.map((choice) => ({
              ...choice,
              label: t(choice.labelKey),
              desc: t(choice.descKey),
            }))}
            value={experience}
            onPick={(id) => setExperience(id as Experience)}
          />
        )}
        {step === "quiz" && !question && (
          <div className="mx-auto max-w-xl text-center" data-testid="placement-load-error">
            <h1 className="font-serif text-2xl font-semibold text-ink">{t("onboarding.loadError")}</h1>
            <p className="mt-3 text-sm text-ink-soft">{t("onboarding.networkRetry")}</p>
            <Button size="lg" className="mt-6 w-full" onClick={() => experience && startQuiz(experience)}>
              {t("onboarding.retry")}
            </Button>
          </div>
        )}
        {step === "quiz" && question && experience && (
          <QuizCard
            index={Math.max(0, askedIds.indexOf(question.id))}
            total={Math.max(askedIds.length, 1)}
            question={question}
            sessionSeed={String(pending?.startedAt ?? 0)}
            declaredLevel={experience}
            picked={picked}
            onPick={setPicked}
            onSubmit={answerCurrent}
            onUseHint={() => setHinted(true)}
            onTechnicalSkip={skipTechnical}
          />
        )}
        {step === "result" && !analysis && (
          <div className="mx-auto max-w-xl text-center" data-testid="placement-finish-error">
            <h1 className="font-serif text-2xl font-semibold text-ink">{t("onboarding.placementCouldNotFinish")}</h1>
            <Button size="lg" className="mt-6 w-full" onClick={() => setStep("level")}>
              {t("onboarding.retry")}
            </Button>
          </div>
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
            username={username}
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
            onUsername={setUsername}
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

      {(step === "dailyGoal" || step === "level") && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.25rem,var(--app-safe-bottom))] pt-6">
          <Button
            size="lg"
            className="longyu-press-feedback w-full"
            data-testid={step === "dailyGoal" ? "daily-goal-continue" : "level-continue"}
            disabled={step === "dailyGoal" ? !dailyGoal : !experience || busy}
            onClick={() => {
              if (step === "dailyGoal") afterDailyGoal();
              else if (step === "level" && experience) startQuiz(experience);
            }}
          >
            {t("onboarding.continue")} <IconChevron width={18} height={18} />
          </Button>
        </div>
      )}
      {step === "quiz" && question && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.25rem,var(--app-safe-bottom))] pt-6">
          <Button size="lg" className="w-full" disabled={!picked} onClick={answerCurrent}>
            {t("placement.confirm")} <IconChevron width={18} height={18} />
          </Button>
        </div>
      )}
      {searchParams.get("intent") === "subscribe" ? (
        <p className="sr-only">{t("onboarding.subscribeIntent")}</p>
      ) : null}
    </div>
  );
}

function Welcome({ onBeginner, onExperienced }: { onBeginner: () => void; onExperienced: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-2" data-testid="onboarding-welcome">
      <div className="flex justify-center">
        <Mascot size={224} variant="celebrate" />
      </div>
      <div className="text-center md:text-left">
        <BrandWordmark className="mx-auto block text-3xl md:mx-0" />
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          {t("onboarding.welcomeTitle")}
        </h1>
        <p className="mt-3 text-ink-soft">
          {t("onboarding.welcomeLead")}
        </p>
        {/*
          Aqui existia um cartão com "Aprender mandarim a partir de" mais um
          segunda pergunta de idioma e a linha "Idioma estudado: 中文". Os três
          saíram, e nada entrou no lugar — o espaço que sobra é o resultado,
          não um buraco a preencher.

          O seletor era a segunda pergunta de idioma da mesma tela. A linha do
          mandarim parecia um campo a decidir, sendo texto fixo: o Longyu de
          hoje ensina mandarim e só. Quando existir mais de um idioma-alvo,
          isso merece um fluxo próprio, não uma legenda preventiva na primeira
          tela de quem ainda não começou.
        */}
        <div className="mt-6 grid gap-2 md:max-w-sm">
          <Button size="lg" onClick={onBeginner} className="longyu-press-feedback w-full" data-testid="onboarding-path-beginner">
            {t("onboarding.pathBeginner")} <IconChevron width={18} height={18} />
          </Button>
          <Button size="lg" variant="outline" onClick={onExperienced} className="w-full" data-testid="onboarding-path-experienced">
            {t("onboarding.pathExperienced")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * RC2.2.17 · AI–AK — CANONICAL_DAILY_GOAL_STEP. Uma pergunta, quatro
 * opções, sem julgamento: a escolha vira a meta diária da conta.
 */
function DailyGoalStep({ value, onPick }: { value: DailyGoalMinutes | null; onPick: (minutes: DailyGoalMinutes) => void }) {
  const { t } = useTranslation();
  return (
    <div data-testid="daily-goal-step" data-canonical-step={CANONICAL_DAILY_GOAL_STEP}>
      <MascotPrompt prompt={t("onboarding.dailyGoalPrompt")} />
      <div className="mx-auto grid max-w-md gap-2" role="radiogroup" aria-label={t("onboarding.dailyGoalPrompt")}>
        {DAILY_GOAL_CHOICES.map((choice) => {
          const active = value === choice.minutes;
          return (
            <button
              key={choice.minutes}
              type="button"
              role="radio"
              aria-checked={active}
              data-daily-goal={choice.minutes}
              onClick={() => onPick(choice.minutes)}
              className={[
                "flex min-h-14 items-center justify-between rounded-2xl border px-5 py-3 text-left transition",
                active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface hover:bg-surface-2",
              ].join(" ")}
            >
              <span className="text-lg font-semibold text-ink">{t("onboarding.dailyGoalMinutes", { n: choice.minutes })}</span>
              <span className="text-sm text-ink-soft">{t(choice.labelKey)}</span>
            </button>
          );
        })}
      </div>
      <p className="mx-auto mt-3 max-w-md text-center text-xs text-ink-faint">{t("onboarding.dailyGoalNote")}</p>
    </div>
  );
}

/** RC2.2.17 · AN — Placement é opt-in de quem já estuda. */
function PlacementOffer({ onTakeTest, onStartFromBeginning }: { onTakeTest: () => void; onStartFromBeginning: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md" data-testid="placement-offer">
      <MascotPrompt prompt={t("onboarding.placementOfferPrompt")} />
      <div className="grid gap-2">
        <Button size="lg" className="longyu-press-feedback w-full" onClick={onTakeTest} data-testid="placement-offer-test">
          {t("onboarding.placementOfferTest")}
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={onStartFromBeginning} data-testid="placement-offer-skip">
          {t("onboarding.placementOfferSkip")}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-faint">{t("onboarding.placementOfferNote")}</p>
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
              data-testid={`onboarding-choice-${choice.id}`}
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

function OptionText({ optionId }: { optionId: string }) {
  const { instructionLocale: locale } = useTranslation();
  if (isCanonicalOptionId(optionId)) {
    if (containsCjkText(optionId)) return <span className="hanzi">{optionId}</span>;
    return <span>{formatPinyinForDisplay(optionId)}</span>;
  }
  return <span>{placementOptionLabel(optionId, locale)}</span>;
}

function QuizCard({
  index,
  total: _total,
  question,
  sessionSeed,
  declaredLevel,
  picked,
  onPick,
  onSubmit,
  onUseHint,
  onTechnicalSkip,
}: {
  index: number;
  total: number;
  question: QuizQuestion;
  sessionSeed: string;
  declaredLevel: Experience;
  picked?: string;
  onPick: (answer: string) => void;
  onSubmit: () => void;
  onUseHint: () => void;
  onTechnicalSkip: () => void;
}) {
  const { t, instructionLocale: locale } = useTranslation();
  const maxQuestions = MAX_QUIZ_LENGTH[declaredLevel];
  const allowHints = question.hasHint === true;
  const [hintOpen, setHintOpen] = useState(false);
  const displayOptions = useMemo(
    () => stableOptionPermutation(question.options, sessionSeed, question.id),
    [question.id, question.options, sessionSeed]
  );
  const glossKey = question.stimulus ? placementGlossKey(question.stimulus) : question.audioText ? placementGlossKey(question.audioText) : null;

  useEffect(() => {
    setHintOpen(false);
  }, [question.id]);

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: displayOptions.length,
    hasSelection: Boolean(picked),
    onSelectOption: (optionIndex) => {
      const option = displayOptions[optionIndex];
      if (option) onPick(option);
    },
    onSubmit,
  });

  function revealHint() {
    setHintOpen(true);
    onUseHint();
  }

  return (
    <div data-testid="placement-quiz" data-question-category={question.category}>
      {/* RC2.2.17 · AP/DA/DB — conteúdo primeiro: "Pergunta N de M", o
          enunciado e as opções. Categoria/fase/camada seguem internas. */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tabular-nums text-ink-faint" data-testid="placement-question-of">
          {t("placement.questionOf", { n: index + 1, total: Math.max(maxQuestions, index + 1) })}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{placementPrompt(question, locale)}</h1>
        {question.audioText && (
          <PlacementAudio key={question.id} text={question.audioText} onTechnicalSkip={onTechnicalSkip} />
        )}
        {question.stimulus && (
          <div className="mt-4 rounded-[24px] border border-line bg-surface-2 px-4 py-5">
            <span className="hanzi text-5xl font-semibold text-ink">{question.stimulus}</span>
          </div>
        )}
        {allowHints && glossKey && (
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-accent hover:underline"
            onClick={revealHint}
          >
            {hintOpen ? t(glossKey) : t("placement.seeTranslation")}
          </button>
        )}
        <p className="mx-auto mt-3 max-w-sm text-xs text-ink-faint">
          {allowHints ? t("placement.hintHelps") : t("placement.noHintHere")}
        </p>
        <p className="mt-2 hidden text-[11px] font-medium text-ink-faint sm:block">{t("onboarding.shortcutHint")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {displayOptions.map((option, optionIndex) => {
            const active = picked === option;
            const shortcut = shortcutKeyForIndex(optionIndex);
            return (
              <button
                key={option}
                type="button"
                data-testid={`placement-option-${option}`}
                onClick={() => onPick(option)}
                aria-pressed={active}
                className={["relative rounded-2xl border px-5 py-4 text-left font-medium shadow-card", active ? "border-accent bg-accent-soft" : "border-line bg-surface"].join(" ")}
              >
                <ShortcutBadge className="absolute right-3 top-3">{shortcut}</ShortcutBadge>
                <OptionText optionId={option} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * RC2.2.17 · DW–DX — áudio da pergunta com o contrato de reprodução. Se o
 * aparelho não tocar, a pergunta pode ser pulada como TECHNICAL_SKIP (não é
 * erro do aluno, não pesa no nível).
 */
function PlacementAudio({ text, onTechnicalSkip }: { text: string; onTechnicalSkip: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "playing" | "heard" | "failed">("idle");
  function play() {
    setState("playing");
    void playMandarinAudio(text).then((outcome) => {
      if (outcome.superseded) return;
      setState(outcome.started ? "heard" : "failed");
    });
  }
  return (
    <div className="mt-4 flex flex-col items-center gap-2" data-testid="placement-audio" data-audio-state={state}>
      <button
        type="button"
        onClick={play}
        aria-label={t("common.listen")}
        className={["grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-sm transition active:scale-95", state === "playing" ? "ring-4 ring-accent-soft" : ""].join(" ")}
      >
        <IconSound width={26} height={26} />
      </button>
      {state === "failed" && (
        <div className="text-sm text-ink-soft" role="status">
          <p>{t("placement.audioFailed")}</p>
          <div className="mt-2 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={play}>{t("guidedTry.audioRetry")}</Button>
            <Button size="sm" variant="outline" onClick={onTechnicalSkip} data-testid="placement-technical-skip">
              {t("placement.technicalSkip")}
            </Button>
          </div>
        </div>
      )}
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
  const { t, instructionLocale: locale } = useTranslation();
  const entry = entryPointForLesson(analysis.placement.targetLessonId);
  const strengths =
    analysis.strengthCategoryIds?.map((category) => categoryLabel(category, t)).join(", ") || t("placement.strengthFallback");
  const buildAreas = [
    ...(analysis.hintIndependenceNeeded ? [t("placement.hintIndependence")] : []),
    ...(analysis.reinforcementCategoryIds ?? []).map((category) => categoryLabel(category, t)),
  ]
    .slice(0, 4)
    .join(", ") || t("placement.reinforcementFallback");
  return (
    <div data-testid="placement-result">
      <MascotPrompt prompt={t("placement.resultPrompt")} />
      <div className="mx-auto max-w-2xl rounded-[28px] border border-line bg-surface p-6 shadow-lift">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{t("placement.recommended")}</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{localizedPlacementHeading(analysis, locale)}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{localizedPlacementMessage(analysis, locale)}</p>
        <p className="mt-2 text-sm font-medium text-ink">
          {entry ? displayInstruction(entry.phaseTitle, locale) : t("journey.title")} {entry?.unitTitle ? `· ${displayInstruction(entry.unitTitle, locale)}` : ""} · {lessonTitle(analysis.placement.targetLessonId, locale)}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label={t("placement.confidence")} value={`${Math.round(analysis.placementConfidence * 100)}%`} />
          <Stat label={t("placement.questions")} value={String(analysis.questionsAnswered)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label={t("placement.strengths")} value={strengths} />
          <Stat label={t("placement.buildAreas")} value={buildAreas} />
        </div>
        {error && (
          <p className="mt-4 rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong">
            {localizeUserMessage(error)}
          </p>
        )}
        <Button size="lg" className="mt-6 w-full" onClick={onContinue} data-testid="create-account-cta" disabled={busy}>
          {authenticated
            ? busy
              ? t("placement.saving")
              : t("placement.saveStartingPoint")
            : t("placement.createAccountCta")}
        </Button>
        {!authenticated && (
          <Link
            to="/login?next=/jornada"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-accent hover:underline"
          >
            {t("onboarding.alreadyHaveAccount")}
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
  username,
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
  onUsername,
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
  username: string;
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
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onPasswordConfirm: (value: string) => void;
  onBirthDate: (value: string) => void;
  onCountry: (value: string) => void;
  onMarketingOptIn: (value: boolean) => void;
  onSignupSource: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const cloud = isSupabaseBackendEnabled();
  const { t } = useTranslation();
  // RC2.2.17 · CK–CN — cadastro em duas etapas curtas: identidade, depois
  // segurança. Nunca 6 campos + card de requisitos na mesma tela.
  const [phase, setPhase] = useState<"identity" | "security">("identity");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const usernameOk = checkUsername(username).ok;
  const identityReady = name.trim().length >= 2 && isValidEmail(email) && usernameOk;
  return (
    <form
      onSubmit={(event) => {
        if (phase === "identity") {
          event.preventDefault();
          if (identityReady) setPhase("security");
          return;
        }
        onSubmit(event);
      }}
      className="mx-auto w-full max-w-xl"
      data-testid="signup-form"
      data-signup-phase={phase}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        {t("onboarding.accountStepOf", { n: phase === "identity" ? 1 : 2 })}
      </div>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
        {phase === "identity" ? t("onboarding.accountIdentityTitle") : t("onboarding.accountSecurityTitle")}
      </h1>
      {phase === "identity" ? (
        <>
          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("onboarding.name")}</span>
            <input
              value={name}
              onChange={(event) => onName(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-line px-4"
              placeholder={t("onboarding.namePlaceholder")}
              autoComplete="given-name"
              data-testid="signup-name"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("auth.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmail(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-line px-4"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              data-testid="signup-email"
            />
          </label>
          <UsernameField value={username} onChange={onUsername} />
          <Button type="submit" size="lg" className="longyu-press-feedback mt-5 w-full" disabled={!identityReady} data-testid="signup-identity-continue">
            {t("onboarding.continue")} <IconChevron width={18} height={18} />
          </Button>
        </>
      ) : (
        <>
          <div className="mt-5">
            <PasswordField
              label={t("auth.password")}
              value={password}
              onChange={(event) => onPassword(event.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              autoComplete="new-password"
              placeholder={t("auth.passwordPlaceholder")}
            />
          </div>
          <div className="mt-3">
            <PasswordField
              label={t("auth.confirmPassword")}
              value={passwordConfirm}
              onChange={(event) => onPasswordConfirm(event.target.value)}
              autoComplete="new-password"
              placeholder={t("auth.confirmPasswordPlaceholder")}
            />
          </div>
          <PasswordRequirements password={password} confirmation={passwordConfirm} className="mt-2" progressive focused={passwordFocused} />
          <details className="mt-3 rounded-xl border border-line/70 px-3 py-2" data-testid="signup-more-details">
            <summary className="cursor-pointer text-sm font-semibold text-ink-soft">{t("onboarding.accountMoreDetails")}</summary>
            <div className="mt-2">
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
          </details>
          {error && <p className="mt-3 rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm text-wrong">{localizeUserMessage(error)}</p>}
          {!cloud && (
            <p className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-soft">{t("errors.backendUnavailable")}</p>
          )}
          <Button type="submit" size="lg" className="longyu-press-feedback mt-5 w-full" disabled={busy || name.trim().length < 2} data-testid="signup-submit">
            {busy ? t("onboarding.creatingAccount") : t("onboarding.createAccountCta")}
          </Button>
          <button type="button" className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-ink-soft" onClick={() => setPhase("identity")}>
            {t("onboarding.back")}
          </button>
        </>
      )}
      <Link to="/login" className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-accent hover:underline">
        {t("onboarding.alreadyHaveAccount")}
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
  // RC2.2.14B · J/AT — antes do primeiro aprendizado, o curso.
  if (!hasCourseDirection()) return <Navigate to="/curso?next=%2Fcomecar" replace />;
  return <ComecarPage />;
}

/**
 * RC2.2.11 · AR — campo de nome de usuário no cadastro. Valida só a
 * ESTRUTURA, localmente; disponibilidade é do servidor (sem "disponível" falso).
 */
function UsernameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const check = checkUsername(value);
  const touched = value.trim().length > 0;
  const problem = touched && !check.ok ? t(USERNAME_REJECTION_KEY[check.reason] as MessageKey) : null;
  return (
    <label className="mt-3 block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("auth.username")}</span>
      <div className="mt-1 flex h-12 w-full items-center rounded-xl border border-line px-4 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/20">
        <span aria-hidden className="mr-1 text-ink-faint">@</span>
        <input
          name="username"
          data-testid="signup-username"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={32}
          aria-invalid={problem ? true : undefined}
          aria-describedby="signup-username-hint"
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
          placeholder={t("auth.usernamePlaceholder")}
        />
      </div>
      <p id="signup-username-hint" data-testid="signup-username-hint" className={`mt-1 text-xs ${problem ? "text-wrong" : "text-ink-soft"}`} aria-live="polite">
        {problem ?? (touched ? `${t("auth.usernameValidShape")} ${t("auth.usernameAvailabilityNote")}` : t("auth.usernameHint"))}
      </p>
    </label>
  );
}
