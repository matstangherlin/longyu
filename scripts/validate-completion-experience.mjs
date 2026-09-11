#!/usr/bin/env node
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { validateCompletionExperience, writeUnifiedLessonUxReport } from "./lib/v498b2-gates.mjs";

const { failures } = validateCompletionExperience();
const runtime = loadCultureRuntime();
const out = writeUnifiedLessonUxReport(process.cwd(), {
  lessonCount: runtime.lessons.length,
  fingerprint: journeyFingerprint(process.cwd()),
  baseSha: "ddc08aa57a7dad11a1033b3611e63618fd786a57",
});
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:completion-experience (${out})`);
}
