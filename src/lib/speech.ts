// Reconhecimento de fala via Web Speech API (SpeechRecognition).
// Grátis e nativo do navegador. Funciona em Chrome/Edge (webkit*),
// exige HTTPS ou localhost e permissão de microfone.
//
// No Chrome Android o padrão que quebra o mic é:
// 1) não pedir getUserMedia antes (a permissão do SpeechRecognition falha/silencia);
// 2) manter MediaRecorder/getUserMedia ABERTO enquanto reconhece (disputa o mic);
// 3) continuous:false + onend imediato → "no-speech" antes do aluno terminar.

export function isRecognitionAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export function isSecureMicContext(): boolean {
  return typeof window !== "undefined" && Boolean(window.isSecureContext);
}

export type MicPermission = "granted" | "denied" | "unavailable";

/**
 * Pede permissão de microfone e LIBERA o stream na hora.
 * Necessário no Chrome Android: sem esse "prime", o SpeechRecognition
 * costuma cair em no-speech / aborted / not-allowed.
 * Nunca deixe o stream aberto ao iniciar o reconhecimento.
 */
export async function ensureMicPermission(): Promise<MicPermission> {
  if (typeof window === "undefined" || !window.isSecureContext) return "unavailable";
  if (!navigator.mediaDevices?.getUserMedia) return "unavailable";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
    // Pequena folga: no Android o hardware às vezes ainda "segura" o mic
    // se o SpeechRecognition começa no mesmo tick do stop().
    await new Promise((resolve) => setTimeout(resolve, 80));
    return "granted";
  } catch {
    return "denied";
  }
}

export interface RecognizeHandle {
  stop: () => void;
}

export type RecognizeErrorCode =
  | "unsupported"
  | "insecure"
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "start-failed"
  | "error";

function mapError(code?: string): RecognizeErrorCode {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    case "start-failed":
      return "start-failed";
    case "insecure":
      return "insecure";
    case "unsupported":
      return "unsupported";
    default:
      return "error";
  }
}

export function speechErrorMessage(code: RecognizeErrorCode | string): string {
  switch (mapError(code)) {
    case "not-allowed":
      return "Preciso da permissão do microfone. Autorize nas configurações do navegador e toque em Falar de novo.";
    case "insecure":
      return "O microfone só funciona em conexão segura (HTTPS).";
    case "unsupported":
      return "Este navegador não reconhece voz. No Chrome ou Edge costuma funcionar bem.";
    case "network":
      return "Sem conexão com o serviço de voz. Confira a internet e tente de novo.";
    case "audio-capture":
      return "Não consegui acessar o microfone. Feche outros apps que estejam usando o mic e tente de novo.";
    case "aborted":
      return "A escuta foi interrompida. Toque em Falar e fale logo em seguida.";
    case "no-speech":
      return "Não consegui entender sua fala. Tente novamente falando um pouco mais devagar e perto do mic.";
    case "start-failed":
      return "Não deu para iniciar o microfone. Toque de novo em Falar.";
    default:
      return "Não consegui entender sua fala. Tente novamente falando um pouco mais devagar.";
  }
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface RecognizeOnceOptions {
  lang?: string;
  /** Tempo máximo de escuta (ms). No mobile o padrão curto corta a fala. */
  timeoutMs?: number;
}

/**
 * Escuta uma vez e devolve o que foi reconhecido (ou um erro).
 * Usa continuous + interimResults para sobreviver ao Chrome Android,
 * que encerra cedo demais com continuous:false.
 */
export function recognizeOnce(
  onResult: (transcript: string) => void,
  onError: (err: RecognizeErrorCode) => void,
  langOrOptions: string | RecognizeOnceOptions = "zh-CN"
): RecognizeHandle {
  const options: RecognizeOnceOptions =
    typeof langOrOptions === "string" ? { lang: langOrOptions } : langOrOptions;
  const lang = options.lang ?? "zh-CN";
  const timeoutMs = options.timeoutMs ?? 12000;

  if (typeof window === "undefined" || !window.isSecureContext) {
    onError("insecure");
    return { stop: () => {} };
  }

  const SR = getSpeechRecognitionCtor();
  if (!SR) {
    onError("unsupported");
    return { stop: () => {} };
  }

  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  // continuous:true evita o corte precoce (no-speech) do Chrome mobile.
  rec.continuous = true;

  let settled = false;
  let finalTranscript = "";
  let interimTranscript = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finishOk = (transcript: string) => {
    if (settled) return;
    settled = true;
    clearTimer();
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    onResult(transcript.trim());
  };

  const finishErr = (code: RecognizeErrorCode) => {
    if (settled) return;
    settled = true;
    clearTimer();
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    onError(code);
  };

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const bestTranscript = () => (finalTranscript || interimTranscript).trim();

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i]?.[0]?.transcript ?? "";
      if (event.results[i]?.isFinal) finalTranscript += piece;
      else interim += piece;
    }
    interimTranscript = interim;

    // Resultado final com conteúdo → encerra (uma fala completa).
    if (finalTranscript.trim()) {
      finishOk(finalTranscript);
    }
  };

  rec.onerror = (event) => {
    const code = mapError(event.error);
    // "aborted"/"no-speech" no meio do caminho: se já temos transcript, usa.
    const heard = bestTranscript();
    if (heard && (code === "aborted" || code === "no-speech")) {
      finishOk(heard);
      return;
    }
    // "no-speech" com continuous às vezes dispara sem matar a sessão —
    // só falha de verdade se ainda não ouviu nada e a sessão vai acabar no onend.
    if (code === "no-speech" && !heard) return;
    finishErr(code);
  };

  rec.onend = () => {
    if (settled) return;
    const heard = bestTranscript();
    if (heard) finishOk(heard);
    else finishErr("no-speech");
  };

  timer = setTimeout(() => {
    if (settled) return;
    const heard = bestTranscript();
    if (heard) finishOk(heard);
    else {
      try {
        rec.stop();
      } catch {
        finishErr("no-speech");
      }
    }
  }, timeoutMs);

  try {
    rec.start();
  } catch {
    finishErr("start-failed");
  }

  return {
    stop: () => {
      const heard = bestTranscript();
      if (heard) finishOk(heard);
      else {
        try {
          rec.stop();
        } catch {
          finishErr("aborted");
        }
      }
    },
  };
}

