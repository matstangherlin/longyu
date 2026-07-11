/**
 * Portão único de segurança para lançamento beta com assinatura pública.
 * Falha se qualquer etapa crítica não passar.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");

const STEPS = [
  { name: "validate:beta", command: "npm", args: ["run", "validate:beta"] },
  { name: "validate:edge-security", command: "npm", args: ["run", "validate:edge-security"] },
  { name: "test:e2e", command: "npm", args: ["run", "test:e2e"] },
  { name: "test:rls", command: "npm", args: ["run", "test:rls"] },
  { name: "test:stripe", command: "npm", args: ["run", "test:stripe"] },
  { name: "verify:production", command: "npm", args: ["run", "verify:production"] },
  { name: "build", command: "npm", args: ["run", "build"] },
];

function runStep(step) {
  console.log(`\n== gate:production → ${step.name} ==`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status ?? 1;
}

console.log("== gate:production ==");
console.log("Critério: app NÃO está pronto para assinatura pública se qualquer etapa falhar.\n");

const failures = [];
for (const step of STEPS) {
  const code = runStep(step);
  if (code !== 0) failures.push(step.name);
}

console.log("");
if (failures.length > 0) {
  console.error("ERRO: gate:production FALHOU.");
  console.error("Etapas com falha:");
  for (const name of failures) console.error(`  - ${name}`);
  console.error("\nO app não deve ser considerado pronto para assinatura pública.");
  process.exit(1);
}

console.log("OK: gate:production passou — critérios de segurança beta atendidos.");
