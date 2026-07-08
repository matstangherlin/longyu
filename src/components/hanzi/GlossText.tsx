import { MandarinInlineText } from "./MandarinInlineText";
import type { MandarinHelpMode } from "./helpMode";

// Texto chinês com ajuda de leitura em três níveis (caractere · chunk · frase).
// Mantém a assinatura antiga: os call sites não mudam. A lógica vive em
// MandarinInlineText / MandarinToken / MandarinGlossaryPopover.
// examMode: modo prova, sem dica visual.
export function GlossText({
  text,
  pinyin,
  meaning,
  literalMeaning,
  className = "",
  ruby = false,
  speakOnClick = true,
  onHintOpen,
  examMode = false,
  helpMode,
  disabled = false,
}: {
  text: string;
  pinyin?: string;
  meaning?: string;
  literalMeaning?: string;
  className?: string;
  ruby?: boolean;
  speakOnClick?: boolean;
  onHintOpen?: () => void;
  examMode?: boolean;
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
}) {
  return (
    <MandarinInlineText
      text={text}
      pinyin={pinyin}
      meaning={meaning}
      literalMeaning={literalMeaning}
      className={className}
      ruby={ruby}
      speakOnClick={speakOnClick}
      onHintOpen={onHintOpen}
      examMode={examMode}
      helpMode={helpMode}
      disabled={disabled}
    />
  );
}
