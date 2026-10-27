#!/usr/bin/env node
/**
 * LGY-029 — 404 de /u/*, /@* e /perfil/* antes do catch-all da SPA.
 * Nenhuma rota real de src/routes.tsx pode cair nessas regras.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const toml = await readFile(path.join(root, "netlify.toml"), "utf8");
const redirectsFile = await readFile(path.join(root, "public/_redirects"), "utf8");
const routes = await readFile(path.join(root, "src/routes.tsx"), "utf8");

function tomlRules(text) {
  const blocks = text.split("[[redirects]]").slice(1);
  return blocks.map((block) => {
    const from = block.match(/from\s*=\s*"([^"]+)"/)?.[1];
    const to = block.match(/to\s*=\s*"([^"]+)"/)?.[1];
    const status = Number(block.match(/status\s*=\s*(\d+)/)?.[1]);
    assert.ok(from && to && status, "redirect sem from/to/status");
    return { from, to, status };
  });
}

function fileRules(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/);
      return { from, to, status: Number(status) };
    });
}

function patternToRegExp(pattern) {
  const body = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}$`);
}

function appPaths(source) {
  const paths = [];
  for (const match of source.matchAll(/path:\s*"([^"]+)"/g)) {
    const raw = match[1];
    if (raw === "*") continue;
    const full = raw.startsWith("/") ? raw : `/${raw}`;
    paths.push(full.replace(/:[^/]+/g, "exemplo"));
  }
  return paths;
}

function assertRules(name, rules) {
  const catchAll = rules.findIndex((rule) => rule.from === "/*" && rule.status === 200 && rule.to === "/index.html");
  assert.ok(catchAll === rules.length - 1, `${name}: o catch-all /* 200 tem que ser a última regra`);
  const before = rules.slice(0, catchAll);
  for (const pattern of ["/u/*", "/u", "/@*", "/perfil/*"]) {
    const rule = before.find((item) => item.from === pattern && item.status === 404 && item.to === "/index.html");
    assert.ok(rule, `${name}: falta 404 para ${pattern} antes do catch-all`);
  }
  const settings = before.find((item) => item.from === "/configuracoes" && item.status === 301 && item.to === "/ajustes");
  assert.ok(settings, `${name}: /configuracoes tem que ir para /ajustes`);
  const real = appPaths(routes);
  for (const rule of before.filter((item) => item.status === 404)) {
    const re = patternToRegExp(rule.from);
    for (const route of real) {
      assert.equal(re.test(route), false, `${name}: ${rule.from} casa com a rota real ${route}`);
    }
  }
}

assertRules("netlify.toml", tomlRules(toml));
assertRules("public/_redirects", fileRules(redirectsFile));
console.log("test:netlify-404-rules PASS");
