import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { haptic } from "../../lib/haptics";
import { Button, ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconSound, IconX } from "../../components/ui/Icon";
import { Mascot } from "../../components/brand/Mascot";
import { GuideLine } from "../../components/guide/GuideLine";
import { ToneContour } from "../../components/tone/ToneContour";
import { useTranslation } from "../../i18n/useTranslation";
import { t as translate, type TranslateVars } from "../../i18n/catalog";
import type { MessageKey } from "../../locales/pt-BR";
import { hasCourseDirection } from "../../lib/courseDirectionState";
import { canOfferVoiceInstall, playMandarinAudio, type PlaybackState } from "../../lib/audioPlayback";
import { installNativeTtsData } from "../../lib/platform/nativeSpeech";
import { refreshNativeTtsStatus } from "../../lib/tts";
import { markGuidedTryCompleted, type GuidedTryAudioResult } from "../../lib/onboardingDraft";
import type { MandarinToneNumber } from "../../data/toneKnowledge";

/**
 * RC2.2.14 · J–P → RC2.2.17 · AR–AW — Teste guiado V2 (~3–5 min), antes da conta.
 *
 * Referência de UX pedagógica: UM passo, UMA ideia, UMA ação. Mesmo conteúdo
 * da Lição 1 (你好, 你, 好 = 女 + 子, 3º tom, uma troca com a Chen Mei).
 *
 * NADA de progresso é gravado: sem aluno, XP, estrelas, ofensiva, Qi, Pérolas,
 * SRS, domínio ou lição concluída. No fim, só o RASCUNHO do onboarding recebe
 * `guidedTryCompleted` (+ se o áudio tocou ou foi degradado); depois da conta
 * isso vira apenas GUIDED_TRY_EXPOSURE.
 *
 * Áudio (RC2.2.17 · A–E): "ouvi" só quando o motor CONFIRMA que a fala
 * começou. Clique não é áudio. Se o aparelho falhar, a tela diz isso, oferece
 * tentar de novo / instalar a voz, mostra 你好 · nǐ hǎo · olá e deixa seguir
 * explicitamente "sem áudio" (DEGRADED_AUDIO) — nunca trava para sempre.
 */

const NIHAO = chunkById.nihao;
const NI = charById.ni;
const HAO = charById.hao;
const NV = charById.nv;
const ZI = charById.zi;
/** Distrator visual do construtor (não entra no ensino). */
const DISTRACTOR = charById.kou ?? { hanzi: "口" };

export const GUIDED_TRY_STEPS = ["intro", "listen", "explain", "tone", "meaning", "build", "conversation"] as const;
type GuidedStep = (typeof GUIDED_TRY_STEPS)[number] | "done";

type Choice = { id: string; label: string; correct: boolean };

/** Estado do áudio do passo "Ouça" — espelha o contrato de reprodução. */
export type GuidedListenState = "IDLE" | "STARTING" | "PLAYING" | "HEARD" | "FAILED" | "UNAVAILABLE";

/**
 * RC2.2.14B · AS — sem curso escolhido não há teste guiado: vai para a
 * escolha do curso e volta para cá.
 */
export function GuidedTryPage() {
  if (!hasCourseDirection()) return <Navigate to="/curso?next=%2Fteste-guiado" replace />;
  return <GuidedTryFlow />;
}

