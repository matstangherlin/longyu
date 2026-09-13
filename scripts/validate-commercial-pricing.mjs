#!/usr/bin/env node
/**
 * validate:commercial-pricing — P0, P1 e P1.2 do contrato V4.10A.
 *
 * Confere que o catálogo público carrega os preços aprovados, que o anual
 * equivale a dez meses, que nenhum Stripe Price ID vazou para o cliente e que
 * o cliente continua sem autoridade sobre preço.
 */
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import {
  validateCommercialPricing,
  validateNoStripeIdsInClient,
  loadSource,
} from "./lib/v410a-gates.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-v410a-"));
const require = createRequire(import.meta.url);

async function compile(relativePath) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: relativePath,
  }).outputText;
  const target = path.join(temp, relativePath.replace(/\.ts$/, ".js"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, output);
}

await compile("src/commercial/billing.ts");
const billing = require(path.join(temp, "src/commercial/billing.js"));

const CLIENT_FILES = [
  "src/commercial/billing.ts",
  "src/commercial/family.ts",
  "src/commercial/entitlements.ts",
  "src/features/pro/ProPage.tsx",
];

const clientSources = Object.fromEntries(CLIENT_FILES.map((file) => [file, loadSource(file)]));

const failures = [
  ...validateCommercialPricing({
    catalog: billing.PUBLIC_COMMERCIAL_CATALOG,
    billingSource: clientSources["src/commercial/billing.ts"],
  }).failures,
  ...validateNoStripeIdsInClient({ clientSources }).failures,
];

// A matriz que o cliente enxerga nunca pode trazer Price ID, e o valor exibido
// tem que ser o mesmo que o servidor aprova.
for (const plan of ["pro", "family"]) {
  for (const market of ["BR", "INTERNATIONAL"]) {
    for (const cycle of ["monthly", "annual"]) {
      const slot = billing.PLAN_PRICE_MATRIX[plan][market][cycle];
      const approved = billing.PUBLIC_COMMERCIAL_CATALOG[plan][market][cycle].amountMinor;
      if (slot.providerPriceId) {
        failures.push({
          code: "PRICE_ID_IN_CLIENT_MATRIX",
          message: `${plan}/${market}/${cycle}: matriz do cliente traz Price ID`,
        });
      }
      if (slot.amountMinor !== approved) {
        failures.push({
          code: "UI_AMOUNT_DIVERGES",
          message: `${plan}/${market}/${cycle}: UI mostra ${slot.amountMinor}, aprovado é ${approved}`,
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`validate:commercial-pricing falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

const br = billing.PUBLIC_COMMERCIAL_CATALOG.pro.BR;
const savings = billing.calculateAnnualSavingsPercent(br.monthly.amountMinor, br.annual.amountMinor);
const freeMonths = billing.freeMonthsOnAnnual(br.monthly.amountMinor, br.annual.amountMinor);
console.log(
  `OK: validate:commercial-pricing — Individual R$${(br.monthly.amountMinor / 100).toFixed(2)}/mês, ` +
    `Family R$${(billing.PUBLIC_COMMERCIAL_CATALOG.family.BR.monthly.amountMinor / 100).toFixed(2)}/mês, ` +
    `anual = ${freeMonths} meses grátis (${savings}% de economia real), Price IDs só no servidor.`
);
