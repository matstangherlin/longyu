import { useState } from "react";
import { Button } from "../../components/ui/primitives";
import { BETA_ISSUE_CATEGORIES, BETA_ISSUE_LABELS_PT, ISSUE_COMMENT_MAX, buildIssuePacket, type BetaIssueCategory, type IssuePacket } from "../../lib/betaQa";
import { recordTechEvent, techEventsSnapshot } from "../../lib/techEvents";
import { currentLessonTraceContext } from "../../lib/lessonStepTrace";
import { getBuildIdentity } from "../../lib/platform/buildIdentity";
import { getPlatform } from "../../lib/platform/nativePlatform";

/**
 * RC2.2.22 — "Encontrou um problema?" (só em build de tester/QA).
 *
 * O tester escolhe uma categoria e, se quiser, escreve um comentário curto.
 * O contexto técnico (rota, lição, tipo de passo, build, viewport, plataforma e
 * eventos técnicos recentes) vai SANITIZADO; nenhum texto que o aluno digitou
 * em outro lugar entra. Sem nuvem nova (#273 congelada): o relato é copiado ou
 * compartilhado manualmente.
 */
export function BetaIssueReporter({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [category, setCategory] = useState<BetaIssueCategory | null>(null);
  const [comment, setComment] = useState("");
  const [packet, setPacket] = useState<IssuePacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    if (!category) return;
    const lesson = currentLessonTraceContext();
    const identity = getBuildIdentity();
    const result = buildIssuePacket({
      category,
      comment,
      context: {
        route: typeof location !== "undefined" ? location.pathname : null,
        lessonId: lesson?.lessonId ?? null,
        stepKind: lesson?.stepKind ?? null,
        build: identity.commitSha ? identity.commitSha.slice(0, 12) : identity.appVersion,
        viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : null,
        platform: getPlatform(),
      },
      events: techEventsSnapshot(),
    });
    if (!result.packet) {
      setError(result.errors.includes("COMMENT_HAS_PII") ? "O comentário parece ter e-mail, código ou token. Descreva sem dados pessoais." : "Escolha uma categoria.");
      return;
    }
    setError(null);
    setPacket(result.packet);
    recordTechEvent("issue_reported", { category });
  }

  const text = packet ? JSON.stringify(packet, null, 2) : "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full border border-line bg-surface/90 px-3 text-xs font-medium text-ink-soft shadow-sm backdrop-blur"
        data-testid="beta-issue-open"
      >
        Encontrou um problema?
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="beta-issue-reporter" data-issue-state={packet ? "ready" : "draft"}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Encontrou um problema?</h2>
        {compact && (
          <button type="button" className="min-h-11 px-2 text-xs text-ink-faint" onClick={() => setOpen(false)}>
            Fechar
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de problema">
        {BETA_ISSUE_CATEGORIES.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={category === id}
            onClick={() => {
              setCategory(id);
              setPacket(null);
            }}
            className={`min-h-11 rounded-full border px-3 text-xs font-medium ${category === id ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-soft"}`}
            data-issue-category={id}
          >
            {BETA_ISSUE_LABELS_PT[id]}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        Comentário (opcional, sem dados pessoais)
        <textarea
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          rows={2}
          maxLength={ISSUE_COMMENT_MAX}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            setPacket(null);
          }}
          data-testid="beta-issue-comment"
        />
      </label>
      {error && (
        <p className="mt-2 text-[12px] font-medium text-wrong" role="alert" data-testid="beta-issue-error">
          {error}
        </p>
      )}
      <p className="mt-2 text-[11px] text-ink-faint">Junto vai só contexto técnico: tela, lição, build, tamanho da tela e plataforma.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!category} onClick={generate} data-testid="beta-issue-generate">
          Gerar relato
        </Button>
        {packet && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="beta-issue-copy"
            onClick={() => {
              const share = (navigator as Navigator & { share?: (data: { text: string }) => Promise<void> }).share;
              const done = () => setCopied(true);
              if (share) void share.call(navigator, { text }).then(done, () => void navigator.clipboard?.writeText(text).then(done));
              else void navigator.clipboard?.writeText(text).then(done);
            }}
          >
            {copied ? "Copiado" : "Copiar / compartilhar"}
          </Button>
        )}
      </div>
      {packet && (
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-surface-2 p-3 text-[10px] leading-4 text-ink-soft" data-testid="beta-issue-json">
          {text}
        </pre>
      )}
    </section>
  );
}
