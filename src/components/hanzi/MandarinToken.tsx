import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import type { GlossaryEntry, PhraseGlossary } from "../../data/gloss";
import { isTTSAvailable, speak } from "../../lib/tts";
import { IconChevron, IconSound } from "../ui/Icon";
import { MandarinGlossaryPopover } from "./MandarinGlossaryPopover";
import { MandarinHelpTooltip } from "./MandarinHelpTooltip";
import { Pinyin } from "./Pinyin";
import { useMandarinHelpSettings, type MandarinHelpMode } from "./helpMode";

type TokenView = "term" | "details" | "phrase";
const GLOSS_OPEN_EVENT = "longyu:mandarin-gloss-open";

// Um termo de mandarim clicável (caractere isolado OU palavra/chunk).
// Hover/focus no desktop abre a ajuda; clique fixa; toque no mobile abre sheet.
// A ajuda mostra SÓ este termo — a frase inteira fica atrás de "Ver frase completa".
export function MandarinToken({
  text,
  entry,
  phrase,
  className = "",
  speakOnClick = true,
  onHintOpen,
  showPinyinRuby = false,
  helpMode,
  disabled,
}: {
  text: string;
  entry: GlossaryEntry | null;
  phrase?: PhraseGlossary | null;
  className?: string;
  speakOnClick?: boolean;
  onHintOpen?: () => void;
  showPinyinRuby?: boolean;
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [view, setView] = useState<TokenView>("term");
  const ref = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);
  const tokenId = useId();
  const help = useMandarinHelpSettings({ helpMode, disabled });
  const helpDisabled = help.disabled || help.helpMode === "disabled";

  const canShowPhrase = !helpDisabled && help.helpMode === "sentence" && Boolean(phrase && phrase.parts.length > 1);
  const canSpeak = !helpDisabled && speakOnClick && isTTSAvailable();

  function cancelClose() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  // Fecha com pequeno atraso para permitir mover o ponteiro até o popover
  // (que fica no portal, fora do termo). Cancelado se o ponteiro entrar nele.
  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
      setView("term");
    }, 140);
  }

  useEffect(() => cancelClose, []);

  useEffect(() => {
    const closeWhenAnotherTokenOpens = (event: Event) => {
      if ((event as CustomEvent<string>).detail === tokenId) return;
      cancelClose();
      setOpen(false);
      setPinned(false);
      setView("term");
    };
    window.addEventListener(GLOSS_OPEN_EVENT, closeWhenAnotherTokenOpens);
    return () => window.removeEventListener(GLOSS_OPEN_EVENT, closeWhenAnotherTokenOpens);
  }, [tokenId]);

  function prefersSheet(event?: ReactPointerEvent<HTMLSpanElement>): boolean {
    if (typeof window === "undefined") return false;
    return (
      event?.pointerType === "touch" ||
      event?.pointerType === "pen" ||
      window.innerWidth < 640 ||
      window.matchMedia?.("(pointer: coarse)").matches
    );
  }

  function openHint(options: { pin?: boolean; event?: ReactPointerEvent<HTMLSpanElement> } = {}) {
    cancelClose();
    window.dispatchEvent(new CustomEvent(GLOSS_OPEN_EVENT, { detail: tokenId }));
    setMobile(prefersSheet(options.event));
    setPinned(Boolean(options.pin));
    setView("term");
    setOpen((wasOpen) => {
      if (!wasOpen && !helpDisabled) onHintOpen?.();
      return true;
    });
  }

  function closeHint() {
    cancelClose();
    setOpen(false);
    setPinned(false);
    setView("term");
  }

  return (
    <span
      ref={ref}
      className={[
        "cursor-help select-none border-b border-dotted transition-colors",
        showPinyinRuby ? "inline-flex flex-col items-center leading-none" : "inline-block",
        open ? "border-accent text-accent" : "border-ink-faint/45",
        className,
      ].join(" ")}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") openHint({ event });
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !pinned) scheduleClose();
      }}
      onFocus={() => openHint()}
      onClick={() => {
        if (open && pinned) {
          closeHint();
          return;
        }
        openHint({ pin: true });
      }}
      onDoubleClick={() => {
        if (canSpeak) speak(text);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeHint();
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openHint({ pin: true });
      }}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={helpDisabled ? `${text}: sem ajuda nesta pergunta` : entry ? `${text}: ${entry.meaningPt}` : text}
    >
      <span className="hanzi">{text}</span>
      {showPinyinRuby && !helpDisabled && entry?.pinyin && (
        <span className="mt-1 font-serif leading-none" style={{ fontSize: "0.42em" }}>
          <Pinyin text={entry.pinyin} />
        </span>
      )}

      {open && (
        <MandarinGlossaryPopoverContent
          anchorRef={ref}
          open={open}
          mobile={mobile}
          onClose={closeHint}
          view={view}
          text={text}
          entry={entry}
          phrase={phrase ?? null}
          disabled={helpDisabled}
          canShowPhrase={canShowPhrase}
          canSpeak={canSpeak}
          onViewDetails={() => setView("details")}
          onViewPhrase={() => setView("phrase")}
          onBackToTerm={() => setView("term")}
          onPanelPointerEnter={cancelClose}
          onPanelPointerLeave={() => {
            if (!pinned) scheduleClose();
          }}
        />
      )}
    </span>
  );
}

