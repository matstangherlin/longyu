import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const scanRoots = ["src"];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const ignoredDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  "temp",
  "tmp",
]);

const forbiddenPatterns = [
  "Â",
  "Ã",
  "Ã¡",
  "Ã©",
  "Ãª",
  "Ã£",
  "Ãµ",
  "Ã§",
  "Ã³",
  "Ã­",
  "Ãº",
  "liÃ",
  "Ã£o",
  "Âº",
  "Â·",
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

function findEncodingIssues(filePath, source) {
  const issues = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of forbiddenPatterns) {
      if (!line.includes(pattern)) continue;
      issues.push({
        file: relative(filePath),
        line: index + 1,
        pattern,
        text: line.trim().slice(0, 160),
      });
    }
  });

  return issues;
}

const issues = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = path.join(rootDir, scanRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const source = await readFile(filePath, "utf8");
    issues.push(...findEncodingIssues(filePath, source));
  }
}

if (issues.length > 0) {
  console.error(`validate:encoding encontrou ${issues.length} possível(eis) texto(s) com mojibake.`);
  for (const issue of issues.slice(0, 120)) {
    console.error(`- ${issue.file}:${issue.line} contém "${issue.pattern}": ${issue.text}`);
  }
  if (issues.length > 120) {
    console.error(`... e mais ${issues.length - 120} ocorrência(s).`);
  }
  process.exit(1);
}

console.log("OK: validate:encoding passou.");
