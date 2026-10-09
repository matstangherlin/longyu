#!/usr/bin/env node
/**
 * RC2.3.13G — consume a safe beta event export and write beta-health-report.json.
 * Small-sample honest: NO_DATA when empty; always show N.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, "docs/beta/beta-health-report.json");
const OUT_MD = path.join(ROOT, "docs/beta/beta-health-report.md");

function readJson(rel, fallback = null) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function rate(num, den) {
  if (!den) return { status: "NO_DATA", numerator: 0, denominator: 0 };
  return { status: "OK", numerator: num, denominator: den };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

const inputPath = process.argv[2] || "docs/beta/beta-events-export.json";
const events = readJson(inputPath, { events: [], eligibleTesters: 0 });
const list = Array.isArray(events.events) ? events.events : Array.isArray(events) ? events : [];
const names = new Set(list.map((e) => e.name));
const activated = list.filter((e) => e.name === "first_mandarin_action" || e.name === "first_lesson_started").length;
const eligible = Number(events.eligibleTesters ?? 0);
const firstComplete = list.filter((e) => e.name === "first_lesson_completed").length;
const cultureDisco = list.filter((e) => e.name === "culture_first_switch").length;
const practiceDisco = list.filter((e) => e.name === "practice_first_open").length;
const masteryDisco = list.filter((e) => e.name === "mastery_first_open").length;
const audioFails = list.filter((e) => e.name === "audio_failed").length;
const audioStarts = list.filter((e) => e.name === "audio_started" || e.name === "audio_start_requested").length;
const mandarinDurations = list
  .filter((e) => e.name === "first_mandarin_action" && typeof e.detail?.durationMs === "number")
  .map((e) => e.detail.durationMs)
  .sort((a, b) => a - b);
const freeze = fs.readFileSync(path.join(ROOT, "src/lib/curriculumFreeze.ts"), "utf8");
const fp = /RC_BASE_FINGERPRINT = "([a-f0-9]+)"/.exec(freeze)?.[1] ?? "";
let sourceSha = "unknown";
try {
  sourceSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
} catch {
  /* ignore */
}

const report = {
  schemaVersion: "beta_health/1",
  generatedAt: new Date().toISOString(),
  sourceSha,
  fingerprint: fp,
  sampleSize: { eligible, withEvents: list.length },
  metrics: {
    activated: rate(activated, eligible),
    firstLessonCompleted: rate(firstComplete, eligible),
    cultureDiscovery: rate(cultureDisco, activated || eligible),
    practiceDiscovery: rate(practiceDisco, activated || eligible),
    masteryDiscovery: rate(masteryDisco, activated || eligible),
    audioTechFailure: rate(audioFails, audioStarts),
    timeToFirstMandarin: {
      status: mandarinDurations.length ? "OK" : "NO_DATA",
      p50: percentile(mandarinDurations, 50),
      p90: percentile(mandarinDurations, 90),
      n: mandarinDurations.length,
    },
  },
  eventNamesSeen: [...names].sort(),
  digest: createHash("sha256").update(JSON.stringify(list)).digest("hex").slice(0, 16),
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
const md = [
  "# Beta health report",
  "",
  `Generated ${report.generatedAt} · SHA \`${report.sourceSha.slice(0, 12)}\` · fp \`${report.fingerprint}\``,
  "",
  `Sample: ${report.sampleSize.withEvents} events / ${report.sampleSize.eligible} eligible`,
  "",
  "| Metric | Status | Value |",
  "| --- | --- | --- |",
  ...Object.entries(report.metrics).map(([k, v]) => {
    if (v.status === "NO_DATA") return `| ${k} | NO_DATA | — |`;
    if ("p50" in v) return `| ${k} | OK | p50=${v.p50} p90=${v.p90} n=${v.n} |`;
    return `| ${k} | OK | ${v.numerator}/${v.denominator} |`;
  }),
  "",
].join("\n");
fs.writeFileSync(OUT_MD, md);
console.log(`PASS generate:beta-health-report · ${OUT_JSON}`);
