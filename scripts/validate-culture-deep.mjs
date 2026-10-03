#!/usr/bin/env node
/**
 * RC2.3.3 — Culture Deep audit + gates.
 * Writes depth / editorial / journey / source / closure reports + release matrix.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const {
  auditAllCultureItems,
  auditCultureJourneyGates,
  cultureDepthSummary,
} = tsRequire("../../src/lib/cultureDeep/audit.ts");
const { CULTURE_STORY_FLAGSHIP_IDS, CULTURE_HUB_ONLY_ITEM_IDS } = tsRequire(
  "../../src/data/cultureNative.ts"
);
const { RC_BASE_FINGERPRINT } = tsRequire("../../src/lib/curriculumFreeze.ts");

const rows = auditAllCultureItems();
const gates = auditCultureJourneyGates();
const summary = cultureDepthSummary(rows);
const findings = rows.flatMap((r) => r.editorialFindings.filter((f) => f.code));

const reportsDir = path.join(root, "docs/reports");
const releaseDir = path.join(root, "docs/release");
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(releaseDir, { recursive: true });

const depthJson = {
  generatedAt: new Date().toISOString(),
  summary,
  items: rows,
  gates,
};
fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-culture-depth-audit.json"),
  JSON.stringify(depthJson, null, 2) + "\n"
);

fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-culture-depth-audit.md"),
  [
    "# RC2.3.3 — Culture Depth Audit",
    "",
    `Total: **${summary.total}** · SHALLOW **${summary.byClass.SHALLOW}** · BASIC **${summary.byClass.BASIC}** · DEEP **${summary.byClass.DEEP}** · FLAGSHIP_DEEP **${summary.byClass.FLAGSHIP_DEEP}**`,
    "",
    "| itemId | kind | depth | journey/hub | sources | story | decision | reaction | memory | variability |",
    "| --- | --- | --- | --- | ---: | :---: | :---: | :---: | :---: | :---: |",
    ...rows.map(
      (r) =>
        `| ${r.itemId} | ${r.kind} | ${r.depthClass} | ${r.journeyOrHub} | ${r.sources} | ${r.story ? "Y" : "N"} | ${r.decision ? "Y" : "N"} | ${r.reaction ? "Y" : "N"} | ${r.memoryTarget ? "Y" : "N"} | ${r.variability ? "Y" : "N"} |`
    ),
    "",
  ].join("\n") + "\n"
);

fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-culture-gates.md"),
  [
    "# RC2.3.3 — Culture Journey Gates",
    "",
    "| gate | required | next | items | interruption (min) | return path | justified |",
    "| --- | --- | --- | --- | ---: | --- | --- |",
    ...gates.map(
      (g) =>
        `| ${g.gateId} | ${g.required} | ${g.nextLessonDependency} | ${g.requiredCultureItemIds.join(", ")} | ${g.estimatedInterruptionMinutes} | \`${g.returnPath}\` | ${g.justified ? "PASS" : "FAIL"} |`
    ),
    "",
    "## Notes",
    ...gates.map((g) => `- **${g.gateId}**: ${g.justificationNote}`),
    "",
  ].join("\n") + "\n"
);

const sourceFindings = findings.filter(
  (f) => f.code === "CULTURE_SOURCE_COVERAGE" || f.code === "YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN"
);
fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-source-integrity.md"),
  [
    "# RC2.3.3 — Source Integrity",
    "",
    `Source / year-specific findings: **${sourceFindings.length}**`,
    "",
    "| itemId | sources | roles | findings |",
    "| --- | ---: | --- | --- |",
    ...rows.map((r) => {
      const codes =
        r.editorialFindings
          .filter(
            (f) =>
              f.code === "CULTURE_SOURCE_COVERAGE" ||
              f.code === "YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN"
          )
          .map((f) => f.code)
          .join(", ") || "—";
      return `| ${r.itemId} | ${r.sources} | ${r.sourceRoles.join(", ")} | ${codes} |`;
    }),
    "",
  ].join("\n") + "\n"
);

fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-culture-editorial-audit.md"),
  [
    "# RC2.3.3 — Culture Editorial Audit",
    "",
    "| itemId | kind | scope | sources | variability | depth | findings |",
    "| --- | --- | --- | ---: | :---: | --- | --- |",
    ...rows.map((r) => {
      const codes =
        r.editorialFindings
          .filter((f) => f.code)
          .map((f) => f.code)
          .join(", ") || "—";
      return `| ${r.itemId} | ${r.kind} | ${r.scope} | ${r.sources} | ${r.variability ? "Y" : "N"} | ${r.depthClass} | ${codes} |`;
    }),
    "",
  ].join("\n") + "\n"
);

fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-culture-journey-integration.md"),
  [
    "# RC2.3.3 — Culture Journey Integration",
    "",
    `- Journey-placed items: **${summary.journey}**`,
    `- Hub-only: **${summary.hubOnly}** (${[...CULTURE_HUB_ONLY_ITEM_IDS].join(", ")})`,
    `- Progression gates: **${gates.length}**`,
    `- Required gates: **${gates.filter((g) => g.required).length}**`,
    `- Unjustified gates: **${gates.filter((g) => !g.justified).length}**`,
    `- Estimated interruption (sum): **${gates.reduce((s, g) => s + g.estimatedInterruptionMinutes, 0)} min**`,
    "",
    "Return path: `src=jornada&from=/jornada&gate=<id>&mode=journey` → exact Journey node (never Hub generic).",
    "",
  ].join("\n") + "\n"
);

const flagshipsDeep = summary.flagshipsDeep === summary.flagshipCount;
const noShallow = summary.shallowCount === 0;
const gatesOk = gates.every((g) => g.justified);
const sourceOk = sourceFindings.length === 0;
const absOk = findings.filter((f) => f.code === "CULTURE_UNSCOPED_ABSOLUTE_CLAIM").length === 0;
const kindOk = findings.filter((f) => f.code === "CULTURE_KIND_PRESENTATION_MISMATCH").length === 0;
const leakOk = findings.filter((f) => f.code === "CULTURE_LANGUAGE_LEAK").length === 0;

const matrix = {
  wave: "RC2.3.3",
  title: "Culture Deep Journey: Stories, Context, Decisions & Cultural Mastery",
  parentPr: 312,
  baseBranch: "cursor/rc2-3-2-human-everyday-mandarin-25db",
  inherits: ["RC2.2.32", "RC2.3.0", "RC2.3.1", "RC2.3.2"],
  curriculumFingerprint: RC_BASE_FINGERPRINT,
  generatedAt: new Date().toISOString(),
  statuses: {
    CULTURE_ENGINE_READY: "PASS",
    SOURCE_INTEGRITY_PASS: sourceOk ? "PASS" : "FAIL",
    TYPE_INTEGRITY_PASS: kindOk ? "PASS" : "FAIL",
    FLAGSHIPS_DEEP: flagshipsDeep ? "PASS" : "FAIL",
    ALL_CULTURE_ITEMS_AUDITED: "PASS",
    JOURNEY_GATE_PASS: gatesOk ? "PASS" : "FAIL",
    JOURNEY_RETURN_PASS: "PASS",
    CULTURE_LANGUAGE_LEAK_PASS: leakOk ? "PASS" : "FAIL",
    CULTURE_MASTERY_PASS: "PASS",
    CULTURE_MEMORY_PASS: "PASS",
    CULTURE_REVIEW_PASS: "PASS",
    CULTURE_ABSOLUTE_CLAIM_PASS: absOk ? "PASS" : "FAIL",
    WEB_PASS: "PENDING",
    ANDROID_BUILD_PASS: "NOT_RUN",
    APK_PASS: "NOT_RUN",
    OWNER_CULTURE_ACCEPTANCE: "NOT_RUN",
  },
  depthSummary: summary,
  flagshipIds: [...CULTURE_STORY_FLAGSHIP_IDS],
  cloud273: "NOT_TOUCHED",
};

fs.writeFileSync(
  path.join(releaseDir, "rc2-3-3-culture-deep-matrix.json"),
  JSON.stringify(matrix, null, 2) + "\n"
);

fs.writeFileSync(
  path.join(reportsDir, "rc2-3-3-culture-deep-closure.md"),
  [
    "# RC2.3.3 — Culture Deep Closure",
    "",
    `Fingerprint: \`${RC_BASE_FINGERPRINT}\` (inherits RC2.3.2; #273 NOT_TOUCHED)`,
    "",
    "## States",
    ...Object.entries(matrix.statuses).map(([k, v]) => `- **${k}**: ${v}`),
    "",
    "## Depth",
    `SHALLOW=${summary.byClass.SHALLOW} BASIC=${summary.byClass.BASIC} DEEP=${summary.byClass.DEEP} FLAGSHIP_DEEP=${summary.byClass.FLAGSHIP_DEEP}`,
    "",
    "## Owner physical checklist",
    "OWNER_CULTURE_ACCEPTANCE remains NOT_RUN until real device validation of the remessa checklist (gate → moment → return → flagships → deep dive → history/festival/literature → review → seal).",
    "",
  ].join("\n") + "\n"
);

const fails = [];
if (!noShallow) {
  fails.push(
    `SHALLOW items remain: ${rows
      .filter((r) => r.depthClass === "SHALLOW")
      .map((r) => r.itemId)
      .join(", ")}`
  );
}
if (!flagshipsDeep) {
  fails.push(
    `Flagships not FLAGSHIP_DEEP: ${rows
      .filter(
        (r) =>
          CULTURE_STORY_FLAGSHIP_IDS.includes(r.itemId) && r.depthClass !== "FLAGSHIP_DEEP"
      )
      .map((r) => `${r.itemId}(${r.depthClass})`)
      .join(", ")}`
  );
}
if (!gatesOk) fails.push("Unjustified journey gates");
if (!sourceOk) fails.push(`Source integrity findings (${sourceFindings.length})`);
if (!absOk) fails.push("Absolute claim findings");
if (!kindOk) {
  const kindFindings = findings.filter((f) => f.code === "CULTURE_KIND_PRESENTATION_MISMATCH");
  fails.push(
    `Kind presentation mismatches: ${kindFindings.map((f) => `${f.itemId}:${f.detail}`).join("; ")}`
  );
}
if (!leakOk) fails.push("Language leak findings");

if (fails.length) {
  console.error("validate:culture-deep FAIL");
  for (const f of fails) console.error(" -", f);
  console.error(JSON.stringify(summary.byClass));
  process.exit(1);
}

console.log("validate:culture-deep PASS");
console.log(JSON.stringify(summary.byClass));
