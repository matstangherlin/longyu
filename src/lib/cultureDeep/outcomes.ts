/**
 * RC2.3.3 — richer cultural choice outcomes (not always binary right/wrong).
 */

export const CULTURE_OUTCOME_KINDS = [
  "PREFERRED_HERE",
  "ACCEPTABLE",
  "CONTEXT_DEPENDENT",
  "UNLIKELY_HERE",
  "MISUNDERSTANDING",
] as const;

export type CultureOutcomeKind = (typeof CULTURE_OUTCOME_KINDS)[number];

export type CultureChoiceOutcome = {
  kind: CultureOutcomeKind;
  /** Keep `preferred` for legacy scoring: PREFERRED_HERE → true. */
  preferred: boolean;
  /** Soft success — counts toward practiced, not hard fail. */
  softPass: boolean;
};

export function outcomeFromLegacy(preferred: boolean, mayVary?: boolean): CultureChoiceOutcome {
  if (preferred) {
    return { kind: "PREFERRED_HERE", preferred: true, softPass: true };
  }
  if (mayVary) {
    return { kind: "CONTEXT_DEPENDENT", preferred: false, softPass: true };
  }
  return { kind: "UNLIKELY_HERE", preferred: false, softPass: false };
}

export function resolveChoiceOutcome(input: {
  preferred: boolean;
  mayVary?: boolean;
  outcome?: CultureOutcomeKind;
}): CultureChoiceOutcome {
  if (input.outcome) {
    const preferred = input.outcome === "PREFERRED_HERE";
    const softPass =
      input.outcome === "PREFERRED_HERE" ||
      input.outcome === "ACCEPTABLE" ||
      input.outcome === "CONTEXT_DEPENDENT";
    return { kind: input.outcome, preferred, softPass };
  }
  return outcomeFromLegacy(input.preferred, input.mayVary);
}

export function outcomeFeedbackTone(kind: CultureOutcomeKind, locale: "pt-BR" | "en"): string {
  const pt: Record<CultureOutcomeKind, string> = {
    PREFERRED_HERE: "Nesta situação, esta é a leitura mais segura.",
    ACCEPTABLE: "Essa resposta pode funcionar, mas nesta situação há um caminho mais natural.",
    CONTEXT_DEPENDENT: "Isso pode variar por família, região ou geração.",
    UNLIKELY_HERE: "Nesta situação, essa leitura costuma soar menos adequada.",
    MISUNDERSTANDING: "Essa opção parece misturar outro contexto com este.",
  };
  const en: Record<CultureOutcomeKind, string> = {
    PREFERRED_HERE: "In this situation, this is the safer reading.",
    ACCEPTABLE: "That answer can work, but in this situation there is a more natural path.",
    CONTEXT_DEPENDENT: "This can vary by family, region, or generation.",
    UNLIKELY_HERE: "In this situation, that reading usually feels less fitting.",
    MISUNDERSTANDING: "That option seems to mix another context with this one.",
  };
  return locale === "en" ? en[kind] : pt[kind];
}
