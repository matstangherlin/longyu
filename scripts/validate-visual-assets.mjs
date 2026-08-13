#!/usr/bin/env node
/**
 * validate:visual-assets
 *
 * Teste global do catálogo visualVocabulary:
 *  - todo ID tem arquivo em src/assets/visuals/;
 *  - nenhum SVG com fundo mint opaco full-bleed (VIS-006);
 *  - nenhum asset > 200 KB;
 *  - nenhum image_choice (autoral) referencia conceito inexistente;
 *  - todo ID do catálogo está em VISUAL_IMAGE_SRC_BY_ID (Vite URLs).
 */
import { createRequire } from "node:module";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-visual-assets-"));
const MAX_BYTES = 200 * 1024;
const ALLOWED_EXTENSIONS = new Set([".svg", ".png", ".webp"]);
const errors = [];
const err = (ref, message) => errors.push({ ref, message });

/** VIS-006: só fundo full-bleed (rect 600×600 ou path canvas inteiro), não flecks do VTracer. */
function svgHasOpaqueMintBleed(svgText) {
  const mint = /fill=["']#(?:EDF2ED|EEF3EE|E8F0E8|F4F7F4)["']/i;
  const rects = svgText.match(/<rect\b[^>]*>/gi) ?? [];
  for (const tag of rects) {
    const w = /width=["'](\d+(?:\.\d+)?)["']/i.exec(tag);
    const h = /height=["'](\d+(?:\.\d+)?)["']/i.exec(tag);
    if (w && h && Number(w[1]) >= 590 && Number(h[1]) >= 590 && mint.test(tag)) return true;
  }
  // Path que pinta o canvas inteiro a partir de (0,0) com mint (fundo antigo).
  const paths = svgText.match(/<path\b[^>]*>/gi) ?? [];
  for (const tag of paths) {
    if (!mint.test(tag)) continue;
    const tr = /transform=["']translate\(([^)]+)\)["']/i.exec(tag);
    const xy = tr ? tr[1].split(/[,\s]+/).map(Number) : [0, 0];
    if (xy[0] === 0 && xy[1] === 0 && /d=["']M0\s+0\b/i.test(tag) && /C600\s+0|L600\s|600 0/.test(tag)) {
      return true;
    }
  }
  return false;
}

/** Chaves do mapa Vite sem compilar imports .svg. */
async function readViteAssetIds() {
  const src = await readFile(path.join(rootDir, "src/assets/visuals/index.ts"), "utf8");
  const block = src.match(/VISUAL_IMAGE_SRC_BY_ID[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return new Set();
  const ids = [...block[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((m) => m[1]);
  return new Set(ids);
}

async function listVisualFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await listVisualFiles(path.join(directory, entry.name), relative)));
    else if (ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(relative);
  }
  return files;
}

try {
  const program = ts.createProgram(
    [
      "src/data/visualVocabulary.ts",
      "src/data/journey.ts",
      "src/data/characters.ts",
      "src/data/chunks.ts",
      "src/data/types.ts",
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
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo para validate:visual-assets.");
    process.exitCode = 1;
    throw new Error("emitSkipped");
  }

  const load = (rel) => require(path.join(outDir, rel));
  const { VISUAL_CONCEPTS, visualById } = load("src/data/visualVocabulary.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const viteIds = await readViteAssetIds();
  const catalogPaths = new Set();

  let checkedFiles = 0;
  for (const concept of VISUAL_CONCEPTS) {
    const ref = concept.id;
    if (!concept.imageSrc) {
      err(ref, "imageSrc ausente");
      continue;
    }
    const normalizedSrc = String(concept.imageSrc).replaceAll("\\", "/");
    const extension = path.extname(normalizedSrc).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      err(ref, `formato não suportado: ${extension || "sem extensão"}`);
    }
    if (catalogPaths.has(normalizedSrc)) {
      err(ref, `arquivo duplicado no catálogo: ${normalizedSrc}`);
    }
    catalogPaths.add(normalizedSrc);
    const localPath = path.join(rootDir, "src/assets/visuals", concept.imageSrc);
    try {
      const bytes = (await stat(localPath)).size;
      checkedFiles += 1;
      if (bytes > MAX_BYTES) {
        err(ref, `arquivo ${(bytes / 1024).toFixed(0)} KB > ${MAX_BYTES / 1024} KB`);
      }
      if (String(concept.imageSrc).toLowerCase().endsWith(".svg")) {
        const svgText = await readFile(localPath, "utf8");
        if (!/<svg\b[^>]*\bwidth=["']600["'][^>]*\bheight=["']600["']/i.test(svgText)) {
          err(ref, "SVG sem width/height 600×600");
        }
        if (!/viewBox=["']0 0 600 600["']/i.test(svgText)) {
          err(ref, "SVG sem viewBox 0 0 600 600");
        }
        if (/<(?:text|image)\b/i.test(svgText)) {
          err(ref, "SVG contém texto ou imagem raster embutida");
        }
        if (/\b(?:href|xlink:href)=["'](?:https?:|data:)/i.test(svgText)) {
          err(ref, "SVG contém referência externa ou data URI");
        }
        if (svgHasOpaqueMintBleed(svgText)) {
          err(ref, "SVG com fundo mint opaco full-bleed (VIS-006)");
        }
      }
    } catch {
      err(ref, `arquivo inexistente: ${concept.imageSrc}`);
    }

    if (!viteIds.has(concept.id)) {
      err(ref, "ausente em VISUAL_IMAGE_SRC_BY_ID (src/assets/visuals/index.ts)");
    }
  }

  for (const assetPath of await listVisualFiles(path.join(rootDir, "src/assets/visuals"))) {
    if (!catalogPaths.has(assetPath)) err(assetPath, "asset órfão: arquivo não registrado no catálogo");
  }

  // image_choice autorais: IDs devem existir no catálogo.
  let imageChoiceSteps = 0;
  for (const lesson of ALL_LESSONS) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      if (step.kind !== "image_choice") continue;
      imageChoiceSteps += 1;
      const ids = [
        step.visualConceptId,
        step.correctImageId,
        ...(step.imageOptions ?? []),
        ...(step.imageOptionIds ?? []),
      ].filter(Boolean);
      for (const id of ids) {
        if (!visualById[id]) {
          err(`${lesson.id}#${index + 1}`, `image_choice referencia asset inexistente: ${id}`);
        }
      }
    }
  }

  if (errors.length) {
    console.error(`\nvalidate:visual-assets: ${errors.length} problema(s):`);
    for (const item of errors.slice(0, 80)) console.error(`- [${item.ref}] ${item.message}`);
    if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:visual-assets (${VISUAL_CONCEPTS.length} conceitos · ${checkedFiles} arquivos · ${imageChoiceSteps} image_choice autorais).`
    );
  }
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(error);
    process.exitCode = 1;
  }
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