function MandarinGlossaryPopoverContent({
  anchorRef,
  open,
  mobile,
  onClose,
  view,
  text,
  entry,
  phrase,
  disabled,
  canShowPhrase,
  canSpeak,
  onViewDetails,
  onViewPhrase,
  onBackToTerm,
  onPanelPointerEnter,
  onPanelPointerLeave,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  mobile: boolean;
  onClose: () => void;
  view: TokenView;
  text: string;
  entry: GlossaryEntry | null;
  phrase: PhraseGlossary | null;
  disabled: boolean;
  canShowPhrase: boolean;
  canSpeak: boolean;
  onViewDetails: () => void;
  onViewPhrase: () => void;
  onBackToTerm: () => void;
  onPanelPointerEnter: () => void;
  onPanelPointerLeave: () => void;
}) {
  return (
    <MandarinGlossaryPopover
      anchorRef={anchorRef}
      open={open}
      mobile={mobile}
      onClose={onClose}
      ariaLabel="Ajuda de leitura"
      onPanelPointerEnter={onPanelPointerEnter}
      onPanelPointerLeave={onPanelPointerLeave}
    >
      {disabled ? (
        <NeutralHelpView text={text} />
      ) : view === "phrase" && phrase ? (
        <PhraseView phrase={phrase} canSpeak={canSpeak} onBack={onBackToTerm} />
      ) : (
        <TermView
          text={text}
          entry={entry}
          canSpeak={canSpeak}
          canShowPhrase={canShowPhrase}
          details={view === "details"}
          onViewDetails={onViewDetails}
          onViewPhrase={onViewPhrase}
        />
      )}
    </MandarinGlossaryPopover>
  );
}

function TermView({
  text,
  entry,
  canSpeak,
  canShowPhrase,
  details,
  onViewDetails,
  onViewPhrase,
}: {
  text: string;
  entry: GlossaryEntry | null;
  canSpeak: boolean;
  canShowPhrase: boolean;
  details: boolean;
  onViewDetails: () => void;
  onViewPhrase: () => void;
}) {
  const hasDetails = Boolean(entry?.literalMeaningPt || entry?.notePt || entry?.charId || canSpeak);

  if (!entry) {
    return (
      <div>
        <MandarinHelpTooltip text={text} meaningPt={details ? "Ainda não temos detalhes desse item." : undefined} />
        {details && canSpeak && (
          <div className="mt-3">
            <AudioButton text={text} label={`Ouvir ${text}`} />
          </div>
        )}
        {!details && canSpeak && <DetailLink onClick={onViewDetails} />}
        {canShowPhrase && <PhraseLink onClick={onViewPhrase} />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <MandarinHelpTooltip
          text={entry.text}
          pinyin={entry.pinyin}
          meaningPt={entry.meaningPt}
          literalPt={details ? entry.literalMeaningPt : undefined}
          className="min-w-0"
        />
        {details && <TypeChip role={entry.role} />}
      </div>

      {details && entry.notePt && (
        <p className="mt-1.5 text-xs text-ink-soft">
          <span className="font-semibold">Explicação:</span> {entry.notePt}
        </p>
      )}

      {details && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canSpeak && <AudioButton text={entry.text} label={`Ouvir ${entry.text}`} />}
          {entry.charId && (
            <Link
              to={`/ideogramas?char=${entry.charId}`}
              onClick={(event) => event.stopPropagation()}
              className="text-xs font-semibold text-accent hover:underline"
            >
              ver caractere
            </Link>
          )}
        </div>
      )}

      {!details && hasDetails && <DetailLink onClick={onViewDetails} />}
      {canShowPhrase && <PhraseLink onClick={onViewPhrase} />}
    </div>
  );
}

function NeutralHelpView({ text }: { text: string }) {
  return <MandarinHelpTooltip text={text} disabled />;
}

function PhraseView({
  phrase,
  canSpeak,
  onBack,
}: {
  phrase: PhraseGlossary;
  canSpeak: boolean;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft transition hover:text-ink"
      >
        <IconChevron width={14} height={14} className="rotate-180" />
        Voltar ao termo
      </button>

      <MandarinHelpTooltip
        text={phrase.fullText}
        pinyin={phrase.fullPinyin}
        meaningPt={phrase.fullMeaningPt}
        literalPt={phrase.literalMeaningPt}
        parts={phrase.parts}
        helpMode="sentence"
        size="phrase"
      />

      {canSpeak && (
        <div className="mt-3">
          <AudioButton text={phrase.fullText} label="Ouvir frase" wide />
        </div>
      )}
    </div>
  );
}

function TypeChip({ role }: { role: string }) {
  return (
    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
      {role}
    </span>
  );
}

function DetailLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent-soft hover:text-accent"
    >
      Ver detalhes
      <IconChevron width={14} height={14} />
    </button>
  );
}

function PhraseLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent-soft hover:text-accent"
    >
      Ver frase completa
      <IconChevron width={14} height={14} />
    </button>
  );
}

function AudioButton({
  text,
  label,
  compact = false,
  wide = false,
}: {
  text: string;
  label: string;
  compact?: boolean;
  wide?: boolean;
}): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        speak(text);
      }}
      className={[
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-strong active:scale-95",
        compact ? "h-8 w-8" : "h-9 gap-2 px-3 text-xs font-semibold",
        wide ? "w-full" : "",
      ].join(" ")}
    >
      <IconSound width={compact ? 16 : 17} height={compact ? 16 : 17} />
      {!compact && <span>Ouvir</span>}
    </button>
  );
}
