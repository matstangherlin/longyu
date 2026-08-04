import { useEffect, useRef, useState } from "react";
import {
  analyzePronunciation,
  ensureMicPermission,
  isRecognitionAvailable,
  isSecureMicContext,
  recognizeOnce,
  speechErrorMessage,
  type PronunciationAnalysis,
  type RecognizeErrorCode,
  type RecognizeHandle,
} from "../../lib/speech";
import { Button } from "../../components/ui/primitives";
import { IconCheck, IconX, IconChevron } from "../../components/ui/Icon";

type Phase = "idle" | "listening" | "result";

function isTouchUi(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 0 || (typeof window !== "undefined" && "ontouchstart" in window);
}

/** Veredito textual — usado no resultado da prática de fala. */
function verdictCopy(heard: string, analysis: PronunciationAnalysis | null, correct: boolean): string {
  if (!heard || !analysis || !analysis.ratio) {
    return "Não reconheci o que você falou. Ouça o áudio e tente de novo.";
  }
  if (correct) {
    if (analysis.hasExtra) {
      return "Reconheci os caracteres na ordem certa, com conteúdo a mais. Confira o tom no Treino de tons.";
    }
    return "Reconheci os caracteres na ordem certa. O microfone não confirma o tom — use o Treino de tons para afinar.";
  }
  const total = analysis.matchedMask.length;
  return `Quase — acertou ${analysis.matched.length} de ${total} na ordem. Compare os que faltaram e tente de novo.`;
}

// Prática de fala: autoriza o mic, reconhece o que foi dito e compara com o alvo.
// Playback (MediaRecorder) só no desktop — no mobile gravar AO MESMO TEMPO
// disputa o mic com o SpeechRecognition e o quebra.
export function PronunciationPractice({
  target,
  onContinue,
}: {
  target: string;
  onContinue: () => void;
}) {
  const secure = isSecureMicContext();
  const supported = isRecognitionAvailable();
  const touchUi = isTouchUi();

  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [correct, setCorrect] = useState(false);
  const [analysis, setAnalysis] = useState<PronunciationAnalysis | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const handleRef = useRef<RecognizeHandle | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      if (recorderRef.current?.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined;
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
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

  function stopRecorder() {
    const mr = recorderRef.current;
    if (mr && mr.state === "recording") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
  }

  function finishResult(transcript: string) {
    const r = analyzePronunciation(transcript, target);
    setHeard(transcript);
    setCorrect(r.correct);
    setAnalysis(r);
    setErrorHint(transcript ? null : speechErrorMessage("no-speech"));
    stopRecorder();
    handleRef.current = null;
    setBusy(false);
    setPhase("result");
  }

  function finishError(code: RecognizeErrorCode) {
    setHeard("");
    setCorrect(false);
    setErrorHint(speechErrorMessage(code));
    stopRecorder();
    handleRef.current = null;
    setBusy(false);
    setPhase("result");
  }

  async function start() {
    if (busy) return;
    setBusy(true);
    setPhase("listening");
    setHeard("");
    setAnalysis(null);
    setErrorHint(null);
    setAudioUrl(null);
    stopRecorder();

    // 1) Prime da permissão + libera o stream (obrigatório no Chrome Android).
    const permission = await ensureMicPermission();
    if (permission === "denied") {
      finishError("not-allowed");
      return;
    }
    if (permission === "unavailable") {
      finishError(secure ? "unsupported" : "insecure");
      return;
    }

    // 2) Playback só no desktop, e só DEPOIS do prime (stream do prime já foi parado).
    if (!touchUi) {
      await startRecording();
    }

    // 3) Reconhecimento com continuous/interim — aguenta a fala no mobile.
    handleRef.current = recognizeOnce(
      (transcript) => finishResult(transcript),
      (code) => finishError(code),
      { lang: "zh-CN", timeoutMs: touchUi ? 15000 : 10000 }
    );
  }

  function stopListening() {
    handleRef.current?.stop();
  }

  if (!secure || !supported) {
    return (
      <div className="mt-6">
        <Button className="w-full" onClick={onContinue}>
          Continuar <IconChevron width={18} height={18} />
        </Button>
        <p className="mt-2 text-center text-xs text-ink-faint">
          {!secure
            ? "O microfone só funciona em conexão segura (HTTPS)."
            : "Este navegador não reconhece voz (o Safari do iPhone ainda não tem esse recurso). No Chrome/Edge — do Android ou do computador — você pratica falando. Enquanto isso, toque em ouvir e repita em voz alta."}
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
        <p className="max-w-xs text-center text-xs text-ink-faint">
          Fale o hànzì em voz alta. Quando terminar, toque em Parar — ou espere o app reconhecer.
        </p>
        <Button variant="outline" onClick={stopListening}>
          Parar
        </Button>
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
            {verdictCopy(heard, analysis, correct)}
          </div>
          {heard && analysis && (
            <div className="mt-2 space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">Você</span>
                <span className="hanzi text-lg text-ink">{heard}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">Alvo</span>
                <span className="flex flex-wrap gap-1">
                  {(() => {
                    let hanziIdx = 0;
                    return [...target].map((ch, i) => {
                      const cjk = /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);
                      const ok = cjk ? Boolean(analysis.matchedMask[hanziIdx++]) : false;
                      return (
                        <span
                          key={i}
                          className={[
                            "hanzi rounded px-1 text-lg",
                            ok ? "text-[rgb(var(--good))]" : cjk ? "text-accent" : "text-ink-faint",
                          ].join(" ")}
                        >
                          {ch}
                        </span>
                      );
                    });
                  })()}
                </span>
              </div>
            </div>
          )}
          {!heard && errorHint && (
            <p className="mt-2 text-xs leading-5 text-ink-soft">{errorHint}</p>
          )}
          {heard && (
            <p className="mt-2 text-[11px] leading-4 text-ink-faint">
              O reconhecedor compara caracteres na ordem — nao confirma tom nem pronúncia perfeita.
              Para afinar o tom, use o Treino de tons.
            </p>
          )}
          {audioUrl && (
            <div className="mt-2">
              <div className="mb-1 text-[11px] text-ink-faint">sua gravação:</div>
              <audio controls src={audioUrl} className="mx-auto w-full max-w-xs" />
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={start} disabled={busy}>
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
      <Button className="w-full" size="lg" onClick={start} disabled={busy}>
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
