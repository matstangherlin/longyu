import { useStore } from "./store";

// ============================================================================
// Longyu Sound FX — assinatura sonora original.
// Identidade: guzheng (dedilhado com estalo), jade (sinos), madeira, gongo,
// chama de Qi (sopro + gliss) e chuva de brilhos em estéreo.
// Tudo sintetizado na Web Audio API — sem arquivos externos.
// ============================================================================

export type SoundKind =
  | "tap"
  | "pieceSelect"
  | "step"
  | "task"
  | "success"
  | "streak"
  | "missionComplete"
  | "bonus"
  | "qiGain"
  | "qiSpend"
  | "chestReady"
  | "chestOpenCommon"
  | "chestOpenRare"
  | "chestOpenEpic"
  | "chestOpenLegendary"
  | "medal"
  | "lessonComplete"
  | "moduleComplete"
  | "phase"
  | "phaseSkip"
  | "phaseExit"
  | "spend"
  | "blocked"
  | "error";

interface AudioGraph {
  input: GainNode;
  compressor: DynamicsCompressorNode;
  limiter: WaveShaperNode;
}

// Uma "voz": relógio base + saída master do efeito + ajustes do tema sonoro.
interface Voice {
  ctx: AudioContext;
  out: GainNode;
  t0: number;
  bright: number;
  release: number;
}

interface SoundDesign {
  volume: number;
  echo?: boolean;
  render: (v: Voice) => number; // retorna a duração total em segundos
}

const PENTA = {
  c3: 130.81,
  g3: 196,
  c4: 261.63,
  d4: 293.66,
  e4: 329.63,
  g4: 392,
  a4: 440,
  c5: 523.25,
  d5: 587.33,
  e5: 659.25,
  g5: 783.99,
  a5: 880,
  c6: 1046.5,
  d6: 1174.66,
  e6: 1318.51,
  g6: 1567.98,
  a6: 1760,
  c7: 2093,
  d7: 2349.32,
  e7: 2637.02,
} as const;

const THEME_SETTINGS = {
  longyu_classic: { gain: 1, brightness: 1, release: 1 },
  longyu_soft: { gain: 0.72, brightness: 0.82, release: 1.08 },
  longyu_game: { gain: 1.08, brightness: 1.14, release: 0.94 },
} as const;

const CHEST_OPEN_SOUND: Record<string, SoundKind> = {
  small: "chestOpenCommon",
  dragon: "chestOpenRare",
  monthly: "chestOpenEpic",
  legendary: "chestOpenLegendary",
};

let sharedContext: AudioContext | null = null;
let sharedGraph: AudioGraph | null = null;
let sharedNoise: AudioBuffer | null = null;
let limiterCurve: Float32Array<ArrayBuffer> | null = null;
let idleCloseTimer: number | null = null;

export function chestOpenSound(type: string): SoundKind {
  return CHEST_OPEN_SOUND[type] ?? "chestOpenCommon";
}

export function playSoundFx(kind: SoundKind, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return;

  const design = SOUND_DESIGNS[kind];
  if (!design) return;

  const state = useStore.getState();
  if (!state.soundEffects) return;

  const context = getSharedContext(AudioContextCtor);
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const graph = getAudioGraph(context);
  const theme = state.soundTheme ?? "longyu_classic";
  const themeSettings = THEME_SETTINGS[theme] ?? THEME_SETTINGS.longyu_classic;
  const preference = state.soundFxVolume ?? 0.85;
  const volume = Math.max(0, Math.min(0.34, design.volume * preference * themeSettings.gain));
  if (volume === 0) return;

  // Pequena folga de agendamento evita cortes de ataque em mobile.
  const t0 = context.currentTime + 0.012;
  const master = context.createGain();
  master.gain.setValueAtTime(volume, context.currentTime);
  master.connect(graph.input);

  if (design.echo) {
    connectJadeEcho(context, master, graph.input, t0, themeSettings.brightness);
  }

  const voice: Voice = {
    ctx: context,
    out: master,
    t0,
    bright: themeSettings.brightness,
    release: themeSettings.release,
  };
  const duration = design.render(voice);

  master.gain.setTargetAtTime(0.0001, t0 + duration, 0.2);
  window.setTimeout(() => {
    master.disconnect();
  }, Math.max(500, (duration + 1.5) * 1000));
  scheduleIdleClose(context, duration + 0.1);
}

