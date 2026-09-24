import { useMemo } from "react";
import { getGlossaryEntry } from "../../data/gloss";
import { splitProseGloss } from "../../lib/proseGloss";
import { GlossText } from "./GlossText";

/**
 * RC2.2.11 — prosa (PT/EN) com Hànzì consultável: hover/foco no desktop,
 * toque/pressão longa no mobile (o mesmo `GlossText` de sempre). Em prova
 * (`examMode` ou `MandarinHelpProvider disabled`) o Hànzì fica texto simples.
 */
export function ProseGlossText({
  text,
  className = "",
  examMode = false,
}: {
  text: string;
  className?: string;
  examMode?: boolean;
}) {
  const parts = useMemo(() => splitProseGloss(text, (run) => getGlossaryEntry(run) !== null), [text]);
  return (
    <span className={className} data-testid="prose-gloss">
      {parts.map((part, index) =>
        part.kind === "hanzi" && part.known ? (
          <GlossText key={index} text={part.text} speakOnClick={false} examMode={examMode} />
        ) : (
          <span key={index} className={part.kind === "hanzi" ? "hanzi" : undefined}>
            {part.text}
          </span>
        )
      )}
    </span>
  );
}
