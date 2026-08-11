/**
 * Garante as regras de enquadramento e rolagem do player da lição:
 *  1. avançar nunca exige que o aluno procure a próxima atividade — a troca de
 *     etapa reposiciona a região;
 *  2. a atividade nova não herda a rolagem da anterior;
 *  3. a atividade vive num frame medido pela viewport visível (não 100vh);
 *  4. a rolagem existe dentro da região da atividade, não na página inteira;
 *  5. o teclado virtual entra na conta (visualViewport).
 */

import { readFileSync } from "node:fs";

const player = readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8");
const viewport = readFileSync("src/features/lesson/lessonViewport.ts", "utf8");
const frameHook = readFileSync("src/hooks/useLessonViewportFrame.ts", "utf8");
const css = readFileSync("src/index.css", "utf8");

const errors = [];

function check(label, ok) {
  if (!ok) errors.push(label);
}

// 1 + 2 — reposicionamento a cada etapa e a cada nova tentativa.
check(
  "o player reposiciona a atividade ao trocar de etapa (resetActivityScroll)",
  /resetActivityScroll\(activityRegionNode\)/.test(player)
);
check(
  "o reposicionamento depende de idx e stepAttempt",
  /\[idx, stepAttempt, finished, activityRegionNode\]/.test(player)
);
check(
  "resetActivityScroll zera a rolagem da região",
  /region\.scrollTop = 0/.test(viewport)
);
check(
  "resetActivityScroll também zera a rolagem da página",
  /window\.scrollTo\(0, 0\)/.test(viewport)
);
check(
  "o topo é segurado por uma janela curta depois da troca",
  /ACTIVITY_SCROLL_PIN_MS/.test(viewport) && /requestAnimationFrame\(pin\)/.test(viewport)
);
check(
  "qualquer gesto do aluno devolve a rolagem",
  /USER_SCROLL_EVENTS/.test(viewport) && /wheel/.test(viewport) && /touchstart/.test(viewport)
);
check(
  "o foco vai para o começo da atividade sem roubar campo de digitação",
  /focusActivityRegion/.test(viewport) && /isTextEntry/.test(viewport)
);

// 3 + 5 — frame pela viewport visível, com teclado.
check(
  "o player usa o frame de viewport (useLessonViewportFrame)",
  /useLessonViewportFrame\(lessonFrameNode, !finished\)/.test(player)
);
check(
  "o frame aplica a altura medida no container da atividade",
  /style=\{lessonFrameHeight \? \{ height: `\$\{lessonFrameHeight\}px` \} : undefined\}/.test(player)
);
check(
  "o frame mede a viewport visível (visualViewport), não 100vh",
  /window\.visualViewport/.test(frameHook) && /viewport\?\.addEventListener\("resize"/.test(frameHook)
);
check(
  "o frame recalcula ao girar a tela",
  /orientationchange/.test(frameHook)
);
check(
  "o frame tem piso para o teclado aberto",
  /MIN_LESSON_FRAME_HEIGHT/.test(frameHook)
);

// 4 — a rolagem mora na região da atividade.
check(
  "a região da atividade existe e é focável",
  /data-testid="lesson-activity"/.test(player) && /tabIndex=\{-1\}/.test(player)
);
check(
  "a região da atividade é a que rola (classe lesson-activity)",
  /className="lesson-activity/.test(player)
);
check(
  "a região tem rolagem própria e contida",
  /\.lesson-activity\s*\{[^}]*overflow-y:\s*auto/.test(css) &&
    /\.lesson-activity\s*\{[^}]*overscroll-behavior:\s*contain/.test(css)
);
check(
  "a página inteira trava enquanto o exercício está na tela",
  /html\[data-lesson-frame="locked"\][\s\S]{0,120}overflow:\s*hidden/.test(css)
);
check(
  "o lock é ligado pelo hook do frame",
  /dataset\.lessonFrame = "locked"/.test(frameHook) && /delete root\.dataset\.lessonFrame/.test(frameHook)
);

// CTA: o bloco de feedback/continuar aparece sem o aluno procurar.
const steps = readFileSync("src/features/lesson/steps.tsx", "utf8");
check(
  "o CTA recém-montado é trazido para a tela (useRevealOnMount)",
  /function useRevealOnMount/.test(steps) && /scrollIntoView\(\{ block: "nearest"/.test(steps)
);
check(
  "o Continuar usa o reveal",
  /function ContinueBtn[\s\S]{0,200}useRevealOnMount/.test(steps)
);

if (errors.length > 0) {
  console.error("ERRO: validate:lesson-viewport falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:lesson-viewport passou.");
