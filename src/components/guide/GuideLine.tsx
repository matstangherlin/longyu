import { Mascot } from "../brand/Mascot";

/**
 * RC2.2.17 · BG/DK — a fala CURTA do Dragão em superfícies guiadas (Teste
 * guiado, camada guiada da Jornada). Mesmo balão do GuideDialogue, sem
 * typewriter nem botão próprio: a ação principal continua única, embaixo.
 * Uma frase. O Dragão ensina/transiciona; não narra cada clique.
 */
export function GuideLine({
  text,
  size = 56,
  className = "",
  "data-testid": testId = "guide-line",
}: {
  text: string;
  size?: number;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div className={["flex items-end gap-3", className].join(" ")} data-testid={testId}>
      <Mascot size={size} className="shrink-0" />
      <p className="relative min-w-0 rounded-2xl border border-line bg-surface px-4 py-3 text-base font-medium leading-6 text-ink shadow-card">
        <span className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-line bg-surface" aria-hidden="true" />
        {text}
      </p>
    </div>
  );
}