const HAN = /[一-鿿]/g;

export function normalizeHan(s: string): string {
  return (s.match(HAN) || []).join("");
}

/** Compara o que foi falado com o alvo preservando a ORDEM dos caracteres. */
export function scorePronunciation(
  heard: string,
  target: string
): { correct: boolean; ratio: number; hasExtra: boolean } {
  const analysis = analyzePronunciation(heard, target);
  return { correct: analysis.correct, ratio: analysis.ratio, hasExtra: analysis.hasExtra };
}

export interface PronunciationAnalysis {
  correct: boolean;
  ratio: number;
  /**
   * Por posição no hànzì normalizado do ALVO: true se aquele caractere
   * foi encontrado na fala na ordem correta (ex.: 谢谢 + "谢" → [true, false]).
   */
  matchedMask: boolean[];
  /** Caracteres do alvo reconhecidos na ordem (só os acertos). */
  matched: string[];
  /** Caracteres do alvo que faltaram na ordem. */
  missing: string[];
  /** A fala tinha hànzì sobrando depois de cobrir o alvo. */
  hasExtra: boolean;
}

/**
 * Análise estruturada com ordem. O reconhecedor (Web Speech) compara
 * caracteres — ele nao valida tom; a UI deve deixar isso claro.
 *
 * `好你` nao cobre `你好`: cada caractere do alvo consome a próxima
 * ocorrência na fala a partir do cursor (subsequência ordenada).
 */
export function analyzePronunciation(heard: string, target: string): PronunciationAnalysis {
  const h = normalizeHan(heard);
  const t = normalizeHan(target);
  if (!t) {
    return { correct: false, ratio: 0, matchedMask: [], matched: [], missing: [], hasExtra: false };
  }
  if (!h) {
    return {
      correct: false,
      ratio: 0,
      matchedMask: Array.from(t, () => false),
      matched: [],
      missing: [...t],
      hasExtra: false,
    };
  }

  const matchedMask: boolean[] = [];
  const matched: string[] = [];
  const missing: string[] = [];
  let cursor = 0;
  let consumed = 0;

  for (const c of t) {
    const idx = h.indexOf(c, cursor);
    if (idx >= 0) {
      matchedMask.push(true);
      matched.push(c);
      cursor = idx + 1;
      consumed += 1;
    } else {
      matchedMask.push(false);
      missing.push(c);
    }
  }

  const hasExtra = h.length > consumed;
  const ratio = t.length ? matched.length / t.length : 0;
  // Correto só se TODOS os caracteres do alvo aparecem na ordem.
  // Extras (你好世界) sao permitidos com aviso — nao invalidam o alvo.
  const correct = missing.length === 0;
  return { correct, ratio, matchedMask, matched, missing, hasExtra };
}
