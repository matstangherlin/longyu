import { useMemo, useState, type FormEvent } from "react";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import {
  FEEDBACK_CATEGORIES,
  getAppVersion,
  type FeedbackCategoryId,
  type FeedbackContext,
} from "../../lib/feedback";
import { submitFeedback } from "../../services/feedbackService";

interface FeedbackModalProps {
  context?: FeedbackContext;
  onClose: () => void;
}

export function FeedbackModal({ context, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategoryId>(
    context?.activityProblem ? "exercicio_confuso" : "erro_conteudo"
  );
  const [message, setMessage] = useState("");
  const [activityProblem, setActivityProblem] = useState(Boolean(context?.activityProblem));
  const [includeTechnical, setIncludeTechnical] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const lessonHint = useMemo(() => {
    if (!context?.lessonId) return null;
    const parts = [
      `Lição ${context.lessonId}`,
      context.exerciseKind ? `· ${context.exerciseKind}` : null,
      typeof context.exerciseIndex === "number" ? `· pergunta ${context.exerciseIndex + 1}` : null,
    ].filter(Boolean);
    return parts.join(" ");
  }, [context]);

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
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <ModalOverlay label="Enviar feedback" onBackdropClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Feedback beta</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Conte o que falhou ou o que melhorar. Não envie senha, token nem dados pessoais.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            Fechar
          </button>
        </div>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl border border-[rgb(var(--good)/0.35)] bg-[rgb(var(--good)/0.12)] px-4 py-3 text-sm font-medium text-ink">
              Obrigado. Seu feedback foi enviado.
            </p>
            <Button type="button" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            {lessonHint && (
              <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-soft">{lessonHint}</p>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Categoria</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as FeedbackCategoryId)}
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink"
              >
                {FEEDBACK_CATEGORIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Mensagem</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                required
                minLength={3}
                maxLength={4000}
                placeholder="O que aconteceu? O que você esperava?"
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
              <span>Esta atividade está com problema</span>
            </label>

            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeTechnical}
                onChange={(event) => setIncludeTechnical(event.target.checked)}
                className="mt-1"
              />
              <span>Incluir contexto técnico (rota, versão, navegador, viewport)</span>
            </label>

            {error && <p className="text-sm text-[rgb(var(--wrong))]">{error}</p>}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Enviando…" : "Enviar"}
            </Button>

            <p className="text-center text-[11px] text-ink-faint">Longyu · v{getAppVersion()}</p>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
