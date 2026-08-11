import { ERROR_CAUSE_FEEDBACK, diagnoseError, type ErrorCause } from "../../data/errorDiagnosis";
import type { StepKind } from "../../data/journey";

/**
 * Feedback de montagem: incompleto vs ordem vs peça errada —
 * sem entregar a resposta completa no primeiro erro.
 */

export type AssemblyFeedbackKind = "incomplete" | "prefix_ok" | "order" | "missing" | "extra" | "swap" | "generic";

export interface AssemblyFeedback {
  kind: AssemblyFeedbackKind;
  /** Linha curta para o aluno. */
  message: string;
  /** Quantas peças iniciais batem com o alvo (0 = nenhuma). */
  prefixMatch: number;
  /** Causa do diagnóstico, quando houver. */
  cause?: ErrorCause;
}

function normalizeParts(parts: string[]): string[] {
  return parts.map((part) => part.replace(/\s+/g, "").trim()).filter(Boolean);
}

/** Quantas peças do início batem com a sequência-alvo. */
export function countPrefixMatch(picked: string[], target: string[]): number {
  const a = normalizeParts(picked);
  const b = normalizeParts(target);
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n += 1;
  return n;
}

/**
 * Dica parcial inteligente: usa o que o aluno montou vs o alvo,
 * sem revelar a frase inteira.
 */
export function buildAssemblyFeedback(input: {
  picked: string[];
  target: string[];
  requiredCount: number;
  kind?: StepKind | string;
}): AssemblyFeedback {
  const picked = normalizeParts(input.picked);
  const target = normalizeParts(input.target);
  const required = Math.max(input.requiredCount, target.length);
  const prefixMatch = countPrefixMatch(picked, target);

  if (picked.length === 0) {
    return {
      kind: "incomplete",
      message: "Toque nas peças abaixo para montar a resposta aqui em cima.",
      prefixMatch: 0,
    };
  }

  if (picked.length < required) {
    const missing = required - picked.length;
    if (prefixMatch === picked.length && picked.length > 0) {
      return {
        kind: "incomplete",
        message:
          missing === 1
            ? "Bom começo — falta 1 peça para fechar."
            : `Bom começo — faltam ${missing} peças para fechar.`,
        prefixMatch,
      };
    }
    return {
      kind: "incomplete",
      message:
        missing === 1
          ? "Ainda falta 1 peça. Continue montando."
          : `Ainda faltam ${missing} peças. Continue montando.`,
      prefixMatch,
    };
  }

  const diagnosis = diagnoseError({
    kind: input.kind as StepKind | undefined,
    expected: target.join(""),
    given: picked.join(""),
  });
  const cause = diagnosis.cause;

  if (cause === "word_order") {
    if (prefixMatch > 0) {
      return {
        kind: "order",
        cause,
        prefixMatch,
        message:
          prefixMatch === 1
            ? "A 1ª peça está no lugar — ajuste a ordem das outras."
            : `As ${prefixMatch} primeiras peças estão no lugar — ajuste a ordem das outras.`,
      };
    }
    return {
      kind: "order",
      cause,
      prefixMatch: 0,
      message: ERROR_CAUSE_FEEDBACK.word_order,
    };
  }

  if (cause === "omission") {
    return {
      kind: "missing",
      cause,
      prefixMatch,
      message: ERROR_CAUSE_FEEDBACK.omission,
    };
  }

  if (cause === "intrusion") {
    return {
      kind: "extra",
      cause,
      prefixMatch,
      message: ERROR_CAUSE_FEEDBACK.intrusion,
    };
  }

  if (prefixMatch > 0 && prefixMatch < target.length) {
    return {
      kind: "prefix_ok",
      cause,
      prefixMatch,
      message:
        prefixMatch === 1
          ? "A 1ª peça está certa. Revise o restante."
          : `As ${prefixMatch} primeiras estão certas. Revise o restante.`,
    };
  }

  return {
    kind: "generic",
    cause,
    prefixMatch,
    message: diagnosis.feedbackPt || "Quase — tente outra ordem com as mesmas peças.",
  };
}

/** Classes de peça — compartilhadas entre lição e revisão. */
export function assemblyTileClass({
  active,
  matched,
  wrong,
  cjk,
  muted,
}: {
  active?: boolean;
  matched?: boolean;
  wrong?: boolean;
  cjk?: boolean;
  muted?: boolean;
}) {
  return [
    "min-h-12 min-w-[3.25rem] rounded-2xl border px-3.5 py-2.5 text-center font-semibold shadow-card sm:min-h-[3.5rem] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none",
    cjk ? "hanzi text-[26px] sm:text-[30px]" : "text-[15px]",
    matched && "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))] ring-1 ring-[rgb(var(--good)/0.18)]",
    wrong && "longyu-error-shake border-transparent bg-wrong-soft text-wrong ring-1 ring-wrong/10",
    active && !matched && !wrong && "border-accent bg-accent-soft text-accent shadow-lift ring-2 ring-accent/15",
    muted && "bg-surface-2 text-ink-faint opacity-[0.35] grayscale",
    !active && !matched && !wrong && !muted && "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-accent-soft hover:bg-surface-2",
  ]
    .filter(Boolean)
    .join(" ");
}
