#!/usr/bin/env node
/**
 * validate:family-plan — P4 a P7 do contrato V4.10A.
 *
 * O que este gate protege não é o número 6: é o lugar onde o 6 mora. Se o
 * limite existir só no cliente, duas requisições simultâneas passam pelas duas
 * checagens e a família fica com sete contas pagando uma assinatura.
 */
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { validateFamilyPlanSchema, validateFamilySeats, loadSource } from "./lib/v410a-gates.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-family-"));
const require = createRequire(import.meta.url);

const relative = "src/commercial/family.ts";
const familySource = await readFile(path.join(root, relative), "utf8");
const output = ts.transpileModule(familySource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  fileName: relative,
}).outputText;
const target = path.join(temp, "family.js");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, output);
const family = require(target);

const MIGRATION = "supabase/migrations/20260914120000_family_plan_foundation.sql";
const migrationSource = loadSource(MIGRATION);

const COPY_FILES = ["src/locales/pt-BR.ts", "src/locales/en.ts"];
const copySources = Object.fromEntries(COPY_FILES.map((file) => [file, loadSource(file)]));

const failures = [
  ...validateFamilySeats({
    maxMembers: family.FAMILY_MAX_MEMBERS,
    maxInvitees: family.FAMILY_MAX_INVITEES,
    familySource,
    copySources,
  }).failures,
  ...validateFamilyPlanSchema({ migrationSource }).failures,
];

// O limite do servidor e o do cliente precisam ser o mesmo número.
const serverLimit = Number(
  migrationSource.match(/function public\.family_max_members\(\)[\s\S]*?select\s+(\d+)/)?.[1] ?? NaN
);
if (serverLimit !== family.FAMILY_MAX_MEMBERS) {
  failures.push({
    code: "LIMIT_DIVERGES",
    message: `servidor permite ${serverLimit}, cliente permite ${family.FAMILY_MAX_MEMBERS}`,
  });
}

if (failures.length > 0) {
  console.error(`validate:family-plan falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  `OK: validate:family-plan — ${family.FAMILY_MAX_MEMBERS} contas (dono + ${family.FAMILY_MAX_INVITEES} convidados), ` +
    "limite imposto por trigger no servidor, convite pendente reserva lugar, token só em hash, RLS nas três tabelas."
);
