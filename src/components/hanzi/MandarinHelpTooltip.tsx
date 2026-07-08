import { Pinyin } from "./Pinyin";
import type { MandarinHelpMode } from "./helpMode";

export interface MandarinHelpPart {
  text: string;
  pinyin?: string;
  meaningPt?: string;
  literalPt?: string;
  role?: string;
}

export function MandarinHelpTooltip({
  text,
  pinyin,
  meaningPt,
  literalPt,
  parts,
  helpMode = "word",
  disabled = false,
  className = "",
  size = "term",
}: {
  text: string;
  pinyin?: string;
  meaningPt?: string;
  literalPt?: string;
  parts?: MandarinHelpPart[];
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
  className?: string;
  size?: "term" | "phrase";
}) {
  if (disabled || helpMode === "disabled") {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-ink-soft">Sem ajuda nesta pergunta.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={[
          "hanzi break-words leading-tight text-ink",
          size === "phrase" ? "text-2xl" : Array.from(text).length === 1 ? "text-4xl" : "text-2xl",
        ].join(" ")}
      >
        {text}
      </div>
      {pinyin && (
        <Pinyin
          text={pinyin}
          className="mt-1.5 block font-serif text-base leading-snug text-ink-soft"
        />
      )}
      {meaningPt && <p className="mt-2 text-base text-ink">{meaningPt}</p>}
      {literalPt && (
        <p className="mt-1.5 text-xs text-ink-soft">
          <span className="font-semibold">Literal:</span> {literalPt}
        </p>
      )}
      {helpMode === "sentence" && parts && parts.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Partes
          </div>
          <div className="mt-2 grid gap-1.5">
            {parts.map((part, index) => (
              <div
                key={`${part.text}-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2"
              >
                <span className="hanzi min-w-7 text-lg leading-none text-ink">{part.text}</span>
                <span className="min-w-0 text-xs leading-snug text-ink-soft">
                  {part.pinyin && <Pinyin text={part.pinyin} className="mr-1 font-serif text-sm text-ink" />}
                  <span>{part.meaningPt}</span>
                  {part.role && <span className="ml-1 text-[10px] text-ink-faint">({part.role})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
