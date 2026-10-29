import { isPlaceholderDisplayName } from "./displayName";

/** Nome-modelo quando o aluno ainda não escolheu um nome. Nunca "você". */
export const FALLBACK_MODEL_NAME = "Lucas";

function usableFirstName(name?: string): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || ["Aluno", "Novo"].includes(first) || isPlaceholderDisplayName(name)) return undefined;
  return first;
}

export function learnerSpokenName(name?: string): string {
  return usableFirstName(name) ?? FALLBACK_MODEL_NAME;
}

/**
 * Troca o nome-modelo "Matheus" pelo nome do aluno.
 * Sem nome utilizável, o fallback é Lucas — nunca "você" e nunca "Matheus".
 */
export function personalizeName(value: string | undefined, name: string | undefined): string | undefined {
  if (!value) return value;
  const spoken = learnerSpokenName(name);
  return value
    .replaceAll("我叫Matheus", `我叫 ${spoken}`)
    .replaceAll("我叫 Matheus", `我叫 ${spoken}`)
    .replaceAll("Matheus", spoken);
}
