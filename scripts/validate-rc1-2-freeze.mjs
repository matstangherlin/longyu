#!/usr/bin/env node
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { countCurriculum } from "./lib/rc1-1-gates.mjs";
import { validateRc12Freeze } from "./lib/rc1-2-gates.mjs";

const fingerprint = journeyFingerprint(process.cwd());
const counts = countCurriculum();
const { failures } = validateRc12Freeze({ fingerprint, counts });

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `PASS validate:rc1-2-freeze — fingerprint ${fingerprint} · ${counts.lessons} lições · ${counts.teachingTopics} temas`
  );
}
