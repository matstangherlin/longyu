// Wrapper sobre a Web Speech API (speechSynthesis) para áudio zh-CN.
// Trocável por um TTS na nuvem depois sem mexer nas telas: basta
// reimplementar speak() mantendo a assinatura.

import { useStore } from "./store";

let cachedVoice: SpeechSynthesisVoice | null = null;
let warmed = false;
let lastUserGestureAt = 0;
// Timer da fala adiada (ver speak): cancelamos o anterior antes de agendar outro.
let pendingSpeakTimer: number | null = null;

function clearPendingSpeak(): void {
  if (pendingSpeakTimer != null) {
    window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
}

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

function resumeSpeechSynthesis(): void {
  if (!isTTSAvailable()) return;
  const synth = window.speechSynthesis;
  if (synth.paused) synth.resume();
}

/** Marca interação recente do usuário — necessário para autoplay em alguns browsers. */
export function noteUserGesture(): void {
  lastUserGestureAt = Date.now();
  resumeSpeechSynthesis();
}

/** Instala listener global (idempotente) para desbloquear TTS após toque/clique. */
export function installTTSGestureUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const onGesture = () => noteUserGesture();
  window.addEventListener("pointerdown", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
  return () => {
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
  };
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
  clearPendingSpeak();
  const u = new SpeechSynthesisUtterance(text);
  const voice = cachedVoice || pickChineseVoice();
  const preferences = useStore.getState();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || "zh-CN";
  u.rate = opts.rate ?? (preferences.slowAudio ? Math.min(preferences.ttsRate ?? 0.85, 0.65) : preferences.ttsRate ?? 0.85);
  u.pitch = opts.pitch ?? 1;
  u.volume = Math.max(0, Math.min(1, opts.volume ?? preferences.ttsVolume ?? 1));
  // Sempre encerra o estado "tocando", mesmo quando o navegador dispara `error`
  // (interrupção) em vez de `end` — comum no Firefox/Safari. Sem isto, o botão
  // fica preso em "tocando" e a fala não repete.
  if (opts.onend) {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      opts.onend?.();
    };
    u.onend = settle;
    u.onerror = settle;
  }

  // Enfileirar `speak()` na MESMA tick de `cancel()` faz o Firefox/Safari
  // descartarem a nova fala — a causa de o áudio "só repetir no Chrome". Quando
  // há algo tocando/pendente, cancelamos e adiamos o início um tick para o
  // motor esvaziar a fila; caso contrário, falamos direto.
  const wasBusy = synth.speaking || synth.pending;
  synth.cancel();
  const start = () => {
    pendingSpeakTimer = null;
    synth.speak(u);
    // Chrome às vezes ignora o primeiro speak() — um resume extra ajuda.
    resumeSpeechSynthesis();
  };
  if (wasBusy) {
    pendingSpeakTimer = window.setTimeout(start, 90);
  } else {
    start();
  }
}

export function stopSpeaking(): void {
  clearPendingSpeak();
  if (isTTSAvailable()) window.speechSynthesis.cancel();
}

function autoSpeakDelayMs(requested?: number): number {
  if (requested != null) return requested;
  return Date.now() - lastUserGestureAt < 2500 ? 0 : 120;
}

/**
 * Agenda fala automática ao montar/trocar conteúdo. Retorna cleanup que cancela
 * o timer pendente (sem interromper fala já iniciada por outro componente).
 */
export function scheduleAutoSpeak(text: string, opts: SpeakOptions & { delayMs?: number } = {}): () => void {
  const clean = String(text ?? "").trim();
  if (!clean) return () => {};
  let cancelled = false;
  const delayMs = autoSpeakDelayMs(opts.delayMs);
  const { delayMs: _delay, ...speakOpts } = opts;
  const timer = window.setTimeout(() => {
    void warmUpVoices().then(() => {
      if (cancelled) return;
      speak(clean, speakOpts);
    });
  }, delayMs);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

/** Há uma voz chinesa dedicada disponível? (para avisar o usuário) */
export function hasChineseVoice(): boolean {
  return Boolean(cachedVoice || pickChineseVoice());
}
