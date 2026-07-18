import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FeedbackContext as FeedbackCtx } from "../../lib/feedback";
import { installFeedbackOnlineFlush } from "../../services/feedbackService";
import { installPedagogyOnlineFlush } from "../../services/pedagogyEvents";
import { FeedbackModal } from "./FeedbackModal";

interface FeedbackUiValue {
  openFeedback: (context?: FeedbackCtx) => void;
  closeFeedback: () => void;
}

const FeedbackUiContext = createContext<FeedbackUiValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<FeedbackCtx | undefined>();

  useEffect(() => {
    const offFeedback = installFeedbackOnlineFlush();
    const offPedagogy = installPedagogyOnlineFlush();
    return () => {
      offFeedback();
      offPedagogy();
    };
  }, []);

  const openFeedback = useCallback((next?: FeedbackCtx) => {
    setContext(next);
    setOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ openFeedback, closeFeedback }), [openFeedback, closeFeedback]);

  return (
    <FeedbackUiContext.Provider value={value}>
      {children}
      {open && <FeedbackModal context={context} onClose={closeFeedback} />}
    </FeedbackUiContext.Provider>
  );
}

export function useFeedbackUi(): FeedbackUiValue {
  const value = useContext(FeedbackUiContext);
  if (!value) {
    return {
      openFeedback: () => {
        console.warn("[Longyu] FeedbackProvider ausente — feedback ignorado.");
      },
      closeFeedback: () => undefined,
    };
  }
  return value;
}
