#!/usr/bin/env node
/**
 * RC1.3 · P32 — mutação 5, e o contrato de P4/P5.
 *
 * O aluno errou porque precisava de ajuda. Se a revisão tira a dica, o áudio, as
 * peças ou o contexto que a tarefa original tinha, ela pune exatamente quem
 * veio pedir socorro. Este arquivo mata a mutação "revisão perde a dica" e
 * confirma a escada progressiva por modalidade.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateReviewHelpParity } from "./lib/rc1-3-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const help = require(path.join(root, "src/features/lesson/reviewHelpParity.ts"));

const killed = [];
const kill = (label) => {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
};

const control = validateReviewHelpParity();
assert.equal(control.failures.length, 0, `controle positivo falhou: ${JSON.stringify(control.failures)}`);

// ── Mutação 5: a revisão perde a dica que existia na tarefa original ──────
{
  const source = { initial: 1, ceiling: 3, affordances: ["audio", "pinyin", "chips", "context"] };
  const full = help.reviewHelpProfile({
    reviewKind: "build",
    source,
    available: ["audio", "pinyin", "chips", "context", "structure"],
  });
  assert.ok(help.checkReviewHelpParity({ source, review: full }).ok, "paridade completa reprovou");

  for (const lost of ["audio", "pinyin", "chips", "context"]) {
    const degraded = { ...full, affordances: full.affordances.filter((item) => item !== lost) };
    const verdict = help.checkReviewHelpParity({ source, review: degraded });
    assert.ok(!verdict.ok, `perder "${lost}" deveria reprovar`);
    assert.ok(verdict.missing.includes(lost), `"${lost}" não apareceu como apoio perdido`);
  }
  // P4.1 — o piso e o teto também são contrato.
  assert.ok(!help.checkReviewHelpParity({ source, review: { ...full, initial: 0 } }).ok, "piso abaixo da origem passou");
  assert.ok(!help.checkReviewHelpParity({ source, review: { ...full, ceiling: 1 } }).ok, "teto abaixo da origem passou");
  kill("Mutação 5 · review perde dica existente na tarefa original");
}

// ── P4.4: a ajuda é progressiva; a primeira dica nunca revela ─────────────
{
  for (const [kind, ladder] of Object.entries(help.REVIEW_HINT_LADDER)) {
    assert.notEqual(ladder[0], "reveal", `a escada de "${kind}" começa revelando`);
    assert.equal(ladder[ladder.length - 1], "reveal", `a escada de "${kind}" não oferece saída`);
    assert.ok(ladder.length >= 3, `a escada de "${kind}" é curta demais (${ladder.length})`);
    assert.ok(!help.firstHintRevealsAnswer(kind), `"${kind}" revela no primeiro toque`);
  }
  kill("P4.4 · ter mais apoio não significa revelar a resposta de cara");
}

// ── P5: a escada por modalidade é a do contrato ──────────────────────────
{
  // LISTENING — ouvir de novo, ouvir devagar, depois pista de significado.
  assert.deepEqual(help.REVIEW_HINT_LADDER.listen.slice(0, 3), ["audio", "audio_slow", "meaning"]);
  // VISUAL ASSOCIATION — imagem, áudio, pinyin.
  assert.deepEqual(help.REVIEW_HINT_LADDER.image.slice(0, 3), ["image", "audio", "pinyin"]);
  // SENTENCE BUILD — pinyin nos chips, estrutura, redução de distratoras.
  assert.deepEqual(help.REVIEW_HINT_LADDER.build.slice(0, 3), ["pinyin", "structure", "chips"]);
  // MEANING / MCQ — áudio, pinyin, contexto.
  assert.deepEqual(help.REVIEW_HINT_LADDER.choice.slice(0, 3), ["audio", "pinyin", "context"]);
  // TOM — áudio primeiro; o alvo escrito nunca antes do som.
  assert.equal(help.REVIEW_HINT_LADDER.tone[0], "audio");
  kill("P5 · escada de dicas por modalidade");
}

// ── P4: o botão "Preciso de uma dica" continua na revisão ────────────────
{
  const player = fs.readFileSync(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert.match(player, /data-review-help-request/, "a revisão perdeu o botão de dica");
  assert.match(player, /t\("player\.needHint"\)/, "a revisão não usa a mesma copy da lição");
  assert.match(player, /nextReviewHint/, "a revisão não consome a escada progressiva");
  const pt = fs.readFileSync(path.join(root, "src/locales/pt-BR.ts"), "utf8");
  assert.match(pt, /needHint: "Preciso de uma dica"/, "a copy da dica mudou");
  kill('P4 · "Preciso de uma dica" continua disponível na revisão');
}

// ── nextReviewHint respeita o que o item consegue oferecer ───────────────
{
  const first = help.nextReviewHint({ reviewKind: "listen", used: [], available: ["audio", "audio_slow", "reveal"] });
  assert.equal(first, "audio", "a primeira dica de listening não é o áudio");
  const second = help.nextReviewHint({
    reviewKind: "listen",
    used: ["audio"],
    available: ["audio", "audio_slow", "reveal"],
  });
  assert.equal(second, "audio_slow", "a segunda dica de listening não é ouvir devagar");
  const exhausted = help.nextReviewHint({ reviewKind: "listen", used: ["audio", "audio_slow", "reveal"], available: ["audio", "audio_slow", "reveal"] });
  assert.equal(exhausted, null, "a escada não termina");
  kill("P4.3 · a escada avança um degrau por vez e termina");
}

console.log(`PASS test:review-help-parity — ${killed.length} mutações mortas, com controle positivo.`);
