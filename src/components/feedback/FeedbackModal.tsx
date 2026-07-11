import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { IconCheck, IconX } from "../ui/Icon";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_SEVERITIES,
  formatFeedbackReportCode,
  openFeedbackMailto,
  type FeedbackCategory,
  type FeedbackContext,
  type FeedbackSeverity,
} from "../../lib/feedback";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { submitFeedbackReport } from "../../services/feedbackService";

interface FeedbackModalProps {
  open: boolean;
  context?: FeedbackContext;
  onClose: () => void;
}

export function FeedbackModal({ open, context, onClose }: FeedbackModalProps) {
  const titleId = useId();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("média");
  const [message, setMessage] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [includeTechnical, setIncludeTechnical] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const supabaseReady = isSupabaseBackendEnabled();

  useEffect(() => {
    if (!open) return;
    setCategory("bug");
    setSeverity("média");
    setMessage("");
    setExpectedBehavior("");
    setIncludeTechnical(true);
    setLoading(false);
    setError(null);
    setReportId(null);
  }, [open, context?.screen, context?.lessonId, context?.stepId]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (message.trim().length < 10) {
      setError("Descreva o que aconteceu com pelo menos 10 caracteres.");
      return;
    }

    if (!supabaseReady) {
      openFeedbackMailto(context);
      onClose();
      return;
    }

    setLoading(true);
    const result = await submitFeedbackReport({
      category,
      severity,
      message,
      expectedBehavior,
      includeTechnical,
      context,
    });
    setLoading(false);

    if (result.ok) {
      setReportId(result.id);
      return;
    }

    if (result.fallbackMailto) {
      setError(`${result.error} Abrindo email como alternativa…`);
      window.setTimeout(() => {
        openFeedbackMailto(context);
        onClose();
      }, 900);
      return;
    }

    setError(result.error);
  }

  if (reportId) {
    const code = formatFeedbackReportCode(reportId);
    return (
      <ModalOverlay label="Feedback enviado" onBackdropClick={onClose}>
        <div className="w-full max-w-md rounded-t-[28px] border border-line bg-surface p-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center shadow-lift sm:rounded-[28px]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]">
            <IconCheck width={28} height={28} />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">Feedback enviado</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Obrigado por ajudar a melhorar o Longyu.
          </p>
          <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 font-mono text-sm font-semibold text-accent">
            Relato #{code}
          </p>
          <Button className="mt-5 w-full" size="lg" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay label="Enviar feedback" onBackdropClick={onClose}>
      <form
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-line bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-lift sm:rounded-[28px] sm:p-6"
        onSubmit={(event) => void handleSubmit(event)}
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-serif text-2xl font-semibold text-ink">
              Enviar feedback
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {supabaseReady
                ? "Seu relato é salvo no Longyu para acompanharmos bugs e sugestões."
                : "Nuvem indisponível — o envio abrirá seu app de email."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Fechar"
          >
            <IconX width={18} height={18} />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-ink">
          Categoria
          <select
            className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink"
            value={category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
          >
            {FEEDBACK_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold text-ink">
          Conte o que aconteceu
          <textarea
            className="mt-1.5 min-h-[120px] w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ex.: ao concluir a lição, o XP não apareceu na Jornada."
            required
            minLength={10}
            maxLength={4000}
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-ink">
          O que você esperava? <span className="font-normal text-ink-faint">(opcional)</span>
          <textarea
            className="mt-1.5 min-h-[72px] w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink"
            value={expectedBehavior}
            onChange={(event) => setExpectedBehavior(event.target.value)}
            placeholder="Ex.: ver o XP atualizado imediatamente."
            maxLength={2000}
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">Severidade</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FEEDBACK_SEVERITIES.map((item) => (
              <label
                key={item.id}
                className={[
                  "cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-semibold transition",
                  severity === item.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface-2 text-ink-soft hover:border-accent-soft",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="severity"
                  value={item.id}
                  checked={severity === item.id}
                  onChange={() => setSeverity(item.id)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-line accent-accent"
            checked={includeTechnical}
            onChange={(event) => setIncludeTechnical(event.target.checked)}
          />
          <span>
            Incluir informações técnicas (rota, versão, navegador e viewport). Não enviamos senhas,
            respostas digitadas nem tokens.
          </span>
        </label>

        {error && (
          <p className="mt-4 rounded-xl bg-wrong-soft px-3 py-2 text-sm text-wrong" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="w-full shadow-lift" size="lg" disabled={loading}>
            {loading ? "Enviando…" : "Enviar feedback"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
