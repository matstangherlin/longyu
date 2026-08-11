import { useLayoutEffect, useState } from "react";

/**
 * Piso do enquadramento. Com o teclado chinês aberto num telefone pequeno a
 * viewport visível fica minúscula; abaixo deste piso a atividade rola dentro da
 * própria região em vez de virar uma faixa espremida.
 */
export const MIN_LESSON_FRAME_HEIGHT = 320;

/**
 * Encaixa o player da lição na viewport realmente visível.
 *
 * Mede o topo do elemento e devolve a altura que sobra até o fim da viewport
 * visível, descontando o padding inferior do container (safe area inclusa).
 * Recalcula quando a barra do navegador aparece/some, quando o teclado abre
 * (`visualViewport`) e quando a tela gira — é o que `100vh` não sabe fazer no
 * mobile, onde ele mede a tela sem a barra e empurra o CTA para fora.
 *
 * Enquanto ativo, marca `<html data-lesson-frame="locked">`: a página inteira
 * para de rolar e a rolagem passa a existir só dentro da região da atividade.
 *
 * Recebe o nó (callback ref), não um RefObject: o player mostra telas de porta
 * de entrada antes do exercício, e um RefObject ainda estaria vazio quando o
 * efeito rodasse — o enquadramento nunca chegaria a ser aplicado.
 */
export function useLessonViewportFrame(
  node: HTMLElement | null,
  enabled: boolean
): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const root = document.documentElement;
    root.dataset.lessonFrame = "locked";
    return () => {
      delete root.dataset.lessonFrame;
    };
  }, [enabled]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!enabled || !node) {
      setHeight(null);
      return undefined;
    }

    let pending = 0;

    const measure = () => {
      pending = 0;
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportTop = viewport?.offsetTop ?? 0;
      // Clamp em 0: se o navegador rolou o documento para revelar um input, o
      // topo fica negativo e o frame cresceria a cada medição.
      const top = Math.max(0, node.getBoundingClientRect().top - viewportTop);
      const parent = node.parentElement;
      const bottomGap = parent
        ? Number.parseFloat(window.getComputedStyle(parent).paddingBottom) || 0
        : 0;
      const next = Math.max(
        MIN_LESSON_FRAME_HEIGHT,
        Math.round(viewportHeight - top - bottomGap)
      );
      setHeight((prev) => (prev !== null && Math.abs(prev - next) <= 1 ? prev : next));
    };

    const schedule = () => {
      if (pending) return;
      pending = window.requestAnimationFrame(measure);
    };

    measure();
    // Segunda medição depois do primeiro paint: fontes e o header do modo foco
    // podem mudar o topo do elemento.
    schedule();

    const viewport = window.visualViewport;
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);

    // O topo do frame pode mudar sem resize da janela (chrome do app shell,
    // fontes carregando). Observa o container em vez de medir só uma vez.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (node.parentElement) observer?.observe(node.parentElement);

    return () => {
      if (pending) window.cancelAnimationFrame(pending);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, [enabled, node]);

  return enabled ? height : null;
}
