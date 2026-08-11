/**
 * Regras de scroll do player da lição.
 *
 * 1. Avançar nunca pode exigir que o aluno procure a próxima atividade.
 * 2. A atividade nova não herda a rolagem da anterior.
 *
 * O player mantém a atividade dentro de uma região própria com rolagem; estas
 * funções reposicionam essa região (e a página, por segurança) a cada troca de
 * etapa.
 */

/** Campos onde roubar o foco atrapalharia o aluno (digitação em andamento). */
function isTextEntry(node: Element | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (node.isContentEditable) return true;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Leva o foco para o começo da atividade sem atropelar um campo que a própria
 * atividade acabou de focar (ex.: digitação em pinyin/hanzi).
 */
export function focusActivityRegion(region: HTMLElement | null): void {
  if (!region || typeof document === "undefined") return;
  const active = document.activeElement;
  if (active && region.contains(active) && isTextEntry(active)) return;
  region.focus({ preventScroll: true });
}

/**
 * Janela em que o topo é segurado depois de trocar de etapa. Cobre o que rola a
 * região logo depois do commit — o navegador revelando o elemento clicado, um
 * áudio/imagem entrando e mudando a altura. Qualquer gesto do aluno encerra a
 * janela antes disso: quem manda na rolagem é ele.
 */
export const ACTIVITY_SCROLL_PIN_MS = 400;

/** Gestos que devolvem a rolagem ao aluno imediatamente. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/** Fim da janela de assentamento da atividade atual (timestamp de performance). */
let settlingUntil = 0;

/**
 * A atividade acabou de trocar e ainda está se enquadrando.
 *
 * Os exercícios trazem para a tela o bloco que acabou de nascer (feedback, CTA)
 * — o que é certo depois de uma resposta e errado no primeiro quadro de uma
 * atividade nova, onde a regra é começar pelo enunciado.
 */
export function isActivitySettling(): boolean {
  return typeof performance !== "undefined" && performance.now() < settlingUntil;
}

/**
 * Reposiciona a atividade no topo. Chamado a cada `step N → step N+1` e a cada
 * nova tentativa da mesma etapa. Devolve o cancelamento do "pin".
 */
export function resetActivityScroll(region: HTMLElement | null): () => void {
  const noop = () => undefined;
  if (typeof window === "undefined") return noop;
  // A página não deve carregar a rolagem da atividade anterior nem quando o
  // enquadramento falha (frame maior que a viewport, navegador antigo).
  window.scrollTo(0, 0);
  if (!region) return noop;
  region.scrollTop = 0;
  focusActivityRegion(region);

  // Só zerar no commit não basta: logo depois o navegador ainda pode rolar a
  // região para revelar o elemento que o aluno clicou na etapa anterior, e
  // mídia carregando muda a altura do conteúdo. Segurar o topo por essa janela
  // curta é o que faz a atividade nova sempre nascer enquadrada.
  let frame = 0;
  settlingUntil = performance.now() + ACTIVITY_SCROLL_PIN_MS;
  const release = () => {
    settlingUntil = 0;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    window.clearTimeout(timer);
    for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, release);
  };
  const pin = () => {
    if (region.scrollTop !== 0) region.scrollTop = 0;
    frame = window.requestAnimationFrame(pin);
  };
  const timer = window.setTimeout(release, ACTIVITY_SCROLL_PIN_MS);
  for (const type of USER_SCROLL_EVENTS) {
    window.addEventListener(type, release, { passive: true });
  }
  frame = window.requestAnimationFrame(pin);
  return release;
}
