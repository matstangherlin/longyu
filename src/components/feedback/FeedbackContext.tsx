import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FeedbackContext as FeedbackScreenContext } from "../../lib/feedback";
import { FeedbackModal } from "./FeedbackModal";

interface FeedbackUiContextValue {
  openFeedback: (context?: FeedbackScreenContext) => void;
  closeFeedback: () => void;
}

const FeedbackUiContext = createContext<FeedbackUiContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<FeedbackScreenContext | undefined>();

  const openFeedback = useCallback((next?: FeedbackScreenContext) => {
    setContext(next);
    setOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openFeedback, closeFeedback }),
    [openFeedback, closeFeedback]
  );

  return (
    <FeedbackUiContext.Provider value={value}>
      {children}
      <FeedbackModal open={open} context={context} onClose={closeFeedback} />
    </FeedbackUiContext.Provider>
  );
}

export function useFeedbackUi(): FeedbackUiContextValue {
  const ctx = useContext(FeedbackUiContext);
  if (!ctx) {
    throw new Error("useFeedbackUi deve ser usado dentro de FeedbackProvider");
  }
  return ctx;
}

/** Retorna null fora do provider (ex.: landing pública). */
export function useFeedbackUiOptional(): FeedbackUiContextValue | null {
  return useContext(FeedbackUiContext);
}
