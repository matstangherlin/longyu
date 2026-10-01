#!/usr/bin/env node
/**
 * RC2.2.28 — inventário automático de falas fixas + validação do manifesto.
 *
 *   npm run audio:inventory  → docs/reports/rc2-2-28-audio-corpus.json
 *   npm run audio:validate   → falha se core pack / manifesto quebrados
 *
 * NUNCA gera áudio silenciosamente no build normal.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import os from "node:os";

const ROOT = process.cwd();
const REPORT = "docs/reports/rc2-2-28-audio-corpus.json";
const CORE_PACK = "docs/reports/rc2-2-28-core-pack.json";

const mode = process.argv[2] || "inventory";

async function loadContent() {
  const entry = path.join(ROOT, "scripts/lib/audio-inventory-entry.ts");
  fs.writeFileSync(
    entry,
    `
import { CHUNKS } from "../../src/data/chunks";
import { CHARACTERS } from "../../src/data/characters";
import { ALL_LESSONS } from "../../src/data/journey";
import { CONVERSATION_SCENES } from "../../src/data/conversationScenes";
import { TONE_TRAINER_PACKS } from "../../src/data/toneTrainer";
import { IMMERSION_SESSIONS } from "../../src/data/immersion";
import { CANONICAL_AUDIO_ENTRIES } from "../../src/data/audioManifest.generated";

const refs = [];
function add(source, text, audioIdHint) {
  const clean = String(text ?? "").trim();
  if (!clean) return;
  if (!/[\\u4e00-\\u9fff]/.test(clean)) return;
  refs.push({ source, text: clean, audioIdHint: audioIdHint ?? null });
}

add("guided-try", "你好", "audio:guided-try:nihao:v1");
add("guided-try", "你", "audio:guided-try:ni:v1");
add("guided-try", "好", "audio:guided-try:hao:v1");
add("guided-try", "谢谢", "audio:guided-try:xiexie:v1");
add("guided-try", "再见", "audio:guided-try:zaijian:v1");

for (const c of CHUNKS) add("chunk", c.hanzi, "audio:chunk:" + c.id + ":v1");
for (const c of CHARACTERS) add("character", c.hanzi, "audio:char:" + c.id + ":v1");

for (const pack of TONE_TRAINER_PACKS) {
  for (const round of pack.rounds) add("tone-trainer", round.audioText, "audio:tone:" + round.id + ":v1");
}

for (const session of IMMERSION_SESSIONS) {
  for (const item of session.items ?? []) add("immersion", item.audioText ?? item.hanzi, "audio:immersion:" + item.id + ":v1");
}

for (const scene of CONVERSATION_SCENES) {
  for (const node of scene.nodes ?? []) {
    add("conversation", node.audioText ?? node.hanzi, "audio:conversation:" + scene.sceneId + ":" + node.id + ":v1");
    const interaction = node.interaction;
    if (interaction?.options) for (const opt of interaction.options) add("conversation-option", opt);
    if (interaction?.correctAnswer) add("conversation-option", interaction.correctAnswer);
    if (interaction?.listenAudioText) add("conversation-listen", interaction.listenAudioText);
  }
  for (const line of scene.lines ?? []) add("conversation-line", line.audioText ?? line.hanzi);
}

for (const lesson of ALL_LESSONS) {
  for (const step of lesson.steps ?? []) {
    if (step.audioText) add("lesson:" + lesson.id, step.audioText);
    if (step.hanzi) add("lesson:" + lesson.id, step.hanzi);
    if (step.text && /[\\u4e00-\\u9fff]/.test(step.text)) add("lesson:" + lesson.id, step.text);
    if (step.slowAudioText) add("lesson:" + lesson.id, step.slowAudioText);
    if (step.audioTextB) add("lesson:" + lesson.id, step.audioTextB);
    if (Array.isArray(step.audioSequence)) for (const t of step.audioSequence) add("lesson:" + lesson.id, t);
    if (Array.isArray(step.lines)) for (const line of step.lines) add("lesson:" + lesson.id, line.audioText ?? line.hanzi);
    if (Array.isArray(step.nodes)) for (const node of step.nodes) add("lesson:" + lesson.id, node.audioText ?? node.hanzi);
  }
}

export const inventory = { refs, manifest: CANONICAL_AUDIO_ENTRIES, lessonCount: ALL_LESSONS.length };
`,
    "utf8"
  );

  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-inv-"));
  const file = path.join(dir, "inv.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    try {
      fs.unlinkSync(entry);
    } catch {
      /* ignore */
    }
  }
}

function normalize(text) {
  return String(text).trim().replace(/[！？。，、!?,.]/g, "");
}

