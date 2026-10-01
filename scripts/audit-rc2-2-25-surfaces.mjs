#!/usr/bin/env node
/**
 * RC2.2.25 — inventário de superfícies do aluno + auditoria das 134 aulas
 * (Pro incluído, sem amostragem) contra o GUIDED_EXPERIENCE_GOLD_STANDARD.
 *
 * Gera docs/release/rc2-2-25-surface-inventory.json e confere com `--check`.
 * Cada StepKind usado no plano real (todas as aulas × passes 0–3) é
 * classificado GUIDED_NATIVE / GUIDED_COMPATIBLE / LEGACY_PRESENTATION — a
 * meta é LEGACY = 0. Densidade, viewport e aceite visual NÃO são inventados
 * aqui: densidade vem do E2E (e2e/rc2-2-25-product-experience-closure.spec.ts),
 * aceite visual é do owner (SIM/NÃO) e físico segue NOT_RUN até o aparelho.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/release/rc2-2-25-surface-inventory.json");
const PASSES = [0, 1, 2, 3];

async function load() {
  const result = await build({
    stdin: {
      contents: [
        'export * as journey from "./src/data/journey.ts";',
        'export * as tasks from "./src/features/lesson/lessonTasks.ts";',
        'export * as gold from "./src/lib/productGoldStandard.ts";',
      ].join("\n"),
      resolveDir: ROOT,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    jsx: "automatic",
    define: { "import.meta.env": '{"DEV":false}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2225-surfaces-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Superfícies de HUB/conta (não são atividade, mas entram no inventário). */
const HUB_SURFACES = [
  { id: "JORNADA", route: "/jornada", mode: "HUB" },
  { id: "MAIS", route: "/mais", mode: "HUB" },
  { id: "PERFIL", route: "/perfil", mode: "HUB" },
  { id: "CONTA", route: "/conta", mode: "HUB" },
  { id: "APARENCIA", route: "/config/aparencia", mode: "HUB" },
  { id: "DADOS_BACKUP", route: "/dados-locais", mode: "HUB" },
  { id: "LANDING_LOGIN", route: "/", mode: "HUB" },
];

export async function buildInventory() {
  const { journey, tasks, gold } = await load();
  const lessons = journey.ALL_LESSONS;
  const kinds = new Map();
  const lessonRows = [];
  let planned = 0;
  for (const lesson of lessons) {
    const lessonKinds = new Set();
    for (const masteryLevel of PASSES) {
      let plan = [];
      try {
        plan = tasks.lessonRoundStepsFor(lesson, { masteryLevel, silent: true });
      } catch {
        plan = lesson.steps ?? [];
      }
      planned += 1;
      for (const step of plan) {
        lessonKinds.add(step.kind);
        const row = kinds.get(step.kind) ?? { kind: step.kind, occurrences: 0, lessons: new Set(), premiumLessons: new Set() };
        row.occurrences += 1;
        row.lessons.add(lesson.id);
        if (lesson.premium) row.premiumLessons.add(lesson.id);
        kinds.set(step.kind, row);
      }
    }
    const classes = [...lessonKinds].map((kind) => gold.guidedStepClass(kind));
    lessonRows.push({
      lessonId: lesson.id,
      premium: Boolean(lesson.premium),
      stepKinds: lessonKinds.size,
      legacySteps: classes.filter((value) => value === "LEGACY_PRESENTATION").length,
      guidedClass: classes.includes("LEGACY_PRESENTATION") ? "LEGACY_PRESENTATION" : classes.every((value) => value === "GUIDED_NATIVE") ? "GUIDED_NATIVE" : "GUIDED_COMPATIBLE",
    });
  }
  const kindRows = [...kinds.values()]
    .map((row) => ({
      kind: row.kind,
      guidedClass: gold.guidedStepClass(row.kind),
      occurrences: row.occurrences,
      lessons: row.lessons.size,
      premiumLessons: row.premiumLessons.size,
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
  const count = (value) => kindRows.filter((row) => row.guidedClass === value).length;
  const surfaces = [
    ...gold.ACTIVITY_SURFACES.map((surface) => ({
      id: surface.id,
      route: surface.route,
      mode: surface.focusVia === "NONE" ? "HUB" : "HUB+ACTIVITY",
      focusVia: surface.focusVia,
      activityMarker: surface.activityMarker,
      densityEvidence: surface.activityMarker ? "E2E_MEASURED" : "NOT_MEASURED",
      webState: "CODE_READY",
      apkState: "NOT_RUN",
      ownerAccepted: null,
    })),
    ...HUB_SURFACES.map((surface) => ({ ...surface, focusVia: "NONE", activityMarker: null, densityEvidence: "NOT_MEASURED", webState: "CODE_READY", apkState: "NOT_RUN", ownerAccepted: null })),
  ];
  return {
    schema: "longyu-rc2-2-25-surface-inventory/1",
    note: "Gerado do código e do plano real. CODE_READY ≠ WEB_PASS ≠ APK_PASS ≠ OWNER_ACCEPTED; ownerAccepted fica null até o SIM/NÃO do owner.",
    goldStandard: gold.GUIDED_EXPERIENCE_GOLD_STANDARD.map((trait) => trait.id),
    totals: {
      lessons: lessons.length,
      premiumLessons: lessons.filter((lesson) => lesson.premium).length,
      plansBuilt: planned,
      stepKinds: kindRows.length,
      guidedNative: count("GUIDED_NATIVE"),
      guidedCompatible: count("GUIDED_COMPATIBLE"),
      legacyPresentation: count("LEGACY_PRESENTATION"),
      lessonsWithLegacy: lessonRows.filter((row) => row.legacySteps > 0).length,
      surfaces: surfaces.length,
    },
    surfaces,
    stepKinds: kindRows,
    lessons: lessonRows,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inventory = await buildInventory();
  const text = `${JSON.stringify(inventory, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (current !== text) {
      console.error("FAIL audit:rc2-2-25-surfaces — inventário desatualizado (rode sem --check)");
      process.exit(1);
    }
    if (inventory.totals.legacyPresentation > 0) {
      console.error(`FAIL audit:rc2-2-25-surfaces — ${inventory.totals.legacyPresentation} StepKind(s) LEGACY_PRESENTATION`);
      process.exit(1);
    }
    console.log(`PASS audit:rc2-2-25-surfaces (${inventory.totals.lessons} aulas, ${inventory.totals.stepKinds} StepKinds, LEGACY=${inventory.totals.legacyPresentation})`);
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(ROOT, OUT)}`, JSON.stringify(inventory.totals));
  }
}
