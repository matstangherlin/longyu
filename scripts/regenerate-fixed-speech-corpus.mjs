#!/usr/bin/env node
/**
 * RC2.2.31B — regenera TODOS os fixed-content assets como fala Mandarin real.
 * TTS só em PRODUCTION-TIME. Dedup: normalizedText + voiceProfile + rate.
 *
 * Uso: node scripts/regenerate-fixed-speech-corpus.mjs [--concurrency=8]
 */
import { spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const VOICE = "zh-CN-XiaoxiaoNeural";
const VOICE_PROFILE = "zh-CN-XiaoxiaoNeural";
const SPEAKER = "fixed-speech-xiaoxiao-v1";
const GENERATION_SOURCE = "edge-tts";
const QUALITY_VERSION = "aqv3";
const RATE = "default";
const concurrency = Number(
  (process.argv.find((a) => a.startsWith("--concurrency=")) || "--concurrency=8").split("=")[1]
);

const DEST_ROOTS = ["public", "assets", "android/app/src/main/assets"];

function normalize(text) {
  return String(text ?? "")
    .trim()
    .replace(/[！？。，、!?,.\s]/g, "");
}

function parseManifest(src) {
  const entries = [];
  const re =
    /\{\s*audioId:\s*"([^"]+)"[\s\S]*?contentHash:\s*"([^"]+)"[\s\S]*?textKey:\s*"([^"]+)"[\s\S]*?locale:\s*"([^"]+)"[\s\S]*?speaker:\s*"([^"]+)"[\s\S]*?file:\s*"([^"]+)"[\s\S]*?uri:\s*"([^"]+)"[\s\S]*?(?:androidAssetPath:\s*"([^"]+)",[\s\S]*?)?durationMs:\s*(\d+)[\s\S]*?version:\s*(\d+)[\s\S]*?pack:\s*"(core|extended|hosted)"[\s\S]*?(?:bytes:\s*(\d+),[\s\S]*?)?(?:checksum:\s*"([^"]+)",?[\s\S]*?)?\}/g;
  let m;
  while ((m = re.exec(src))) {
    entries.push({
      audioId: m[1],
      contentHash: m[2],
      textKey: m[3],
      locale: m[4],
      speaker: m[5],
      file: m[6],
      uri: m[7],
      androidAssetPath: m[8] || m[6],
      durationMs: Number(m[9]),
      version: Number(m[10]),
      pack: m[11],
      bytes: m[12] ? Number(m[12]) : undefined,
      checksum: m[13] || undefined,
    });
  }
  return entries;
}

function ffprobeDurationMs(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" }
  );
  if (r.status !== 0) throw new Error(`ffprobe failed ${file}: ${r.stderr}`);
  return Math.round(Number(r.stdout.trim()) * 1000);
}

