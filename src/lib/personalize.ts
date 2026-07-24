// Personalização do nome do aluno nas tarefas.
//
// O nome-modelo usado em todo o conteúdo autoral é "Matheus" (马修 / Mǎxiū).
// Em runtime trocamos essas ocorrências pelo primeiro nome do usuário, para que
// as apresentações ("我叫…", "meu nome é…") e o avatar do aluno usem o nome real.
// Usado pelas lições (personalizeStep), pelas cenas de conversa, pelas histórias
// interativas e pela revisão — qualquer superfície que mostre a frase-modelo.

import { useStore } from "./store";

/** Primeiro nome utilizável do aluno, ou undefined para nomes-placeholder. */
export function studentFirstName(name?: string): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || ["Aluno", "Novo"].includes(first)) return undefined;
  return first;
}

/** Hook: primeiro nome do aluno logado (undefined quando não definido). */
export function useStudentFirstName(): string | undefined {
  const account = useStore((s) => s.accounts?.[s.currentAccountId]);
  return studentFirstName(account?.name);
}

/** Troca o nome-modelo (马修 / Mǎxiū / Matheus) pelo nome do usuário. */
export function personalizeName(value: string | undefined, name: string | undefined): string | undefined {
  if (!value || !name) return value;
  return value
    .replaceAll("我叫马修", `我叫 ${name}`)
    .replaceAll("马修", name)
    .replaceAll("Mǎxiū", name)
    .replaceAll("Matheus", name);
}

/**
 * Personaliza prompts de conversa da Jornada: o avatar do aluno já se chama
 * Matheus (ou o nome real), mas textos legados ainda podem dizer "Lin".
 * Não usar em Imersão — lá "Lin" é NPC (林).
 */
export function personalizeConversationPrompt(
  value: string | undefined,
  name: string | undefined
): string | undefined {
  if (!value) return value;
  const withStudentAlias = value.replace(/\bLin\b/g, "Matheus");
  return personalizeName(withStudentAlias, name) ?? withStudentAlias;
}
