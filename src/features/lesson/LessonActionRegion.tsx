import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

const LessonActionRegionContext = createContext<HTMLElement | null>(null);

export function LessonActionRegionProvider({
  target,
  children,
}: {
  target: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <LessonActionRegionContext.Provider value={target}>
      {children}
    </LessonActionRegionContext.Provider>
  );
}

export function useLessonActionRegion(): HTMLElement | null {
  return useContext(LessonActionRegionContext);
}

/**
 * No LessonPlayer, ações primárias vivem numa faixa própria fora do scroller.
 * Em fixtures/review sem essa faixa, o conteúdo permanece inline.
 */
export function LessonActionPortal({ children }: { children: ReactNode }) {
  const target = useLessonActionRegion();
  return target ? createPortal(children, target) : children;
}