// ============================================================================
// Contexto compartilhado + cadeia master (compressor -> limiter)
// ============================================================================

function getSharedContext(AudioContextCtor: typeof AudioContext): AudioContext | null {
  if (sharedContext?.state === "closed") {
    sharedContext = null;
    sharedGraph = null;
    sharedNoise = null;
  }
  if (!sharedContext) {
    sharedContext = new AudioContextCtor();
    sharedGraph = null;
    sharedNoise = null;
  }
  if (idleCloseTimer !== null) {
    window.clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
  return sharedContext;
}

function getAudioGraph(context: AudioContext): AudioGraph {
  if (sharedGraph) return sharedGraph;

  const input = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const limiter = context.createWaveShaper();
  const output = context.createGain();

  input.gain.value = 0.95;
  compressor.threshold.value = -20;
  compressor.knee.value = 14;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.16;
  limiter.curve = getLimiterCurve();
  limiter.oversample = "4x";
  output.gain.value = 0.85;

  input.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(output);
  output.connect(context.destination);

  sharedGraph = { input, compressor, limiter };
  return sharedGraph;
}

function scheduleIdleClose(context: AudioContext, activeSeconds: number) {
  if (idleCloseTimer !== null) window.clearTimeout(idleCloseTimer);
  idleCloseTimer = window.setTimeout(() => {
    if (sharedContext !== context || context.state === "closed") return;
    void context.close();
    sharedContext = null;
    sharedGraph = null;
    sharedNoise = null;
    idleCloseTimer = null;
  }, Math.max(6500, (activeSeconds + 6) * 1000));
}

function connectJadeEcho(
  context: AudioContext,
  source: AudioNode,
  destination: AudioNode,
  now: number,
  brightness: number
) {
  const delay = context.createDelay();
  const feedback = context.createGain();
  const filter = context.createBiquadFilter();
  const send = context.createGain();

  delay.delayTime.setValueAtTime(0.112, now);
  feedback.gain.setValueAtTime(0.12, now);
  send.gain.setValueAtTime(0.16, now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3000 * brightness, now);
  filter.Q.value = 0.65;

  source.connect(send);
  send.connect(delay);
  delay.connect(filter);
  filter.connect(feedback);
  feedback.connect(delay);
  filter.connect(destination);
}

function getLimiterCurve(): Float32Array<ArrayBuffer> {
  if (limiterCurve) return limiterCurve;

  const samples = 2048;
  const curve: Float32Array<ArrayBuffer> = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(1.35 * x) / Math.tanh(1.35);
  }
  limiterCurve = curve;
  return curve;
}

// ============================================================================
// Utilitários de síntese
// ============================================================================

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedNoise) return sharedNoise;
  const length = Math.floor(ctx.sampleRate * 1);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  sharedNoise = buffer;
  return buffer;
}

// Variação sutil a cada disparo deixa o som "orgânico" sem perder identidade.
const jit = (amount: number) => (Math.random() * 2 - 1) * amount;

function panned(v: Voice, position: number): AudioNode {
  if (typeof v.ctx.createStereoPanner !== "function") return v.out;
  const panner = v.ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, position));
  panner.connect(v.out);
  return panner;
}

function ping(param: AudioParam, t: number, peak: number, attack: number, end: number) {
  const safeEnd = Math.max(end, t + attack + 0.02);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(0.0004, peak), t + attack);
  param.exponentialRampToValueAtTime(0.0001, safeEnd);
}

// ============================================================================
// Instrumentos
// ============================================================================

