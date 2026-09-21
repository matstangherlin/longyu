/**
 * RC2.2.6 — test:guide-text-voice
 *
 * Duas metades:
 *   1. Decisão pura — quem ganha blip, em que ritmo, e o que acontece quando o
 *      usuário antecipa o texto. Roda contra a máquina real do GuideDialogue.
 *   2. Efeito real — com AudioContext e store falsos, conta osciladores criados
 *      para provar (não presumir) que soundEffects=false não emite nada.
 */

import assert from "node:assert/strict";
import { require } from "./lib/v495a-runtime.mjs";

const cases = [];
const it = (name, fn) => {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({ name, ok: false, why: error?.message ?? String(error) });
  }
};

// ── Parte 1: decisão pura + máquina real ──────────────────────────────────────

const {
  segmentGraphemes,
  reduceGuideDialogue,
  createGuideDialogueState,
} = require("../../src/lib/guideDialogueMachine.ts");

// soundFx puro precisa de um stub de store antes do require (ver Parte 2).
const storeId = require.resolve("../../src/lib/store.ts");
let fakeState = { soundEffects: true, soundFxVolume: 0.85, soundTheme: "longyu_classic" };
require.cache[storeId] = {
  id: storeId,
  filename: storeId,
  loaded: true,
  exports: { useStore: { getState: () => fakeState } },
};

const {
  planGuideTextBlips,
  isGuideBlipEligible,
  isGuideBlipWhitespace,
  isGuideBlipPunctuation,
  guideTextBlip,
  stopGuideTextVoice,
} = require("../../src/lib/soundFx.ts");

it("B19.2 — espaço e quebra de linha nunca ganham blip", () => {
  for (const ws of [" ", "\n", "\t", " "]) {
    assert.equal(isGuideBlipWhitespace(ws), true, `${JSON.stringify(ws)} deveria ser whitespace`);
    assert.equal(isGuideBlipEligible(ws), false);
  }
  const plan = planGuideTextBlips(segmentGraphemes("a b c d e f g h"));
  const graphemes = segmentGraphemes("a b c d e f g h");
  for (const index of plan) {
    assert.notEqual(graphemes[index], " ", `blip caiu num espaço (índice ${index})`);
  }
});

it("B19.3 — pontuação não ganha blip próprio", () => {
  for (const mark of [".", ",", "!", "?", "…", "，", "。", "！"]) {
    assert.equal(isGuideBlipPunctuation(mark), true, `${mark} deveria ser pontuação`);
    assert.equal(isGuideBlipEligible(mark), false);
  }
  const text = "Olá, tudo bem? Sim!";
  const graphemes = segmentGraphemes(text);
  for (const index of planGuideTextBlips(graphemes)) {
    assert.equal(isGuideBlipEligible(graphemes[index]), true, `blip em ${graphemes[index]}`);
  }
});

it("B19.1 + B4 — toca, mas com rate limit de 2–3 graphemes elegíveis", () => {
  const graphemes = segmentGraphemes("abcdefghijklmnopqrstuvwxyz");
  const plan = planGuideTextBlips(graphemes);
  assert.ok(plan.size > 0, "nenhum blip planejado");
  const ratio = graphemes.length / plan.size;
  assert.ok(ratio >= 2 && ratio <= 3.2, `1 blip a cada ${ratio.toFixed(2)} graphemes está fora de 2–3`);
  // Nunca dois blips seguidos: isso seria a metralhadora que o design proíbe.
  const sorted = [...plan].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(sorted[i] - sorted[i - 1] >= 2, `blips adjacentes em ${sorted[i - 1]} e ${sorted[i]}`);
  }
});

it("plano é determinístico: mesma mensagem, mesmo plano", () => {
  const text = "O dragão explica o marco cultural antes de seguir.";
  const a = [...planGuideTextBlips(segmentGraphemes(text))];
  const b = [...planGuideTextBlips(segmentGraphemes(text))];
  assert.deepEqual(a, b);
});

