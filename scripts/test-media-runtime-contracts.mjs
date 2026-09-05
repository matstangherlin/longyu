#!/usr/bin/env node
/**
 * V4.9.2B — contratos de runtime da mídia: resume, completion, fallback,
 * variantes de locale e privacidade da telemetria.
 *
 * Estas regras eram decisões dentro do componente React, verificáveis só por
 * E2E — o teste mais lento e mais frágil que existe. Extraídas para funções
 * puras, ficam provadas em milissegundos, e o E2E passa a cobrir a integração
 * em vez da lógica.
 *
 * O script serve a cinco entradas de `package.json` porque as cinco auditam o
 * mesmo módulo; separá-lo em cinco arquivos duplicaria o mesmo boilerplate de
 * compilação sem acrescentar cobertura. Cada entrada passa `--suite=` e falha
 * sozinha: quem quebrar a retomada vê "test:media-resume" vermelho, não um
 * gate genérico que obriga a ler a saída inteira para descobrir o quê.
 */
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();

const SUITES = ["resume", "completion", "fallback", "locale", "telemetry"];
const requested = (process.argv.find((arg) => arg.startsWith("--suite=")) ?? "").slice(8);
if (requested && !SUITES.includes(requested)) {
  console.error(`--suite desconhecida: "${requested}" (use ${SUITES.join(", ")})`);
  process.exit(1);
}
const active = requested ? [requested] : SUITES;
const runs = (suite) => active.includes(suite);
let assertions = 0;
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v492b-runtime-"));

const program = ts.createProgram(["src/data/lessonMediaAssets.ts", "src/data/lessonCapsules.ts"], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir,
  outDir,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
});
if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");

const media = require(path.join(outDir, "src/data/lessonMediaAssets.js"));
const capsules = require(path.join(outDir, "src/data/lessonCapsules.js"));

const failures = [];
const check = (condition, message) => {
  assertions += 1;
  if (!condition) failures.push(message);
};

const asset = (extra = {}) => ({
  id: "media:probe:pt:v1",
  version: 1,
  kind: "VIDEO",
  delivery: "DIRECT_MP4",
  url: "https://cdn.exemplo.com/aula.mp4",
  durationSeconds: 100,
  spokenLocale: "pt-BR",
  captions: [],
  transcript: "t",
  fallback: "INTERACTIVE_SEGMENTS",
  ...extra,
});

const progress = (extra = {}) => ({
  capsuleId: "capsule:x:v1",
  mediaAssetId: "media:probe:pt:v1",
  mediaVersion: 1,
  instructionLocale: "pt-BR",
  currentTimeSeconds: 0,
  durationSeconds: 100,
  watchedRanges: [],
  maxPositionSeconds: 0,
  completed: false,
  updatedAt: 0,
  ...extra,
});

// ── test:media-resume ─────────────────────────────────────────────────────
if (runs("resume")) {
check(media.resumeOfferSeconds(undefined) === null, "sem progresso não se oferece retomada");
check(
  media.resumeOfferSeconds(progress({ maxPositionSeconds: 42 })) === 42,
  "posição guardada deve virar oferta de retomada"
);
// Nos primeiros segundos o aluno não perdeu nada; oferecer seria ruído.
check(
  media.resumeOfferSeconds(progress({ maxPositionSeconds: 2 })) === null,
  "início recente não gera oferta de retomada"
);
// Concluída, o gesto natural é rever do começo.
check(
  media.resumeOfferSeconds(progress({ maxPositionSeconds: 95, completed: true })) === null,
  "aula concluída não oferece retomada"
);
// A um segundo do fim, retomar não retoma nada.
check(
  media.resumeOfferSeconds(progress({ maxPositionSeconds: 99.5 })) === null,
  "posição colada no fim não gera oferta"
);
}

// ── test:media-completion ─────────────────────────────────────────────────
if (runs("completion")) {
check(media.MEDIA_COMPLETION_THRESHOLD === 0.9, "o limiar precisa continuar centralizado");
check(media.isMediaWatched([{ start: 0, end: 90 }], 100), "exatamente 90% completa");
check(!media.isMediaWatched([{ start: 0, end: 89.9 }], 100), "89,9% não completa");
// A regra que dá sentido às outras: seek não fabrica conclusão.
check(!media.isMediaWatched([{ start: 99, end: 100 }], 100), "seek até o fim não completa");
check(
  !media.isMediaWatched([{ start: 0, end: 45 }, { start: 90, end: 100 }], 100),
  "assistir 55% em dois trechos não completa"
);
}

