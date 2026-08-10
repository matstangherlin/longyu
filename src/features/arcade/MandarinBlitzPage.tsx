import { useEffect, useMemo, useRef, useState } from "react";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import { ExerciseText } from "../../components/hanzi/ExerciseText";
import { Button, ButtonLink, Card, ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconFlame, IconSound, IconX } from "../../components/ui/Icon";
import { speak } from "../../lib/tts";
import { useStore } from "../../lib/store";
import { buildMandarinBlitzDeck } from "./blitzEngine";

const ROUND_SECONDS = 60;

export function MandarinBlitzPage() {
  const learnedChunkIds = useStore((state) => state.learnedChunks);
  const learnedCharIds = useStore((state) => state.learnedChars);
  const gradeSrs = useStore((state) => state.gradeSrs);
  const ensureSrs = useStore((state) => state.ensureSrs);
  const addMinutes = useStore((state) => state.addMinutes);
  const [phase, setPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
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
    () => CHUNKS.filter((chunk) => learnedChunkIds.includes(chunk.id)),
    [learnedChunkIds]
  );
  const learnedCharacters = useMemo(
    () => CHARACTERS.filter((character) => learnedCharIds.includes(character.id)),
    [learnedCharIds]
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
    addMinutes("fala", 1);
  }, [addMinutes, phase]);

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
    setSeconds(ROUND_SECONDS);
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
    setAnswered((value) => value + 1);
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
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Aprenda pelo menos duas frases ou caracteres na Jornada para formar um baralho seguro, sem conteúdo ainda bloqueado.
          </p>
          <ButtonLink className="mt-5 w-full" to="/jornada">Ir para a Jornada</ButtonLink>
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
          <div className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-accent">Treino de 60 segundos</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Mandarin Blitz</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Áudio, significado, hànzì, peça ausente e tom — somente com o que você já desbloqueou.
          </p>
          {phase === "finished" && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat label="Pontos" value={score} />
              <Stat label="Precisão" value={`${accuracy}%`} />
              <Stat label="Resposta" value={answered > 0 ? `${(responseMs / answered / 1000).toFixed(1)}s` : "—"} />
            </div>
          )}
          <Button size="lg" className="mt-6 w-full" onClick={start}>
            {phase === "finished" ? "Jogar de novo" : "Começar Blitz"}
          </Button>
          <ButtonLink variant="outline" className="mt-3 w-full" to="/treino">Voltar a Praticar</ButtonLink>
          <p className="mt-3 text-xs text-ink-faint">O Blitz alimenta o SRS, mas não concede Qi ou XP.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-ink">
        <span>{seconds}s</span>
        <span>{score} pontos</span>
        <span>Combo {combo}</span>
      </div>
      <ProgressBar value={seconds} max={ROUND_SECONDS} />
      {question && (
        <Card className="mt-4 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Mandarin Blitz</div>
          <h2 className="mt-2 font-serif text-xl font-semibold text-ink">{question.prompt}</h2>
          {question.audioText && (
            <button
              type="button"
              onClick={() => speak(question.audioText!, { rate: 0.84 })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent-soft bg-accent-soft/50 px-4 py-5 font-semibold text-accent"
            >
              <IconSound width={24} height={24} /> Ouvir novamente
            </button>
          )}
          {question.stimulus && (
            <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-5 text-center text-3xl font-semibold text-ink">
              <ExerciseText value={question.stimulus} type={/[\u3400-\u9fff]/u.test(question.stimulus) ? "hanzi" : "pt"} />
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
                  disabled={picked !== null}
                  onClick={() => answer(option)}
                  className={[
                    "flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-left font-semibold transition",
                    isCorrect ? "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" :
                    isWrong ? "border-transparent bg-wrong-soft text-wrong" : "border-line bg-surface text-ink hover:border-accent-soft",
                  ].join(" ")}
                >
                  <ExerciseText value={option} type={/[\u3400-\u9fff]/u.test(option) ? "hanzi" : "pt"} />
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
