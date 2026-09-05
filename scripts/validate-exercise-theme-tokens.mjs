#!/usr/bin/env node
/**
 * P2 — nenhum componente de exercício resolve tema por conta própria.
 *
 * O bug das peças brancas e o `--danger` inexistente da Revisão têm a mesma
 * raiz: cor decidida dentro do componente em vez de vir do token de tema. O
 * auditor de contraste (`exercise-theme-states.spec.ts`) mede o resultado; este
 * gate ataca a causa no momento em que ela é escrita, que é mais barato do que
 * descobrir em aparelho real.
 *
 * Três regras:
 *   1. superfície branca ou preta literal — `bg-white`, `bg-black` — não existe
 *      em componente de exercício: no dark ela vira a superfície errada, e o
 *      texto em `ink` (quase branco no dark) some;
 *   2. cor hexadecimal literal em className não existe: `#B7791F` é o dourado
 *      do tema claro, e o dark usa outro;
 *   3. classe de cor cujo token não está definido no tema não existe: era o
 *      caso de `border-danger`, que não emitia CSS algum — o estado de erro
 *      simplesmente não pintava.
 *
 * `text-white` continua permitido sobre `bg-accent`: o acento é saturado nos
 * três temas e o branco ali é escolha, não descuido.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const FILES = [
  "src/features/lesson/steps.tsx",
  "src/features/lesson/PieceAssembly.tsx",
  "src/features/lesson/buildAssemblyFeedback.ts",
  "src/features/revisao/RevisaoPage.tsx",
  "src/components/hanzi/HanziBuilderExercise.tsx",
];

// Tokens de cor realmente definidos em src/index.css.
const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");
const definedTokens = new Set([...css.matchAll(/--([a-z0-9-]+):\s*\d+\s+\d+\s+\d+/g)].map((m) => m[1]));

// Nomes de cor expostos pelo Tailwind a partir desses tokens.
const tailwind = fs.readFileSync(path.join(root, "tailwind.config.js"), "utf8");
const tailwindColors = new Set(
  [...tailwind.matchAll(/["']?([a-z0-9-]+)["']?:\s*["']rgb\(var\(--([a-z0-9-]+)\)/g)].map((m) => m[1])
);

const COLOR_PREFIX = /(?:^|\s)(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|outline)-([a-z][a-z0-9-]*)/g;
// Utilitários do próprio Tailwind que não vêm dos nossos tokens.
const BUILTIN = new Set([
  "transparent", "current", "inherit", "white", "black", "wrap", "nowrap", "balance", "pretty",
  "left", "center", "right", "justify", "start", "end", "clip", "ellipsis", "dashed", "dotted",
  "solid", "none", "double", "hidden", "top", "bottom", "auto", "px", "xs", "sm", "base", "lg",
  "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl", "opacity", "offset", "1", "2",
  "0", "4", "8", "b", "t", "l", "r", "x", "y", "s", "e", "collapse", "separate", "fixed", "sr",
  // Utilitários que compartilham o prefixo mas não nomeiam cor.
  "gradient", "offset", "width", "spacing", "dotted", "wavy", "skip", "ink",
]);

for (const relative of FILES) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    const where = `${relative}:${index + 1}`;

    // 1. superfícies literais
    for (const match of line.matchAll(/\b(bg|border|ring)-(white|black)(\/\d+)?\b/g)) {
      failures.push(`${where} — \`${match[0]}\` fixa a superfície fora do tema; use bg-surface / bg-surface-2.`);
    }

    // 2. hexadecimal literal dentro de className/cx
    if (/(className|cx\()/.test(line)) {
      for (const match of line.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        failures.push(`${where} — cor literal \`${match[0]}\` em classe; use o token de tema equivalente.`);
      }
    }

    // 3. token de cor inexistente
    for (const match of line.matchAll(COLOR_PREFIX)) {
      const name = match[1];
      if (BUILTIN.has(name) || /^\[/.test(name) || /^\d/.test(name)) continue;
      // `bg-gradient-to-br`, `ring-offset-2`, `border-b-2`: prefixo de cor com
      // utilitário que não é cor. A raiz já está em BUILTIN.
      if (BUILTIN.has(name.split("-")[0])) continue;
      if (tailwindColors.has(name) || definedTokens.has(name)) continue;
      // Nomes compostos como `ink-soft` chegam inteiros; só reportamos quando
      // nem o nome nem sua raiz existem, para não acusar utilitário de layout.
      const rootName = name.split("-")[0];
      if (tailwindColors.has(rootName) || definedTokens.has(rootName)) continue;
      failures.push(`${where} — \`${match[0].trim()}\` não corresponde a token de tema definido.`);
    }
  });
}

if (failures.length) {
  console.error("ERRO: validate:exercise-theme-tokens falhou.");
  for (const line of [...new Set(failures)]) console.error(`  - ${line}`);
  process.exit(1);
}

console.log(
  `OK: validate:exercise-theme-tokens — ${FILES.length} módulos de exercício sem cor fora do tema ` +
    `(${definedTokens.size} tokens CSS, ${tailwindColors.size} cores Tailwind).`
);