// Dedilhado de guzheng: corpo + harmônico + "chiff" de ataque (o estalo).
function pluck(
  v: Voice,
  freq: number,
  t: number,
  dur: number,
  gain: number,
  opts: { bend?: number; pan?: number; chiff?: boolean } = {}
) {
  const { ctx } = v;
  const dest = panned(v, opts.pan ?? 0);
  const end = t + dur * v.release;
  const bend = opts.bend ?? 1.01;

  const body = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();

  body.type = "triangle";
  body.frequency.setValueAtTime(freq, t);
  body.frequency.exponentialRampToValueAtTime(Math.max(20, freq * bend), end);
  overtone.type = "sine";
  overtone.frequency.setValueAtTime(freq * 2.003, t);
  overtone.detune.setValueAtTime(4 + jit(3), t);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(Math.min(7200, freq * 5.2 * v.bright), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 2.1), end);
  filter.Q.value = 1.4;

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(gain * 0.24, t + Math.min(0.06, dur * 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  body.connect(filter);
  overtone.connect(filter);
  filter.connect(g);
  g.connect(dest);
  body.start(t);
  overtone.start(t);
  body.stop(end + 0.03);
  overtone.stop(end + 0.03);

  if (opts.chiff !== false) {
    const chiffSrc = ctx.createBufferSource();
    const chiffFilter = ctx.createBiquadFilter();
    const chiffGain = ctx.createGain();
    chiffSrc.buffer = getNoiseBuffer(ctx);
    chiffFilter.type = "bandpass";
    chiffFilter.frequency.value = Math.min(9000, freq * 4 * v.bright);
    chiffFilter.Q.value = 2.2;
    ping(chiffGain.gain, t, gain * 0.5, 0.003, t + 0.03);
    chiffSrc.connect(chiffFilter);
    chiffFilter.connect(chiffGain);
    chiffGain.connect(dest);
    chiffSrc.start(t, Math.random() * 0.5, 0.05);
  }
}

// Sino de jade (parciais suaves) ou bronze (parciais inarmônicos, para medalha).
function bell(
  v: Voice,
  freq: number,
  t: number,
  dur: number,
  gain: number,
  opts: { pan?: number; metallic?: boolean } = {}
) {
  const dest = panned(v, opts.pan ?? 0);
  const partials = opts.metallic
    ? [
        { r: 1, g: 1 },
        { r: 2.76, g: 0.42 },
        { r: 4.07, g: 0.24 },
        { r: 5.4, g: 0.12 },
      ]
    : [
        { r: 1, g: 1 },
        { r: 2.41, g: 0.32 },
        { r: 3.03, g: 0.16 },
      ];
  const end = t + dur * v.release;

  partials.forEach((partial, i) => {
    const osc = v.ctx.createOscillator();
    const g = v.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * partial.r * v.bright, t);
    osc.detune.setValueAtTime(jit(4), t);
    const partialEnd = Math.max(t + 0.06, end - i * dur * 0.12);
    ping(g.gain, t, gain * partial.g, 0.008, partialEnd);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(end + 0.05);
  });
}

// "Clin" curtinho de vidro/jade — usado nos brilhos e toques leves.
function ting(v: Voice, freq: number, t: number, gain: number, pan = 0) {
  const dest = panned(v, pan);
  const osc = v.ctx.createOscillator();
  const g = v.ctx.createGain();
  const end = t + 0.12 * v.release;
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * v.bright, t);
  osc.frequency.exponentialRampToValueAtTime(freq * v.bright * 0.994, end);
  ping(g.gain, t, gain, 0.004, end);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(end + 0.03);
}

function wood(v: Voice, t: number, gain: number, center = 1500, pan = 0) {
  const dest = panned(v, pan);
  const src = v.ctx.createBufferSource();
  const filter = v.ctx.createBiquadFilter();
  const g = v.ctx.createGain();
  const end = t + 0.07;
  src.buffer = getNoiseBuffer(v.ctx);
  filter.type = "bandpass";
  filter.frequency.value = center;
  filter.Q.value = 8;
  ping(g.gain, t, gain, 0.004, end);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t, Math.random() * 0.5, 0.09);
}

