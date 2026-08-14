/**
 * validate:atlas-utilization — LEX-001 / LEX-002 / LEX-023
 * Inventário Atlas × Jornada + classificação taught/scheduled/future.
 * Escreve docs/reports/atlas-curriculum-utilization.md
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const reportPath = path.join(root, "docs/reports/atlas-curriculum-utilization.md");

async function compileAndLoad() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-atlas-util-"));
  const program = ts.createProgram(
    [
      "src/data/atlasCurriculum.ts",
      "src/data/lexicalProgression.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/journey.ts",
      "src/data/conversationScenes.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    await rm(outDir, { recursive: true, force: true });
    throw new Error("validate:atlas-utilization: compile failed");
  }
  return {
    outDir,
    load: (rel) => require(path.join(outDir, rel)),
  };
}

function refFromHanzi(hanzi, chunks, characters) {
  const chunk = chunks.find((c) => c.hanzi === hanzi || c.hanzi.replace(/[？?！!。]/g, "") === hanzi);
  if (chunk) return `chunk:${chunk.id}`;
  const ch = characters.find((c) => c.hanzi === hanzi);
  if (ch) return `char:${ch.id}`;
  return null;
}

async function main() {
  const { outDir, load } = await compileAndLoad();
  try {
    const {
      atlasItemRefs,
      classifyAtlasItem,
      lessonExplicitLexemes,
      LEXICAL_LIFECYCLE,
      VOCABULARY_PACKETS,
      hanziForRef,
      lexicalLifecycleByRef,
    } = load("src/data/atlasCurriculum.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { CONVERSATION_SCENES } = load("src/data/conversationScenes.js");

    const refs = atlasItemRefs();
    const taughtRefs = new Set();
    const scheduledRefs = new Set(LEXICAL_LIFECYCLE.map((e) => e.ref));
    const firstLessonByRef = new Map();
    const totalUsesByRef = new Map();
    const productiveUsesByRef = new Map();
    const conversationUsesByRef = new Map();

    for (const lesson of ALL_LESSONS) {
      const lexemes = lessonExplicitLexemes(lesson);
      for (const token of lexemes) {
        const ref = refFromHanzi(token, CHUNKS, CHARACTERS);
        if (!ref) continue;
        taughtRefs.add(ref);
        if (!firstLessonByRef.has(ref)) firstLessonByRef.set(ref, lesson.id);
        totalUsesByRef.set(ref, (totalUsesByRef.get(ref) ?? 0) + 1);
        const productiveKinds = new Set([
          "sentence_build",
          "produce",
          "dialogue_choice",
          "fill_blank",
          "translation_build",
          "write",
          "conversation_scene",
        ]);
        const productiveHit = (lesson.steps ?? []).some((step) => {
          if (!productiveKinds.has(step.kind)) return false;
          const blob = JSON.stringify(step);
          return blob.includes(token);
        });
        if (productiveHit) {
          productiveUsesByRef.set(ref, (productiveUsesByRef.get(ref) ?? 0) + 1);
        }
      }
      for (const ref of lesson.libraryItems ?? []) {
        taughtRefs.add(ref);
        if (!firstLessonByRef.has(ref)) firstLessonByRef.set(ref, lesson.id);
        totalUsesByRef.set(ref, (totalUsesByRef.get(ref) ?? 0) + 1);
      }
    }

    for (const scene of CONVERSATION_SCENES) {
      for (const ref of [...(scene.learnedRefs ?? []), ...(scene.newRefs ?? [])]) {
        conversationUsesByRef.set(ref, (conversationUsesByRef.get(ref) ?? 0) + 1);
      }
    }

    const rows = refs.map((ref) => {
      const chunk = ref.startsWith("chunk:")
        ? CHUNKS.find((c) => c.id === ref.slice(6))
        : null;
      const character = ref.startsWith("char:")
        ? CHARACTERS.find((c) => c.id === ref.slice(5))
        : null;
      const status = classifyAtlasItem(ref, taughtRefs, scheduledRefs);
      return {
        ref,
        hanzi: chunk?.hanzi ?? character?.hanzi ?? hanziForRef(ref),
        pinyin: chunk?.pinyin ?? character?.pinyin ?? "",
        meaning: chunk?.meaningPt ?? character?.meaningPt ?? "",
        domain: chunk?.domain ?? character?.domain ?? "",
        level: chunk?.level ?? character?.level ?? "",
        status,
        usedInJourney: taughtRefs.has(ref),
        firstLesson: firstLessonByRef.get(ref) ?? lexicalLifecycleByRef[ref]?.introduceAt ?? null,
        totalLessonUses: totalUsesByRef.get(ref) ?? 0,
        productiveUses: productiveUsesByRef.get(ref) ?? 0,
        conversationUses: conversationUsesByRef.get(ref) ?? 0,
      };
    });

    const taught = rows.filter((r) => r.status === "taught");
    const scheduled = rows.filter((r) => r.status === "scheduled");
    const future = rows.filter((r) => r.status === "future");
    const orphans = future.filter((r) => !r.usedInJourney);
    const utilizationPct = refs.length ? (taught.length / refs.length) * 100 : 0;

    const lines = [
      "# Atlas curriculum utilization",
      "",
      "Generated by `npm run validate:atlas-utilization` (Pedagogia V3.6 — LEX-001/002/023).",
      "",
      "## Summary",
      "",
      `| Metric | Value |`,
      `| --- | ---: |`,
      `| Atlas items (chunks+chars) | ${refs.length} |`,
      `| Taught in Journey | ${taught.length} |`,
      `| Scheduled (lifecycle bridge) | ${scheduled.length} |`,
      `| Future / untouched | ${future.length} |`,
      `| Utilization (taught / atlas) | ${utilizationPct.toFixed(1)}% |`,
      `| Vocabulary packets | ${VOCABULARY_PACKETS.length} |`,
      `| Lifecycle bridge entries | ${LEXICAL_LIFECYCLE.length} |`,
      "",
      "## Orphans (Atlas present, never taught)",
      "",
      `| ref | hanzi | meaning | domain | level |`,
      `| --- | --- | --- | --- | --- |`,
    ];

    for (const row of orphans.slice(0, 80)) {
      lines.push(
        `| ${row.ref} | ${row.hanzi} | ${row.meaning.replace(/\|/g, "/")} | ${row.domain} | ${row.level} |`
      );
    }
    if (orphans.length > 80) lines.push(`| … | ${orphans.length - 80} more | | | |`);

    lines.push("", "## Lifecycle bridge (scheduled activation)", "");
    lines.push("| ref | introduceAt | reinforceAt | productiveAt | packet |", "| --- | --- | --- | --- | --- |");
    for (const entry of LEXICAL_LIFECYCLE) {
      lines.push(
        `| ${entry.ref} | ${entry.introduceAt} | ${(entry.reinforceAt ?? []).join(", ") || "—"} | ${entry.productiveAt ?? "—"} | ${entry.packet ?? "—"} |`
      );
    }

    lines.push("", "## Taught inventory (sample first 60)", "");
    lines.push(
      "| item | hanzi | meaning | domain | firstLesson | totalLessonUses | productiveUses | conversationUses |",
      "| --- | --- | --- | --- | --- | ---: | ---: | ---: |"
    );
    for (const row of taught.slice(0, 60)) {
      lines.push(
        `| ${row.ref} | ${row.hanzi} | ${row.meaning.replace(/\|/g, "/")} | ${row.domain} | ${row.firstLesson ?? "—"} | ${row.totalLessonUses} | ${row.productiveUses} | ${row.conversationUses} |`
      );
    }

    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, lines.join("\n") + "\n", "utf8");
    console.log(`Wrote ${reportPath}`);
    console.log(
      `Atlas utilization: ${taught.length}/${refs.length} taught (${utilizationPct.toFixed(1)}%); orphans=${orphans.length}`
    );

    // Soft floor: V3.6 must activate a meaningful share of beginner chunks.
    if (utilizationPct < 12) {
      console.error(`FAIL: Atlas utilization ${utilizationPct.toFixed(1)}% < 12% floor`);
      process.exitCode = 1;
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
