import { Card } from "../ui/primitives";
import { FeedbackButton } from "./FeedbackButton";
import type { FeedbackContext } from "../../lib/feedback";
import { useTranslation } from "../../i18n/useTranslation";

interface FeedbackPromptProps {
  context?: FeedbackContext;
  compact?: boolean;
  className?: string;
}

export function FeedbackPrompt({ context, compact = false, className }: FeedbackPromptProps) {
  const { t } = useTranslation();
  return (
    <Card className={["rounded-xl p-4 shadow-none", className].filter(Boolean).join(" ")}>
      <div className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" : "space-y-3"}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("feedback.promptTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{t("feedback.promptBody")}</p>
        </div>
        <FeedbackButton
          context={context}
          variant={compact ? "outline" : "soft"}
          size={compact ? "sm" : "md"}
          className={compact ? "shrink-0" : "w-full sm:w-auto"}
        />
      </div>
    </Card>
  );
}
