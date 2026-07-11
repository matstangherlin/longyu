export type ReleaseNoteKind = "added" | "improved" | "fixed" | "known";

export interface ReleaseHighlight {
  kind: ReleaseNoteKind;
  text: string;
}

export interface ReleaseNoteEntry {
  version: string;
  date: string;
  highlights: ReleaseHighlight[];
}

export const RELEASE_NOTES: ReleaseNoteEntry[] = [
  {
    version: "0.2.0",
    date: "2026-07-10",
    highlights: [
      { kind: "added", text: "Versão visível em Sobre, Ajuda, feedback e erros." },
      { kind: "added", text: "Modal de novidades ao atualizar o app." },
      { kind: "added", text: "Atualização PWA segura — espera lição, sync e checkout." },
      { kind: "improved", text: "Deploy com SHA e horário de build para rastrear bugs." },
      { kind: "fixed", text: "index.html sem cache longo no Netlify." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-01",
    highlights: [
      { kind: "added", text: "Beta privado com jornada, lições e revisão." },
      { kind: "known", text: "Assinatura Pro ainda em validação com Stripe." },
    ],
  },
];

export function getLatestRelease(): ReleaseNoteEntry {
  return RELEASE_NOTES[0]!;
}

export function getReleaseByVersion(version: string): ReleaseNoteEntry | undefined {
  return RELEASE_NOTES.find((entry) => entry.version === version);
}

export function topHighlightsForVersion(version: string, limit = 3): ReleaseHighlight[] {
  const entry = getReleaseByVersion(version) ?? getLatestRelease();
  const priority: ReleaseNoteKind[] = ["added", "improved", "fixed", "known"];
  const sorted = [...entry.highlights].sort(
    (a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind)
  );
  return sorted.slice(0, limit);
}

export const RELEASE_NOTE_KIND_LABEL: Record<ReleaseNoteKind, string> = {
  added: "Adicionado",
  improved: "Melhorado",
  fixed: "Corrigido",
  known: "Conhecido",
};
