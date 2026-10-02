#!/usr/bin/env node
/**
 * RC2.2.31 — regenera o CORE pack com fala Mandarin neural (edge-tts).
 * TTS só na PRODUÇÃO do asset — runtime APK continua asset-first / Media3.
 *
 * Uso: node scripts/regenerate-core-speech-pack.mjs
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VOICE = "zh-CN-XiaoxiaoNeural";
const VOICE_PROFILE = "zh-CN-XiaoxiaoNeural";
const SPEAKER = "core-speech-xiaoxiao-v1";
const GENERATION_SOURCE = "edge-tts";
const QUALITY_VERSION = "aqv2";

const CORE = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/reports/rc2-2-28-core-pack.json"), "utf8"));

const DEST_DIRS = [
  "public/audio/core",
  "assets/audio/core",
  "android/app/src/main/assets/audio/core",
];

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return r;
}

function ffprobeDurationMs(file) {
  const r = sh("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Math.round(Number(r.stdout.trim()) * 1000);
}

function volumeStats(file) {
  const r = spawnSync(
    "ffmpeg",
    ["-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const err = `${r.stderr || ""}${r.stdout || ""}`;
  const mean = err.match(/mean_volume:\s*([-\d.]+)/);
  const max = err.match(/max_volume:\s*([-\d.]+)/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

async function synthesize(text, outMp3) {
  const py = `
import asyncio, edge_tts, sys
async def main():
    communicate = edge_tts.Communicate(sys.argv[1], sys.argv[2])
    await communicate.save(sys.argv[3])
asyncio.run(main())
`;
  sh("python3", ["-c", py, text, VOICE, outMp3]);
}

const tmpDir = fs.mkdtempSync(path.join("/tmp", "longyu-core-speech-"));
const updated = [];
const provenance = [];

console.log(`Regenerating ${CORE.entries.length} core assets with ${VOICE}…`);

for (const entry of CORE.entries) {
  const base = path.basename(entry.file);
  const tmp = path.join(tmpDir, base);
  await synthesize(entry.textKey, tmp);

  const durationMs = ffprobeDurationMs(tmp);
  const vol = volumeStats(tmp);
  const buf = fs.readFileSync(tmp);
  const checksum = createHash("sha256").update(buf).digest("hex");
  const contentHash = checksum.slice(0, 16);

  if (vol.meanVolumeDb != null && vol.meanVolumeDb <= -50) {
    throw new Error(`SILENT asset ${entry.audioId}: mean=${vol.meanVolumeDb}`);
  }
  if (durationMs < 200) {
    throw new Error(`TOO_SHORT ${entry.audioId}: ${durationMs}ms`);
  }

  for (const dir of DEST_DIRS) {
    const destDir = path.join(ROOT, dir);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(tmp, path.join(destDir, base));
  }

  const next = {
    ...entry,
    contentHash,
    speaker: SPEAKER,
    voiceProfile: VOICE_PROFILE,
    generationSource: GENERATION_SOURCE,
    generatedAt: new Date().toISOString(),
    qualityVersion: QUALITY_VERSION,
    uri: entry.uri ?? `/${entry.file}`,
    androidAssetPath: entry.file,
    durationMs,
    bytes: buf.length,
    checksum,
    version: (entry.version ?? 1) + 1,
  };
  updated.push(next);
  provenance.push({
    audioId: next.audioId,
    textKey: next.textKey,
    voiceProfile: VOICE_PROFILE,
    generationSource: GENERATION_SOURCE,
    generatedAt: next.generatedAt,
    durationMs,
    checksum,
    qualityVersion: QUALITY_VERSION,
    meanVolumeDb: vol.meanVolumeDb,
    maxVolumeDb: vol.maxVolumeDb,
  });
  console.log(
    `  OK ${entry.audioId} ${durationMs}ms mean=${vol.meanVolumeDb} max=${vol.maxVolumeDb} bytes=${buf.length}`
  );
}

const coreOut = {
  pack: "core",
  count: updated.length,
  voiceProfile: VOICE_PROFILE,
  generationSource: GENERATION_SOURCE,
  qualityVersion: QUALITY_VERSION,
  regeneratedAt: new Date().toISOString(),
  entries: updated,
};
fs.writeFileSync(
  path.join(ROOT, "docs/reports/rc2-2-28-core-pack.json"),
  `${JSON.stringify(coreOut, null, 2)}\n`
);
fs.writeFileSync(
  path.join(ROOT, "docs/reports/rc2-2-31-core-speech-provenance.json"),
  `${JSON.stringify({ schema: "longyu-audio-provenance/1", entries: provenance }, null, 2)}\n`
);

// Patch rc2-2-29 pack (core slice) if present
const pack29Path = path.join(ROOT, "docs/reports/rc2-2-29-audio-pack.json");
if (fs.existsSync(pack29Path)) {
  const pack29 = JSON.parse(fs.readFileSync(pack29Path, "utf8"));
  const byId = new Map(updated.map((e) => [e.audioId, e]));
  pack29.entries = (pack29.entries ?? []).map((e) => byId.get(e.audioId) ?? e);
  pack29.coreRegeneratedAt = new Date().toISOString();
  pack29.coreVoiceProfile = VOICE_PROFILE;
  fs.writeFileSync(pack29Path, `${JSON.stringify(pack29, null, 2)}\n`);
}

// Rewrite audioManifest.generated.ts — replace core entries; add androidAssetPath to all.
const manifestPath = path.join(ROOT, "src/data/audioManifest.generated.ts");
const src = fs.readFileSync(manifestPath, "utf8");

function entryToTs(e) {
  const lines = [
    "  {",
    `    audioId: ${JSON.stringify(e.audioId)},`,
    `    contentHash: ${JSON.stringify(e.contentHash)},`,
    `    textKey: ${JSON.stringify(e.textKey)},`,
    `    locale: ${JSON.stringify(e.locale ?? "zh-CN")},`,
    `    speaker: ${JSON.stringify(e.speaker)},`,
    `    file: ${JSON.stringify(e.file)},`,
    `    uri: ${JSON.stringify(e.uri)},`,
    `    androidAssetPath: ${JSON.stringify(e.androidAssetPath ?? e.file)},`,
    `    durationMs: ${e.durationMs},`,
    `    version: ${e.version},`,
    `    pack: ${JSON.stringify(e.pack)},`,
  ];
  if (e.bytes != null) lines.push(`    bytes: ${e.bytes},`);
  if (e.checksum) lines.push(`    checksum: ${JSON.stringify(e.checksum)},`);
  lines.push("  }");
  return lines.join("\n");
}

// Parse existing entries loosely via regex blocks
const entryRe =
  /\{\s*audioId:\s*"([^"]+)"[\s\S]*?pack:\s*"(core|extended|hosted)"[\s\S]*?\}/g;
const blocks = [];
let m;
while ((m = entryRe.exec(src))) {
  blocks.push({ audioId: m[1], pack: m[2], raw: m[0], start: m.index, end: m.index + m[0].length });
}

const byId = new Map(updated.map((e) => [e.audioId, e]));
const newBlocks = blocks.map((b) => {
  const fresh = byId.get(b.audioId);
  if (fresh) return entryToTs(fresh);
  // inject androidAssetPath if missing
  if (/androidAssetPath:/.test(b.raw)) return b.raw;
  return b.raw.replace(/(\s*file:\s*"[^"]+",)/, `$1\n    androidAssetPath: "${b.raw.match(/file:\s*"([^"]+)"/)?.[1] ?? ""}",`);
});

let out = src;
// Replace from first entry to last while preserving header/footer
const first = blocks[0];
const last = blocks[blocks.length - 1];
if (!first || !last) throw new Error("manifest parse failed");
const header = src.slice(0, first.start);
const footer = src.slice(last.end);
out = `${header}${newBlocks.join(",\n")}${footer}`;
// bump comment
out = out.replace(
  /RC2\.2\.29 — manifesto gerado\. não editar à mão\./,
  "RC2.2.31 — manifesto gerado. core = fala Mandarin neural; não editar à mão."
);
fs.writeFileSync(manifestPath, out);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`PASS regenerate-core-speech-pack (${updated.length} assets → public/assets/android)`);
