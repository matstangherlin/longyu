import { useFeedbackUiOptional } from "./FeedbackContext";
import { openFeedbackMailto, type FeedbackContext } from "../../lib/feedback";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";

export function FeedbackLink({
  context,
  className = "text-sm font-semibold text-accent hover:underline",
  children = "Enviar feedback",
}: {
  context?: FeedbackContext;
  className?: string;
  children?: string;
}) {
  const feedbackUi = useFeedbackUiOptional();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (feedbackUi) {
          feedbackUi.openFeedback(context);
          return;
        }
        if (!isSupabaseBackendEnabled()) openFeedbackMailto(context);
      }}
    >
      {children}
    </button>
  );
}
