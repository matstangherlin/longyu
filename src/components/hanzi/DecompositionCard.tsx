import type { Character } from "../../data/types";
import { radicalById } from "../../data/radicals";
import { SpeakButton } from "../ui/SpeakButton";
import { Pinyin } from "./Pinyin";

// O "desmontando o caractere": peças → resultado lógico.
// Cada peça é marcada como pista de SENTIDO ou pista de SOM (fono-semântico).
export function DecompositionCard({ char }: { char: Character }) {
  const parts = char.components
    .map((id) => ({ rad: radicalById[id], role: char.phonetic === id ? "som" : "sentido" }))
    .filter((p) => p.rad);

  return (
    <div className="animate-pop">
      {/* Equação de peças */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {parts.map((p, i) => (
          <div key={i} className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center">
              <span className="hanzi text-5xl sm:text-6xl text-ink">
                {p.rad.variant ?? p.rad.glyph}
              </span>
              <span className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {p.rad.namePt}
              </span>
              <span
                className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={
                  p.role === "som"
                    ? { background: "#2F6FB01a", color: "#2F6FB0" }
                    : { background: "rgb(var(--surface-2))", color: "rgb(var(--text-faint))" }
                }
              >
                {p.role}
              </span>
            </div>
            {i < parts.length - 1 && (
              <span className="text-3xl text-ink-faint">+</span>
            )}
          </div>
        ))}
        <span className="text-3xl text-accent">=</span>

        {/* Resultado */}
        <div className="flex flex-col items-center">
          <span className="hanzi text-7xl sm:text-8xl text-accent">
            {char.hanzi}
          </span>
        </div>
      </div>

      {/* Leitura + áudio */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <Pinyin text={char.pinyin} className="font-serif text-2xl" />
          <SpeakButton text={char.hanzi} size="sm" />
        </div>
        <div className="text-lg text-ink">{char.meaningPt}</div>
        {char.mnemonicPt && (
          <p className="max-w-md rounded-xl bg-surface-2 px-4 py-3 text-center text-sm italic text-ink-soft">
            “{char.mnemonicPt}”
          </p>
        )}
        <p className="max-w-md text-center text-xs text-ink-faint">
          Peça de sentido ajuda no campo de significado. Peça de som ajuda na pronúncia e nem sempre carrega o significado literal.
        </p>
      </div>
    </div>
  );
}
