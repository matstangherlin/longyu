/** Garante que o fim de lição continua num único shell mínimo. */

import { readFileSync } from "node:fs";

const player = readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8");
const victory = readFileSync("src/features/lesson/LessonVictory.tsx", "utf8");
const errors = [];

function requireMatch(label, source, pattern) {
  if (!pattern.test(source)) errors.push(label);
}

requireMatch("LessonPlayer monta LessonVictory", player, /<LessonVictory/);
requireMatch("shell data-lesson-victory", victory, /data-lesson-victory/);
requireMatch("XP na vitória", victory, /data-victory-xp/);
requireMatch("precisão na vitória", victory, /data-victory-accuracy/);
requireMatch("highlight determinístico", victory, /data-victory-highlight/);
requireMatch("um CTA primário", victory, /data-victory-primary/);
requireMatch("Continuar Jornada / Voltar à Jornada no player", player, /player\.continueJourney|player\.backToJourney/);
requireMatch("recompensas ainda reclamáveis no 1º toque", player, /player\.claimRewards/);

if (/CultureTouchpoint/.test(player) || /culture-touchpoint/.test(victory)) {
  errors.push("vitória não deve mostrar Culture Mission card");
}
if (/postLessonView === "rewards"/.test(player)) {
  errors.push("não deve existir view rewards separada");
}

if (errors.length > 0) {
  console.error("ERRO: validate:lesson-victory-ui falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:lesson-victory-ui passou.");
