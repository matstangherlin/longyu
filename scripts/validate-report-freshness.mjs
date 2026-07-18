/**
 * validate:report-freshness
 *
 * Recusa relatório de qualidade velho, não regenerado ou editado à mão.
 * Roda no FIM da cadeia validate:beta (depois de todos os geradores), então
 * numa cadeia saudável os relatórios acabaram de ser escritos.
 *
 * Falha se, para qualquer relatório:
 * - o arquivo não existe ou não tem bloco de procedência (não foi regenerado);
 * - o hash de integridade não bate com o corpo (edição manual);
 * - o hash da Jornada difere do currículo atual (não regenerado após mudança);
 * - a data é anterior ao commit atual E o commit registrado não é o HEAD
 *   (relatório de uma rodada antiga).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  headCommitDate,
  currentCommitSha,
  journeyFingerprint,
  readProvenanceField,
  reportBodyDigest,
  splitReportIntegrity,
} from "./lib/report-meta.mjs";

const rootDir = process.cwd();
const REPORTS = [
  "reports/exercise-depth-report.md",
  "reports/image-coverage-report.md",
  "reports/visual-consistency-report.md",
  "reports/conversation-coverage-report.md",
  "reports/lesson-novelty-report.md",
];

// Tolerância para o fluxo normal "regenera → commita": um relatório gerado
// pouco antes do commit que o inclui continua válido.
const COMMIT_TOLERANCE_MS = 60 * 60 * 1000;

const errors = [];
const err = (ref, message) => errors.push(`[${ref}] ${message}`);

const expectedFingerprint = journeyFingerprint(rootDir);
const headSha = currentCommitSha(rootDir);
const commitDate = headCommitDate(rootDir);

for (const rel of REPORTS) {
  const filePath = path.join(rootDir, rel);
  let content;
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    err(rel, "relatório ausente — rode os validadores para regenerá-lo.");
    continue;
  }

  const { body, digest } = splitReportIntegrity(content);
  if (!body || !digest) {
    err(rel, "sem hash de integridade — relatório de formato antigo ou truncado; regenere.");
    continue;
  }
  if (reportBodyDigest(body) !== digest) {
    err(rel, "hash de integridade não confere — relatório editado manualmente; regenere em vez de editar.");
    continue;
  }

  const fingerprint = readProvenanceField(content, "Hash da Jornada");
  const generatedAt = readProvenanceField(content, "Gerado em");
  const commit = readProvenanceField(content, "Commit");
  const lessons = readProvenanceField(content, "Lições");
  if (!fingerprint || !generatedAt || !commit || !lessons) {
    err(rel, "bloco de procedência incompleto (commit/data/lições/hash da Jornada) — regenere.");
    continue;
  }

  if (fingerprint !== expectedFingerprint) {
    err(
      rel,
      `não regenerado após mudança no currículo (hash da Jornada ${fingerprint} ≠ atual ${expectedFingerprint}).`
    );
    continue;
  }

  const reportDate = new Date(generatedAt);
  if (Number.isNaN(reportDate.getTime())) {
    err(rel, `data de geração inválida: "${generatedAt}".`);
    continue;
  }
  if (
    commitDate &&
    commit !== headSha &&
    reportDate.getTime() < commitDate.getTime() - COMMIT_TOLERANCE_MS
  ) {
    err(rel, `anterior ao commit atual (gerado em ${generatedAt}, commit de ${commitDate.toISOString()}).`);
  }
}

if (errors.length > 0) {
  console.error(`validate:report-freshness falhou com ${errors.length} problema(s):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(
    `OK: validate:report-freshness passou (${REPORTS.length} relatórios · Jornada ${expectedFingerprint} · commit ${headSha.slice(0, 10)}).`
  );
}
