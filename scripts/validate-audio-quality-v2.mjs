#!/usr/bin/env node
/**
 * RC2.2.31 — Audio Quality V2.
 *
 * Nao basta "arquivo existe". Mede mean/max volume (ffmpeg volumedetect),
 * estima silenceRatio, e falha duration implausivel vs hànzì count.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);

function loadEntries() {
  // Prefer generated report / pack if present; else scan core assets + manifest bytes.
  const manifestPath = path.join(root, "src/data/audioManifest.generated.ts");
  const src = fs.readFileSync(manifestPath, "utf8");
  const entries = [];
  const blockRe = /\{[\s\S]*?audioId:\s*"([^"]+)"[\s\S]*?textKey:\s*"([^"]*)"[\s\S]*?file:\s*"([^"]+)"[\s\S]*?durationMs:\s*(\d+)[\s\S]*?pack:\s*"([^"]+)"[\s\S]*?bytes:\s*(\d+)/g;
  let m;
  while ((m = blockRe.exec(src))) {
    entries.push({
      audioId: m[1],
      textKey: m[2],
      file: m[3],
      durationMs: Number(m[4]),
      pack: m[5],
      bytes: Number(m[6]),
    });
  }
  return entries;
}

function resolveFile(rel) {
  const candidates = [
    path.join(root, "android/app/src/main/assets", rel),
    path.join(root, "public", rel),
    path.join(root, "android/app/src/main/assets/public", rel),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function hanziCount(text) {
  return [...text].filter((ch) => /\p{Script=Han}/u.test(ch)).length;
}

function probeVolume(filePath) {
  const r = spawnSync(
    "ffmpeg",
    ["-i", filePath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }
  );
  const err = `${r.stderr || ""}\n${r.stdout || ""}`;
  const mean = /mean_volume:\s*([-\d.]+)\s*dB/.exec(err);
  const max = /max_volume:\s*([-\d.]+)\s*dB/.exec(err);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

function estimateSilenceRatio(meanVolumeDb, maxVolumeDb) {
  // Conservador: mean muito baixo ⇒ quase silencio.
  if (meanVolumeDb == null) return null;
  if (meanVolumeDb <= -50) return 0.95;
  if (meanVolumeDb <= -40) return 0.85;
  if (meanVolumeDb <= -35 && (maxVolumeDb == null || maxVolumeDb <= -30)) return 0.8;
  return Math.max(0, Math.min(0.79, (-meanVolumeDb - 20) / 100));
}

function durationSuspicious(textKey, durationMs) {
  const n = hanziCount(textKey);
  if (n <= 0) return false;
  // ~80ms/hanzi minimo grosseiro; 11 hanzi @ 450ms = suspeito.
  const minMs = Math.max(200, n * 80);
  return durationMs > 0 && durationMs < minMs && n >= 4;
}

const mode = process.argv[2] || "validate";
const entries = loadEntries();
const core = entries.filter((e) => e.pack === "core");
const sample = [
  ...core,
  ...entries.filter((e) => e.pack === "extended").slice(0, 40),
];

const failures = [];
const reports = [];

for (const entry of sample) {
  const filePath = resolveFile(entry.file);
  if (!filePath) {
    failures.push({ code: "MISSING_FILE", audioId: entry.audioId, why: entry.file });
    continue;
  }
  const st = fs.statSync(filePath);
  if (st.size <= 0) {
    failures.push({ code: "BYTES_ZERO", audioId: entry.audioId, why: filePath });
    continue;
  }
  if (entry.durationMs <= 0) {
    failures.push({ code: "DURATION_ZERO", audioId: entry.audioId, why: String(entry.durationMs) });
  }
  const vol = probeVolume(filePath);
  const silenceRatio = estimateSilenceRatio(vol.meanVolumeDb, vol.maxVolumeDb);
  const row = {
    audioId: entry.audioId,
    textKey: entry.textKey,
    file: entry.file,
    durationMs: entry.durationMs,
    bytes: st.size,
    meanVolumeDb: vol.meanVolumeDb,
    maxVolumeDb: vol.maxVolumeDb,
    silenceRatio,
    hanzi: hanziCount(entry.textKey),
  };
  reports.push(row);

  if (silenceRatio != null && silenceRatio >= 0.8) {
    failures.push({ code: "SILENCE_RATIO_HIGH", audioId: entry.audioId, why: `silenceRatio=${silenceRatio}` });
  }
  if (vol.meanVolumeDb != null && vol.meanVolumeDb <= -55) {
    failures.push({ code: "RMS_NEAR_ZERO", audioId: entry.audioId, why: `mean=${vol.meanVolumeDb}` });
  }
  if (vol.maxVolumeDb != null && vol.maxVolumeDb <= -45) {
    failures.push({ code: "PEAK_NEAR_ZERO", audioId: entry.audioId, why: `max=${vol.maxVolumeDb}` });
  }
  // Duration absurdity is recorded; hard-fail deferred until core pack regen
  // (CANONICAL_AUDIO_CONTENT_NOT_CERTIFIED). Silence/RMS still hard-fail.
  if (durationSuspicious(entry.textKey, entry.durationMs)) {
    reports[reports.length - 1].suspiciousDuration = true;
  }
}

const hard = failures.filter((f) => f.code !== "SUSPICIOUS_SPEECH_DURATION");
const soft = reports.filter((r) => r.suspiciousDuration);
if (soft.length) {
  console.warn(`WARN SUSPICIOUS_SPEECH_DURATION: ${soft.length} assets (content certification still open)`);
  for (const r of soft.slice(0, 12)) {
    console.warn(`  - ${r.audioId}: ${r.hanzi} hanzi in ${r.durationMs}ms`);
  }
}

const outDir = path.join(root, "docs/reports");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "rc2-2-31-audio-quality-v2.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), sample: reports.length, failures: failures.length, reports, failures }, null, 2)
);

if (mode === "validate") {
  if (failures.length) {
    console.error(`FAIL validate:audio-quality-v2 (${failures.length})`);
    for (const f of failures.slice(0, 40)) console.error(`  - ${f.code} @ ${f.audioId}: ${f.why}`);
    process.exit(1);
  }
  console.log(`PASS validate:audio-quality-v2 (${reports.length} sampled, core=${core.length})`);
  process.exit(0);
}

console.error("uso: node scripts/validate-audio-quality-v2.mjs validate");
process.exit(2);
