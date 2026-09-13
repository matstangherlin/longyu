// Wrapper sobre a Web Speech API (speechSynthesis) para áudio zh-CN.
// Trocável por um TTS na nuvem depois sem mexer nas telas: basta
// reimplementar speak() mantendo a assinatura.

import { unlockAudio } from "./soundFx";
import { useStore } from "./store";
import { speakableProperNames } from "./personalize";

let cachedVoice: SpeechSynthesisVoice | null = null;
let warmed = false;
let lastUserGestureAt = 0;
// Timer da fala adiada (ver speak): cancelamos o anterior antes de agendar outro.
let pendingSpeakTimer: number | null = null;
/** Chrome corta falas longas ~15s se paused — resume periódico enquanto fala. */
let chromeResumeTimer: number | null = null;

function clearPendingSpeak(): void {
  if (pendingSpeakTimer != null) {
    window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
}

function clearChromeResumeWatchdog(): void {
  if (chromeResumeTimer != null) {
    window.clearInterval(chromeResumeTimer);
    chromeResumeTimer = null;
  }
}

function startChromeResumeWatchdog(): void {
  clearChromeResumeWatchdog();
  if (!isTTSAvailable()) return;
  chromeResumeTimer = window.setInterval(() => {
    const synth = window.speechSynthesis;
    if (!synth.speaking && !synth.pending) {
      clearChromeResumeWatchdog();
      return;
    }
    // Chrome: fala "travada" em paused; resume periódico mantém o áudio vivo.
    try {
      synth.resume();
    } catch {
      // ignore
    }
  }, 10_000);
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

/** Marca interação recente do usuário — necessário para autoplay em Safari/iOS. */
export function noteUserGesture(): void {
  lastUserGestureAt = Date.now();
  resumeSpeechSynthesis();
  // Mesmo gesto desbloqueia SFX (AudioContext) — sem isso o 1º efeito some no iOS.
  unlockAudio();
}

/** true se houve gesto recente o bastante para autoplay (Safari/iOS). */
export function hasRecentTtsGesture(withinMs = 2500): boolean {
  return Date.now() - lastUserGestureAt < withinMs;
}

/** Instala listener global (idempotente) para desbloquear TTS + SFX após toque/clique. */
export function installTTSGestureUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const onGesture = () => noteUserGesture();
  window.addEventListener("pointerdown", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
  window.addEventListener("touchstart", onGesture, { capture: true, passive: true });
  return () => {
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
    window.removeEventListener("touchstart", onGesture, true);
  };
}

export function isTTSAvailable(): boolean {
  // `"speechSynthesis" in window` respondia "sim" para uma propriedade que
  // existe valendo `undefined` — e aí a fala ia adiante e estourava ao chamar
  // `.speak`. Perguntar pelo objeto e pelo método é a pergunta que interessa:
  // "dá para falar?", não "o nome está declarado?".
  if (typeof window === "undefined") return false;
  const synth = window.speechSynthesis as SpeechSynthesis | undefined | null;
  return Boolean(synth) && typeof synth?.speak === "function";
}

/** Carrega vozes (algumas plataformas só preenchem após o evento). */
export function warmUpVoices(): Promise<void> {
  if (!isTTSAvailable() || warmed) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const tryPick = () => {
      if (pickChineseVoice()) {
        warmed = true;
        finish();
      }
    };
    tryPick();
    if (settled) return;
    window.speechSynthesis.onvoiceschanged = () => {
      tryPick();
      // Resolve mesmo sem voz dedicada — speak() ainda usa lang zh-CN.
      finish();
    };
    // fallback: resolve mesmo sem voz dedicada
    setTimeout(finish, 600);
  });
}

export interface SpeakOptions {
  rate?: number; // 0.1–10 (padrão 0.85: um pouco mais lento p/ estudo)
  pitch?: number;
  volume?: number;
  onend?: () => void;
  /**
   * A fala não aconteceu: motor indisponível ou o navegador rejeitou.
   *
   * Separado de `onend` porque quem chama precisa saber a diferença entre
   * "terminou" e "não saiu som nenhum". Sem isso, um toque no botão de áudio
   * que falha fica silencioso nos dois sentidos — nada toca e nada é dito ao
   * aluno, que conclui que o botão está quebrado.
   */
  onerror?: () => void;
  /** P3 — nomes latinos que podem ser falados dentro de uma fala mandarim. */
  properNames?: readonly string[];
}

/** Fala um texto chinês. Cancela qualquer fala anterior. */