/** Conta blips que a UI dispararia, dirigindo a máquina real por TICK. */
function runTyping(messages, { interruptAtTick } = {}) {
  const fired = [];
  let state = reduceGuideDialogue(createGuideDialogueState(), { type: "START" }, messages, { now: 0 });
  let plan = planGuideTextBlips(segmentGraphemes(messages[state.messageIndex] ?? ""));
  let ticks = 0;
  let guard = 0;
  while (state.phase !== "done" && guard < 5000) {
    guard += 1;
    if (state.phase === "typing") {
      if (interruptAtTick != null && ticks === interruptAtTick) {
        state = reduceGuideDialogue(state, { type: "CONTINUE", now: 1_000 }, messages, { now: 1_000 });
        // A UI corta a voz exatamente aqui. Nada pendente sobrevive.
        fired.push("CUT");
        continue;
      }
      const revealIndex = state.visibleCount;
      if (plan.has(revealIndex)) fired.push(revealIndex);
      ticks += 1;
      state = reduceGuideDialogue(state, { type: "TICK", now: ticks }, messages);
    } else {
      const before = state.messageIndex;
      state = reduceGuideDialogue(state, { type: "CONTINUE", now: 10_000 + guard }, messages, {
        now: 10_000 + guard,
      });
      if (state.messageIndex !== before) {
        plan = planGuideTextBlips(segmentGraphemes(messages[state.messageIndex] ?? ""));
      }
    }
  }
  return fired;
}

it("B19.4 — antecipar durante a digitação corta: nenhum blip depois do CUT", () => {
  const fired = runTyping(["Uma mensagem longa o suficiente para ter vários blips."], {
    interruptAtTick: 4,
  });
  const cutAt = fired.indexOf("CUT");
  assert.ok(cutAt >= 0, "o corte não aconteceu");
  const after = fired.slice(cutAt + 1);
  assert.deepEqual(after, [], `blips após o corte: ${after.join(", ")}`);
});

it("B19.5 — reveal instantâneo não deixa blip futuro da mensagem atual", () => {
  const fired = runTyping(["Texto qualquer para digitar."], { interruptAtTick: 0 });
  assert.deepEqual(fired, ["CUT"], `esperado só o corte, obtido ${fired.join(", ")}`);
});

it("B8 — próxima mensagem reinicia a sequência normalmente", () => {
  const fired = runTyping(["Primeira mensagem aqui.", "Segunda mensagem aqui."]);
  assert.ok(fired.filter((entry) => entry !== "CUT").length > 0, "nenhum blip nas duas mensagens");
  // A sequência precisa voltar a índices baixos ao trocar de mensagem.
  const numeric = fired.filter((entry) => entry !== "CUT");
  const restarted = numeric.slice(1).some((value, i) => value < numeric[i]);
  assert.ok(restarted, "a sequência não reiniciou na segunda mensagem");
});

it("B19.7 — reduced motion não gera sequência alguma", () => {
  const messages = ["Texto instantâneo no reduced motion."];
  // START instant é o que a UI faz quando prefers-reduced-motion está ativo.
  const state = reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant: true }, messages, {
    instant: true,
    now: 0,
  });
  assert.equal(state.phase, "complete", "reduced motion deveria completar de imediato");
  // Sem fase de typing não existe TICK, logo não existe blip.
  const tickAttempt = reduceGuideDialogue(state, { type: "TICK", now: 1 }, messages);
  assert.equal(tickAttempt.visibleCount, state.visibleCount, "TICK não deveria avançar fora de typing");
});

// ── Parte 2: efeito real, com AudioContext e store falsos ────────────────────

// Contadores de módulo: o AudioContext de soundFx é compartilhado e sobrevive
// entre chamadas, então contadores por-instalação não veriam as criações feitas
// pelo contexto anterior. `lastContext` existe para invalidar o compartilhado e
// deixar cada caso hermético.
const created = { oscillators: 0, contexts: 0, buffers: 0 };
let lastContext = null;

