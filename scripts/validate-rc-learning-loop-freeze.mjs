#!/usr/bin/env node
/**
 * P23 — integridade do freeze RC1 nesta remessa.
 *
 * RC1.1 é bugfix + pedagogia de runtime + UX. Ela não pode mudar a identidade
 * do currículo: contagem de lições, de temas ou o fingerprint da Jornada. Se
 * mudar, o gate falha e a mudança tem de ser justificada, não descoberta
 * depois em produção.
 */
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { countCurriculum, validateRcLearningLoopFreeze } from "./lib/rc1-1-gates.mjs";

const fingerprint = journeyFingerprint(process.cwd());
const counts = countCurriculum();
const { failures } = validateRcLearningLoopFreeze({ fingerprint, counts });

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `PASS validate:rc-learning-loop-freeze — freeze RC1 · fingerprint ${fingerprint} · ${counts.lessons} lições · ${counts.teachingTopics} temas`
  );
}
