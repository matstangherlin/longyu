#!/usr/bin/env node
/**
 * V4.9.2B — Parte Z: o validador de autoria.
 *
 * O catálogo publicado é o único lugar do Longyu onde conteúdo entra sem
 * passar por code review. Isso é o objetivo — publicar uma aula não deve
 * exigir um programador —, mas troca revisão humana por revisão automática:
 * o que este gate não pegar, o aluno pega.
 *
 * Duas metades, e a segunda é a que importa:
 *
 * 1. O catálogo que está no repositório precisa ser aceito. Hoje ele é vazio,
 *    porque ainda não existe aula gravada; o gate garante que quando deixar de
 *    ser, ninguém suba um arquivo quebrado sem perceber.
 *
 * 2. Cada recusa precisa acontecer de fato. Um validador que aceita tudo passa
 *    igualzinho a um que funciona, e a diferença só aparece em produção. Por
 *    isso o gate alimenta o parser com manifestos deliberadamente errados —
 *    `javascript:` na URL, locale faltando, asset inexistente, id duplicado,
 *    versão do futuro — e exige a recusa correta para cada um. Estes casos
 *    valem mais do que o catálogo real: o real ainda está vazio.
 */
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v492b-catalog-"));

try {
  const program = ts.createProgram(["src/data/lessonCatalogSchema.ts"], {
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
  const { parseLessonCatalog, LESSON_CATALOG_VERSION } = require(
    path.join(outDir, "src/data/lessonCatalogSchema.js")
  );

  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };

  // ── Metade 1: o arquivo publicado ────────────────────────────────────────
  const catalogPath = path.join(rootDir, "public/lessons/catalog.v1.json");
  const shipped = JSON.parse(await readFile(catalogPath, "utf8"));
  const parsedShipped = parseLessonCatalog(shipped);
  check(
    parsedShipped.problems.length === 0,
    `catálogo publicado tem problemas: ${JSON.stringify(parsedShipped.problems)}`
  );
  check(shipped.version === LESSON_CATALOG_VERSION, "catálogo publicado precisa declarar a versão suportada");

  // ── Metade 2: cada recusa precisa acontecer ──────────────────────────────
  const cue = { startSeconds: 0, endSeconds: 5, text: "ok" };
  const segment = { id: "s1", kind: "EXPLAIN", title: "t", body: "b" };
  const asset = (extra = {}) => ({
    id: "media:probe:pt:v1",
    version: 1,
    kind: "VIDEO",
    delivery: "DIRECT_MP4",
    url: "https://cdn.exemplo.com/a.mp4",
    durationSeconds: 30,
    spokenLocale: "pt-BR",
    captions: [cue],
    transcript: "t",
    fallback: "INTERACTIVE_SEGMENTS",
    ...extra,
  });
  const localized = (extra = {}) => ({
    title: "Título",
    objective: "Objetivo",
    transcript: "t",
    captions: [cue],
    segments: [segment],
    ...extra,
  });
  const capsule = (extra = {}) => ({
    id: "capsule:probe:v1",
    topicId: "p1-o-que-e-pinyin",
    mediaType: "VIDEO_CAPSULE",
    durationSeconds: 30,
    completionRule: "MEDIA_ENDED",
    knowledgeTargets: ["chunk:nihao"],
    localized: { "pt-BR": localized(), en: localized() },
    ...extra,
  });
  const manifest = (extra = {}) => ({ version: 1, assets: [], capsules: [], ...extra });

  // O caso feliz precisa passar, senão as recusas não provam nada.
  const happy = parseLessonCatalog(
    manifest({
      assets: [asset(), asset({ id: "media:probe:en:v1", spokenLocale: "en" })],
      capsules: [
        capsule({
          localized: {
            "pt-BR": localized({ mediaAssetId: "media:probe:pt:v1" }),
            en: localized({ mediaAssetId: "media:probe:en:v1" }),
          },
        }),
      ],
    })
  );
  check(happy.capsules.length === 1, "manifesto válido precisa produzir a cápsula");
  check(happy.assets.length === 2, "manifesto válido precisa produzir os dois assets");
  check(happy.problems.length === 0, `manifesto válido não devia ter problemas: ${JSON.stringify(happy.problems)}`);

  const rejects = [
    ["não é objeto", "banana", "NOT_AN_OBJECT"],
    ["versão do futuro", manifest({ version: 99 }), "UNSUPPORTED_VERSION"],
    ["versão ausente", { assets: [], capsules: [] }, "UNSUPPORTED_VERSION"],
    // Parte Y — o vetor que justifica a allowlist existir.
    ["url javascript:", manifest({ assets: [asset({ url: "javascript:alert(1)" })] }), "UNSAFE_URL"],
    ["url data:text/html", manifest({ assets: [asset({ url: "data:text/html,<script>x</script>" })] }), "UNSAFE_URL"],
    ["url file:", manifest({ assets: [asset({ url: "file:///etc/passwd" })] }), "UNSAFE_URL"],
    ["url http simples", manifest({ assets: [asset({ url: "http://exemplo.com/a.mp4" })] }), "UNSAFE_URL"],
    ["url protocol-relative", manifest({ assets: [asset({ url: "//malicioso.com/a.mp4" })] }), "UNSAFE_URL"],
    ["poster javascript:", manifest({ assets: [asset({ poster: "javascript:alert(1)" })] }), "UNSAFE_URL"],
    ["vídeo sem url", manifest({ assets: [asset({ url: undefined })] }), "MISSING_FIELD"],
    ["delivery inválido", manifest({ assets: [asset({ delivery: "TORRENT" })] }), "INVALID_ENUM"],
    ["duração zero", manifest({ assets: [asset({ durationSeconds: 0 })] }), "INVALID_TYPE"],
    ["asset duplicado", manifest({ assets: [asset(), asset()] }), "DUPLICATE_ID"],
    ["cápsula duplicada", manifest({ capsules: [capsule(), capsule()] }), "DUPLICATE_ID"],
    ["mediaType inválido", manifest({ capsules: [capsule({ mediaType: "PODCAST" })] }), "INVALID_ENUM"],
    ["locale en ausente", manifest({ capsules: [capsule({ localized: { "pt-BR": localized() } })] }), "MISSING_LOCALE"],
    [
      "sem segmentos (sem fallback da Parte O)",
      manifest({ capsules: [capsule({ localized: { "pt-BR": localized({ segments: [] }), en: localized() } })] }),
      "EMPTY_SEGMENTS",
    ],
    [
      "asset inexistente",
      manifest({
        capsules: [capsule({ localized: { "pt-BR": localized({ mediaAssetId: "media:fantasma" }), en: localized() } })],
      }),
      "UNKNOWN_MEDIA_ASSET",
    ],
    [
      "locale aponta para voz do outro idioma",
      manifest({
        assets: [asset()],
        capsules: [
          capsule({
            localized: { "pt-BR": localized(), en: localized({ mediaAssetId: "media:probe:pt:v1" }) },
          }),
        ],
      }),
      "LOCALE_SPEAKS_WRONG_LANGUAGE",
    ],
    ["legenda invertida", manifest({ assets: [asset({ captions: [{ startSeconds: 9, endSeconds: 2, text: "x" }] })] }), "INVALID_TYPE"],
  ];

  for (const [name, input, expectedCode] of rejects) {
    const result = parseLessonCatalog(input);
    const codes = result.problems.map((problem) => problem.code);
    check(codes.includes(expectedCode), `"${name}" devia gerar ${expectedCode}, gerou [${codes.join(", ")}]`);
    // Recusar o item é metade; a outra é o item não entrar assim mesmo.
    if (expectedCode !== "INVALID_TYPE" || name !== "legenda invertida") {
      check(
        result.capsules.every((entry) => entry.id !== "capsule:probe:v1") || expectedCode === "DUPLICATE_ID",
        `"${name}" recusou mas deixou a cápsula entrar`
      );
    }
  }

  // Um item podre não pode levar os saudáveis junto.
  const mixed = parseLessonCatalog(
    manifest({
      assets: [asset(), asset({ id: "media:podre", url: "javascript:alert(1)" })],
      capsules: [capsule({ localized: { "pt-BR": localized({ mediaAssetId: "media:probe:pt:v1" }), en: localized() } })],
    })
  );
  check(mixed.assets.length === 1, "asset válido precisa sobreviver ao vizinho inválido");
  check(mixed.capsules.length === 1, "cápsula válida precisa sobreviver ao asset inválido");
  check(mixed.problems.some((problem) => problem.code === "UNSAFE_URL"), "o problema precisa ficar registrado");

  // O parser nunca lança: publicar conteúdo não pode derrubar o app.
  for (const hostile of [null, undefined, 42, [], "", { version: 1, assets: "x", capsules: null }]) {
    try {
      parseLessonCatalog(hostile);
    } catch (error) {
      check(false, `parser lançou para entrada hostil ${JSON.stringify(hostile)}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error("FAIL validate:lesson-catalog");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS validate:lesson-catalog — catálogo publicado aceito (${parsedShipped.capsules.length} cápsula(s)) ` +
        `e ${rejects.length} manifestos inválidos recusados com o motivo certo.`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
