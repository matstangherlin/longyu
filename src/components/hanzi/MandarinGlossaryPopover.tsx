import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { IconX } from "../ui/Icon";

const MARGIN = 12;
const GAP = 8;
const MAX_WIDTH = 340;
const MAX_DESKTOP_HEIGHT = 420;

type Placement = "top" | "bottom";

interface Position {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: Placement;
}

// Casca do popover de glossário, reutilizável nos três níveis de ajuda.
// Renderiza via portal no <body> para não cair na regra "bloco dentro de
// texto inline" e para nunca ser cortado por overflow de um card.
// Desktop: flutua ancorado ao termo, preso à viewport. Mobile: sheet embaixo.
export function MandarinGlossaryPopover({
  anchorRef,
  open,
  mobile,
  onClose,
  ariaLabel,
  children,
  onPanelPointerEnter,
  onPanelPointerLeave,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  mobile: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  /** Desktop: manter aberto enquanto o ponteiro está sobre o painel (hover-bridge). */
  onPanelPointerEnter?: () => void;
  onPanelPointerLeave?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({
    left: MARGIN,
    top: MARGIN,
    width: MAX_WIDTH,
    maxHeight: MAX_DESKTOP_HEIGHT,
    placement: "bottom",
  });

  useLayoutEffect(() => {
    if (!open || mobile || typeof window === "undefined") return;

    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(MAX_WIDTH, Math.max(240, window.innerWidth - MARGIN * 2));
      const centered = rect.left + rect.width / 2 - width / 2;
      const left = clamp(centered, MARGIN, window.innerWidth - width - MARGIN);
      const measuredHeight = panelRef.current?.scrollHeight ?? 260;
      // Espaço REAL acima/abaixo do termo (já descontando a margem e a seta de
      // GAP). Não inflar: o card precisa caber no lado escolhido para nunca ser
      // cortado no topo nem embaixo (detecção simples de colisão com a viewport).
      const spaceAbove = Math.max(0, rect.top - MARGIN - GAP);
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - MARGIN - GAP);
      const compactHeight = Math.min(measuredHeight, MAX_DESKTOP_HEIGHT);
      const placement: Placement =
        spaceBelow >= compactHeight || spaceBelow >= spaceAbove ? "bottom" : "top";
      const available = placement === "bottom" ? spaceBelow : spaceAbove;
      // maxHeight <= espaço disponível → o card scrolla em vez de estourar a tela.
      const maxHeight = Math.min(MAX_DESKTOP_HEIGHT, available);
      const top = placement === "top" ? rect.top - GAP : rect.bottom + GAP;
      setPosition({ left, top, width, maxHeight, placement });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, mobile, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  const panel = mobile ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel}
      className="animate-pop fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[110] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-4 pr-11 text-left font-sans text-sm leading-normal text-ink shadow-lift sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)]"
      style={{
        maxHeight:
          "min(72svh, calc(100svh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 7rem))",
      }}
      onPointerDown={stop}
      onClick={stop}
    >
      <button
        type="button"
        aria-label="Fechar ajuda"
        onClick={onClose}
        className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-ink"
      >
        <IconX width={18} height={18} />
      </button>
      {children}
    </div>
  ) : (
    <div
      ref={panelRef}
      role="tooltip"
      aria-label={ariaLabel}
      className="animate-pop fixed z-[110] max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-4 text-left font-sans text-sm leading-normal text-ink shadow-lift"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
        transform: position.placement === "top" ? "translateY(-100%)" : undefined,
      }}
      onPointerDown={stop}
      onClick={stop}
      onPointerEnter={onPanelPointerEnter}
      onPointerLeave={onPanelPointerLeave}
    >
      {children}
      <span
        aria-hidden="true"
        className={[
          "absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-line bg-surface",
          position.placement === "top"
            ? "top-full -translate-y-1 border-b border-r"
            : "bottom-full translate-y-1 border-l border-t",
        ].join(" ")}
      />
    </div>
  );

  return createPortal(panel, document.body);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
