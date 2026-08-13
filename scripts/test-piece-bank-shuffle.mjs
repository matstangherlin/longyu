/**
 * TEST — PieceAssembly / odd_one_out wiring markers (PED-015 / PED-012–014).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];
const fail = (m) => errors.push(m);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const steps = read("src/features/lesson/steps.tsx");
const tasks = read("src/features/lesson/lessonTasks.ts");
const cats = read("src/data/oddOneOutCategories.ts");
const shuffle = read("src/lib/seededShuffle.ts");

if (!shuffle.includes("seededShuffleAvoidingOrder")) fail("faltaseededShuffleAvoidingOrder");
if (!steps.includes("seededShuffleAvoidingOrder")) fail("BuildExercise deve embaralhar com seededShuffle");
if (!steps.includes("attemptSeed")) fail("steps devem aceitar attemptSeed");
if (!steps.includes("optionMeta")) fail("odd_one_out deve mostrar optionMeta");
if (!steps.includes("showOptionMeta")) fail("StepOddOneOut deve pedir meta");
if (!tasks.includes("oddOneOutLevelForPhase")) fail("makeOddOneOutStep deve usar níveis");
if (!cats.includes("CURATED_ODD_ONE_OUT_SETS")) fail("sets curados");
if (!cats.includes("好喝")) fail("set bebida×好喝 deve existir como intruso");
if (cats.includes('beverages: ["水", "茶", "咖啡", "牛奶", "果汁", "啤酒", "可乐", "热水", "好喝"]')) {
  fail("好喝 não pode ser membro de beverages");
}
if (!tasks.includes("seededShuffleAvoidingOrder")) fail("makeSentenceBuildStep deve embaralhar bank");

if (errors.length) {
  console.error("ERRO: test:piece-bank-shuffle falhou");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("OK: test:piece-bank-shuffle");
