/** Garante que o fim de lição compacto permanece no card único (sem tela rewards separada). */

import { readFileSync } from "node:fs";

const player = readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8");
const errors = [];

function requireMatch(label, pattern) {
  if (!pattern.test(player)) errors.push(label);
}

requireMatch('max-w-xl na vitória', /max-w-xl flex-col/);
requireMatch('chips de métricas', /MetricChip value=\{`\+\$\{lessonXp\}`\}/);
requireMatch('botão Receber recompensas', /Receber recompensas/);
requireMatch('botão Continuar Jornada', /Continuar Jornada/);
requireMatch('recompensas inline', /recompensas recebidas/);
requireMatch('accordions fechados por padrão', /defaultOpen=\{false\}/);

if (/postLessonView === "rewards"/.test(player)) {
  errors.push('não deve existir view rewards separada');
}

if (errors.length > 0) {
  console.error("ERRO: validate:lesson-victory-ui falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:lesson-victory-ui passou.");
