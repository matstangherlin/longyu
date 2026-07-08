import { buildFeedbackMailto, type FeedbackContext } from "../../lib/feedback";

interface FeedbackLinkProps {
  context?: FeedbackContext;
  className?: string;
}

export function FeedbackLink({ context, className }: FeedbackLinkProps) {
  return (
    <a
      href={buildFeedbackMailto(context)}
      className={[
        "text-xs font-medium text-ink-faint underline decoration-line underline-offset-2 transition hover:text-ink-soft",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      Enviar feedback
    </a>
  );
}
