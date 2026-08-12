/**
 * UX da revisão pós-erro: copy acolhedora, estados claros, CTAs padronizados.
 * Roda: npm run test:review-ux
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-review-ux-"));
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

try {
  const program = ts.createProgram(["src/features/lesson/reviewCopy.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
  });
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("falha ao compilar reviewCopy");

  const copy = require(path.join(outDir, "src/features/lesson/reviewCopy.js"));

  assert(copy.REVIEW_OFFER.eyebrow === "Revisão da lição", "eyebrow da oferta");
  assert(/juntos/.test(copy.REVIEW_OFFER.title(2, true)), "título acolhedor na oferta");
  assert(!/você errou/i.test(copy.REVIEW_OFFER.title(2, true)), "oferta sem culpa");
  assert(!/ficaram para trás/i.test(copy.REVIEW_OFFER.title(2, true)), "oferta sem tom de atraso");
  assert(typeof copy.REVIEW_OFFER.supportLine === "function", "supportLine único");
  assert(/mais apoio/.test(copy.REVIEW_OFFER.supportLine(true)), "oferta promete mais apoio");
  assert(copy.REVIEW_OFFER.ctaPrimary === "Começar revisão", "CTA primário da oferta");
  assert(copy.REVIEW_QUESTION.ctaContinue === "Continuar", "CTA Continuar");
  assert(copy.REVIEW_QUESTION.ctaResult === "Ver resultado", "CTA Ver resultado");
  assert(copy.REVIEW_QUESTION.ctaCheck === "Verificar", "CTA Verificar");
  assert(copy.REVIEW_QUESTION.feedbackOk === "Isso mesmo!", "feedback ok curto");
  assert(!/ainda precisa de revisão/i.test(copy.REVIEW_QUESTION.feedbackRetry), "feedback sem dureza");
  assert(/peças/.test(copy.REVIEW_QUESTION.doNowBuild), "build com microajuda");
  assert(copy.reviewModeLabel({ canRecover: true, isLastItem: false }) === "Apoio", "modo apoio");
  assert(copy.reviewModeLabel({ canRecover: true, isLastItem: true }) === "Quase lá", "modo quase lá");
  assert(copy.reviewModeLabel({ canRecover: false, isLastItem: false }) === "Revisão", "modo revisão");
  assert(/3ª estrela/.test(copy.reviewGoalLine({ canRecover: true, isLastItem: true, remaining: 1 })), "goal última");
  assert(!/Última chance/i.test(copy.reviewModeLabel({ canRecover: true, isLastItem: true })), "sem 'última chance'");
  assert(/3 estrelas recuperadas/.test(copy.REVIEW_RECOVERED.banner), "banner recovered");

  const player = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert(player.includes("data-review-offer"), "offer marcado");
  assert(player.includes("data-review-mode"), "question com modo");
  assert(player.includes("REVIEW_OFFER"), "player usa REVIEW_OFFER");
  assert(player.includes("supportLine"), "oferta usa supportLine (sem 3 cards)");
  assert(!player.includes("O que aconteceu"), "sem card O que aconteceu");
  assert(
    player.includes("canRecover={canRecoverStar}") || /canRecoverStar\s*=\s*!recovered/.test(player),
    "session recebe canRecoverStar (3ª estrela)"
  );
  assert(!player.includes("Próximo erro"), "sem CTA Próximo erro");
  assert(!player.includes("Revisar erros agora"), "sem CTA duro Revisar erros agora");
  assert(!player.includes("Ainda precisa de revisão"), "sem feedback duro");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:review-ux:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:review-ux passou (copy + estados + CTAs).");
