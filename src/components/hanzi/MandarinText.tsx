import { useEffect, useState } from "react";
import { useStore, type MandarinDisplayMode } from "../../lib/store";
import { speak } from "../../lib/tts";
import { SpeakButton } from "../ui/SpeakButton";
import { GlossText } from "./GlossText";
import { Pinyin } from "./Pinyin";
import { useMandarinHelpSettings, type MandarinHelpMode } from "./helpMode";

type MandarinTextSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<MandarinTextSize, { hanzi: string; pinyin: string; meaning: string; audio: "sm" | "md" | "lg" }> = {
  sm: { hanzi: "text-xl", pinyin: "text-sm", meaning: "text-xs", audio: "sm" },
  md: { hanzi: "text-2xl", pinyin: "text-base", meaning: "text-sm", audio: "sm" },
  lg: { hanzi: "text-4xl", pinyin: "text-lg", meaning: "text-sm", audio: "md" },
  xl: { hanzi: "text-6xl", pinyin: "text-2xl", meaning: "text-base", audio: "lg" },
};

export function MandarinText({
  hanzi,
  pinyin,
  meaning,
  size = "md",
  audio = false,
  autoPlay = true,
  displayMode,
  className = "",
  align = "left",
  helpMode,
  disabled = false,
}: {
  hanzi: string;
  pinyin?: string;
  meaning?: string;
  size?: MandarinTextSize;
  audio?: boolean;
  autoPlay?: boolean;
  displayMode?: MandarinDisplayMode;
  className?: string;
  align?: "left" | "center";
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
}) {
  const globalDisplayMode = useStore((s) => s.mandarinDisplayMode);
  const translationMode = useStore((s) => s.translationMode);
  const autoPlayAudio = useStore((s) => s.autoPlayAudio);
  const slowAudio = useStore((s) => s.slowAudio);
  const ttsRate = useStore((s) => s.ttsRate);
  const help = useMandarinHelpSettings({ helpMode, disabled });
  const helpDisabled = help.disabled || help.helpMode === "disabled";
  const preferredMode = displayMode ?? globalDisplayMode;
  const mode = helpDisabled || (preferredMode === "pinyin_only" && !pinyin) ? "hanzi_only" : preferredMode;
  const styles = SIZE_CLASS[size];
  const [translationOpen, setTranslationOpen] = useState(translationMode === "always");

  useEffect(() => {
    setTranslationOpen(translationMode === "always");
  }, [translationMode, meaning, hanzi]);

  useEffect(() => {
    if (!audio || !hanzi) return;
    if (!autoPlay && !autoPlayAudio) return;
    speak(hanzi, { rate: slowAudio ? Math.min(ttsRate, 0.65) : ttsRate });
  }, [audio, autoPlay, autoPlayAudio, hanzi, slowAudio, ttsRate]);

  const hanziNode = (
    <GlossText
      text={hanzi}
      pinyin={pinyin}
      meaning={meaning}
      className={`${styles.hanzi} leading-tight text-ink`}
      helpMode={help.helpMode}
      disabled={helpDisabled}
    />
  );
  const pinyinNode = pinyin && !helpDisabled ? (
    <Pinyin text={pinyin} className={`${styles.pinyin} font-serif leading-tight text-ink-soft`} />
  ) : null;

  return (
    <div className={[align === "center" ? "text-center" : "text-left", className].join(" ")}>
      <div className={["flex gap-3", align === "center" ? "items-center justify-center" : "items-start"].join(" ")}>
        <div className="min-w-0">
          {mode === "pinyin_hanzi" && (
            <div className="flex flex-col gap-1.5">
              {pinyinNode}
              {hanziNode}
            </div>
          )}
          {mode === "hanzi_pinyin" && (
            <div className="flex flex-col gap-1.5">
              {hanziNode}
              {pinyinNode}
            </div>
          )}
          {mode === "hanzi_only" && hanziNode}
          {mode === "pinyin_only" && pinyinNode}
        </div>
        {audio && <SpeakButton text={hanzi} size={styles.audio} className="shrink-0" autoPlay={autoPlay} />}
      </div>

      {meaning && !helpDisabled && translationMode === "always" && (
        <div className={`mt-2 ${styles.meaning} text-ink-soft`}>{meaning}</div>
      )}
      {meaning && !helpDisabled && translationMode === "tap" && (
        <button
          type="button"
          onClick={() => setTranslationOpen((open) => !open)}
          className={`mt-2 ${styles.meaning} font-medium text-accent hover:underline`}
        >
          {translationOpen ? meaning : "Ver tradução"}
        </button>
      )}
    </div>
  );
}
