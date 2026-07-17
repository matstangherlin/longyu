/**
 * Procedência e integridade dos relatórios de qualidade.
 *
 * Cada relatório gerado (exercise-depth, image-coverage, conversation-coverage,
 * lesson-novelty) carrega um bloco de procedência (commit, versão do app, data,
 * nº de lições, hash resumido da Jornada) e termina com um hash de integridade
 * do próprio corpo. validate:report-freshness usa esses campos para recusar
 * relatório antigo, não regenerado ou editado manualmente.
 */

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Fontes que definem o currículo: mudou qualquer uma, o relatório é velho. */
export const CURRICULUM_SOURCES = [
  "src/data/journey.ts",
  "src/data/conversationScenes.ts",
  "src/data/visualVocabulary.ts",
  "src/data/chunks.ts",
  "src/data/characters.ts",
];

export const INTEGRITY_PREFIX = "<!-- integridade:";

export function journeyFingerprint(rootDir) {
  const hash = createHash("sha256");
  for (const rel of CURRICULUM_SOURCES) {
    try {
      hash.update(readFileSync(path.join(rootDir, rel)));
    } catch {
      hash.update(`ausente:${rel}`);
    }
  }
  return hash.digest("hex").slice(0, 12);
}

export function currentCommitSha(rootDir) {
  try {
    return execSync("git rev-parse HEAD", { cwd: rootDir, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "(sem git)";
  }
}

export function headCommitDate(rootDir) {
  try {
    const iso = execSync("git show -s --format=%cI HEAD", { cwd: rootDir, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return new Date(iso);
  } catch {
    return null;
  }
}

export function appVersion(rootDir) {
  try {
    return JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Bloco de procedência em markdown, logo após o título do relatório. */
export function reportProvenanceLines(rootDir, { lessonCount }) {
  return [
    "## Procedência",
    "",
    "| Campo | Valor |",
    "|-------|-------|",
    `| Commit | ${currentCommitSha(rootDir)} |`,
    `| Versão do app | ${appVersion(rootDir)} |`,
    `| Gerado em | ${new Date().toISOString()} |`,
    `| Lições | ${lessonCount} |`,
    `| Hash da Jornada | ${journeyFingerprint(rootDir)} |`,
    "",
  ];
}

/** Fecha o relatório com o hash de integridade do corpo (anti-edição manual). */
export function finalizeReport(lines) {
  const body = lines.join("\n");
  const digest = createHash("sha256").update(body).digest("hex").slice(0, 16);
  return `${body}\n${INTEGRITY_PREFIX}${digest} -->\n`;
}

/** Separa corpo e hash de integridade de um relatório salvo. */
export function splitReportIntegrity(content) {
  const marker = content.lastIndexOf(INTEGRITY_PREFIX);
  if (marker < 0) return { body: null, digest: null };
  const tail = content.slice(marker);
  const match = tail.match(/^<!-- integridade:([0-9a-f]{16}) -->\n?$/);
  if (!match) return { body: null, digest: null };
  return { body: content.slice(0, marker).replace(/\n$/, ""), digest: match[1] };
}

export function reportBodyDigest(body) {
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

/** Lê um campo do bloco de procedência ("| Campo | Valor |"). */
export function readProvenanceField(content, field) {
  const pattern = new RegExp(`^\\| ${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| (.+) \\|$`, "m");
  return content.match(pattern)?.[1]?.trim() ?? null;
}
