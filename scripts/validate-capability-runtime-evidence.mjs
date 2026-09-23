#!/usr/bin/env node
/**
 * validate:capability-runtime-evidence — RC2.2.9.
 *
 * Deriva, dos planos que o aluno recebe na Jornada, a evidência das seis
 * dimensões de cada capacidade conversacional e roda os gates G1–G7 (+ K1,
 * A1, A3, U, J). Regenera:
 *   - docs/release/rc2-capability-closure.json (máquina)
 *   - o bloco de evidência de docs/reports/rc2-2-9-capability-closure.md
 * Nada aqui é preenchido à mão: rodar de novo produz o mesmo resultado.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { describeRef, loadCapabilityGateContext, root } from "./lib/capability-evidence-runtime.mjs";
import { CLOSURE_IDS, runCapabilityRuntimeGates } from "./lib/capability-closure-gates.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";

const BASE_MAIN_SHA = "700aa83264cee8429313ad0e52881e90b09fa2e8";
const FINGERPRINT_BEFORE = "327de1df0f33";

/** Status declarado em src/data/conversationCapabilities.ts no BASE_MAIN_SHA. */
const DECLARED_BEFORE = Object.fromEntries(
  [
    "greet", "introduce_self", "ask_name", "say_origin", "ask_origin", "talk_study", "talk_work", "talk_routine",
    "tell_time", "ask_time", "ask_price", "buy_item", "ask_location", "ask_directions", "use_taxi", "airport_basic",
    "hotel_checkin", "say_dont_understand", "health_basic", "weather_smalltalk",
  ].map((id) => [id, "READY"]).concat(CLOSURE_IDS.map((id) => [id, "PARTIAL"]))
);

const ctx = loadCapabilityGateContext();
const failures = runCapabilityRuntimeGates(ctx);
const available = new Set(ctx.registry.chunkHanziByRef.keys());
const coverage = ctx.capabilityModule.capabilityCoverage(available, ctx.evidenceById);
const fingerprint = journeyFingerprint(root);

const earliest = (refs) =>
  refs.filter(Boolean).sort(ctx.evidenceModule.compareEvidenceRefs)[0] ?? null;

function refJson(ref) {
  if (!ref) return null;
  return {
    lessonId: ref.lessonId,
    lessonIndex: ref.lessonIndex,
    pass: ref.pass,
    step: ref.stepIndex + 1,
    kind: ref.kind,
    ...(ref.sceneId ? { sceneId: ref.sceneId } : {}),
    ...(ref.nodeId ? { nodeId: ref.nodeId } : {}),
    text: ref.text,
  };
}

const rows = coverage.map((row) => {
  const evidence = ctx.evidenceById.get(row.id);
  const firstTeach = earliest(evidence.lexical.map((item) => item.firstTeach));
  const firstTest = earliest(evidence.lexical.map((item) => item.firstTest));
  const dims = {
    // Pelo contrato da capacidade: estrito exige 1.00; presença exige nada ausente.
    lexical: !row.readyGaps.includes("lexical") && !row.readyGaps.includes("runtime-evidence"),
    structural: !row.readyGaps.includes("structural") && !row.readyGaps.includes("runtime-evidence"),
    productive: evidence.productive.length > 0,
    listening: evidence.listening.length > 0,
    conversation: evidence.conversation.length > 0,
    transfer: evidence.transfer.length > 0,
  };
  return {
    id: row.id,
    label: row.labelPt,
    contract: ctx.capabilityModule.capabilityRuntimeContract(row),
    declaredBefore: DECLARED_BEFORE[row.id] ?? "—",
    declaredAfter: row.declaredStatus,
    computed: row.computedStatus,
    readyGaps: row.readyGaps,
    scores: row.scores,
    dims,
    reachable: evidence.reachable,
    firstTeach,
    firstTest,
    evidence,
  };
});