function installFakeAudio() {
  created.oscillators = 0;
  created.contexts = 0;
  created.buffers = 0;
  // Fecha o contexto anterior: getSharedContext descarta um contexto "closed" e
  // constrói outro, então o próximo blip realmente usa o fake desta instalação.
  if (lastContext) lastContext.state = "closed";
  const param = () => ({
    value: 0,
    setValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
    cancelScheduledValues() { return this; },
  });
  const node = () => ({
    connect() {}, disconnect() {},
    gain: param(), frequency: param(), Q: param(), threshold: param(),
    knee: param(), ratio: param(), attack: param(), release: param(),
    type: "", curve: null, oversample: "", buffer: null, pan: param(),
    start() {}, stop() {}, onended: null,
  });
  class FakeAudioContext {
    constructor() {
      created.contexts += 1;
      this.state = "running";
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.destination = node();
      lastContext = this;
    }
    createGain() { return node(); }
    createOscillator() { created.oscillators += 1; return node(); }
    createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return node(); }
    createWaveShaper() { return node(); }
    createStereoPanner() { return node(); }
    createDelay() { return node(); }
    createBufferSource() { created.buffers += 1; return node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(256) }; }
    resume() { return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  globalThis.window = {
    AudioContext: FakeAudioContext,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
  globalThis.document = { hidden: false };
  return created;
}

it("B19.6 — soundEffects=false emite ZERO osciladores", () => {
  installFakeAudio();
  fakeState = { soundEffects: false, soundFxVolume: 0.85, soundTheme: "longyu_classic" };
  for (let i = 0; i < 20; i += 1) guideTextBlip(i);
  assert.equal(created.oscillators, 0, `esperado 0 osciladores, obtido ${created.oscillators}`);
});

it("soundEffects=true emite som — o teste acima não passa por acidente", () => {
  installFakeAudio();
  fakeState = { soundEffects: true, soundFxVolume: 0.85, soundTheme: "longyu_classic" };
  guideTextBlip(0);
  assert.ok(created.oscillators > 0, "com som ligado deveria emitir");
});

it("B12 — 100 blips não criam 100 AudioContexts", () => {
  installFakeAudio();
  fakeState = { soundEffects: true, soundFxVolume: 0.85, soundTheme: "longyu_classic" };
  for (let i = 0; i < 100; i += 1) guideTextBlip(i);
  // O contexto é compartilhado e sobrevive entre chamadas (e entre testes), então
  // o esperado é NO MÁXIMO uma criação — nunca uma por grapheme. Os 100
  // osciladores garantem que a asserção não passa por não ter tocado nada.
  assert.equal(created.oscillators, 100, `esperado 100 vozes curtas, obtido ${created.oscillators}`);
  assert.equal(created.contexts, 1, `esperado 1 AudioContext para 100 blips, obtido ${created.contexts}`);
});

it("B15 — aba escondida não emite", () => {
  installFakeAudio();
  fakeState = { soundEffects: true, soundFxVolume: 0.85, soundTheme: "longyu_classic" };
  globalThis.document.hidden = true;
  for (let i = 0; i < 10; i += 1) guideTextBlip(i);
  assert.equal(created.oscillators, 0, "aba escondida deveria ficar muda");
  globalThis.document.hidden = false;
});

it("soundFxVolume=0 não emite", () => {
  installFakeAudio();
  fakeState = { soundEffects: true, soundFxVolume: 0, soundTheme: "longyu_classic" };
  for (let i = 0; i < 10; i += 1) guideTextBlip(i);
  assert.equal(created.oscillators, 0, "volume 0 deveria ficar mudo");
});

it("B19.8 — stop é seguro sem nada tocando (unmount limpo)", () => {
  installFakeAudio();
  assert.doesNotThrow(() => stopGuideTextVoice());
  assert.doesNotThrow(() => stopGuideTextVoice());
});

it("B13 — contexto suspenso não quebra nem emite", () => {
  installFakeAudio();
  fakeState = { soundEffects: true, soundFxVolume: 0.85, soundTheme: "longyu_classic" };
  // Um contexto que nasce suspenso e permanece suspenso: é o caso do autoplay
  // negado antes de qualquer gesto do usuário.
  const Base = globalThis.window.AudioContext;
  globalThis.window.AudioContext = class extends Base {
    constructor() {
      super();
      this.state = "suspended";
    }
    resume() {
      return Promise.resolve();
    }
  };
  if (lastContext) lastContext.state = "closed";
  created.oscillators = 0;
  assert.doesNotThrow(() => guideTextBlip(0));
  assert.equal(created.oscillators, 0, "suspenso deveria sair em silêncio");
});

const failed = cases.filter((entry) => !entry.ok);
console.log(JSON.stringify({ total: cases.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
else console.log(`PASS test:guide-text-voice (${cases.length} casos)`);