// Soco sub-grave: dá peso físico a baús, selos e vitórias.
function subThump(v: Voice, t: number, gain: number, from = 150, to = 55, dur = 0.28) {
  const osc = v.ctx.createOscillator();
  const g = v.ctx.createGain();
  const end = t + dur;
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(28, to), end);
  ping(g.gain, t, gain, 0.008, end);
  osc.connect(g);
  g.connect(v.out);
  osc.start(t);
  osc.stop(end + 0.03);
}

// Sopro filtrado em varredura: chama de Qi (sobe/desce) e riser de expectativa.
function whoosh(v: Voice, t: number, dur: number, from: number, to: number, gain: number, q = 1.1) {
  const src = v.ctx.createBufferSource();
  const filter = v.ctx.createBiquadFilter();
  const g = v.ctx.createGain();
  const end = t + dur;
  src.buffer = getNoiseBuffer(v.ctx);
  src.loop = true;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(Math.max(60, from * v.bright), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to * v.bright), end);
  filter.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(filter);
  filter.connect(g);
  g.connect(v.out);
  src.start(t, Math.random() * 0.4);
  src.stop(end + 0.03);
}

// Respiração de dragão: sopro grave e fofo para os momentos épicos.
function breath(v: Voice, t: number, dur: number, gain: number) {
  const src = v.ctx.createBufferSource();
  const filter = v.ctx.createBiquadFilter();
  const g = v.ctx.createGain();
  const end = t + dur;
  src.buffer = getNoiseBuffer(v.ctx);
  src.loop = true;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(520, t);
  filter.frequency.exponentialRampToValueAtTime(170, end);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(filter);
  filter.connect(g);
  g.connect(v.out);
  src.start(t, Math.random() * 0.4);
  src.stop(end + 0.03);
}

function gong(v: Voice, t: number, dur: number, gain: number) {
  const filter = v.ctx.createBiquadFilter();
  const g = v.ctx.createGain();
  const end = t + dur;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(950, t);
  filter.frequency.exponentialRampToValueAtTime(400, end);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.045);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  filter.connect(g);
  g.connect(v.out);

  [PENTA.c3, PENTA.g3, PENTA.c4].forEach((freq, i) => {
    const osc = v.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.setValueAtTime(i * 4 - 3 + jit(2), t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, end);
    osc.connect(filter);
    osc.start(t);
    osc.stop(end + 0.03);
  });
}

// Chuva de brilhos: notas pentatônicas agudas alternando esquerda/direita,
// espaçamento crescente e volume caindo — como purpurina assentando.
function sparkles(v: Voice, t: number, count: number, gain: number, spread = 0.7) {
  const table = [PENTA.c6, PENTA.e6, PENTA.g6, PENTA.a6, PENTA.c7, PENTA.d7, PENTA.e7];
  let when = t;
  let gap = 0.026;
  for (let i = 0; i < count; i += 1) {
    const freq = table[(i * 3 + (Math.random() < 0.5 ? 0 : 1)) % table.length];
    const side = (i % 2 === 0 ? 1 : -1) * spread * (0.4 + Math.random() * 0.6);
    ting(v, freq, when, gain * Math.pow(0.86, i), side);
    when += gap;
    gap *= 1.14;
  }
  return when - t;
}

// Gliss de energia com vibrato — o "fio de Qi" subindo ou descendo.
function gliss(
  v: Voice,
  from: number,
  to: number,
  t: number,
  dur: number,
  gain: number,
  vibrato = 0
) {
  const osc = v.ctx.createOscillator();
  const g = v.ctx.createGain();
  const end = t + dur;
  osc.type = "sine";
  osc.frequency.setValueAtTime(from * v.bright, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, to * v.bright), end);
  if (vibrato > 0) {
    const lfo = v.ctx.createOscillator();
    const depth = v.ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = vibrato;
    depth.gain.value = Math.max(6, to * 0.008);
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(end + 0.03);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(g);
  g.connect(v.out);
  osc.start(t);
  osc.stop(end + 0.03);
}

