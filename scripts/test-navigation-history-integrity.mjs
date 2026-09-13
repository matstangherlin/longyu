#!/usr/bin/env node
/**
 * Mutações 1–3 e 11 do contrato RC1.2.
 *
 * O bug que abriu este gate não estava no teste: um `<link rel="stylesheet">`
 * externo bloqueava o boot do app. As mutações abaixo reintroduzem cada forma
 * de trazer essa dependência de volta — inclusive a versão que PARECE
 * corrigida mas seria ignorada em produção pela CSP.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateNavigationHistoryIntegrity } from "./lib/rc1-2-gates.mjs";

const base = {
  indexHtml: fs.readFileSync("index.html", "utf8"),
  mainSource: fs.readFileSync("src/main.tsx", "utf8"),
  netlifyToml: fs.readFileSync("netlify.toml", "utf8"),
  specSource: fs.readFileSync("e2e/navigation-history-integrity.spec.ts", "utf8"),
};

assert.deepEqual(validateNavigationHistoryIntegrity(base).failures, [], "controle positivo");

const FONTS = "https://fonts.googleapis.com/css2?family=Inter";

const mutations = [
  [
    "volta o stylesheet externo render-blocking",
    { indexHtml: base.indexHtml.replace("</head>", `<link href="${FONTS}" rel="stylesheet" />\n</head>`) },
    "BLOCKING_EXTERNAL_CSS",
  ],
  [
    // A versão que passava nos testes locais e morreria em produção.
    "promoção por onload inline, que a CSP ignora",
    {
      indexHtml: base.indexHtml.replace(
        'rel="preload"',
        'rel="preload" onload="this.rel=\'stylesheet\'"'
      ),
    },
    "CSP_INLINE_HANDLER",
  ],
  [
    "fonte pré-carregada nunca é promovida",
    { mainSource: base.mainSource.replace(/longyu-fonts/g, "outro-id") },
    "NO_PROMOTION",
  ],
  [
    "promoção volta a ser síncrona e segura o load",
    {
      mainSource: base.mainSource
        .replace(/addEventListener\(\s*["']load["']/g, "addEventListener('x'")
        .replace(/readyState/g, "naoImporta"),
    },
    "SYNC_PROMOTION",
  ],
  [
    "e2e deixa de cobrir o forward",
    { specSource: base.specSource.replace(/goForward/g, "algoOutro") },
    "SPEC_INCOMPLETE",
  ],
  [
    "e2e esconde o bug com fixme",
    { specSource: `${base.specSource}\ntest.fixme("forward", async () => {});\n` },
    "SPEC_HIDES_BUG",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateNavigationHistoryIntegrity({ ...base, ...patch }).failures.map((f) => f.code);
  assert.ok(
    codes.includes(expectedCode),
    `mutação "${label}" não detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// O <noscript> continua podendo carregar a folha: sem JS não há app para travar.
const noscriptOnly = validateNavigationHistoryIntegrity(base).failures;
assert.ok(
  base.indexHtml.includes("<noscript>") && noscriptOnly.length === 0,
  "a folha dentro de <noscript> não pode ser acusada"
);
console.log("OK stylesheet dentro de <noscript> é aceito");

console.log("PASS test:navigation-history-integrity");
