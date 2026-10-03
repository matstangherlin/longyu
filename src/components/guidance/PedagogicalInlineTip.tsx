/**
 * RC2.2.32 — microorientação dentro da atividade (não é popup global).
 *
 * - Aparece na primeira exposição da interação
 * - Não consome GUIDANCE_SESSION_BUDGET
 * - Pode ser reaberta pelo botão `?`
 * - Nunca bloqueia a tarefa
 */
import { useEffect, useState } from "react";
import {
  PEDAGOGICAL_INLINE_BY_INTERACTION,
  markPedagogicalInlineSeen,
  pedagogicalInlineBody,
  pedagogicalInlineSeen,
  type PedagogicalInteractionId,
} from "../../lib/pedagogicalInlineGuidance";
import { getInstructionLocale } from "../../i18n/instructionLocale";

export function PedagogicalInlineTip({
  interaction,
  className = "",
}: {
  interaction: PedagogicalInteractionId;
  className?: string;
}) {
  const locale = getInstructionLocale() === "en" ? "en" : "pt-BR";
  const definition = PEDAGOGICAL_INLINE_BY_INTERACTION.get(interaction);
  const [open, setOpen] = useState(() => (definition ? !pedagogicalInlineSeen(definition.id) : false));

  useEffect(() => {
    if (!definition || !open) return;
    if (pedagogicalInlineSeen(definition.id)) return;
    const timer = window.setTimeout(() => {
      markPedagogicalInlineSeen(definition.id);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [definition, open]);

  if (!definition) return null;
  const body = pedagogicalInlineBody(definition, locale);

  return (
    <div className={["relative", className].filter(Boolean).join(" ")} data-pedagogical-inline={interaction}>
      <button
        type="button"
        className="absolute right-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
        aria-label={locale === "en" ? "Help" : "Ajuda"}
        data-pedagogical-inline-help={interaction}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open ? (
        <div
          className="mb-3 rounded-xl border border-accent-soft/60 bg-accent-soft/20 px-3 py-2 pr-9 text-sm leading-5 text-ink"
          data-pedagogical-inline-tip={definition.id}
          role="status"
        >
          <p>{body}</p>
          <button
            type="button"
            className="mt-1 text-xs font-semibold text-accent"
            data-pedagogical-inline-dismiss={definition.id}
            onClick={() => {
              markPedagogicalInlineSeen(definition.id);
              setOpen(false);
            }}
          >
            {locale === "en" ? "Got it" : "Entendi"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
