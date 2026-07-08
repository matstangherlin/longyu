import { useEffect, useRef, useState } from "react";
import {
  isRecognitionAvailable,
  recognizeOnce,
  scorePronunciation,
} from "../../lib/speech";
import { Button } from "../../components/ui/primitives";
import { IconCheck, IconX, IconChevron } from "../../components/ui/Icon";

type Phase = "idle" | "listening" | "result";

// Prática de fala: autoriza o mic, reconhece o que foi dito, compara com o
// alvo e deixa ouvir a própria gravação. Tudo grátis (Web Speech + MediaRecorder).
export function PronunciationPractice({
  target,
  onContinue,
}: {
  target: string;
  onContinue: () => void;
}) {
  const supported = isRecognitionAvailable();
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [correct, setCorrect] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
    } catch {
      /* sem playback — segue só com o reconhecimento */
    }
  }

  function start() {
    setPhase("listening");
    setHeard("");
    setAudioUrl(null);
    startRecording();
    recognizeOnce(
      (t) => {
        const r = scorePronunciation(t, target);
        setHeard(t);
        setCorrect(r.correct);
        recorderRef.current?.stop();
        setPhase("result");
      },
      () => {
        setHeard("");
        setCorrect(false);
        recorderRef.current?.stop();
        setPhase("result");
      }
    );
  }

  if (!supported) {
    return (
      <div className="mt-6">
        <Button className="w-full" onClick={onContinue}>
          Continuar <IconChevron width={18} height={18} />
        </Button>
        <p className="mt-2 text-center text-xs text-ink-faint">
          No Chrome ou Edge você pode praticar falando — o app reconhece sua voz.
        </p>
      </div>
    );
  }

  if (phase === "listening") {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-2">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-accent text-2xl text-white ring-4 ring-accent-soft">
          🎤
        </div>
        <p className="text-sm font-medium text-accent">Fale agora…</p>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="mt-5">
        <div
          className={[
            "rounded-xl p-3 text-center",
            correct ? "bg-[rgb(var(--good)/0.12)]" : "bg-accent-soft",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-center gap-1.5 text-sm font-semibold",
              correct ? "text-[rgb(var(--good))]" : "text-accent",
            ].join(" ")}
          >
            {correct ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
            {correct
              ? "Boa! Você falou certo."
              : heard
              ? "Quase — compare e tente de novo"
              : "Não consegui ouvir. Tente de novo."}
          </div>
          {heard && (
            <div className="mt-1">
              <span className="text-xs text-ink-faint">ouvi: </span>
              <span className="hanzi text-lg text-ink">{heard}</span>
            </div>
          )}
          {audioUrl && (
            <div className="mt-2">
              <div className="mb-1 text-[11px] text-ink-faint">sua gravação:</div>
              <audio controls src={audioUrl} className="mx-auto w-full max-w-xs" />
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={start}>
            🎤 De novo
          </Button>
          <Button onClick={onContinue}>
            Continuar <IconChevron width={18} height={18} />
          </Button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="mt-6 space-y-2">
      <Button className="w-full" size="lg" onClick={start}>
        🎤 Falar
      </Button>
      <button
        onClick={onContinue}
        className="w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink"
      >
        Não posso falar agora
      </button>
    </div>
  );
}