// Tom fosco e fechado — para erro e bloqueio, gentil por natureza.
function dull(v: Voice, from: number, to: number, t: number, dur: number, gain: number) {
  const osc = v.ctx.createOscillator();
  const filter = v.ctx.createBiquadFilter();
  const g = v.ctx.createGain();
  const end = t + dur * v.release;
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), end);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(760, t);
  filter.frequency.exponentialRampToValueAtTime(420, end);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(filter);
  filter.connect(g);
  g.connect(v.out);
  osc.start(t);
  osc.stop(end + 0.02);
}

// Selo carimbado: peso grave + toque duplo de madeira.
function stamp(v: Voice, t: number, gain: number) {
  subThump(v, t, gain * 0.9, 190, 70, 0.22);
  wood(v, t + 0.012, gain * 0.8, 900);
  wood(v, t + 0.07, gain * 0.45, 1300);
}

// Tranca de metal: dois "clins" metálicos curtos, um de cada lado.
function latch(v: Voice, t: number, gain: number) {
  bell(v, PENTA.d6, t, 0.16, gain * 0.7, { metallic: true, pan: -0.25 });
  bell(v, PENTA.a6, t + 0.05, 0.14, gain * 0.5, { metallic: true, pan: 0.25 });
  wood(v, t, gain * 0.5, 3400, -0.25);
  wood(v, t + 0.05, gain * 0.4, 4100, 0.25);
}

// Acorde sustentado com vibrato — o "clímax" das vitórias grandes.
function pad(v: Voice, freqs: number[], t: number, dur: number, gain: number) {
  const end = t + dur * v.release;
  freqs.forEach((freq, i) => {
    const dest = panned(v, (i - (freqs.length - 1) / 2) * 0.28);
    const osc = v.ctx.createOscillator();
    const g = v.ctx.createGain();
    const lfo = v.ctx.createOscillator();
    const depth = v.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * v.bright, t);
    lfo.type = "sine";
    lfo.frequency.value = 5.2 + i * 0.4;
    depth.gain.value = freq * 0.004;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain / (1 + i * 0.35), t + 0.05);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.55, dur * 0.22);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    lfo.start(t);
    osc.stop(end + 0.1);
    lfo.stop(end + 0.1);
  });
}

// ============================================================================
// Receitas por evento
// ============================================================================

// Abertura de baú por raridade: mesmo esqueleto (madeira + tranca + revelação),
// com peso, expectativa e brilho crescendo a cada camada de raridade.
function chestOpen(v: Voice, tier: 0 | 1 | 2 | 3): number {
  const t = v.t0;
  let when = t;

  if (tier >= 2) {
    // Riser de expectativa antes da tampa abrir.
    whoosh(v, when, 0.3 + tier * 0.05, 600, 3000, 0.3, 1);
    when += 0.26 + tier * 0.05;
  }

  wood(v, when, 0.6, 800);
  latch(v, when + 0.03, 0.55);
  subThump(v, when + 0.02, 0.35 + tier * 0.12, 170, 60, 0.3);
  if (tier >= 2) gong(v, when + 0.03, 0.9 + tier * 0.3, 0.4);
  if (tier >= 3) breath(v, when + 0.05, 1.1, 0.25);

  const runs: number[][] = [
    [PENTA.c4, PENTA.g4, PENTA.c5],
    [PENTA.c4, PENTA.g4, PENTA.c5, PENTA.e5],
    [PENTA.c4, PENTA.g4, PENTA.c5, PENTA.e5, PENTA.g5],
    [PENTA.c4, PENTA.e4, PENTA.g4, PENTA.c5, PENTA.e5, PENTA.g5, PENTA.c6],
  ];
  let noteAt = when + 0.09;
  let gap = 0.07;
  runs[tier].forEach((freq, i) => {
    pluck(v, freq, noteAt, 0.11, 0.5 + i * 0.04, {
      bend: 1.012,
      pan: (i % 2 === 0 ? -0.3 : 0.3) * (0.4 + tier * 0.2),
    });
    noteAt += gap;
    gap = Math.max(0.042, gap * 0.9);
  });

  const lastNote = runs[tier][runs[tier].length - 1];
  bell(v, lastNote * 2, noteAt, 0.4 + tier * 0.12, 0.3 + tier * 0.05);
  sparkles(v, noteAt + 0.02, 2 + tier * 2, 0.26 + tier * 0.03, 0.5 + tier * 0.16);
  if (tier >= 3) {
    pad(v, [PENTA.c5, PENTA.g5, PENTA.c6, PENTA.e6], noteAt + 0.05, 0.7, 0.22);
  }
  return noteAt - t + 0.7 + tier * 0.25;
}

