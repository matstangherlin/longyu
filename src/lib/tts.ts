// Wrapper sobre a Web Speech API (speechSynthesis) para áudio zh-CN.
// Trocável por um TTS na nuvem depois sem mexer nas telas: basta
// reimplementar speak() mantendo a assinatura.

import { useStore } from "./store";

let cachedVoice: SpeechSynthesisVoice | null = null;
let warmed = false;

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Preferência: zh-CN > zh > qualquer "Chinese" no nome.
  const byLang = (re: RegExp) => voices.find((v) => re.test(v.lang));
  cachedVoice =
    byLang(/zh[-_]?CN/i) ||
    byLang(/zh[-_]?(HK|TW|SG)/i) ||
    byLang(/^zh/i) ||
    voices.find((v) => /chinese|mandarin|普通话|中文/i.test(v.name)) ||
    null;
  return cachedVoice;
}

export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Carrega vozes (algumas plataformas só preenchem após o evento). */
export function warmUpVoices(): Promise<void> {
  if (!isTTSAvailable() || warmed) return Promise.resolve();
  return new Promise((resolve) => {
    const tryPick = () => {
      if (pickChineseVoice()) {
        warmed = true;
        resolve();
      }
    };
    tryPick();
    window.speechSynthesis.onvoiceschanged = () => {
      tryPick();
      resolve();
    };
    // fallback: resolve mesmo sem voz dedicada
    setTimeout(resolve, 600);
  });
}

export interface SpeakOptions {
  rate?: number; // 0.1–10 (padrão 0.85: um pouco mais lento p/ estudo)
  pitch?: number;
  volume?: number;
  onend?: () => void;
}

/** Fala um texto chinês. Cancela qualquer fala anterior. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isTTSAvailable()) {
    opts.onend?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = cachedVoice || pickChineseVoice();
  const preferences = useStore.getState();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || "zh-CN";
  u.rate = opts.rate ?? (preferences.slowAudio ? Math.min(preferences.ttsRate ?? 0.85, 0.65) : preferences.ttsRate ?? 0.85);
  u.pitch = opts.pitch ?? 1;
  u.volume = Math.max(0, Math.min(1, opts.volume ?? preferences.ttsVolume ?? 1));
  if (opts.onend) u.onend = opts.onend;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (isTTSAvailable()) window.speechSynthesis.cancel();
}

/** Há uma voz chinesa dedicada disponível? (para avisar o usuário) */
export function hasChineseVoice(): boolean {
  return Boolean(cachedVoice || pickChineseVoice());
}