// ── O que é para ser falado em mandarim ───────────────────────────────────
//
// A voz aqui é chinesa. Passar a ela um texto que mistura hànzì com rótulos
// latinos faz o motor ler os dois: um prompt de diálogo como "A: 谢谢！ B: ___"
// sai como "A, xièxie, B, sublinhado". O aluno pediu áudio da frase e recebeu
// a marcação da tela junto.
//
// O guarda que existia vivia nos chamadores e olhava só para "tem hànzì?" ou
// "tem palavra latina de 2+ letras?". A primeira pergunta libera texto
// misturado inteiro; a segunda não vê rótulos de uma letra, que é exatamente
// o caso de "A:" e "B:". Concentrar a decisão aqui resolve os dois de uma vez,
// e vale para todos os pontos que chamam `speak`.
//
// A regra: texto COM hànzì tem seu latim tratado como andaime visual e só os
// trechos chineses são falados. Texto SEM hànzì nenhum passa intacto — é o
// caso do pinyin, que precisa mesmo ser pronunciado como está.
//
// RC1.1 P3 — a exceção dos nomes próprios.
//
// A regra acima é certa para andaime de tela e errada para uma coisa só: o
// nome do aluno. "我叫 Matheus。" é uma frase que o aluno vai mesmo dizer, e
// apagar "Matheus" dela entrega um alvo que ninguém fala assim. O nome entra
// no áudio, mas só sob uma condição estrita: o texto inteiro precisa ser
// mandarim + nomes declarados + pontuação. Basta sobrar uma palavra de
// interface ("O que", "responde", "Escolha abaixo") para o texto voltar a ser
// tratado como enunciado — e aí só o chinês é falado, como antes.
//
// É essa condição, e não uma lista de palavras proibidas, que impede copy PT/EN
// de vazar para o TTS: qualquer palavra que não seja um nome declarado
// desqualifica a frase inteira.
const CJK_RANGE = "\\u3400-\\u9fff\\uf900-\\ufaff";
/** Pontuação chinesa que faz parte da prosódia e deve acompanhar o trecho. */
const CJK_PUNCTUATION = "\\u3001\\u3002\\uff01\\uff0c\\uff1a\\uff1b\\uff1f\\u201c\\u201d\\u2018\\u2019\\uff08\\uff09";
const CJK_TEST = new RegExp(`[${CJK_RANGE}]`, "u");
const SPEAKABLE_RUN = new RegExp(`[${CJK_RANGE}][${CJK_RANGE}${CJK_PUNCTUATION}]*`, "gu");
/** Sobra tolerada fora de hànzì e nomes: espaço e pontuação, nunca letras. */
const NEUTRAL_RESIDUE = new RegExp(
  `[\\s${CJK_PUNCTUATION}!-/:-@\\[-\`{-~\\u00a0\\u2013\\u2014\\u2026]+`,
  "gu"
);

