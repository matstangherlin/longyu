#!/usr/bin/env node
/**
 * validate:commercial-product-truth — P22 a P24.
 *
 * Uma tela que diz "disponível" sobre algo que ninguém consegue comprar não é
 * otimismo: quem lê acredita, tenta, falha e escreve para o suporte. O
 * registro é a única fonte, e o que depende de pagamento só sobe para
 * disponível quando o check operacional passar de verdade — o P26.1 vale aqui
 * também, implementação verde não vira evidência.
 */
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { validateCommercialProductTruth } from "./lib/v410a1-gates.mjs";
import { readSource } from "./lib/v410a1-sources.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-truth-"));
const require = createRequire(import.meta.url);

const relative = "src/commercial/productTruth.ts";
const source = await readFile(path.join(root, relative), "utf8");
const target = path.join(temp, "productTruth.js");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(
  target,
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: relative,
  }).outputText
);
const truth = require(target);

const SURFACES = ["src/features/pro/ProPage.tsx", "src/features/business/BusinessPage.tsx"];

const { failures } = validateCommercialProductTruth({
  registry: truth.PRODUCT_TRUTH,
  operationalChecks: JSON.parse(readSource("docs/release/rc1-operational-checks.json")),
  paidCapabilities: ["pro_individual", "family_plan"],
  surfaceSources: Object.fromEntries(SURFACES.map((file) => [file, readSource(file)])),
});

if (failures.length > 0) {
  console.error(`validate:commercial-product-truth falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

const states = Object.values(truth.PRODUCT_TRUTH)
  .map((entry) => `${entry.id}=${entry.availability}`)
  .join(" · ");
console.log(`OK: validate:commercial-product-truth — ${states}`);
