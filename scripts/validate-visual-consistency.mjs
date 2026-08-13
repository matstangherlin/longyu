/**
 * validate:visual-consistency
 *
 * Audita a IDENTIDADE VISUAL do catálogo (src/assets/visuals + visualVocabulary):
 * dimensões, proporção, tamanho de arquivo, transparência, metadados, ausência
 * de URL externa, alt, estilo declarado e — o mais importante — consistência de
 * estilo entre os distractores de cada pergunta (nenhuma grade mistura famílias).
 *
 * Gera reports/visual-consistency-report.md.
 *
 * Falha (hard) se:
 * - imageSrc ausente/externa, dimensão ≠ 600×600, arquivo > 200 KB;
 * - metadado ausente/ inválido (visualStyle, backgroundStyle, subjectCount);
 * - backgroundStyle transparent sem canal alfa;
 * - alt vazio ou com hànzì;
 * - as opções de uma pergunta (alvo + distractores) misturam famílias de estilo;
 * - um conceito não consegue 3 distractores da mesma família;
 * - uma VisualScene com mais de 3 personagens.
 * Avisa (warning) quando o arquivo é pesado ou o estilo diverge do majoritário
 * da categoria (candidato a substituição).
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

/** VIS-006: só fundo full-bleed (rect 600×600 ou path canvas inteiro), não flecks do VTracer. */
function svgHasOpaqueMintBleed(svgText) {
  const mint = /fill=["']#(?:EDF2ED|EEF3EE|E8F0E8|F4F7F4)["']/i;
  const rects = svgText.match(/<rect\b[^>]*>/gi) ?? [];
  for (const tag of rects) {
    const w = /width=["'](\d+(?:\.\d+)?)["']/i.exec(tag);
    const h = /height=["'](\d+(?:\.\d+)?)["']/i.exec(tag);
    if (w && h && Number(w[1]) >= 590 && Number(h[1]) >= 590 && mint.test(tag)) return true;
  }
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

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/visual-consistency-report.md");

const EXPECT_W = 600;
const EXPECT_H = 600;
const MAX_BYTES = 200 * 1024;
const WARN_BYTES = 80 * 1024;
const MAX_ALPHA_FOG_RATIO = 0.15;
const VALID_STYLES = new Set(["photo", "realistic_illustration", "flat_illustration"]);
const VALID_BACKGROUNDS = new Set(["neutral", "contextual", "transparent"]);
const CJK_RE = /[㐀-鿿豈-﫿]/u;
// Lista vazia: todos os assets priorizados no guia já foram revisados.
const PRIORITY_REVIEW = new Set();
const AMBIGUOUS_RELATIONSHIPS = new Set([
  "mother",
  "father",
  "friend",
  "son",
  "daughter",
  "older_brother",
  "older_sister",
  "female_friend",
  "girlfriend",
  "boyfriend",
]);

const errors = [];
const warnings = [];
const err = (ref, message) => errors.push({ ref, message });
const warn = (ref, message) => warnings.push({ ref, message });

try {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-visual-consistency-"));
  try {
    const program = ts.createProgram(
      ["src/data/visualVocabulary.ts", "src/data/journey.ts", "src/data/characters.ts", "src/data/chunks.ts", "src/data/types.ts"],
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
      console.error("Falha ao compilar o grafo para validate:visual-consistency.");
      process.exitCode = 1;
      throw new Error("emitSkipped");
    }
    const load = (rel) => require(path.join(outDir, rel));
    const { VISUAL_CONCEPTS, VISUAL_SCENES, visualById, defaultVisualDistractors, visualStyleFamily } = load(
      "src/data/visualVocabulary.js"
    );
    const { ALL_LESSONS } = load("src/data/journey.js");

    // Estilo majoritário por categoria (para sinalizar divergências).
    const styleByCategory = new Map();
    for (const concept of VISUAL_CONCEPTS) {
      const counts = styleByCategory.get(concept.category) ?? new Map();
      counts.set(concept.visualStyle, (counts.get(concept.visualStyle) ?? 0) + 1);
      styleByCategory.set(concept.category, counts);
    }
    const majorityStyle = new Map(
      [...styleByCategory.entries()].map(([cat, counts]) => [
        cat,
        [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0],
      ])
    );

    const fileInfo = new Map();
    const rows = [];

    for (const concept of VISUAL_CONCEPTS) {
      const ref = concept.id;
      const problems = [];

      // ——— Metadados ———
      if (!VALID_STYLES.has(concept.visualStyle)) {
        err(ref, `visualStyle inválido: ${concept.visualStyle}`);
        problems.push("visualStyle inválido");
      }
      if (!VALID_BACKGROUNDS.has(concept.backgroundStyle)) {
        err(ref, `backgroundStyle inválido: ${concept.backgroundStyle}`);
        problems.push("backgroundStyle inválido");
      }
      if (!Number.isFinite(concept.subjectCount) || concept.subjectCount < 1) {
        err(ref, `subjectCount inválido: ${concept.subjectCount}`);
        problems.push("subjectCount inválido");
      }
      if (AMBIGUOUS_RELATIONSHIPS.has(concept.id) && concept.imageOnlySafe !== false) {
        err(ref, "relação ambígua precisa declarar imageOnlySafe: false");
        problems.push("sem gate de ambiguidade");
      }
      if (!String(concept.imageAltPt ?? "").trim()) {
        err(ref, "alt vazio");
        problems.push("alt vazio");
      } else if (CJK_RE.test(concept.imageAltPt)) {
        err(ref, "alt contém hànzì (deve ser só português)");
        problems.push("alt com hànzì");
      }
      if (/^https?:\/\//i.test(String(concept.imageSrc ?? "")) || /^https?:\/\//i.test(String(concept.emoji ?? ""))) {
        err(ref, "imagem externa via http/https");
        problems.push("URL externa");
      }

      // ——— Arquivo ———
      let dims = "—";
      let sizeKb = "—";
      if (!concept.imageSrc) {
        err(ref, "imageSrc ausente");
        problems.push("sem imageSrc");
      } else {
        const localPath = path.join(rootDir, "src/assets/visuals", concept.imageSrc);
        try {
          const meta = await sharp(localPath).metadata();
          const bytes = (await stat(localPath)).size;
          fileInfo.set(ref, { width: meta.width, height: meta.height, hasAlpha: Boolean(meta.hasAlpha), bytes });
          dims = `${meta.width}×${meta.height}`;
          sizeKb = `${(bytes / 1024).toFixed(1)} KB`;
          if (meta.width !== EXPECT_W || meta.height !== EXPECT_H) {
            err(ref, `dimensão ${meta.width}×${meta.height} (esperado ${EXPECT_W}×${EXPECT_H})`);
            problems.push("dimensão");
          }
          if (meta.width !== meta.height) problems.push("não quadrada");
          if (bytes > MAX_BYTES) {
            err(ref, `arquivo ${(bytes / 1024).toFixed(0)} KB acima do máximo (${MAX_BYTES / 1024} KB)`);
            problems.push("arquivo grande");
          } else if (bytes > WARN_BYTES) {
            warn(ref, `arquivo pesado: ${(bytes / 1024).toFixed(0)} KB`);
            problems.push("pesado");
          }
          // Transparência coerente com o backgroundStyle.
          // SVG quase sempre reporta hasAlpha no sharp mesmo com fundo opaco —
          // a checagem de alfa vale para raster (WebP/PNG).
          const isSvg = String(concept.imageSrc).toLowerCase().endsWith(".svg");
          if (concept.backgroundStyle === "transparent" && !meta.hasAlpha) {
            err(ref, "backgroundStyle transparent mas o arquivo não tem canal alfa");
            problems.push("sem alfa");
          }
          if (!isSvg && concept.backgroundStyle !== "transparent" && meta.hasAlpha) {
            warn(ref, "arquivo tem alfa mas backgroundStyle não é transparent");
          }
          if (!isSvg && concept.backgroundStyle === "transparent") {
            const { data: alphaRaw, info: alphaInfo } = await sharp(localPath)
              .ensureAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true });
            let semiTransparent = 0;
            for (let index = 3; index < alphaRaw.length; index += alphaInfo.channels) {
              const alpha = alphaRaw[index];
              if (alpha > 0 && alpha < 245) semiTransparent += 1;
            }
            const fogRatio = semiTransparent / (alphaInfo.width * alphaInfo.height);
            if (fogRatio > MAX_ALPHA_FOG_RATIO) {
              err(ref, `névoa de alpha cobre ${(fogRatio * 100).toFixed(1)}% do canvas (máx. ${MAX_ALPHA_FOG_RATIO * 100}%)`);
              problems.push("névoa de alpha");
            }
          }
          if (isSvg) {
            const svgText = await readFile(localPath, "utf8");
            if (svgHasOpaqueMintBleed(svgText)) {
              err(ref, "SVG com fundo mint opaco full-bleed (#EDF2ED/#EEF3EE) — VIS-006");
              problems.push("fundo mint opaco");
            }
          }
        } catch (error) {
          err(ref, `não foi possível ler o arquivo: ${concept.imageSrc}`);
          problems.push("arquivo ilegível");
        }
      }

      // ——— Divergência de estilo (candidato a substituição) ———
      const catMajority = majorityStyle.get(concept.category);
      const divergesCategory = catMajority && concept.visualStyle !== catMajority;
      if (divergesCategory) {
        warn(ref, `estilo ${concept.visualStyle} diverge do majoritário da categoria ${concept.category} (${catMajority})`);
      }
      const needsReplacement = divergesCategory || PRIORITY_REVIEW.has(concept.id) || problems.includes("arquivo grande");

      rows.push({
        id: concept.id,
        concept: `${concept.hanzi} ${concept.meaningPt}`,
        style: concept.visualStyle,
        background: concept.backgroundStyle,
        size: sizeKb,
        dims,
        problems: problems.length ? problems.join(", ") : "—",
        replace: needsReplacement ? "sim" : "—",
      });
    }

    // ——— Consistência dos distractores: nenhuma grade mistura famílias ———
    for (const concept of VISUAL_CONCEPTS) {
      const distractors = defaultVisualDistractors(concept.id, 3);
      if (distractors.length < 3) {
        err(concept.id, `não há 3 distractores da mesma família de estilo (achou ${distractors.length})`);
        continue;
      }
      const families = new Set([concept, ...distractors.map((id) => visualById[id])].map((c) => visualStyleFamily(c.visualStyle)));
      if (families.size > 1) {
        err(
          concept.id,
          `opções misturam famílias de estilo: ${distractors.map((id) => `${id}(${visualById[id].visualStyle})`).join(", ")}`
        );
      }
      const ambiguous = new Set(concept.ambiguousWith ?? []);
      for (const distractorId of distractors) {
        if (ambiguous.has(distractorId) || visualById[distractorId]?.ambiguousWith?.includes(concept.id)) {
          err(concept.id, `distractor visual ambíguo selecionado: ${distractorId}`);
        }
      }
    }

    // ——— Opções autorais de image_choice também precisam ser consistentes ———
    for (const lesson of ALL_LESSONS) {
      for (const [index, step] of (lesson.steps ?? []).entries()) {
        if (step.kind !== "image_choice") continue;
        const ids = [step.correctImageId, ...(step.imageOptions ?? [])].filter(Boolean);
        const concepts = ids.map((id) => visualById[id]).filter(Boolean);
        if (concepts.length < 2) continue;
        const families = new Set(concepts.map((c) => visualStyleFamily(c.visualStyle)));
        if (families.size > 1) {
          err(
            `${lesson.id}#${index + 1}`,
            `image_choice autoral mistura famílias de estilo: ${ids.join(", ")}`
          );
        }
      }
    }

    // ——— Cenas contextuais: no máximo 3 personagens ———
    for (const scene of VISUAL_SCENES ?? []) {
      if (!VALID_STYLES.has(scene.visualStyle)) err(`scene:${scene.id}`, `visualStyle inválido: ${scene.visualStyle}`);
      if (Number(scene.subjectCount) > 3) {
        err(`scene:${scene.id}`, `cena com ${scene.subjectCount} personagens (máx. 3)`);
      }
    }

    // ——— Relatório ———
    const styleCounts = new Map();
    for (const concept of VISUAL_CONCEPTS) {
      styleCounts.set(concept.visualStyle, (styleCounts.get(concept.visualStyle) ?? 0) + 1);
    }
    const replaceCount = rows.filter((r) => r.replace === "sim").length;

    const lines = [
      "# Relatório de consistência visual",
      "",
      ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
      "## Resumo",
      "",
      "| Indicador | Valor |",
      "|-----------|------:|",
      `| Assets no catálogo | ${VISUAL_CONCEPTS.length} |`,
      `| Estilo photo | ${styleCounts.get("photo") ?? 0} |`,
      `| Estilo realistic_illustration | ${styleCounts.get("realistic_illustration") ?? 0} |`,
      `| Estilo flat_illustration | ${styleCounts.get("flat_illustration") ?? 0} |`,
      `| Candidatos a substituição | ${replaceCount} |`,
      `| Cenas contextuais (VisualScene) | ${(VISUAL_SCENES ?? []).length} |`,
      `| Erros | ${errors.length} |`,
      `| Avisos | ${warnings.length} |`,
      "",
      "Consistência garantida por família de estilo (realistic = photo +",
      "realistic_illustration; flat = flat_illustration). Nenhuma pergunta mistura",
      "famílias — ver docs/VISUAL_ASSET_GUIDE.md.",
      "",
      "## Estilo majoritário por categoria",
      "",
      "| Categoria | Estilo majoritário |",
      "|-----------|--------------------|",
      ...[...majorityStyle.entries()].map(([cat, style]) => `| ${cat} | ${style} |`),
      "",
      "## Catálogo",
      "",
      "| Asset | Conceito | Estilo | Fundo | Tamanho | Dimensão | Problemas | Substituir? |",
      "|-------|----------|--------|-------|--------:|----------|-----------|:-----------:|",
      ...rows.map(
        (r) =>
          `| ${r.id} | ${r.concept} | ${r.style} | ${r.background} | ${r.size} | ${r.dims} | ${r.problems} | ${r.replace} |`
      ),
      "",
    ];

    if (warnings.length > 0) {
      lines.push("## Avisos", "");
      for (const item of warnings) lines.push(`- **${item.ref}**: ${item.message}`);
      lines.push("");
    }

    lines.push(
      "---",
      "",
      "_Substituir = estilo diverge do majoritário da categoria, arquivo grande, ou item na lista de prioridade do guia. Não é obrigatório trocar por foto — o alvo é aparência profissional, consistência e boa leitura no mobile._",
      ""
    );

    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, finalizeReport(lines), "utf8");

    if (errors.length > 0) {
      console.error(`\nvalidate:visual-consistency encontrou ${errors.length} problema(s):`);
      for (const item of errors.slice(0, 60)) console.error(`- [${item.ref}] ${item.message}`);
      if (errors.length > 60) console.error(`...mais ${errors.length - 60}.`);
      process.exitCode = 1;
    } else {
      console.log(
        `OK: validate:visual-consistency passou (${VISUAL_CONCEPTS.length} assets · ${replaceCount} candidatos a substituição · ${warnings.length} aviso(s)).`
      );
    }
    console.log(`Relatório: ${reportPath}`);
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(error);
    process.exitCode = 1;
  }
}
