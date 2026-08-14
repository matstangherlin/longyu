import { useLayoutEffect, useRef } from "react";

/**
 * V3.9 · MOBILE-006 — Reserva de espaço para barras de ação fixas.
 *
 * O scroller da atividade (`[data-lesson-activity-scroll]`) reserva
 * `--lesson-sticky-actions-height` no padding inferior. Quem NÃO publica a
 * própria altura nessa variável flutua por cima do conteúdo: foi o caso da
 * barra "Limpar | Verificar" do HanziBuilder, que em Android real cobria as
 * opções de caractere.
 *
 * Este hook é a única fonte dessa medição. Qualquer barra fixa nova deve usá-lo
 * em vez de repetir o cálculo — e o teste de geometria cobre todas elas.
 *
 * A altura é publicada como o MÁXIMO entre as barras montadas: numa tela com
 * mais de uma barra fixa, reservar só a última deixaria a outra cobrindo o
 * conteúdo.
 */
const RESERVE_VARIABLE = "--lesson-sticky-actions-height";
const SCROLLER_SELECTOR = "[data-lesson-activity-scroll]";

const registry = new WeakMap<HTMLElement, Map<HTMLElement, number>>();

function publish(scroller: HTMLElement): void {
  const heights = registry.get(scroller);
  if (!heights || heights.size === 0) {
    scroller.style.removeProperty(RESERVE_VARIABLE);
    return;
  }
  const tallest = Math.max(...heights.values());
  if (tallest > 0) scroller.style.setProperty(RESERVE_VARIABLE, `${tallest}px`);
  else scroller.style.removeProperty(RESERVE_VARIABLE);
}

export function useStickyActionsReserve<T extends HTMLElement = HTMLDivElement>() {
  const barRef = useRef<T | null>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const scroller = bar?.closest<HTMLElement>(SCROLLER_SELECTOR);
    if (!bar || !scroller) return undefined;

    let frame = 0;
    let heights = registry.get(scroller);
    if (!heights) {
      heights = new Map();
      registry.set(scroller, heights);
    }
    const measured = heights;

    const updateReservedSpace = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Em telas largas a barra volta a ser `static` e entra no fluxo normal:
        // reservar aí empurraria o conteúdo sem motivo.
        const style = getComputedStyle(bar);
        if (style.position !== "sticky" && style.position !== "fixed") {
          measured.set(bar, 0);
          publish(scroller);
          return;
        }

        // Reserva = altura da barra + o quanto ela se ancora ACIMA do fim da
        // área rolável (`bottom`). A do HanziBuilder usa um deslocamento, então
        // reservar só a altura deixava as peças atrás dela.
        //
        // Medir a posição já fixada (topo da barra até o fim do scroller) seria
        // instável: a reserva vira padding, o padding muda o layout e a medição
        // seguinte cresce de novo. Altura + `bottom` é determinístico.
        // `getBoundingClientRect` já reflete safe-area e teclado, porque o shell
        // do player acompanha `visualViewport`.
        const offset = Math.max(0, Number.parseFloat(style.bottom) || 0);
        const blocked = Math.ceil(bar.getBoundingClientRect().height + offset);
        measured.set(bar, blocked);
        publish(scroller);
      });
    };

    updateReservedSpace();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateReservedSpace);
    observer?.observe(bar);
    window.visualViewport?.addEventListener("resize", updateReservedSpace);
    window.visualViewport?.addEventListener("scroll", updateReservedSpace);
    window.addEventListener("orientationchange", updateReservedSpace);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.visualViewport?.removeEventListener("resize", updateReservedSpace);
      window.visualViewport?.removeEventListener("scroll", updateReservedSpace);
      window.removeEventListener("orientationchange", updateReservedSpace);
      measured.delete(bar);
      publish(scroller);
    };
  }, []);

  return barRef;
}