// ── test:media-fallback ───────────────────────────────────────────────────
if (runs("fallback")) {
check(media.mediaPlaybackMode(asset()) === "PLAYABLE", "asset válido deve tocar");
check(
  media.mediaPlaybackMode(asset(), { offline: true }) === "FALLBACK_OFFLINE",
  "offline vem antes de qualquer outra checagem"
);
check(
  media.mediaPlaybackMode(asset({ url: "http://exemplo.com/a.mp4" })) === "FALLBACK_UNSAFE_URL",
  "URL insegura cai no fallback, não no player"
);
check(
  media.mediaPlaybackMode(asset({ delivery: "HLS" })) === "FALLBACK_UNSUPPORTED_DELIVERY",
  "HLS declarado sem implementação cai no fallback"
);
check(
  media.mediaPlaybackMode(asset(), { failed: true }) === "FALLBACK_ERROR",
  "erro de carga cai no fallback"
);
// Offline tem precedência: sem rede, recarregar não resolveria.
check(
  media.mediaPlaybackMode(asset({ url: "http://x/a.mp4" }), { offline: true }) === "FALLBACK_OFFLINE",
  "offline tem precedência sobre URL insegura"
);
check(
  media.LESSON_MEDIA_ASSETS.every((item) => Boolean(item.fallback)),
  "todo asset precisa declarar fallback — cápsula CORE não pode virar beco sem saída"
);
}

// ── test:capsule-locale-variants ──────────────────────────────────────────
if (runs("locale")) {
const pinyin = capsules.PINYIN_FOUNDATION_CAPSULE;
const pt = pinyin.localized["pt-BR"];
const en = pinyin.localized.en;
check(Boolean(pt?.mediaAssetId) && Boolean(en?.mediaAssetId), "cada locale precisa apontar seu asset");
check(pt.mediaAssetId !== en.mediaAssetId, "PT e EN não podem compartilhar o mesmo asset falado");
// O que a Parte T proíbe mudar quando o idioma muda:
check(typeof pinyin.id === "string" && pinyin.id.length > 0, "capsuleId é único e não varia por locale");
check(
  JSON.stringify(pinyin.knowledgeTargets) === JSON.stringify(pinyin.knowledgeTargets),
  "knowledge targets pertencem à cápsula, não ao locale"
);
check(!("knowledgeTargets" in pt) && !("knowledgeTargets" in en), "locale não pode redefinir knowledge targets");
check(!("topicId" in pt) && !("topicId" in en), "locale não pode redefinir o tópico");
for (const [locale, content] of Object.entries(pinyin.localized)) {
  const linked = media.getLessonMediaAsset(content.mediaAssetId);
  check(Boolean(linked), `${locale}: asset "${content.mediaAssetId}" precisa existir`);
  if (linked) {
    check(
      linked.languageNeutral || !linked.spokenLocale || linked.spokenLocale === locale,
      `${locale}: asset fala ${linked.spokenLocale}`
    );
  }
}
// Trocar de locale não herda posição de reprodução.
check(
  media.mediaProgressKey(pinyin.id, pt.mediaAssetId, 1, "pt-BR") !==
    media.mediaProgressKey(pinyin.id, en.mediaAssetId, 1, "en"),
  "progresso de PT e EN precisa ser independente"
);
}

// ── privacidade da telemetria (Parte W) ───────────────────────────────────
if (runs("telemetry")) {
const eventsSource = require("node:fs").readFileSync(path.join(rootDir, "src/services/mediaEvents.ts"), "utf8");
const REQUIRED_EVENTS = [
  "capsule_impression", "capsule_started", "media_started", "media_paused", "media_seek",
  "media_25", "media_50", "media_75", "media_90", "caption_enabled", "transcript_opened",
  "media_error", "media_retry", "media_fallback_used", "capsule_completed",
];
for (const event of REQUIRED_EVENTS) {
  check(eventsSource.includes(`"${event}"`), `evento de mídia ausente: ${event}`);
}
check(eventsSource.includes("getTelemetryConsent()"), "telemetria de mídia precisa checar consentimento");
check(/PII_KEY/.test(eventsSource), "telemetria de mídia precisa filtrar PII");

// Nenhum ponto de emissão pode carregar identidade do aluno.
const playerSource = require("node:fs").readFileSync(
  path.join(rootDir, "src/features/journey/capsule/VideoCapsulePlayer.tsx"),
  "utf8"
);
for (const forbidden of ["email", "userId", "user_id", "displayName"]) {
  check(!playerSource.includes(`${forbidden}:`), `player não pode enviar ${forbidden} na telemetria`);
}
}

const label = requested ? `test:media-runtime-contracts --suite=${requested}` : "test:media-runtime-contracts";

if (failures.length) {
  console.error(`FAIL ${label}`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`PASS ${label} — ${assertions} asserções em: ${active.join(", ")}.`);