function renderQiSpend(v: Voice): number {
  const t = v.t0;
  // Chama descendo: a energia sai, mas sem drama.
  whoosh(v, t, 0.34, 2000, 600, 0.26);
  gliss(v, PENTA.a5, PENTA.d5, t + 0.02, 0.26, 0.26, 7);
  bell(v, PENTA.d4, t + 0.2, 0.3, 0.25);
  return 0.6;
}

function renderLessonComplete(v: Voice): number {
  const t = v.t0;
  // Vitória curta: peso + gongo + cadência + acorde com brilho.
  subThump(v, t, 0.4, 200, 70, 0.25);
  gong(v, t, 0.9, 0.3);
  wood(v, t + 0.03, 0.4, 1200);
  [PENTA.c5, PENTA.e5, PENTA.g5].forEach((freq, i) => {
    pluck(v, freq, t + 0.02 + i * 0.07, 0.12, 0.6, { bend: 1.015 });
  });
  pad(v, [PENTA.c5, PENTA.g5, PENTA.c6], t + 0.25, 0.55, 0.24);
  bell(v, PENTA.c6, t + 0.25, 0.5, 0.4);
  sparkles(v, t + 0.3, 5, 0.3, 0.8);
  return 1.25;
}

function renderModuleComplete(v: Voice): number {
  const t = v.t0;
  // Vitória maior: gongo + respiração de dragão + corrida acelerando + clímax.
  subThump(v, t, 0.5, 180, 55, 0.35);
  gong(v, t, 1.3, 0.45);
  breath(v, t + 0.05, 1.1, 0.22);
  const run = [PENTA.g3, PENTA.c4, PENTA.g4, PENTA.c5, PENTA.e5, PENTA.g5, PENTA.c6];
  let when = t + 0.04;
  let gap = 0.085;
  run.forEach((freq, i) => {
    pluck(v, freq, when, 0.12, 0.5 + i * 0.045, {
      bend: 1.012,
      pan: i % 2 === 0 ? -0.35 : 0.35,
    });
    when += gap;
    gap = Math.max(0.05, gap * 0.88);
  });
  pad(v, [PENTA.c5, PENTA.g5, PENTA.c6, PENTA.e6], when, 0.85, 0.26);
  bell(v, PENTA.c6, when, 0.7, 0.4);
  sparkles(v, when + 0.05, 7, 0.3, 1);
  return when - t + 1.3;
}

