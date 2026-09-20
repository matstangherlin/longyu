/**
 * RC2.2.6 — validate:guide-text-voice
 *
 * Contrato de código da voz do dragão. O que este gate protege não dá para
 * observar de fora em runtime: ausência de asset de terceiros, reuso do
 * AudioContext compartilhado, e o corte estar ligado nos três pontos certos.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const failures = [];
const check = (name, fn) => {
  try {
    fn();
  } catch (error) {
    failures.push({ name, why: error?.message ?? String(error) });
  }
};

const soundFx = fs.readFileSync("src/lib/soundFx.ts", "utf8");
const dialogue = fs.readFileSync("src/components/guide/GuideDialogue.tsx", "utf8");
const blipSection = soundFx.slice(soundFx.indexOf("Guide text voice"));

// ── Copyright / asset rule ────────────────────────────────────────────────────
check("nenhum asset de áudio de terceiros no repo de src", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(entry.name)) {
        offenders.push(full);
      }
    }
  };
  for (const root of ["src", "public"]) {
    if (fs.existsSync(root)) walk(root);
  }
  assert.deepEqual(offenders, [], `arquivos de áudio encontrados: ${offenders.join(", ")}`);
});

check("nenhuma referência a Undertale ou sample externo", () => {
  const haystack = `${soundFx}\n${dialogue}`.toLowerCase();
  for (const banned of ["undertale", "toby fox", "sans.wav", "text.wav", "snd_txt"]) {
    assert.ok(!haystack.includes(banned), `referência proibida: ${banned}`);
  }
});

check("a voz não importa nem faz fetch de áudio", () => {
  assert.ok(!/from\s+["'][^"']+\.(mp3|wav|ogg)["']/.test(soundFx), "import de arquivo de áudio");
  assert.ok(!/decodeAudioData|fetch\(/.test(blipSection), "a voz não deve buscar áudio externo");
});

// ── Engine compartilhado ──────────────────────────────────────────────────────
check("a voz reusa o AudioContext compartilhado", () => {
  assert.match(blipSection, /getSharedContext\(/, "deve usar getSharedContext");
  assert.match(blipSection, /getAudioGraph\(/, "deve usar a master chain existente");
  assert.ok(
    !/new\s+AudioContextCtor\(|new\s+AudioContext\(/.test(blipSection),
    "PROIBIDO: novo AudioContext na voz do guia"
  );
});

// ── Settings ─────────────────────────────────────────────────────────────────
check("respeita soundEffects, soundFxVolume e soundTheme", () => {
  assert.match(blipSection, /if\s*\(!state\.soundEffects\)\s*return/, "soundEffects=false deve zerar blips");
  assert.match(blipSection, /soundFxVolume/, "deve respeitar soundFxVolume");
  assert.match(blipSection, /soundTheme/, "deve respeitar soundTheme");
});

check("aba escondida não toca", () => {
  assert.match(blipSection, /document\.hidden/, "document.hidden deve silenciar");
});

check("autoplay negado não quebra o Guide", () => {
  assert.match(blipSection, /state === "suspended"/, "contexto suspenso deve sair em silêncio");
  assert.ok(!/alert\(|confirm\(/.test(blipSection), "não pedir interação extra pelo áudio");
});

check("volume tem teto baixo", () => {
  const ceiling = blipSection.match(/Math\.min\(([\d.]+),/);
  assert.ok(ceiling, "teto de volume explícito ausente");
  assert.ok(Number(ceiling[1]) <= 0.08, `teto ${ceiling[1]} é alto para som decorativo`);
});

// ── Pitch determinístico ──────────────────────────────────────────────────────
check("pitch determinístico pelo índice, sem Math.random", () => {
  assert.match(blipSection, /GUIDE_BLIP_PITCHES\[\s*Math\.abs\(graphemeIndex\)\s*%/, "pitch deve vir do índice");
  const pitchDecl = blipSection.match(/GUIDE_BLIP_PITCHES\s*=\s*\[([^\]]+)\]/);
  assert.ok(pitchDecl, "GUIDE_BLIP_PITCHES ausente");
  const count = pitchDecl[1].split(",").filter((part) => part.trim()).length;
  assert.ok(count >= 2 && count <= 3, `esperado 2–3 alturas, obtido ${count}`);
});

// ── Ligação com o typewriter real ─────────────────────────────────────────────
check("blip nasce do tick real, sem segundo timer", () => {
  assert.match(dialogue, /planGuideTextBlips/, "plano de blips ausente");
  assert.match(dialogue, /blipPlan\.has\(revealIndex\)\s*\)\s*guideTextBlip\(revealIndex\)/, "blip deve sair do tick");
  assert.ok(!/setInterval/.test(dialogue), "PROIBIDO: setInterval paralelo");
  const timers = dialogue.match(/window\.setTimeout/g) ?? [];
  // entrance + tick + settle: nenhum timer novo só para som.
  assert.ok(timers.length <= 3, `timers demais (${timers.length}); a voz não pode criar o seu`);
});

check("corte ligado em antecipar, DONE e unmount", () => {
  assert.match(dialogue, /if\s*\(wasTyping\)\s*stopGuideTextVoice\(\)/, "antecipar deve cortar");
  const doneBlock = dialogue.slice(dialogue.indexOf('state.phase === "done"'));
  assert.match(doneBlock.slice(0, 400), /stopGuideTextVoice\(\)/, "DONE deve cortar");
  const cleanup = dialogue.match(/return \(\) => \{[\s\S]*?\};/);
  assert.ok(cleanup && /stopGuideTextVoice\(\)/.test(cleanup[0]), "unmount deve cortar");
});

check("stop faz fade curto em vez de corte seco", () => {
  const stopFn = blipSection.slice(blipSection.indexOf("export function stopGuideTextVoice"));
  assert.match(stopFn, /linearRampToValueAtTime\(0\.0001/, "fade ausente — risco de clique audível");
});

// ── Escopo ───────────────────────────────────────────────────────────────────
check("voz aplicada só no GuideDialogue", () => {
  const consumers = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const src = fs.readFileSync(full, "utf8");
        if (/\bguideTextBlip\s*\(/.test(src) && !full.endsWith("soundFx.ts")) consumers.push(full);
      }
    }
  };
  walk("src");
  assert.deepEqual(
    consumers,
    [path.join("src", "components", "guide", "GuideDialogue.tsx")],
    `voz fora do GuideDialogue: ${consumers.join(", ")}`
  );
});

console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
else console.log("PASS validate:guide-text-voice");
