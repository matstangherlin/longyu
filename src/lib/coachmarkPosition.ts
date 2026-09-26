/**
 * RC2.2.18 · DF — onde o balão do coachmark fica. Puro (o gate executa):
 * nunca fora da tela, nunca sob a status bar / barra inferior / navegação do
 * Android, e nunca por cima do alvo quando há espaço acima ou abaixo dele.
 */
const VIEWPORT_GUTTER = 16;
const COACHMARK_GAP = 10;

export interface CoachmarkPosition {
  top: number;
  left: number;
  arrowLeft: number;
  placement: "above" | "below";
}

export function computeCoachmarkPosition(input: {
  target: { top: number; bottom: number; left: number; width: number };
  card: { width: number; height: number };
  viewport: { width: number; height: number };
  safeTop: number;
  safeBottom: number;
}): CoachmarkPosition {
  const { target, card, viewport, safeTop, safeBottom } = input;
  const minTop = safeTop + VIEWPORT_GUTTER / 2;
  const maxBottom = viewport.height - safeBottom - VIEWPORT_GUTTER / 2;
  const spaceBelow = maxBottom - (target.bottom + COACHMARK_GAP);
  const spaceAbove = target.top - COACHMARK_GAP - minTop;
  const placement: "above" | "below" = spaceBelow >= card.height || spaceBelow >= spaceAbove ? "below" : "above";
  let top = placement === "below" ? target.bottom + COACHMARK_GAP : target.top - COACHMARK_GAP - card.height;
  top = Math.min(Math.max(top, minTop), Math.max(minTop, maxBottom - card.height));
  const maxLeft = viewport.width - VIEWPORT_GUTTER - card.width;
  const centered = target.left + target.width / 2 - card.width / 2;
  const left = Math.min(Math.max(centered, VIEWPORT_GUTTER), Math.max(VIEWPORT_GUTTER, maxLeft));
  const arrowLeft = Math.min(Math.max(target.left + target.width / 2 - left, 18), card.width - 18);
  return { top, left, arrowLeft, placement };
}

