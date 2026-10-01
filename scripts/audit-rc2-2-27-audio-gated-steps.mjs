#!/usr/bin/env node
/**
 * RC2.2.27 — auditoria dos passos cujo avanço depende de ÁUDIO.
 *
 * Gera docs/reports/rc2-2-27-audio-gated-steps.json a partir do registro real
 * de contratos (STEP_PRESENTATION_CONTRACTS) + superfícies fora da aula que
 * seguram o [Continuar] até a fala confirmar início. `--check` falha se o
 * arquivo commitado divergir do que o código diz hoje.
 *
 * physicalStatus nasce NOT_RUN: código não ouve. Só o owner, no aparelho, com
 * o SHA instalado == PR HEAD, troca para PASS/FAIL.
 */
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/reports/rc2-2-27-audio-gated-steps.json");
const NATIVE_PATH = "requestMandarinSpeech → playMandarinAudio → speakNative → nativeSpeakTracked → LongyuSpeech.startSpeak";

async function loadContracts() {
  const result = await build({
    entryPoints: [path.join(ROOT, "src/lib/guidedPresentation.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":false}' },
  });
  const url = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
  return (await import(url)).STEP_PRESENTATION_CONTRACTS;
}

/** Passos em que a RESPOSTA depende de ouvir (mesmo sem segurar o Continuar). */
const ANSWER_NEEDS_AUDIO = new Set(["listen", "tone", "listen_select", "audio_to_action", "audio_discrimination", "dictation"]);

/** O que o código faz hoje quando o áudio não confirma — conferido pelo gate. */
const FALLBACKS = {
  listen: "FAILED → [Tocar novamente] + [Continuar sem áudio]; antes disso, \"Não posso ouvir agora\" sempre visível",
  tone: "sem trava: o contorno visual responde sem áudio",
};

const SURFACES = [
  {
    kind: "guided_try_listen",
    surface: "GUIDED_TRY",
    requiresAudio: true,
    audioGatesContinue: true,
    canFallback: true,
    fallback: "prazo de UI GUIDED_LISTEN_DEADLINE_MS → [Tocar novamente] [Eu ouvi, continuar] [Continuar sem áudio]",
    source: "GUIDED_TRY",
  },
  {
    kind: "pinyin_contrast_hear",
    surface: "PINYIN",
    requiresAudio: true,
    audioGatesContinue: true,
    canFallback: true,
    fallback: "outcome sem início → audio=failed libera o próximo passo",
    source: "PINYIN",
  },
  {
    kind: "conversation_autoplay",
    surface: "CONVERSATION",
    requiresAudio: false,
    audioGatesContinue: false,
    canFallback: true,
    fallback: "autoplay nunca trava o fluxo; o balão tem replay manual",
    source: "CONVERSATION_AUTOPLAY",
  },
];

export async function buildAudioGatedSteps() {
  const contracts = await loadContracts();
  const steps = Object.entries(contracts)
    .map(([kind, contract]) => {
      const gates = contract.interaction === "LISTEN_FIRST" && kind === "listen";
      const requiresAudio = ANSWER_NEEDS_AUDIO.has(kind);
      return {
        kind,
        surface: "LESSON",
        interaction: contract.interaction,
        requiresAudio,
        audioGatesContinue: gates,
        canFallback: true,
        fallback: FALLBACKS[kind] ?? (requiresAudio ? "replay manual; a resposta segue possível sem áudio confirmado" : "não depende de áudio"),
        nativePath: requiresAudio ? NATIVE_PATH : null,
        physicalStatus: "NOT_RUN",
      };
    })
    .sort((a, b) => a.kind.localeCompare(b.kind));
  const surfaces = SURFACES.map((item) => ({ ...item, nativePath: NATIVE_PATH, physicalStatus: "NOT_RUN" }));
  const all = [...steps, ...surfaces];
  return {
    schema: "longyu.rc2-2-27.audio-gated-steps.v1",
    generatedBy: "scripts/audit-rc2-2-27-audio-gated-steps.mjs",
    summary: {
      lessonStepKinds: steps.length,
      requiresAudio: all.filter((item) => item.requiresAudio).length,
      audioGatesContinue: all.filter((item) => item.audioGatesContinue).length,
      withoutFallback: all.filter((item) => !item.canFallback).length,
      physicalRun: all.filter((item) => item.physicalStatus !== "NOT_RUN").length,
    },
    rule: "Nenhum passo fica cinza para sempre: todo passo com trava de áudio tem saída explícita. physicalStatus só muda com teste no aparelho (SHA instalado == PR HEAD).",
    steps,
    surfaces,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const next = `${JSON.stringify(await buildAudioGatedSteps(), null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (current !== next) {
      console.error("FAIL audit:rc2-2-27-audio-gated-steps — docs/reports/rc2-2-27-audio-gated-steps.json desatualizado (rode sem --check)");
      process.exit(1);
    }
    console.log("PASS audit:rc2-2-27-audio-gated-steps");
  } else {
    fs.writeFileSync(OUT, next);
    console.log(`wrote ${path.relative(ROOT, OUT)}`);
  }
}
