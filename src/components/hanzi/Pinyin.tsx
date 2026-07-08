import { TONE_COLOR } from "../../data/tones";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { useStore } from "../../lib/store";

// Detecta o tom de uma sílaba pinyin pelo diacrítico e devolve a cor.
const TONE_MARKS: Record<string, 1 | 2 | 3 | 4> = {
  ā: 1, ē: 1, ī: 1, ō: 1, ū: 1, ǖ: 1,
  á: 2, é: 2, í: 2, ó: 2, ú: 2, ǘ: 2,
  ǎ: 3, ě: 3, ǐ: 3, ǒ: 3, ǔ: 3, ǚ: 3,
  à: 4, è: 4, ì: 4, ò: 4, ù: 4, ǜ: 4,
};

function toneOf(syllable: string): 1 | 2 | 3 | 4 | 5 {
  for (const ch of syllable) {
    const t = TONE_MARKS[ch];
    if (t) return t;
  }
  return 5;
}

/** Pinyin com cada sílaba colorida pelo seu tom. */
export function Pinyin({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const toneColors = useStore((s) => s.toneColors);
  const toneColorIntensity = useStore((s) => s.toneColorIntensity);
  const displayText = formatPinyinForDisplay(text);
  const tokens = displayText.split(/(\s+)/); // mantém espaços
  return (
    <span className={className}>
      {tokens.map((tok, i) =>
        tok.trim() === "" ? (
          <span key={i}>{tok}</span>
        ) : (
          <span
            key={i}
            style={{
              color: toneColors
                ? `color-mix(in srgb, ${TONE_COLOR[toneOf(tok)]} ${Math.round(toneColorIntensity * 100)}%, rgb(var(--text)))`
                : undefined,
            }}
          >
            {tok}
          </span>
        )
      )}
    </span>
  );
}