export interface MandarinSpeechOptions {
  /**
   * Nomes em alfabeto latino que PODEM ser falados: `displayName` do aluno,
   * nomes de NPC do catálogo, ou qualquer trecho marcado como `properName`.
   */
  properNames?: readonly string[];
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function properNameMatcher(names: readonly string[]): RegExp | null {
  const clean = Array.from(
    new Set(
      names
        .map((name) => String(name ?? "").trim())
        .filter((name) => name.length > 0 && /\p{L}/u.test(name))
    )
  ).sort((a, b) => b.length - a.length);
  if (!clean.length) return null;
  return new RegExp(`(?:${clean.map(escapeForRegExp).join("|")})`, "giu");
}

interface KeptSpan {
  start: number;
  end: number;
  text: string;
  properName: boolean;
}

function collectSpans(text: string, matcher: RegExp | null): KeptSpan[] {
  const spans: KeptSpan[] = [];
  for (const match of text.matchAll(SPEAKABLE_RUN)) {
    spans.push({ start: match.index, end: match.index + match[0].length, text: match[0], properName: false });
  }
  if (matcher) {
    for (const match of text.matchAll(matcher)) {
      const start = match.index;
      const end = start + match[0].length;
      // Um nome dentro de um trecho chinês já está coberto — não duplica.
      if (spans.some((span) => !span.properName && start < span.end && end > span.start)) continue;
      spans.push({ start, end, text: match[0], properName: true });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

export function mandarinSpeechText(text: string, options: MandarinSpeechOptions = {}): string {
  if (!CJK_TEST.test(text)) return text;

  const matcher = properNameMatcher(options.properNames ?? []);
  const spans = collectSpans(text, matcher);
  const chineseOnly = spans.filter((span) => !span.properName);
  if (!chineseOnly.length) return text;

  if (matcher && spans.some((span) => span.properName)) {
    // A condição estrita: o que sobra fora dos trechos mantidos precisa ser
    // espaço e pontuação. Qualquer letra remanescente é copy de interface.
    let residue = "";
    let cursor = 0;
    for (const span of spans) {
      if (span.start > cursor) residue += text.slice(cursor, span.start);
      cursor = Math.max(cursor, span.end);
    }
    residue += text.slice(cursor);
    const onlyNeutral = residue.replace(NEUTRAL_RESIDUE, "").length === 0;
    if (onlyNeutral) {
      return spans
        .reduce((parts: string[], span, index) => {
          const previous = spans[index - 1];
          if (previous && (previous.properName || span.properName)) parts.push(" ");
          parts.push(span.text);
          return parts;
        }, [])
        .join("")
        .trim();
    }
  }

  return chineseOnly.map((span) => span.text).join("");
}

function defaultSpeakableProperNames(): string[] {
  try {
    const state = useStore.getState();
    return speakableProperNames(state.accounts?.[state.currentAccountId]?.name);
  } catch {
    return [];
  }
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isTTSAvailable()) {
    opts.onerror?.();
    opts.onend?.();
    return;
  }
  // P3 — sem lista explícita, o motor usa os nomes próprios que o app conhece
  // (nome do aluno + NPCs do catálogo). É o que faz "我叫 Matheus。" sair
  // inteiro; copy de interface continua barrada pela regra de resíduo.
  const spoken = mandarinSpeechText(text, {
    properNames: opts.properNames ?? defaultSpeakableProperNames(),
  });
  if (!spoken.trim()) {
    opts.onend?.();
    return;
  }
  const synth = window.speechSynthesis;
  clearPendingSpeak();
  clearChromeResumeWatchdog();
  const u = new SpeechSynthesisUtterance(spoken);
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
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    clearChromeResumeWatchdog();
    opts.onend?.();
  };
  u.onend = settle;
  u.onerror = (event) => {
    // "interrupted"/"canceled" são fala trocada por outra (o aluno tocou de
    // novo, ou a tela mudou) — não são falha para quem ouve.
    const reason = (event as SpeechSynthesisErrorEvent)?.error;
    if (reason && reason !== "interrupted" && reason !== "canceled") opts.onerror?.();
    settle();
  };

  // Enfileirar `speak()` na MESMA tick de `cancel()` faz o Firefox/Safari
  // descartarem a nova fala — a causa de o áudio "só repetir no Chrome". Quando
  // há algo tocando/pendente, cancelamos e adiamos o início um tick para o
  // motor esvaziar a fila; caso contrário, falamos direto.
  const wasBusy = synth.speaking || synth.pending;
  synth.cancel();
  const start = () => {
    pendingSpeakTimer = null;
    try {
      synth.speak(u);
    } catch {
      settle();
      return;
    }
    // Chrome às vezes ignora o primeiro speak() — um resume extra ajuda.
    resumeSpeechSynthesis();
    startChromeResumeWatchdog();
  };
  if (wasBusy) {
    pendingSpeakTimer = window.setTimeout(start, 90);
  } else {
    start();
  }
}

export function stopSpeaking(): void {
  clearPendingSpeak();
  clearChromeResumeWatchdog();
  if (isTTSAvailable()) window.speechSynthesis.cancel();
}

function autoSpeakDelayMs(requested?: number): number {
  if (requested != null) return requested;
  // Gesto fresco: falar na mesma janela de ativação (Safari/iOS).
  return Date.now() - lastUserGestureAt < 2500 ? 0 : 120;
}

/**
 * Agenda fala automática ao montar/trocar conteúdo. Retorna cleanup que cancela
 * o timer pendente (sem interromper fala já iniciada por outro componente).
 * Respeita `autoPlayAudio` do store.
 */
export function scheduleAutoSpeak(text: string, opts: SpeakOptions & { delayMs?: number } = {}): () => void {
  const clean = String(text ?? "").trim();
  if (!clean) return () => {};
  if (useStore.getState().autoPlayAudio === false) return () => {};

  let cancelled = false;
  const delayMs = autoSpeakDelayMs(opts.delayMs);
  const { delayMs: _delay, ...speakOpts } = opts;
  const recentGesture = Date.now() - lastUserGestureAt < 800;

  const run = () => {
    if (cancelled) return;
    // Com gesto recente, fala na hora (sem await de vozes) para não sair da
    // janela de user activation do Safari.
    if (warmed || recentGesture) {
      speak(clean, speakOpts);
      return;
    }
    void warmUpVoices().then(() => {
      if (cancelled) return;
      speak(clean, speakOpts);
    });
  };

  if (delayMs === 0 && recentGesture) {
    run();
    return () => {
      cancelled = true;
    };
  }

  const timer = window.setTimeout(run, delayMs);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

/** Há uma voz chinesa dedicada disponível? (para avisar o usuário) */
export function hasChineseVoice(): boolean {
  return Boolean(cachedVoice || pickChineseVoice());
}
