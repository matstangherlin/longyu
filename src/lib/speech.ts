// Reconhecimento de fala via Web Speech API (SpeechRecognition).
// Grátis e nativo do navegador. Funciona em Chrome/Edge (webkit*),
// exige HTTPS ou localhost e permissão de microfone.

export function isRecognitionAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export interface RecognizeHandle {
  stop: () => void;
}

/** Escuta uma vez e devolve o que foi reconhecido (ou um erro). */
export function recognizeOnce(
  onResult: (transcript: string) => void,
  onError: (err: string) => void,
  lang = "zh-CN"
): RecognizeHandle {
  const SR =
    (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
  if (!SR) {
    onError("unsupported");
    return { stop: () => {} };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = new (SR as any)();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  let settled = false;
  rec.onresult = (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
    settled = true;
    onResult(e.results?.[0]?.[0]?.transcript ?? "");
  };
  rec.onerror = (e: { error?: string }) => {
    if (!settled) {
      settled = true;
      onError(e.error || "error");
    }
  };
  rec.onend = () => {
    if (!settled) {
      settled = true;
      onError("no-speech");
    }
  };
  try {
    rec.start();
  } catch {
    onError("start-failed");
  }
  return { stop: () => { try { rec.stop(); } catch { /* ignore */ } } };
}

const HAN = /[一-鿿]/g;

export function normalizeHan(s: string): string {
  return (s.match(HAN) || []).join("");
}

/** Compara o que foi falado com o alvo (por sobreposição de caracteres). */
export function scorePronunciation(
  heard: string,
  target: string
): { correct: boolean; ratio: number } {
  const h = normalizeHan(heard);
  const t = normalizeHan(target);
  if (!t || !h) return { correct: false, ratio: 0 };
  if (h === t) return { correct: true, ratio: 1 };
  const counts = new Map<string, number>();
  for (const c of t) counts.set(c, (counts.get(c) || 0) + 1);
  let hit = 0;
  for (const c of h) {
    const n = counts.get(c) || 0;
    if (n > 0) {
      hit += 1;
      counts.set(c, n - 1);
    }
  }
  const ratio = hit / t.length;
  return { correct: ratio >= 0.6, ratio };
}
