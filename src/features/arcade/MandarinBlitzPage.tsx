import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import { ExerciseText } from "../../components/hanzi/ExerciseText";
import { Button, ButtonLink, Card, ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconFlame, IconSound, IconX } from "../../components/ui/Icon";
import { speak } from "../../lib/tts";
import { useStore } from "../../lib/store";
import { buildMandarinBlitzDeck, reachedBlitzQuestionLimit, type BlitzSessionConfig } from "./blitzEngine";
import { FOUNDATION_BLITZ_NODE } from "../../data/journeyOrchestrator";
import { useTranslation } from "../../i18n/useTranslation";
import { resolveInstructionText } from "../../i18n/overlays/instructionGloss";
import { completeJourneyNode } from "../../lib/journeyNodeProgress";

const STANDALONE_SECONDS = 60;

export function MandarinBlitzPage() {
  const [searchParams] = useSearchParams();
  const { instructionLocale } = useTranslation();
  const journeyMode = searchParams.get("journeyNode") === FOUNDATION_BLITZ_NODE.id;
  const session: BlitzSessionConfig = journeyMode
    ? { timeLimitSeconds: FOUNDATION_BLITZ_NODE.timeLimitSeconds ?? 45, maxQuestions: FOUNDATION_BLITZ_NODE.maxQuestions ?? 8 }
    : { timeLimitSeconds: STANDALONE_SECONDS, maxQuestions: null };
  const copy = instructionLocale === "en" ? {
    empty: "Learn at least two phrases or characters in the Journey to build a safe deck with no locked content.",
    journey: "Journey booster",
    training: "Retrieval speed practice",
    description: "Audio, meaning, hànzì, missing pieces, and tones — using only content you have already unlocked.",
    points: "Points", accuracy: "Accuracy", response: "Response", replay: "Play again", start: "Start Blitz",
    back: journeyMode ? "Back to Journey" : "Back to Practice", srs: "Blitz feeds your SRS, but does not grant Qi, XP, or core mastery.",
    score: "points", combo: "Combo", listen: "Listen again", questions: "challenges at most",
  } : {
    empty: "Aprenda pelo menos duas frases ou caracteres na Jornada para formar um baralho seguro, sem conteúdo ainda bloqueado.",
    journey: "Reforço da Jornada",
    training: "Treino de recuperação rápida",
    description: "Áudio, significado, hànzì, peça ausente e tom — somente com o que você já desbloqueou.",
    points: "Pontos", accuracy: "Precisão", response: "Resposta", replay: "Jogar de novo", start: "Começar Blitz",
    back: journeyMode ? "Voltar à Jornada" : "Voltar a Praticar", srs: "O Blitz alimenta o SRS, mas não concede Qi, XP ou mastery core.",
    score: "pontos", combo: "Combo", listen: "Ouvir novamente", questions: "desafios no máximo",
  };
  const learnedChunkIds = useStore((state) => state.learnedChunks);
  const learnedCharIds = useStore((state) => state.learnedChars);
  const gradeSrs = useStore((state) => state.gradeSrs);
  const ensureSrs = useStore((state) => state.ensureSrs);
  const addMinutes = useStore((state) => state.addMinutes);
  const [phase, setPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [seconds, setSeconds] = useState(session.timeLimitSeconds);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [responseMs, setResponseMs] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const questionStartedAtRef = useRef(Date.now());
  const creditedRef = useRef(false);
  const nextTimerRef = useRef<number | null>(null);

  const learnedChunks = useMemo(
    () => CHUNKS.filter((chunk) => learnedChunkIds.includes(chunk.id) && (!journeyMode || FOUNDATION_BLITZ_NODE.allowedKnowledgeTargetIds?.includes(`chunk:${chunk.id}`))),
    [journeyMode, learnedChunkIds]
  );
  const learnedCharacters = useMemo(
    () => CHARACTERS.filter((character) => learnedCharIds.includes(character.id) && (!journeyMode || FOUNDATION_BLITZ_NODE.allowedKnowledgeTargetIds?.includes(`char:${character.id}`))),
    [journeyMode, learnedCharIds]
  );
  const deck = useMemo(
    () => buildMandarinBlitzDeck(learnedChunks, learnedCharacters, `${learnedChunkIds.join("|")}:${learnedCharIds.join("|")}`),
    [learnedCharIds, learnedCharacters, learnedChunkIds, learnedChunks]
  );
  const question = deck.length > 0 ? deck[index % deck.length] : undefined;

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setPhase("finished");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "finished" || creditedRef.current) return;
    creditedRef.current = true;
    if (journeyMode) completeJourneyNode(FOUNDATION_BLITZ_NODE.id);
    addMinutes("fala", 1);
  }, [addMinutes, journeyMode, phase]);

  useEffect(() => () => {
    if (nextTimerRef.current != null) window.clearTimeout(nextTimerRef.current);
  }, []);

  useEffect(() => {
    if (phase !== "playing" || !question?.audioText) return;
    const timer = window.setTimeout(() => speak(question.audioText!, { rate: 0.84 }), 220);
    return () => window.clearTimeout(timer);
  }, [phase, question]);

  function start() {
    creditedRef.current = false;
    setPhase("playing");
    setSeconds(session.timeLimitSeconds);
    setIndex(0);
    setScore(0);
    setCombo(0);
    setCorrect(0);
    setAnswered(0);
    setResponseMs(0);
    setPicked(null);
    questionStartedAtRef.current = Date.now();
  }

  function answer(option: string) {
    if (!question || picked || phase !== "playing") return;
    const wasCorrect = option === question.answer;
    const elapsed = Math.max(0, Date.now() - questionStartedAtRef.current);
    setPicked(option);
    const nextAnswered = answered + 1;
    setAnswered(nextAnswered);
    setResponseMs((value) => value + elapsed);
    ensureSrs(question.sourceType, question.sourceId, question.track, question.reviewDomain);
    gradeSrs(
      question.sourceType,
      question.sourceId,
      wasCorrect ? "good" : "again",
      question.track,
      question.reviewDomain
    );
    if (wasCorrect) {
      setCorrect((value) => value + 1);
      setScore((value) => value + 100 + Math.min(combo, 10) * 10);
      setCombo((value) => value + 1);
    } else {
      setCombo(0);
    }
    nextTimerRef.current = window.setTimeout(() => {
      if (reachedBlitzQuestionLimit(nextAnswered, session)) {
        if (journeyMode) completeJourneyNode(FOUNDATION_BLITZ_NODE.id);
        setPhase("finished");
        return;
      }
      setIndex((value) => value + 1);
      setPicked(null);
      questionStartedAtRef.current = Date.now();
    }, 520);
  }

  if (deck.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Card className="p-6 text-center">
          <IconFlame width={40} height={40} className="mx-auto text-accent" />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">Mandarin Blitz</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{copy.empty}</p>
          <ButtonLink className="mt-5 w-full" to="/jornada">{instructionLocale === "en" ? "Go to Journey" : "Ir para a Jornada"}</ButtonLink>
        </Card>
      </div>
    );
  }

  if (phase !== "playing") {
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return (
      <div className="mx-auto max-w-lg py-6">
        <Card className="overflow-hidden p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <IconFlame width={34} height={34} />
          </div>
          <div className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-accent">{journeyMode ? copy.journey : copy.training}</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Mandarin Blitz</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{copy.description}</p>
          <p className="mt-2 text-xs font-semibold text-ink-faint">{session.timeLimitSeconds}s{session.maxQuestions != null ? ` · ${session.maxQuestions} ${copy.questions}` : ""}</p>
          {phase === "finished" && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat label={copy.points} value={score} />
              <Stat label={copy.accuracy} value={`${accuracy}%`} />
              <Stat label={copy.response} value={answered > 0 ? `${(responseMs / answered / 1000).toFixed(1)}s` : "—"} />
            </div>
          )}
          <Button size="lg" className="mt-6 w-full" onClick={start}>
            {phase === "finished" ? copy.replay : copy.start}
          </Button>
          <ButtonLink variant="outline" className="mt-3 w-full" to={journeyMode ? "/jornada" : "/treino"}>{copy.back}</ButtonLink>
          <p className="mt-3 text-xs text-ink-faint">{copy.srs}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-4" data-testid="bounded-blitz" data-time-limit={session.timeLimitSeconds} data-max-questions={session.maxQuestions ?? "unbounded"}>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-ink">
        <span>{seconds}s</span>
        <span>{score} {copy.score}</span>
        <span>{copy.combo} {combo}</span>
      </div>
      <ProgressBar value={seconds} max={session.timeLimitSeconds} />
      {question && (
        <Card className="mt-4 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Mandarin Blitz</div>
          <h2 className="mt-2 font-serif text-xl font-semibold text-ink">{resolveInstructionText(question.prompt, instructionLocale)}</h2>
          {question.audioText && (
            <button
              type="button"
              onClick={() => speak(question.audioText!, { rate: 0.84 })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent-soft bg-accent-soft/50 px-4 py-5 font-semibold text-accent"
            >
              <IconSound width={24} height={24} /> {copy.listen}
            </button>
          )}
          {question.stimulus && (
            <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-5 text-center text-3xl font-semibold text-ink">
              <ExerciseText value={resolveInstructionText(question.stimulus, instructionLocale)} type={/[\u3400-\u9fff]/u.test(question.stimulus) ? "hanzi" : "pt"} />
            </div>
          )}
          <div className="mt-4 grid gap-2">
            {question.options.map((option) => {
              const isCorrect = picked !== null && option === question.answer;
              const isWrong = picked === option && option !== question.answer;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid="blitz-option"
                  disabled={picked !== null}
                  onClick={() => answer(option)}
                  className={[
                    "flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-left font-semibold transition",
                    isCorrect ? "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" :
                    isWrong ? "border-transparent bg-wrong-soft text-wrong" : "border-line bg-surface text-ink hover:border-accent-soft",
                  ].join(" ")}
                >
                  <ExerciseText value={resolveInstructionText(option, instructionLocale)} type={/[\u3400-\u9fff]/u.test(option) ? "hanzi" : "pt"} />
                  {isCorrect && <IconCheck width={20} height={20} />}
                  {isWrong && <IconX width={20} height={20} />}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3">
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  );
}
