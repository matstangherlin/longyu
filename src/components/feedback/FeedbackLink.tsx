import type { FeedbackContext } from "../../lib/feedback";
import { useFeedbackUi } from "./FeedbackContext";
import { useTranslation } from "../../i18n/useTranslation";

interface FeedbackLinkProps {
  context?: FeedbackContext;
  className?: string;
}

export function FeedbackLink({ context, className }: FeedbackLinkProps) {
  const { openFeedback } = useFeedbackUi();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => openFeedback(context)}
      className={[
        "text-xs font-medium text-ink-faint underline decoration-line underline-offset-2 transition hover:text-ink-soft",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {t("feedback.send")}
    </button>
  );
}
