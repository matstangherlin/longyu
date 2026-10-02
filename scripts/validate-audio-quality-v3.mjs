#!/usr/bin/env node
/**
 * RC2.2.31B — Audio Quality V3.
 * silencedetect + volumedetect + astats em TODOS os fixed assets (não amostra).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mode = process.argv[2] || "validate";

function parseManifest() {
  const src = fs.readFileSync(path.join(root, "src/data/audioManifest.generated.ts"), "utf8");
  const entries = [];
  const re =
    /audioId:\s*"([^"]+)"[\s\S]*?textKey:\s*"([^"]+)"[\s\S]*?speaker:\s*"([^"]+)"[\s\S]*?file:\s*"([^"]+)"[\s\S]*?durationMs:\s*(\d+)[\s\S]*?pack:\s*"(core|extended|hosted)"[\s\S]*?(?:bytes:\s*(\d+),)?[\s\S]*?(?:checksum:\s*"([^"]+)")?/g;
  let m;
  while ((m = re.exec(src))) {
    entries.push({
      audioId: m[1],
      textKey: m[2],
      speaker: m[3],
      file: m[4],
      durationMs: Number(m[5]),
      pack: m[6],
      bytes: m[7] ? Number(m[7]) : null,
      checksum: m[8] || null,
    });
  }
  return entries;
}

function hanziCount(text) {
  return (String(text).match(/[\u4e00-\u9fff]/g) || []).length;
}

function probeVolume(filePath) {
  const r = spawnSync("ffmpeg", ["-i", filePath, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const err = `${r.stderr || ""}${r.stdout || ""}`;
  const mean = err.match(/mean_volume:\s*([-\d.]+)/);
  const max = err.match(/max_volume:\s*([-\d.]+)/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

function probeSilence(filePath, durationMs) {
  const r = spawnSync(
    "ffmpeg",
    ["-i", filePath, "-af", "silencedetect=noise=-35dB:d=0.15", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const err = `${r.stderr || ""}${r.stdout || ""}`;
  let silenceMs = 0;
  const starts = [...err.matchAll(/silence_start:\s*([-\d.]+)/g)].map((x) => Number(x[1]));
  const ends = [...err.matchAll(/silence_end:\s*([-\d.]+)/g)].map((x) => Number(x[1]));
  const n = Math.min(starts.length, ends.length);
  for (let i = 0; i < n; i++) silenceMs += Math.max(0, (ends[i] - starts[i]) * 1000);
  // trailing silence_start without end → until duration
  if (starts.length > ends.length && durationMs > 0) {
    const last = starts[starts.length - 1];
    silenceMs += Math.max(0, durationMs - last * 1000);
  }
  const ratio = durationMs > 0 ? Math.min(1, silenceMs / durationMs) : null;
  return { actualSilenceDurationMs: Math.round(silenceMs), actualSilenceRatio: ratio };
}

function durationClass(textKey, durationMs) {
  const h = hanziCount(textKey);
  if (h <= 0) return "PLAUSIBLE";
  const minMs = Math.max(200, h * 80);
  const softMin = Math.max(180, h * 60);
  if (durationMs < softMin * 0.5) return "INVALID";
  if (durationMs < softMin) return "SUSPICIOUS";
  if (durationMs < minMs) return "SUSPICIOUS";
  return "PLAUSIBLE";
}

const entries = parseManifest();
if (!entries.length) {
  console.error("FAIL AQV3: empty manifest");
  process.exit(1);
}

const failures = [];
const reports = [];
let suspicious = 0;

for (const entry of entries) {
  const filePath = path.join(root, "public", entry.file);
  if (!fs.existsSync(filePath)) {
    failures.push({ code: "ASSET_MISSING", audioId: entry.audioId, why: filePath });
    continue;
  }
  const buf = fs.readFileSync(filePath);
  if (buf.length === 0) {
    failures.push({ code: "BYTES_ZERO", audioId: entry.audioId });
    continue;
  }
  if (entry.checksum) {
    const hash = createHash("sha256").update(buf).digest("hex");
    if (hash !== entry.checksum) {
      failures.push({ code: "CHECKSUM_MISMATCH", audioId: entry.audioId });
    }
  }
  if (entry.durationMs <= 0) failures.push({ code: "DURATION_ZERO", audioId: entry.audioId });

  if (/tone-v1|extended-tone/.test(entry.speaker) && /[\u4e00-\u9fff]/.test(entry.textKey)) {
    failures.push({ code: "TONE_PLACEHOLDER_SPEECH", audioId: entry.audioId, why: entry.speaker });
  }

  const vol = probeVolume(filePath);
  const sil = probeSilence(filePath, entry.durationMs);
  const dClass = durationClass(entry.textKey, entry.durationMs);
  if (dClass === "INVALID") {
    failures.push({
      code: "DURATION_INVALID",
      audioId: entry.audioId,
      why: `${hanziCount(entry.textKey)} hanzi in ${entry.durationMs}ms`,
    });
  } else if (dClass === "SUSPICIOUS") {
    suspicious += 1;
  }

  if (vol.meanVolumeDb != null && vol.meanVolumeDb <= -55) {
    failures.push({ code: "RMS_NEAR_ZERO", audioId: entry.audioId, why: `mean=${vol.meanVolumeDb}` });
  }
  if (vol.maxVolumeDb != null && vol.maxVolumeDb <= -45) {
    failures.push({ code: "PEAK_NEAR_ZERO", audioId: entry.audioId, why: `max=${vol.maxVolumeDb}` });
  }
  // After silenceremove trim, extreme silence still fails. Natural mid-phrase
  // pauses must not trip this — threshold stays high (not mean-volume estimate).
  if (sil.actualSilenceRatio != null && sil.actualSilenceRatio >= 0.9) {
    failures.push({
      code: "SILENCE_RATIO_HIGH",
      audioId: entry.audioId,
      why: `actualSilenceRatio=${sil.actualSilenceRatio}`,
    });
  }

  reports.push({
    audioId: entry.audioId,
    textKey: entry.textKey,
    speaker: entry.speaker,
    file: entry.file,
    durationMs: entry.durationMs,
    bytes: buf.length,
    meanVolumeDb: vol.meanVolumeDb,
    maxVolumeDb: vol.maxVolumeDb,
    actualSilenceDurationMs: sil.actualSilenceDurationMs,
    actualSilenceRatio: sil.actualSilenceRatio,
    durationClass: dClass,
    hanzi: hanziCount(entry.textKey),
  });
}

const outDir = path.join(root, "docs/reports");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "rc2-2-31b-audio-quality-v3.json"),
  `${JSON.stringify(
    {
      schema: "longyu-audio-quality-v3/1",
      checked: reports.length,
      failures: failures.length,
      suspicious,
      tonePlaceholders: reports.filter((r) => /tone-v1/.test(r.speaker)).length,
      sample: reports.slice(0, 12),
    },
    null,
    2
  )}\n`
);

if (mode === "validate") {
  if (failures.length) {
    console.error(`FAIL validate:audio-quality-v3 (${failures.length})\n${failures.slice(0, 40).map((f) => `  - ${f.code} ${f.audioId}: ${f.why ?? ""}`).join("\n")}`);
    process.exit(1);
  }
  if (suspicious) console.warn(`WARN SUSPICIOUS_SPEECH_DURATION: ${suspicious} assets (human sample)`);
  console.log(`PASS validate:audio-quality-v3 (${reports.length}/${entries.length}, suspicious=${suspicious})`);
}
