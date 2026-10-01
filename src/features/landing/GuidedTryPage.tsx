import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { haptic } from "../../lib/haptics";
import { Button } from "../../components/ui/primitives";
import { IconCheck, IconSound } from "../../components/ui/Icon";
import {
  GUIDED_CLASS,
  GuidedAudioButton,
  GuidedBottomAction,
  GuidedChoiceList as ChoiceList,
  GuidedFeedback as Feedback,
  GuidedProgressHeader,
  type GuidedChoice as Choice,
} from "../../components/guided/GuidedPrimitives";
import { Mascot } from "../../components/brand/Mascot";
import { GuideLine } from "../../components/guide/GuideLine";
import { ToneContour } from "../../components/tone/ToneContour";
import { useTranslation } from "../../i18n/useTranslation";
import { t as translate, type TranslateVars } from "../../i18n/catalog";
import type { MessageKey } from "../../locales/pt-BR";
import { hasCourseDirection } from "../../lib/courseDirectionState";
import { canOfferVoiceInstall, playMandarinAudio, type PlaybackState } from "../../lib/audioPlayback";
import { requestMandarinSpeech } from "../../lib/mandarinSpeech";
import { installNativeTtsData } from "../../lib/platform/nativeSpeech";
import { refreshNativeTtsStatus } from "../../lib/tts";
import { newTtsRequestId } from "../../lib/ttsCorrelation";
import { recordDeviceQaObservation } from "../../lib/deviceQa";
import { recordTechEvent } from "../../lib/techEvents";
import { markGuidedTryCompleted, type GuidedTryAudioResult } from "../../lib/onboardingDraft";
import type { MandarinToneNumber } from "../../data/toneKnowledge";
import { audioGateCtaEnabled, audioGateFromPlayback, type AudioGateState } from "../../lib/audio/audioGate";

/** RC2.2.28 — Guided Try "Ouça" usa core asset; TTS não está no caminho normal. */
export const GUIDED_TRY_NIHAO_AUDIO_ID = "audio:guided-try:nihao:v1";
export const GUIDED_TRY_HAO_AUDIO_ID = "audio:guided-try:hao:v1";

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

/** Estado do áudio do passo "Ouça" — espelha o contrato de reprodução. */
export type GuidedListenState = "IDLE" | "STARTING" | "PLAYING" | "HEARD" | "FAILED" | "UNAVAILABLE" | "DEGRADED";

/**
 * RC2.2.14B · AS — sem curso escolhido não há teste guiado: vai para a
 * escolha do curso e volta para cá.
 */
