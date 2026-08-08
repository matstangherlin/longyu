import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { build } from "esbuild";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const entry = path.join(root, "src", "lib", "csv.ts");
const feedbackService = fs.readFileSync(
  path.join(root, "src", "services", "feedbackService.ts"),
  "utf8"
);
const result = await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const source = result.outputFiles[0]?.text;
if (!source) throw new Error("esbuild não gerou o módulo CSV");

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { escapeCsvCell, neutralizeSpreadsheetFormula } = await import(moduleUrl);

const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

assert(
  feedbackService.includes('import { escapeCsvCell } from "../lib/csv"') &&
    feedbackService.includes(".map(escapeCsvCell)"),
  "feedbackToCsv usa o escape seguro em todas as colunas"
);

const dangerous = [
  "=HYPERLINK(\"https://evil.invalid\")",
  "+SUM(1,2)",
  "-1+2",
  "@SUM(1,2)",
  "   =cmd|' /C calc'!A0",
  "\t=WEBSERVICE(\"https://evil.invalid\")",
  "\r=IMPORTDATA(\"https://evil.invalid\")",
  "\ttexto controlado",
  "\rtexto controlado",
  "\n\u0000 @SUM(1,2)",
];

for (const value of dangerous) {
  assert(
    neutralizeSpreadsheetFormula(value).startsWith("'"),
    `neutraliza prefixo ${JSON.stringify(value.slice(0, 12))}`
  );
  const cell = escapeCsvCell(value);
  const unquoted = cell.startsWith('"') ? cell.slice(1, -1).replace(/""/g, '"') : cell;
  assert(unquoted.startsWith("'"), "escape CSV preserva marcador de texto");
}

for (const value of ["texto normal", "0", "https://longyu.com.br", "中文", " espaço seguro"]) {
  assert(
    !neutralizeSpreadsheetFormula(value).startsWith("'"),
    `não altera célula segura ${JSON.stringify(value)}`
  );
}

assert(escapeCsvCell('texto, "citado"') === '"texto, ""citado"""', "mantém escape RFC de vírgula/aspas");
assert(escapeCsvCell("linha\r\nnova") === '"linha\r\nnova"', "escapa CRLF dentro da célula");

if (failures.length) {
  console.error("test:feedback-csv-safety FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: CSV de feedback neutraliza fórmulas e preserva células seguras.");
