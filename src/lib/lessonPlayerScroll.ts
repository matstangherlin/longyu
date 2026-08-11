/**
 * Reposiciona o player no início da atividade.
 * Regra UX: avançar nunca herda o scroll da atividade anterior.
 */
export function resetLessonPlayerScroll(activityScroller?: HTMLElement | null): void {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
  if (activityScroller) {
    activityScroller.scrollTop = 0;
    activityScroller.scrollLeft = 0;
  }
}