async function inventory() {
  const { inventory: data } = await loadContent();
  const refs = data.refs;
  const manifestByText = new Map(data.manifest.map((e) => [normalize(e.textKey), e]));
  const byText = new Map();
  for (const ref of refs) {
    const key = normalize(ref.text);
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push(ref);
  }

  const uniqueUtterances = byText.size;
  const missingAudio = [];
  const dynamicOnly = [];
  const duplicateText = [];
  const bySource = {};

  for (const [text, list] of byText) {
    for (const ref of list) bySource[ref.source.split(":")[0]] = (bySource[ref.source.split(":")[0]] ?? 0) + 1;
    const entry = manifestByText.get(text);
    if (!entry) missingAudio.push(text);
    if (list.length > 1) {
      const ids = [...new Set(list.map((r) => r.audioIdHint).filter(Boolean))];
      if (ids.length > 1) duplicateText.push({ textKey: text, audioIds: ids });
    }
  }

  const core = JSON.parse(fs.readFileSync(path.join(ROOT, CORE_PACK), "utf8"));
  const report = {
    schema: "longyu-audio-corpus/1",
    generatedAt: new Date().toISOString(),
    uniqueUtterances,
    references: refs.length,
    missingAudio: missingAudio.slice(0, 500),
    missingAudioCount: missingAudio.length,
    dynamicOnly,
    duplicateText: duplicateText.slice(0, 100),
    corePackCount: core.count ?? core.entries?.length ?? 0,
    extendedCount: Math.max(0, data.manifest.length - (core.count ?? 0)),
    manifestCount: data.manifest.length,
    lessonCount: data.lessonCount,
    bySource,
    note: "missingAudio lista falas fixas ainda sem asset; core pack cobre Guided Try / onboarding / tons / primeiras conversas.",
  };
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PASS audio:inventory → ${REPORT} (${uniqueUtterances} unique, ${missingAudio.length} missing, core=${report.corePackCount})`);
  return report;
}

function validate() {
  const failures = [];
  const fail = (code, why) => failures.push({ code, why });

  if (!fs.existsSync(path.join(ROOT, CORE_PACK))) fail("CORE_PACK_MISSING", CORE_PACK);
  else {
    const core = JSON.parse(fs.readFileSync(path.join(ROOT, CORE_PACK), "utf8"));
    if (!core.entries?.length) fail("CORE_PACK_EMPTY", "core pack sem entradas");
    for (const e of core.entries) {
      const pub = path.join(ROOT, "public", e.file);
      const asset = path.join(ROOT, "assets", e.file);
      if (!fs.existsSync(pub)) fail("CORE_ASSET_MISSING", pub);
      if (!fs.existsSync(asset)) fail("CORE_ASSET_MISSING", asset);
      if (e.bytes != null && e.bytes < 200) fail("CORE_ASSET_TOO_SMALL", e.audioId);
      if (!e.durationMs || e.durationMs <= 0) fail("CORE_DURATION_ZERO", e.audioId);
      if (fs.existsSync(pub)) {
        const buf = fs.readFileSync(pub);
        const hash = createHash("sha256").update(buf).digest("hex");
        if (e.checksum && e.checksum !== hash) fail("CORE_CHECKSUM_MISMATCH", e.audioId);
      }
    }
  }

  const manifestPath = path.join(ROOT, "src/data/audioManifest.generated.ts");
  if (!fs.existsSync(manifestPath)) fail("MANIFEST_MISSING", manifestPath);
  else {
    const text = fs.readFileSync(manifestPath, "utf8");
    if (/CANONICAL_AUDIO_ENTRIES:\s*readonly[^=]*=\s*\[\s*\]/.test(text)) fail("MANIFEST_EMPTY", "entries vazias");
    if (!/audio:guided-try:nihao:v1/.test(text)) fail("GUIDED_TRY_ASSET_MISSING", "nihao core id");
  }

  if (!fs.existsSync(path.join(ROOT, REPORT))) {
    fail("CORPUS_REPORT_MISSING", `rode npm run audio:inventory → ${REPORT}`);
  }

  // Plugin Media3
  const mediaPlugin = path.join(ROOT, "android/app/src/main/java/longyu/noba/com/LongyuMediaPlugin.java");
  if (!fs.existsSync(mediaPlugin)) fail("NATIVE_MEDIA_MISSING", mediaPlugin);
  else {
    const java = fs.readFileSync(mediaPlugin, "utf8");
    if (!/playCanonicalAudio/.test(java)) fail("NATIVE_MEDIA_CONTRACT", "playCanonicalAudio");
    if (!/ExoPlayer/.test(java)) fail("NATIVE_MEDIA_EXOPLAYER", "ExoPlayer");
  }

  if (failures.length) {
    console.log(`FAIL audio:validate\n${failures.map((f) => `  - ${f.code}: ${f.why}`).join("\n")}`);
    process.exit(1);
  }
  console.log("PASS audio:validate");
}

if (mode === "validate") validate();
else if (mode === "inventory") await inventory();
else if (mode === "generate") {
  console.error("audio:generate requer provider configurado (LONGYU_AUDIO_PROVIDER). Não roda no build normal.");
  process.exit(2);
} else {
  console.error("uso: node scripts/audio-corpus.mjs inventory|validate|generate");
  process.exit(2);
}
