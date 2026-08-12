/**
 * Hardening de UX do Lesson Player — copy curta, acolhedora, sem jargão.
 * Roda: npm run test:player-ux
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const steps = await readFile(path.join(rootDir, "src/features/lesson/steps.tsx"), "utf8");
const player = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
const speech = await readFile(path.join(rootDir, "src/lib/speech.ts"), "utf8");
const pronunciation = await readFile(
  path.join(rootDir, "src/features/lesson/PronunciationPractice.tsx"),
  "utf8"
);

assert(!/Nenhuma alternativa e nenhuma peça/.test(steps), "meta-copy de produção removida");
assert(!/Escute primeiro, compare com as curvas/.test(steps), "instrução longa de tom removida");
assert(!/Estou travado · mostrar pinyin/.test(steps), "dica de tom enxuta");
assert(!/>\s*Conferir\s*</.test(steps), "Conferir → Verificar");
assert(/Não entendi essa forma — não contou como erro/.test(steps), "unrecognized curto");
assert(/Monte · com intrusos/.test(steps), "eyebrow Sentence Lab em PT");
assert(/Ouvindo… toque para parar/.test(steps), "mic com stop");
assert(/not-allowed/.test(steps) && !/speechErrorMessage\(permission === "denied" \? "denied"/.test(steps), "mic denied mapeado");

assert(!/Você errou \${count}/.test(player) && !/Você errou \$\{count\}/.test(player), "oferta sem 'Você errou'");
assert(/REVIEW_OFFER/.test(player) || /Começar revisão/.test(player), "CTA Começar revisão (REVIEW_OFFER)");
assert(!/Próximo erro/.test(player), "sem Próximo erro");
assert(!/Continuar e perder perfeição/.test(player.replace(/\/\/.*/g, "")), "CTA Continuar sem culpa");
assert(/Avançar sem refazer gasta 1 vida/.test(player), "footnote curta");
assert(/Quer tentar de novo\?/.test(player), "modal acolhedor");
assert(
  /REVIEW_QUESTION/.test(player) || /Isso mesmo!/.test(player) || /Quase — veja a resposta certa/.test(player),
  "feedback revisão suave (REVIEW_QUESTION ou literal)"
);

assert(/Mic bloqueado/.test(speech), "speech not-allowed curto");
assert(/Use Chrome ou Edge/.test(speech), "unsupported curto");
assert(/falando um pouco mais devagar/.test(speech), "default acolhedor");

assert(!/🎤/.test(pronunciation), "sem emoji de mic");
assert(/Voz não disponível aqui/.test(pronunciation), "unsupported curto na prática");
assert(/Toque em Parar quando terminar/.test(pronunciation), "listening curto");

if (failures.length) {
  console.error("FAIL test:player-ux:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:player-ux passou (copy + fala + CTAs).");
