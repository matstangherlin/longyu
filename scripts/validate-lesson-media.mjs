#!/usr/bin/env node
/**
 * V4.9.2B — Parte Z: validador de autoria de cápsulas e mídia.
 *
 * O objetivo declarado da V4.9.2 é que adicionar uma aula deixe de exigir
 * reconstrução da aplicação: produzir conteúdo, cadastrar asset, transcrever,
 * declarar knowledge targets, posicionar na Journey, publicar. Isso só é
 * seguro se o cadastro for verificado — sem este gate, um id duplicado, uma
 * URL insegura ou um alvo de conhecimento inexistente só apareceriam para o
 * aluno.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v492b-authoring-"));

const program = ts.createProgram(
  [
    "src/data/lessonCapsules.ts",
    "src/data/lessonMediaAssets.ts",
    "src/data/pedagogicalSpine.ts",
    "src/data/journeyOrchestrator.ts",
  ],
  {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    jsx: ts.JsxEmit.ReactJSX,
  }
);
if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
await copyFile(
  path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"),
  path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
);

const capsulesModule = require(path.join(outDir, "src/data/lessonCapsules.js"));
const mediaModule = require(path.join(outDir, "src/data/lessonMediaAssets.js"));
const spine = require(path.join(outDir, "src/data/pedagogicalSpine.js"));
const orchestrator = require(path.join(outDir, "src/data/journeyOrchestrator.js"));

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const capsules = Object.values(capsulesModule).filter(
  (value) => value && typeof value === "object" && typeof value.id === "string" && value.localized
);
const assets = mediaModule.LESSON_MEDIA_ASSETS;
const LOCALES = ["pt-BR", "en"];

// ── Identidades únicas ────────────────────────────────────────────────────
const capsuleIds = capsules.map((capsule) => capsule.id);
check(new Set(capsuleIds).size === capsuleIds.length, "ids de cápsula duplicados");
const assetIds = assets.map((asset) => asset.id);
check(new Set(assetIds).size === assetIds.length, "ids de media asset duplicados");

// ── Assets ────────────────────────────────────────────────────────────────
for (const asset of assets) {
  const where = `asset ${asset.id}`;
  check(asset.durationSeconds > 0, `${where}: duração precisa ser positiva`);
  check(Number.isInteger(asset.version) && asset.version > 0, `${where}: versão precisa ser inteiro positivo`);

  if (asset.delivery === "INTERNAL") {
    check(!asset.url, `${where}: entrega INTERNAL não deve declarar url`);
  } else {
    const verdict = mediaModule.verifyMediaUrl(asset.url);
    check(verdict.safe, `${where}: url recusada (${verdict.reason ?? "desconhecida"})`);
  }

  // Vídeo com fala precisa de legenda e transcrição — sem exceção. Quem não
  // ouve, quem está no transporte e quem lê melhor do que escuta dependem
  // disso para ter a mesma aula, não uma versão pior dela.
  const spoken = asset.kind === "VIDEO" && !asset.languageNeutral;
  if (spoken) {
    check(asset.captions?.length > 0, `${where}: vídeo falado exige legendas`);
    check(Boolean(asset.transcript?.trim()), `${where}: vídeo falado exige transcrição`);
    check(Boolean(asset.spokenLocale), `${where}: vídeo falado precisa declarar spokenLocale`);
  }

  for (const cue of asset.captions ?? []) {
    check(
      cue.endSeconds > cue.startSeconds,
      `${where}: cue com fim (${cue.endSeconds}) antes do início (${cue.startSeconds})`
    );
    check(
      cue.endSeconds <= asset.durationSeconds + 0.5,
      `${where}: cue termina (${cue.endSeconds}) depois da duração (${asset.durationSeconds})`
    );
    check(!/[<>]/.test(cue.text), `${where}: legenda não pode conter marcação HTML`);
  }
  check(!/[<>]/.test(asset.transcript ?? ""), `${where}: transcrição não pode conter marcação HTML`);
  check(
    ["INTERACTIVE_SEGMENTS", "TRANSCRIPT_ONLY"].includes(asset.fallback),
    `${where}: fallback precisa ser declarado — cápsula CORE não pode virar beco sem saída`
  );
}

// ── Cápsulas ──────────────────────────────────────────────────────────────
const topicIds = new Set(orchestrator.JOURNEY_NODES.map((node) => node.sourceId).filter(Boolean));

for (const capsule of capsules) {
  const where = `cápsula ${capsule.id}`;
  check(capsule.durationSeconds > 0, `${where}: duração precisa ser positiva`);
  check(
    topicIds.has(capsule.topicId),
    `${where}: topicId "${capsule.topicId}" não existe entre os nodes da Jornada`
  );

  for (const targetId of capsule.knowledgeTargets ?? []) {
    check(
      Boolean(spine.getKnowledgeTarget(targetId)),
      `${where}: knowledge target "${targetId}" não existe no manifesto`
    );
  }
  check((capsule.knowledgeTargets ?? []).length > 0, `${where}: precisa declarar ao menos um knowledge target`);

  for (const locale of LOCALES) {
    const content = capsule.localized?.[locale];
    check(Boolean(content), `${where}: falta conteúdo em ${locale}`);
    if (!content) continue;
    check(Boolean(content.title?.trim()), `${where} (${locale}): título vazio`);
    check(Boolean(content.objective?.trim()), `${where} (${locale}): objetivo vazio`);
    check((content.segments ?? []).length > 0, `${where} (${locale}): sem segmentos`);

    if (content.mediaAssetId) {
      const asset = mediaModule.getLessonMediaAsset(content.mediaAssetId);
      check(Boolean(asset), `${where} (${locale}): asset "${content.mediaAssetId}" não existe`);
      if (asset) {
        check(
          asset.languageNeutral || !asset.spokenLocale || asset.spokenLocale === locale,
          `${where} (${locale}): asset fala ${asset.spokenLocale}, mas está ligado a ${locale}`
        );
        // Trocar de idioma troca a mídia, nunca a identidade da cápsula.
        const other = LOCALES.find((value) => value !== locale);
        const otherAssetId = capsule.localized?.[other]?.mediaAssetId;
        check(
          !otherAssetId || otherAssetId !== content.mediaAssetId || asset.languageNeutral,
          `${where}: PT e EN compartilham o asset falado "${content.mediaAssetId}"`
        );
      }
    }
  }

  if (capsule.mediaType === "VIDEO_CAPSULE") {
    for (const locale of LOCALES) {
      check(
        Boolean(capsule.localized?.[locale]?.mediaAssetId),
        `${where} (${locale}): VIDEO_CAPSULE exige asset de mídia`
      );
    }
  }
}

if (failures.length) {
  console.error("ERRO: validate:lesson-media falhou.");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const animated = capsules.filter((capsule) => capsule.mediaType === "ANIMATED_CAPSULE").length;
const video = capsules.filter((capsule) => capsule.mediaType === "VIDEO_CAPSULE").length;
const spokenVideos = assets.filter((asset) => asset.kind === "VIDEO" && !asset.languageNeutral);
const withCaptions = spokenVideos.filter((asset) => asset.captions?.length > 0).length;
const withTranscript = spokenVideos.filter((asset) => Boolean(asset.transcript?.trim())).length;

console.log(
  `OK: validate:lesson-media — ${capsules.length} cápsula(s) (${animated} animada(s), ${video} vídeo), ` +
    `${assets.length} asset(s); vídeo falado: ${spokenVideos.length}, ` +
    `captions ${withCaptions}/${spokenVideos.length}, transcript ${withTranscript}/${spokenVideos.length}.`
);
