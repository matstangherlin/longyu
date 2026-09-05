#!/usr/bin/env node
/**
 * V4.9.2B — domínio de mídia: cobertura assistida, resume e segurança de URL.
 *
 * A regra que este gate mais protege é a da Parte M: arrastar a barra até o
 * fim não pode completar uma aula. Um `currentTime / duration` seria trivial
 * de falsificar, então a cobertura vem da união dos trechos reproduzidos — e
 * é exatamente isso que os casos abaixo verificam, incluindo o caso do aluno
 * que pula o meio e chega ao fim.
 */
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v492b-media-"));

const program = ts.createProgram(["src/data/lessonMediaAssets.ts"], {
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
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const near = (value, expected, tolerance = 1e-6) => Math.abs(value - expected) <= tolerance;

// ── União de intervalos ───────────────────────────────────────────────────
check(
  media.mergeWatchedRanges([{ start: 0, end: 10 }, { start: 5, end: 15 }]).length === 1,
  "intervalos sobrepostos devem virar um só"
);
check(
  near(media.watchedSeconds([{ start: 0, end: 10 }, { start: 5, end: 15 }]), 15),
  "sobreposição não pode ser contada duas vezes"
);
check(
  media.mergeWatchedRanges([{ start: 0, end: 10 }, { start: 30, end: 40 }]).length === 2,
  "intervalos distantes devem permanecer separados"
);
// `timeupdate` dispara a cada ~250ms; sem tolerância a reprodução contínua
// viraria dezenas de intervalos com micro-buracos entre eles.
check(
  media.mergeWatchedRanges([{ start: 0, end: 10 }, { start: 10.3, end: 20 }]).length === 1,
  "micro-buraco de amostragem não deve fragmentar o intervalo"
);
check(
  media.mergeWatchedRanges([{ start: 10, end: 5 }, { start: 0, end: 0 }]).length === 0,
  "intervalo invertido ou vazio deve ser descartado"
);
check(
  media.mergeWatchedRanges([{ start: 30, end: 40 }, { start: 0, end: 10 }])[0].start === 0,
  "entrada desordenada deve ser ordenada antes de unir"
);

// ── A regra anti-seek ─────────────────────────────────────────────────────
const duration = 100;
// Aluno arrasta a barra para 99s e o vídeo "termina": um único instante visto.
const seekCheat = [{ start: 99, end: 100 }];
check(
  !media.isMediaWatched(seekCheat, duration),
  "arrastar até o fim não pode completar a aula"
);
check(
  near(media.watchedCoverage(seekCheat, duration), 0.01),
  "cobertura de um seek até o fim deve refletir só o trecho tocado"
);

// Aluno assiste o começo, pula o meio, vê o fim: ainda falta conteúdo.
const skippedMiddle = [{ start: 0, end: 30 }, { start: 80, end: 100 }];
check(
  !media.isMediaWatched(skippedMiddle, duration),
  "pular o miolo não pode completar a aula"
);
check(near(media.watchedCoverage(skippedMiddle, duration), 0.5), "cobertura com miolo pulado deve ser 50%");

// Aluno assiste de verdade, com o resto tolerado pelo limiar.
check(media.isMediaWatched([{ start: 0, end: 91 }], duration), "91% assistidos devem completar");
check(!media.isMediaWatched([{ start: 0, end: 89 }], duration), "89% assistidos não devem completar");
check(
  media.MEDIA_COMPLETION_THRESHOLD === 0.9,
  "o limiar precisa continuar centralizado e explícito"
);
check(media.watchedCoverage([{ start: 0, end: 10 }], 0) === 0, "duração inválida não pode gerar cobertura");
check(
  near(media.watchedCoverage([{ start: 0, end: 500 }], duration), 1),
  "cobertura não pode passar de 100%"
);

// ── Segurança de URL (Parte Y) ────────────────────────────────────────────
const unsafe = [
  "javascript:alert(1)",
  "data:text/html;base64,PHNjcmlwdD4=",
  "file:///etc/passwd",
  "http://exemplo.com/aula.mp4",
  "//exemplo.com/aula.mp4",
  "",
];
for (const url of unsafe) {
  check(!media.verifyMediaUrl(url).safe, `URL insegura aceita: ${JSON.stringify(url)}`);
}
const safe = ["https://cdn.exemplo.com/aula.mp4", "/media/qa-fixture.mp4"];
for (const url of safe) {
  check(media.verifyMediaUrl(url).safe, `URL segura recusada: ${url}`);
}
check(
  media.verifyMediaUrl("javascript:alert(1)").reason === "UNSAFE_PROTOCOL",
  "recusa por protocolo deve nomear a razão"
);

// ── Chave de progresso (Parte T) ──────────────────────────────────────────
const ptKey = media.mediaProgressKey("capsule:x:v1", "media:x:pt:v1", 1, "pt-BR");
const enKey = media.mediaProgressKey("capsule:x:v1", "media:x:en:v1", 1, "en");
check(ptKey !== enKey, "PT e EN não podem compartilhar a mesma posição de reprodução");
check(
  media.mediaProgressKey("capsule:x:v1", "media:x:pt:v1", 2, "pt-BR") !== ptKey,
  "uma versão nova do asset não pode herdar a posição da anterior"
);

// ── Registro ──────────────────────────────────────────────────────────────
const ids = media.LESSON_MEDIA_ASSETS.map((asset) => asset.id);
check(new Set(ids).size === ids.length, "ids de media asset devem ser únicos");
check(
  media.LESSON_MEDIA_ASSETS.every((asset) => asset.durationSeconds > 0),
  "todo asset precisa de duração positiva"
);
check(
  media.getLessonMediaAsset("media:pinyin-foundation:pt:v1")?.kind === "INTERNAL_ANIMATION",
  "a cápsula de Pinyin deve continuar animação interna, não vídeo"
);

if (failures.length) {
  console.error("FAIL test:media-progress");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `PASS test:media-progress — união de intervalos, anti-seek (limiar ${media.MEDIA_COMPLETION_THRESHOLD}), ` +
    `allowlist de URL e isolamento de progresso por locale/versão.`
);