// ——— JSON de máquina ———
const machine = {
  schema: "longyu.rc2-capability-closure.v1",
  generatedBy: "npm run validate:capability-runtime-evidence",
  baseMainSha: BASE_MAIN_SHA,
  fingerprintBefore: FINGERPRINT_BEFORE,
  fingerprint,
  contract: {
    strict: "RC2.2.9 closure: lexical=1, structural=1, productive/listening/conversation/transfer com evidência de runtime",
    presence: "READY anteriores: nenhuma dimensão ausente em runtime; todo chunk exigido chega ao aluno",
  },
  totals: {
    capabilities: rows.length,
    runtimeReady: rows.filter((row) => row.computed === "READY").length,
    closureRuntimeReady: rows.filter((row) => CLOSURE_IDS.includes(row.id) && row.computed === "READY").length,
    closureTotal: CLOSURE_IDS.length,
  },
  capabilities: Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        contract: row.contract,
        declaredBefore: row.declaredBefore,
        declaredAfter: row.declaredAfter,
        lexical: row.dims.lexical,
        structural: row.dims.structural,
        productive: row.dims.productive,
        listening: row.dims.listening,
        conversation: row.dims.conversation,
        transfer: row.dims.transfer,
        reachable: row.reachable,
        verdict: row.computed,
        readyGaps: row.readyGaps,
        firstTeach: refJson(row.firstTeach),
        firstTest: refJson(row.firstTest),
        refs: {
          lexical: row.evidence.lexical.map((item) => ({
            ref: item.ref,
            hanzi: item.hanzi,
            ok: item.ok,
            firstTeach: refJson(item.firstTeach),
            firstTest: refJson(item.firstTest),
          })),
          structural: row.evidence.structural.map((item) => ({
            structure: item.structure,
            ok: item.ok,
            teach: refJson(item.teach),
            productive: refJson(item.productive),
            use: refJson(item.use),
          })),
          productive: row.evidence.productive.slice(0, 3).map(refJson),
          listening: row.evidence.listening.slice(0, 3).map(refJson),
          conversation: row.evidence.conversation.slice(0, 3).map(refJson),
          transfer: row.evidence.transfer.slice(0, 3).map(refJson),
          counts: {
            productive: row.evidence.productive.length,
            listening: row.evidence.listening.length,
            conversation: row.evidence.conversation.length,
            transfer: row.evidence.transfer.length,
          },
        },
      },
    ])
  ),
};
const jsonPath = path.join(root, "docs/release/rc2-capability-closure.json");
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(machine, null, 2)}\n`, "utf8");

// ——— bloco do relatório ———
const cell = (text) => String(text ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
const lexicalLine = (row) => {
  const ok = row.evidence.lexical.filter((item) => item.ok).length;
  const vocab = row.evidence.vocabulary.filter((item) => item.ok).length;
  return `${ok}/${row.evidence.lexical.length} chunks ensinados antes de cobrados · ${vocab}/${row.evidence.vocabulary.length} palavras (${row.evidence.lexical.map((item) => item.hanzi ?? item.ref).join(", ")})`;
};
const structuralLine = (row) =>
  row.evidence.structural
    .map((item) => `${item.structure} → ensino ${item.teach ? `${item.teach.lessonId}·M${item.teach.pass}` : "—"}, produção ${item.productive ? `${item.productive.lessonId}·M${item.productive.pass}` : "—"}, uso ${item.use ? `${item.use.lessonId}·M${item.use.pass}` : "—"}`)
    .join("; ");

const block = [];
block.push(`Gerado por \`npm run validate:capability-runtime-evidence\` · fingerprint \`${fingerprint}\` · base \`${BASE_MAIN_SHA.slice(0, 12)}\`.`);
block.push("");
block.push(`Runtime READY: **${machine.totals.runtimeReady}/${machine.totals.capabilities}** · capacidades desta remessa: **${machine.totals.closureRuntimeReady}/${machine.totals.closureTotal}** no contrato estrito.`);
block.push("");
block.push("### As 11 capacidades (contrato estrito)");
block.push("");
for (const row of rows.filter((item) => CLOSURE_IDS.includes(item.id))) {
  const ev = row.evidence;
  block.push(`#### ${row.id} — ${row.label}`);
  block.push("");
  block.push("| Campo | Valor |");
  block.push("| --- | --- |");
  block.push(`| Capability | \`${row.id}\` |`);
  block.push(`| Declared status before | ${row.declaredBefore} |`);
  block.push(`| Declared status after | ${row.declaredAfter} |`);
  block.push(`| Lexical evidence | ${cell(lexicalLine(row))} |`);
  block.push(`| Structural evidence | ${cell(structuralLine(row))} |`);
  block.push(`| Productive task | ${cell(describeRef(ev.productive[0]))} (${ev.productive.length} no total) |`);
  block.push(`| Listening task | ${cell(describeRef(ev.listening[0]))} (${ev.listening.length} no total) |`);
  block.push(`| Conversation scene | ${cell(describeRef(ev.conversation[0]))} (${ev.conversation.length} turnos) |`);
  block.push(`| Transfer task | ${cell(describeRef(ev.transfer[0]))} (${ev.transfer.length} no total) |`);
  block.push(`| Reachable | ${row.reachable ? "sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal" : "NÃO"} |`);
  block.push(`| First teach position | ${cell(describeRef(row.firstTeach))} |`);
  block.push(`| First test position | ${cell(describeRef(row.firstTest))} |`);
  block.push(`| Final verdict | **${row.computed}**${row.readyGaps.length ? ` (faltando: ${row.readyGaps.join(", ")})` : ""} |`);
  block.push("");
}
block.push("### As 20 capacidades READY anteriores (contrato de presença)");
block.push("");
block.push("| Capacidade | Antes | Depois | Léxico | Estrutura | Produção | Escuta | Conversa | Transferência | Veredito |");
block.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
for (const row of rows.filter((item) => !CLOSURE_IDS.includes(item.id))) {
  const ev = row.evidence;
  block.push(
    `| ${row.id} | ${row.declaredBefore} | ${row.declaredAfter} | ${row.scores.lexicalCoverage.toFixed(2)} | ${row.scores.structuralCoverage.toFixed(2)} | ${ev.productive.length} | ${ev.listening.length} | ${ev.conversation.length} | ${ev.transfer.length} | ${row.computed} |`
  );
}
block.push("");
block.push("Léxico/estrutura abaixo de 1.00 nas capacidades de presença são dívida registrada (ordem de ensino dentro das rodadas de maestria), não dimensão ausente: toda dimensão tem evidência de runtime.");

const reportPath = path.join(root, "docs/reports/rc2-2-9-capability-closure.md");
const START = "<!-- evidencia:inicio -->";
const END = "<!-- evidencia:fim -->";
let report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : `# RC2.2.9 — Conversation Capability Closure\n\n${START}\n${END}\n`;
const from = report.indexOf(START);
const to = report.indexOf(END);
if (from < 0 || to < from) throw new Error("relatório sem marcadores de evidência");
report = `${report.slice(0, from + START.length)}\n${block.join("\n")}\n${report.slice(to)}`;
fs.writeFileSync(reportPath, report, "utf8");

if (failures.length) {
  console.error(`FAIL validate:capability-runtime-evidence — ${failures.length} problema(s):`);
  for (const item of failures.slice(0, 60)) console.error(` - [${item.gate}/${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
console.log(
  `PASS validate:capability-runtime-evidence — runtime READY ${machine.totals.runtimeReady}/${machine.totals.capabilities} · closure ${machine.totals.closureRuntimeReady}/${machine.totals.closureTotal} · fp ${fingerprint}`
);
