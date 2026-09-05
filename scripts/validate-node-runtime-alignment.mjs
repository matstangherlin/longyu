/**
 * NODE_RUNTIME_ALIGNMENT — o runtime declarado, o runtime instalado e o runtime
 * do CI têm de contar a mesma história.
 *
 * A motivação é concreta: toda a pilha `@supabase/*` declara `engines.node
 * >= 22`, enquanto o CI ainda subia Node 20. Isso não quebra o build de forma
 * barulhenta — o npm apenas avisa e segue —, então a divergência sobrevive até
 * virar erro de runtime em produção. Este gate transforma o desalinhamento em
 * falha de CI.
 *
 * Regras verificadas:
 *   1. package.json engines.node cobre o piso exigido pelas dependências;
 *   2. todo `node-version` dos workflows atende esse mesmo piso;
 *   3. o Node que está executando este script também atende.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

/** Menor major aceito por um range de engines (`>=22.0.0`, `20 || >=22`, `^18 || >=22`). */
function floorMajor(range) {
  const majors = [...String(range).matchAll(/(\d+)(?:\.\d+)*/g)].map((match) => Number(match[1]));
  return majors.length ? Math.min(...majors) : null;
}

/** Maior major citado num range — usado para saber até onde a dependência vai. */
function ceilingMajor(range) {
  const majors = [...String(range).matchAll(/(\d+)(?:\.\d+)*/g)].map((match) => Number(match[1]));
  return majors.length ? Math.max(...majors) : null;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const declaredFloor = floorMajor(pkg.engines?.node ?? "");
assert(declaredFloor != null, "package.json precisa declarar engines.node");

// ── 1. Piso exigido pelas dependências instaladas ─────────────────────────
// Só olhamos o que está de fato em node_modules: um piso derivado do
// package-lock sem instalação seria uma promessa, não uma medição.
const modulesDir = path.join(root, "node_modules");
let dependencyFloor = 0;
const demanding = [];

function inspectPackage(dir) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return;
  }
  const range = manifest.engines?.node;
  if (!range || !manifest.name) return;
  // Um range como `20 || >=22` aceita 20; o piso real dele é 20, não 22.
  const floor = floorMajor(range);
  if (floor == null) return;
  if (floor > dependencyFloor) dependencyFloor = floor;
  if (floor >= 22) demanding.push(`${manifest.name} (${range})`);
}

function scanScope(dir, depth) {
  if (depth > 1 || !fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("@")) scanScope(full, depth + 1);
    else inspectPackage(full);
  }
}

if (fs.existsSync(modulesDir)) {
  scanScope(modulesDir, 0);
  assert(
    declaredFloor >= dependencyFloor,
    `engines.node declara piso ${declaredFloor}, mas alguma dependência exige >= ${dependencyFloor}: ${demanding.slice(0, 4).join(", ")}`
  );
} else {
  console.warn("AVISO: node_modules ausente — piso de dependências não auditado nesta execução.");
}

// ── 2. Workflows do GitHub Actions ────────────────────────────────────────
const workflowDir = path.join(root, ".github/workflows");
const misaligned = [];

for (const file of fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name))) {
  const source = fs.readFileSync(path.join(workflowDir, file), "utf8");
  for (const match of source.matchAll(/node-version:\s*["']?(\d+)/g)) {
    const version = Number(match[1]);
    if (version < declaredFloor) misaligned.push(`${file} → node-version ${version}`);
  }
}

assert(
  misaligned.length === 0,
  `workflows abaixo do piso ${declaredFloor} declarado em engines.node: ${misaligned.join(", ")}`
);

// ── 3. Runtime que está executando agora ──────────────────────────────────
const runningMajor = Number(process.versions.node.split(".")[0]);
assert(
  runningMajor >= declaredFloor,
  `Node em execução é ${process.versions.node}, abaixo do piso ${declaredFloor} de engines.node`
);

// Um teto abaixo do piso significaria que nenhuma versão satisfaz todo mundo.
const impossible = [];
if (fs.existsSync(modulesDir)) {
  for (const entry of demanding) {
    const range = entry.slice(entry.indexOf("(") + 1, -1);
    const ceiling = ceilingMajor(range);
    if (ceiling != null && /</.test(range) && ceiling < declaredFloor) impossible.push(entry);
  }
}
assert(impossible.length === 0, `dependências incompatíveis com o piso ${declaredFloor}: ${impossible.join(", ")}`);

if (errors.length) {
  console.error("ERRO: NODE_RUNTIME_ALIGNMENT falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `OK: NODE_RUNTIME_ALIGNMENT — engines.node >= ${declaredFloor}, ` +
    `${demanding.length} dependência(s) exigindo >= 22, workflows alinhados, runtime ${process.versions.node}.`
);
