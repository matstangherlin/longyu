import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const scanRoots = ["src/components", "src/data", "src/features", "src/lib"];
const textExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

const ignoredDirectories = new Set([".git", "dist", "node_modules", "temp", "tmp"]);

const copyWarnings = [
  ["Voce", "Você"],
  ["voce", "você"],
  ["Ola", "Olá"],
  ["ola", "olá"],
  ["agua", "água"],
  ["chines", "chinês"],
  ["nao", "não"],
  ["revisao", "revisão"],
  ["historico", "histórico"],
  ["padroes", "padrões"],
  ["correcao", "correção"],
  ["opcoes", "opções"],
  ["pagina", "página"],
  ["laboratorio", "laboratório"],
  ["ficara", "ficará"],
  ["preparacao", "preparação"],
  ["licao", "lição"],
  ["proxima", "próxima"],
  ["tambem", "também"],
  ["facil", "fácil"],
  ["nivel", "nível"],
  ["conteudo", "conteúdo"],
  ["usuario", "usuário"],
  ["avancado", "avançado"],
  ["basico", "básico"],
  ["dialogo", "diálogo"],
];

const ignoredLinePatterns = [
  /\b(id|to|href|path|category|type|kind|mode|track|motor|domain|level|skill|iconKey|className|matches|unlockAfterLesson|requiredItems|routeKey)\s*[:=]/,
  /\b(import|export type|from)\b/,
  /\bplaceholder=["']voce@email\.com["']/,
  /\/(revisao|licao|hanzi|pinyin|teste|conta|perfil)\b/,
  /\\\/(revisao|licao|hanzi|pinyin|teste|conta|perfil)\b/,
  /\((revisao|licao|hanzi|pinyin|teste|conta|perfil)\|/,
  /\b[a-z0-9_-]+-(agua|chines|ola|ate|basico|avancado|revisao|licao|dialogo)\b/i,
  /\b(leftType|rightType|authMode|pedagogicalStatus|tokens?)\b/,
  /^\s*\|\s*["'][a-z0-9_]+["'];?$/,
  /^\s*["'][a-z0-9_]+["'],?$/,
  /^\s*revisao\s*:/,
  /\btoolId\s*===\s*["'][a-z0-9_]+["']/,
  /\bcanUsePracticeTool\(["'][a-z0-9_]+["']/,
];

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    yield fullPath;
  }
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function hasWord(line, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-zÀ-ÿ0-9_])${escaped}(?=$|[^A-Za-zÀ-ÿ0-9_])`, "u").test(line);
}

function shouldIgnoreLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return true;
  return ignoredLinePatterns.some((pattern) => pattern.test(line));
}

function findCopyWarnings(filePath, source) {
  const warnings = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (shouldIgnoreLine(line)) return;

    for (const [bad, expected] of copyWarnings) {
      if (!hasWord(line, bad)) continue;
      warnings.push({
        file: relative(filePath),
        line: index + 1,
        bad,
        expected,
        text: line.trim().slice(0, 160),
      });
    }
  });

  return warnings;
}

const warnings = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = path.join(rootDir, scanRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const source = await readFile(filePath, "utf8");
    warnings.push(...findCopyWarnings(filePath, source));
  }
}

if (warnings.length > 0) {
  console.warn(`validate:copy encontrou ${warnings.length} possível(eis) texto(s) sem acento. Este aviso não bloqueia o build.`);
  for (const warning of warnings.slice(0, 80)) {
    console.warn(`AVISO ${warning.file}:${warning.line} "${warning.bad}" -> "${warning.expected}": ${warning.text}`);
  }
  if (warnings.length > 80) console.warn(`... e mais ${warnings.length - 80} ocorrência(s).`);
} else {
  console.log("OK: validate:copy não encontrou termos comuns sem acento em copy visível.");
}
