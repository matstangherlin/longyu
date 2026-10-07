#!/usr/bin/env node
/** validate:rc2-3-5-speech — RC2.3.5 speech gate on real data. */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadSpeechRuntime, runSpeechGate } from "./lib/speech-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadSpeechRuntime(root);
const failures = runSpeechGate(rt);
if (failures.length) {
  console.error("FAIL validate:rc2-3-5-speech");
  for (const f of failures) console.error(`  - ${f.code} ${f.subject}: ${f.message}`);
  process.exit(1);
}
const kinds = rt.library.accepted.reduce((o, e) => ({ ...o, [e.kind]: (o[e.kind] ?? 0) + 1 }), {});
console.log(`PASS validate:rc2-3-5-speech — ${rt.library.accepted.length} contrastes (tom ${kinds.tone ?? 0}, inicial ${kinds.initial ?? 0}, final ${kinds.final ?? 0}) na mesma voz canônica · ${rt.library.rejected.length} rejeitados · piloto ${rt.pilot.length}`);