/** RC2.2.27 — prazo de UI do "Ouça" (> 4 s do watchdog nativo + polling JS). */
export const GUIDED_LISTEN_DEADLINE_MS = 5500;

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
  // RC2.2.24 — a reprodução ATIVA do passo "Ouça" (só a requestId dela conta).
  // RC2.2.29 — diagnóstico técnico só em /qa/device (nunca na UI do aluno).
  const activeRequest = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    []
  );

  const index = step === "done" ? GUIDED_TRY_STEPS.length : GUIDED_TRY_STEPS.indexOf(step);
  const total = GUIDED_TRY_STEPS.length;
  // RC2.2.27 — nunca cinza para sempre: o prazo nasce no TOQUE (não no
  // estado STARTING, que pode não chegar ou ser revertido). Sem início
  // confirmado (onStart, isSpeaking da MESMA request, DONE ou ACK) até o
  // prazo, a tela oferece [Tocar novamente] [Eu ouvi, continuar]
  // [Continuar sem áudio]. "Eu ouvi" é fallback de UX, não PHYSICAL_PASS.
  const [listenTap, setListenTap] = useState(0);
  const heard = listen === "HEARD" || listen === "PLAYING";
  const audioFailed = listen === "FAILED" || listen === "UNAVAILABLE" || listen === "DEGRADED";
  // RC2.2.28 — audio gate: CTA quando HEARD ou DEGRADED (nunca IDLE eterno).
  const audioGate: AudioGateState = audioGateFromPlayback({
    tried: listenTap > 0 || listen !== "IDLE",
    playing: listen === "STARTING" || listen === "PLAYING",
    heard: listen === "HEARD" || listen === "PLAYING" || audioResult === "AUDIO_HEARD",
    failed: listen === "FAILED" || listen === "DEGRADED",
    unavailable: listen === "UNAVAILABLE",
    degradedChoice: audioResult === "DEGRADED_AUDIO",
  });
  const gateCtaEnabled = audioGateCtaEnabled(audioGate) || audioResult === "AUDIO_HEARD" || heard;

  useEffect(() => {
    if (step !== "listen" || listenTap === 0) return;
    if (listen === "PLAYING" || listen === "HEARD" || listen === "FAILED" || listen === "UNAVAILABLE" || listen === "DEGRADED") return;
    const requestId = activeRequest.current;
    const timer = window.setTimeout(() => {
      if (!alive.current || activeRequest.current !== requestId) return;
      recordTechEvent("guided_try_audio_deadline", { requestId, deadlineMs: GUIDED_LISTEN_DEADLINE_MS, state: listen });
      setFailReason("TTS_UI_DEADLINE");
      setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "FAILED"));
      setAudioResult((prev) => prev ?? "DEGRADED_AUDIO");
    }, GUIDED_LISTEN_DEADLINE_MS);
    return () => window.clearTimeout(timer);
  }, [step, listen, listenTap]);

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
    else if (state === "PLAYING") {
      setListen("PLAYING");
      setAudioResult("AUDIO_HEARD");
    }
    else if (state === "ENDED") setListen("HEARD");
    // RC2.2.17 · A2 — FAILED/UNAVAILABLE nunca viram HEARD (nem masquerade).
    // RC2.2.28 — audioGateFromPlayback mapeia failed/unavailable → DEGRADED
    // para liberar o CTA; o estado de UI permanece honesto.
    else if (state === "FAILED") setListen((prev) => (prev === "HEARD" ? prev : "FAILED"));
    else if (state === "UNAVAILABLE") setListen((prev) => (prev === "HEARD" ? prev : "UNAVAILABLE"));
  }

  /**
   * RC2.2.28 — "Ouça sua primeira frase" usa CORE ASSET (playCanonicalAudio
   * via requestMandarinSpeech + audioId). Nenhum TextToSpeech / languageStatus
   * / voice install está no caminho normal. Se o player falhar → DEGRADED
   * com [Tentar novamente] [Continuar] — nunca botão cinza eterno.
   */
  function playNihao() {
    setFailReason(null);
    setListenTap((count) => count + 1);
    const requestId = newTtsRequestId();
    activeRequest.current = requestId;
    // Forensics de TTS só quando o motor cair em TTS (fallback); asset não precisa.
    const handle = requestMandarinSpeech({
      text: NIHAO.hanzi,
      audioId: GUIDED_TRY_NIHAO_AUDIO_ID,
      source: "GUIDED_TRY",
      mode: "USER_REQUESTED",
      rate: 0.8,
      requestId,
      onState: applyPlayback,
    });
    handle.done
      .then((outcome) => {
        if (!alive.current || activeRequest.current !== requestId) return;
        if (outcome.started) {
          setAudioResult("AUDIO_HEARD");
          setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "HEARD"));
          return;
        }
        if (outcome.superseded) {
          // RC2.2.24 — substituída sem começar = FAILED recuperável (nunca STARTING eterno).
          recordTechEvent("guided_try_audio_superseded", { requestId, reason: outcome.reason });
          setFailReason("TTS_SUPERSEDED");
          setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "FAILED"));
          return;
        }
        setFailReason(outcome.reason);
        setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "DEGRADED"));
        setAudioResult((prev) => prev ?? "DEGRADED_AUDIO");
      })
      .catch((err: unknown) => {
        // RC2.2.28 Part 22 — nenhuma promise sem catch quando controla UI.
        if (!alive.current || activeRequest.current !== requestId) return;
        setFailReason(err instanceof Error ? err.message : "GUIDED_TRY_AUDIO_EXCEPTION");
        setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "DEGRADED"));
        setAudioResult((prev) => prev ?? "DEGRADED_AUDIO");
      });
  }

  function confirmHeardWithoutAck() {
    recordTechEvent("user_confirmed_audio_without_native_ack", { requestId: activeRequest.current, reason: failReason });
    recordDeviceQaObservation("audio_failed", "USER_CONFIRMED_AUDIO_WITHOUT_NATIVE_ACK");
    setAudioResult("DEGRADED_AUDIO");
    go("explain");
  }

  /** RC2.2.17 · A4 — instalar voz chinesa (fallback TTS). Sem texto técnico. */
  async function installVoice() {
    await installNativeTtsData();
    const refresh = () => {
      document.removeEventListener("visibilitychange", refresh);
      void refreshNativeTtsStatus();
    };
    document.addEventListener("visibilitychange", refresh);
  }

  function playTone() {
    setTonePlayKey((key) => key + 1);
    void playMandarinAudio(HAO.hanzi, { rate: 0.75, source: "TONE", audioId: GUIDED_TRY_HAO_AUDIO_ID }).catch(() => undefined);
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
    gateCtaEnabled
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
        <GuidedProgressHeader
          onExit={() => navigate(replay ? "/treino" : "/")}
          exitLabel={t("guidedTry.exit")}
          value={index + 1}
          max={total}
        />
      )}

      <main key={step} className={`longyu-step-in ${GUIDED_CLASS.column} flex max-w-md flex-1 flex-col px-4 pb-4 pt-2`}>
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
            <GuidedAudioButton
              onPress={playNihao}
              state={listen}
              failed={audioFailed}
              label={t("guidedTry.listenAria")}
              data-guided-listen
              className="mt-6"
            />
            <p
              className="mt-3 min-h-5 text-sm font-medium text-ink-soft"
              role="status"
              aria-live="polite"
              data-testid="guided-listen-status"
              data-listen-state={listen}
            >
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
                {/* RC2.2.31C — Guided Try is asset-first. Never push "Configurar voz chinesa" for asset playback failure. */}
                <p className="text-sm font-semibold text-ink">{t("guidedTry.audioFailedTitle")}</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{t("guidedTry.audioFailedLead")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={playNihao} data-testid="guided-audio-retry">
                    {t("guidedTry.audioRetry")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={confirmHeardWithoutAck} data-testid="guided-audio-confirm-heard">
                    {t("guidedTry.audioConfirmedByUser")}
                  </Button>
                  {canOfferVoiceInstall(failReason) ? (
                    <Button size="sm" variant="outline" onClick={() => void installVoice()} data-testid="guided-audio-install">
                      {t("guidedTry.audioInstallVoice")}
                    </Button>
                  ) : null}
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

      <GuidedBottomAction className="sticky bottom-0 mx-auto w-full max-w-md">
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
      </GuidedBottomAction>
    </div>
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
