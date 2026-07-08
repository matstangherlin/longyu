import type { StepTextType } from "../../data/journey";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { GlossText } from "./GlossText";
import { Pinyin } from "./Pinyin";
import type { MandarinHelpMode } from "./helpMode";

const CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;
const CJK_RUN_RE = /([\u3400-\u9FFF\uF900-\uFAFF]+)/g;

export function containsCjk(text: string | undefined): boolean {
  return Boolean(text && CJK_RE.test(text));
}

export function ExerciseText({
  value,
  type,
  speakOnClick = false,
  className = "",
  helpMode,
  disabled = false,
}: {
  value: string;
  type?: StepTextType;
  speakOnClick?: boolean;
  className?: string;
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
}) {
  if (type === "pinyin") {
    return <Pinyin text={value} className={className} />;
  }

  if (type === "hanzi") {
    return <GlossText text={value} speakOnClick={speakOnClick} className={className} helpMode={helpMode} disabled={disabled} />;
  }

  if (containsCjk(value)) {
    const parts = value.split(CJK_RUN_RE).filter(Boolean);
    return (
      <span className={className}>
        {parts.map((part, index) =>
          containsCjk(part) ? (
            <GlossText key={`${part}-${index}`} text={part} speakOnClick={speakOnClick} helpMode={helpMode} disabled={disabled} />
          ) : (
            <span key={`${part}-${index}`}>{formatPinyinForDisplay(part)}</span>
          )
        )}
      </span>
    );
  }

  return <span className={className}>{formatPinyinForDisplay(value)}</span>;
}