const SOUND_DESIGNS: Record<SoundKind, SoundDesign> = {
  tap: {
    volume: 0.09,
    render(v) {
      // Toque de bambu: tique seco + clin discreto.
      wood(v, v.t0, 0.4, 2100);
      ting(v, PENTA.g5, v.t0 + 0.004, 0.5);
      return 0.16;
    },
  },
  pieceSelect: {
    volume: 0.1,
    render(v) {
      // Pegar peça de jade: dedilhado + clin que "gruda" na mão.
      pluck(v, PENTA.d5, v.t0, 0.08, 0.55, { bend: 1.012 });
      ting(v, PENTA.a5, v.t0 + 0.05, 0.4, 0.25);
      return 0.22;
    },
  },
  step: {
    volume: 0.14,
    render(v) {
      // Etapa: precisa ser claramente perceptível — madeira + dois dedilhados
      // subindo uma quarta + brilho de fecho.
      const t = v.t0;
      wood(v, t, 0.5, 1400);
      pluck(v, PENTA.g4, t + 0.004, 0.1, 0.6);
      pluck(v, PENTA.c5, t + 0.07, 0.12, 0.7, { bend: 1.015 });
      ting(v, PENTA.g5, t + 0.15, 0.3, 0.3);
      return 0.36;
    },
  },
  task: {
    volume: 0.12,
    render(v) {
      // Registro neutro: "anotado", sem celebrar nem punir.
      wood(v, v.t0, 0.4, 1300);
      pluck(v, PENTA.d5, v.t0, 0.09, 0.5, { bend: 1.004 });
      pluck(v, PENTA.e5, v.t0 + 0.07, 0.1, 0.5, { bend: 1.004 });
      return 0.3;
    },
  },
  success: {
    volume: 0.17,
    render(v) {
      // Acerto: soco curto de corpo + tríade rápida + brilhos.
      const t = v.t0;
      subThump(v, t, 0.25, 240, 120, 0.12);
      pluck(v, PENTA.g4, t, 0.09, 0.6, { bend: 1.02 });
      pluck(v, PENTA.c5, t + 0.045, 0.09, 0.65, { bend: 1.02 });
      pluck(v, PENTA.e5, t + 0.09, 0.12, 0.7, { bend: 1.02 });
      bell(v, PENTA.c6, t + 0.09, 0.3, 0.3);
      sparkles(v, t + 0.13, 3, 0.3, 0.6);
      return 0.55;
    },
  },
  streak: {
    volume: 0.19,
    echo: true,
    render(v) {
      // Sequência: corrida pentatônica acelerando + chama subindo.
      const t = v.t0;
      whoosh(v, t, 0.5, 700, 2600, 0.32);
      const run = [PENTA.c5, PENTA.d5, PENTA.e5, PENTA.g5, PENTA.a5, PENTA.c6];
      let when = t;
      let gap = 0.065;
      run.forEach((freq, i) => {
        pluck(v, freq, when, 0.1, 0.5 + i * 0.05, {
          bend: 1.018,
          pan: i % 2 === 0 ? -0.3 : 0.3,
        });
        when += gap;
        gap = Math.max(0.034, gap * 0.86);
      });
      bell(v, PENTA.c6, when, 0.4, 0.4);
      sparkles(v, when + 0.02, 5, 0.32, 0.9);
      return when - t + 0.6;
    },
  },
  missionComplete: {
    volume: 0.19,
    echo: true,
    render(v) {
      // Missão: o selo bate, depois a resolução sobe.
      const t = v.t0;
      stamp(v, t, 0.7);
      [PENTA.g4, PENTA.c5, PENTA.e5, PENTA.g5].forEach((freq, i) => {
        pluck(v, freq, t + 0.13 + i * 0.06, 0.11, 0.6, { bend: 1.012 });
      });
      bell(v, PENTA.g5, t + 0.31, 0.45, 0.35);
      sparkles(v, t + 0.4, 4, 0.3);
      return 1.05;
    },
  },
  bonus: {
    volume: 0.18,
    echo: true,
    render(v) {
      const t = v.t0;
      whoosh(v, t, 0.4, 900, 2800, 0.28);
      [PENTA.g5, PENTA.a5, PENTA.c6, PENTA.e6].forEach((freq, i) => {
        pluck(v, freq, t + i * 0.05, 0.1, 0.55, {
          bend: 1.02,
          pan: i % 2 === 0 ? -0.35 : 0.35,
        });
      });
      sparkles(v, t + 0.22, 4, 0.3, 0.8);
      return 0.8;
    },
  },
  qiGain: {
    volume: 0.18,
    echo: true,
    render(v) {
      // Qi ganho: chama sobe + fio de energia com vibrato + crepitar + brilhos.
      const t = v.t0;
      whoosh(v, t, 0.55, 500, 2600, 0.34, 1);
      gliss(v, PENTA.e5, PENTA.a6, t + 0.03, 0.4, 0.3, 10);
      wood(v, t + 0.1, 0.2, 2600, -0.3);
      wood(v, t + 0.18, 0.16, 3100, 0.3);
      bell(v, PENTA.e6, t + 0.34, 0.4, 0.35);
      sparkles(v, t + 0.4, 4, 0.3, 0.8);
      return 1;
    },
  },
  qiSpend: { volume: 0.12, render: renderQiSpend },
  chestReady: {
    volume: 0.15,
    render(v) {
      // Baú pronto: toc-toc de madeira + tranca + convite brilhante.
      const t = v.t0;
      wood(v, t, 0.6, 950);
      wood(v, t + 0.12, 0.5, 950);
      latch(v, t + 0.24, 0.5);
      bell(v, PENTA.c5, t + 0.26, 0.35, 0.3);
      sparkles(v, t + 0.32, 2, 0.24);
      return 0.75;
    },
  },
  chestOpenCommon: {
    volume: 0.18,
    render: (v) => chestOpen(v, 0),
  },
  chestOpenRare: {
    volume: 0.2,
    echo: true,
    render: (v) => chestOpen(v, 1),
  },
  chestOpenEpic: {
    volume: 0.22,
    echo: true,
    render: (v) => chestOpen(v, 2),
  },
  chestOpenLegendary: {
    volume: 0.25,
    echo: true,
    render: (v) => chestOpen(v, 3),
  },
  medal: {
    volume: 0.2,
    echo: true,
    render(v) {
      // Medalha: carimbo de selo + bronze ressoando + brilhos.
      const t = v.t0;
      stamp(v, t, 0.8);
      bell(v, PENTA.c6, t + 0.1, 0.7, 0.45, { metallic: true });
      bell(v, PENTA.g5, t + 0.16, 0.6, 0.3, { metallic: true });
      sparkles(v, t + 0.26, 3, 0.28);
      return 1.05;
    },
  },
  lessonComplete: { volume: 0.22, echo: true, render: renderLessonComplete },
  moduleComplete: { volume: 0.25, echo: true, render: renderModuleComplete },
  phase: { volume: 0.22, echo: true, render: renderLessonComplete },
  phaseSkip: { volume: 0.25, echo: true, render: renderModuleComplete },
  phaseExit: {
    volume: 0.1,
    render(v) {
      // Saída de fase: descida gentil, "até já".
      const t = v.t0;
      [PENTA.a5, PENTA.g5, PENTA.e5].forEach((freq, i) => {
        ting(v, freq, t + i * 0.07, 0.35 - i * 0.06);
      });
      return 0.45;
    },
  },
  spend: { volume: 0.12, render: renderQiSpend },
  blocked: {
    volume: 0.1,
    render(v) {
      // Sem carga/Qi: vaso vazio — toque de feltro + tom fosco descendo + sopro.
      const t = v.t0;
      wood(v, t, 0.3, 620);
      dull(v, PENTA.e4, PENTA.c4, t + 0.01, 0.22, 0.5);
      breath(v, t + 0.02, 0.28, 0.12);
      return 0.5;
    },
  },
  error: {
    volume: 0.1,
    render(v) {
      // Erro: duas notas foscas descendo, macias — informa sem irritar.
      const t = v.t0;
      wood(v, t, 0.35, 700);
      dull(v, PENTA.e4, PENTA.d4, t, 0.12, 0.45);
      dull(v, PENTA.d4, PENTA.c4, t + 0.11, 0.16, 0.4);
      return 0.42;
    },
  },
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
