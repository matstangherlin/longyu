#!/usr/bin/env node
/**
 * validate:rc15-freeze — P20, P21.
 *
 * A RC1.5 mexe em copy, telemetria e gates. Não mexe em currículo. O
 * fingerprint da jornada é o juiz: se ele mudou, alguém tocou no conteúdo
 * enquanto arrumava a verdade do produto, e a remessa deixa de ser auditável.
 */
import fs from "node:fs";
import path from "node:path";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { countCurriculum } from "./lib/rc1-1-gates.mjs";
import { validateRc15Freeze, RC15_FREEZE } from "./lib/rc1-5-gates.mjs";

const root = process.cwd();

/** Escopo que esta remessa explicitamente não abre. */
const OUT_OF_SCOPE = [
  "src/features/business/GroupsPage.tsx",
  "src/features/business/ProgramsPage.tsx",
  "src/features/business/ReportsPage.tsx",
  "src/features/fala/AiRoleplayPage.tsx",
  "src/lib/toneAnalyzer.ts",
  "src/lib/pronunciationScore.ts",
];

const fingerprint = journeyFingerprint(root);
const counts = countCurriculum();
const { failures } = validateRc15Freeze({
  fingerprint,
  counts,
  forbiddenPaths: OUT_OF_SCOPE.filter((rel) => fs.existsSync(path.join(root, rel))),
});

if (failures.length > 0) {
  console.error(`validate:rc15-freeze falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

console.log(
  `PASS validate:rc15-freeze — fingerprint ${fingerprint} · ${counts.lessons} lições · ${counts.teachingTopics} temas (esperado ${RC15_FREEZE.fingerprint})`
);
