import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import {
  FEEDBACK_CATEGORIES,
  getAppVersion,
  type FeedbackCategoryId,
  type FeedbackContext,
} from "../../lib/feedback";
import { formatDiagnosticsForFeedback } from "../../lib/clientDiagnostics";
import { submitFeedback } from "../../services/feedbackService";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";
import type { MessageKey } from "../../locales/pt-BR";

interface FeedbackModalProps {
  context?: FeedbackContext & { preferTechnical?: boolean };
  onClose: () => void;
}

const CATEGORY_KEYS: Record<FeedbackCategoryId, MessageKey> = {
  erro_conteudo: "feedback.catContent",
  traducao: "feedback.catTranslation",
  pinyin: "feedback.catPinyin",
  audio: "feedback.catAudio",
  imagem: "feedback.catImage",
  exercicio_confuso: "feedback.catConfusing",
  erro_tecnico: "feedback.catTechnical",
  sugestao: "feedback.catSuggestion",
  outro: "feedback.catOther",
};

export function FeedbackModal({ context, onClose }: FeedbackModalProps) {
  const { t } = useTranslation();
  const preferTechnical = Boolean(context?.preferTechnical);
  const [category, setCategory] = useState<FeedbackCategoryId>(
    preferTechnical ? "erro_tecnico" : context?.activityProblem ? "exercicio_confuso" : "erro_conteudo"
  );
  const [message, setMessage] = useState(() => {
    if (!preferTechnical) return "";
    const diagnostics = formatDiagnosticsForFeedback();
    return diagnostics ? t("feedback.techCapture", { diagnostics }) : "";
  });
  const [activityProblem, setActivityProblem] = useState(Boolean(context?.activityProblem));
  const [includeTechnical, setIncludeTechnical] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!preferTechnical) return;
    const diagnostics = formatDiagnosticsForFeedback();
    if (!diagnostics) return;
    setCategory("erro_tecnico");
    setIncludeTechnical(true);
    setMessage((current) =>
      current.trim() ? current : t("feedback.techCapture", { diagnostics })
    );
  }, [preferTechnical, t]);

  const lessonHint = useMemo(() => {
    if (!context?.lessonId) return null;
    const parts = [
      t("feedback.lesson", { id: context.lessonId }),
      context.exerciseKind ? `· ${context.exerciseKind}` : null,
      typeof context.exerciseIndex === "number" ? `· ${t("feedback.question", { n: context.exerciseIndex + 1 })}` : null,
    ].filter(Boolean);
    return parts.join(" ");
  }, [context, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await submitFeedback({
      category,
      message,
      includeTechnicalContext: includeTechnical,
      activityProblem,
      context,
    });
    setSending(false);
    if (!result.ok) {
      setError(localizeUserMessage(result.error));
      return;
    }
    setDone(true);
  }

  return (
    <ModalOverlay label={t("feedback.send")} onBackdropClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("feedback.title")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("feedback.lead")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            {t("common.close")}
          </button>
        </div>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl border border-[rgb(var(--good)/0.35)] bg-[rgb(var(--good)/0.12)] px-4 py-3 text-sm font-medium text-ink">
              {t("feedback.thanks")}
            </p>
            <Button type="button" className="w-full" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            {lessonHint && (
              <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-soft">{lessonHint}</p>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("common.category")}</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as FeedbackCategoryId)}
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink"
              >
                {FEEDBACK_CATEGORIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {t(CATEGORY_KEYS[entry.id])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("feedback.message")}</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                required
                minLength={3}
                maxLength={4000}
                placeholder={t("feedback.placeholder")}
                className="w-full resize-y rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink"
              />
            </label>

            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={activityProblem}
                onChange={(event) => setActivityProblem(event.target.checked)}
                className="mt-1"
              />
              <span>{t("feedback.activityProblem")}</span>
            </label>

            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeTechnical}
                onChange={(event) => setIncludeTechnical(event.target.checked)}
                className="mt-1"
              />
              <span>{t("feedback.includeTechnical")}</span>
            </label>

            {error && <p className="text-sm text-[rgb(var(--wrong))]">{error}</p>}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? t("auth.sending") : t("common.send")}
            </Button>

            <p className="text-center text-[11px] text-ink-faint">Longyu · v{getAppVersion()}</p>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
