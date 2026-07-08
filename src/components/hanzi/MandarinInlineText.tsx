import { useMemo } from "react";
import {
  getGlossaryEntry,
  getPhraseGlossary,
  type PhraseGlossary,
  type RichGlossPart,
} from "../../data/gloss";
import { MandarinToken } from "./MandarinToken";
import { useMandarinHelpSettings, type MandarinHelpMode } from "./helpMode";

type Segment = { kind: "gloss"; text: string } | { kind: "plain"; text: string };
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const CJK_RUN_RE = /([\u3400-\u9fff\uf900-\ufaff]+)/gu;
const HANZI_PUNCTUATION_RE = /[，。！？、,.!?\s：；;“”"（）()]/g;

// Texto em mandarim com ajuda em três níveis. Cada palavra/caractere vira um
// alvo próprio: passar o mouse em 我 mostra só 我; em 不会 mostra só 不会.
// A frase inteira fica em "Ver frase completa", dentro do popover de qualquer termo.
export function MandarinInlineText({
  text,
  pinyin,
  meaning,
  literalMeaning,
  className = "",
  speakOnClick = true,
  onHintOpen,
  ruby = false,
  examMode = false,
  helpMode,
  disabled = false,
}: {
  text: string;
  pinyin?: string;
  meaning?: string;
  literalMeaning?: string;
  className?: string;
  speakOnClick?: boolean;
  onHintOpen?: () => void;
  ruby?: boolean;
  examMode?: boolean;
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
}) {
  const help = useMandarinHelpSettings({ helpMode, disabled: disabled || examMode });
  const mode = help.helpMode === "progressive" ? "character" : help.helpMode;
  const helpDisabled = help.disabled || mode === "disabled";
  const phrase = useMemo(
    () =>
      getPhraseGlossary(text, {
        pinyin,
        meaningPt: meaning,
        literalMeaningPt: literalMeaning,
      }),
    [text, pinyin, meaning, literalMeaning]
  );

  if (!phrase && !CJK_RE.test(text)) {
    return <span className={["hanzi select-none", className].join(" ")}>{text}</span>;
  }

  const characterOnly = mode === "character";
  const wholeToken = !characterOnly && Boolean(phrase && shouldRenderAsSingleToken(text, phrase));
  const multiPart = !helpDisabled && !characterOnly && Boolean(phrase && phrase.parts.length > 1 && !wholeToken);
  const segments = helpDisabled
    ? buildDisabledSegments(text)
    : wholeToken
      ? [{ kind: "gloss", text } satisfies Segment]
      : phrase && !characterOnly
        ? buildSegments(text, phrase.parts)
        : buildLooseSegments(text);
  const rubyClass = ruby ? "inline-flex flex-wrap items-start gap-x-1.5 gap-y-2 align-top" : "";

  return (
    <span className={[rubyClass, className].filter(Boolean).join(" ")}>
      {segments.map((segment, index) =>
        segment.kind === "plain" ? (
          <span key={index} className="hanzi whitespace-pre-wrap">
            {segment.text}
          </span>
        ) : (
          <MandarinToken
            key={index}
            text={segment.text}
            entry={helpDisabled ? null : getGlossaryEntry(segment.text)}
            phrase={!helpDisabled && mode === "sentence" && multiPart ? phrase : null}
            speakOnClick={speakOnClick}
            onHintOpen={onHintOpen}
            showPinyinRuby={ruby}
            helpMode={helpDisabled ? "disabled" : mode}
            disabled={helpDisabled}
          />
        )
      )}
    </span>
  );
}

function shouldRenderAsSingleToken(text: string, phrase: PhraseGlossary): boolean {
  const normalized = normalizeForLength(text);
  if (!normalized || !CJK_RE.test(normalized)) return false;
  const hasSentenceBoundary = /[\s。！？!?]/u.test(text.trim());
  if (hasSentenceBoundary) return false;
  return normalized.length <= 2 && phrase.parts.length <= 3;
}

function normalizeForLength(text: string): string {
  return text.replace(HANZI_PUNCTUATION_RE, "");
}

// Reconstrói a frase intercalando os termos glossáveis (phrase.parts, já
// segmentados por greedy match) com a pontuação/espaços do texto original.
function buildSegments(text: string, parts: RichGlossPart[]): Segment[] {
  if (parts.length === 0) {
    return [{ kind: "gloss", text }];
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const part of parts) {
    if (!part.text) continue;
    const at = text.indexOf(part.text, cursor);
    if (at < 0) continue;
    if (at > cursor) segments.push({ kind: "plain", text: text.slice(cursor, at) });
    segments.push({ kind: "gloss", text: part.text });
    cursor = at + part.text.length;
  }
  if (cursor < text.length) segments.push({ kind: "plain", text: text.slice(cursor) });

  // Nenhum termo casou (texto não reconhecido): trata tudo como um só termo.
  if (!segments.some((segment) => segment.kind === "gloss")) {
    return [{ kind: "gloss", text }];
  }
  return segments;
}

function buildLooseSegments(text: string): Segment[] {
  return text
    .split(CJK_RUN_RE)
    .filter(Boolean)
    .flatMap((part): Segment[] => {
      if (!CJK_RE.test(part)) return [{ kind: "plain", text: part }];
      return Array.from(part).map((char) => ({ kind: "gloss", text: char }));
    });
}

function buildDisabledSegments(text: string): Segment[] {
  return text
    .split(CJK_RUN_RE)
    .filter(Boolean)
    .map((part): Segment => (CJK_RE.test(part) ? { kind: "gloss", text: part } : { kind: "plain", text: part }));
}

export type { PhraseGlossary };