function GuidedTryFlow() {
  const { t, instructionLocale } = useTranslation();
  // Cópia de APRENDIZAGEM no idioma do curso; botões e navegação na interface.
  const tc = (key: MessageKey, vars?: TranslateVars) => translate(key, vars, instructionLocale);
  const navigate = useNavigate();
  // RC2.2.17 · DU — replay (Treino): mesma experiência, sem rascunho nem prêmio.
  const [searchParams] = useSearchParams();
  const replay = searchParams.get("replay") === "1";
  const [step, setStep] = useState<GuidedStep>("intro");
  const [listen, setListen] = useState<GuidedListenState>("IDLE");
  const [failReason, setFailReason] = useState<string | null>(null);
  /** Só vira DEGRADED_AUDIO por escolha explícita do aluno ("Continuar sem áudio"). */
  const [audioResult, setAudioResult] = useState<GuidedTryAudioResult | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [built, setBuilt] = useState<string[]>([]);
  const [buildWrong, setBuildWrong] = useState(false);
  const [tonePlayKey, setTonePlayKey] = useState(0);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    []
  );

  const index = step === "done" ? GUIDED_TRY_STEPS.length : GUIDED_TRY_STEPS.indexOf(step);
  const total = GUIDED_TRY_STEPS.length;
  const heard = listen === "HEARD" || listen === "PLAYING";
  const audioFailed = listen === "FAILED" || listen === "UNAVAILABLE";

  const meaningChoices: Choice[] = useMemo(
    () => [
      { id: "hello", label: tc("guidedTry.optHello"), correct: true },
      { id: "thanks", label: tc("guidedTry.optThanks"), correct: false },
      { id: "bye", label: tc("guidedTry.optBye"), correct: false },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tc muda só com o curso
    [instructionLocale]
  );
  const toneChoices: Choice[] = useMemo(
    () => [
      { id: "tone-1", label: "1", correct: false },
      { id: "tone-3", label: "3", correct: true },
      { id: "tone-4", label: "4", correct: false },
    ],
    []
  );
  const replyChoices: Choice[] = useMemo(
    () => [
      { id: "reply-thanks", label: "谢谢！", correct: false },
      { id: "reply-nihao", label: "你好！", correct: true },
      { id: "reply-bye", label: "再见！", correct: false },
    ],
    []
  );
  const pieces = useMemo(() => [ZI.hanzi, DISTRACTOR.hanzi, NV.hanzi], []);
  const target = [NV.hanzi, ZI.hanzi];

  function go(next: GuidedStep) {
    setPicked(null);
    setStep(next);
  }

  function applyPlayback(state: PlaybackState) {
    if (!alive.current) return;
    if (state === "STARTING") setListen((prev) => (prev === "HEARD" ? prev : "STARTING"));
    else if (state === "PLAYING") setListen("PLAYING");
    else if (state === "ENDED") setListen("HEARD");
    else if (state === "FAILED") setListen((prev) => (prev === "HEARD" ? prev : "FAILED"));
    else if (state === "UNAVAILABLE") setListen((prev) => (prev === "HEARD" ? prev : "UNAVAILABLE"));
  }

  /**
   * RC2.2.17 · D — o passo só conta como ouvido quando o MOTOR confirma.
   * Nada de `setHeard(true)` no toque.
   */
  function playNihao() {
    setFailReason(null);
    void playMandarinAudio(NIHAO.hanzi, { rate: 0.8, onState: applyPlayback }).then((outcome) => {
      if (!alive.current || outcome.superseded) return;
      if (outcome.started) {
        setAudioResult("AUDIO_HEARD");
        return;
      }
      setFailReason(outcome.reason);
    });
  }

  function playTone() {
    setTonePlayKey((key) => key + 1);
    void playMandarinAudio(HAO.hanzi, { rate: 0.75 });
  }

  async function installVoice() {
    await installNativeTtsData();
    const refresh = () => {
      document.removeEventListener("visibilitychange", refresh);
      void refreshNativeTtsStatus();
    };
    document.addEventListener("visibilitychange", refresh);
  }

  function choose(choice: Choice) {
    if (picked && choices(step).find((item) => item.id === picked)?.correct) return;
    setPicked(choice.id);
    haptic(choice.correct ? "answerCorrect" : "answerWrong");
    if (choice.correct && step === "conversation") void playMandarinAudio("你好");
  }

  function choices(current: GuidedStep): Choice[] {
    if (current === "meaning") return meaningChoices;
    if (current === "tone") return toneChoices;
    if (current === "conversation") return replyChoices;
    return [];
  }

  function place(piece: string) {
    if (built.length >= target.length) return;
    const expected = target[built.length];
    if (piece !== expected) {
      setBuildWrong(true);
      haptic("answerWrong");
      return;
    }
    const next = [...built, piece];
    setBuildWrong(false);
    setBuilt(next);
    haptic(next.length === target.length ? "answerCorrect" : "piecePlaced");
  }

  function finish() {
    haptic("practiceComplete");
    go("done");
  }

  /** RC2.2.17 · AT — só o rascunho do onboarding sabe que o teste terminou. */
  function continueToGoal() {
    if (replay) {
      navigate("/treino");
      return;
    }
    markGuidedTryCompleted(audioResult ?? "DEGRADED_AUDIO");
    navigate("/comecar");
  }

  const pickedChoice = choices(step).find((item) => item.id === picked);
  const answeredRight = Boolean(pickedChoice?.correct);
  const buildDone = built.length === target.length;

  // RC2.2.17 · EK — no passo "Ouça", o Continuar só libera com evento REAL de
  // áudio OU com o reconhecimento explícito do modo degradado.
  const listenAction =
    audioResult === "AUDIO_HEARD" || heard
      ? { label: t("guidedTry.continue"), disabled: false, onClick: () => go("explain"), testId: "listen-continue" }
      : audioFailed
        ? {
            label: t("guidedTry.continueWithoutAudio"),
            disabled: false,
            onClick: () => {
              setAudioResult("DEGRADED_AUDIO");
              go("explain");
            },
            testId: "listen-continue-degraded",
          }
        : { label: t("guidedTry.continue"), disabled: true, onClick: () => undefined, testId: "listen-continue" };

  const action =
    step === "intro"
      ? { label: t("guidedTry.start"), disabled: false, onClick: () => go("listen"), testId: "intro-continue" }
      : step === "listen"
        ? listenAction
        : step === "explain"
          ? { label: t("guidedTry.continue"), disabled: false, onClick: () => go("tone"), testId: "explain-continue" }
          : step === "tone"
            ? { label: t("guidedTry.continue"), disabled: !answeredRight, onClick: () => go("meaning"), testId: "tone-continue" }
            : step === "meaning"
              ? { label: t("guidedTry.continue"), disabled: !answeredRight, onClick: () => go("build"), testId: "meaning-continue" }
              : step === "build"
                ? { label: t("guidedTry.continue"), disabled: !buildDone, onClick: () => go("conversation"), testId: "build-continue" }
                : step === "conversation"
                  ? { label: t("guidedTry.finish"), disabled: !answeredRight, onClick: finish, testId: "conversation-finish" }
                  : null;

  return (
    <div
      className="flex min-h-dvh flex-col bg-bg"
      data-testid="guided-try"
      data-guided-step={step}
      data-guided-audio={audioResult ?? "NONE"}
      data-guided-listen-state={listen}
    >
      {step !== "done" && (
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg/95 px-3 pb-2 pt-[max(0.5rem,var(--app-safe-top))] backdrop-blur">
          <button
            type="button"
            onClick={() => navigate(replay ? "/treino" : "/")}
            aria-label={t("guidedTry.exit")}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
          >
            <IconX width={18} height={18} />
          </button>
          <ProgressBar value={index + 1} max={total} className="h-2.5 min-w-0 flex-1" />
          <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint" data-guided-progress>
            {index + 1}/{total}
          </span>
        </header>
      )}

      <main key={step} className="longyu-step-in mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-4 pt-2">
        {step === "intro" && (
          <section className="flex flex-1 flex-col justify-center gap-6">
            <GuideLine text={tc("guidedTry.introLine")} size={72} />
            <p className="text-center text-sm text-ink-soft">{t("guidedTry.introHint")}</p>
          </section>
        )}

        {step === "listen" && (
          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{t("guidedTry.listenEyebrow")}</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">{tc("guidedTry.listenTitle")}</h1>
            <button
              type="button"
              onClick={playNihao}
              data-guided-listen
              data-listen-state={listen}
              className={[
                "mt-6 grid h-24 w-24 place-items-center rounded-full text-white shadow-lift transition active:scale-95",
                audioFailed ? "bg-ink-faint" : "bg-accent",
                listen === "STARTING" || listen === "PLAYING" ? "ring-8 ring-accent-soft" : "",
              ].join(" ")}
              aria-label={t("guidedTry.listenAria")}
            >
              <IconSound width={34} height={34} />
            </button>
            <p className="mt-3 min-h-5 text-sm font-medium text-ink-soft" role="status" aria-live="polite" data-testid="guided-listen-status">
              {listen === "STARTING"
                ? t("guidedTry.audioStarting")
                : listen === "PLAYING"
                  ? t("guidedTry.audioPlaying")
                  : listen === "HEARD"
                    ? t("guidedTry.audioHeard")
                    : ""}
            </p>
            {audioFailed && (
              <div className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left" data-testid="guided-audio-failed" data-fail-reason={failReason ?? undefined}>
                <p className="text-sm font-semibold text-ink">{t("guidedTry.audioFailedTitle")}</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{t("guidedTry.audioFailedLead")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={playNihao} data-testid="guided-audio-retry">
                    {t("guidedTry.audioRetry")}
                  </Button>
                  {canOfferVoiceInstall(failReason) && (
                    <Button size="sm" variant="outline" onClick={() => void installVoice()} data-testid="guided-audio-install">
                      {t("guidedTry.audioInstallVoice")}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {(heard || audioFailed) && (
              <div className="mt-6 animate-pop" data-testid="guided-reveal">
                <div className="hanzi text-5xl text-ink">{NIHAO.hanzi}</div>
                <div className="pinyin mt-1 text-lg text-ink-soft">{NIHAO.pinyin}</div>
                <div className="mt-1 text-sm text-ink-soft">{tc("guidedTry.meaningHello")}</div>
              </div>
            )}
          </section>
        )}

        {step === "explain" && (
          <section className="flex flex-1 flex-col justify-center">
            <h1 className="font-serif text-2xl font-semibold text-ink">{tc("guidedTry.explainTitle")}</h1>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <GlyphCard hanzi={NI.hanzi} pinyin={NI.pinyin} gloss={tc("guidedTry.glossYou")} />
              <GlyphCard hanzi={HAO.hanzi} pinyin={HAO.pinyin} gloss={tc("guidedTry.glossGood")} />
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-soft">{tc("guidedTry.explainLead")}</p>
          </section>
        )}

        {step === "tone" && (
          <section className="flex flex-1 flex-col justify-center" data-testid="guided-tone">
            <h1 className="font-serif text-2xl font-semibold text-ink">{tc("guidedTry.toneTitle")}</h1>
            <div className="mt-4 flex flex-col items-center">
              <div className="hanzi text-4xl text-ink">{HAO.hanzi}</div>
              <div className="pinyin text-lg text-ink-soft">{HAO.pinyin}</div>
              <ToneContour
                tone={3}
                guided
                gesture
                heightScale
                playKey={tonePlayKey}
                locale={instructionLocale === "en" ? "en" : "pt-BR"}
                className="mt-2"
              />
              <Button size="sm" variant="outline" className="mt-2" onClick={playTone} data-testid="guided-tone-play">
                <IconSound width={16} height={16} /> {t("guidedTry.toneListen")}
              </Button>
            </div>
            <p className="mt-4 text-center font-semibold text-ink">{tc("guidedTry.toneQuestion")}</p>
            <ChoiceList
              step={step}
              choices={toneChoices}
              picked={picked}
              onChoose={choose}
              label={t("guidedTry.options")}
              render={(choice) => (
                <span className="flex items-center gap-3">
                  <ToneContour tone={Number(choice.label) as MandarinToneNumber} mode="LATE" locale={instructionLocale === "en" ? "en" : "pt-BR"} />
                </span>
              )}
            />
            <Feedback picked={pickedChoice} right={tc("guidedTry.toneRight")} tryAgain={tc("guidedTry.tryAgain")} />
          </section>
        )}

        {step === "meaning" && (
          <section className="flex flex-1 flex-col justify-center">
            <h1 className="font-serif text-2xl font-semibold text-ink">{tc("guidedTry.meaningQuestion")}</h1>
            <div className="hanzi mt-4 text-center text-5xl text-ink">{NIHAO.hanzi}</div>
            <ChoiceList step={step} choices={meaningChoices} picked={picked} onChoose={choose} label={t("guidedTry.options")} />
            <Feedback picked={pickedChoice} right={tc("guidedTry.right")} tryAgain={tc("guidedTry.tryAgain")} />
          </section>
        )}

        {step === "build" && (
          <section className="flex flex-1 flex-col justify-center">
            <h1 className="font-serif text-2xl font-semibold text-ink">{tc("guidedTry.buildTitle")}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{tc("guidedTry.buildLead")}</p>
            <div className="mt-5 flex items-center justify-center gap-2" data-guided-slots>
              {target.map((_, slot) => (
                <span
                  key={slot}
                  className={[
                    "hanzi grid h-20 w-20 place-items-center rounded-2xl border-2 text-4xl",
                    built[slot] ? "border-accent bg-accent-soft text-ink" : "border-dashed border-line text-ink-faint",
                  ].join(" ")}
                >
                  {built[slot] ?? ""}
                </span>
              ))}
              <span className="px-1 text-2xl text-ink-faint">=</span>
              <span className={["hanzi grid h-20 w-20 place-items-center rounded-2xl text-4xl", buildDone ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" : "text-ink-faint"].join(" ")}>
                {buildDone ? HAO.hanzi : "?"}
              </span>
            </div>
            <div className="mt-5 flex justify-center gap-3">
              {pieces.map((piece) => (
                <button
                  key={piece}
                  type="button"
                  data-guided-piece={piece}
                  disabled={built.includes(piece) || buildDone}
                  onClick={() => place(piece)}
                  className="hanzi grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface text-3xl text-ink shadow-card transition active:scale-95 disabled:opacity-40"
                >
                  {piece}
                </button>
              ))}
            </div>
            <p className="mt-3 min-h-5 text-center text-sm text-ink-soft" role="status" aria-live="polite">
              {buildDone ? tc("guidedTry.buildDone") : buildWrong ? tc("guidedTry.buildHint") : ""}
            </p>
          </section>
        )}

        {step === "conversation" && (
          <section className="flex flex-1 flex-col justify-center" data-testid="guided-conversation">
            <h1 className="font-serif text-2xl font-semibold text-ink">{tc("guidedTry.conversationTitle")}</h1>
            <div className="mt-4 flex items-end gap-2" data-speaker="chen-mei" data-active-speaker={!answeredRight ? "true" : undefined}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">陈</span>
              <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 shadow-card">
                <div className="text-xs font-semibold text-ink-faint">Chen Mei</div>
                <button type="button" className="hanzi text-2xl text-ink" onClick={() => void playMandarinAudio("你好")}>
                  你好！
                </button>
                <div className="pinyin text-sm text-ink-soft">nǐ hǎo!</div>
              </div>
            </div>
            {answeredRight && (
              <div className="mt-3 flex justify-end animate-pop" data-speaker="learner" data-active-speaker="true">
                <div className="rounded-2xl rounded-br-md bg-accent px-4 py-3 text-white shadow-card">
                  <div className="hanzi text-2xl">你好！</div>
                </div>
              </div>
            )}
            {!answeredRight && <p className="mt-4 text-center font-semibold text-ink">{tc("guidedTry.conversationQuestion")}</p>}
            {!answeredRight && (
              <ChoiceList step={step} choices={replyChoices} picked={picked} onChoose={choose} label={t("guidedTry.options")} hanzi />
            )}
            <Feedback picked={pickedChoice} right={tc("guidedTry.conversationRight")} tryAgain={tc("guidedTry.tryAgain")} />
          </section>
        )}

        {step === "done" && (
          <section className="flex flex-1 flex-col justify-center pt-[var(--app-safe-top)]" data-testid="guided-try-done">
            <div className="flex justify-center">
              <Mascot size={96} variant="wave" />
            </div>
            <h1 className="mt-3 text-center font-serif text-2xl font-semibold text-ink">{tc("guidedTry.doneTitle")}</h1>
            <p className="mt-2 text-center text-sm text-ink-soft">{tc("guidedTry.doneLead")}</p>
            <ul className="mt-5 grid gap-2">
              {[tc("guidedTry.learnedNihao"), tc("guidedTry.learnedParts"), tc("guidedTry.learnedTones"), tc("guidedTry.learnedBuild")].map((item) => (
                <li key={item} className="flex items-start gap-2.5 rounded-2xl border border-line/70 bg-surface px-3.5 py-3 text-sm text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]">
                    <IconCheck width={12} height={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs leading-5 text-ink-faint">{t("guidedTry.nothingSaved")}</p>
          </section>
        )}
      </main>

      <div className="sticky bottom-0 mx-auto w-full max-w-md bg-bg/95 px-4 pb-[calc(var(--app-safe-bottom)+1rem)] pt-2 backdrop-blur">
        {action ? (
          <Button
            size="lg"
            className="longyu-press-feedback w-full"
            disabled={action.disabled}
            onClick={action.onClick}
            data-guided-action
            data-guided-action-id={action.testId}
          >
            {action.label}
          </Button>
        ) : (
          <div className="grid gap-2">
            <Button size="lg" className="longyu-press-feedback w-full shadow-lift" onClick={continueToGoal} data-guided-create-account>
              {t("guidedTry.continueToGoal")}
            </Button>
            <Link to="/" className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-ink-soft">
              {t("guidedTry.backHome")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceList({
  step,
  choices,
  picked,
  onChoose,
  label,
  hanzi = false,
  render,
}: {
  step: string;
  choices: Choice[];
  picked: string | null;
  onChoose: (choice: Choice) => void;
  label: string;
  hanzi?: boolean;
  render?: (choice: Choice) => React.ReactNode;
}) {
  return (
    <div className="mt-5 grid gap-2" role="group" aria-label={label} data-choice-step={step}>
      {choices.map((choice) => {
        const state = picked === choice.id ? (choice.correct ? "right" : "wrong") : "idle";
        return (
          <button
            key={choice.id}
            type="button"
            data-guided-option={choice.id}
            data-state={state}
            onClick={() => onChoose(choice)}
            className={[
              "min-h-12 rounded-2xl border px-4 py-3 text-left text-base font-semibold transition",
              state === "right" && "longyu-correct-pop border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]",
              state === "wrong" && "longyu-error-shake border-transparent bg-wrong-soft text-wrong",
              state === "idle" && "border-line bg-surface text-ink hover:bg-surface-2",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {render ? render(choice) : <span className={hanzi ? "hanzi text-xl" : undefined}>{choice.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Feedback({ picked, right, tryAgain }: { picked: Choice | undefined; right: string; tryAgain: string }) {
  return (
    <p className="mt-3 min-h-5 text-sm text-ink-soft" role="status" aria-live="polite">
      {picked ? (picked.correct ? right : tryAgain) : ""}
    </p>
  );
}

function GlyphCard({ hanzi, pinyin, gloss }: { hanzi: string; pinyin: string; gloss: string }) {
  return (
    <button
      type="button"
      onClick={() => void playMandarinAudio(hanzi, { rate: 0.8 })}
      className="rounded-2xl border border-line bg-surface p-4 text-center shadow-card transition active:scale-[0.98]"
    >
      <div className="hanzi text-4xl text-ink">{hanzi}</div>
      <div className="pinyin mt-1 text-sm text-ink-soft">{pinyin}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{gloss}</div>
    </button>
  );
}
