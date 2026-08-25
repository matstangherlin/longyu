#!/usr/bin/env node
/**
 * V4.6 — Gate Paid Beta Release Candidate (somente evidência automatizável).
 *
 * Nunca emite READY_FOR_CLOSED_PAID_BETA sozinho — isso exige evidência humana
 * registrada em docs/reports/paid-beta-device-qa.md e paid-beta-release-candidate.md.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readStatus(markdown, sectionLabel) {
  // Procura tabelas com Status / NOT_RUN|PASS|FAIL
  const block = markdown.split(sectionLabel)[1] ?? "";
  const statuses = [...block.matchAll(/\|\s*(NOT_RUN|PASS|FAIL)\s*\|/gi)].map((m) =>
    m[1].toUpperCase()
  );
  return statuses;
}

function sectionHasOnlyPass(markdown, heading) {
  const statuses = readStatus(markdown, heading);
  if (statuses.length === 0) return false;
  return statuses.every((s) => s === "PASS");
}

function sectionHasAnyFail(markdown, heading) {
  return readStatus(markdown, heading).includes("FAIL");
}

const deviceQaPath = path.join(rootDir, "docs/reports/paid-beta-device-qa.md");
const rcPath = path.join(rootDir, "docs/reports/paid-beta-release-candidate.md");

const deviceQa = await readFile(deviceQaPath, "utf8").catch(() => "");
const rcDoc = await readFile(rcPath, "utf8").catch(() => "");

if (!deviceQa || !rcDoc) {
  console.error("FAIL validate:paid-beta-rc — relatórios RC ausentes");
  process.exit(1);
}

// Contratos estruturais
const requiredDeviceSections = ["AUTOMATED EVIDENCE", "HUMAN DEVICE EVIDENCE"];
for (const section of requiredDeviceSections) {
  if (!deviceQa.includes(section)) {
    console.error(`FAIL: paid-beta-device-qa.md sem seção ${section}`);
    process.exit(1);
  }
}

// CI nunca pode pré-preencher Human Device Evidence como PASS
const humanBlock = deviceQa.split("HUMAN DEVICE EVIDENCE")[1] ?? "";
if (/\|\s*PASS\s*\|/i.test(humanBlock.split("##")[0] ?? humanBlock)) {
  // Permitir PASS só se houver nota humana explícita — por padrão V4.6 exige NOT_RUN
  const autoPass = humanBlock.match(/\|\s*PASS\s*\|/gi) ?? [];
  const humanNotes = humanBlock.match(/human[_-]?verified|QA físico|assinado por/gi) ?? [];
  if (autoPass.length && humanNotes.length === 0) {
    console.error(
      "FAIL: Human Device Evidence contém PASS sem marcador de verificação humana — CI não pode inventar QA físico"
    );
    process.exit(1);
  }
}

// Scripts automatizáveis rápidos
const autoScripts = [
  "test:transfer-target-integrity",
  "validate:transfer-target-integrity",
  "test:qa-mode-isolation",
  "test:paid-beta-regression-sentinels",
  "test:early-transfer",
];

const autoResults = [];
for (const script of autoScripts) {
  const run = spawnSync("npm", ["run", script], { cwd: rootDir, encoding: "utf8" });
  autoResults.push({ script, ok: run.status === 0 });
  if (run.status !== 0) {
    console.error(`FAIL auto script: ${script}`);
    console.error((run.stderr || run.stdout || "").slice(-800));
    process.exit(1);
  }
}

const humanPending =
  !sectionHasOnlyPass(deviceQa, "HUMAN DEVICE EVIDENCE") ||
  /NOT_RUN/i.test(humanBlock);

const operationalPending =
  /NOT_RUN|PENDING|não executado|não testado/i.test(rcDoc.split("BACKEND/STAGING")[1] ?? "") ||
  /NOT_RUN|PENDING/i.test(rcDoc.split("PAYMENTS")[1] ?? "");

let decision = "AUTOMATED_READY";
if (humanPending) decision = "PHYSICAL_QA_PENDING";
if (operationalPending && decision === "AUTOMATED_READY") decision = "OPERATIONAL_PENDING";
if (humanPending && operationalPending) decision = "PHYSICAL_QA_PENDING";

// READY_FOR_CLOSED_PAID_BETA só com evidência humana + operacional explícita
const readyMarker = /RELEASE_DECISION:\s*READY_FOR_CLOSED_PAID_BETA/i.test(rcDoc);
const humanAllPass = sectionHasOnlyPass(deviceQa, "HUMAN DEVICE EVIDENCE");
const opsPass = /BACKEND\/STAGING[\s\S]*?\|\s*PASS\s*\|/i.test(rcDoc) &&
  /PAYMENTS[\s\S]*?\|\s*PASS\s*\|/i.test(rcDoc);

if (readyMarker) {
  if (!humanAllPass || !opsPass) {
    console.error(
      "FAIL: READY_FOR_CLOSED_PAID_BETA declarado sem evidência humana/operacional completa"
    );
    process.exit(1);
  }
  decision = "READY_FOR_CLOSED_PAID_BETA";
}

// CI sozinho nunca promove para READY
if (decision === "READY_FOR_CLOSED_PAID_BETA" && process.env.CI === "true" && !readyMarker) {
  decision = "PHYSICAL_QA_PENDING";
}

const report = `# Paid Beta RC — decisão automática

Gerado: ${new Date().toISOString()}

| Campo | Valor |
|-------|-------|
| Decisão | **${decision}** |
| Scripts auto | ${autoResults.filter((r) => r.ok).length}/${autoResults.length} |
| Human QA | ${humanPending ? "PENDING" : "PASS"} |
| Operacional | ${operationalPending ? "PENDING" : "registrado"} |

## Regras

- \`AUTOMATED_READY\` — portões de código/pedagogia/automatização ok
- \`OPERATIONAL_PENDING\` — staging/payments ainda sem evidência
- \`PHYSICAL_QA_PENDING\` — Android/iPhone/Desktop humanos NOT_RUN
- \`READY_FOR_CLOSED_PAID_BETA\` — só com marcador humano + operacional no relatório RC

CI **nunca** inventa QA físico nem marca payments/staging como PASS.
`;

await mkdir(path.join(rootDir, "reports"), { recursive: true });
await writeFile(path.join(rootDir, "reports/paid-beta-rc-decision.md"), report, "utf8");

console.log(`OK validate:paid-beta-rc — decisão=${decision}`);
