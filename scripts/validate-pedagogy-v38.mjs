/**
 * Pedagogia V3.8 — word layer, families, communicative ready, China Survival V2,
 * conversation progression, productive core v38.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();

const V38_SCENES = [
  { id: "falar-de-estudo", domain: "study", lessonId: "l11-falo-pouco" },
  { id: "rotina-e-trabalho", domain: "work/routine", lessonId: "p6-rotina-trabalho" },
  { id: "que-horas-sao", domain: "time", lessonId: "p6-horarios" },
  { id: "nao-me-sinto-bem", domain: "health", lessonId: "p6-saude" },
  { id: "como-esta-o-tempo", domain: "weather", lessonId: "p6-clima" },
  { id: "checkin-hotel", domain: "hotel", lessonId: "p6-survival-mandarin" },
  { id: "no-aeroporto", domain: "airport", lessonId: "p6-china-cidades-2" },
  { id: "pegar-taxi", domain: "taxi", lessonId: "p6-china-ruas" },
];

async function compile() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v38-"));
  const program = ts.createProgram(
    [
      "src/data/lexicalRegistry.ts",
      "src/data/wordLayer.ts",
      "src/data/vocabulary.ts",
      "src/data/productiveCore.ts",
      "src/data/slotPatterns.ts",
      "src/data/conversationCapabilities.ts",
      "src/data/conversationScenes.ts",
      "src/data/lexicalLifecycleEntries.ts",
      "src/data/chunks.ts",
      "src/data/journey.ts",
      "src/data/lexicalRoadmap.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    await rm(outDir, { recursive: true, force: true });
    throw new Error("validate-pedagogy-v38: compile failed");
  }
  return { outDir, load: (rel) => require(path.join(outDir, rel)) };
}

function cjk(text) {
  return [...String(text ?? "")].filter((ch) => /[\u4e00-\u9fff]/.test(ch)).join("");
}

async function main() {
  const { outDir, load } = await compile();
  const errors = [];
  try {
    const { buildLexicalRegistry, metricsFromRegistry, mapCommon5000ToAtlas } = load(
      "src/data/lexicalRegistry.js"
    );
    const { WORD_FAMILIES, WORD_LAYER_MIN, WORD_FAMILY_MIN } = load("src/data/wordLayer.js");
    const { VOCABULARY } = load("src/data/vocabulary.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const {
      PRODUCTIVE_CORE,
      RECEPTIVE_CORE,
      PRODUCTIVE_CORE_TARGET,
      RECEPTIVE_CORE_TARGET,
      productiveCoreStats,
      buildCombinabilitySnapshot,
    } = load("src/data/productiveCore.js");
    const { SLOT_PATTERNS } = load("src/data/slotPatterns.js");
    const {
      CONVERSATION_CAPABILITIES,
      capabilityCoverage,
      evaluateChinaSurvivalV2,
      chinaSurvivalV2Totals,
      CHINA_SURVIVAL_SCENARIOS,
    } = load("src/data/conversationCapabilities.js");
    const { CONVERSATION_SCENES } = load("src/data/conversationScenes.js");
    const { LEXICAL_LIFECYCLE_V37_EXTRA } = load("src/data/lexicalLifecycleEntries.js");
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { LESSONS_51_100_ROADMAP } = load("src/data/lexicalRoadmap.js");

    const units = buildLexicalRegistry();
    const metrics = metricsFromRegistry(units);
    const vocabWords = VOCABULARY.filter((v) => v.kind === "word");
    const uniqueWordHanzi = new Set(vocabWords.map((v) => v.hanzi));
    const registryWords = units.filter((u) => u.type === "word");
    const isolatedWordInflation = registryWords.filter((u) => cjk(u.hanzi).length <= 1).length;

    if (registryWords.length < WORD_LAYER_MIN) {
      errors.push(`WORD-002: registry words ${registryWords.length} < ${WORD_LAYER_MIN}`);
    }
    const realWords = registryWords.filter((u) => cjk(u.hanzi).length >= 2);
    if (realWords.length < WORD_LAYER_MIN) {
      errors.push(`WORD-002: multi-char words ${realWords.length} < ${WORD_LAYER_MIN} (do not inflate with isolated characters)`);
    }
    if (WORD_FAMILIES.length < WORD_FAMILY_MIN) {
      errors.push(`WORD-003: families ${WORD_FAMILIES.length} < ${WORD_FAMILY_MIN}`);
    }
    const chunkHanzi = CHUNKS.map((c) => c.hanzi);
    for (const family of WORD_FAMILIES) {
      if (!family.rootChar || family.words.length < 2) {
        errors.push(`family ${family.rootChar} too small`);
      }
      for (const word of family.words) {
        const inVocab = VOCABULARY.some((v) => v.hanzi === word || v.hanzi.replace(/[？?！!。]/g, "") === word);
        const inChunk = chunkHanzi.some((h) => h.includes(word));
        if (!inVocab && !inChunk) {
          errors.push(`family ${family.rootChar}: word ${word} missing from vocab/chunks`);
        }
      }
    }

    const available = new Set([
      ...CHUNKS.map((c) => `chunk:${c.id}`),
      ...LEXICAL_LIFECYCLE_V37_EXTRA.map((e) => e.ref),
    ]);
    const coverage = capabilityCoverage(available);
    const ready = coverage.filter((c) => c.computedStatus === "READY");
    if (ready.length < 29) {
      errors.push(`CAP: READY ${ready.length}/31 (need ≥29)`);
    }

    const survival = evaluateChinaSurvivalV2(available);
    const totals = chinaSurvivalV2Totals(survival);
    if (totals.lexicalReady < 9) {
      errors.push(`BENCH-022 lexicalReady ${totals.lexicalReady}/9`);
    }
    if (totals.communicativeReady < 8) {
      errors.push(`BENCH-022 communicativeReady ${totals.communicativeReady}/9 (need ≥8)`);
    }

    const sceneIds = new Set(CONVERSATION_SCENES.map((s) => s.sceneId));
    const lessonById = new Map(ALL_LESSONS.map((l) => [l.id, l]));
    for (const row of V38_SCENES) {
      if (!sceneIds.has(row.id)) errors.push(`missing scene ${row.id}`);
      const lesson = lessonById.get(row.lessonId);
      if (!lesson) {
        errors.push(`missing lesson ${row.lessonId}`);
        continue;
      }
      const used = (lesson.steps ?? []).some(
        (step) => step.kind === "conversation_scene" && step.sceneId === row.id
      );
      if (!used) errors.push(`${row.lessonId} does not wire scene ${row.id}`);
    }
    const multiIntent = CONVERSATION_SCENES.filter((s) =>
      ["restaurant-review", "checkin-hotel", "no-aeroporto", "pegar-taxi", "rotina-e-trabalho", "nao-me-sinto-bem"].includes(
        s.sceneId
      )
    );
    if (multiIntent.length < 5) {
      errors.push(`CONV-016: need multi-intent scenes beyond restaurant, got ${multiIntent.length}`);
    }
    const branched = CONVERSATION_SCENES.filter((s) =>
      (s.nodes ?? []).some((n) => n.interaction && n.interaction.wrongNextNodeId && n.interaction.options?.length === 2)
    );
    if (branched.length < 2) {
      errors.push(`CONV-018: need ≥2 scenes with two viable paths`);
    }

    const stats = productiveCoreStats();
    if (!stats.withinProductiveTarget) {
      errors.push(
        `PROD-023: PRODUCTIVE_CORE ${stats.total} outside ${PRODUCTIVE_CORE_TARGET.min}–${PRODUCTIVE_CORE_TARGET.max}`
      );
    }
    if (!stats.withinReceptiveTarget) {
      errors.push(
        `PROD-024: RECEPTIVE_CORE ${stats.receptiveTotal} outside ${RECEPTIVE_CORE_TARGET.min}–${RECEPTIVE_CORE_TARGET.max}`
      );
    }
    const isolatedInCore = PRODUCTIVE_CORE.filter((id) => id.startsWith("char:")).length;
    if (isolatedInCore > 0) errors.push(`productive core includes isolated chars: ${isolatedInCore}`);
    const combo = buildCombinabilitySnapshot();
    if (SLOT_PATTERNS.length < 30 || SLOT_PATTERNS.length > 45) {
      errors.push(`PROD-026: patterns ${SLOT_PATTERNS.length} outside 30–45`);
    }
    if (combo.possibleUsefulCombinations.length < 150) {
      errors.push(`possible combinations ${combo.possibleUsefulCombinations.length} < 150`);
    }
    if (combo.practicedCombinations.length < 100) {
      errors.push(`practiced combinations ${combo.practicedCombinations.length} < 100`);
    }

    const mapping = mapCommon5000ToAtlas(units);
    const top500 = mapping.slice(0, 500);
    const top500WithWords = top500.filter((r) => (r.wordsUsingCharacter ?? []).length > 0).length;

    const docs = path.join(root, "docs/reports");
    await mkdir(docs, { recursive: true });

    await writeFile(
      path.join(docs, "word-layer.md"),
      [
        "# Word layer (V3.8)",
        "",
        "Generated by `npm run validate:word-layer`.",
        "",
        "| Metric | Value | Target |",
        "| --- | ---: | --- |",
        `| Registry words | ${registryWords.length} | ≥${WORD_LAYER_MIN} |`,
        `| Multi-char words | ${realWords.length} | ≥${WORD_LAYER_MIN} |`,
        `| Unique vocab word hanzi | ${uniqueWordHanzi.size} | — |`,
        `| Isolated 1-char word units | ${isolatedWordInflation} | (chunks of 1 char still typed as word) |`,
        `| Word families | ${WORD_FAMILIES.length} | ≥${WORD_FAMILY_MIN} |`,
        `| Registry characters | ${metrics.uniqueCharacters} | — |`,
        `| Registry chunks | ${metrics.uniqueChunks} | — |`,
        "",
        "## Families",
        "",
        "| Root | Words | Domain | Priority |",
        "| --- | --- | --- | ---: |",
        ...WORD_FAMILIES.map(
          (f) => `| ${f.rootChar} | ${f.words.join("、")} | ${f.domain} | ${f.productivePriority} |`
        ),
        "",
        "Growth is words → chunks → patterns → conversation, not isolated Hànzì dumps.",
        "",
      ].join("\n"),
      "utf8"
    );

    await writeFile(
      path.join(docs, "top-500-character-utility.md"),
      [
        "# Top 500 character utility (ATLAS-028)",
        "",
        "Generated by `npm run validate:word-layer`. Audit of the 500 most frequent corpus characters.",
        "",
        `| With useful words | ${top500WithWords}/500 |`,
        `| In Journey chunks | ${top500.filter((r) => (r.chunksUsingCharacter ?? []).length > 0).length}/500 |`,
        `| Productive-tier | ${top500.filter((r) => r.productive).length}/500 |`,
        `| Atlas reference / future | ${top500.filter((r) => r.future).length}/500 |`,
        "",
        "| Rank | Char | Words | Chunks | Journey | Role |",
        "| ---: | --- | --- | --- | --- | --- |",
        ...top500.slice(0, 80).map((r) => {
          const role = r.productive ? "productive" : r.receptive ? "receptive" : "reference";
          return `| ${r.frequencyRank} | ${r.character} | ${(r.wordsUsingCharacter ?? []).join("、") || "—"} | ${(r.chunksUsingCharacter ?? []).length} | ${r.usedInJourney ? "yes" : "no"} | ${role} |`;
        }),
        "",
        "Remaining 4,609 Atlas Reference characters stay as long-term reservoir (ATLAS-029).",
        "",
      ].join("\n"),
      "utf8"
    );

    await writeFile(
      path.join(docs, "capability-gap-v38.md"),
      [
        "# Capability gap V3.8",
        "",
        "Generated by `npm run validate:communicative-ready`.",
        "",
        `READY **${ready.length}/31**.`,
        "",
        "| Capability | Status | Score | Conv | Prod | Missing |",
        "| --- | --- | ---: | --- | --- | --- |",
        ...coverage.map(
          (row) =>
            `| ${row.id} | ${row.computedStatus} | ${row.scores.readinessScore.toFixed(2)} | ${row.hasConversation ? "yes" : "no"} | ${row.hasProductivePractice ? "yes" : "no"} | ${row.missingRefs.join(", ") || "—"} |`
        ),
        "",
      ].join("\n"),
      "utf8"
    );

    await writeFile(
      path.join(docs, "china-survival-v2.md"),
      [
        "# China Survival benchmark V2 (BENCH-020/021)",
        "",
        "Generated by `npm run validate:china-survival-v2`.",
        "",
        "`lexicalReady` = required refs taught. `communicativeReady` = refs + structures + productive + conversation + transfer (capability READY).",
        "",
        `| lexicalReady | **${totals.lexicalReady}/${totals.total}** |`,
        `| communicativeReady | **${totals.communicativeReady}/${totals.total}** |`,
        "",
        "| Scenario | lexicalReady | communicativeReady | Missing communicative | Untaught refs |",
        "| --- | --- | --- | --- | --- |",
        ...survival.map(
          (row) =>
            `| ${row.scenario} | ${row.lexicalReady ? "yes" : "no"} | ${row.communicativeReady ? "yes" : "no"} | ${row.missingCommunicative.join(", ") || "—"} | ${row.untaughtRefs.join(", ") || "—"} |`
        ),
        "",
      ].join("\n"),
      "utf8"
    );

    await writeFile(
      path.join(docs, "communicative-conversation-coverage.md"),
      [
        "# Communicative conversation coverage (V3.8)",
        "",
        "Generated by `npm run validate:conversation-progression`.",
        "",
        "| Domain | Scene | Real lessonId | Stage |",
        "| --- | --- | --- | --- |",
        ...V38_SCENES.map((row) => {
          const scene = CONVERSATION_SCENES.find((s) => s.sceneId === row.id);
          const lines = scene?.lines?.length ?? 0;
          const stage = lines <= 6 ? "B (4–6)" : "C (6–10)";
          return `| ${row.domain} | ${row.id} | ${row.lessonId} | ${stage}, ${lines} turns |`;
        }),
        "",
        "Restaurant multi-intent remains `revisao-restaurante`. Hotel/taxi scenes offer two viable first replies (CONV-018).",
        "",
      ].join("\n"),
      "utf8"
    );

    await writeFile(
      path.join(docs, "productive-core-v38.md"),
      [
        "# Productive core V3.8",
        "",
        "Generated by `npm run validate:productive-core-v38`.",
        "",
        "| Metric | Value | Target |",
        "| --- | ---: | --- |",
        `| PRODUCTIVE_CORE | ${stats.total} | ${PRODUCTIVE_CORE_TARGET.min}–${PRODUCTIVE_CORE_TARGET.max} |`,
        `| — chunks | ${stats.chunks} | — |`,
        `| — words | ${stats.words ?? 0} | — |`,
        `| — patterns | ${stats.patterns} | 30–40 |`,
        `| — combos | ${stats.combos} | — |`,
        `| RECEPTIVE_CORE | ${stats.receptiveTotal} | ${RECEPTIVE_CORE_TARGET.min}–${RECEPTIVE_CORE_TARGET.max} |`,
        `| Slot patterns | ${SLOT_PATTERNS.length} | 30–40 |`,
        `| possibleUsefulCombinations | ${combo.possibleUsefulCombinations.length} | ≥150 |`,
        `| practicedCombinations | ${combo.practicedCombinations.length} | ≥100 |`,
        "",
        "Productive units are words / chunks / patterns — not unused isolated characters.",
        "",
      ].join("\n"),
      "utf8"
    );

    const expansionRows = V38_SCENES.map((row) => {
      const lesson = lessonById.get(row.lessonId);
      const scene = CONVERSATION_SCENES.find((s) => s.sceneId === row.id);
      return `| ${row.lessonId} | ${lesson?.title ?? "?"} | ${row.id} | ${(scene?.learnedRefs ?? []).filter((r) => r.startsWith("chunk:")).slice(0, 6).join(", ")} | ${row.domain} |`;
    });

    await writeFile(
      path.join(docs, "journey-communicative-expansion-v38.md"),
      [
        "# Journey communicative expansion V3.8",
        "",
        "Maps the 51–100 roadmap onto **real lesson IDs** (labs/reviews included; no fictional L51–L100).",
        "",
        "Generated by `npm run validate:conversation-progression`.",
        "",
        "## Roadmap bands → existing lessons",
        "",
        ...(LESSONS_51_100_ROADMAP ?? []).map((band) => {
          const ids = (band.conversationGoals ?? []).join(", ");
          return `- **${band.lessonRange}** (${band.focusPackets.join("/")}): capabilities ${ids}`;
        }),
        "",
        "## Implemented this wave (real IDs)",
        "",
        "| lessonId | Title | Scene | New chunks (sample) | Capabilities |",
        "| --- | --- | --- | --- | --- |",
        ...expansionRows,
        "",
        "Transfer: each closed capability lists a second situation (classroom, office, appointment, taxi, arrival, check-in, clinic, Beijing/Shanghai weather).",
        "",
      ].join("\n"),
      "utf8"
    );

    if (errors.length) {
      for (const e of errors) console.error(`FAIL: ${e}`);
      process.exitCode = 1;
    } else {
      console.log(
        `OK V3.8 words=${registryWords.length} productive=${stats.total} receptive=${stats.receptiveTotal} ready=${ready.length}/31 survivalV2=${totals.communicativeReady}/9`
      );
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