function volumeStats(file) {
  const r = spawnSync("ffmpeg", ["-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const err = `${r.stderr || ""}${r.stdout || ""}`;
  const mean = err.match(/mean_volume:\s*([-\d.]+)/);
  const max = err.match(/max_volume:\s*([-\d.]+)/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

function synthesize(text, outMp3) {
  return new Promise((resolve, reject) => {
    const py = `
import asyncio, edge_tts, sys
async def main():
    communicate = edge_tts.Communicate(sys.argv[1], sys.argv[2])
    await communicate.save(sys.argv[3])
asyncio.run(main())
`;
    const child = spawn("python3", ["-c", py, text, VOICE, outMp3], { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`edge-tts failed for ${text}: ${err}`));
    });
  });
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

const manifestPath = path.join(ROOT, "src/data/audioManifest.generated.ts");
const src = fs.readFileSync(manifestPath, "utf8");
const entries = parseManifest(src);
if (entries.length < 600) {
  console.error(`FAIL parse: only ${entries.length} entries`);
  process.exit(1);
}

// Dedup key = normalizedText + voice + rate
const groups = new Map();
for (const e of entries) {
  const key = `${normalize(e.textKey)}|${VOICE_PROFILE}|${RATE}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e);
}

console.log(`Entries=${entries.length} uniqueSpeechKeys=${groups.size} concurrency=${concurrency}`);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-speech-corpus-"));
const uniqueJobs = [...groups.entries()].map(([key, list]) => ({
  key,
  textKey: list[0].textKey,
  canonicalFile: list[0].file, // keep first entry's file path as physical file
  members: list,
}));

let done = 0;
const fileByKey = new Map();
const provenance = [];

await mapPool(uniqueJobs, concurrency, async (job) => {
  const base = path.basename(job.canonicalFile);
  const tmp = path.join(tmpRoot, `${createHash("sha1").update(job.key).digest("hex").slice(0, 12)}-${base}`);
  await synthesize(job.textKey, tmp);
  const durationMs = ffprobeDurationMs(tmp);
  const vol = volumeStats(tmp);
  const buf = fs.readFileSync(tmp);
  const checksum = createHash("sha256").update(buf).digest("hex");
  if (vol.meanVolumeDb != null && vol.meanVolumeDb <= -50) {
    throw new Error(`SILENT ${job.key} mean=${vol.meanVolumeDb}`);
  }
  if (durationMs < 150) throw new Error(`TOO_SHORT ${job.key} ${durationMs}`);

  // Write physical file for each member (stable audioId → own file path, same bytes OK)
  for (const member of job.members) {
    for (const root of DEST_ROOTS) {
      const dest = path.join(ROOT, root, member.file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(tmp, dest);
    }
  }

  const meta = {
    key: job.key,
    textKey: job.textKey,
    normalizedText: normalize(job.textKey),
    voiceProfile: VOICE_PROFILE,
    generationSource: GENERATION_SOURCE,
    generatedAt: new Date().toISOString(),
    qualityVersion: QUALITY_VERSION,
    durationMs,
    bytes: buf.length,
    checksum,
    contentHash: checksum.slice(0, 16),
    meanVolumeDb: vol.meanVolumeDb,
    maxVolumeDb: vol.maxVolumeDb,
    speechClass: "MANDARIN_SPEECH",
    memberCount: job.members.length,
  };
  fileByKey.set(job.key, meta);
  provenance.push(meta);
  done += 1;
  if (done % 25 === 0 || done === uniqueJobs.length) {
    console.log(`  progress ${done}/${uniqueJobs.length}`);
  }
  return meta;
});

const updated = entries.map((e) => {
  const key = `${normalize(e.textKey)}|${VOICE_PROFILE}|${RATE}`;
  const meta = fileByKey.get(key);
  if (!meta) throw new Error(`missing meta for ${e.audioId}`);
  return {
    ...e,
    contentHash: meta.contentHash,
    speaker: SPEAKER,
    voiceProfile: VOICE_PROFILE,
    generationSource: GENERATION_SOURCE,
    generatedAt: meta.generatedAt,
    qualityVersion: QUALITY_VERSION,
    androidAssetPath: e.file,
    durationMs: meta.durationMs,
    version: (e.version ?? 1) + 1,
    bytes: meta.bytes,
    checksum: meta.checksum,
    speechClass: "MANDARIN_SPEECH",
  };
});

function entryToTs(e) {
  return [
    "  {",
    `    audioId: ${JSON.stringify(e.audioId)},`,
    `    contentHash: ${JSON.stringify(e.contentHash)},`,
    `    textKey: ${JSON.stringify(e.textKey)},`,
    `    locale: ${JSON.stringify(e.locale)},`,
    `    speaker: ${JSON.stringify(e.speaker)},`,
    `    file: ${JSON.stringify(e.file)},`,
    `    uri: ${JSON.stringify(e.uri)},`,
    `    androidAssetPath: ${JSON.stringify(e.androidAssetPath ?? e.file)},`,
    `    durationMs: ${e.durationMs},`,
    `    version: ${e.version},`,
    `    pack: ${JSON.stringify(e.pack)},`,
    `    bytes: ${e.bytes},`,
    `    checksum: ${JSON.stringify(e.checksum)},`,
    "  }",
  ].join("\n");
}

const entryRe =
  /\{\s*audioId:\s*"([^"]+)"[\s\S]*?pack:\s*"(core|extended|hosted)"[\s\S]*?\}/g;
const blocks = [];
let bm;
while ((bm = entryRe.exec(src))) {
  blocks.push({ start: bm.index, end: bm.index + bm[0].length, audioId: bm[1] });
}
const byId = new Map(updated.map((e) => [e.audioId, e]));
const newBlocks = blocks.map((b) => {
  const e = byId.get(b.audioId);
  if (!e) throw new Error(`orphan block ${b.audioId}`);
  return entryToTs(e);
});
const header = src.slice(0, blocks[0].start);
const footer = src.slice(blocks[blocks.length - 1].end);
let out = `${header}${newBlocks.join(",\n")}${footer}`;
out = out.replace(
  /RC2\.2\.31 — manifesto gerado\. core = fala Mandarin neural; não editar à mão\./,
  "RC2.2.31B — manifesto gerado. fixed corpus = fala Mandarin neural; não editar à mão."
);
fs.writeFileSync(manifestPath, out);

// Core pack report sync
const core = updated.filter((e) => e.pack === "core");
fs.writeFileSync(
  path.join(ROOT, "docs/reports/rc2-2-28-core-pack.json"),
  `${JSON.stringify(
    {
      pack: "core",
      count: core.length,
      voiceProfile: VOICE_PROFILE,
      generationSource: GENERATION_SOURCE,
      qualityVersion: QUALITY_VERSION,
      regeneratedAt: new Date().toISOString(),
      entries: core,
    },
    null,
    2
  )}\n`
);

fs.mkdirSync(path.join(ROOT, "docs/reports"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "docs/reports/rc2-2-31b-fixed-speech-corpus.json"),
  `${JSON.stringify(
    {
      schema: "longyu-fixed-speech-corpus/1",
      generatedAt: new Date().toISOString(),
      voiceProfile: VOICE_PROFILE,
      speaker: SPEAKER,
      entries: updated.length,
      uniqueKeys: groups.size,
      tonePlaceholdersRemaining: updated.filter((e) => /tone-v1/.test(e.speaker)).length,
      provenanceSample: provenance.slice(0, 20),
      provenancePath: "docs/reports/rc2-2-31b-speech-provenance.json",
    },
    null,
    2
  )}\n`
);
fs.writeFileSync(
  path.join(ROOT, "docs/reports/rc2-2-31b-speech-provenance.json"),
  `${JSON.stringify({ schema: "longyu-audio-provenance/1", qualityVersion: QUALITY_VERSION, entries: provenance }, null, 2)}\n`
);

// Keep RC2.2.29 pack report in sync (durations + suspiciousDuration flags for gate:rc2-2-29).
{
  const pack29Path = path.join(ROOT, "docs/reports/rc2-2-29-audio-pack.json");
  const packEntries = updated.map((e) => {
    const hanzi = (String(e.textKey).match(/[\u4e00-\u9fff]/g) || []).length || 1;
    const suspiciousDuration =
      (hanzi === 1 && e.durationMs > 900) || (hanzi >= 12 && e.durationMs < 600);
    return { ...e, suspiciousDuration };
  });
  fs.writeFileSync(
    pack29Path,
    `${JSON.stringify(
      {
        pack: "core+extended",
        count: packEntries.length,
        core: packEntries.filter((e) => e.pack === "core").length,
        extended: packEntries.filter((e) => e.pack === "extended").length,
        suspiciousDurationFlagged: packEntries.filter((e) => e.suspiciousDuration).length,
        voiceProfile: VOICE_PROFILE,
        generationSource: GENERATION_SOURCE,
        qualityVersion: QUALITY_VERSION,
        regeneratedAt: new Date().toISOString(),
        entries: packEntries,
      },
      null,
      2
    )}\n`
  );
}

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log(
  `PASS regenerate-fixed-speech-corpus entries=${updated.length} unique=${groups.size} toneLeft=${updated.filter((e) => /tone-v1/.test(e.speaker)).length}`
);
