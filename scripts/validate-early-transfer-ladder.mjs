/**
 * V4.5 — Early Transfer Ladder
 *
 *   --gate=early          validate:early-transfer
 *   --gate=diversity      validate:transfer-diversity
 *   --gate=domain         validate:transfer-domain-fit
 *   (sem flag)            os três + relatório reports/early-transfer-ladder.md
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/early-transfer-ladder.md");
const gateArg = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length);
const runEarly = !gateArg || gateArg === "early";
const runDiversity = !gateArg || gateArg === "diversity";
const runDomain = !gateArg || gateArg === "domain";

const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()]/g;
const clean = (value) => String(value ?? "").replace(PUNCT_RE, "").trim();

const LAB_ROLES = new Set(["perception_lab", "hanzi_lab"]);
const POSSESSION_MISMATCH =
  /^(p[24]-num-|p4-char-|p2-ma-|p2-comparar|l14-pecas|l14-frase-minima)/;
const BEFORE = {
  lessonToFirstTransfer: 47,
  firstFrame: "frame_woyouge",
  firstTarget: "我有一个朋友",
  guidedSupportedQuestion: "112/0/19",
  totalTransfers: 82,
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-early-transfer-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/productionTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/vocabulary.ts",
      "src/data/characters.ts",
      "src/data/generated/structureExposureIndex.ts",
      "src/data/curriculumRole.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar validate:early-transfer-ladder.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { lessonRoundStepsFor, curriculumGlyphsThroughLesson } = load("src/features/lesson/lessonTasks.js");
  const { CORPUS_SENTENCES, FRAME_COMMUNICATIVE_DOMAINS, inferCommunicativeDomain } = load(
    "src/data/productionTasks.js"
  );

  const corpus = new Set([...CORPUS_SENTENCES].map(clean));
  const assistCounts = { guided: 0, supported: 0, question: 0, unset: 0 };
  let firstTransfer = null;
  let firstIndependent = null;
  let totalTransfers = 0;
  let labTransferCount = 0;
  let domainMismatchCount = 0;
  let unknownComponentViolations = 0;
  const earlyTransfers = [];
  const transfersBy20 = { count: 0, lessons: 0 };
  const transfersBy30 = { count: 0, lessons: 0 };
  const transfersBy50 = { count: 0, lessons: 0 };
  const targetsBy50 = new Set();
  const framesBy50 = new Set();
  const frameCountsBy50 = new Map();
  let maxConsecutiveSameFrame = 0;
  let lastFrame = "";
  let consecutiveSame = 0;
  let onboardingSteps = 0;
  const transferBearingLessons = new Set();
  let secondTransferAfterFirst = null;

  for (let index = 0; index < ALL_LESSONS.length; index += 1) {
    const lesson = ALL_LESSONS[index];
    const prior = ALL_LESSONS.slice(0, index).map((entry) => entry.id);
    const plan = lessonRoundStepsFor(lesson, { completedLessons: prior });
    if (index < 20) onboardingSteps += plan.length;

    if (!firstIndependent) {
      const independent = plan.find(
        (step) => step.kind === "free_production" && !step.productionOpen && step.isNoHint !== false
      );
      if (independent) firstIndependent = { lessonNum: index + 1, lessonId: lesson.id };
    }

    const transfers = plan.filter((step) => step.kind === "transfer_task");
    if (transfers.length > 0) {
      totalTransfers += transfers.length;
      transferBearingLessons.add(lesson.id);
      if (index < 20) {
        transfersBy20.count += transfers.length;
        transfersBy20.lessons += 1;
      }
      if (index < 30) {
        transfersBy30.count += transfers.length;
        transfersBy30.lessons += 1;
      }
      if (index < 50) {
        transfersBy50.count += transfers.length;
        transfersBy50.lessons += 1;
      }
    }

    if (LAB_ROLES.has(lesson.curriculumRole)) {
      labTransferCount += transfers.length;
    }

    for (const step of transfers) {
      const assist = step.productionAssist ?? "unset";
      assistCounts[assist] = (assistCounts[assist] ?? 0) + 1;

      const target = clean(step.targetHanzi ?? step.correctAnswer ?? step.answer ?? "");
      const frameId = step.productionFrameId ?? "";
      if (!firstTransfer) {
        firstTransfer = {
          lessonNum: index + 1,
          lessonId: lesson.id,
          frameId,
          target,
          assist: step.productionAssist,
          early: step.transferEarlySupported,
        };
      } else if (!secondTransferAfterFirst) {
        secondTransferAfterFirst = {
          lessonNum: index + 1,
          lessonId: lesson.id,
          frameId,
          target,
        };
      }
      if (earlyTransfers.length < 15) {
        earlyTransfers.push({
          lessonNum: index + 1,
          lessonId: lesson.id,
          frameId,
          anchor: step.transferAnchorHanzi ?? "",
          target: step.targetHanzi ?? step.correctAnswer ?? "",
          meta: step.transferSelectionMeta,
          assist: step.productionAssist,
        });
      }

      if (index < 50) {
        if (target) targetsBy50.add(target);
        if (frameId) {
          framesBy50.add(frameId);
          frameCountsBy50.set(frameId, (frameCountsBy50.get(frameId) ?? 0) + 1);
          if (frameId === lastFrame) {
            consecutiveSame += 1;
            maxConsecutiveSameFrame = Math.max(maxConsecutiveSameFrame, consecutiveSame);
          } else {
            lastFrame = frameId;
            consecutiveSame = 1;
          }
        }
      }

      assert(target.length > 0, `${lesson.id}: transfer_task sem alvo`);
      assert(!corpus.has(target), `${lesson.id}: alvo ${target} já existe no corpus — não é combinacional`);
      assert(
        step.isNovelCombination !== false,
        `${lesson.id}: transfer_task marcado como não-combinacional`
      );

      const glyphs = curriculumGlyphsThroughLesson(lesson.id);
      for (const ch of target) {
        if (CJK_RE.test(ch) && !glyphs.has(ch)) {
          unknownComponentViolations += 1;
          fail(`${lesson.id}: glifo ${ch} no alvo ${target} ainda não ensinado`);
        }
      }

      const lessonDomain = inferCommunicativeDomain(lesson.id, lesson.title ?? "");
      const frameDomains = FRAME_COMMUNICATIVE_DOMAINS[frameId] ?? [];
      if (
        lessonDomain &&
        frameDomains.length > 0 &&
        !frameDomains.includes(lessonDomain) &&
        !(frameId === "frame_woyouge" && POSSESSION_MISMATCH.test(lesson.id))
      ) {
        domainMismatchCount += 1;
      }

      if (frameId === "frame_woyouge" && POSSESSION_MISMATCH.test(lesson.id)) {
        fail(`${lesson.id}: frame_woyouge em lição de número/Hànzì/tom (bloqueio TR5-005/006)`);
      }
    }
  }

  const maxFrameShareBy50 =
    transfersBy50.count > 0
      ? Math.max(...frameCountsBy50.values(), 0) / transfersBy50.count
      : 0;

  if (runEarly) {
    assert(firstTransfer, "nenhuma transfer_task no plano real");
    assert(
      firstTransfer.lessonNum <= 15,
      `lessonToFirstTransfer=${firstTransfer?.lessonNum ?? "?"} (meta ≤15)`
    );
    assert(
      firstIndependent && firstIndependent.lessonNum <= 12,
      `primeira produção independente=${firstIndependent?.lessonNum ?? "?"} (meta ≤12)`
    );
    assert(onboardingSteps <= 210, `primeiras 20 lições=${onboardingSteps} passos (teto 210)`);
    assert(labTransferCount === 0, `${labTransferCount} transfer(s) em perception/hanzi lab`);
    if (firstTransfer.target.includes("请问") && firstTransfer.target.includes("叫什么")) {
      assert(
        firstTransfer.assist === "supported",
        `primeira transferência assist=${firstTransfer.assist} (esperado supported para 请问，你叫什么？)`
      );
    }
  }

  if (runDiversity) {
    assert(targetsBy50.size >= 3, `uniqueTargetsBy50=${targetsBy50.size} (meta ≥3)`);
    assert(framesBy50.size >= 2, `uniqueFramesBy50=${framesBy50.size} (meta ≥2)`);
    assert(maxFrameShareBy50 <= 0.7, `maxFrameShareBy50=${maxFrameShareBy50.toFixed(2)} (meta ≤0.7)`);
    assert(
      maxConsecutiveSameFrame <= 2,
      `maxConsecutiveSameFrame=${maxConsecutiveSameFrame} (meta ≤2 quando há alternativa)`
    );
  }

  if (runDomain) {
    assert(
      domainMismatchCount === 0,
      `domainMismatchCount=${domainMismatchCount} (meta 0 — se há candidato no domínio, use-o)`
    );
  }

  const transferBearingLessonCount = transferBearingLessons.size;
  const transferBearingLessonRate = transferBearingLessonCount / ALL_LESSONS.length;
  // Piso: densidade atual (~0.20) não pode colapsar sem justificativa pedagógica.
  // Não força retorno a 49/127 — só bloqueia queda grande não explicada.
  if (runDiversity) {
    assert(
      transferBearingLessonCount >= 20,
      `transferBearingLessons=${transferBearingLessonCount} (piso 20 — densidade não pode colapsar)`
    );
  }

  const gapAfterFirst =
    firstTransfer && secondTransferAfterFirst
      ? secondTransferAfterFirst.lessonNum - firstTransfer.lessonNum
      : null;

  const reportLines = [
    "# Early Transfer Ladder (V4.5)",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "",
    "## Before → After",
    "",
    "| Métrica | Antes (V4.4.1 baseline) | Depois |",
    "| --- | --- | --- |",
    `| lessonToFirstTransfer | ${BEFORE.lessonToFirstTransfer} | ${firstTransfer?.lessonNum ?? "—"} |`,
    `| estimatedTimeToFirstTransfer | ~${BEFORE.lessonToFirstTransfer * 4} min | ~${(firstTransfer?.lessonNum ?? 0) * 4} min (≈4 min/lição) |`,
    `| firstFrame | ${BEFORE.firstFrame} | ${firstTransfer?.frameId ?? "—"} |`,
    `| firstTarget | ${BEFORE.firstTarget} | ${firstTransfer?.target ?? "—"} |`,
    `| guided / supported / question | ${BEFORE.guidedSupportedQuestion} | ${assistCounts.guided} / ${assistCounts.supported} / ${assistCounts.question} |`,
    `| totalTransfers (127) | ${BEFORE.totalTransfers} | ${totalTransfers} |`,
    `| transferBearingLessons | ~49 | ${transferBearingLessonCount} |`,
    `| transferBearingLessonRate | ~0.39 | ${transferBearingLessonRate.toFixed(3)} |`,
    `| transfersBy20 | — | ${transfersBy20.count} (${transfersBy20.lessons} lições) |`,
    `| transfersBy30 | — | ${transfersBy30.count} (${transfersBy30.lessons} lições) |`,
    `| transfersBy50 | — | ${transfersBy50.count} (${transfersBy50.lessons} lições) |`,
    `| uniqueTargetsBy50 | — | ${targetsBy50.size} |`,
    `| uniqueFramesBy50 | — | ${framesBy50.size} |`,
    `| maxFrameShareBy50 | — | ${maxFrameShareBy50.toFixed(2)} |`,
    `| maxConsecutiveSameFrame | — | ${maxConsecutiveSameFrame} |`,
    `| labTransferCount | — | ${labTransferCount} |`,
    `| domainMismatchCount (soft) | — | ${domainMismatchCount} |`,
    `| unknownComponentViolations | — | ${unknownComponentViolations} |`,
    `| onboardingSteps (L1–20) | ~206 | ${onboardingSteps} |`,
    `| gap 1ª→2ª transfer (lições) | — | ${gapAfterFirst ?? "—"} |`,
    "",
    "## Densidade de transferência",
    "",
    "Menos lições com transfer do que V4.4.1 (~49) é esperado: labs sem transfer,",
    "cooldown frame/alvo e domínio. O piso (`transferBearingLessons ≥ 20`) impede",
    "colapso silencioso. Variedade (targets/frames) importa mais que espalhar o mesmo frame.",
    "",
    "## Gap L15 → próxima transferência",
    "",
    secondTransferAfterFirst
      ? `1ª em L${firstTransfer?.lessonNum} (\`${firstTransfer?.lessonId}\`); 2ª em L${secondTransferAfterFirst.lessonNum} (\`${secondTransferAfterFirst.lessonId}\` · \`${secondTransferAfterFirst.frameId}\` · ${secondTransferAfterFirst.target}). Gap = ${gapAfterFirst} lições.`
      : "Só uma transferência no plano.",
    "",
    "L16–L34 são majoritariamente tom/número/Hànzì (perception) — sem estrutura comunicativa",
    "nova pronta para combinação inédita. Não forçamos transfer em lab. A 2ª combinação",
    "natural aparece quando posse/pedido tem prerequisites (ex.: `frame_woyouge`).",
    "",
    "## Supported = 0 — explicação",
    "",
    "Na tentativa 0, `maxTransferAssistForAttempt` libera só **guided**, exceto frames com",
    "`earlyTransferOnAttemptZero` na **primeira** transferência combinacional (ex.: 请问，你叫什么？ → supported).",
    "Degraus **question** exigem attempt ≥ 2. O contador antigo 112/0/19 misturava tentativa 0",
    "com todo o plano; agora supported aparece quando a exceção pedagógica se aplica.",
    "",
    "## Primeiras 15 transferências (auditoria humana)",
    "",
  ];

  for (const row of earlyTransfers) {
    const meta = row.meta ?? {};
    reportLines.push(`### L${row.lessonNum} \`${row.lessonId}\``);
    reportLines.push("");
    reportLines.push(`- **Lesson:** ${row.lessonId}`);
    reportLines.push(`- **Frame:** ${row.frameId}`);
    reportLines.push(`- **Anchor:** ${row.anchor}`);
    reportLines.push(`- **Target:** ${row.target}`);
    reportLines.push(`- **Novel:** combinational (não está no corpus)`);
    reportLines.push(`- **Known components:** ${(meta.knownComponents ?? []).join(", ") || "—"}`);
    reportLines.push(`- **Domain:** ${meta.domain ?? inferCommunicativeDomain(row.lessonId) ?? "—"}`);
    reportLines.push(`- **Why selected:** ${meta.reasonSelected ?? "—"}`);
    reportLines.push(`- **Assist:** ${row.assist}`);
    reportLines.push("");
  }

  reportLines.push("## contextual_transfer vs combinational_transfer");
  reportLines.push("");
  reportLines.push("- **combinational_transfer:** contado acima — alvo inédito montado de componentes já ensinados.");
  reportLines.push("- **contextual_transfer:** reutilizar frase conhecida em situação nova (métrica separada; não infla novelTargets).");
  reportLines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(reportLines), "utf8");

  if (failures.length > 0) {
    console.error(`\nvalidate:early-transfer-ladder encontrou ${failures.length} problema(s):`);
    for (const message of failures) console.error(`  - ${message}`);
    process.exit(1);
  }

  const gates = [runEarly && "early", runDiversity && "diversity", runDomain && "domain"].filter(Boolean).join("+");
  console.log(
    `OK validate:early-transfer-ladder [${gates}] — 1ª transfer L${firstTransfer?.lessonNum} · ${totalTransfers} transfers · report → reports/early-transfer-ladder.md`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
