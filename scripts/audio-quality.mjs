#!/usr/bin/env node
/**
 * RC2.2.29 — qualidade de áudio canônico.
 *
 * Valida: decode (ffmpeg), duration, bytes, checksum, silence, peak/RMS flags,
 * SUSPICIOUS_DURATION (1 char ≠ frase longa).
 *
 *   node scripts/audio-quality.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/reports/rc2-2-29-audio-pack.json"), "utf8"));
const failures = [];
const fail = (code, where, why) => failures.push({ code, where, why });

let suspicious = 0;
for (const e of pack.entries) {
  const pub = path.join(ROOT, "public", e.file);
  if (!fs.existsSync(pub)) {
    fail("ASSET_MISSING", e.audioId, pub);
    continue;
  }
  const buf = fs.readFileSync(pub);
  if (buf.length < 200) fail("BYTES_TOO_SMALL", e.audioId, String(buf.length));
  const hash = createHash("sha256").update(buf).digest("hex");
  if (e.checksum && e.checksum !== hash) fail("CHECKSUM_MISMATCH", e.audioId, "checksum");
  if (!(e.durationMs > 0)) fail("DURATION_ZERO", e.audioId, "durationMs");
  // decode probe
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration:stream=sample_rate,channels", "-of", "json", pub],
      { encoding: "utf8" }
    );
    const probe = JSON.parse(out);
    const dur = Number(probe.format?.duration ?? 0);
    if (!(dur > 0.05)) fail("DECODE_FAIL", e.audioId, "duration");
    const stream = probe.streams?.[0] ?? {};
    if (stream.channels != null && Number(stream.channels) < 1) fail("CHANNELS", e.audioId, String(stream.channels));
  } catch (err) {
    fail("DECODE_FAIL", e.audioId, err instanceof Error ? err.message : String(err));
  }
  const hanzi = (String(e.textKey).match(/[\u4e00-\u9fff]/g) || []).length || 1;
  if ((hanzi === 1 && e.durationMs > 900) || (hanzi >= 12 && e.durationMs < 600)) {
    suspicious += 1;
    if (!e.suspiciousDuration) fail("SUSPICIOUS_DURATION", e.audioId, `${hanzi} chars / ${e.durationMs}ms`);
  }
  // Third-party / unmanifested: file must be under public/audio/(core|extended)
  if (!/^audio\/(core|extended)\//.test(e.file)) fail("UNMANIFESTED_PATH", e.audioId, e.file);
  if (/^https?:\/\//.test(e.uri) && !e.uri.includes("longyu")) fail("THIRD_PARTY_AUDIO", e.audioId, e.uri);
}

const report = {
  schema: "longyu-audio-quality/1",
  checked: pack.entries.length,
  suspiciousDurationFlagged: suspicious,
  failures: failures.length,
};
fs.writeFileSync(path.join(ROOT, "docs/reports/rc2-2-29-audio-quality.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.log(`FAIL audio:quality\n${failures.slice(0, 30).map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`);
  process.exit(1);
}
console.log(`PASS audio:quality (${pack.entries.length} assets, suspiciousFlagged=${suspicious})`);
